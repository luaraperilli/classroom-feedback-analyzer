import logging
import os

import numpy as np
import shap
import torch
from pysentimiento import create_analyzer
from lime.lime_text import LimeTextExplainer
from .models import db, Feedback, StudentRiskAnalysis

logger = logging.getLogger(__name__)

sentiment_analyzer = create_analyzer(task="sentiment", lang="pt")


def descrever_modelo():
    """Identificação do modelo e das bibliotecas efetivamente carregados.

    O pysentimiento não permite fixar a revisão dos pesos, então registramos o
    que foi carregado de fato — é isso que garante rastreabilidade entre a
    coleta e a defesa. Em produção, a imagem Docker baixa os pesos na build e
    os congela; aqui fica o registro de qual versão está em uso.
    """
    from importlib.metadata import version

    try:
        modelo = sentiment_analyzer.model.config._name_or_path
    except Exception:
        modelo = 'desconhecido'

    def _versao(pacote):
        try:
            return version(pacote)
        except Exception:
            return 'desconhecida'

    return {
        'modelo': modelo,
        'pysentimiento': _versao('pysentimiento'),
        'transformers': _versao('transformers'),
        'lime': _versao('lime'),
        'shap': _versao('shap'),
    }


logger.info("Modelo de sentimento carregado: %s", descrever_modelo())

lime_explainer = LimeTextExplainer(
    class_names=['NEG', 'NEU', 'POS'],
    random_state=42,
)

shap_masker = shap.maskers.Text(tokenizer=r"\W+")

CLASSES = ('NEG', 'NEU', 'POS')

TAMANHO_DO_LOTE = int(os.environ.get('PREDICT_BATCH_SIZE', 64))
COMPRIMENTO_MAXIMO = 128

# O torch escolhe o número de threads olhando o host, não o contêiner. No Cloud
# Run isso costuma resultar em uma única thread mesmo com vários vCPUs
# disponíveis, e o LIME, que faz 5.000 passagens pelo modelo, executa em série.
# Fixar explicitamente é o que garante o paralelismo pelo qual já estamos
# pagando.
_NUCLEOS = int(os.environ.get('TORCH_THREADS', os.cpu_count() or 1))
torch.set_num_threads(_NUCLEOS)

_modelo = sentiment_analyzer.model
_tokenizador = sentiment_analyzer.tokenizer
_dispositivo = next(_modelo.parameters()).device

logger.info(
    'Inferência: %s núcleos visíveis, %s threads no torch, lote de %s, dispositivo %s',
    os.cpu_count(), torch.get_num_threads(), TAMANHO_DO_LOTE, _dispositivo,
)

# A ordem das colunas vem do próprio modelo, não de uma constante nossa: se os
# pesos mudarem o mapeamento, o índice acompanha em vez de trocar positivo por
# negativo em silêncio.
_COLUNAS = [
    next(i for i, rotulo in _modelo.config.id2label.items() if rotulo.upper().startswith(classe))
    for classe in CLASSES
]


