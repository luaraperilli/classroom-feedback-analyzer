import os
from datetime import timedelta

# diretório do banco (compartilhado pelos perfis)
_instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'instance')
os.makedirs(_instance_path, exist_ok=True)


class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', f"sqlite:///{os.path.join(_instance_path, 'feedback.db')}"
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)   # reduzido de 30 -> 7 dias

    # Segredos SEMPRE via variável de ambiente. Sem fallback aqui: em produção
    # a ausência é detectada em create_app() e o boot falha de propósito.
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

    # Origens permitidas no CORS (lista separada por vírgula via env em produção).
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')


class DevelopmentConfig(Config):
    DEBUG = True
    # Fallbacks APENAS para desenvolvimento local — nunca usados em produção.
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-somente-local')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-key-somente-local')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000')


class ProductionConfig(Config):
    DEBUG = False
    # Em produção, SECRET_KEY, JWT_SECRET_KEY e CORS_ORIGINS DEVEM vir do ambiente.
    # (a validação das chaves acontece em create_app().)


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
