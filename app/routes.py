import logging
import time

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, get_jwt
from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash
from .emails import notificar
from .models import db, Feedback, User, Subject, StudentRiskAnalysis
from .services import (
    create_feedback,
    explain_sentiment_lime,
    explain_sentiment_shap,
    get_students_at_risk,
    update_student_risk_analysis,
)
from .decorators import requires_role

logger = logging.getLogger(__name__)

api = Blueprint("api", __name__)


def _get_user(user_id):
    return db.session.get(User, int(user_id))

# O mesmo limite que a tela aplica. Eram números diferentes, 400 na interface e
# 500 aqui, e a API aceitava o que a tela recusava. Além da incoerência, o artigo
# afirma que o comentário é limitado a 400 caracteres justamente para caber na
# janela de 128 tokens que o modelo lê, de modo que o texto analisado corresponda
# integralmente ao texto submetido. Com 500 essa afirmação deixava de valer para
# quem chamasse a API diretamente.
MAXIMO_DE_CARACTERES = 400


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

    if len(data.get("additional_comment").strip()) > MAXIMO_DE_CARACTERES:
        return False, f"O comentário deve ter no máximo {MAXIMO_DE_CARACTERES} caracteres."

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

    # Verificado no servidor, não só na tela: sem consentimento válido não há
    # base legal para tratar o comentário, e a tela é contornável.
    autor = _get_user(student_id)
    if autor.role == User.ALUNO and not autor.consentimento_valido:
        return jsonify({"error": "É preciso aceitar o termo de participação antes de enviar."}), 403

    is_valid, error_message = validate_feedback_payload(data)
    if not is_valid:
        return jsonify({"error": error_message}), 400
    
    subject_id = data["subject_id"]
    additional_comment = data.get("additional_comment", "").strip()

    # Prevent duplicate submissions for the same subject on the same day
    today = datetime.utcnow().date()
    duplicate = Feedback.ativos().filter(
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
    
    # Só a análise de sentimento entra aqui, porque ela custa milissegundos. LIME
    # e SHAP ficam para POST /feedbacks/<id>/explicacao: o custo deles cresce com
    # o tamanho do comentário, e prender o envio a esse tempo fazia o aluno ver
    # erro por um feedback que, na verdade, já estava salvo.
    try:
        feedback = create_feedback(student_id, subject_id, answers, additional_comment)
    except Exception:
        db.session.rollback()
        logger.exception("Erro ao salvar feedback")
        return jsonify({"error": "Erro ao salvar feedback."}), 500

    return jsonify(feedback.to_dict(incluir_identificacao=True)), 201


@api.route("/feedbacks/<int:feedback_id>/explicacao", methods=["POST"])
@jwt_required()
def gerar_explicacao(feedback_id):
    """Calcula LIME e SHAP de um feedback já gravado.

    Idempotente: se as atribuições já existem, devolve as que estão no banco em
    vez de recalcular. Isso torna a chamada segura para repetir — a tela pode
    tentar de novo, e o comando `calcular-explicacoes` pode varrer o que sobrou.
    """
    feedback = db.session.get(Feedback, feedback_id)
    if feedback is None:
        return jsonify({"error": "Feedback não encontrado."}), 404

    # O aluno só explica o próprio comentário; o docente não passa por aqui,
    # porque na visão dele o feedback é dissociado de quem escreveu.
    if feedback.student_id != int(get_jwt_identity()):
        return jsonify({"error": "Feedback não encontrado."}), 404

    if not (feedback.additional_comment or '').strip():
        return jsonify({"error": "Este feedback não tem comentário para explicar."}), 400

    # Basta ter sido tentada: se o cálculo rodou e não rendeu palavra nenhuma,
    # repetir daria o mesmo resultado e custaria o mesmo tempo.
    if feedback.explicacao_calculada:
        return jsonify(feedback.to_dict(incluir_identificacao=True)), 200

    # Reserva do cálculo, em uma única instrução, para que dois pedidos
    # simultâneos não façam o mesmo trabalho duas vezes.
    #
    # Ler o estado e depois gravar deixaria uma janela entre as duas operações, e
    # foi exatamente ela que apareceu em produção: dois pedidos para o mesmo
    # feedback, com 51 segundos de diferença, ambos concluíram que faltava
    # calcular e ambos calcularam. Aqui, o banco decide quem reserva — quem
    # atualizar a linha segue, quem não atualizar sabe que outro já está com ela.
    #
    # A condição de idade permite retomar um cálculo cuja instância morreu no
    # meio, o que o Cloud Run pode fazer a qualquer momento.
    agora = datetime.utcnow()
    reservado = (
        Feedback.query
        .filter(Feedback.id == feedback.id)
        .filter(db.or_(
            Feedback.explicacao_iniciada_em.is_(None),
            Feedback.explicacao_iniciada_em < agora - Feedback.LIMITE_DE_CALCULO,
        ))
        .update({'explicacao_iniciada_em': agora}, synchronize_session=False)
    )
    db.session.commit()

    if not reservado:
        logger.info(
            "explicacao feedback=%s ja em curso, pedido devolvido sem recalcular",
            feedback.id,
        )
        corpo = feedback.to_dict(incluir_identificacao=True)
        corpo['explicacao_em_processamento'] = True
        return jsonify(corpo), 202

    comentario = feedback.additional_comment
    houve_falha = False

    # As duas técnicas são independentes: se uma falhar, a outra ainda serve para
    # destacar as palavras, e a tela não fica sem explicação nenhuma.
    #
    # Os tempos vão para o log porque é a única forma de saber, em produção, qual
    # das duas domina o custo e como cada uma cresce com o tamanho do texto.
    inicio = time.perf_counter()
    try:
        feedback.token_attributions = explain_sentiment_lime(comentario)
    except Exception:
        houve_falha = True
        logger.exception("LIME falhou para o feedback %s", feedback.id)
    tempo_lime = time.perf_counter() - inicio

    inicio = time.perf_counter()
    try:
        feedback.shap_attributions = explain_sentiment_shap(comentario)
    except Exception:
        houve_falha = True
        logger.exception("SHAP falhou para o feedback %s", feedback.id)
    tempo_shap = time.perf_counter() - inicio

    logger.info(
        "explicacao feedback=%s caracteres=%s lime=%.1fs shap=%.1fs total=%.1fs",
        feedback.id, len(comentario), tempo_lime, tempo_shap, tempo_lime + tempo_shap,
    )

    # Nada foi calculado, então a reserva é devolvida. Mantê-la faria a próxima
    # tentativa receber "em processamento" por quinze minutos, escondendo do
    # aluno um cálculo que não está acontecendo.
    if houve_falha and not feedback.explicacao_calculada:
        feedback.explicacao_iniciada_em = None

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Erro ao gravar as explicações do feedback %s", feedback.id)
        return jsonify({"error": "Não foi possível gravar a explicação."}), 500

    if houve_falha and not feedback.explicacao_calculada:
        return jsonify({"error": "Não foi possível gerar a explicação deste comentário."}), 500

    # O aviso sai aqui, depois do commit, porque é aqui que a análise daquele
    # aluno acabou de ficar pronta. Depende do commit de propósito: avisar antes
    # arriscaria mandar o aluno olhar um resultado que a gravação ainda pode
    # perder. `notificar` não levanta exceção e não é avisado duas vezes.
    notificar(feedback)

    return jsonify(feedback.to_dict(incluir_identificacao=True)), 200

@api.route("/versao-modelo", methods=["GET"])
@jwt_required()
@requires_role(User.PROFESSOR, User.COORDENADOR)
def versao_modelo():
    """Qual modelo e quais versões geraram as análises — para registrar no artigo."""
    from .services import descrever_modelo
    return jsonify(descrever_modelo()), 200


@api.route("/feedbacks", methods=["GET"])
@jwt_required()
@requires_role(User.PROFESSOR, User.COORDENADOR)
def get_all_feedbacks():
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = _get_user(user_id)
    role = claims.get("role")

    query = Feedback.ativos()
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
    
    feedback_query = Feedback.ativos().filter_by(student_id=student_id)
    
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

@api.route("/global-shap", methods=["GET"])
@jwt_required()
@requires_role(User.PROFESSOR, User.COORDENADOR)
def get_global_shap():
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = _get_user(user_id)
    role = claims.get("role")

    subject_filter_id = request.args.get('subject_id')

    query = Feedback.ativos().filter(Feedback.shap_attributions_json.isnot(None))

    if role == User.PROFESSOR:
        professor_subject_ids = [s.id for s in user.subjects]
        query = query.filter(Feedback.subject_id.in_(professor_subject_ids))

    if subject_filter_id:
        query = query.filter(Feedback.subject_id == subject_filter_id)

    feedbacks = query.all()

    word_stats = {}
    for fb in feedbacks:
        attributions = fb.shap_attributions
        if not attributions:
            continue
        for word, value in attributions.items():
            if word not in word_stats:
                word_stats[word] = {'total': 0.0, 'count': 0}
            word_stats[word]['total'] += value
            word_stats[word]['count'] += 1

    result = []
    for word, stats in word_stats.items():
        mean_val = stats['total'] / stats['count']
        result.append({
            'word': word,
            'mean_shap': round(mean_val, 4),
            'count': stats['count'],
        })

    result.sort(key=lambda x: abs(x['mean_shap']), reverse=True)

    return jsonify(result[:30]), 200


@api.route("/my-feedbacks", methods=["GET"])
@jwt_required()
def get_my_feedbacks():
    student_id = get_jwt_identity()
    subject_filter_id = request.args.get('subject_id')

    query = Feedback.ativos().filter_by(student_id=student_id)
    if subject_filter_id:
        query = query.filter_by(subject_id=subject_filter_id)

    feedbacks = query.order_by(Feedback.created_at.asc()).all()
    return jsonify([fb.to_dict(incluir_identificacao=True) for fb in feedbacks]), 200


@api.route("/my-feedbacks/<int:feedback_id>", methods=["DELETE"])
@jwt_required()
def delete_my_feedback(feedback_id):
    """Permite ao aluno apagar um feedback SEU (ex.: enviado por engano).
    Depois de apagar, o limite diário libera o reenvio para aquela matéria."""
    student_id = get_jwt_identity()
    feedback = db.session.get(Feedback, feedback_id)

    if not feedback:
        return jsonify({"error": "Feedback não encontrado."}), 404

    # checagem de posse: só o dono do feedback pode apagá-lo (evita IDOR)
    if feedback.student_id != int(student_id):
        return jsonify({"error": "Você não tem permissão para apagar este feedback."}), 403

    if feedback.deleted_at is not None:
        return jsonify({"message": "Este feedback já havia sido retirado."}), 200

    # Retirada lógica, declarada na versão 3.0 do termo. A linha sai da vista do
    # aluno e de toda análise, e fica registrado que houve retirada e quando. O
    # direito de eliminação continua inteiro pelo Perfil, que apaga de verdade.
    subject_id = feedback.subject_id
    feedback.deleted_at = datetime.utcnow()
    db.session.commit()

    # Sem isto a análise de risco fica congelada com a média e a contagem antigas,
    # e um aluno sem nenhum feedback continua aparecendo no painel do docente.
    update_student_risk_analysis(int(student_id), subject_id)

    return jsonify({"message": "Feedback apagado com sucesso."}), 200


def _perfil_json(user):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "display_name": user.display_name,
        "email": user.email or "",
        "must_change_password": user.must_change_password,
        "consentimento_pendente": user.role == User.ALUNO and not user.consentimento_valido,
        "consentimento_em": user.consentimento_em.isoformat() if user.consentimento_em else None,
    }