@torch.inference_mode()
def _predict_proba(texts):
    """Probabilidades [NEG, NEU, POS] para uma lista de textos.

    Chama o tokenizador e o modelo diretamente em vez de sentiment_analyzer
    .predict(). O invólucro do pysentimiento constrói um Dataset e roda .map()
    a cada chamada, e esse custo fixo domina: as 5.000 perturbações do LIME
    levavam cerca de 99 minutos por comentário, contra 9 segundos por este
    caminho — com diferença máxima de 1,9e-09 entre os dois, ruído de ponto
    flutuante. Mesmo modelo, mesmos pesos, mesmas probabilidades.

    Uma falha do modelo propaga em vez de virar distribuição uniforme, que
    produzia explicações plausíveis e sem sentido, sem ninguém perceber.
    """
    textos = list(texts)
    if not textos:
        return np.empty((0, len(CLASSES)))

    # Agrupa textos de comprimento parecido antes de formar os lotes. O padding
    # leva todo o lote ao tamanho do maior elemento, e as perturbações do LIME
    # vão de poucas palavras até o comentário inteiro. Em ordem aleatória quase
    # todo lote contém uma perturbação longa, então até os textos curtos pagam o
    # comprimento máximo. Ordenados, cada lote paga o próprio tamanho. A conta do
    # modelo não muda: as posições de padding já eram anuladas pela máscara de
    # atenção, e o resultado volta na ordem original em que os textos chegaram.
    # Antes disso, descarta texto repetido. O LIME sorteia quantas palavras
    # remover e depois quais, e num comentário curto o número de combinações
    # possíveis é bem menor que as 5.000 amostras pedidas, então o mesmo texto
    # reaparece muitas vezes. Medido por simulação do sorteio: um comentário de
    # 10 palavras gera 945 textos distintos em 5.000 amostras, ou seja, 81% do
    # trabalho é repetição pura. Com 5 palavras chega a 99%.
    #
    # Texto igual produz saída igual, então calcular uma vez e copiar o
    # resultado para as posições repetidas é exato, e não aproximação.
    posicoes_por_texto = {}
    for i, texto in enumerate(textos):
        posicoes_por_texto.setdefault(texto, []).append(i)
    distintos = list(posicoes_por_texto)

    # Agrupa textos de comprimento parecido antes de formar os lotes. O padding
    # leva todo o lote ao tamanho do maior elemento, e as perturbações do LIME
    # vão de poucas palavras até o comentário inteiro. Em ordem aleatória quase
    # todo lote contém uma perturbação longa, então até os textos curtos pagam o
    # comprimento máximo. Ordenados, cada lote paga o próprio tamanho. A conta do
    # modelo não muda: as posições de padding já eram anuladas pela máscara de
    # atenção, e o resultado volta na ordem original em que os textos chegaram.
    ordem = sorted(range(len(distintos)), key=lambda i: len(distintos[i]))

    saida = np.empty((len(textos), len(CLASSES)))
    for inicio in range(0, len(ordem), TAMANHO_DO_LOTE):
        indices = ordem[inicio:inicio + TAMANHO_DO_LOTE]

        entrada = _tokenizador(
            [distintos[i] for i in indices],
            return_tensors='pt',
            padding=True,
            truncation=True,
            max_length=COMPRIMENTO_MAXIMO,
        ).to(_dispositivo)

        logits = _modelo(**entrada).logits
        probabilidades = torch.softmax(logits, dim=-1).float().cpu().numpy()[:, _COLUNAS]

        for linha, i in enumerate(indices):
            saida[posicoes_por_texto[distintos[i]]] = probabilidades[linha]

    return saida

shap_explainer = shap.Explainer(
    _predict_proba,
    shap_masker,
    output_names=['NEG', 'NEU', 'POS'],
)

