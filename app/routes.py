from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, get_jwt
from datetime import datetime
from .models import db, Feedback, User, Subject, StudentRiskAnalysis
from .services import create_feedback, get_students_at_risk

api = Blueprint("api", __name__)

def validate_feedback_payload(data):
    required_fields = [
        'subject_id',
        'material_quality',
        'teaching_method',
        'content_understanding',
        'class_pace',
        'practical_examples'
    ]
    
    for field in required_fields:
        if field not in data:
            return False, f"Campo '{field}' é obrigatório."
    
    rating_fields = required_fields[1:] 
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
    additional_comment = data.get("additional_comment", "").strip() or None
    
    answers = {
        'material_quality': data['material_quality'],
        'teaching_method': data['teaching_method'],
        'content_understanding': data['content_understanding'],
        'class_pace': data['class_pace'],
        'practical_examples': data['practical_examples']
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
def get_all_feedbacks():
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    role = claims.get("role")

    if role not in [User.PROFESSOR, User.COORDENADOR]:
        return jsonify({"message": "Acesso negado."}), 403

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
def get_at_risk_students():
    """Retorna alunos em risco de evasão"""
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    role = claims.get("role")

    if role not in [User.PROFESSOR, User.COORDENADOR]:
        return jsonify({"message": "Acesso negado."}), 403

    subject_filter_id = request.args.get('subject_id')
    min_risk_level = request.args.get('min_risk', 'medio')  # baixo, medio, alto
    
    # Professor vê apenas alunos de suas matérias
    if role == User.PROFESSOR:
        professor_subject_ids = [s.id for s in user.subjects]
        
        if subject_filter_id:
            if int(subject_filter_id) not in professor_subject_ids:
                return jsonify({"message": "Acesso negado a esta matéria."}), 403
        
        # Busca alunos em risco das matérias do professor
        at_risk = []
        for subject_id in professor_subject_ids:
            if subject_filter_id and int(subject_filter_id) != subject_id:
                continue
            at_risk.extend(get_students_at_risk(subject_id, min_risk_level))
    else:
        # Coordenador vê todos
        at_risk = get_students_at_risk(subject_filter_id, min_risk_level)
    
    return jsonify([analysis.to_dict() for analysis in at_risk]), 200

@api.route("/student-progress/<int:student_id>", methods=["GET"])
@jwt_required()
def get_student_progress(student_id):
    """Retorna progresso detalhado de um aluno"""
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    role = claims.get("role")

    if role not in [User.PROFESSOR, User.COORDENADOR]:
        return jsonify({"message": "Acesso negado."}), 403

    subject_filter_id = request.args.get('subject_id')
    
    # Busca análises de risco do aluno
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

@api.route("/subjects", methods=["GET"])
@jwt_required()
def get_subjects():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.role == User.PROFESSOR:
        subjects = user.subjects
    elif user.role in [User.COORDENADOR, User.ALUNO]:
        subjects = Subject.query.all()
    else:
        return jsonify({"error": "Role inválida"}), 403
    
    return jsonify([subject.to_dict() for subject in subjects]), 200