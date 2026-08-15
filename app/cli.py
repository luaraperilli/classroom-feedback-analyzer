"""Comandos de operação do sistema.

Existem porque a senha é gravada como hash PBKDF2: um INSERT direto no banco com
a senha em texto não permite login. Todo usuário criado aqui nasce com senha
provisória e obrigação de defini-la no primeiro acesso.

    flask criar-coordenador --username coordenacao
    flask criar-professor --username rodrigo --nome Rodrigo --sobrenome Seabra
    flask criar-disciplina --nome "Interação Humano-Computador" --professor rodrigo
    flask criar-alunos --arquivo turma.txt
    flask listar-usuarios
    flask redefinir-senha --username marina
"""

import secrets
import string

import click
from flask.cli import with_appcontext
from werkzeug.security import generate_password_hash

from .models import Subject, User, db

SENHA_PROVISORIA_PADRAO = '123'
ALFABETO = string.ascii_letters + string.digits


def gerar_senha(tamanho=12):
    """Senha aleatória que satisfaz a política do sistema."""
    while True:
        senha = ''.join(secrets.choice(ALFABETO) for _ in range(tamanho))
        if (any(c.isupper() for c in senha)
                and any(c.islower() for c in senha)
                and any(c.isdigit() for c in senha)):
            return senha


def _hash(senha):
    return generate_password_hash(senha, method='pbkdf2:sha256')


def _buscar_usuario(username):
    return User.query.filter(db.func.lower(User.username) == username.strip().lower()).first()


def _criar_usuario(username, role, nome, sobrenome, senha):
    username = (username or '').strip()
    if not username:
        raise click.ClickException('O nome de usuário não pode ser vazio.')

    existente = _buscar_usuario(username)
    if existente:
        raise click.ClickException(f'Já existe um usuário chamado {existente.username!r}.')

    usuario = User(
        username=username,
        password=_hash(senha),
        role=role,
        first_name=(nome or '').strip() or None,
        last_name=(sobrenome or '').strip() or None,
        must_change_password=True,
    )
    db.session.add(usuario)
    db.session.commit()
    return usuario


def _opcoes_usuario(funcao):
    """Opções comuns aos comandos que criam um usuário."""
    funcao = click.option('--username', prompt=True, help='Nome de usuário para login.')(funcao)
    funcao = click.option('--nome', default='', help='Primeiro nome.')(funcao)
    funcao = click.option('--sobrenome', default='', help='Sobrenome.')(funcao)
    funcao = click.option(
        '--senha',
        default=SENHA_PROVISORIA_PADRAO,
        show_default=True,
        help='Senha provisória. Use --aleatoria para gerar uma forte.',
    )(funcao)
    funcao = click.option(
        '--aleatoria', is_flag=True, help='Gera uma senha provisória aleatória.'
    )(funcao)
    return funcao


def _anunciar(usuario, senha):
    click.echo(f'\n{usuario.role.capitalize()} criado.')
    click.echo(f'  usuário: {usuario.username}')
    click.echo(f'  senha provisória: {senha}')
    click.echo('  (a troca é obrigatória no primeiro acesso)\n')


@click.command('criar-coordenador')
@_opcoes_usuario
@with_appcontext
def criar_coordenador(username, nome, sobrenome, senha, aleatoria):
    """Cria o primeiro coordenador — o ponto de entrada do sistema."""
    senha = gerar_senha() if aleatoria else senha
    _anunciar(_criar_usuario(username, User.COORDENADOR, nome, sobrenome, senha), senha)


@click.command('criar-professor')
@_opcoes_usuario
@with_appcontext
def criar_professor(username, nome, sobrenome, senha, aleatoria):
    """Cria uma conta de professor."""
    senha = gerar_senha() if aleatoria else senha
    _anunciar(_criar_usuario(username, User.PROFESSOR, nome, sobrenome, senha), senha)


