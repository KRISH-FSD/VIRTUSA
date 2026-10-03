from flask import Blueprint, request, jsonify
from extensions import db
from models.attempt import Attempt
from models.mcq import MCQQuestion, MCQAnswer
from models.excel import ExcelQuestion, ExcelAnswer
from models.sql import SQLQuestion, SQLAnswer
from models.coding import CodingQuestion, TestCase
from models.id_photo import IDPhoto
from executor.excel_evaluator import evaluate_excel_answer
from executor.sql_runner import execute_candidate_sql, evaluate_sql_query
from datetime import datetime, timedelta
from config import Config
import os, base64, uuid

exam_bp = Blueprint('exam', __name__, url_prefix='/api/exam')


def _get_attempt_or_404(attempt_id):
    attempt = Attempt.query.get(attempt_id)
    if not attempt:
        return None, (jsonify({'error': 'Attempt not found'}), 404)
    return attempt, None


def _is_test_mode():
    return request.headers.get('X-Test-Mode') == 'true' or request.headers.get('x-test-mode') == 'true'


def _check_not_completed(attempt):
    if attempt.status == 'COMPLETED':
        return jsonify({'error': 'Exam already completed. No further submissions allowed.'}), 403
    if not _is_test_mode() and attempt.status == 'EXPIRED':
        return jsonify({'error': 'Exam time expired.'}), 403
    return None


def _check_expiry(attempt):
    """Check if exam has expired and update status if needed."""
    if _is_test_mode():
        return False
    if attempt.expires_at and datetime.utcnow() > attempt.expires_at:
        if attempt.status not in ('COMPLETED', 'EXPIRED'):
            attempt.status = 'EXPIRED'
            db.session.commit()
        return True
    return False


# ── Background Process & Environment Security Check ──────────────────
APP_MAP = {
    'code.exe': 'Visual Studio Code',
    'cursor.exe': 'Cursor Editor',
    'pycharm64.exe': 'PyCharm',
    'pycharm.exe': 'PyCharm',
    'idea64.exe': 'IntelliJ IDEA',
    'sublime_text.exe': 'Sublime Text',
    'notepad++.exe': 'Notepad++',
    'msedge.exe': 'Microsoft Edge',
    'firefox.exe': 'Mozilla Firefox',
    'brave.exe': 'Brave Browser',
    'opera.exe': 'Opera Browser',
    'vivaldi.exe': 'Vivaldi Browser',
    'arc.exe': 'Arc Browser',
    'tor.exe': 'Tor Browser',
    'discord.exe': 'Discord',
    'telegram.exe': 'Telegram',
    'whatsapp.exe': 'WhatsApp',
    'slack.exe': 'Slack',
    'teams.exe': 'Microsoft Teams',
    'ms-teams.exe': 'Microsoft Teams',
    'zoom.exe': 'Zoom',
    'skype.exe': 'Skype',
    'spotify.exe': 'Spotify',
    'obs64.exe': 'OBS Studio',
    'anydesk.exe': 'AnyDesk',
    'teamviewer.exe': 'TeamViewer',
    'chatgpt.exe': 'ChatGPT',
    'notion.exe': 'Notion',
}

def get_disallowed_running_apps():
    """Detect disallowed applications while ignoring pure background services."""
    import psutil
    detected = set()
    edge_has_real_window = False
    teams_has_real_window = False

    for p in psutil.process_iter(['name', 'cmdline']):
        try:
            n = (p.info['name'] or '').lower()
            if not n:
                continue

            if n == 'msedge.exe':
                cmd = [str(c).lower() for c in (p.info.get('cmdline') or [])]
                has_type = any(c.startswith('--type=') for c in cmd)
                has_no_startup = '--no-startup-window' in cmd
                if not has_type and not has_no_startup:
                    edge_has_real_window = True
                continue

            if n in ('teams.exe', 'ms-teams.exe'):
                cmd = ' '.join([str(c).lower() for c in (p.info.get('cmdline') or [])])
                if 'system-initiated' not in cmd and '--process_type=native_module' not in cmd:
                    teams_has_real_window = True
                continue

            if n in APP_MAP:
                detected.add(APP_MAP[n])
        except Exception:
            pass

    if edge_has_real_window:
        detected.add('Microsoft Edge')
    if teams_has_real_window:
        detected.add('Microsoft Teams')

    return sorted(list(detected))


