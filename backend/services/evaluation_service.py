from executor.docker_runner import execute_test_case
from models.coding import CodingQuestion, TestCase
from models.submission import CodingSubmission, TestResult
from extensions import db
from datetime import datetime


def run_public_tests(source_code: str, question: CodingQuestion, language: str = 'python') -> dict:
    """Run only public test cases. Returns safe summary for candidate."""
    public_cases = [tc for tc in question.test_cases if tc.is_public]
    results = []
    total_time_ms = 0

    for tc in public_cases:
        res = execute_test_case(source_code, tc, language=language, question_title=question.title)
        results.append({
            'test_case_id': tc.id,
            'status': res['status'],
            'execution_time_ms': res['execution_time_ms'],
            'input_data': tc.input_data,
            'expected_output': tc.expected_output,
            'actual_output': res['actual_output'],
            'error_message': res['error_message'],
            'is_public': True,
        })
        total_time_ms += res['execution_time_ms']

    passed = sum(1 for r in results if r['status'] == 'PASS')
    return {
        'passed': passed,
        'total': len(results),
        'results': results,
        'total_time_ms': total_time_ms,
    }


def run_all_tests_and_save(attempt_id: int, source_code: str,
                           question: CodingQuestion, language: str = 'python') -> CodingSubmission:
    """
    Run all test cases (public + hidden), save submission + per-test results.
    Returns the saved CodingSubmission.
    """
    all_cases = question.test_cases
    test_results_data = []
    total_time_ms = 0
    total_score = 0

    for tc in all_cases:
        res = execute_test_case(source_code, tc, language=language, question_title=question.title)
        test_results_data.append((tc, res))
        total_time_ms += res['execution_time_ms']
        if res['status'] == 'PASS':
            total_score += tc.weight

    passed = sum(1 for _, r in test_results_data if r['status'] == 'PASS')
    total = len(test_results_data)

    # Create submission record
    submission = CodingSubmission(
        attempt_id=attempt_id,
        coding_question_id=question.id,
        language=language,
        source_code=source_code,
        status='COMPLETED',
        score=total_score,
        passed_tests=passed,
        total_tests=total,
        execution_time_ms=total_time_ms,
        submitted_at=datetime.utcnow(),
    )
    db.session.add(submission)
    db.session.flush()

    # Save per-test results
    for tc, res in test_results_data:
        tr = TestResult(
            submission_id=submission.id,
            test_case_id=tc.id,
            status=res['status'],
            actual_output=res['actual_output'],
            execution_time_ms=res['execution_time_ms'],
            error_message=res['error_message'],
        )
        db.session.add(tr)

    db.session.commit()
    return submission
