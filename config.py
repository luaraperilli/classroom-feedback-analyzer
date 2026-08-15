import os
from datetime import timedelta

from dotenv import load_dotenv

# Precisa vir antes de qualquer leitura de os.environ neste módulo. Carregado
# depois, o .env é ignorado em silêncio — inclusive a DATABASE_URL, e o app
# grava em SQLite achando que está no Postgres.
load_dotenv()

_instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'instance')
os.makedirs(_instance_path, exist_ok=True)

_SQLITE_URI = f"sqlite:///{os.path.join(_instance_path, 'feedback.db')}"


def _normalizar_uri(uri):
    """Ajusta a URI dos provedores gerenciados.

    Supabase, Heroku e Render publicam a conexão com o esquema legado
    "postgres://", que o SQLAlchemy 2.x não reconhece. O SSL também é exigido
    pelo Supabase e nem sempre vem na string.
    """
    if not uri:
        return None

    if uri.startswith('postgres://'):
        uri = uri.replace('postgres://', 'postgresql://', 1)

    if uri.startswith('postgresql://') and 'sslmode=' not in uri:
        uri += ('&' if '?' in uri else '?') + 'sslmode=require'

    return uri


_DATABASE_URI = _normalizar_uri(os.environ.get('DATABASE_URL')) or _SQLITE_URI

# O Cloud Run hiberna instâncias ociosas e o pooler do Supabase encerra conexões
# paradas: sem isto, a primeira consulta após a ociosidade falha.
_OPCOES_POSTGRES = {
    'pool_pre_ping': True,
    'pool_recycle': 280,
    'pool_size': 5,
    'max_overflow': 2,
}


class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = _DATABASE_URI
    SQLALCHEMY_ENGINE_OPTIONS = (
        _OPCOES_POSTGRES if _DATABASE_URI.startswith('postgresql') else {}
    )

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    # Impede que um corpo gigante ocupe o worker.
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024

    # Sem fallback: em produção a ausência falha o boot em create_app().
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')


class DevelopmentConfig(Config):
    DEBUG = True
    # Fallbacks APENAS para desenvolvimento local — nunca usados em produção.
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-somente-local')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-key-somente-local')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000')


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