@exam_bp.route('/check-environment', methods=['GET'])
def check_environment():
    """GET /api/exam/check-environment"""
    apps = get_disallowed_running_apps()
    return jsonify({
        'clean': len(apps) == 0,
        'disallowed_apps': apps,
    }), 200


@exam_bp.route('/close-apps', methods=['POST'])
def close_apps():
    """POST /api/exam/close-apps"""
    import psutil
    closed = []
    failed = []

    target_exes = set(APP_MAP.keys())

    for p in psutil.process_iter(['pid', 'name']):
        try:
            n = (p.info['name'] or '').lower()
            if n in target_exes:
                app_name = APP_MAP[n]
                try:
                    p.terminate()
                    closed.append(app_name)
                except Exception:
                    try:
                        p.kill()
                        closed.append(app_name)
                    except Exception:
                        failed.append(app_name)
        except Exception:
            pass

    import time
    time.sleep(0.5)

    remaining = get_disallowed_running_apps()
    return jsonify({
        'success': len(remaining) == 0,
        'closed': sorted(list(set(closed))),
        'remaining': remaining,
    }), 200


# ── Exam Start ────────────────────────────────────────────────────────
@exam_bp.route('/start', methods=['POST'])
def start_exam():
    """POST /api/exam/start — creates a new attempt starting at Section 1 (MCQ)."""
    data = request.get_json()
    if not data or not data.get('user_id'):
        return jsonify({'error': 'user_id is required'}), 400

    user_id = data['user_id'].strip().upper()
    if not user_id or len(user_id) > 64:
        return jsonify({'error': 'Invalid user_id'}), 400

    # Block duplicate in-progress attempts
    in_progress = Attempt.query.filter(
        Attempt.user_id == user_id,
        Attempt.status.in_(['MCQ_IN_PROGRESS', 'EXCEL_IN_PROGRESS', 'SQL_IN_PROGRESS', 'CODING_IN_PROGRESS'])
    ).first()
    if in_progress:
        return jsonify({
            'error': 'An exam is already in progress for this User ID.',
            'attempt_id': in_progress.id,
            'status': in_progress.status,
            'current_section': in_progress.current_section,
            'expires_at': in_progress.expires_at.isoformat() if in_progress.expires_at else None,
            'in_progress': True,
        }), 409

    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=Config.SECTION_MCQ_MINUTES)

    attempt = Attempt(
        user_id=user_id,
        status='MCQ_IN_PROGRESS',
        current_section='MCQ',
        started_at=now,
        expires_at=expires_at,
    )
    db.session.add(attempt)
    db.session.commit()

    return jsonify({
        'attempt_id': attempt.id,
        'user_id': attempt.user_id,
        'status': attempt.status,
        'current_section': attempt.current_section,
        'started_at': attempt.started_at.isoformat(),
        'expires_at': attempt.expires_at.isoformat(),
        'duration_minutes': Config.SECTION_MCQ_MINUTES,
    }), 201


# ============================================================================
# SECTION 1: PROGRAMMING LANGUAGE MCQ ENDPOINTS
# ============================================================================
@exam_bp.route('/<int:attempt_id>/mcqs', methods=['GET'])
def get_mcqs(attempt_id):
    """GET /api/exam/{attempt_id}/mcqs"""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    if _check_expiry(attempt):
        return jsonify({'error': 'Exam expired'}), 403

    questions = MCQQuestion.query.order_by(MCQQuestion.id.asc()).all()
    existing_answers = {
        a.question_id: a.selected_answer
        for a in MCQAnswer.query.filter_by(attempt_id=attempt_id).all()
    }

    qs = []
    for q in questions:
        d = q.to_dict(include_answer=False)  # Never leak answers
        d['saved_answer'] = existing_answers.get(q.id)
        qs.append(d)

    return jsonify({
        'questions': qs,
        'expires_at': attempt.expires_at.isoformat() if attempt.expires_at else None,
        'current_section': attempt.current_section,
    }), 200


