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
    flask definir-email --username marina --email marina@unifei.edu.br
    flask preencher-emails
"""

import secrets
import string

import click
from flask.cli import with_appcontext
from werkzeug.security import generate_password_hash

from .emails import email_valido
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


@click.command('criar-aluno')
@_opcoes_usuario
@with_appcontext
def criar_aluno(username, nome, sobrenome, senha, aleatoria):
    """Cria uma conta de aluno. Para a turma inteira, use criar-alunos."""
    senha = gerar_senha() if aleatoria else senha
    _anunciar(_criar_usuario(username, User.ALUNO, nome, sobrenome, senha), senha)


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


@click.command('vincular-professor')
@click.option('--username', prompt=True, help='Usuário do professor.')
@click.option(
    '--disciplina',
    default=None,
    help='Nome da disciplina. Sem esta opção, vincula a todas as existentes.',
)
@with_appcontext
def vincular_professor(username, disciplina):
    """Vincula um professor a disciplinas já criadas.

    O criar-disciplina só vincula no momento da criação. Este comando cobre o
    caso das disciplinas que já existiam quando o professor foi cadastrado.
    """
    docente = _buscar_usuario(username)
    if not docente or docente.role != User.PROFESSOR:
        raise click.ClickException(f'Professor {username!r} não encontrado.')

    if disciplina:
        alvo = Subject.query.filter(db.func.lower(Subject.name) == disciplina.strip().lower()).first()
        if not alvo:
            raise click.ClickException(f'Disciplina {disciplina!r} não encontrada.')
        disciplinas = [alvo]
    else:
        disciplinas = Subject.query.order_by(Subject.name).all()

    vinculadas = []
    for materia in disciplinas:
        if materia not in docente.subjects:
            docente.subjects.append(materia)
            vinculadas.append(materia.name)

    db.session.commit()

    if vinculadas:
        click.echo(f'\n{docente.username} vinculado a: {", ".join(vinculadas)}\n')
    else:
        click.echo('\nNenhum vínculo novo: já estava vinculado a todas.\n')


# Padrão do e-mail institucional da UNIFEI: a matrícula 2022004841 corresponde a
# d2022004841@unifei.edu.br. É o que permite avisar a turma inteira sem pedir
# nada a ninguém — o endereço já foi atribuído pela universidade e já é conhecido.
PREFIXO_INSTITUCIONAL = 'd'
DOMINIO_INSTITUCIONAL = 'unifei.edu.br'


def _email_institucional(username, prefixo=PREFIXO_INSTITUCIONAL,
                         dominio=DOMINIO_INSTITUCIONAL):
    """Endereço derivado da matrícula, ou None se o usuário não for matrícula.

    Só deriva de usuário inteiramente numérico. Contas nominais como 'rodrigo' ou
    'demonstracao' não seguem esse padrão, e inventar um endereço para elas
    produziria e-mail devolvido em silêncio.
    """
    username = (username or '').strip()
    if not username.isdigit():
        return None
    return f'{prefixo}{username}@{dominio}'


@click.command('criar-alunos')
@click.option(
    '--arquivo',
    type=click.Path(exists=True, dir_okay=False),
    required=True,
    help="Arquivo texto, um aluno por linha: matricula;Nome;Sobrenome[;email]",
)
@click.option(
    '--senha',
    default=SENHA_PROVISORIA_PADRAO,
    show_default=True,
    help='Senha provisória de todos os alunos criados.',
)
@click.option('--aleatoria', is_flag=True, help='Uma senha aleatória por aluno.')
@click.option('--dominio', default=DOMINIO_INSTITUCIONAL, show_default=True,
              help='Domínio do e-mail institucional derivado da matrícula.')
@click.option('--sem-email', is_flag=True,
              help='Não deriva e-mail nenhum. Os alunos ficam sem aviso.')
@with_appcontext
def criar_alunos(arquivo, senha, aleatoria, dominio, sem_email):
    """Cria contas de aluno em lote a partir de um arquivo.

    Alunos que já existem são ignorados, então o comando pode ser repetido sem
    duplicar ninguém.

    Quando o usuário é a matrícula, o e-mail institucional é preenchido junto —
    é ele que permite avisar o aluno quando a análise do comentário fica pronta.
    Uma quarta coluna no arquivo sobrepõe o endereço derivado, para quem tiver
    matrícula fora do padrão.
    """
    criados, ignorados, sem_endereco = [], [], []

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

            if sem_email:
                email = None
            else:
                email = (partes[3] if len(partes) > 3 and partes[3] else
                         _email_institucional(username, dominio=dominio))
                if email and not email_valido(email):
                    raise click.ClickException(
                        f'{email!r} não parece um endereço de e-mail (linha de {username}).')
                if not email:
                    sem_endereco.append(username)

            senha_aluno = gerar_senha() if aleatoria else senha
            aluno = User(
                username=username,
                password=_hash(senha_aluno),
                role=User.ALUNO,
                first_name=partes[1] if len(partes) > 1 else None,
                last_name=partes[2] if len(partes) > 2 else None,
                email=email,
                must_change_password=True,
            )
            db.session.add(aluno)
            criados.append((username, senha_aluno, email))

    db.session.commit()

    click.echo(f'\n{len(criados)} aluno(s) criado(s), {len(ignorados)} já existia(m).')
    if criados:
        click.echo('\nusuario,senha_provisoria,email')
        for username, senha_aluno, email in criados:
            click.echo(f'{username},{senha_aluno},{email or ""}')
    if ignorados:
        click.echo(f"\nJá existiam: {', '.join(ignorados)}")
    if sem_endereco:
        click.echo(f"\nSem e-mail, porque o usuário não é uma matrícula: {', '.join(sem_endereco)}")
        click.echo('Estes não serão avisados. Use definir-email para cada um.')


@click.command('preencher-emails')
@click.option('--dominio', default=DOMINIO_INSTITUCIONAL, show_default=True,
              help='Domínio do e-mail institucional.')
@click.option('--sobrescrever', is_flag=True,
              help='Também troca quem já tem endereço. Sem isto, só preenche quem está sem.')
@click.option('--sim', is_flag=True, help='Executa sem perguntar.')
@with_appcontext
def preencher_emails(dominio, sobrescrever, sim):
    """Preenche o e-mail institucional dos alunos a partir da matrícula.

    Serve para as turmas cujas contas já foram criadas antes de o aviso por
    e-mail existir. Mostra o que vai fazer e pede confirmação antes de gravar.

    Deixa de fora quem não tem matrícula como usuário: para esses o endereço
    seria adivinhado, e um endereço adivinhado é pior do que nenhum, porque
    promete um aviso que nunca chega.
    """
    alunos = User.query.filter_by(role=User.ALUNO).order_by(User.username).all()

    alvos = []
    for aluno in alunos:
        if aluno.email and not sobrescrever:
            continue
        derivado = _email_institucional(aluno.username, dominio=dominio)
        if not derivado or derivado == aluno.email:
            continue
        alvos.append((aluno, derivado))

    if not alvos:
        click.echo('Nada a preencher: todo aluno com matrícula já tem o endereço certo.')
        return

    click.echo(f'\n{len(alvos)} aluno(s) receberão endereço:\n')
    for aluno, derivado in alvos:
        antes = f'{aluno.email} -> ' if aluno.email else ''
        click.echo(f'  {aluno.username:20} {antes}{derivado}')

    nominais = [a.username for a in alunos
                if not _email_institucional(a.username) and not a.email]
    if nominais:
        click.echo(f"\nFicam sem endereço, por não terem matrícula: {', '.join(nominais)}")

    if not sim:
        click.confirm('\nGravar?', abort=True)

    for aluno, derivado in alvos:
        aluno.email = derivado
    db.session.commit()

    click.echo(f'\n{len(alvos)} endereço(s) gravado(s).\n')


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


def _usuarios_do_arquivo(arquivo):
    """Lê o mesmo formato do criar-alunos e devolve só os nomes de usuário."""
    nomes = []
    with open(arquivo, encoding='utf-8') as entrada:
        for linha in entrada:
            linha = linha.strip()
            if not linha or linha.startswith('#'):
                continue
            nomes.append(linha.split(';')[0].strip())
    return nomes


@click.command('redefinir-senha')
@click.option('--username', default=None, help='Usuário que terá a senha redefinida.')
@click.option(
    '--arquivo',
    type=click.Path(exists=True, dir_okay=False),
    default=None,
    help='Redefine a turma inteira, no mesmo formato do criar-alunos.',
)
@click.option('--senha', default=SENHA_PROVISORIA_PADRAO, show_default=True)
@click.option(
    '--definitiva',
    is_flag=True,
    help='Dispensa a troca no próximo acesso. Use quando a pessoa não conseguir passar '
         'pela tela de definição de senha e for preciso desbloqueá-la.',
)
@with_appcontext
def redefinir_senha(username, arquivo, senha, definitiva):
    """Redefine a senha de um usuário — substitui o 'esqueci minha senha'.

    Com --arquivo, redefine a turma inteira numa passada só. Carregar a
    aplicação custa alguns segundos por causa do modelo, e repetir isso trinta e
    oito vezes num laço de shell levaria minutos.
    """
    if bool(username) == bool(arquivo):
        raise click.ClickException('Use --username para uma pessoa ou --arquivo para a turma.')

    nomes = [username] if username else _usuarios_do_arquivo(arquivo)
    if not nomes:
        raise click.ClickException('O arquivo não tem nenhum usuário.')

    alterados, ausentes = [], []
    for nome in nomes:
        usuario = _buscar_usuario(nome)
        if not usuario:
            ausentes.append(nome)
            continue
        usuario.password = _hash(senha)
        usuario.must_change_password = not definitiva
        alterados.append(usuario.username)

    # Um commit só: se algo falhar no meio, metade da turma não fica com uma
    # senha e metade com outra.
    db.session.commit()

    if username and ausentes:
        raise click.ClickException(f'Usuário {username!r} não encontrado.')

    click.echo(f'\n{len(alterados)} senha(s) redefinida(s) para: {senha}')
    if definitiva:
        click.echo('A troca NÃO será exigida — as pessoas entram direto com esta senha.')
    else:
        click.echo('A troca será exigida no próximo acesso.')
    if ausentes:
        click.echo(f"\nNão encontrados, e por isso inalterados: {', '.join(ausentes)}")
    click.echo('')


@click.command('definir-email')
@click.option('--username', prompt=True, help='Usuário que terá o e-mail alterado.')
@click.option('--email', default='', help='Endereço. Vazio apaga o que estava lá.')
@with_appcontext
def definir_email(username, email):
    """Define o e-mail de aviso de um usuário pela linha de comando.

    O caminho normal é o próprio titular cadastrar no Perfil. Este comando existe
    para operação: testar o envio antes de a tela estar publicada, e corrigir um
    endereço digitado errado sem pedir para a pessoa entrar de novo.
    """
    from .emails import email_valido

    usuario = _buscar_usuario(username)
    if not usuario:
        raise click.ClickException(f'Usuário {username!r} não encontrado.')

    endereco = (email or '').strip()
    if endereco and not email_valido(endereco):
        raise click.ClickException(f'{endereco!r} não parece um endereço de e-mail.')

    usuario.email = endereco or None
    db.session.commit()

    if endereco:
        click.echo(f'\n{usuario.username} passa a ser avisado(a) em {endereco}.\n')
    else:
        click.echo(f'\nO e-mail de {usuario.username} foi apagado. Não será mais avisado(a).\n')


@click.command('estado-dos-feedbacks')
@click.option('--username', prompt=True, help='Aluno a inspecionar.')
@click.option('--quantos', default=10, show_default=True, help='Quantos feedbacks mostrar.')
@with_appcontext
def estado_dos_feedbacks(username, quantos):
    """Mostra em que ponto está cada feedback de um aluno.

    Serve para responder, sem abrir o banco na mão, por que alguém não recebeu o
    aviso: pode ser que o feedback não exista, que a explicação não tenha sido
    calculada, que o aluno esteja sem endereço, ou que o aviso já tenha saído e o
    e-mail tenha caído em outra pasta.
    """
    from .models import Feedback

    usuario = _buscar_usuario(username)
    if not usuario:
        raise click.ClickException(f'Usuário {username!r} não encontrado.')

    click.echo(f'\n{usuario.username} — {usuario.display_name}')
    click.echo(f'  e-mail: {usuario.email or "NENHUM, não será avisado"}')
    click.echo(f'  consentimento: {usuario.consentimento_versao or "não manifestado"}')

    feedbacks = (Feedback.query
                 .filter(Feedback.student_id == usuario.id)
                 .order_by(Feedback.id.desc())
                 .limit(quantos).all())

    if not feedbacks:
        click.echo('\n  Nenhum feedback. O envio não chegou a ser salvo.\n')
        return

    click.echo(f'\n  {"id":>5}  {"enviado em":16}  {"situação":34}  comentário')
    for f in feedbacks:
        if f.deleted_at:
            situacao = 'retirado pelo aluno'
        elif not f.additional_comment:
            situacao = 'sem comentário, nada a explicar'
        elif not f.explicacao_calculada:
            situacao = ('cálculo em curso' if f.explicacao_em_curso
                        else 'SEM explicação, e sem cálculo em curso')
        elif f.avisado_em:
            situacao = f'avisado em {f.avisado_em:%d/%m %H:%M}'
        elif not usuario.email:
            situacao = 'explicado, sem endereço para avisar'
        else:
            situacao = 'explicado, AVISO PENDENTE'

        trecho = (f.additional_comment or '')[:40]
        click.echo(f'  {f.id:>5}  {f.created_at:%d/%m %H:%M}     {situacao:34}  {trecho}')

    click.echo('\n  Horários em UTC. "AVISO PENDENTE" se resolve com calcular-explicacoes.\n')


@click.command('resetar-consentimento')
@click.option('--username', prompt=True, help='Usuário que voltará a ver o termo.')
@with_appcontext
def resetar_consentimento(username):
    """Faz o termo ser apresentado de novo no próximo acesso.

    Serve para recapturar a tela do termo, que só aparece a quem ainda não
    manifestou. Não apaga feedback nenhum — diferente da retirada de
    consentimento feita pelo próprio titular no Perfil.
    """
    usuario = _buscar_usuario(username)
    if not usuario:
        raise click.ClickException(f'Usuário {username!r} não encontrado.')

    usuario.consentimento_em = None
    usuario.consentimento_versao = None
    db.session.commit()

    click.echo(f'\nO termo será apresentado de novo para {usuario.username} no próximo acesso.')
    click.echo('Os feedbacks dele(a) foram preservados.\n')


@click.command('calcular-explicacoes')
@click.option('--sem-email', is_flag=True,
              help='Calcula sem avisar ninguém. Útil para testar.')
@with_appcontext
def calcular_explicacoes(sem_email):
    """Calcula LIME e SHAP dos comentários que ficaram sem explicação.

    Serve para os feedbacks cuja requisição caiu antes de as atribuições serem
    gravadas: o comentário e o sentimento estão salvos, o destaque não.
    """
    import json

    from .emails import configurado, notificar
    from .models import Feedback
    from .services import explain_sentiment_lime, explain_sentiment_shap

    if not sem_email and not configurado():
        click.echo('Aviso: SMTP não configurado, ninguém será avisado por e-mail.')
        click.echo('As explicações são calculadas assim mesmo.\n')

    pendentes = Feedback.ativos().filter(
        Feedback.additional_comment.isnot(None),
        Feedback.additional_comment != '',
        Feedback.token_attributions_json.is_(None),
    ).order_by(Feedback.id).all()

    avisados = 0

    if pendentes:
        click.echo(f'{len(pendentes)} comentário(s) sem explicação. Cada um leva alguns minutos.\n')

        for posicao, feedback in enumerate(pendentes, 1):
            trecho = feedback.additional_comment[:50]
            click.echo(f'[{posicao}/{len(pendentes)}] {trecho}...', nl=False)

            try:
                feedback.token_attributions_json = json.dumps(explain_sentiment_lime(feedback.additional_comment))
                feedback.shap_attributions_json = json.dumps(explain_sentiment_shap(feedback.additional_comment))
                db.session.commit()
                click.echo(' ok')
            except Exception as erro:
                db.session.rollback()
                click.echo(f' falhou: {erro}')
    else:
        click.echo('Nenhum comentário pendente de explicação.')

    if sem_email:
        return

    # Segunda passada, separada da primeira de propósito. O aviso normal parte da
    # rota, assim que aquele feedback termina de calcular. Aqui varre-se tudo o
    # que ficou calculado e sem aviso, seja porque o SMTP estava fora, seja
    # porque o cálculo foi feito acima e não passou pela rota.
    sem_aviso = Feedback.ativos().filter(
        Feedback.token_attributions_json.isnot(None),
        Feedback.avisado_em.is_(None),
    ).order_by(Feedback.id).all()

    sem_endereco = []

    for feedback in sem_aviso:
        aluno = feedback.student
        if not (aluno and aluno.email):
            # Reportado, e não só ignorado: é o único sinal de que alguém da
            # turma não vai ser avisado, e dá para resolver com preencher-emails.
            sem_endereco.append(aluno.username if aluno else f'feedback {feedback.id}')
            continue

        # O try é a segunda camada. O `notificar` já trata as falhas que conhece,
        # mas uma exceção inesperada aqui abortaria a varredura e deixaria sem
        # aviso todos os alunos seguintes da fila.
        try:
            if notificar(feedback):
                avisados += 1
                click.echo(f'avisado: {aluno.email}')
            else:
                click.echo(f'aviso não saiu para {aluno.email}')
        except Exception as erro:
            click.echo(f'aviso do feedback {feedback.id} falhou: {erro}')

    click.echo(f'\nPronto. {avisados} aviso(s) enviado(s).')
    if sem_endereco:
        click.echo(f"Sem e-mail cadastrado, não avisados: {', '.join(sorted(set(sem_endereco)))}")
        click.echo('Rode preencher-emails para os que têm matrícula como usuário.')


@click.command('apagar-contas-de-teste')
@click.option('--prefixo', required=True,
              help='Apaga os alunos cujo usuário começa assim. Ex.: valid, carga.')
@click.option('--sim', is_flag=True, help='Executa sem perguntar.')
@with_appcontext
def apagar_contas_de_teste(prefixo, sim):
    """Remove contas de teste e tudo o que elas produziram.

    Existe porque a bateria de aceitação precisa de contas recém-criadas, com
    senha provisória e consentimento pendente, então repetir a bateria exige
    apagar e recriar. Fazer isso pelo SQL do Supabase a cada rodada é
    trabalhoso e arriscado, e um DELETE digitado com pressa não distingue conta
    de teste de participante real.

    Recusa prefixos curtos e só apaga contas de aluno, para que um engano de
    digitação não alcance a turma. E mostra o que vai apagar antes de apagar.
    """
    from .models import Feedback, StudentRiskAnalysis

    prefixo = (prefixo or '').strip()
    if len(prefixo) < 4:
        click.echo('Use um prefixo de pelo menos 4 letras. Prefixo curto alcança '
                   'conta de participante por acidente.')
        return

    contas = (User.query
              .filter(User.role == User.ALUNO)
              .filter(User.username.like(f'{prefixo}%'))
              .order_by(User.username)
              .all())

    if not contas:
        click.echo(f'Nenhuma conta de aluno começando com "{prefixo}".')
        return

    ids = [c.id for c in contas]
    feedbacks = Feedback.query.filter(Feedback.student_id.in_(ids)).count()

    click.echo(f'\n{len(contas)} conta(s) e {feedbacks} feedback(s) serão apagados:')
    for c in contas:
        quantos = Feedback.query.filter_by(student_id=c.id).count()
        click.echo(f'  {c.username:20s} {quantos} feedback(s)')

    if not sim and not click.confirm('\nApagar tudo isso?'):
        click.echo('Nada foi apagado.')
        return

    StudentRiskAnalysis.query.filter(StudentRiskAnalysis.student_id.in_(ids)).delete(
        synchronize_session=False)
    Feedback.query.filter(Feedback.student_id.in_(ids)).delete(synchronize_session=False)
    User.query.filter(User.id.in_(ids)).delete(synchronize_session=False)
    db.session.commit()

    click.echo(f'\nPronto. {len(contas)} conta(s) e {feedbacks} feedback(s) apagados.')


def register_commands(app):
    for comando in (criar_coordenador, criar_professor, criar_disciplina,
                    criar_aluno, criar_alunos, vincular_professor, listar_usuarios,
                    redefinir_senha, definir_email, preencher_emails,
                    estado_dos_feedbacks, resetar_consentimento,
                    calcular_explicacoes, apagar_contas_de_teste):
        app.cli.add_command(comando)
