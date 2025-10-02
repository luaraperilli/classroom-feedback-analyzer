from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, get_jwt
from datetime import datetime
from .models import db, Feedback, User, Subject
from .services import analyze_sentiment_text

api = Blueprint("api", __name__)

@api.route("/analyze", methods=["POST"])
@jwt_required()
def analyze_and_save_feedback():
    data = request.get_json()
    if not data or "text" not in data or "subject_id" not in data:
        return jsonify({"error": "Pedido inválido. Os campos 'text' e 'subject_id' são obrigatórios."}), 400

    text_to_analyze = data["text"]
    subject_id = data["subject_id"]
    sentiment_scores = analyze_sentiment_text(text_to_analyze)

    new_feedback = Feedback(
        text=text_to_analyze,
        subject_id=subject_id,
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
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    role = claims.get("role")

    if role not in ["professor", "coordenador"]:
        return jsonify({"message": "Acesso negado."}), 403

    query = Feedback.query
    subject_filter_id = request.args.get('subject_id')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if role == "professor":
        professor_subject_ids = [s.id for s in user.subjects]
        query = query.filter(Feedback.subject_id.in_(professor_subject_ids))

    if subject_filter_id:
        query = query.filter(Feedback.subject_id == subject_filter_id)

    if start_date_str:
        start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        query = query.filter(Feedback.created_at >= start_date)
    
    if end_date_str:
        end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        query = query.filter(Feedback.created_at <= end_date)

    all_feedbacks = query.order_by(Feedback.created_at.desc()).all()
    return jsonify([feedback.to_dict() for feedback in all_feedbacks]), 200


@api.route("/subjects", methods=["GET"])
@jwt_required()
def get_subjects():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.role == "professor":
        subjects = user.subjects
    elif user.role in ["coordenador", "aluno"]:
        subjects = Subject.query.all()
    else:
        return jsonify({"error": "Role inválida"}), 403

    return jsonify([subject.to_dict() for subject in subjects]), 200