@exam_bp.route('/<int:attempt_id>/mcq-answer', methods=['POST'])
def save_mcq_answer(attempt_id):
    """POST /api/exam/{attempt_id}/mcq-answer"""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    if _check_expiry(attempt):
        return jsonify({'error': 'Exam expired'}), 403

    data = request.get_json()
    question_id = data.get('question_id')
    answer = data.get('answer', '').strip().upper()

    if not question_id or answer not in ('A', 'B', 'C', 'D'):
        return jsonify({'error': 'Invalid question_id or answer'}), 400

    question = MCQQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404

    is_correct = (answer == question.correct_answer)

    existing = MCQAnswer.query.filter_by(
        attempt_id=attempt_id, question_id=question_id
    ).first()

    if existing:
        existing.selected_answer = answer
        existing.is_correct = is_correct
    else:
        new_answer = MCQAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            selected_answer=answer,
            is_correct=is_correct,
        )
        db.session.add(new_answer)

    db.session.commit()
    return jsonify({'saved': True}), 200


@exam_bp.route('/<int:attempt_id>/mcq/complete', methods=['POST'])
def complete_mcq(attempt_id):
    """POST /api/exam/{attempt_id}/mcq/complete — Grades MCQ & advances to Section 2 (Excel)."""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    # Calculate MCQ score
    answers = MCQAnswer.query.filter_by(attempt_id=attempt_id).all()
    mcq_score = sum(a.is_correct * (MCQQuestion.query.get(a.question_id).marks if MCQQuestion.query.get(a.question_id) else 1) for a in answers)

    # Transition to Section 2: Excel
    now = datetime.utcnow()
    attempt.mcq_score = mcq_score
    attempt.status = 'EXCEL_IN_PROGRESS'
    attempt.current_section = 'EXCEL'
    attempt.expires_at = now + timedelta(minutes=Config.SECTION_EXCEL_MINUTES)
    db.session.commit()

    return jsonify({
        'status': attempt.status,
        'current_section': attempt.current_section,
        'expires_at': attempt.expires_at.isoformat(),
        'duration_minutes': Config.SECTION_EXCEL_MINUTES,
        'next_route': '/exam/excel',
    }), 200


# ============================================================================
# SECTION 2: EXCEL & DATA ANALYSIS ENDPOINTS
# ============================================================================
@exam_bp.route('/<int:attempt_id>/excel', methods=['GET'])
def get_excel_questions(attempt_id):
    """GET /api/exam/{attempt_id}/excel"""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    if _check_expiry(attempt):
        return jsonify({'error': 'Exam expired'}), 403

    questions = ExcelQuestion.query.order_by(ExcelQuestion.id.asc()).all()
    existing_answers = {
        a.question_id: a.typed_answer
        for a in ExcelAnswer.query.filter_by(attempt_id=attempt_id).all()
    }

    qs = []
    for q in questions:
        d = q.to_dict(include_answer=False)  # Never leak answers
        d['saved_answer'] = existing_answers.get(q.id, '')
        qs.append(d)

    return jsonify({
        'questions': qs,
        'expires_at': attempt.expires_at.isoformat() if attempt.expires_at else None,
        'current_section': attempt.current_section,
    }), 200


@exam_bp.route('/<int:attempt_id>/excel-answer', methods=['POST'])
def save_excel_answer(attempt_id):
    """POST /api/exam/{attempt_id}/excel-answer"""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    if _check_expiry(attempt):
        return jsonify({'error': 'Exam expired'}), 403

    data = request.get_json()
    question_id = data.get('question_id')
    typed_answer = (data.get('answer') or '').strip()

    if not question_id:
        return jsonify({'error': 'question_id is required'}), 400

    question = ExcelQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404

    is_correct = evaluate_excel_answer(typed_answer, question.expected_formula, question.accepted_patterns)
    score = question.marks if is_correct else 0

    existing = ExcelAnswer.query.filter_by(
        attempt_id=attempt_id, question_id=question_id
    ).first()

    if existing:
        existing.typed_answer = typed_answer
        existing.is_correct = is_correct
        existing.score = score
    else:
        new_ans = ExcelAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            typed_answer=typed_answer,
            is_correct=is_correct,
            score=score
        )
        db.session.add(new_ans)

    db.session.commit()
    return jsonify({'saved': True}), 200


