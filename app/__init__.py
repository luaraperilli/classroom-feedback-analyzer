from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# 1. Importar o objeto de configuração
from config import config_by_name 
from .seeder import seed_all
from .models import db
from .routes import api
from .auth import auth
from .admin import admin_bp

def create_app(config_name='development'):
    app = Flask(__name__)
    
    app.config.from_object(config_by_name[config_name])

    register_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)
    
    with app.app_context():
        db.create_all()
        seed_all()

    return app

def register_extensions(app):
    db.init_app(app)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
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