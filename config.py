import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dd48f27aa60077e0e537eed381e77696259a6160e3956088f28f1f5fc45d7fca')
    JWT_SECRET_KEY = os.environ.get('dd48f27aa60077e0e537eed381e77696259a6160e3956088f28f1f5fc45d7fca')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

class DevelopmentConfig(Config):
    DEBUG = True
    instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'instance')
    os.makedirs(instance_path, exist_ok=True)
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(instance_path, 'feedback.db')}"

config_by_name = {
    'development': DevelopmentConfig,
}