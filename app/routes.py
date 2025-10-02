from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, get_jwt

from .models import Feedback, db
from .services import analyze_sentiment_text

api = Blueprint("api", __name__)

@api.route("/analyze", methods=["POST"])
@jwt_required()
def analyze_and_save_feedback():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Pedido inválido. O campo \'text\' está em falta."}), 400

    text_to_analyze = data["text"]
    sentiment_scores = analyze_sentiment_text(text_to_analyze)

    new_feedback = Feedback(
        text=text_to_analyze,
        compound=sentiment_scores["compound"],
        neg=sentiment_scores["neg"],
        neu=sentiment_scores["neu"],
        pos=sentiment_scores["pos"],
    )
    db.session.add(new_feedback)
    db.session.commit()

    return jsonify(sentiment_scores), 201

@api.route("/feedbacks", methods=["GET"])
@jwt_required()
def get_all_feedbacks():
    claims = get_jwt()
    if claims.get("role") != "professor":
        return jsonify({"message": "Acesso negado: Apenas professores podem visualizar feedbacks."}), 403

    all_feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    return jsonify([feedback.to_dict() for feedback in all_feedbacks]), 200

