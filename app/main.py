import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from pysentimiento import create_analyzer
import datetime

# --- CONFIGURAÇÃO INICIAL ---
app = Flask(__name__)
CORS(app) 

# Configuração do Banco de Dados SQLite
# Isso cria um arquivo chamado 'feedback.db' na pasta 'instance' do projeto.
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///feedback.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Cria o analisador de sentimentos para português
sentiment_analyzer = create_analyzer(task="sentiment", lang="pt")


# --- MODELO DO BANCO DE DADOS ---
# Define a estrutura da nossa tabela de feedbacks
class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(500), nullable=False)
    compound = db.Column(db.Float, nullable=False)
    neg = db.Column(db.Float, nullable=False)
    neu = db.Column(db.Float, nullable=False)
    pos = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        """Converte o objeto Feedback para um dicionário (JSON)."""
        return {
            'id': self.id,
            'text': self.text,
            'compound': self.compound,
            'neg': self.neg,
            'neu': self.neu,
            'pos': self.pos,
            'created_at': self.created_at.isoformat()
        }


# --- LÓGICA DE ANÁLISE ---
def get_sentiment(text: str) -> dict:
    """Analisa o sentimento de um texto em português."""
    if not isinstance(text, str) or not text.strip():
        return {'compound': 0.0, 'neg': 0.0, 'neu': 1.0, 'pos': 0.0}

    result = sentiment_analyzer.predict(text)
    probabilities = result.probas
    compound_score = probabilities.get('POS', 0.0) - probabilities.get('NEG', 0.0)

    return {
        'compound': round(compound_score, 4),
        'neg': round(probabilities.get('NEG', 0.0), 4),
        'neu': round(probabilities.get('NEU', 0.0), 4),
        'pos': round(probabilities.get('POS', 0.0), 4)
    }

# --- ROTAS DA API (ENDPOINTS) ---

# Rota para ANALISAR e SALVAR um novo feedback
@app.route('/analyze', methods=['POST'])
def analyze_and_save_feedback():
    data = request.get_json()

    if not data or 'text' not in data:
        return jsonify({"error": "Invalid request. 'text' field is missing."}), 400

    text_to_analyze = data['text']
    sentiment_scores = get_sentiment(text_to_analyze)

    # --- NOVO: SALVANDO NO BANCO DE DADOS ---
    new_feedback = Feedback(
        text=text_to_analyze,
        compound=sentiment_scores['compound'],
        neg=sentiment_scores['neg'],
        neu=sentiment_scores['neu'],
        pos=sentiment_scores['pos']
    )
    db.session.add(new_feedback)
    db.session.commit()
    # ------------------------------------

    return jsonify(sentiment_scores)


# NOVA Rota para BUSCAR todos os feedbacks (para o dashboard)
@app.route('/feedbacks', methods=['GET'])
def get_all_feedbacks():
    all_feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    # Converte cada objeto de feedback para um dicionário
    feedbacks_as_dict = [feedback.to_dict() for feedback in all_feedbacks]
    return jsonify(feedbacks_as_dict)

# Roda a aplicação
if __name__ == '__main__':
    app.run(debug=True)