@click.command('criar-disciplina')
@click.option('--nome', prompt=True, help='Nome da disciplina.')
@click.option('--professor', default=None, help='Usuário do professor responsável.')
@with_appcontext
def criar_disciplina(nome, professor):
    """Cria a disciplina e, opcionalmente, vincula o professor."""
    nome = nome.strip()
    if Subject.query.filter(db.func.lower(Subject.name) == nome.lower()).first():
        raise click.ClickException(f'A disciplina {nome!r} já existe.')

    disciplina = Subject(name=nome)
    db.session.add(disciplina)

    if professor:
        docente = _buscar_usuario(professor)
        if not docente or docente.role != User.PROFESSOR:
            raise click.ClickException(f'Professor {professor!r} não encontrado.')
        docente.subjects.append(disciplina)

    db.session.commit()
    vinculo = f' e vinculada a {professor}' if professor else ''
    click.echo(f'Disciplina {nome!r} criada{vinculo}.')


@click.command('criar-alunos')
@click.option(
    '--arquivo',
    type=click.Path(exists=True, dir_okay=False),
    required=True,
    help="Arquivo texto, um aluno por linha: usuario;Nome;Sobrenome",
)
@click.option(
    '--senha',
    default=SENHA_PROVISORIA_PADRAO,
    show_default=True,
    help='Senha provisória de todos os alunos criados.',
)
@click.option('--aleatoria', is_flag=True, help='Uma senha aleatória por aluno.')
@with_appcontext
def criar_alunos(arquivo, senha, aleatoria):
    """Cria contas de aluno em lote a partir de um arquivo.

    Alunos que já existem são ignorados, então o comando pode ser repetido sem
    duplicar ninguém.
    """
    criados, ignorados = [], []

    with open(arquivo, encoding='utf-8') as entrada:
        for linha in entrada:
            linha = linha.strip()
            if not linha or linha.startswith('#'):
                continue

            partes = [p.strip() for p in linha.split(';')]
            username = partes[0]

            if _buscar_usuario(username):
                ignorados.append(username)
                continue

            senha_aluno = gerar_senha() if aleatoria else senha
            aluno = User(
                username=username,
                password=_hash(senha_aluno),
                role=User.ALUNO,
                first_name=partes[1] if len(partes) > 1 else None,
                last_name=partes[2] if len(partes) > 2 else None,
                must_change_password=True,
            )
            db.session.add(aluno)
            criados.append((username, senha_aluno))

    db.session.commit()

    click.echo(f'\n{len(criados)} aluno(s) criado(s), {len(ignorados)} já existia(m).')
    if criados:
        click.echo('\nusuario,senha_provisoria')
        for username, senha_aluno in criados:
            click.echo(f'{username},{senha_aluno}')
    if ignorados:
        click.echo(f"\nJá existiam: {', '.join(ignorados)}")


@click.command('listar-usuarios')
@with_appcontext
def listar_usuarios():
    """Lista os usuários cadastrados, agrupados por papel."""
    usuarios = User.query.order_by(User.role, User.username).all()
    if not usuarios:
        click.echo('Nenhum usuário cadastrado.')
        return

    for usuario in usuarios:
        pendente = '  [senha provisória]' if usuario.must_change_password else ''
        click.echo(f'{usuario.role:12} {usuario.username:20} {usuario.display_name}{pendente}')


@click.command('redefinir-senha')
@click.option('--username', prompt=True, help='Usuário que terá a senha redefinida.')
@click.option('--senha', default=SENHA_PROVISORIA_PADRAO, show_default=True)
@with_appcontext
def redefinir_senha(username, senha):
    """Redefine a senha de um usuário — substitui o 'esqueci minha senha'."""
    usuario = _buscar_usuario(username)
    if not usuario:
        raise click.ClickException(f'Usuário {username!r} não encontrado.')

    usuario.password = _hash(senha)
    usuario.must_change_password = True
    db.session.commit()

    click.echo(f'\nSenha de {usuario.username} redefinida para: {senha}')
    click.echo('A troca será exigida no próximo acesso.\n')


def register_commands(app):
    for comando in (criar_coordenador, criar_professor, criar_disciplina,
                    criar_alunos, listar_usuarios, redefinir_senha):
        app.cli.add_command(comando)
