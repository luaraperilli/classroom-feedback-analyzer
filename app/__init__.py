import os
from flask import Flask
from flask_cors import CORS
from .models import db
from .routes import api

def create_app():
    instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
    os.makedirs(instance_path, exist_ok=True)
    
    app = Flask(__name__, instance_path=instance_path)
    CORS(app) 

    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(instance_path, 'feedback.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    app.register_blueprint(api)
    
    with app.app_context():
        db.create_all()
        
    return app

