from dotenv import load_dotenv
from app import create_app

load_dotenv()

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='127.0.0.1')