def analyze_sentiment_text(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return None

    neg, neu, pos = (float(v) for v in _predict_proba([text])[0])

    return {
        'compound': round(pos - neg, 4),
        'neg': round(neg, 4),
        'neu': round(neu, 4),
        'pos': round(pos, 4),
    }

POS_IDX = 2

def explain_sentiment_lime(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return {}

    # Parâmetros do LIME: num_samples=5000 segue o padrão da biblioteca
    # (Ribeiro et al., 2016) e o regime de convergência teórica para texto
    # demonstrado por Mardaoui & Garreau (2021, AISTATS); reduzir esse valor
    # compromete a estabilidade das explicações (Visani et al., 2022; Zhao et al., 2021).
    # num_features=10 segue K=10 dos experimentos originais com texto em Ribeiro et al. (2016).
    exp = lime_explainer.explain_instance(
        text,
        _predict_proba,
        labels=[POS_IDX],
        num_features=10,
        num_samples=5000,
    )

    pesos = exp.as_list(label=POS_IDX)
    if not pesos:
        return {}

    # Soma as ocorrências da mesma palavra escrita em caixas diferentes, antes
    # de normalizar.
    #
    # O LIME trata "Não" e "não" como atributos distintos, porque separa o texto
    # sem uniformizar a caixa. A versão anterior passava tudo para minúscula
    # dentro de um dicionário, e a segunda ocorrência sobrescrevia a primeira em
    # silêncio. No feedback 14 do piloto isso apagou justamente a palavra de
    # maior peso: sobraram nove palavras em vez de dez e o máximo ficou em
    # 0,6084, quando a normalização deveria garantir 1,0. Ou seja, a atribuição
    # mais forte do comentário desaparecia e a escala de cor encolhia junto.
    #
    # Somar é o mesmo tratamento que explain_sentiment_shap já dava aos tokens
    # repetidos, e corresponde à contribuição total daquela palavra no texto,
    # independentemente de como foi grafada.
    combinados = {}
    for palavra, peso in pesos:
        chave = palavra.lower()
        combinados[chave] = combinados.get(chave, 0.0) + peso

    # Normaliza pelo maior peso absoluto do comentário: os coeficientes da
    # regressão local ficam em [-1, 1] sem mudar ranking nem sinal. É o que
    # permite ao destaque na tela usar toda a faixa de intensidade da cor.
    maior = max(abs(peso) for peso in combinados.values()) or 1.0

    return {palavra: round(peso / maior, 4) for palavra, peso in combinados.items()}

def explain_sentiment_shap(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return {}

    # max_evals fica no padrão ('auto'), que na biblioteca resolve para 500
    # avaliações. É um número fixo, e não uma quantidade ajustada ao tamanho do
    # texto, como a documentação sugere à primeira leitura. É o que explica o
    # SHAP ter custado cerca de 30 segundos tanto em um comentário de 288
    # caracteres quanto em um de 301, enquanto o LIME, esse sim proporcional ao
    # comprimento, variou de 115 a 200 segundos nas mesmas medições.
    shap_values = shap_explainer([text])

    values = shap_values.values[0, :, POS_IDX]
    tokens = shap_values.data[0]

    import re
    result = {}
    for token, val in zip(tokens, values):
        clean = re.sub(r'[^\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]', '', token).strip().lower()
        if not clean:
            continue
        if clean in result:
            result[clean] += float(val)
        else:
            result[clean] = float(val)
    return {k: round(v, 4) for k, v in result.items()}

def create_feedback(student_id, subject_id, answers, additional_comment=None):
    sentiment_scores = None
    if additional_comment and additional_comment.strip():
        sentiment_scores = analyze_sentiment_text(additional_comment)

    new_feedback = Feedback(
        student_id=student_id,
        subject_id=subject_id,
        active_participation=answers['active_participation'],
        task_completion=answers['task_completion'],
        motivation_interest=answers['motivation_interest'],
        welcoming_environment=answers['welcoming_environment'],
        comprehension_effort=answers['comprehension_effort'],
        content_connection=answers['content_connection'],
        additional_comment=additional_comment
    )
    
    if sentiment_scores:
        new_feedback.compound = sentiment_scores['compound']
        new_feedback.neg = sentiment_scores['neg']
        new_feedback.neu = sentiment_scores['neu']
        new_feedback.pos = sentiment_scores['pos']
    
    new_feedback.overall_score = new_feedback.calculate_overall_score()
    
    db.session.add(new_feedback)
    db.session.commit()
    
    update_student_risk_analysis(student_id, subject_id)
    
    return new_feedback

def update_student_risk_analysis(student_id, subject_id):
    feedbacks = Feedback.query.filter_by(
        student_id=student_id,
        subject_id=subject_id
    ).all()
    
    if not feedbacks:
        analysis = StudentRiskAnalysis.query.filter_by(
            student_id=student_id,
            subject_id=subject_id
        ).first()
        if analysis:
            db.session.delete(analysis)
            db.session.commit()
        return None
    
    avg_score = sum(f.overall_score for f in feedbacks) / len(feedbacks)
    
    sentiment_values = [f.compound for f in feedbacks if f.compound is not None]
    avg_sentiment = sum(sentiment_values) / len(sentiment_values) if sentiment_values else None
    
    analysis = StudentRiskAnalysis.query.filter_by(
        student_id=student_id,
        subject_id=subject_id
    ).first()
    
    if not analysis:
        analysis = StudentRiskAnalysis(
            student_id=student_id,
            subject_id=subject_id
        )
        db.session.add(analysis)
    
    analysis.average_score = avg_score
    analysis.average_sentiment = avg_sentiment
    analysis.feedback_count = len(feedbacks)
    analysis.calculate_risk_score()
    
    db.session.commit()
    return analysis

def get_students_at_risk(subject_id=None, min_risk_level='medio'):
    query = StudentRiskAnalysis.query
    
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    
    risk_levels = {
        'baixo': ['baixo', 'medio', 'alto'],
        'medio': ['medio', 'alto'],
        'alto': ['alto']
    }
    levels_to_include = risk_levels.get(min_risk_level, ['alto'])
    
    query = query.filter(StudentRiskAnalysis.risk_level.in_(levels_to_include))
    query = query.order_by(StudentRiskAnalysis.risk_score.desc())
    
    return query.all()