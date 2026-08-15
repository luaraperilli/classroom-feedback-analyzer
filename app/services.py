import logging
import os

import numpy as np
import shap
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

# O LIME avalia 5.000 textos perturbados por comentário. Chamar o modelo uma vez
# por texto levava minutos; em lotes o resultado é o mesmo e o tempo cai para
# dezenas de segundos. O num_samples não muda — é ele que o artigo justifica.
TAMANHO_DO_LOTE = int(os.environ.get('PREDICT_BATCH_SIZE', 32))


def _predict_proba(texts):
    """Probabilidades [NEG, NEU, POS] para uma lista de textos.

    Uma falha do modelo propaga em vez de virar distribuição uniforme, que
    produzia explicações plausíveis e sem sentido, sem ninguém perceber.
    """
    textos = list(texts)
    resultados = []

    for inicio in range(0, len(textos), TAMANHO_DO_LOTE):
        lote = textos[inicio:inicio + TAMANHO_DO_LOTE]
        predicoes = sentiment_analyzer.predict(lote)
        if not isinstance(predicoes, list):
            predicoes = [predicoes]
        resultados.extend([p.probas.get(c, 0.0) for c in CLASSES] for p in predicoes)

    return np.array(resultados)

shap_explainer = shap.Explainer(
    _predict_proba,
    shap_masker,
    output_names=['NEG', 'NEU', 'POS'],
)

def analyze_sentiment_text(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return None

    result = sentiment_analyzer.predict(text)
    probabilities = result.probas
    compound_score = probabilities.get('POS', 0.0) - probabilities.get('NEG', 0.0)

    return {
        'compound': round(compound_score, 4),
        'neg': round(probabilities.get('NEG', 0.0), 4),
        'neu': round(probabilities.get('NEU', 0.0), 4),
        'pos': round(probabilities.get('POS', 0.0), 4)
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

    # Normaliza pelo maior peso absoluto do comentário: os coeficientes da
    # regressão local ficam em [-1, 1] sem mudar ranking nem sinal. É o que
    # permite ao destaque na tela usar toda a faixa de intensidade da cor.
    maior = max(abs(peso) for _, peso in pesos) or 1.0

    return {palavra.lower(): round(peso / maior, 4) for palavra, peso in pesos}

def explain_sentiment_shap(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return {}

    # max_evals padrão ('auto') ajusta dinamicamente o número de avaliações
    # ao tamanho do texto, conforme tutorial oficial da biblioteca em
    # sentiment analysis com Transformers (Lundberg & Lee, 2017).
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