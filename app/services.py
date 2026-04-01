import numpy as np
import shap
from pysentimiento import create_analyzer
from lime.lime_text import LimeTextExplainer
from .models import db, Feedback, StudentRiskAnalysis

sentiment_analyzer = create_analyzer(task="sentiment", lang="pt")

lime_explainer = LimeTextExplainer(
    class_names=['NEG', 'NEU', 'POS'],
    random_state=42,
)

shap_masker = shap.maskers.Text(tokenizer=r"\W+")

def _predict_proba(texts):
    results = []
    for text in texts:
        try:
            pred = sentiment_analyzer.predict(text)
            results.append([
                pred.probas.get('NEG', 0.0),
                pred.probas.get('NEU', 0.0),
                pred.probas.get('POS', 0.0),
            ])
        except Exception:
            results.append([0.33, 0.34, 0.33])
    return np.array(results)

shap_explainer = shap.Explainer(
    _predict_proba,
    shap_masker,
    output_names=['NEG', 'NEU', 'POS'],
)

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

POS_IDX = 2

def explain_sentiment_lime(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return {}

    exp = lime_explainer.explain_instance(
        text,
        _predict_proba,
        labels=[POS_IDX],
        num_features=30,
        num_samples=300,
    )

    return {word.lower(): round(weight, 4) for word, weight in exp.as_list(label=POS_IDX)}

def explain_sentiment_shap(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return {}

    shap_values = shap_explainer([text], max_evals=500)

    values = shap_values.values[0, :, POS_IDX]
    tokens = shap_values.data[0]

    import re
    result = {}
    for token, val in zip(tokens, values):
        clean = re.sub(r'[^\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]', '', token).strip().lower()
        if not clean:
            continue
        if clean in result:
            result[clean] += float(val)
        else:
            result[clean] = float(val)
    return {k: round(v, 4) for k, v in result.items()}

def create_feedback(student_id, subject_id, answers, additional_comment=None):
    sentiment_scores = None
    if additional_comment and additional_comment.strip():
        sentiment_scores = analyze_sentiment_text(additional_comment)
    
    new_feedback = Feedback(
        student_id=student_id,
        subject_id=subject_id,
        active_participation=answers['active_participation'],
        task_completion=answers['task_completion'],
        motivation_interest=answers['motivation_interest'],
        welcoming_environment=answers['welcoming_environment'],
        comprehension_effort=answers['comprehension_effort'],
        content_connection=answers['content_connection'],
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
        analysis = StudentRiskAnalysis.query.filter_by(
            student_id=student_id,
            subject_id=subject_id
        ).first()
        if analysis:
            db.session.delete(analysis)
            db.session.commit()
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
    
    risk_levels = {
        'baixo': ['baixo', 'medio', 'alto'],
        'medio': ['medio', 'alto'],
        'alto': ['alto']
    }
    levels_to_include = risk_levels.get(min_risk_level, ['alto'])
    
    query = query.filter(StudentRiskAnalysis.risk_level.in_(levels_to_include))
    query = query.order_by(StudentRiskAnalysis.risk_score.desc())
    
    return query.all()