@api.route("/termo-consentimento", methods=["GET"])
def get_termo_consentimento():
    """Aberto de propósito: o participante precisa poder ler antes de decidir."""
    from .consentimento import TERMO
    return jsonify(TERMO), 200


@api.route("/consentimento", methods=["POST"])
@jwt_required()
def registrar_consentimento():
    from .consentimento import VERSAO_DO_TERMO

    user = _get_user(get_jwt_identity())
    user.consentimento_em = datetime.utcnow()
    user.consentimento_versao = VERSAO_DO_TERMO
    db.session.commit()

    logger.info("Consentimento registrado: usuario=%s versao=%s", user.id, VERSAO_DO_TERMO)
    return jsonify(_perfil_json(user)), 200


@api.route("/meus-dados", methods=["DELETE"])
@jwt_required()
def apagar_meus_dados():
    """Revoga o consentimento e apaga os dados do próprio titular.

    Direito de eliminação da LGPD. O usuário em si permanece, sem consentimento
    e sem feedback algum: apagar a conta inteira liberaria a matrícula para
    recadastro e o aluno voltaria como participante novo, sem registro de que
    havia recusado. O que a pesquisa não pode mais usar é o conteúdo, e é ele
    que sai.
    """
    user = _get_user(get_jwt_identity())

    feedbacks = Feedback.query.filter_by(student_id=user.id).count()
    Feedback.query.filter_by(student_id=user.id).delete()
    StudentRiskAnalysis.query.filter_by(student_id=user.id).delete()

    user.consentimento_em = None
    user.consentimento_versao = None
    db.session.commit()

    logger.info("Dados apagados a pedido do titular: usuario=%s feedbacks=%s", user.id, feedbacks)
    return jsonify({
        "message": "Seus dados foram apagados e seu consentimento foi retirado.",
        "feedbacks_apagados": feedbacks,
    }), 200


@api.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = _get_user(user_id)
    return jsonify(_perfil_json(user)), 200


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

    # O e-mail é opcional e removível. Campo em branco apaga o endereço, que é
    # como o aluno deixa de receber os avisos sem precisar falar com ninguém.
    if "email" in data:
        from .emails import email_valido
        endereco = (data.get("email") or "").strip()
        if endereco and not email_valido(endereco):
            return jsonify({"error": "Esse endereço de e-mail não parece válido."}), 400
        user.email = endereco or None

    if new_password:
        if not current_password or not check_password_hash(user.password, current_password):
            return jsonify({"error": "Senha atual incorreta."}), 400
        # aplica a mesma política de senha forte usada no cadastro / 1º acesso
        from .auth import validate_password
        pw_error = validate_password(new_password)
        if pw_error:
            return jsonify({"error": pw_error}), 400
        user.password = generate_password_hash(new_password, method="pbkdf2:sha256")

    user.first_name = first_name
    user.last_name = last_name
    db.session.commit()

    return jsonify(_perfil_json(user)), 200


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
