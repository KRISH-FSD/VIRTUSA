import re
import json


def normalize_formula(s: str) -> str:
    """Normalize formula string for comparison."""
    if not s:
        return ""
    s = s.strip()
    # Remove leading '=' if present
    if s.startswith('='):
        s = s[1:].strip()
    # Normalize uppercase for function names
    s = s.upper()
    # Replace multiple spaces with single space
    s = re.sub(r'\s+', ' ', s)
    # Remove spaces around commas, parentheses, colons, arithmetic operators
    s = re.sub(r'\s*([,\(\):+\-*/&><=])\s*', r'\1', s)
    # Normalize single quotes to double quotes for string literals
    s = s.replace("'", '"')
    return s


def evaluate_excel_answer(typed_answer: str, expected_formula: str, accepted_patterns: str = None) -> bool:
    """
    Evaluates whether the candidate's typed answer matches the expected formula
    or any accepted alternative pattern.
    """
    if not typed_answer or not typed_answer.strip():
        return False

    norm_user = normalize_formula(typed_answer)
    norm_expected = normalize_formula(expected_formula)

    if norm_user == norm_expected:
        return True

    # Also compare raw without spaces
    if norm_user.replace(' ', '') == norm_expected.replace(' ', ''):
        return True

    # Check accepted alternative patterns
    if accepted_patterns:
        try:
            alternatives = json.loads(accepted_patterns)
        except Exception:
            alternatives = [p.strip() for p in accepted_patterns.split('|') if p.strip()]

        for alt in alternatives:
            norm_alt = normalize_formula(alt)
            if norm_user == norm_alt or norm_user.replace(' ', '') == norm_alt.replace(' ', ''):
                return True

    return False
