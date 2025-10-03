from flask_sqlalchemy import SQLAlchemy
import datetime

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
    role = db.Column(db.String(50), nullable=False, default='ALUNO')
    
    subjects = db.relationship('Subject', secondary=user_subjects, lazy='subquery',
        backref=db.backref('professors', lazy=True))
    feedbacks = db.relationship('Feedback', backref='student', lazy=True)

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {'id': self.id, 'name': self.name}

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    
    material_quality = db.Column(db.Integer, nullable=False)
    teaching_method = db.Column(db.Integer, nullable=False)
    content_understanding = db.Column(db.Integer, nullable=False)
    class_pace = db.Column(db.Integer, nullable=False) 
    practical_examples = db.Column(db.Integer, nullable=False)
    additional_comment = db.Column(db.String(500), nullable=True)
    
    compound = db.Column(db.Float, nullable=True)
    neg = db.Column(db.Float, nullable=True)
    neu = db.Column(db.Float, nullable=True)
    pos = db.Column(db.Float, nullable=True)
    
    # Score geral calculado
    overall_score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    subject = db.relationship('Subject', backref=db.backref('feedbacks', lazy=True))

    def calculate_overall_score(self):
        scores = [
            self.material_quality,
            self.teaching_method,
            self.content_understanding,
            self.class_pace,
            self.practical_examples
        ]
        # Normaliza para escala 0-1 (onde 1 é muito satisfeito e 0 é muito insatisfeito)
        average = sum(scores) / len(scores)
        return (average - 1) / 4

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_username': self.student.username if self.student else 'Unknown',
            'subject': self.subject.name,
            'subject_id': self.subject_id,
            'material_quality': self.material_quality,
            'teaching_method': self.teaching_method,
            'content_understanding': self.content_understanding,
            'class_pace': self.class_pace,
            'practical_examples': self.practical_examples,
            'additional_comment': self.additional_comment,
            'compound': self.compound,
            'neg': self.neg,
            'neu': self.neu,
            'pos': self.pos,
            'overall_score': self.overall_score,
            'created_at': self.created_at.isoformat()
        }

class StudentRiskAnalysis(db.Model):
    """Tabela para armazenar análise de risco de evasão por aluno/matéria"""
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    
    # Métricas calculadas
    average_score = db.Column(db.Float, nullable=False)  # Média dos scores gerais
    average_sentiment = db.Column(db.Float, nullable=True)  # Média do compound
    feedback_count = db.Column(db.Integer, nullable=False)  # Número de feedbacks
    
    risk_score = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)
    
    last_updated = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    student = db.relationship('User', backref='risk_analyses')
    subject = db.relationship('Subject', backref='risk_analyses')
    
    def calculate_risk_score(self):
        """
        Calcula o score de risco baseado em múltiplos fatores
        Risk Score: 0 (sem risco) a 1 (alto risco)
        """
        # Componente 1: Score médio invertido (quanto menor o score, maior o risco)
        score_risk = 1 - self.average_score
        
        # Componente 2: Sentimento
        sentiment_risk = 0
        if self.average_sentiment is not None:
            # Converte compound de -1/+1 para 0/1 (risco)
            sentiment_risk = (1 - self.average_sentiment) / 2
        
        # Componente 3: Consistência (poucos feedbacks = maior incerteza)
        consistency_risk = max(0, (5 - self.feedback_count) / 5) * 0.3
        
        # Peso: 50% score, 30% sentimento, 20% consistência
        weights = [0.5, 0.3, 0.2]
        if self.average_sentiment is None:
            weights = [0.7, 0, 0.3]  # Ajusta pesos se não houver sentimento
        
        self.risk_score = (
            score_risk * weights[0] +
            sentiment_risk * weights[1] +
            consistency_risk * weights[2]
        )
        
        # Define nível de risco
        if self.risk_score >= 0.6:
            self.risk_level = 'alto'
        elif self.risk_score >= 0.3:
            self.risk_level = 'medio'
        else:
            self.risk_level = 'baixo'
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_username': self.student.username,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name,
            'average_score': round(self.average_score, 3),
            'average_sentiment': round(self.average_sentiment, 3) if self.average_sentiment else None,
            'feedback_count': self.feedback_count,
            'risk_score': round(self.risk_score, 3),
            'risk_level': self.risk_level,
            'last_updated': self.last_updated.isoformat()
        }