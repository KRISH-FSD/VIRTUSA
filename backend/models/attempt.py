from extensions import db
from datetime import datetime


class Attempt(db.Model):
    __tablename__ = 'attempts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(64), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False, default='NOT_STARTED')
    current_section = db.Column(db.String(32), nullable=False, default='MCQ')
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    # Section scores
    mcq_score = db.Column(db.Integer, nullable=True, default=0)
    excel_score = db.Column(db.Integer, nullable=True, default=0)
    sql_score = db.Column(db.Integer, nullable=True, default=0)
    coding_score = db.Column(db.Integer, nullable=True, default=0)
    total_score = db.Column(db.Integer, nullable=True, default=0)

    # Relationships
    mcq_answers = db.relationship('MCQAnswer', backref='attempt', lazy=True, cascade="all, delete-orphan")
    excel_answers = db.relationship('ExcelAnswer', backref='attempt', lazy=True, cascade="all, delete-orphan")
    sql_answers = db.relationship('SQLAnswer', backref='attempt', lazy=True, cascade="all, delete-orphan")
    coding_submissions = db.relationship('CodingSubmission', backref='attempt', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'status': self.status,
            'current_section': self.current_section,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'mcq_score': self.mcq_score or 0,
            'excel_score': self.excel_score or 0,
            'sql_score': self.sql_score or 0,
            'coding_score': self.coding_score or 0,
            'total_score': self.total_score or 0,
        }
