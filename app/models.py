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
    role = db.Column(db.String(50), nullable=False, default='ALUNO') # 'ALUNO', 'PROFESSOR', 'COORDENADOR'
    
    subjects = db.relationship('Subject', secondary=user_subjects, lazy='subquery',
        backref=db.backref('professors', lazy=True))

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {'id': self.id, 'name': self.name}

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(500), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    compound = db.Column(db.Float, nullable=False)
    neg = db.Column(db.Float, nullable=False)
    neu = db.Column(db.Float, nullable=False)
    pos = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    subject = db.relationship('Subject', backref=db.backref('feedbacks', lazy=True))

    def to_dict(self):
        """Converts a feedback object to a dictionary"""
        return {
            'id': self.id,
            'text': self.text,
            'subject': self.subject.name,
            'subject_id': self.subject_id,
            'compound': self.compound,
            'neg': self.neg,
            'neu': self.neu,
            'pos': self.pos,
            'created_at': self.created_at.isoformat()
        }