from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from .models import User, db

auth = Blueprint("auth", __name__)

@auth.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", User.ALUNO)
    first_name = data.get("first_name", "").strip() or None
    last_name = data.get("last_name", "").strip() or None

    if not username or not password:
        return jsonify({"error": "Nome de usuário e senha são obrigatórios."}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Nome de usuário já existe."}), 409

    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")
    new_user = User(username=username, password=hashed_password, role=role,
                    first_name=first_name, last_name=last_name)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Cadastro realizado com sucesso!"}), 201

@auth.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Credenciais inválidas."}), 401

    identity = str(user.id)
    additional_claims = {"username": user.username, "role": user.role}

    access_token = create_access_token(identity=identity, additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=identity)

    user_data = {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "display_name": user.display_name,
    }
    
    return jsonify(access_token=access_token, refresh_token=refresh_token, user=user_data), 200

@auth.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    user = db.session.get(User, int(current_user))
    if not user:
        return jsonify({"error": "Utilizador não encontrado."}), 404
    new_access_token = create_access_token(
        identity=current_user,
        additional_claims={"username": user.username, "role": user.role},
    )
    return jsonify(access_token=new_access_token), 200