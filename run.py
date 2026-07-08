import os
from dotenv import load_dotenv
from app import create_app

load_dotenv()

app = create_app()

if __name__ == '__main__':
    # debug segue o perfil (True só em desenvolvimento); porta/host configuráveis p/ deploy.
    app.run(
        debug=app.config.get('DEBUG', False),
        port=int(os.environ.get('PORT', 5001)),
        host=os.environ.get('HOST', '127.0.0.1'),
    )
