from extensions import db


class CodingQuestion(db.Model):
    __tablename__ = 'coding_questions'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text, nullable=False)
    input_format = db.Column(db.Text, nullable=True)
    output_format = db.Column(db.Text, nullable=True)
    constraints = db.Column(db.Text, nullable=True)
    starter_code = db.Column(db.Text, nullable=True)
    language = db.Column(db.String(32), nullable=False, default='python')
    time_limit_ms = db.Column(db.Integer, nullable=False, default=2000)
    memory_limit_mb = db.Column(db.Integer, nullable=False, default=256)
    marks = db.Column(db.Integer, nullable=False, default=10)

    test_cases = db.relationship('TestCase', backref='question', lazy=True)

    def to_dict(self, include_hidden=False):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'input_format': self.input_format,
            'output_format': self.output_format,
            'constraints': self.constraints,
            'starter_code': self.starter_code,
            'language': self.language,
            'time_limit_ms': self.time_limit_ms,
            'memory_limit_mb': self.memory_limit_mb,
            'marks': self.marks,
            'test_cases': [
                tc.to_dict() for tc in self.test_cases
                if include_hidden or tc.is_public
            ],
        }


class TestCase(db.Model):
    __tablename__ = 'test_cases'

    id = db.Column(db.Integer, primary_key=True)
    coding_question_id = db.Column(db.Integer, db.ForeignKey('coding_questions.id'), nullable=False)
    input_data = db.Column(db.Text, nullable=False)
    expected_output = db.Column(db.Text, nullable=False)
    is_public = db.Column(db.Boolean, nullable=False, default=True)
    weight = db.Column(db.Integer, nullable=False, default=2)

    def to_dict(self, include_expected=False):
        data = {
            'id': self.id,
            'is_public': self.is_public,
            'weight': self.weight,
        }
        if self.is_public:
            data['input_data'] = self.input_data
            data['expected_output'] = self.expected_output
        if include_expected:
            data['input_data'] = self.input_data
            data['expected_output'] = self.expected_output
        return data
