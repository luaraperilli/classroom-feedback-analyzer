from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, get_jwt
from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash
from .models import db, Feedback, User, Subject, StudentRiskAnalysis
from .services import create_feedback, get_students_at_risk
from .decorators import requires_role

api = Blueprint("api", __name__)


def _get_user(user_id):
    return db.session.get(User, int(user_id))

def validate_feedback_payload(data):
    required_fields = [
        'subject_id',
        'active_participation',
        'task_completion',
        'motivation_interest',
        'welcoming_environment',
        'comprehension_effort',
        'content_connection',
        'additional_comment'
        ]
    
    for field in required_fields:
        if field not in data:
            return False, f"Campo '{field}' é obrigatório."
    
    if not data.get("additional_comment") or not data.get("additional_comment").strip():
        return False, "Campo 'additional_comment' é obrigatório e não pode estar vazio."
    
    rating_fields = required_fields[1:7]
    for field in rating_fields:
        value = data.get(field)
        if not isinstance(value, int) or value < 1 or value > 5:
            return False, f"Campo '{field}' deve ser um número entre 1 e 5."
    
    return True, ""

@api.route("/analyze", methods=["POST"])
@jwt_required()
def analyze_and_save_feedback():
    data = request.get_json()
    student_id = get_jwt_identity()
    
    is_valid, error_message = validate_feedback_payload(data)
    if not is_valid:
        return jsonify({"error": error_message}), 400
    
    subject_id = data["subject_id"]
    additional_comment = data.get("additional_comment", "").strip()

    # Prevent duplicate submissions for the same subject on the same day
    today = datetime.utcnow().date()
    duplicate = Feedback.query.filter(
        Feedback.student_id == int(student_id),
        Feedback.subject_id == subject_id,
        db.func.date(Feedback.created_at) == today
    ).first()
    if duplicate:
        return jsonify({"error": "Você já enviou um feedback para esta matéria hoje."}), 409

    answers = {
        'active_participation': data['active_participation'],
        'task_completion': data['task_completion'],
        'motivation_interest': data['motivation_interest'],
        'welcoming_environment': data['welcoming_environment'],
        'comprehension_effort': data['comprehension_effort'],
        'content_connection': data['content_connection']
    }
    
    try:
        feedback = create_feedback(student_id, subject_id, answers, additional_comment)
        return jsonify(feedback.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao salvar feedback: {str(e)}")
        return jsonify({"error": "Erro ao salvar feedback."}), 500

@api.route("/feedbacks", methods=["GET"])
@jwt_required()
@requires_role(User.PROFESSOR, User.COORDENADOR)
def get_all_feedbacks():
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = _get_user(user_id)
    role = claims.get("role")

    query = Feedback.query
    subject_filter_id = request.args.get('subject_id')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if role == User.PROFESSOR:
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

@api.route("/students-at-risk", methods=["GET"])
@jwt_required()
@requires_role(User.PROFESSOR, User.COORDENADOR)
def get_at_risk_students():
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = _get_user(user_id)
    role = claims.get("role")

    subject_filter_id = request.args.get('subject_id')
    min_risk_level = request.args.get('min_risk', 'medio')
    
    if role == User.PROFESSOR:
        professor_subject_ids = [s.id for s in user.subjects]
        
        if subject_filter_id:
            if int(subject_filter_id) not in professor_subject_ids:
                return jsonify({"message": "Acesso negado a esta matéria."}), 403
        
        at_risk = []
        for subject_id in professor_subject_ids:
            if subject_filter_id and int(subject_filter_id) != subject_id:
                continue
            at_risk.extend(get_students_at_risk(subject_id, min_risk_level))
    else:
        at_risk = get_students_at_risk(subject_filter_id, min_risk_level)
    
    return jsonify([analysis.to_dict() for analysis in at_risk]), 200

@api.route("/student-progress/<int:student_id>", methods=["GET"])
@jwt_required()
@requires_role(User.PROFESSOR, User.COORDENADOR)
def get_student_progress(student_id):
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = _get_user(user_id)
    role = claims.get("role")

    subject_filter_id = request.args.get('subject_id')

    query = StudentRiskAnalysis.query.filter_by(student_id=student_id)
    
    if subject_filter_id:
        query = query.filter_by(subject_id=subject_filter_id)
    
    if role == User.PROFESSOR:
        professor_subject_ids = [s.id for s in user.subjects]
        query = query.filter(StudentRiskAnalysis.subject_id.in_(professor_subject_ids))
    
    analyses = query.all()
    
    feedback_query = Feedback.query.filter_by(student_id=student_id)
    
    if subject_filter_id:
        feedback_query = feedback_query.filter_by(subject_id=subject_filter_id)
    
    if role == User.PROFESSOR:
        feedback_query = feedback_query.filter(Feedback.subject_id.in_(professor_subject_ids))
    
    recent_feedbacks = feedback_query.order_by(Feedback.created_at.desc()).limit(10).all()
    
    return jsonify({
        'student_id': student_id,
        'risk_analyses': [a.to_dict() for a in analyses],
        'recent_feedbacks': [f.to_dict() for f in recent_feedbacks]
    }), 200

@api.route("/my-feedbacks", methods=["GET"])
@jwt_required()
def get_my_feedbacks():
    student_id = get_jwt_identity()
    subject_filter_id = request.args.get('subject_id')

    query = Feedback.query.filter_by(student_id=student_id)
    if subject_filter_id:
        query = query.filter_by(subject_id=subject_filter_id)

    feedbacks = query.order_by(Feedback.created_at.asc()).all()
    return jsonify([fb.to_dict() for fb in feedbacks]), 200


@api.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = _get_user(user_id)
    return jsonify({
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "display_name": user.display_name,
    }), 200


@api.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = _get_user(user_id)
    data = request.get_json()

    first_name = data.get("first_name", "").strip() or None
    last_name = data.get("last_name", "").strip() or None
    new_password = data.get("new_password", "").strip()
    current_password = data.get("current_password", "").strip()

    if new_password:
        if not current_password or not check_password_hash(user.password, current_password):
            return jsonify({"error": "Senha atual incorreta."}), 400
        user.password = generate_password_hash(new_password, method="pbkdf2:sha256")

    user.first_name = first_name
    user.last_name = last_name
    db.session.commit()

    return jsonify({
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "display_name": user.display_name,
    }), 200


@api.route("/subjects", methods=["GET"])
@jwt_required()
def get_subjects():
    user_id = get_jwt_identity()
    user = _get_user(user_id)

    if user.role == User.PROFESSOR:
        subjects = user.subjects
    elif user.role in [User.COORDENADOR, User.ALUNO]:
        subjects = Subject.query.all()
    else:
        return jsonify({"error": "Role inválida"}), 403
    
    return jsonify([subject.to_dict() for subject in subjects]), 200