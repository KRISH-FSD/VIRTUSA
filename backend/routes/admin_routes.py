from flask import Blueprint, jsonify
from models.attempt import Attempt
from models.mcq import MCQQuestion, MCQAnswer
from models.excel import ExcelQuestion, ExcelAnswer
from models.sql import SQLQuestion, SQLAnswer
from models.coding import CodingQuestion
from models.submission import CodingSubmission, TestResult

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/attempts', methods=['GET'])
def list_attempts():
    """GET /api/admin/attempts — list all candidate attempts with 4 section scores."""
    attempts = Attempt.query.order_by(Attempt.started_at.desc()).all()
    result = []
    for a in attempts:
        result.append({
            'id': a.id,
            'user_id': a.user_id,
            'status': a.status,
            'current_section': a.current_section,
            'mcq_score': a.mcq_score or 0,
            'excel_score': a.excel_score or 0,
            'sql_score': a.sql_score or 0,
            'coding_score': a.coding_score or 0,
            'total_score': a.total_score or 0,
            'started_at': a.started_at.isoformat() if a.started_at else None,
            'completed_at': a.completed_at.isoformat() if a.completed_at else None,
        })
    return jsonify({'attempts': result}), 200


@admin_bp.route('/attempts/<int:attempt_id>', methods=['GET'])
def get_attempt_detail(attempt_id):
    """GET /api/admin/attempts/{attempt_id} — full detail for admin review across all 4 sections."""
    attempt = Attempt.query.get(attempt_id)
    if not attempt:
        return jsonify({'error': 'Attempt not found'}), 404

    # 1. MCQ answers
    mcq_answers = []
    for ans in MCQAnswer.query.filter_by(attempt_id=attempt_id).all():
        q = MCQQuestion.query.get(ans.question_id)
        if q:
            mcq_answers.append({
                'question_id': q.id,
                'question_text': q.question,
                'code_snippet': q.code_snippet,
                'selected_answer': ans.selected_answer,
                'correct_answer': q.correct_answer,
                'is_correct': ans.is_correct,
                'marks': q.marks,
            })

    # 2. Excel answers
    excel_answers = []
    for ans in ExcelAnswer.query.filter_by(attempt_id=attempt_id).all():
        q = ExcelQuestion.query.get(ans.question_id)
        if q:
            excel_answers.append({
                'question_id': q.id,
                'title': q.title,
                'typed_answer': ans.typed_answer,
                'expected_formula': q.expected_formula,
                'is_correct': ans.is_correct,
                'score': ans.score,
                'max_marks': q.marks,
            })

    # 3. SQL answers
    sql_answers = []
    for ans in SQLAnswer.query.filter_by(attempt_id=attempt_id).all():
        q = SQLQuestion.query.get(ans.question_id)
        if q:
            sql_answers.append({
                'question_id': q.id,
                'title': q.title,
                'query_text': ans.query_text,
                'expected_query': q.expected_query,
                'is_correct': ans.is_correct,
                'score': ans.score,
                'max_marks': q.marks,
            })

    # 4. Coding submissions
    coding_submissions = []
    for sub in CodingSubmission.query.filter_by(attempt_id=attempt_id).order_by(CodingSubmission.submitted_at.desc()).all():
        q = CodingQuestion.query.get(sub.coding_question_id)
        coding_submissions.append({
            'submission_id': sub.id,
            'question_title': q.title if q else 'Coding Problem',
            'language': sub.language,
            'source_code': sub.source_code,
            'score': sub.score,
            'passed_tests': sub.passed_tests,
            'total_tests': sub.total_tests,
            'submitted_at': sub.submitted_at.isoformat() if sub.submitted_at else None,
        })

    return jsonify({
        'attempt': attempt.to_dict(),
        'mcq_answers': mcq_answers,
        'excel_answers': excel_answers,
        'sql_answers': sql_answers,
        'coding_submissions': coding_submissions,
    }), 200
