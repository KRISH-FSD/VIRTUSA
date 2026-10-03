from extensions import db


class MCQQuestion(db.Model):
    __tablename__ = 'mcq_questions'

    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.Text, nullable=False)
    code_snippet = db.Column(db.Text, nullable=True)
    option_a = db.Column(db.String(256), nullable=False)
    option_b = db.Column(db.String(256), nullable=False)
    option_c = db.Column(db.String(256), nullable=False)
    option_d = db.Column(db.String(256), nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)
    marks = db.Column(db.Integer, nullable=False, default=1)

    answers = db.relationship('MCQAnswer', backref='question', lazy=True)

    def to_dict(self, include_answer=False):
        data = {
            'id': self.id,
            'question': self.question,
            'code_snippet': self.code_snippet,
            'option_a': self.option_a,
            'option_b': self.option_b,
            'option_c': self.option_c,
            'option_d': self.option_d,
            'marks': self.marks,
        }
        if include_answer:
            data['correct_answer'] = self.correct_answer
        return data


class MCQAnswer(db.Model):
    __tablename__ = 'mcq_answers'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('mcq_questions.id'), nullable=False)
    selected_answer = db.Column(db.String(1), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'question_id': self.question_id,
            'selected_answer': self.selected_answer,
            'is_correct': self.is_correct,
        }
