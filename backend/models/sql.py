from extensions import db


class SQLQuestion(db.Model):
    __tablename__ = 'sql_questions'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text, nullable=False)
    schema_ddl = db.Column(db.Text, nullable=False)  # CREATE TABLE statements
    seed_sql = db.Column(db.Text, nullable=False)    # INSERT statements for testing
    expected_query = db.Column(db.Text, nullable=False)
    table_preview = db.Column(db.Text, nullable=True)  # Markdown / JSON formatted table representation for UI
    marks = db.Column(db.Integer, nullable=False, default=2)

    answers = db.relationship('SQLAnswer', backref='question', lazy=True)

    def to_dict(self, include_query=False):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'schema_ddl': self.schema_ddl,
            'table_preview': self.table_preview,
            'marks': self.marks,
        }
        if include_query:
            data['expected_query'] = self.expected_query
        return data


class SQLAnswer(db.Model):
    __tablename__ = 'sql_answers'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('sql_questions.id'), nullable=False)
    query_text = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    score = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'question_id': self.question_id,
            'query_text': self.query_text,
            'is_correct': self.is_correct,
            'score': self.score,
        }
