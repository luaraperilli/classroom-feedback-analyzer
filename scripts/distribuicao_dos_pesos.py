"""Distribuição dos pesos das palavras destacadas.

Serve para escolher quantas palavras a tela deve colorir sem que o número saia
do nada. Sem esta medição, qualquer corte é arbitrário e não se defende na
banca; com ela, o número vira uma decisão declarada e reproduzível.

Reproduz aqui a mesma seleção que a tela faz — convergência de sinal entre LIME
e SHAP, e normalização pelo maior peso absoluto — para que o que se mede seja o
que o aluno vê, e não as atribuições brutas.

    flask --app run.py shell   # não: este roda sozinho
    python scripts/distribuicao_dos_pesos.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app                      # noqa: E402
from app.models import Feedback                 # noqa: E402


def convergentes(lime, shap):
    """Mesma regra de `atribuicoesConvergentes` no frontend."""
    if not lime:
        return shap or {}
    if not shap:
        return lime
    return {p: v for p, v in lime.items()
            if p in shap and (v > 0) == (shap[p] > 0)}


def percentil(valores, p):
    if not valores:
        return 0.0
    ordenados = sorted(valores)
    i = min(int(round(p / 100 * (len(ordenados) - 1))), len(ordenados) - 1)
    return ordenados[i]


def main():
    app = create_app()
    with app.app_context():
        feedbacks = [f for f in Feedback.ativos().all() if f.token_attributions]

    if not feedbacks:
        print('Nenhum feedback com explicação calculada.')
        return

    por_comentario = []   # quantas palavras destacadas em cada comentário
    todos_os_pesos = []   # |peso| normalizado, de todas as palavras

    for f in feedbacks:
        pesos = convergentes(f.token_attributions, f.shap_attributions)
        if not pesos:
            continue
        maior = max(abs(v) for v in pesos.values()) or 1.0
        normalizados = [abs(v) / maior for v in pesos.values()]
        por_comentario.append(sorted(normalizados, reverse=True))
        todos_os_pesos.extend(normalizados)

    print(f'\n{len(por_comentario)} comentário(s) com destaque, '
          f'{len(todos_os_pesos)} palavra(s) no total.\n')

    quantidades = [len(c) for c in por_comentario]
    print('Palavras destacadas por comentário')
    print(f'  mínimo {min(quantidades)}   mediana {percentil(quantidades, 50):.0f}   '
          f'máximo {max(quantidades)}\n')

    print('Se a tela mostrasse só as K mais fortes, o corte cairia em que intensidade')
    print('  (mediana da K-ésima palavra, como fração do maior peso do comentário)\n')
    for k in range(1, 11):
        kesimas = [c[k - 1] for c in por_comentario if len(c) >= k]
        if not kesimas:
            continue
        cobertos = sum(1 for c in por_comentario if len(c) <= k)
        print(f'  K={k:<3} intensidade {percentil(kesimas, 50):.2f}   '
              f'{cobertos}/{len(por_comentario)} comentários já mostram tudo')

    print('\nDistribuição de todas as intensidades')
    for p in (10, 25, 50, 75, 90):
        print(f'  p{p:<3} {percentil(todos_os_pesos, p):.2f}')

    fracos = sum(1 for v in todos_os_pesos if v < 0.3)
    print(f'\n{fracos} de {len(todos_os_pesos)} palavras '
          f'({100 * fracos / len(todos_os_pesos):.0f}%) pesam menos de 30% do máximo '
          f'do seu comentário.')
    print('São elas que enchem a tela de cor sem carregar o resultado.\n')


if __name__ == '__main__':
    main()
