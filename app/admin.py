from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy.exc import IntegrityError

from .models import db, Subject, User

admin_bp = Blueprint("admin_bp", __name__)

def check_if_coordinator():
    claims = get_jwt()
    return claims.get("role") == "coordenador"

@admin_bp.route("/subjects", methods=["POST"])
@jwt_required()
def create_subject():
    if not check_if_coordinator():
        return jsonify({"message": "Acesso negado."}), 403

    data = request.get_json()
    name = data.get("name")
    if not name:
        return jsonify({"error": "O nome da matéria é obrigatório."}), 400

    if Subject.query.filter_by(name=name).first():
        return jsonify({"error": "Matéria já existe."}), 409

    new_subject = Subject(name=name)
    db.session.add(new_subject)
    db.session.commit()

    return jsonify(new_subject.to_dict()), 201

@admin_bp.route("/professors", methods=["GET"])
@jwt_required()
def get_professors():
    if not check_if_coordinator():
        return jsonify({"message": "Acesso negado."}), 403
    
    professors = User.query.filter_by(role='professor').all()
    return jsonify([{'id': p.id, 'username': p.username} for p in professors])


@admin_bp.route("/subjects/<int:subject_id>/assign", methods=["POST"])
@jwt_required()
def assign_subject_to_professor(subject_id):
    if not check_if_coordinator():
        return jsonify({"message": "Acesso negado."}), 403

    data = request.get_json()
    professor_id = data.get("professor_id")

    professor = User.query.get(professor_id)
    subject = Subject.query.get(subject_id)

    if not professor or professor.role != 'professor':
        return jsonify({"error": "Professor não encontrado."}), 404
    
    if not subject:
        return jsonify({"error": "Matéria não encontrada."}), 404

    if subject in professor.subjects:
        return jsonify({"error": f"O professor '{professor.username}' já está associado à matéria '{subject.name}'."}), 409

    try:
        professor.subjects.append(subject)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Essa associação já existe no banco de dados."}), 409
    except Exception as e:
        db.session.rollback()
        print(f"Erro inesperado ao associar matéria: {str(e)}")
        return jsonify({"error": "Um erro inesperado ocorreu no servidor."}), 500


    return jsonify({"message": f"Matéria '{subject.name}' associada com sucesso ao professor '{professor.username}'."}), 200