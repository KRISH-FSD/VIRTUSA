from extensions import db
from datetime import datetime


class CodingSubmission(db.Model):
    __tablename__ = 'coding_submissions'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('attempts.id'), nullable=False)
    coding_question_id = db.Column(db.Integer, db.ForeignKey('coding_questions.id'), nullable=False)
    language = db.Column(db.String(32), nullable=False, default='python')
    source_code = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), nullable=False, default='PENDING')
    score = db.Column(db.Integer, nullable=True)
    passed_tests = db.Column(db.Integer, nullable=True)
    total_tests = db.Column(db.Integer, nullable=True)
    execution_time_ms = db.Column(db.Integer, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    test_results = db.relationship('TestResult', backref='submission', lazy=True)

    def to_dict(self, include_hidden=False):
        results = []
        for r in self.test_results:
            if include_hidden or r.test_case.is_public:
                results.append(r.to_dict(include_hidden=include_hidden))
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'coding_question_id': self.coding_question_id,
            'language': self.language,
            'source_code': self.source_code,
            'status': self.status,
            'score': self.score,
            'passed_tests': self.passed_tests,
            'total_tests': self.total_tests,
            'execution_time_ms': self.execution_time_ms,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'test_results': results,
        }


class TestResult(db.Model):
    __tablename__ = 'test_results'

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('coding_submissions.id'), nullable=False)
    test_case_id = db.Column(db.Integer, db.ForeignKey('test_cases.id'), nullable=False)
    status = db.Column(db.String(32), nullable=False)  # PASS / FAIL / TLE / ERROR
    actual_output = db.Column(db.Text, nullable=True)
    execution_time_ms = db.Column(db.Integer, nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    test_case = db.relationship('TestCase', lazy=True)

    def to_dict(self, include_hidden=False):
        data = {
            'id': self.id,
            'test_case_id': self.test_case_id,
            'status': self.status,
            'execution_time_ms': self.execution_time_ms,
            'is_public': self.test_case.is_public,
        }
        if include_hidden or self.test_case.is_public:
            data['actual_output'] = self.actual_output
            data['error_message'] = self.error_message
        return data
