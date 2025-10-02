from flask_sqlalchemy import SQLAlchemy
import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='aluno')

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(500), nullable=False)
    compound = db.Column(db.Float, nullable=False)
    neg = db.Column(db.Float, nullable=False)
    neu = db.Column(db.Float, nullable=False)
    pos = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        """Converts a feedback object to a dictionary"""
        return {
            'id': self.id,
            'text': self.text,
            'compound': self.compound,
            'neg': self.neg,
            'neu': self.neu,
            'pos': self.pos,
            'created_at': self.created_at.isoformat()
        }