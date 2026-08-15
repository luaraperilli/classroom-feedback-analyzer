"""Termo de consentimento apresentado no primeiro acesso.

O texto vive aqui, versionado junto do código, e não numa tabela do banco: o
que o participante aceitou precisa ser reconstituível a partir do commit que
estava no ar naquela data. É o que sustenta o registro do consentimento caso
ele seja questionado.

Espelha o TCLE assinado em papel (Entregas/TCLE - Voz Discente). Ao alterar o
texto, incremente VERSAO_DO_TERMO: os aceites anteriores param de valer e o
consentimento é pedido de novo, porque consentimento é para um tratamento
determinado, não em branco.
"""

VERSAO_DO_TERMO = '1.0'

TERMO = {
    'versao': VERSAO_DO_TERMO,
    'titulo': 'Antes de começar',
    'resumo': (
        'O Voz Discente faz parte de uma pesquisa de conclusão de curso na UNIFEI. '
        'Sua participação é voluntária e não afeta a sua nota de forma alguma.'
    ),
    'secoes': [
        {
            'titulo': 'O que você vai fazer',
            'texto': (
                'A cada marco da disciplina, você responde seis afirmações sobre a sua '
                'experiência, numa escala de 1 a 5, e escreve um comentário livre. '
                'Leva poucos minutos. Em seguida você vê a análise do seu próprio '
                'comentário, com as palavras que mais pesaram no resultado destacadas.'
            ),
        },
        {
            'titulo': 'Quem vê o que você escreve',
            'texto': (
                'O professor vê os comentários da turma sem saber quem escreveu cada um. '
                'O seu login serve para controlar o acesso e para que você acompanhe o '
                'seu próprio histórico — não para identificar você nos comentários.'
            ),
        },
        {
            'titulo': 'O que o sistema calcula automaticamente',
            'texto': (
                'Um modelo de linguagem identifica o sentimento predominante do seu '
                'comentário e quais palavras mais influenciaram esse resultado. O sistema '
                'também calcula um indicador de acompanhamento por disciplina, a partir '
                'das suas respostas na escala, do sentimento identificado e da regularidade '
                'das suas submissões. Esse indicador existe apenas para que o professor '
                'possa oferecer apoio pedagógico. Ele não afeta a sua nota e não é '
                'comunicado a mais ninguém. Você pode pedir explicações sobre esse cálculo '
                'à pesquisadora quando quiser.'
            ),
        },
        {
            'titulo': 'Seus dados e seus direitos',
            'texto': (
                'Os dados ficam em servidor de acesso restrito e são usados apenas nesta '
                'pesquisa. Nenhum nome aparece em publicações. Você pode apagar qualquer '
                'feedback enviado, a qualquer momento, na tela Minhas Avaliações. E pode '
                'retirar o seu consentimento e apagar todos os seus dados de uma vez, pelo '
                'seu Perfil, sem precisar justificar e sem qualquer prejuízo.'
            ),
        },
        {
            'titulo': 'Se você não quiser participar',
            'texto': (
                'Tudo bem. Recusar não tem nenhum efeito sobre a sua avaliação na '
                'disciplina, e você pode mudar de ideia depois — é só entrar de novo.'
            ),
        },
    ],
    'aceite': (
        'Li e entendi as informações acima. Concordo em participar voluntariamente, '
        'ciente de que posso retirar meu consentimento a qualquer momento.'
    ),
    'contato': 'Luara do Val Perilli — pesquisadora responsável · Orientação: Prof. Dr. Rodrigo Duarte Seabra (IMC/UNIFEI)',
}
