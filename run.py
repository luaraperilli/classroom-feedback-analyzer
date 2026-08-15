"""Entrada de desenvolvimento. Em produção o servidor é o gunicorn (ver wsgi.py).

O .env é carregado no import do config.py, antes de qualquer leitura do ambiente.
"""

import os

from app import create_app

app = create_app(os.environ.get('FLASK_CONFIG', 'development'))

if __name__ == '__main__':
    app.run(
        debug=app.config.get('DEBUG', False),
        port=int(os.environ.get('PORT', 5001)),
        host=os.environ.get('HOST', '127.0.0.1'),
    )
