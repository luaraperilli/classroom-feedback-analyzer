"""Teste de fidelidade do destaque por palavras.

A concordância entre LIME e SHAP mostra que as duas técnicas apontam as mesmas
palavras, mas não que essas palavras sejam as que de fato movem a classificação.
Este script mede isso com as métricas de DeYoung et al. (2020), do ERASER:

  abrangência   quanto a probabilidade da classe prevista cai quando as cinco
                palavras destacadas são retiradas do comentário. Quanto maior,
                mais o modelo dependia delas.

  suficiência   quanto a probabilidade cai quando sobram apenas as cinco
                palavras destacadas. Quanto menor, mais elas bastam sozinhas.

Cada medida é comparada com a retirada, ou a manutenção, de cinco palavras
sorteadas do mesmo comentário, repetida 20 vezes com semente fixa. Se o destaque
for fiel, retirar as palavras destacadas derruba a classificação muito mais do
que retirar palavras quaisquer.

As palavras são removidas como o LIME as remove: o texto é separado pela mesma
expressão (\\W+) e todas as ocorrências da palavra saem. O modelo é o mesmo da
produção, pela mesma função _predict_proba.

Uso, a partir da raiz do projeto:

    python scripts/fidelidade_explicacao.py

O resumo sai no terminal e o detalhe por comentário vai para
fidelidade_resultados.csv, sem o texto dos comentários.
"""

import csv
import os
import random
import re
import statistics
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RAIZ)
sys.path.insert(0, os.path.join(RAIZ, 'scripts'))

from app import create_app                                   # noqa: E402
from app.models import Feedback                              # noqa: E402
from distribuicao_dos_pesos import (                         # noqa: E402
    DISCIPLINA_ANALISADA, MAXIMO_DE_DESTAQUES, PRIMEIRO_ID_DE_PARTICIPANTE, convergentes,
)

SEMENTE = 42
SORTEIOS = 20
SEPARADOR = re.compile(r'(\W+)')


def _eh_palavra(parte):
    return bool(parte) and not SEPARADOR.fullmatch(parte)


def palavras_do_texto(texto):
    """Conjunto de palavras do comentário, em minúsculas, como o LIME as vê."""
    return {p.lower() for p in SEPARADOR.split(texto) if _eh_palavra(p)}


def sem_palavras(texto, remover):
    """Retira todas as ocorrências das palavras indicadas, mantendo o resto."""
    return ''.join(p for p in SEPARADOR.split(texto)
                   if not (_eh_palavra(p) and p.lower() in remover))


def apenas_palavras(texto, manter):
    """Mantém só as palavras indicadas, na ordem em que aparecem."""
    return ' '.join(p for p in SEPARADOR.split(texto)
                    if _eh_palavra(p) and p.lower() in manter)


def bisserial_pareada(a, b):
    """Correlação bisserial de postos para amostras pareadas (Kerby, 2014)."""
    from scipy.stats import rankdata
    dif = [x - y for x, y in zip(a, b) if x != y]
    if not dif:
        return 0.0
    postos = rankdata([abs(d) for d in dif])
    positivo = sum(r for r, d in zip(postos, dif) if d > 0)
    negativo = sum(r for r, d in zip(postos, dif) if d < 0)
    return (positivo - negativo) / (positivo + negativo)


def main():
    app = create_app()
    with app.app_context():
        dados = [(f.id, f.additional_comment, f.token_attributions, f.shap_attributions)
                 for f in Feedback.ativos().all()
                 if f.token_attributions and f.shap_attributions
                 and f.student_id >= PRIMEIRO_ID_DE_PARTICIPANTE
                 and f.subject_id == DISCIPLINA_ANALISADA]

    from app.services import _predict_proba

    sorteio = random.Random(SEMENTE)
    linhas, nao_encontradas = [], 0

    for fid, texto, lime, shap in sorted(dados):
        pesos = convergentes(lime, shap)
        destaque = set(sorted(pesos, key=lambda p: abs(pesos[p]), reverse=True)[:MAXIMO_DE_DESTAQUES])
        vocabulario = sorted(palavras_do_texto(texto))
        nao_encontradas += len(destaque - set(vocabulario))

        k = len(destaque)
        aleatorios = [set(sorteio.sample(vocabulario, min(k, len(vocabulario)))) for _ in range(SORTEIOS)]

        textos = [texto, sem_palavras(texto, destaque), apenas_palavras(texto, destaque)]
        textos += [sem_palavras(texto, a) for a in aleatorios]
        textos += [apenas_palavras(texto, a) for a in aleatorios]
        p = _predict_proba(textos)

        classe = int(p[0].argmax())
        p0 = float(p[0][classe])
        sem_idx = range(3, 3 + SORTEIOS)
        com_idx = range(3 + SORTEIOS, 3 + 2 * SORTEIOS)

        linhas.append({
            'id': fid,
            'classe': ('NEG', 'NEU', 'POS')[classe],
            'prob_original': round(p0, 4),
            'abrangencia': round(p0 - float(p[1][classe]), 4),
            'abrangencia_aleatoria': round(statistics.mean(p0 - float(p[i][classe]) for i in sem_idx), 4),
            'suficiencia': round(p0 - float(p[2][classe]), 4),
            'suficiencia_aleatoria': round(statistics.mean(p0 - float(p[i][classe]) for i in com_idx), 4),
            'inverteu': int(int(p[1].argmax()) != classe),
            'inverteu_aleatoria': round(statistics.mean(int(int(p[i].argmax()) != classe) for i in sem_idx), 4),
        })

    if not linhas:
        print('Nenhum comentário com explicação calculada.')
        return

    with open('fidelidade_resultados.csv', 'w', newline='', encoding='utf-8') as saida:
        escritor = csv.DictWriter(saida, fieldnames=list(linhas[0]))
        escritor.writeheader()
        escritor.writerows(linhas)

    from scipy.stats import wilcoxon

    def resumo(nome, chave, chave_aleatoria):
        a = [l[chave] for l in linhas]
        b = [l[chave_aleatoria] for l in linhas]
        teste = wilcoxon(a, b)
        print(f'{nome}')
        print(f'  destacadas   média {statistics.mean(a):.3f}   mediana {statistics.median(a):.3f}')
        print(f'  sorteadas    média {statistics.mean(b):.3f}   mediana {statistics.median(b):.3f}')
        print(f'  Wilcoxon pareado p = {teste.pvalue:.6f}   bisserial de postos = {bisserial_pareada(a, b):.2f}\n')

    print(f'\n{len(linhas)} comentário(s), {MAXIMO_DE_DESTAQUES} palavras destacadas, '
          f'{SORTEIOS} sorteios por comentário, semente {SEMENTE}.')
    print(f'Palavras destacadas não encontradas no texto: {nao_encontradas}\n')
    resumo('Abrangência (maior = mais fiel)', 'abrangencia', 'abrangencia_aleatoria')
    resumo('Suficiência (menor = mais fiel)', 'suficiencia', 'suficiencia_aleatoria')
    inv = statistics.mean(l['inverteu'] for l in linhas)
    inv_a = statistics.mean(l['inverteu_aleatoria'] for l in linhas)
    print(f'Classificação invertida ao retirar as destacadas: {100 * inv:.1f}%   '
          f'ao retirar palavras sorteadas: {100 * inv_a:.1f}%')
    print('\nDetalhe por comentário em fidelidade_resultados.csv\n')


if __name__ == '__main__':
    main()
