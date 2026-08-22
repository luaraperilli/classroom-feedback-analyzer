"""Envio do aviso de que a análise do comentário ficou pronta.

Mora aqui e não nas rotas de propósito: quem envia é a rotina em lote, que roda
na máquina da pesquisadora. Assim as credenciais de e-mail não precisam existir
no Cloud Run, e um serviço público deixa de ter permissão para disparar mensagem
em nome de ninguém.

Configuração, no .env local:

    SMTP_SERVIDOR=smtp.gmail.com
    SMTP_PORTA=587
    SMTP_USUARIO=voz.discente@exemplo.com
    SMTP_SENHA=senha-de-app-de-16-letras
    SMTP_REMETENTE=Voz Discente <voz.discente@exemplo.com>

Sem essas variáveis o envio não acontece e o sistema avisa, em vez de falhar. O
cálculo da explicação não pode depender de e-mail funcionar.
"""

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

    mensagem = EmailMessage()
    mensagem['Subject'] = 'A análise do seu comentário ficou pronta'
    mensagem['From'] = os.environ.get('SMTP_REMETENTE') or os.environ['SMTP_USUARIO']
    mensagem['To'] = destinatario
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
