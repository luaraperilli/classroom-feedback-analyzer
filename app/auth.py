from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
import re

from .models import User, db

auth = Blueprint("auth", __name__)


# Política de senha — igual à do frontend (utils/passwordPolicy.js): mínimo 8
# caracteres, com maiúscula, minúscula e número. Validar aqui impede burlar pelo cliente.
def validate_password(password):
    password = password or ""
    if len(password) < 8:
        return "A senha deve ter pelo menos 8 caracteres."
    if not re.search(r"[A-Z]", password):
        return "A senha deve conter pelo menos uma letra maiúscula."
    if not re.search(r"[a-z]", password):
        return "A senha deve conter pelo menos uma letra minúscula."
    if not re.search(r"[0-9]", password):
        return "A senha deve conter pelo menos um número."
    return None

@auth.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    # SEGURANÇA: o auto-cadastro público cria SEMPRE aluno. Ignoramos qualquer "role"
    # enviado pelo cliente — professor/coordenador só por rota administrativa protegida.
    role = User.ALUNO
    first_name = data.get("first_name", "").strip() or None
    last_name = data.get("last_name", "").strip() or None

    if not username or not password:
        return jsonify({"error": "Nome de usuário e senha são obrigatórios."}), 400

    # validação de senha também no servidor (não só no frontend), por segurança
    pw_error = validate_password(password)
    if pw_error:
        return jsonify({"error": pw_error}), 400

    # comparação sem diferenciar maiúsculas/minúsculas evita usuários duplicados (ex.: "Marina" e "marina")
    if User.query.filter(db.func.lower(User.username) == username.lower()).first():
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
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    # login tolerante: ignora maiúsculas/minúsculas e espaços extras no nome de usuário
    user = User.query.filter(db.func.lower(User.username) == username.lower()).first()

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
        "must_change_password": user.must_change_password,
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


@auth.route("/change-initial-password", methods=["POST"])
@jwt_required()
def change_initial_password():
    """Troca obrigatória de senha no 1º acesso do aluno pré-cadastrado.
    O usuário já está autenticado (logou com a senha inicial); aqui ele define a nova."""
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "Usuário não encontrado."}), 404

    data = request.get_json() or {}
    new_password = data.get("new_password") or ""

    pw_error = validate_password(new_password)
    if pw_error:
        return jsonify({"error": pw_error}), 400

    # não permitir manter a mesma senha inicial
    if check_password_hash(user.password, new_password):
        return jsonify({"error": "A nova senha deve ser diferente da senha inicial."}), 400

    user.password = generate_password_hash(new_password, method="pbkdf2:sha256")
    user.must_change_password = False
    db.session.commit()

    return jsonify({"message": "Senha definida com sucesso."}), 200