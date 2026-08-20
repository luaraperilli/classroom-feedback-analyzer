from flask_sqlalchemy import SQLAlchemy
import datetime
import json

db = SQLAlchemy()

user_subjects = db.Table('user_subjects',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id'), primary_key=True)
)

class User(db.Model):
    ALUNO = 'aluno'
    PROFESSOR = 'professor'
    COORDENADOR = 'coordenador'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), nullable=False, default=ALUNO)
    first_name = db.Column(db.String(80), nullable=True)
    last_name = db.Column(db.String(80), nullable=True)
    # quando True, o aluno pré-cadastrado é obrigado a definir uma nova senha no 1º acesso
    must_change_password = db.Column(db.Boolean, nullable=False, default=False)

    # Consentimento livre e esclarecido (TCLE) e base legal do tratamento (LGPD).
    # A versão é registrada junto da data: consentimento vale para um tratamento
    # específico, então se o termo mudar o aceite anterior deixa de servir e a
    # pergunta é refeita.
    consentimento_em = db.Column(db.DateTime, nullable=True)
    consentimento_versao = db.Column(db.String(20), nullable=True)

    @property
    def consentimento_valido(self):
        from .consentimento import VERSAO_DO_TERMO
        return bool(self.consentimento_em) and self.consentimento_versao == VERSAO_DO_TERMO

    @property
    def display_name(self):
        if self.first_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.username
    
    subjects = db.relationship('Subject', secondary=user_subjects, lazy='subquery',
        backref=db.backref('professors', lazy=True))
    feedbacks = db.relationship('Feedback', backref='student', lazy=True)

class TokenRevogado(db.Model):
    """Tokens invalidados no logout.

    Sem isto o logout era só apagar o localStorage: um token copiado antes
    continuava valendo até expirar — uma hora no acesso, sete dias no refresh.
    """
    __tablename__ = 'token_revogado'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(64), nullable=False, unique=True, index=True)
    expira_em = db.Column(db.DateTime, nullable=False)

    @classmethod
    def revogar(cls, jti, expira_em):
        if not cls.query.filter_by(jti=jti).first():
            db.session.add(cls(jti=jti, expira_em=expira_em))

    @classmethod
    def esta_revogado(cls, jti):
        return cls.query.filter_by(jti=jti).first() is not None

    @classmethod
    def limpar_expirados(cls):
        cls.query.filter(cls.expira_em < datetime.datetime.utcnow()).delete()


class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {'id': self.id, 'name': self.name}


