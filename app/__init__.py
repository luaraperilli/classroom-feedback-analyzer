import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.security import generate_password_hash

from .models import db, User, Subject
from .routes import api
from .auth import auth

def create_app():
    instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
    os.makedirs(instance_path, exist_ok=True)

    app = Flask(__name__, instance_path=instance_path)

    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    app.config["JWT_SECRET_KEY"] = os.environ.get('JWT_SECRET_KEY', 'dd48f27aa60077e0e537eed381e77696259a6160e3956088f28f1f5fc45d7fca')
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

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
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(instance_path, 'feedback.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    app.register_blueprint(api)
    app.register_blueprint(auth)

    with app.app_context():
        db.create_all()
        seed_data()

    return app

def seed_data():
    if User.query.first() is None:
        hashed_password = generate_password_hash("123", method="pbkdf2:sha256")
        
        coordinator = User(username="coordinator", password=hashed_password, role="coordenador")
        professor = User(username="professor", password=hashed_password, role="professor")
        student = User(username="student", password=hashed_password, role="aluno")

        db.session.add_all([coordinator, professor, student])
        db.session.commit()

        data_structures = Subject(name="Data Structures")
        database_systems = Subject(name="Database Systems")
        software_engineering = Subject(name="Software Engineering")
        computer_networks = Subject(name="Computer Networks")
        information_security = Subject(name="Information Security")
        
        db.session.add_all([
            data_structures, 
            database_systems, 
            software_engineering, 
            computer_networks, 
            information_security
        ])
        db.session.commit()

        professor.subjects.append(data_structures)
        professor.subjects.append(database_systems)
        professor.subjects.append(software_engineering)
        
        db.session.commit()