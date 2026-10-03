from extensions import db


class ExcelQuestion(db.Model):
    __tablename__ = 'excel_questions'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    scenario_description = db.Column(db.Text, nullable=False)
    dataset_preview = db.Column(db.Text, nullable=True)  # JSON or formatted markdown table
    question_prompt = db.Column(db.Text, nullable=False)
    placeholder = db.Column(db.String(256), nullable=True)
    expected_formula = db.Column(db.String(512), nullable=False)
    accepted_patterns = db.Column(db.Text, nullable=True)  # Pipe-separated or JSON list of valid alternatives
    marks = db.Column(db.Integer, nullable=False, default=2)

    answers = db.relationship('ExcelAnswer', backref='question', lazy=True)

    def to_dict(self, include_answer=False):
        data = {
            'id': self.id,
            'title': self.title,
            'scenario_description': self.scenario_description,
            'dataset_preview': self.dataset_preview,
            'question_prompt': self.question_prompt,
            'placeholder': self.placeholder,
            'marks': self.marks,
        }
        if include_answer:
            data['expected_formula'] = self.expected_formula
            data['accepted_patterns'] = self.accepted_patterns
        return data


class ExcelAnswer(db.Model):
    __tablename__ = 'excel_answers'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('excel_questions.id'), nullable=False)
    typed_answer = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    score = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'question_id': self.question_id,
            'typed_answer': self.typed_answer,
            'is_correct': self.is_correct,
            'score': self.score,
        }
