from flask import Blueprint, request, jsonify
from .models import db, Feedback
from .services import analyze_sentiment_text, generate_keywords

api = Blueprint('api', __name__)

@api.route('/analyze', methods=['POST'])
def analyze_and_save_feedback():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Invalid request. 'text' field is missing."}), 400

    text_to_analyze = data['text']
    sentiment_scores = analyze_sentiment_text(text_to_analyze)

    new_feedback = Feedback(
        text=text_to_analyze,
        compound=sentiment_scores['compound'],
        neg=sentiment_scores['neg'],
        neu=sentiment_scores['neu'],
        pos=sentiment_scores['pos']
    )
    db.session.add(new_feedback)
    db.session.commit()
    return jsonify(sentiment_scores)

@api.route('/feedbacks', methods=['GET'])
def get_all_feedbacks():
    all_feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    return jsonify([feedback.to_dict() for feedback in all_feedbacks])

@api.route('/keywords', methods=['GET'])
def get_keywords():
    keywords = generate_keywords()
    return jsonify(keywords)