@exam_bp.route('/<int:attempt_id>/excel/complete', methods=['POST'])
def complete_excel(attempt_id):
    """POST /api/exam/{attempt_id}/excel/complete — Grades Excel & advances to Section 3 (SQL)."""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    # Calculate Excel score
    answers = ExcelAnswer.query.filter_by(attempt_id=attempt_id).all()
    excel_score = sum(a.score for a in answers)

    # Transition to Section 3: SQL
    now = datetime.utcnow()
    attempt.excel_score = excel_score
    attempt.status = 'SQL_IN_PROGRESS'
    attempt.current_section = 'SQL'
    attempt.expires_at = now + timedelta(minutes=Config.SECTION_SQL_MINUTES)
    db.session.commit()

    return jsonify({
        'status': attempt.status,
        'current_section': attempt.current_section,
        'expires_at': attempt.expires_at.isoformat(),
        'duration_minutes': Config.SECTION_SQL_MINUTES,
        'next_route': '/exam/sql',
    }), 200


# ============================================================================
# SECTION 3: SQL ASSESSMENT ENDPOINTS
# ============================================================================
@exam_bp.route('/<int:attempt_id>/sql', methods=['GET'])
def get_sql_questions(attempt_id):
    """GET /api/exam/{attempt_id}/sql"""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    if _check_expiry(attempt):
        return jsonify({'error': 'Exam expired'}), 403

    questions = SQLQuestion.query.order_by(SQLQuestion.id.asc()).all()
    existing_answers = {
        a.question_id: a.query_text
        for a in SQLAnswer.query.filter_by(attempt_id=attempt_id).all()
    }

    qs = []
    for q in questions:
        d = q.to_dict(include_query=False)  # Never leak reference query
        d['saved_query'] = existing_answers.get(q.id, '')
        qs.append(d)

    return jsonify({
        'questions': qs,
        'expires_at': attempt.expires_at.isoformat() if attempt.expires_at else None,
        'current_section': attempt.current_section,
    }), 200


@exam_bp.route('/<int:attempt_id>/sql/run', methods=['POST'])
def run_sql_query(attempt_id):
    """POST /api/exam/{attempt_id}/sql/run — Executes candidate query and previews result grid."""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    data = request.get_json()
    question_id = data.get('question_id')
    query_text = (data.get('query') or '').strip()

    if not question_id or not query_text:
        return jsonify({'error': 'question_id and query are required'}), 400

    question = SQLQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404

    run_res = execute_candidate_sql(question.schema_ddl, question.seed_sql, query_text)
    return jsonify(run_res), 200


@exam_bp.route('/<int:attempt_id>/sql-answer', methods=['POST'])
def save_sql_answer(attempt_id):
    """POST /api/exam/{attempt_id}/sql-answer"""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    if _check_expiry(attempt):
        return jsonify({'error': 'Exam expired'}), 403

    data = request.get_json()
    question_id = data.get('question_id')
    query_text = (data.get('query') or '').strip()

    if not question_id:
        return jsonify({'error': 'question_id is required'}), 400

    question = SQLQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404

    eval_res = evaluate_sql_query(question.schema_ddl, question.seed_sql, question.expected_query, query_text)
    is_correct = eval_res['is_correct']
    score = question.marks if is_correct else 0

    existing = SQLAnswer.query.filter_by(
        attempt_id=attempt_id, question_id=question_id
    ).first()

    if existing:
        existing.query_text = query_text
        existing.is_correct = is_correct
        existing.score = score
    else:
        new_ans = SQLAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            query_text=query_text,
            is_correct=is_correct,
            score=score
        )
        db.session.add(new_ans)

    db.session.commit()
    return jsonify({'saved': True}), 200


@exam_bp.route('/<int:attempt_id>/sql/complete', methods=['POST'])
def complete_sql(attempt_id):
    """POST /api/exam/{attempt_id}/sql/complete — Grades SQL & advances to Section 4 (DSA Coding)."""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    # Calculate SQL score
    answers = SQLAnswer.query.filter_by(attempt_id=attempt_id).all()
    sql_score = sum(a.score for a in answers)

    # Transition to Section 4: Coding
    now = datetime.utcnow()
    attempt.sql_score = sql_score
    attempt.status = 'CODING_IN_PROGRESS'
    attempt.current_section = 'CODING'
    attempt.expires_at = now + timedelta(minutes=Config.SECTION_CODING_MINUTES)
    db.session.commit()

    return jsonify({
        'status': attempt.status,
        'current_section': attempt.current_section,
        'expires_at': attempt.expires_at.isoformat(),
        'duration_minutes': Config.SECTION_CODING_MINUTES,
        'next_route': '/exam/coding',
    }), 200


