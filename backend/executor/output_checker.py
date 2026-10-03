import re


def normalize(text: str) -> str:
    """Normalize output for comparison: strip, normalize whitespace within each line, and strip quotes."""
    if text is None:
        return ''
    # Strip leading/trailing whitespace from entire output
    text = text.strip()
    # Normalize each line: strip line, collapse internal spaces, strip surrounding quotes
    lines = []
    for line in text.splitlines():
        line = line.strip()
        # Strip outer quotes if entire line is enclosed in quotes
        if (line.startswith('"') and line.endswith('"')) or (line.startswith("'") and line.endswith("'")):
            line = line[1:-1].strip()
        # Collapse multiple spaces/tabs to a single space
        line = re.sub(r'\s+', ' ', line)
        lines.append(line)
    return '\n'.join(lines)


def check_output(expected: str, actual: str) -> bool:
    """
    Returns True if actual output matches expected output after normalization.
    Treats different amounts of whitespace as equivalent.
    """
    return normalize(expected) == normalize(actual)
