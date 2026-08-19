"""Termo de consentimento apresentado no primeiro acesso.

O texto vive aqui, versionado junto do código, e não numa tabela do banco: o
que o participante aceitou precisa ser reconstituível a partir do commit que
estava no ar naquela data. É o que sustenta o registro do consentimento caso
ele seja questionado.

Ao alterar o texto, incremente VERSAO_DO_TERMO: os aceites anteriores param de
valer e o consentimento é pedido de novo, porque consentimento é para um
tratamento determinado, não em branco.

Versão 2.0 — revisada na orientação de agosto de 2026, a pedido do orientador:
título explícito de termo de consentimento, identificação dos responsáveis e do
vínculo institucional logo na abertura, e remoção do jargão "marco didático",
que é vocabulário do projeto e não do aluno. A descrição da ferramenta foi
mantida, e encurtada, porque essa explicação não existe em nenhum outro lugar
que o participante vá ler.
"""

VERSAO_DO_TERMO = '2.0'

TERMO = {
    'versao': VERSAO_DO_TERMO,
    'titulo': 'Termo de Consentimento do Uso de Dados',
    # Primeiro parágrafo, e único lugar onde os responsáveis aparecem: quem
    # conduz, sob qual orientação e em que curso. A seção que repetia isso no
    # rodapé foi removida a pedido do orientador — a informação precisa chegar
    # antes de a pessoa decidir, não depois.
    'resumo': (
        'O Voz Discente faz parte de um trabalho de conclusão de curso de graduação em '
        'Sistemas de Informação na UNIFEI, realizado pela aluna Luara do Val Perilli, sob '
        'a orientação do Prof. Dr. Rodrigo Duarte Seabra, do Instituto de Matemática e '
        'Computação.'
    ),
    'secoes': [
        {
            'titulo': 'O que a ferramenta faz',
            'texto': (
                'O Voz Discente coleta a sua opinião sobre a disciplina e analisa '
                'automaticamente o comentário que você escreve, destacando quais palavras '
                'mais influenciaram o resultado. Essa análise é devolvida a você, para '
                'ajudar na reflexão sobre a sua própria experiência no curso.'
            ),
        },
        {
            'titulo': 'Quais dados são coletados',
            'texto': (
                'Quando o professor abrir uma nova participação, você responde seis '
                'afirmações sobre a sua experiência na disciplina, numa escala de 1 a 5, e '
                'escreve um comentário livre. É só isso: nenhum dado pessoal além do seu '
                'nome e da sua matrícula, já usados para criar o seu acesso. Não são '
                'coletados CPF, endereço, localização ou dados de navegação.'
            ),
        },
        {
            'titulo': 'Quem vê o que você escreve',
            'texto': (
                'O professor vê os comentários da turma sem saber quem escreveu cada um. '
                'O seu login serve para controlar o acesso e para que você acompanhe o seu '
                'próprio histórico, não para identificar você nas respostas.'
            ),
        },
        {
            'titulo': 'O que o sistema calcula automaticamente',
            'texto': (
                'Um modelo de linguagem identifica o sentimento predominante do seu '
                'comentário e quais palavras mais pesaram nesse resultado. O sistema também '
                'calcula um indicador de acompanhamento por disciplina, a partir das suas '
                'respostas na escala, do sentimento identificado e da regularidade das suas '
                'participações. Esse indicador serve apenas para que o professor possa '
                'oferecer apoio pedagógico. Ele não afeta a sua nota e não é comunicado a '
                'mais ninguém.'
            ),
        },
        {
            'titulo': 'Sigilo e publicação',
            'texto': (
                'Todas as informações obtidas são mantidas em sigilo e usadas apenas nesta '
                'pesquisa. Nenhum nome ou informação que identifique você aparecerá em '
                'artigos ou publicações originadas deste trabalho. Os dados ficam em '
                'servidor de acesso restrito e são guardados até a conclusão e a defesa da '
                'pesquisa.'
            ),
        },
        {
            'titulo': 'Seus direitos',
            'texto': (
                'Você pode apagar qualquer resposta enviada, a qualquer momento, na tela '
                'Minhas Avaliações. E pode retirar o seu consentimento e apagar todos os '
                'seus dados de uma vez, pelo seu Perfil, sem precisar justificar. O '
                'tratamento segue a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).'
            ),
        },
        {
            'titulo': 'Participação voluntária',
            'texto': (
                'Sua participação é voluntária e pode ser interrompida quando você quiser. '
                'Participar ou não participar não tem qualquer efeito sobre a sua avaliação '
                'ou a sua nota na disciplina, e você não receberá reembolso financeiro por '
                'participar. Se recusar agora, pode mudar de ideia depois — é só entrar de '
                'novo.'
            ),
        },
    ],
    'aceite': (
        'Li e entendi as informações acima. Concordo em participar voluntariamente, '
        'ciente de que posso retirar meu consentimento a qualquer momento.'
    ),
}
