import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import inspect as sa_inspect, text

from config import config_by_name
from .seeder import seed_all, ensure_demo_pending_student
from .models import db
from .routes import api
from .auth import auth
from .admin import admin_bp

logger = logging.getLogger(__name__)


# Colunas acrescentadas depois que a tabela "user" já existia em algum ambiente.
# O create_all() cria tabelas, mas nunca altera as que já existem — sem isto, um
# banco criado antes destas colunas quebra na primeira consulta.
#
# Todas nasceram anuláveis e sem DEFAULT de propósito: essa sintaxe é idêntica no
# SQLite e no Postgres. A tentativa anterior usava BOOLEAN NOT NULL DEFAULT 0, que
# o Postgres rejeita porque 0 não é literal booleano lá.
_COLUNAS_NOVAS = (
    ('must_change_password', 'BOOLEAN', True),   # True = só SQLite, pelo NOT NULL DEFAULT
    ('consentimento_em', 'TIMESTAMP', False),
    ('consentimento_versao', 'VARCHAR(20)', False),
)


def run_lightweight_migrations():
    """Acrescenta colunas que faltam na tabela "user", em SQLite ou Postgres."""
    e_sqlite = db.engine.url.get_backend_name().startswith('sqlite')

    try:
        colunas = {c['name'] for c in sa_inspect(db.engine).get_columns('user')}
    except Exception:
        return

    if not colunas:
        return

    for nome, tipo, apenas_sqlite in _COLUNAS_NOVAS:
        if nome in colunas or (apenas_sqlite and not e_sqlite):
            continue

        declaracao = f'{tipo} NOT NULL DEFAULT 0' if apenas_sqlite else tipo
        db.session.execute(text(f'ALTER TABLE "user" ADD COLUMN {nome} {declaracao}'))
        db.session.commit()
        logger.info('Coluna %s adicionada à tabela user.', nome)


def _validar_producao(app):
    """Falha o boot em vez de subir inseguro ou com o frontend bloqueado."""
    faltando = [
        nome for nome in ('SECRET_KEY', 'JWT_SECRET_KEY', 'CORS_ORIGINS')
        if not app.config.get(nome)
    ]
    if faltando:
        raise RuntimeError(
            'Variáveis obrigatórias em produção não definidas: ' + ', '.join(faltando)
        )

    if app.config['SECRET_KEY'] == app.config['JWT_SECRET_KEY']:
        raise RuntimeError('SECRET_KEY e JWT_SECRET_KEY devem ser diferentes.')

    if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite'):
        raise RuntimeError(
            'Em produção é necessário um Postgres — defina DATABASE_URL. '
            'O SQLite não sobrevive a redeploys em hospedagem com disco efêmero.'
        )


def create_app(config_name=None):
    # Padrão 'production': esquecer a variável no host não pode ligar o DEBUG,
    # expor o console do Werkzeug nem semear contas de demonstração.
    config_name = config_name or os.environ.get('FLASK_CONFIG', 'production')
    if config_name not in config_by_name:
        raise RuntimeError(
            f'FLASK_CONFIG inválido: {config_name!r}. Use um de: {", ".join(config_by_name)}.'
        )

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    app.config['CONFIG_NAME'] = config_name

    logging.basicConfig(
        level=logging.DEBUG if app.config.get('DEBUG') else logging.INFO,
        format='%(asctime)s %(levelname)s [%(name)s] %(message)s',
    )

    if config_name == 'production':
        _validar_producao(app)

    register_extensions(app)
    register_blueprints(app)
    register_health(app)
    register_error_handlers(app)
    register_cli(app)

    with app.app_context():
        db.create_all()
        run_lightweight_migrations()
        # Dados de demonstração (senhas simples) só em desenvolvimento.
        if config_name == 'development':
            seed_all()
            ensure_demo_pending_student()

    return app

def register_extensions(app):
    db.init_app(app)
    origins = [o.strip() for o in (app.config.get('CORS_ORIGINS') or '').split(',') if o.strip()] or ['http://localhost:3000']
    CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)
    jwt = JWTManager(app)

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'message': 'O token de acesso expirou. Por favor, faça login novamente.', 'status': 401}), 401

    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({'message': 'Requisição não autorizada. Um token de acesso válido é necessário.', 'status': 401}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(error):
        return jsonify({
            'message': 'O token fornecido é inválido.',
            'error_details': str(error),
            'status': 401
        }), 401
        
    # Sem este loader o revoked_token_loader abaixo nunca disparava: nada
    # informava ao JWT quais tokens haviam sido revogados.
    @jwt.token_in_blocklist_loader
    def token_revogado(jwt_header, jwt_payload):
        from .models import TokenRevogado
        return TokenRevogado.esta_revogado(jwt_payload['jti'])

    @jwt.revoked_token_loader
    def revoked_token_response(jwt_header, jwt_payload):
        return jsonify({'message': 'O token foi revogado.', 'status': 401}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_response(jwt_header, jwt_payload):
        return jsonify({'message': 'É necessário um token atualizado para esta ação.', 'status': 401}), 401

def register_blueprints(app):
    app.register_blueprint(api)
    app.register_blueprint(auth)
    app.register_blueprint(admin_bp, url_prefix='/admin')

def register_health(app):
    @app.route('/health')
    def health():
        """Usado pelo healthcheck da hospedagem. Não toca o banco nem carrega o
        modelo, para responder rápido durante o cold start."""
        return jsonify({'status': 'ok'}), 200


def register_cli(app):
    from .cli import register_commands
    register_commands(app)


def register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Recurso não encontrado."}), 404

    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.error(f"Erro interno do servidor: {error}")
        return jsonify({"error": "Ocorreu um erro interno no servidor."}), 500