class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    active_participation = db.Column(db.Integer, nullable=False)
    task_completion = db.Column(db.Integer, nullable=False)
    motivation_interest = db.Column(db.Integer, nullable=False)
    welcoming_environment = db.Column(db.Integer, nullable=False)
    comprehension_effort = db.Column(db.Integer, nullable=False)
    content_connection = db.Column(db.Integer, nullable=False)
    additional_comment = db.Column(db.String(500), nullable=False)
    compound = db.Column(db.Float, nullable=True)
    neg = db.Column(db.Float, nullable=True)
    neu = db.Column(db.Float, nullable=True)
    pos = db.Column(db.Float, nullable=True)
    token_attributions_json = db.Column(db.Text, nullable=True)
    shap_attributions_json  = db.Column(db.Text, nullable=True)

    # Instante em que o cálculo da explicação começou. Serve para reconhecer um
    # cálculo em curso: sem isso, um segundo pedido para o mesmo feedback vê que
    # nada foi gravado ainda, conclui que falta calcular e refaz o trabalho
    # inteiro. Foi o que aconteceu no teste de 19 de agosto, com o mesmo
    # comentário processado duas vezes em paralelo.
    explicacao_iniciada_em = db.Column(db.DateTime, nullable=True)

    overall_score = db.Column(db.Float, nullable=False)

    # NULL e {} significam coisas diferentes: nulo é "ainda não foi calculado",
    # dicionário vazio é "calculado e não rendeu nenhuma palavra". Guardar os
    # dois como NULL faria a explicação ser recalculada para sempre, já que nada
    # registraria que a tentativa aconteceu.
    @property
    def token_attributions(self):
        if self.token_attributions_json is None:
            return None
        return json.loads(self.token_attributions_json)

    @token_attributions.setter
    def token_attributions(self, value):
        self.token_attributions_json = None if value is None else json.dumps(value)

    @property
    def shap_attributions(self):
        if self.shap_attributions_json is None:
            return None
        return json.loads(self.shap_attributions_json)

    @shap_attributions.setter
    def shap_attributions(self, value):
        self.shap_attributions_json = None if value is None else json.dumps(value)

    @property
    def explicacao_calculada(self):
        """Se a explicação já foi tentada, com ou sem resultado."""
        return self.token_attributions_json is not None or self.shap_attributions_json is not None

    # Teto para considerar um cálculo ainda em curso. Acima disso, presume-se que
    # a instância morreu no meio — o Cloud Run pode encerrar um contêiner a
    # qualquer momento — e um novo pedido tem permissão para recomeçar. Sem esse
    # teto, um cálculo interrompido travaria a explicação daquele feedback para
    # sempre.
    LIMITE_DE_CALCULO = datetime.timedelta(minutes=15)

    @property
    def explicacao_em_curso(self):
        """Se há um cálculo iniciado há pouco e ainda sem resultado gravado."""
        if self.explicacao_calculada or self.explicacao_iniciada_em is None:
            return False
        idade = datetime.datetime.utcnow() - self.explicacao_iniciada_em
        return idade < self.LIMITE_DE_CALCULO
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    subject = db.relationship('Subject', backref=db.backref('feedbacks', lazy=True))

    def calculate_overall_score(self):
        scores = [
            self.active_participation,
            self.task_completion,
            self.motivation_interest,
            self.welcoming_environment,
            self.comprehension_effort,
            self.content_connection
        ]
        average = sum(scores) / len(scores)
        return (average - 1) / 4

    def to_dict(self, incluir_identificacao=False):
        """Anônimo por padrão: na visão do docente o comentário é dissociado do
        aluno (Seções 3.1.1 e 3.2 do artigo). A identificação só aparece na visão
        do próprio aluno e no painel de risco."""
        data = {
            'id': self.id,
            'subject': self.subject.name,
            'subject_id': self.subject_id,
            'active_participation': self.active_participation,
            'task_completion': self.task_completion,
            'motivation_interest': self.motivation_interest,
            'welcoming_environment': self.welcoming_environment,
            'comprehension_effort': self.comprehension_effort,
            'content_connection': self.content_connection,
            'additional_comment': self.additional_comment,
            'compound': self.compound,
            'neg': self.neg,
            'neu': self.neu,
            'pos': self.pos,
            'overall_score': self.overall_score,
            'token_attributions': self.token_attributions,
            'shap_attributions': self.shap_attributions,
            'created_at': self.created_at.isoformat(),
            # Quando o cálculo da explicação começou. A tela usa este instante
            # para mostrar o progresso, e por vir do servidor a contagem
            # sobrevive a recarregamento da página: quem volta depois de dois
            # minutos vê a barra onde ela realmente está, e não reiniciada.
            'explicacao_iniciada_em': (
                self.explicacao_iniciada_em.isoformat()
                if self.explicacao_iniciada_em else None
            ),
        }

        if incluir_identificacao:
            data['student_id'] = self.student_id
            data['student_username'] = self.student.display_name if self.student else None

        return data

class StudentRiskAnalysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    average_score = db.Column(db.Float, nullable=False)
    average_sentiment = db.Column(db.Float, nullable=True)
    feedback_count = db.Column(db.Integer, nullable=False)
    
    risk_score = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)
    
    last_updated = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    student = db.relationship('User', backref='risk_analyses')
    subject = db.relationship('Subject', backref='risk_analyses')
    
    WEIGHT_SCORE            = 0.5
    WEIGHT_SENTIMENT        = 0.3
    WEIGHT_CONSISTENCY      = 0.2
    WEIGHT_SCORE_NO_SENT    = 0.7
    WEIGHT_CONSISTENCY_NO_SENT = 0.3
    CONSISTENCY_CAP         = 5
    THRESHOLD_ALTO          = 0.6
    THRESHOLD_MEDIO         = 0.3

    def calculate_risk_score(self):
        score_risk = 1 - self.average_score

        sentiment_risk = 0.0
        if self.average_sentiment is not None:
            sentiment_risk = (1 - self.average_sentiment) / 2

        consistency_risk = max(0, (self.CONSISTENCY_CAP - self.feedback_count) / self.CONSISTENCY_CAP)

        if self.average_sentiment is not None:
            self.risk_score = (
                score_risk       * self.WEIGHT_SCORE       +
                sentiment_risk   * self.WEIGHT_SENTIMENT   +
                consistency_risk * self.WEIGHT_CONSISTENCY
            )
        else:
            self.risk_score = (
                score_risk       * self.WEIGHT_SCORE_NO_SENT       +
                consistency_risk * self.WEIGHT_CONSISTENCY_NO_SENT
            )

        if self.risk_score >= self.THRESHOLD_ALTO:
            self.risk_level = 'alto'
        elif self.risk_score >= self.THRESHOLD_MEDIO:
            self.risk_level = 'medio'
        else:
            self.risk_level = 'baixo'
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_username': self.student.display_name,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name,
            'average_score': round(self.average_score, 3),
            'average_sentiment': round(self.average_sentiment, 3) if self.average_sentiment else None,
            'feedback_count': self.feedback_count,
            'risk_score': round(self.risk_score, 3),
            'risk_level': self.risk_level,
            'last_updated': self.last_updated.isoformat()
        }