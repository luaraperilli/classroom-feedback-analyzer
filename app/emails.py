"""Envio do aviso de que a análise do comentário ficou pronta.

Quem avisa é a própria rota, assim que termina de calcular aquele feedback: o
aluno recebe o e-mail sobre o texto dele, no momento em que a análise dele fica
pronta, sem depender de ninguém rodar comando nenhum. A rotina em lote continua
existindo e avisa o que a rota não conseguiu.

Configuração, no .env local e também no cloudrun.env.yaml:

    SMTP_SERVIDOR=smtp.gmail.com
    SMTP_PORTA=587
    SMTP_USUARIO=voz.discente@exemplo.com
    SMTP_SENHA=senha-de-app-de-16-letras
    SMTP_REMETENTE=Voz Discente <voz.discente@exemplo.com>

Como as credenciais passam a existir no serviço público, use uma conta de e-mail
criada só para o sistema. Quem tiver acesso ao console do Cloud Run consegue ler
a senha de app, e o estrago de uma conta dedicada acaba nela.

Sem essas variáveis o envio não acontece e o sistema registra o aviso, em vez de
falhar. O cálculo da explicação não pode depender de e-mail funcionar.
"""

import datetime
import logging
import os
import re
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)

# Deliberadamente permissivo. A validação rigorosa de e-mail é um problema sem
# solução limpa, e recusar um endereço válido é pior do que aceitar um inválido:
# aqui, o pior caso de um endereço errado é o aviso não chegar, e o aluno vê o
# resultado entrando no site do mesmo jeito.
FORMATO = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

ENDERECO_DO_SISTEMA = 'https://voz-discente.vercel.app'


def email_valido(endereco):
    return bool(endereco) and bool(FORMATO.match(endereco.strip()))


def configurado():
    return all(os.environ.get(v) for v in ('SMTP_SERVIDOR', 'SMTP_USUARIO', 'SMTP_SENHA'))


def _corpo(nome, disciplina):
    saudacao = f'Olá, {nome}!' if nome else 'Olá!'
    return (
        f'{saudacao}\n\n'
        f'A análise do comentário que você enviou em {disciplina} ficou pronta.\n\n'
        f'Você pode ver quais palavras mais pesaram no resultado entrando no sistema, '
        f'em Minhas Avaliações:\n{ENDERECO_DO_SISTEMA}\n\n'
        f'Se esta mensagem tiver caído no lixo eletrônico, marque como "não é spam" '
        f'para receber as próximas na caixa de entrada.\n\n'
        f'Este aviso é automático e o seu e-mail não é usado para mais nada. '
        f'Se quiser deixar de recebê-lo, apague o endereço no seu Perfil.\n\n'
        f'Voz Discente\n'
        f'Trabalho de conclusão de curso em Sistemas de Informação, UNIFEI'
    )


def avisar_explicacao_pronta(destinatario, nome, disciplina):
    """Envia o aviso. Devolve True se enviou, False se não deu ou não dava.

    Nunca levanta exceção: o envio é acessório, e uma falha aqui não pode
    desfazer nem interromper um cálculo que já custou minutos de processamento.
    """
    if not email_valido(destinatario):
        return False

    if not configurado():
        logger.warning('SMTP não configurado, aviso para %s não enviado.', destinatario)
        return False

    conta = os.environ['SMTP_USUARIO']

    mensagem = EmailMessage()
    mensagem['Subject'] = 'A análise do seu comentário ficou pronta'
    mensagem['From'] = os.environ.get('SMTP_REMETENTE') or conta
    mensagem['To'] = destinatario

    # Cabeçalhos que reduzem a chance de o filtro tratar isto como mala direta.
    # Não são garantia — o primeiro teste caiu no lixo eletrônico do Hotmail —
    # mas um remetente sem Reply-To e sem forma declarada de descadastro pontua
    # pior em todos os filtros grandes.
    #
    # O List-Unsubscribe aponta para o próprio remetente porque não há endpoint
    # público de descadastro: o aluno se descadastra apagando o endereço no
    # Perfil, e o corpo diz isso. O cabeçalho existe para o filtro, e a resposta
    # chega a uma caixa que é lida.
    mensagem['Reply-To'] = conta
    mensagem['List-Unsubscribe'] = f'<mailto:{conta}?subject=Descadastrar>'
    mensagem.set_content(_corpo(nome, disciplina))

    try:
        with smtplib.SMTP(os.environ['SMTP_SERVIDOR'],
                          int(os.environ.get('SMTP_PORTA', 587)), timeout=30) as servidor:
            servidor.starttls()
            servidor.login(os.environ['SMTP_USUARIO'], os.environ['SMTP_SENHA'])
            servidor.send_message(mensagem)
        return True
    except Exception:
        logger.exception('Falha ao enviar o aviso para %s', destinatario)
        return False


def notificar(feedback):
    """Avisa o autor de que a análise do feedback dele ficou pronta.

    Ponto único de envio, usado pela rota e pela rotina em lote. Marca
    `avisado_em` antes de devolver, e quem já está marcado não é avisado de novo:
    é isso que impede o aluno de receber o mesmo e-mail duas vezes quando os dois
    caminhos passam pelo mesmo feedback.

    Devolve True só quando um e-mail saiu agora. Nunca levanta exceção, e nunca
    marca `avisado_em` sem envio — um erro de SMTP hoje deixa o feedback
    pendente para a próxima varredura, em vez de silenciar o aviso para sempre.
    """
    from .models import db

    if feedback is None or feedback.avisado_em is not None:
        return False
    if not feedback.explicacao_calculada:
        return False

    aluno = feedback.student
    if not (aluno and email_valido(aluno.email)):
        return False

    if not avisar_explicacao_pronta(aluno.email, aluno.first_name, feedback.subject.name):
        return False

    try:
        feedback.avisado_em = datetime.datetime.utcnow()
        db.session.commit()
    except Exception:
        # O e-mail já saiu; só a marca falhou. Desfazer aqui é o menos pior:
        # a próxima varredura pode reenviar, e um aviso repetido incomoda menos
        # do que uma sessão suja derrubando a requisição inteira.
        db.session.rollback()
        logger.exception('Aviso enviado, mas avisado_em não gravou (feedback=%s)', feedback.id)

    return True
