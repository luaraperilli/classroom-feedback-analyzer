"""Entrada de produção, usada pelo gunicorn.

O perfil vem de FLASK_CONFIG, que o create_app assume como 'production' quando
não definido.
"""

from app import create_app

app = create_app()
