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


# Contas criadas durante o desenvolvimento e a manutenção do serviço, cujos envios
# não podem entrar na análise: 2022004841, 2022004842, 2022004843, rodrigo,
# gabriela, josiane, demonstracao e Cesar. São os oito primeiros ids da tabela,
# criados antes de qualquer conta de participante.
PRIMEIRO_ID_DE_PARTICIPANTE = 9

# A análise se restringe a Interação Humano-Computador (XAHC02). A coleta aberta
# em Computação Aplicada à Educação teve três envios e foi descartada.
DISCIPLINA_ANALISADA = 2

# Corte aplicado pela tela, em frontend/src/utils/wordHighlight.js.
MAXIMO_DE_DESTAQUES = 5

# Palavras gramaticais: classes fechadas que não carregam sentido avaliativo por
# si — artigos, preposições e contrações, conjunções e pronomes. Ficam de fora,
# de propósito, a negação ("não"), as conjunções adversativas e concessivas
# ("mas", "porém", "embora") e os intensificadores ("muito", "mais"), que
# alteram a polaridade e por isso não são ruído. As adversativas saíram da lista
# depois da coleta: na visão global do SHAP, "mas" e "porém" têm contribuição
# média negativa consistente, porque marcam a passagem do elogio à ressalva.
PALAVRAS_GRAMATICAIS = set("""
o a os as um uma uns umas
de do da dos das em no na nos nas por pelo pela pelos pelas para pra pro com sem
sob sobre entre ate até ao aos à às num numa nuns numas dum duma
e ou que se porque pois nem como quando enquanto tambem também
eu tu ele ela nos nós vos vós eles elas me te lhe lhes
meu minha meus minhas teu tua seu sua seus suas nosso nossa nossos nossas
isso isto aquilo esse essa esses essas este esta estes estas aquele aquela aqueles aquelas
""".split())


def main():
    app = create_app()
    with app.app_context():
        feedbacks = [f for f in Feedback.ativos().all()
                     if f.token_attributions
                     and f.student_id >= PRIMEIRO_ID_DE_PARTICIPANTE
                     and f.subject_id == DISCIPLINA_ANALISADA]

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

    # ---- números da Seção 3.4: palavras gramaticais antes e depois do corte ----
    antes = depois = gram_antes = gram_depois = 0
    for f in feedbacks:
        pesos = convergentes(f.token_attributions, f.shap_attributions)
        if not pesos:
            continue
        cortadas = sorted(pesos, key=lambda p: abs(pesos[p]), reverse=True)[:MAXIMO_DE_DESTAQUES]
        antes += len(pesos)
        depois += len(cortadas)
        gram_antes += sum(1 for p in pesos if p.lower() in PALAVRAS_GRAMATICAIS)
        gram_depois += sum(1 for p in cortadas if p.lower() in PALAVRAS_GRAMATICAIS)

    print('Palavras gramaticais entre as destacadas (Seção 3.4)')
    print(f'  sem corte  {gram_antes} de {antes}  ({100 * gram_antes / antes:.0f}%)')
    print(f'  com corte  {gram_depois} de {depois}  ({100 * gram_depois / depois:.0f}%)')
    print(f'  mediana de destaques com corte: '
          f'{percentil([min(len(c), MAXIMO_DE_DESTAQUES) for c in por_comentario], 50):.0f}\n')

    # ---- números da Seção 3.5: concordância de sinal entre LIME e SHAP ----
    concordam = divergem = 0
    rel_div, rel_conc = [], []
    for f in feedbacks:
        lime, shap = f.token_attributions or {}, f.shap_attributions or {}
        if not lime or not shap:
            continue
        maior_shap = max(abs(v) for v in shap.values()) or 1.0
        for p, v in lime.items():
            if p not in shap:
                continue
            rel = abs(shap[p]) / maior_shap
            if (v > 0) == (shap[p] > 0):
                concordam += 1
                rel_conc.append(rel)
            else:
                divergem += 1
                rel_div.append(rel)

    total = concordam + divergem
    print('Concordância de sinal entre LIME e SHAP (Seção 3.5)')
    print(f'  {concordam} de {total} palavras concordam  ({100 * concordam / total:.1f}%)')
    if rel_div:
        print(f'  nas divergentes, |SHAP| mediano = {100 * percentil(rel_div, 50):.0f}% do máximo do comentário')
        print(f'  nas concordantes, |SHAP| mediano = {100 * percentil(rel_conc, 50):.0f}% do máximo do comentário')
    print()


if __name__ == '__main__':
    main()
