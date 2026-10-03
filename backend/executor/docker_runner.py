import subprocess
import tempfile
import os
import sys
import time
from executor.output_checker import check_output

# Check if Docker is available
def _docker_available() -> bool:
    try:
        result = subprocess.run(
            ['docker', 'info'],
            capture_output=True, timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


DOCKER_IMAGE = 'python:3.10-slim'
DOCKER_AVAILABLE = None  # Lazy check


def _is_docker_available() -> bool:
    global DOCKER_AVAILABLE
    if DOCKER_AVAILABLE is None:
        DOCKER_AVAILABLE = _docker_available()
    return DOCKER_AVAILABLE


def run_code_in_docker(source_code: str, input_data: str, timeout_seconds: int = 5,
                       memory_limit: str = '256m', cpu_limit: str = '1') -> dict:
    """
    Run Python source code in a Docker sandbox.
    Returns dict with: stdout, stderr, exit_code, execution_time_ms, timed_out
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write source code to file
        code_path = os.path.join(tmpdir, 'candidate.py')
        with open(code_path, 'w', encoding='utf-8') as f:
            f.write(source_code)

        # Docker command
        cmd = [
            'docker', 'run',
            '--rm',
            '--network', 'none',
            f'--memory={memory_limit}',
            f'--cpus={cpu_limit}',
            '--pids-limit', '64',
            '--cap-drop', 'ALL',
            '--security-opt', 'no-new-privileges',
            '-v', f'{tmpdir}:/sandbox:ro',
            '-w', '/sandbox',
            DOCKER_IMAGE,
            'python3', '-u', 'candidate.py'
        ]

        start = time.time()
        try:
            proc = subprocess.run(
                cmd,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                encoding='utf-8',
                errors='replace'
            )
            elapsed_ms = int((time.time() - start) * 1000)
            return {
                'stdout': proc.stdout,
                'stderr': proc.stderr[:2048] if proc.stderr else '',
                'exit_code': proc.returncode,
                'execution_time_ms': elapsed_ms,
                'timed_out': False,
                'error': None,
            }
        except subprocess.TimeoutExpired:
            elapsed_ms = int((time.time() - start) * 1000)
            return {
                'stdout': '',
                'stderr': '',
                'exit_code': -1,
                'execution_time_ms': elapsed_ms,
                'timed_out': True,
                'error': 'Time Limit Exceeded',
            }
        except FileNotFoundError:
            return {
                'stdout': '',
                'stderr': '',
                'exit_code': -1,
                'execution_time_ms': 0,
                'timed_out': False,
                'error': 'Docker not found. Please ensure Docker Desktop is running.',
            }
        except Exception as e:
            return {
                'stdout': '',
                'stderr': str(e),
                'exit_code': -1,
                'execution_time_ms': 0,
                'timed_out': False,
                'error': str(e),
            }


def prepare_source_code(source_code: str, question_title: str = '', language: str = 'python') -> str:
    """
    LeetCode-style smart wrapper:
    If candidate wrote their own full script (reading stdin/input), leave it untouched.
    If candidate only wrote the function alone or class Solution, automatically
    append the execution driver for the question.
    """
    lang = (language or 'python').lower()
    title = (question_title or '').lower()

    if lang in ('python', 'python3', 'py'):
        # Check if candidate code already reads input from scratch
        has_input = any(kw in source_code for kw in ('input(', 'sys.stdin', 'raw_input('))
        if has_input:
            return source_code

        if any(k in title for k in ('sum of two numbers', 'represented as strings', 'add strings', 'sum strings', 'large numbers', 'two sum')):
            harness = """
if __name__ == '__main__':
    import sys
    raw = sys.stdin.read().strip()
    if raw:
        lines = [l.strip().strip('"').strip("'") for l in raw.splitlines() if l.strip()]
        if len(lines) >= 2:
            a, b = lines[0], lines[1]
            res = None
            if 'Solution' in globals():
                sol = Solution()
                for fn in ('addStrings', 'add_strings', 'sumStrings', 'sum_strings', 'sumOfTwoNumbers', 'sum_of_two_numbers', 'solve', 'solution', 'twoSum', 'two_sum'):
                    if hasattr(sol, fn):
                        res = getattr(sol, fn)(a, b)
                        break
            if res is None:
                for fn in ('addStrings', 'add_strings', 'sumStrings', 'sum_strings', 'sumOfTwoNumbers', 'sum_of_two_numbers', 'solve', 'solution', 'twoSum', 'two_sum'):
                    if fn in globals():
                        res = globals()[fn](a, b)
                        break
            if res is not None:
                if isinstance(res, (list, tuple)):
                    print(" ".join(map(str, res)))
                else:
                    print(str(res).strip().strip('"').strip("'"))
"""
            return source_code + "\n" + harness

        elif any(k in title for k in ('sum of digits', 'divide by 2', 'digits', 'longest substring')):
            harness = """
if __name__ == '__main__':
    import sys
    raw = sys.stdin.read().strip()
    if raw:
        lines = [l.strip() for l in raw.splitlines() if l.strip()]
        if lines:
            s_val = lines[0]
            n_val = int(s_val) if s_val.isdigit() else s_val
            res = None
            if 'Solution' in globals():
                sol = Solution()
                for fn in ('sumDigitsAndDivideByTwo', 'sum_digits_and_divide_by_two', 'sumOfDigits', 'sum_of_digits', 'sumDigits', 'sum_digits', 'digitSum', 'digit_sum', 'lengthOfLongestSubstring', 'length_of_longest_substring', 'solve', 'solution'):
                    if hasattr(sol, fn):
                        try:
                            res = getattr(sol, fn)(n_val)
                        except Exception:
                            res = getattr(sol, fn)(s_val)
                        break
            if res is None:
                for fn in ('sumDigitsAndDivideByTwo', 'sum_digits_and_divide_by_two', 'sumOfDigits', 'sum_of_digits', 'sumDigits', 'sum_digits', 'digitSum', 'digit_sum', 'lengthOfLongestSubstring', 'length_of_longest_substring', 'solve', 'solution'):
                    if fn in globals():
                        try:
                            res = globals()[fn](n_val)
                        except Exception:
                            res = globals()[fn](s_val)
                        break
            if res is not None:
                print(str(res).strip())
"""
            return source_code + "\n" + harness

    elif lang in ('javascript', 'js'):
        has_input = 'readline' in source_code or 'readFileSync' in source_code or 'fs.' in source_code or 'process.stdin' in source_code
        if has_input:
            return source_code

        if any(k in title for k in ('sum of two numbers', 'represented as strings', 'add strings', 'sum strings', 'large numbers', 'two sum')):
            harness = """
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const lines = input.split(/\\r?\\n/).map(l => l.trim().replace(/^["']|["']$/g, '')).filter(l => l.length > 0);
    if (lines.length >= 2) {
        const a = lines[0], b = lines[1];
        let res = null;
        const fns = ['addStrings', 'add_strings', 'sumStrings', 'sum_strings', 'sumOfTwoNumbers', 'sum_of_two_numbers', 'solve', 'solution', 'twoSum', 'two_sum'];
        for (const fn of fns) {
            if (typeof globalThis[fn] === 'function') { res = globalThis[fn](a, b); break; }
        }
        if (res == null && typeof Solution === 'function') {
            const sol = new Solution();
            for (const fn of fns) {
                if (typeof sol[fn] === 'function') { res = sol[fn](a, b); break; }
            }
        }
        if (res != null) {
            if (Array.isArray(res)) console.log(res.join(' '));
            else console.log(String(res).trim().replace(/^["']|["']$/g, ''));
        }
    }
}
"""
            return source_code + "\n" + harness

        elif any(k in title for k in ('sum of digits', 'divide by 2', 'digits', 'longest substring')):
            harness = """
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    const s_val = input.split(/\\r?\\n/)[0].trim();
    const n_val = Number(s_val);
    let res = null;
    const fns = ['sumDigitsAndDivideByTwo', 'sum_digits_and_divide_by_two', 'sumOfDigits', 'sum_of_digits', 'sumDigits', 'sum_digits', 'digitSum', 'digit_sum', 'lengthOfLongestSubstring', 'length_of_longest_substring', 'solve', 'solution'];
    for (const fn of fns) {
        if (typeof globalThis[fn] === 'function') {
            try { res = globalThis[fn](n_val); } catch(e) { res = globalThis[fn](s_val); }
            break;
        }
    }
    if (res == null && typeof Solution === 'function') {
        const sol = new Solution();
        for (const fn of fns) {
            if (typeof sol[fn] === 'function') {
                try { res = sol[fn](n_val); } catch(e) { res = sol[fn](s_val); }
                break;
            }
        }
    }
    if (res != null) console.log(String(res).trim());
}
"""
            return source_code + "\n" + harness

    return source_code


def _prepare_java_code(source_code: str, question_title: str):
    """
    LeetCode-style smart wrapper for Java:
    - If user wrote their own main() entry point from scratch, run that directly.
    - If user wrote LeetCode function style (class Solution), inject driver class.
    """
    import re
    # Strip package declaration if candidate copied from package structure
    code = re.sub(r'^\s*package\s+[^;]+;', '// package stripped', source_code, flags=re.MULTILINE)

    # Prepend standard utility imports if not already imported
    imports = []
    if 'import java.util' not in code:
        imports.append('import java.util.*;')
    if 'import java.io' not in code:
        imports.append('import java.io.*;')
    if 'import java.math' not in code:
        imports.append('import java.math.*;')
    if imports:
        code = '\n'.join(imports) + '\n' + code

    has_main = bool(re.search(r'\bstatic\s+void\s+main\s*\(\s*String', code))
    pub_match = re.search(r'\bpublic\s+class\s+([A-Za-z0-9_]+)', code)
    classes = re.findall(r'\bclass\s+([A-Za-z0-9_]+)', code)

    title = (question_title or '').lower()

    if has_main:
        if pub_match:
            class_name = pub_match.group(1)
        elif classes:
            class_name = classes[0]
        else:
            class_name = "Solution"
        return code, f"{class_name}.java", class_name

    file_class = pub_match.group(1) if pub_match else (classes[0] if classes else "Solution")
    java_filename = f"{file_class}.java"

    if any(k in title for k in ('sum of two numbers', 'represented as strings', 'add strings', 'sum strings', 'large numbers', 'two sum')):
        driver = """
class LeetCodeDriver {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        if (!sc.hasNext()) return;
        String a = sc.next().replace("\"", "").replace("'", "");
        if (!sc.hasNext()) return;
        String b = sc.next().replace("\"", "").replace("'", "");
        try {
            Solution sol = new Solution();
            Object res = null;
            String[] fnNames = {"addStrings", "add_strings", "sumStrings", "sum_strings", "sumOfTwoNumbers", "sum_of_two_numbers", "twoSum", "two_sum", "solve"};
            for (String fn : fnNames) {
                try {
                    java.lang.reflect.Method m = sol.getClass().getMethod(fn, String.class, String.class);
                    res = m.invoke(sol, a, b);
                    break;
                } catch (Exception ignored) {}
            }
            if (res != null) {
                if (res instanceof int[]) {
                    int[] arr = (int[]) res;
                    System.out.println(arr[0] + " " + arr[1]);
                } else {
                    System.out.println(String.valueOf(res).replace("\"", "").replace("'", "").trim());
                }
            }
        } catch (Throwable t) {
            t.printStackTrace(System.err);
        }
    }
}
"""
        return code + "\n" + driver, java_filename, "LeetCodeDriver"

    elif any(k in title for k in ('sum of digits', 'divide by 2', 'digits', 'longest substring')):
        driver = """
class LeetCodeDriver {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        if (!sc.hasNext()) return;
        String s = sc.next();
        try {
            Solution sol = new Solution();
            Object res = null;
            String[] fnNames = {"sumDigitsAndDivideByTwo", "sum_digits_and_divide_by_two", "sumOfDigits", "sum_of_digits", "sumDigits", "sum_digits", "digitSum", "digit_sum", "lengthOfLongestSubstring", "length_of_longest_substring", "solve"};
            for (String fn : fnNames) {
                try {
                    java.lang.reflect.Method m = sol.getClass().getMethod(fn, String.class);
                    res = m.invoke(sol, s);
                    break;
                } catch (NoSuchMethodException e) {
                    try {
                        long n = Long.parseLong(s);
                        try {
                            java.lang.reflect.Method m2 = sol.getClass().getMethod(fn, long.class);
                            res = m2.invoke(sol, n);
                            break;
                        } catch (NoSuchMethodException e2) {
                            java.lang.reflect.Method m3 = sol.getClass().getMethod(fn, int.class);
                            res = m3.invoke(sol, (int) n);
                            break;
                        }
                    } catch (Exception ignored) {}
                } catch (Exception ignored) {}
            }
            if (res != null) {
                System.out.println(String.valueOf(res).trim());
            }
        } catch (Throwable t) {
            t.printStackTrace(System.err);
        }
    }
}
"""
        return code + "\n" + driver, java_filename, "LeetCodeDriver"

    return code, java_filename, file_class


def run_code_locally(source_code: str, input_data: str, timeout_seconds: int = 5,
                     language: str = 'python', question_title: str = '') -> dict:
    """
    Run code locally using java, node, or python subprocess.
    """
    lang = (language or 'python').lower()

    if lang in ('java',):
        final_code, java_filename, main_class = _prepare_java_code(source_code, question_title)
        with tempfile.TemporaryDirectory() as tmpdir:
            java_path = os.path.join(tmpdir, java_filename)
            with open(java_path, 'w', encoding='utf-8') as f:
                f.write(final_code)

            comp_start = time.time()
            try:
                comp = subprocess.run(
                    ['javac', java_path],
                    capture_output=True,
                    text=True,
                    timeout=max(timeout_seconds, 8),
                    encoding='utf-8',
                    errors='replace'
                )
            except subprocess.TimeoutExpired:
                return {
                    'stdout': '',
                    'stderr': 'Java compilation timed out',
                    'exit_code': -1,
                    'execution_time_ms': timeout_seconds * 1000,
                    'timed_out': True,
                    'error': 'Compilation Time Limit Exceeded',
                }
            except Exception as e:
                return {
                    'stdout': '',
                    'stderr': str(e),
                    'exit_code': -1,
                    'execution_time_ms': 0,
                    'timed_out': False,
                    'error': str(e),
                }

            if comp.returncode != 0:
                return {
                    'stdout': '',
                    'stderr': comp.stderr[:2048] if comp.stderr else 'Compilation Error',
                    'exit_code': comp.returncode,
                    'execution_time_ms': int((time.time() - comp_start) * 1000),
                    'timed_out': False,
                    'error': 'Compilation Error',
                }

            start = time.time()
            try:
                proc = subprocess.run(
                    ['java', '-cp', tmpdir, main_class],
                    input=input_data,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    encoding='utf-8',
                    errors='replace'
                )
                elapsed_ms = int((time.time() - start) * 1000)
                return {
                    'stdout': proc.stdout,
                    'stderr': proc.stderr[:2048] if proc.stderr else '',
                    'exit_code': proc.returncode,
                    'execution_time_ms': elapsed_ms,
                    'timed_out': False,
                    'error': None if proc.returncode == 0 else (proc.stderr[:512] or 'Runtime Error'),
                }
            except subprocess.TimeoutExpired:
                elapsed_ms = int((time.time() - start) * 1000)
                return {
                    'stdout': '',
                    'stderr': '',
                    'exit_code': -1,
                    'execution_time_ms': elapsed_ms,
                    'timed_out': True,
                    'error': 'Time Limit Exceeded',
                }
            except Exception as e:
                return {
                    'stdout': '',
                    'stderr': str(e),
                    'exit_code': -1,
                    'execution_time_ms': 0,
                    'timed_out': False,
                    'error': str(e),
                }

    elif lang in ('c', 'cpp', 'c++'):
        return {
            'stdout': '',
            'stderr': 'C/C++ compiler is not configured on this host machine. Please select Java, Python 3, or JavaScript in the language dropdown.',
            'exit_code': -1,
            'execution_time_ms': 0,
            'timed_out': False,
            'error': 'C/C++ Compiler Not Available',
        }

    file_ext = '.js' if lang in ('javascript', 'js') else '.py'
    runner_cmd = ['node'] if lang in ('javascript', 'js') else [sys.executable]

    with tempfile.TemporaryDirectory() as tmpdir:
        code_path = os.path.join(tmpdir, f'candidate{file_ext}')
        with open(code_path, 'w', encoding='utf-8') as f:
            f.write(source_code)

        start = time.time()
        try:
            proc = subprocess.run(
                runner_cmd + [code_path],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                encoding='utf-8',
                errors='replace'
            )
            elapsed_ms = int((time.time() - start) * 1000)
            return {
                'stdout': proc.stdout,
                'stderr': proc.stderr[:2048] if proc.stderr else '',
                'exit_code': proc.returncode,
                'execution_time_ms': elapsed_ms,
                'timed_out': False,
                'error': None,
            }
        except subprocess.TimeoutExpired:
            elapsed_ms = int((time.time() - start) * 1000)
            return {
                'stdout': '',
                'stderr': '',
                'exit_code': -1,
                'execution_time_ms': elapsed_ms,
                'timed_out': True,
                'error': 'Time Limit Exceeded',
            }
        except Exception as e:
            return {
                'stdout': '',
                'stderr': str(e),
                'exit_code': -1,
                'execution_time_ms': 0,
                'timed_out': False,
                'error': str(e),
            }


def execute_test_case(source_code: str, test_case, timeout_seconds: int = 5,
                      use_docker: bool = True, language: str = 'python',
                      question_title: str = '') -> dict:
    """
    Execute source code against a single test case.
    Returns a result dict with status: PASS / FAIL / TLE / ERROR
    """
    final_code = prepare_source_code(source_code, question_title, language)

    if use_docker and _is_docker_available() and language in ('python', 'python3', 'py'):
        result = run_code_in_docker(final_code, test_case.input_data, timeout_seconds)
    else:
        result = run_code_locally(final_code, test_case.input_data, timeout_seconds, language=language, question_title=question_title)

    if result['timed_out']:
        return {
            'status': 'TLE',
            'actual_output': '',
            'execution_time_ms': result['execution_time_ms'],
            'error_message': 'Time Limit Exceeded',
        }

    if result['error'] and not result['stdout']:
        return {
            'status': 'ERROR',
            'actual_output': result['stderr'],
            'execution_time_ms': result['execution_time_ms'],
            'error_message': result['error'] or result['stderr'][:512],
        }

    if result['exit_code'] != 0 and not result['stdout']:
        return {
            'status': 'ERROR',
            'actual_output': result['stderr'],
            'execution_time_ms': result['execution_time_ms'],
            'error_message': result['stderr'][:512] if result['stderr'] else 'Runtime Error',
        }

    actual = result['stdout']
    passed = check_output(test_case.expected_output, actual)

    return {
        'status': 'PASS' if passed else 'FAIL',
        'actual_output': actual,
        'execution_time_ms': result['execution_time_ms'],
        'error_message': result['stderr'][:512] if result['stderr'] else None,
    }
