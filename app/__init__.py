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


def run_lightweight_migrations():
    """Adiciona colunas novas a bancos já existentes — o projeto não usa Flask-Migrate.
    Idempotente: só altera a tabela se a coluna ainda não existir, então é seguro rodar
    em todo boot sem perder os dados já gravados."""
    inspector = sa_inspect(db.engine)

    # user.must_change_password
    try:
        user_cols = {c["name"] for c in inspector.get_columns("user")}
    except Exception:
        user_cols = set()
    if user_cols and "must_change_password" not in user_cols:
        db.session.execute(text(
            'ALTER TABLE "user" ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0'
        ))
        db.session.commit()

    # feedback.tema_id (vínculo do feedback com o tema da aula)
    try:
        fb_cols = {c["name"] for c in inspector.get_columns("feedback")}
    except Exception:
        fb_cols = set()
    if fb_cols and "tema_id" not in fb_cols:
        db.session.execute(text('ALTER TABLE feedback ADD COLUMN tema_id INTEGER'))
        db.session.commit()

def create_app(config_name=None):
    config_name = config_name or os.environ.get('FLASK_CONFIG', 'development')
    app = Flask(__name__)

    app.config.from_object(config_by_name[config_name])

    # Em produção as chaves são obrigatórias — falha cedo se faltarem.
    if config_name == 'production' and not (app.config.get('SECRET_KEY') and app.config.get('JWT_SECRET_KEY')):
        raise RuntimeError(
            "SECRET_KEY e JWT_SECRET_KEY são obrigatórios em produção. "
            "Defina-os nas variáveis de ambiente (ex.: arquivo .env)."
        )

    register_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)
    
    with app.app_context():
        db.create_all()
        run_lightweight_migrations()
        # Só popula dados de demonstração (contas com senha simples) em desenvolvimento.
        if app.config.get('DEBUG'):
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

def register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Recurso não encontrado."}), 404

    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.error(f"Erro interno do servidor: {error}")
        return jsonify({"error": "Ocorreu um erro interno no servidor."}), 500