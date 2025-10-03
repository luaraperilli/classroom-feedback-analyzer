from pysentimiento import create_analyzer
from sqlalchemy import func
from .models import db, Feedback, StudentRiskAnalysis

sentiment_analyzer = create_analyzer(task="sentiment", lang="pt")

def analyze_sentiment_text(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return None

    result = sentiment_analyzer.predict(text)
    probabilities = result.probas
    
    compound_score = probabilities.get('POS', 0.0) - probabilities.get('NEG', 0.0)

    return {
        'compound': round(compound_score, 4),
        'neg': round(probabilities.get('NEG', 0.0), 4),
        'neu': round(probabilities.get('NEU', 0.0), 4),
        'pos': round(probabilities.get('POS', 0.0), 4)
    }

def create_feedback(student_id, subject_id, answers, additional_comment=None):
    sentiment_scores = None
    if additional_comment and additional_comment.strip():
        sentiment_scores = analyze_sentiment_text(additional_comment)
    
    new_feedback = Feedback(
        student_id=student_id,
        subject_id=subject_id,
        material_quality=answers['material_quality'],
        teaching_method=answers['teaching_method'],
        content_understanding=answers['content_understanding'],
        class_pace=answers['class_pace'],
        practical_examples=answers['practical_examples'],
        additional_comment=additional_comment
    )
    
    if sentiment_scores:
        new_feedback.compound = sentiment_scores['compound']
        new_feedback.neg = sentiment_scores['neg']
        new_feedback.neu = sentiment_scores['neu']
        new_feedback.pos = sentiment_scores['pos']
    
    new_feedback.overall_score = new_feedback.calculate_overall_score()
    
    db.session.add(new_feedback)
    db.session.commit()
    
    update_student_risk_analysis(student_id, subject_id)
    
    return new_feedback

def update_student_risk_analysis(student_id, subject_id):
    feedbacks = Feedback.query.filter_by(
        student_id=student_id,
        subject_id=subject_id
    ).all()
    
    if not feedbacks:
        return None
    
    avg_score = sum(f.overall_score for f in feedbacks) / len(feedbacks)
    
    sentiment_values = [f.compound for f in feedbacks if f.compound is not None]
    avg_sentiment = sum(sentiment_values) / len(sentiment_values) if sentiment_values else None
    
    analysis = StudentRiskAnalysis.query.filter_by(
        student_id=student_id,
        subject_id=subject_id
    ).first()
    
    if not analysis:
        analysis = StudentRiskAnalysis(
            student_id=student_id,
            subject_id=subject_id
        )
        db.session.add(analysis)
    
    analysis.average_score = avg_score
    analysis.average_sentiment = avg_sentiment
    analysis.feedback_count = len(feedbacks)
    analysis.calculate_risk_score()
    
    db.session.commit()
    return analysis

def get_students_at_risk(subject_id=None, min_risk_level='medio'):
    query = StudentRiskAnalysis.query
    
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    
    risk_levels = {'baixo': ['medio', 'alto'], 'medio': ['alto'], 'alto': ['alto']}
    levels_to_include = risk_levels.get(min_risk_level, ['alto'])
    
    query = query.filter(StudentRiskAnalysis.risk_level.in_(levels_to_include))
    query = query.order_by(StudentRiskAnalysis.risk_score.desc())
    
    return query.all()