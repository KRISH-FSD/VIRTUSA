import sqlite3
import time


def execute_candidate_sql(schema_ddl: str, seed_sql: str, user_query: str) -> dict:
    """
    Executes a candidate's SQL query in a clean in-memory SQLite database.
    Returns:
      {
        'success': bool,
        'columns': list[str],
        'rows': list[list],
        'row_count': int,
        'error': str or None,
        'execution_time_ms': int
      }
    """
    if not user_query or not user_query.strip():
        return {
            'success': False,
            'columns': [],
            'rows': [],
            'row_count': 0,
            'error': 'Query is empty.',
            'execution_time_ms': 0
        }

    start = time.time()
    conn = sqlite3.connect(':memory:')
    cursor = conn.cursor()

    try:
        # Execute schema DDL and seed data
        cursor.executescript(schema_ddl)
        cursor.executescript(seed_sql)

        # Execute candidate query
        cursor.execute(user_query)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        elapsed_ms = int((time.time() - start) * 1000)

        # Convert tuples to serializable lists
        safe_rows = [list(r) for r in rows[:100]]  # limit preview to 100 rows

        return {
            'success': True,
            'columns': columns,
            'rows': safe_rows,
            'row_count': len(rows),
            'error': None,
            'execution_time_ms': elapsed_ms
        }
    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            'success': False,
            'columns': [],
            'rows': [],
            'row_count': 0,
            'error': str(e),
            'execution_time_ms': elapsed_ms
        }
    finally:
        conn.close()


def evaluate_sql_query(schema_ddl: str, seed_sql: str, expected_query: str, candidate_query: str) -> dict:
    """
    Evaluates candidate query against reference query.
    Compares columns (case-insensitive) and resulting rows.
    """
    user_res = execute_candidate_sql(schema_ddl, seed_sql, candidate_query)
    if not user_res['success']:
        return {
            'is_correct': False,
            'error': user_res['error'],
            'user_columns': [],
            'user_rows': [],
            'expected_columns': [],
            'expected_rows': [],
        }

    exp_res = execute_candidate_sql(schema_ddl, seed_sql, expected_query)
    if not exp_res['success']:
        return {
            'is_correct': False,
            'error': f"Reference query error: {exp_res['error']}",
            'user_columns': user_res['columns'],
            'user_rows': user_res['rows'],
            'expected_columns': [],
            'expected_rows': [],
        }

    # Normalize rows: convert floats/ints/strings consistently
    def norm_cell(val):
        if val is None:
            return 'NULL'
        if isinstance(val, float):
            return round(val, 4)
        return str(val).strip()

    user_rows_norm = [[norm_cell(c) for c in r] for r in user_res['rows']]
    exp_rows_norm = [[norm_cell(c) for c in r] for r in exp_res['rows']]

    # Compare columns (length and normalized names)
    user_cols_norm = [c.lower() for c in user_res['columns']]
    exp_cols_norm = [c.lower() for c in exp_res['columns']]

    # Exact match check
    cols_match = (len(user_cols_norm) == len(exp_cols_norm))
    rows_match = (user_rows_norm == exp_rows_norm)

    is_correct = cols_match and rows_match

    return {
        'is_correct': is_correct,
        'error': None,
        'user_columns': user_res['columns'],
        'user_rows': user_res['rows'],
        'expected_columns': exp_res['columns'],
        'expected_rows': exp_res['rows'],
    }
