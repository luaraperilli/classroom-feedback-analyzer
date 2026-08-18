"""Quanto custa LIME e quanto custa SHAP, e como cada um cresce com o texto.

Temporário: apague depois de medir.

    source venv/bin/activate && python perfilar.py
"""

import time

import torch

CURTO = 'Minha aula preferida!'

MEDIO = (
    'A aula de hoje foi boa, mas alguns pontos ficaram confusos e eu me senti '
    'um pouco perdida na parte pratica.'
)

LONGO = (
    'A aula de hoje foi boa, mas alguns pontos ficaram confusos e eu me senti '
    'um pouco perdida na parte pratica. Acho que o ritmo estava mais rapido do '
    'que o normal e nao consegui acompanhar todos os exemplos. Vou rever o '
    'material em casa e trazer duvidas na proxima aula, porque o conteudo me '
    'interessa bastante e nao quero ficar para tras.'
)


def cronometrar(funcao, texto):
    inicio = time.perf_counter()
    funcao(texto)
    return time.perf_counter() - inicio


def main():
    from app import services

    print(f'threads do torch: {torch.get_num_threads()}')
    print(f'tamanho do lote:  {services.TAMANHO_DO_LOTE}\n')

    services.analyze_sentiment_text(CURTO)   # aquece

    print(f'{"texto":<8} {"chars":>6} {"tokens":>7} {"lime":>9} {"shap":>9} {"total":>9}')
    print('-' * 52)

    for nome, texto in (('curto', CURTO), ('medio', MEDIO), ('longo', LONGO)):
        tokens = len(services._tokenizador(texto)['input_ids'])
        t_lime = cronometrar(services.explain_sentiment_lime, texto)
        t_shap = cronometrar(services.explain_sentiment_shap, texto)
        print(f'{nome:<8} {len(texto):>6} {tokens:>7} {t_lime:>8.1f}s {t_shap:>8.1f}s {t_lime + t_shap:>8.1f}s')

    print('\nEm producao o tempo e maior: aqui roda com MPS, o Cloud Run e CPU pura.')


if __name__ == '__main__':
    main()