# ============================================================================
# SECTION 4: DSA CODING ASSESSMENT ENDPOINTS
# ============================================================================
@exam_bp.route('/<int:attempt_id>/coding', methods=['GET'])
def get_coding_problems(attempt_id):
    """GET /api/exam/{attempt_id}/coding — Returns the 2 DSA coding problems."""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    if attempt.status == 'COMPLETED':
        return jsonify({'error': 'Exam already completed'}), 403

    if _check_expiry(attempt):
        return jsonify({'error': 'Exam expired'}), 403

    questions = CodingQuestion.query.order_by(CodingQuestion.id.asc()).all()
    safe_questions = [q.to_dict(include_hidden=False) for q in questions]

    return jsonify({
        'questions': safe_questions,
        'expires_at': attempt.expires_at.isoformat() if attempt.expires_at else None,
        'current_section': attempt.current_section,
    }), 200


@exam_bp.route('/<int:attempt_id>/coding/run', methods=['POST'])
def run_code(attempt_id):
    """POST /api/exam/{attempt_id}/coding/run — Run against public tests only."""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    if _check_expiry(attempt):
        return jsonify({'error': 'Exam expired'}), 403

    data = request.get_json() or {}
    source_code = data.get('source_code', '')
    question_id = data.get('question_id')
    language = data.get('language', 'python')

    if not source_code or not source_code.strip():
        return jsonify({'error': 'No source code provided'}), 400

    question = CodingQuestion.query.get(question_id) if question_id else CodingQuestion.query.first()
    if not question:
        return jsonify({'error': 'Coding question not found'}), 404

    from services.evaluation_service import run_public_tests
    run_result = run_public_tests(source_code, question, language=language)
    return jsonify(run_result), 200


@exam_bp.route('/<int:attempt_id>/coding/submit', methods=['POST'])
def submit_code(attempt_id):
    """POST /api/exam/{attempt_id}/coding/submit — Run all tests, grade all sections, lock exam."""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    block = _check_not_completed(attempt)
    if block:
        return block

    data = request.get_json() or {}
    # submissions map { question_id: source_code } or single question
    submissions_map = data.get('submissions')
    single_source = data.get('source_code')
    single_qid = data.get('question_id')
    language = data.get('language', 'python')

    from services.evaluation_service import run_all_tests_and_save

    total_coding_score = 0
    all_coding_questions = CodingQuestion.query.all()

    if submissions_map and isinstance(submissions_map, dict):
        for q in all_coding_questions:
            code = submissions_map.get(str(q.id)) or submissions_map.get(q.id) or q.starter_code
            sub = run_all_tests_and_save(attempt_id, code, q, language)
            total_coding_score += sub.score
    elif single_source and single_qid:
        q = CodingQuestion.query.get(single_qid) or CodingQuestion.query.first()
        sub = run_all_tests_and_save(attempt_id, single_source, q, language)
        total_coding_score = sub.score
    else:
        # Evaluate whatever is provided
        for q in all_coding_questions:
            code = single_source if single_source else q.starter_code
            sub = run_all_tests_and_save(attempt_id, code, q, language)
            total_coding_score += sub.score

    # Finalize total scores
    attempt.coding_score = total_coding_score
    attempt.total_score = (
        (attempt.mcq_score or 0) +
        (attempt.excel_score or 0) +
        (attempt.sql_score or 0) +
        (attempt.coding_score or 0)
    )
    attempt.status = 'COMPLETED'
    attempt.completed_at = datetime.utcnow()
    db.session.commit()

    res_data = {
        'status': 'COMPLETED',
        'mcq_score': attempt.mcq_score,
        'excel_score': attempt.excel_score,
        'sql_score': attempt.sql_score,
        'coding_score': attempt.coding_score,
        'total_score': attempt.total_score,
    }

    response = jsonify(res_data)
    response.set_cookie(f'codeeval_completed_{attempt.user_id}', '1', max_age=31536000, httponly=False, samesite='Lax')
    response.set_cookie('codeeval_last_completed_user', attempt.user_id, max_age=31536000, httponly=False, samesite='Lax')
    response.set_cookie('codeeval_exam_locked', '1', max_age=31536000, httponly=False, samesite='Lax')
    return response, 200


@exam_bp.route('/<int:attempt_id>/result', methods=['GET'])
def get_result(attempt_id):
    """GET /api/exam/{attempt_id}/result"""
    attempt, err = _get_attempt_or_404(attempt_id)
    if err:
        return err

    if attempt.status not in ('COMPLETED', 'EXPIRED'):
        return jsonify({'error': 'Exam not yet completed'}), 400

    response = jsonify(attempt.to_dict())
    response.set_cookie(f'codeeval_completed_{attempt.user_id}', '1', max_age=31536000, path='/', samesite='Lax')
    response.set_cookie('codeeval_last_completed_user', attempt.user_id, max_age=31536000, path='/', samesite='Lax')
    response.set_cookie('codeeval_exam_locked', '1', max_age=31536000, path='/', samesite='Lax')
    return response, 200


# ============================================================================
# COLLEGE ID CARD PHOTO — Secure Upload & Delete
# Retention policy: 24 hours from capture, then permanently deleted.
# ============================================================================

SECURE_PHOTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'secure_photos')


@exam_bp.route('/id-photo/upload', methods=['POST'])
def upload_id_photo():
    """
    POST /api/exam/id-photo/upload

    Accepts a base64-encoded College ID card image captured via the
    candidate's webcam during pre-exam identity verification.

    Security behaviours:
      1. All previous photos for this user are securely wiped (zero-overwrite
         + deleted) before the new file is written — handles retake scenario.
      2. All globally expired photos are purged on each upload call.
      3. The photo is stored under secure_photos/ with a UUID filename.
      4. expires_at is set to exactly 24 hours from capture.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    user_id    = (data.get('user_id') or '').strip().upper()
    image_data = data.get('image_data')   # base64 data URL: "data:image/jpeg;base64,..."
    attempt_id = data.get('attempt_id')   # optional — may not exist yet at capture time

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    if not image_data or not image_data.startswith('data:image'):
        return jsonify({'error': 'Valid image_data (base64 data URL) is required'}), 400

    # ── 1. Purge all previous photos for this user (retake = old photo permanently deleted) ──
    IDPhoto.delete_all_for_user(user_id)

    # ── 2. Purge globally expired photos ──
    IDPhoto.cleanup_expired()

    # ── 3. Decode base64 image ──
    try:
        header, encoded = image_data.split(',', 1)
        img_bytes = base64.b64decode(encoded)
    except Exception:
        return jsonify({'error': 'Invalid base64 image data'}), 400

    if len(img_bytes) > 5 * 1024 * 1024:  # 5 MB cap
        return jsonify({'error': 'Image too large (max 5 MB)'}), 400

    # ── 4. Write to secure_photos/ with random UUID filename ──
    os.makedirs(SECURE_PHOTOS_DIR, exist_ok=True)
    photo_id  = str(uuid.uuid4())
    file_path = os.path.join(SECURE_PHOTOS_DIR, f'{photo_id}.jpg')

    with open(file_path, 'wb') as f:
        f.write(img_bytes)

    # ── 5. Persist DB record ──
    photo = IDPhoto(user_id=user_id, file_path=file_path, attempt_id=attempt_id)
    photo.id = photo_id
    db.session.add(photo)
    db.session.commit()

    return jsonify({
        'photo_id':   photo.id,
        'expires_at': photo.expires_at.isoformat(),
        'message':    'College ID card photo stored securely. Will be permanently deleted in 24 hours.',
    }), 201


@exam_bp.route('/id-photo/<photo_id>', methods=['DELETE'])
def delete_id_photo(photo_id):
    """
    DELETE /api/exam/id-photo/{photo_id}

    Immediately and permanently deletes the specified College ID photo:
      - File is overwritten with zeros then removed from disk.
      - DB record is deleted.
    Idempotent: returns success even if the photo_id does not exist.
    """
    photo = IDPhoto.query.get(photo_id)
    if photo:
        photo.secure_delete_file()
        db.session.delete(photo)
        db.session.commit()
    return jsonify({'deleted': True, 'photo_id': photo_id}), 200
