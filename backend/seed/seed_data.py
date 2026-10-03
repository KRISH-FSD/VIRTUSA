import json
from extensions import db
from models.mcq import MCQQuestion
from models.excel import ExcelQuestion
from models.sql import SQLQuestion
from models.coding import CodingQuestion, TestCase


# ============================================================================
# SECTION 1: PROGRAMMING LANGUAGE MCQ (30 QUESTIONS)
# ============================================================================
MCQ_DATA = [
    # ── Questions 1–15: Core Programming Language Theory & Concepts ──
    {
        "question": "Which of the following data structures in Python is immutable?",
        "code_snippet": None,
        "option_a": "List",
        "option_b": "Dictionary",
        "option_c": "Tuple",
        "option_d": "Set",
        "correct_answer": "C",
        "marks": 1,
    },
    {
        "question": "In C programming, where is dynamically allocated memory (via malloc/calloc) stored?",
        "code_snippet": None,
        "option_a": "Stack Segment",
        "option_b": "Heap Segment",
        "option_c": "Code / Text Segment",
        "option_d": "Data Segment",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What is the order of scope resolution for variable names in Python (LEGB rule)?",
        "code_snippet": None,
        "option_a": "Local -> Enclosing -> Global -> Built-in",
        "option_b": "Local -> Global -> Enclosing -> Built-in",
        "option_c": "Global -> Local -> Enclosing -> Built-in",
        "option_d": "Built-in -> Global -> Enclosing -> Local",
        "correct_answer": "A",
        "marks": 1,
    },
    {
        "question": "In C, if 'arr' is an array of integers, which of the following expressions is equivalent to arr[i]?",
        "code_snippet": None,
        "option_a": "&arr + i",
        "option_b": "*(arr + i)",
        "option_c": "*arr + i",
        "option_d": "arr + *i",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "Which Python operator is used to check whether two variables reference the exact same object in memory?",
        "code_snippet": None,
        "option_a": "==",
        "option_b": "equals()",
        "option_c": "is",
        "option_d": "same",
        "correct_answer": "C",
        "marks": 1,
    },
    {
        "question": "What is the primary difference between a macro (#define) and a function in C?",
        "code_snippet": None,
        "option_a": "Macros undergo pre-processor text replacement without type checking",
        "option_b": "Macros are evaluated at runtime by the CPU",
        "option_c": "Functions cannot return pointers",
        "option_d": "Macros occupy stack memory during execution",
        "correct_answer": "A",
        "marks": 1,
    },
    {
        "question": "What will happen if a Python function does not have an explicit return statement?",
        "code_snippet": None,
        "option_a": "It raises a syntax error",
        "option_b": "It returns 0",
        "option_c": "It returns None",
        "option_d": "It returns an empty string",
        "correct_answer": "C",
        "marks": 1,
    },
    {
        "question": "What is the return type of the 'sizeof' operator in standard C?",
        "code_snippet": None,
        "option_a": "int",
        "option_b": "unsigned int",
        "option_c": "size_t",
        "option_d": "long",
        "correct_answer": "C",
        "marks": 1,
    },
    {
        "question": "In Python, what is the purpose of *args in a function definition?",
        "code_snippet": None,
        "option_a": "To allow passing a variable number of positional arguments as a tuple",
        "option_b": "To allow passing keyword arguments as a dictionary",
        "option_c": "To define pointer variables",
        "option_d": "To force all arguments to be integers",
        "correct_answer": "A",
        "marks": 1,
    },
    {
        "question": "In C, what is the scope and lifetime of a local variable declared with the 'static' keyword?",
        "code_snippet": None,
        "option_a": "Global scope and lifetime limited to function execution",
        "option_b": "Block scope and lifetime spanning the entire program run",
        "option_c": "File scope and destroyed when function returns",
        "option_d": "Universal scope across multiple source files",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "Which magic method is called when an object is instantiated in Python?",
        "code_snippet": None,
        "option_a": "__create__",
        "option_b": "__construct__",
        "option_c": "__init__",
        "option_d": "__start__",
        "correct_answer": "C",
        "marks": 1,
    },
    {
        "question": "In C, what is a 'dangling pointer'?",
        "code_snippet": None,
        "option_a": "A pointer that has not been initialized to any address",
        "option_b": "A pointer pointing to a memory location that has been deallocated or freed",
        "option_c": "A pointer that points to NULL",
        "option_d": "A pointer stored in read-only code segment",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "In Python's try-except block, which clause is executed regardless of whether an exception occurred or not?",
        "code_snippet": None,
        "option_a": "else",
        "option_b": "finally",
        "option_c": "catch",
        "option_d": "always",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What is the effect of declaring 'const int *ptr' in C?",
        "code_snippet": None,
        "option_a": "The pointer address cannot be modified",
        "option_b": "The value of the integer being pointed to cannot be modified via ptr",
        "option_c": "Both the pointer address and value are immutable",
        "option_d": "The pointer is placed in CPU register cache",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "Why are generator expressions in Python often preferred over list comprehensions for massive datasets?",
        "code_snippet": None,
        "option_a": "They execute in parallel across multiple CPU cores",
        "option_b": "They produce values on-demand using lazy evaluation without storing the entire sequence in memory",
        "option_c": "They are written in compiled C code",
        "option_d": "They convert integers to float automatically",
        "correct_answer": "B",
        "marks": 1,
    },

    # ── Questions 16–30: Code-Based Questions (Python & C) ──
    {
        "question": "What will be the output of the following Python code?",
        "code_snippet": "s = 'VirtusaExam'\nprint(s[2:8:2])",
        "option_a": "rua",
        "option_b": "rus",
        "option_c": "rtu",
        "option_d": "rts",
        "correct_answer": "A",
        "marks": 1,
    },
    {
        "question": "What is the output of the following C program?",
        "code_snippet": "#include <stdio.h>\nint main() {\n    int arr[] = {10, 20, 30, 40};\n    int *p = arr;\n    printf(\"%d\", *(p + 2));\n    return 0;\n}",
        "option_a": "10",
        "option_b": "20",
        "option_c": "30",
        "option_d": "40",
        "correct_answer": "C",
        "marks": 1,
    },
    {
        "question": "What happens when executing the following Python code?",
        "code_snippet": "text = 'hello'\ntext[0] = 'H'\nprint(text)",
        "option_a": "Prints 'Hello'",
        "option_b": "Raises TypeError: 'str' object does not support item assignment",
        "option_c": "Prints 'hello'",
        "option_d": "Raises IndexError: string index out of range",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What is the output of the following Python code with default mutable arguments?",
        "code_snippet": "def append_val(x, lst=[]):\n    lst.append(x)\n    return lst\n\nappend_val(1)\nprint(append_val(2))",
        "option_a": "[2]",
        "option_b": "[1, 2]",
        "option_c": "[[1], [2]]",
        "option_d": "Error",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What is the output of the following C code snippet?",
        "code_snippet": "#include <stdio.h>\nint main() {\n    int a = 5, b = 2;\n    printf(\"%d\", a / b);\n    return 0;\n}",
        "option_a": "2.5",
        "option_b": "2",
        "option_c": "3",
        "option_d": "Error",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What is the output of the following Python recursion code?",
        "code_snippet": "def calc(n):\n    if n <= 1:\n        return 1\n    return n * calc(n - 2)\n\nprint(calc(5))",
        "option_a": "120",
        "option_b": "15",
        "option_c": "24",
        "option_d": "25",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "Identify the issue in the following C function:",
        "code_snippet": "int* get_value() {\n    int x = 42;\n    return &x;\n}",
        "option_a": "Syntax error in pointer declaration",
        "option_b": "Returns address of a local variable which is destroyed after function exits",
        "option_c": "Cannot return int pointer in C",
        "option_d": "Missing malloc import",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What will be the output of the following Python dictionary comprehension?",
        "code_snippet": "data = {x: x**2 for x in (1, 2, 3) if x % 2 != 0}\nprint(data)",
        "option_a": "{1: 1, 3: 9}",
        "option_b": "{2: 4}",
        "option_c": "[1, 9]",
        "option_d": "{1: 1, 2: 4, 3: 9}",
        "correct_answer": "A",
        "marks": 1,
    },
    {
        "question": "What is the output of the following Python code involving try-finally?",
        "code_snippet": "def check():\n    try:\n        return 'TRY'\n    finally:\n        return 'FINALLY'\n\nprint(check())",
        "option_a": "TRY",
        "option_b": "FINALLY",
        "option_c": "TRY FINALLY",
        "option_d": "SyntaxError",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What will be the output of the following C code on a standard 32/64-bit architecture?",
        "code_snippet": "#include <stdio.h>\nint main() {\n    int arr[5] = {1, 2, 3, 4, 5};\n    int len = sizeof(arr) / sizeof(arr[0]);\n    printf(\"%d\", len);\n    return 0;\n}",
        "option_a": "5",
        "option_b": "20",
        "option_c": "4",
        "option_d": "8",
        "correct_answer": "A",
        "marks": 1,
    },
    {
        "question": "What will be the output of the following Python lambda and map statement?",
        "code_snippet": "nums = [1, 2, 3, 4]\nres = list(map(lambda x: x * 2, filter(lambda x: x % 2 == 0, nums)))\nprint(res)",
        "option_a": "[2, 4, 6, 8]",
        "option_b": "[4, 8]",
        "option_c": "[2, 6]",
        "option_d": "[8, 16]",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What is the output of the following C switch-case statement without break statements?",
        "code_snippet": "#include <stdio.h>\nint main() {\n    int k = 2;\n    switch(k) {\n        case 1: printf(\"A\");\n        case 2: printf(\"B\");\n        case 3: printf(\"C\");\n        default: printf(\"D\");\n    }\n    return 0;\n}",
        "option_a": "B",
        "option_b": "BCD",
        "option_c": "ABCD",
        "option_d": "BD",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What will be the output of extended iterable unpacking in Python?",
        "code_snippet": "first, *middle, last = [10, 20, 30, 40, 50]\nprint(middle)",
        "option_a": "[20, 30, 40]",
        "option_b": "(20, 30, 40)",
        "option_c": "30",
        "option_d": "[10, 50]",
        "correct_answer": "A",
        "marks": 1,
    },
    {
        "question": "What is the printed result of this C code with a null character in the middle?",
        "code_snippet": "#include <stdio.h>\nint main() {\n    char str[] = \"Virt\\0usa\";\n    printf(\"%s\", str);\n    return 0;\n}",
        "option_a": "Virtusa",
        "option_b": "Virt",
        "option_c": "Virt\\0usa",
        "option_d": "usa",
        "correct_answer": "B",
        "marks": 1,
    },
    {
        "question": "What will be printed by the following Python generator execution?",
        "code_snippet": "def count_up():\n    yield 1\n    yield 2\n    yield 3\n\ngen = count_up()\nnext(gen)\nprint(next(gen))",
        "option_a": "1",
        "option_b": "2",
        "option_c": "3",
        "option_d": "[1, 2]",
        "correct_answer": "B",
        "marks": 1,
    },
]


# ============================================================================
# SECTION 2: EXCEL & DATA ANALYSIS (10 QUESTIONS)
# ============================================================================
EXCEL_DATA = [
    {
        "title": "Q1. Average Salary",
        "scenario_description": "Find the average salary of all employees.",
        "dataset_preview": "| A (Emp ID) | B (Name) | C (Department) | D (Salary) |\n|---|---|---|---|\n| E101 | Sarah Connor | Engineering | 95,000 |\n| E102 | John Miller | Finance | 82,000 |\n| E103 | Alex Vance | Marketing | 78,000 |\n| E104 | Priya Sharma | HR | 70,000 |\n| E105 | Michael Chen | Finance | 85,000 |",
        "question_prompt": "Write a formula to find the average salary of all employees (Range D2:D6).",
        "placeholder": "",
        "expected_formula": "=AVERAGE(D2:D6)",
        "accepted_patterns": json.dumps([
            "=AVERAGE(D2:D6)",
            "=AVERAGE(D:D)"
        ]),
        "marks": 2,
    },
    {
        "title": "Q2. Engineering Department Count",
        "scenario_description": "Count how many employees work in the Engineering department.",
        "dataset_preview": "| A (Emp ID) | B (Name) | C (Department) |\n|---|---|---|\n| E101 | Sarah Connor | Engineering |\n| E102 | John Miller | Finance |\n| E103 | Alex Vance | Engineering |\n| E104 | Priya Sharma | Marketing |\n| E105 | Michael Chen | Engineering |\n| E106 | Emma Stone | Finance |",
        "question_prompt": "Write a formula to count how many employees work in the \"Engineering\" department (Range C2:C7).",
        "placeholder": "",
        "expected_formula": '=COUNTIF(C2:C7,"Engineering")',
        "accepted_patterns": json.dumps([
            '=COUNTIF(C2:C7, "Engineering")',
            '=COUNTIF(C:C, "Engineering")'
        ]),
        "marks": 2,
    },
    {
        "title": "Q3. Finance Total Salary",
        "scenario_description": "Find the total salary paid to the Finance department.",
        "dataset_preview": "| A (Emp ID) | B (Name) | C (Department) | D (Salary) |\n|---|---|---|---|\n| E101 | Sarah Connor | Engineering | 95,000 |\n| E102 | John Miller | Finance | 82,000 |\n| E103 | Alex Vance | Marketing | 78,000 |\n| E104 | Priya Sharma | Finance | 70,000 |\n| E105 | Michael Chen | Engineering | 85,000 |\n| E106 | Emma Stone | Finance | 66,000 |",
        "question_prompt": "Write a formula to find the total salary paid to the \"Finance\" department.",
        "placeholder": "",
        "expected_formula": '=SUMIF(C2:C7,"Finance",D2:D7)',
        "accepted_patterns": json.dumps([
            '=SUMIF(C2:C7, "Finance", D2:D7)',
            '=SUMIF(C:C, "Finance", D:D)',
            '=SUMIFS(D2:D7, C2:C7, "Finance")',
            '=SUMIFS(D:D, C:C, "Finance")'
        ]),
        "marks": 2,
    },
    {
        "title": "Q4. Salary Grade",
        "scenario_description": "Show \"High\" if salary is above 80,000, otherwise \"Standard\".",
        "dataset_preview": "| A (Name) | B (Salary) | C (IF result) | D (IFS grade) |\n|---|---|---|---|\n| Sarah Connor | 95,000 | High | Grade A |\n| John Miller | 82,000 | High | Grade B |\n| Alex Vance | 78,000 | Standard | Grade C |\n| Priya Sharma | 70,000 | Standard | Grade C |\n| Michael Chen | 80,000 | Standard | Grade B |",
        "question_prompt": "Write an IF formula for row 2 to show \"High\" if the salary in B2 is above 80000, otherwise \"Standard\".",
        "placeholder": "",
        "expected_formula": '=IF(B2>80000,"High","Standard")',
        "accepted_patterns": json.dumps([
            '=IF(B2>80000, "High", "Standard")',
            '=IF(B2>80000,"High","Standard")'
        ]),
        "marks": 2,
    },
    {
        "title": "Q5. Rank Salary",
        "scenario_description": "Rank each employee by salary (highest = rank 1).",
        "dataset_preview": "| A (Name) | B (Salary) | C (Rank) |\n|---|---|---|\n| Sarah Connor | 95,000 | 1 |\n| John Miller | 82,000 | 2 |\n| Alex Vance | 78,000 | 4 |\n| Priya Sharma | 82,000 | 2 |\n| Michael Chen | 70,000 | 5 |",
        "question_prompt": "Write a formula to rank the salary in B2 against the range B2:B6 in descending order.",
        "placeholder": "",
        "expected_formula": "=RANK(B2,$B$2:$B$6,0)",
        "accepted_patterns": json.dumps([
            "=RANK(B2, $B$2:$B$6, 0)",
            "=RANK.EQ(B2, $B$2:$B$6, 0)",
            "=RANK(B2, B$2:B$6, 0)",
            "=RANK(B2, B:B, 0)"
        ]),
        "marks": 2,
    },
    {
        "title": "Q6. High Earner Engineering Count",
        "scenario_description": "Count Engineering employees earning more than 90,000.",
        "dataset_preview": "| A (Emp ID) | B (Name) | C (Department) | D (Salary) |\n|---|---|---|---|\n| E101 | Sarah Connor | Engineering | 95,000 |\n| E102 | John Miller | Finance | 82,000 |\n| E103 | Ravi Kumar | Engineering | 88,000 |\n| E104 | Priya Sharma | Engineering | 91,000 |\n| E105 | Alex Vance | Marketing | 78,000 |\n| E106 | Emma Stone | Engineering | 105,000 |\n| E107 | Michael Chen | Finance | 92,000 |",
        "question_prompt": "Write a formula to count Engineering employees earning more than 90000.",
        "placeholder": "",
        "expected_formula": '=COUNTIFS(C2:C8,"Engineering",D2:D8,">90000")',
        "accepted_patterns": json.dumps([
            '=COUNTIFS(C2:C8, "Engineering", D2:D8, ">90000")',
            '=COUNTIFS(C:C, "Engineering", D:D, ">90000")',
            '=COUNTIFS(D2:D8, ">90000", C2:C8, "Engineering")'
        ]),
        "marks": 2,
    },
    {
        "title": "Q7. Left Lookup",
        "scenario_description": "Find the Employee ID of \"Alex Vance\" (a lookup to the left).",
        "dataset_preview": "| A (Emp ID) | B (Name) | C (Department) |\n|---|---|---|\n| E101 | Sarah Connor | Engineering |\n| E102 | John Miller | Finance |\n| E103 | Alex Vance | Marketing |\n| E104 | Priya Sharma | HR |",
        "question_prompt": "Write an INDEX-MATCH formula to find the Employee ID (A2:A5) for \"Alex Vance\" (B2:B5).",
        "placeholder": "",
        "expected_formula": '=INDEX(A2:A5,MATCH("Alex Vance",B2:B5,0))',
        "accepted_patterns": json.dumps([
            '=INDEX(A2:A5, MATCH("Alex Vance", B2:B5, 0))',
            '=INDEX(A:A, MATCH("Alex Vance", B:B, 0))',
            '=XLOOKUP("Alex Vance", B2:B5, A2:A5)'
        ]),
        "marks": 2,
    },
    {
        "title": "Q8. First Name Extraction",
        "scenario_description": "Extract the first name from the Name column.",
        "dataset_preview": "| A (Full Name) | B (First Name) | C (Last Name) |\n|---|---|---|\n| Sarah Connor | Sarah | Connor |\n| John Miller | John | Miller |\n| Alex Vance | Alex | Vance |\n| Priya Sharma | Priya | Sharma |",
        "question_prompt": "Write a formula to extract the first name from the full name in A2 (assuming space as separator).",
        "placeholder": "",
        "expected_formula": '=LEFT(A2,FIND(" ",A2)-1)',
        "accepted_patterns": json.dumps([
            '=LEFT(A2, FIND(" ", A2) - 1)',
            '=LEFT(A2, SEARCH(" ", A2) - 1)',
            '=TEXTBEFORE(A2, " ")'
        ]),
        "marks": 2,
    },
    {
        "title": "Q9. Flag Duplicates",
        "scenario_description": "Flag duplicate Employee IDs.",
        "dataset_preview": "| A (Emp ID) | B (Name) | C (Check) |\n|---|---|---|\n| E101 | Sarah Connor | Unique |\n| E102 | John Miller | Duplicate |\n| E103 | Alex Vance | Unique |\n| E102 | John Miller | Duplicate |\n| E104 | Priya Sharma | Unique |",
        "question_prompt": "Write an IF formula for row 2 to output \"Duplicate\" if A2 appears more than once in A2:A6, otherwise \"Unique\".",
        "placeholder": "",
        "expected_formula": '=IF(COUNTIF($A$2:$A$6,A2)>1,"Duplicate","Unique")',
        "accepted_patterns": json.dumps([
            '=IF(COUNTIF($A$2:$A$6, A2)>1, "Duplicate", "Unique")',
            '=IF(COUNTIF(A:A, A2)>1, "Duplicate", "Unique")',
            '=IF(COUNTIF($A$2:$A$6, A2)>1,"Duplicate","Unique")'
        ]),
        "marks": 2,
    },
    {
        "title": "Q10. PivotTable Summary",
        "scenario_description": "Summarize the average salary by department without writing formulas.",
        "dataset_preview": "| A (Emp ID) | B (Name) | C (Department) | D (Salary) |\n|---|---|---|---|\n| E101 | Sarah Connor | Engineering | 95,000 |\n| E102 | John Miller | Finance | 82,000 |\n| E103 | Alex Vance | Marketing | 78,000 |\n| E104 | Priya Sharma | Engineering | 85,000 |\n| E105 | Michael Chen | Finance | 90,000 |\n| E106 | Emma Stone | Marketing | 70,000 |\n| E107 | Ravi Kumar | Engineering | 80,000 |",
        "question_prompt": "Describe the basic tool or menu feature to summarize the average salary by department without writing formulas.",
        "placeholder": "",
        "expected_formula": "PivotTable",
        "accepted_patterns": json.dumps([
            "PivotTable",
            "Insert PivotTable",
            "Insert -> PivotTable",
            "use a PivotTable"
        ]),
        "marks": 2,
    }
]


# ============================================================================
# SECTION 3: SQL ASSESSMENT (10 QUESTIONS)
# ============================================================================
SQL_DATA = [
    {
        "title": "Q1. Filter & Sort High Earners",
        "description": "Find employees earning more than 80,000, highest salary first.\n\n💡 Tip: `ORDER BY` defaults to ascending, so use `DESC` for highest first. To get only the top 3, you would add `LIMIT 3` (MySQL/PostgreSQL) or use `SELECT TOP 3` (SQL Server).",
        "schema_ddl": "CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER);",
        "seed_sql": "INSERT INTO employees VALUES (1, 'Sarah Connor', 'Engineering', 95000), (2, 'John Miller', 'Finance', 82000), (3, 'Alex Vance', 'Marketing', 78000), (4, 'Priya Sharma', 'Engineering', 85000), (5, 'Michael Chen', 'Finance', 70000), (6, 'Emma Stone', 'Engineering', 90000);",
        "expected_query": "SELECT name, salary FROM employees WHERE salary > 80000 ORDER BY salary DESC;",
        "table_preview": """| emp_id | name | department | salary |
|---|---|---|---|
| 1 | Sarah Connor | Engineering | 95000 |
| 2 | John Miller | Finance | 82000 |
| 3 | Alex Vance | Marketing | 78000 |
| 4 | Priya Sharma | Engineering | 85000 |
| 5 | Michael Chen | Finance | 70000 |
| 6 | Emma Stone | Engineering | 90000 |""",
        "marks": 2,
    },
    {
        "title": "Q2. Department Headcount & Average Salary",
        "description": "Find the number of employees and the average salary in each department.\n\n⚠️ Every non-aggregated column in SELECT must also appear in GROUP BY.",
        "schema_ddl": "CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER);",
        "seed_sql": "INSERT INTO employees VALUES (1, 'Sarah Connor', 'Engineering', 95000), (2, 'John Miller', 'Finance', 82000), (3, 'Alex Vance', 'Marketing', 78000), (4, 'Priya Sharma', 'Engineering', 85000), (5, 'Michael Chen', 'Finance', 70000), (6, 'Emma Stone', 'Engineering', 90000);",
        "expected_query": "SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_salary FROM employees GROUP BY department;",
        "table_preview": """| emp_id | name | department | salary |
|---|---|---|---|
| 1 | Sarah Connor | Engineering | 95000 |
| 2 | John Miller | Finance | 82000 |
| 3 | Alex Vance | Marketing | 78000 |
| 4 | Priya Sharma | Engineering | 85000 |
| 5 | Michael Chen | Finance | 70000 |
| 6 | Emma Stone | Engineering | 90000 |""",
        "marks": 2,
    },
    {
        "title": "Q3. HAVING vs WHERE",
        "description": "What is the difference between WHERE and HAVING?\n\nWHERE filters rows before grouping.\nHAVING filters groups after aggregation.\n\nExecution order to remember:\nFROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT\nYou can't use an aggregate like AVG() in WHERE, because rows are filtered before groups exist.\n\nTask: Show only departments whose average salary is above 80,000.",
        "schema_ddl": "CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER);",
        "seed_sql": "INSERT INTO employees VALUES (1, 'Sarah Connor', 'Engineering', 95000), (2, 'John Miller', 'Finance', 82000), (3, 'Alex Vance', 'Marketing', 78000), (4, 'Priya Sharma', 'Engineering', 85000), (5, 'Michael Chen', 'Finance', 70000), (6, 'Emma Stone', 'Engineering', 90000);",
        "expected_query": "SELECT department, AVG(salary) AS avg_salary FROM employees GROUP BY department HAVING AVG(salary) > 80000;",
        "table_preview": """| emp_id | name | department | salary |
|---|---|---|---|
| 1 | Sarah Connor | Engineering | 95000 |
| 2 | John Miller | Finance | 82000 |
| 3 | Alex Vance | Marketing | 78000 |
| 4 | Priya Sharma | Engineering | 85000 |
| 5 | Michael Chen | Finance | 70000 |
| 6 | Emma Stone | Engineering | 90000 |""",
        "marks": 2,
    },
    {
        "title": "Q4. Handling NULL Values",
        "description": "How do you handle NULL values?\n\n❌ WHERE bonus = NULL returns 0 rows, because NULL is \"unknown\" and never equals anything, even itself. Always use IS NULL or IS NOT NULL.\n\nNULL and aggregates (a favorite follow-up):\n- COUNT(*) counts all rows\n- COUNT(bonus) ignores NULLs\n- AVG(bonus) skips NULLs\n\nTask: Find employees with no bonus.",
        "schema_ddl": "CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, name TEXT, bonus INTEGER);",
        "seed_sql": "INSERT INTO employees VALUES (1, 'Sarah Connor', 5000), (2, 'John Miller', NULL), (3, 'Alex Vance', 2000), (4, 'Priya Sharma', NULL);",
        "expected_query": "SELECT name FROM employees WHERE bonus IS NULL;",
        "table_preview": """| emp_id | name | bonus |
|---|---|---|
| 1 | Sarah Connor | 5000 |
| 2 | John Miller | NULL |
| 3 | Alex Vance | 2000 |
| 4 | Priya Sharma | NULL |""",
        "marks": 2,
    },
    {
        "title": "Q5. INNER JOIN",
        "description": "What is an INNER JOIN?\nINNER JOIN returns only matching rows from both tables. HR has no employees, so it's missing.\n\nJoin types:\n- INNER: only matches in both tables\n- LEFT: all left rows, plus matches (NULL if none)\n- RIGHT: all right rows, plus matches\n- FULL: all rows from both sides\n\nTask: Show each employee with their department name.",
        "schema_ddl": "CREATE TABLE departments (dept_id INTEGER PRIMARY KEY, dept_name TEXT); CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, name TEXT, dept_id INTEGER);",
        "seed_sql": "INSERT INTO departments VALUES (10, 'Engineering'), (20, 'Finance'), (30, 'Marketing'), (40, 'HR'); INSERT INTO employees VALUES (1, 'Sarah Connor', 10), (2, 'John Miller', 20), (3, 'Alex Vance', 30), (4, 'Priya Sharma', 10);",
        "expected_query": "SELECT e.name, d.dept_name FROM employees e INNER JOIN departments d ON e.dept_id = d.dept_id;",
        "table_preview": """employees:
| emp_id | name | dept_id |
|---|---|---|
| 1 | Sarah Connor | 10 |
| 2 | John Miller | 20 |
| 3 | Alex Vance | 30 |
| 4 | Priya Sharma | 10 |

departments:
| dept_id | dept_name |
|---|---|
| 10 | Engineering |
| 20 | Finance |
| 30 | Marketing |
| 40 | HR |""",
        "marks": 2,
    },
    {
        "title": "Q6. LEFT JOIN for Missing Data",
        "description": "Find customers who have never placed an order.\n\nStep 1: what the LEFT JOIN produces before the filter (matches or leaves NULL).\nStep 2: the WHERE ... IS NULL filter keeps only unmatched rows.\n\n⚠️ NOT IN (subquery) returns no rows at all if the subquery contains even one NULL.",
        "schema_ddl": "CREATE TABLE customers (cust_id INTEGER PRIMARY KEY, name TEXT); CREATE TABLE orders (order_id INTEGER PRIMARY KEY, cust_id INTEGER, amount REAL);",
        "seed_sql": "INSERT INTO customers VALUES (1, 'Ravi'), (2, 'Anita'), (3, 'Karthik'), (4, 'Meena'); INSERT INTO orders VALUES (101, 1, 500), (102, 2, 300), (103, 1, 200), (104, 3, 450);",
        "expected_query": "SELECT c.name FROM customers c LEFT JOIN orders o ON c.cust_id = o.cust_id WHERE o.order_id IS NULL;",
        "table_preview": """customers:
| cust_id | name |
|---|---|
| 1 | Ravi |
| 2 | Anita |
| 3 | Karthik |
| 4 | Meena |

orders:
| order_id | cust_id | amount |
|---|---|---|
| 101 | 1 | 500 |
| 102 | 2 | 300 |
| 103 | 1 | 200 |
| 104 | 3 | 450 |""",
        "marks": 2,
    },
    {
        "title": "Q7. Second Highest Salary",
        "description": "Find the second highest salary. (The most asked SQL question.)\n\nMethods:\n1. Subquery (works everywhere)\n2. DENSE_RANK (best for 'Nth highest')\n3. LIMIT with OFFSET\n\n⚠️ Interview trap: the top salary (95000) appears twice. Without DISTINCT, LIMIT 1 OFFSET 1 returns 95000, which is wrong.",
        "schema_ddl": "CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);",
        "seed_sql": "INSERT INTO employees VALUES (1, 'Sarah Connor', 95000), (2, 'Michael Chen', 95000), (3, 'Priya Sharma', 85000), (4, 'John Miller', 82000), (5, 'Alex Vance', 78000);",
        "expected_query": "SELECT MAX(salary) AS second_highest FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);",
        "table_preview": """| emp_id | name | salary |
|---|---|---|
| 1 | Sarah Connor | 95000 |
| 2 | Michael Chen | 95000 |
| 3 | Priya Sharma | 85000 |
| 4 | John Miller | 82000 |
| 5 | Alex Vance | 78000 |""",
        "marks": 2,
    },
    {
        "title": "Q8. Find Duplicates",
        "description": "Find and delete duplicate records.\n\nTask: Find emails that appear more than once and their counts (`cnt`).\n\n(Bonus: To delete duplicates, keeping the lowest id, use DELETE FROM users WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY email). MySQL gives error 1093 for this unless wrapped!)",
        "schema_ddl": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);",
        "seed_sql": "INSERT INTO users VALUES (1, 'Ravi', 'ravi@mail.com'), (2, 'Anita', 'anita@mail.com'), (3, 'Ravi K', 'ravi@mail.com'), (4, 'Meena', 'meena@mail.com'), (5, 'Anita S', 'anita@mail.com');",
        "expected_query": "SELECT email, COUNT(*) AS cnt FROM users GROUP BY email HAVING COUNT(*) > 1;",
        "table_preview": """| id | name | email |
|---|---|---|
| 1 | Ravi | ravi@mail.com |
| 2 | Anita | anita@mail.com |
| 3 | Ravi K | ravi@mail.com |
| 4 | Meena | meena@mail.com |
| 5 | Anita S | anita@mail.com |""",
        "marks": 2,
    },
    {
        "title": "Q9. Self Join",
        "description": "Show each employee with their manager's name (self join).\n\nA self join joins a table to itself, so you need different aliases (e and m).\nI used LEFT JOIN so Sarah (the top boss, with no manager) still appears. INNER JOIN would drop her.",
        "schema_ddl": "CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, name TEXT, manager_id INTEGER);",
        "seed_sql": "INSERT INTO employees VALUES (1, 'Sarah Connor', NULL), (2, 'John Miller', 1), (3, 'Alex Vance', 1), (4, 'Priya Sharma', 2);",
        "expected_query": "SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.emp_id;",
        "table_preview": """| emp_id | name | manager_id |
|---|---|---|
| 1 | Sarah Connor | NULL |
| 2 | John Miller | 1 |
| 3 | Alex Vance | 1 |
| 4 | Priya Sharma | 2 |""",
        "marks": 2,
    },
    {
        "title": "Q10. Window Functions",
        "description": "Find the highest-paid employee in each department. (Window functions)\n\nROW_NUMBER vs RANK vs DENSE_RANK (salaries 95000, 95000, 85000):\n- ROW_NUMBER never ties. (1, 2, 3)\n- RANK ties and skips the next number. (1, 1, 3)\n- DENSE_RANK ties and doesn't skip. (1, 1, 2)\n\nTask: Return name, department, and salary where rank is 1.",
        "schema_ddl": "CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER);",
        "seed_sql": "INSERT INTO employees VALUES (1, 'Sarah Connor', 'Engineering', 95000), (2, 'Priya Sharma', 'Engineering', 85000), (3, 'Michael Chen', 'Finance', 90000), (4, 'John Miller', 'Finance', 82000), (5, 'Alex Vance', 'Marketing', 78000), (6, 'Emma Stone', 'Marketing', 72000);",
        "expected_query": "SELECT name, department, salary FROM (SELECT name, department, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk FROM employees) t WHERE rnk = 1;",
        "table_preview": """| emp_id | name | department | salary |
|---|---|---|---|
| 1 | Sarah Connor | Engineering | 95000 |
| 2 | Priya Sharma | Engineering | 85000 |
| 3 | Michael Chen | Finance | 90000 |
| 4 | John Miller | Finance | 82000 |
| 5 | Alex Vance | Marketing | 78000 |
| 6 | Emma Stone | Marketing | 72000 |""",
        "marks": 2,
    }
]

CODING_QUESTIONS = [
    {
        "title": "Sum of Two Numbers Represented as Strings",
        "description": (
            "Given two numbers represented as strings, find their sum and return the result as a string.\n\n"
            "The numbers may be large, so you should treat them as strings rather than converting them directly to an integer."
        ),
        "input_format": (
            "- The first line contains a string A, representing the first number.\n"
            "- The second line contains a string B, representing the second number."
        ),
        "output_format": "- Print the sum of A and B as a string.",
        "constraints": (
            "2 ≤ length(A), length(B) ≤ 100000\n"
            "A and B contain only digits (0-9).\n"
            "A and B represent non-negative integers."
        ),
        "starter_code": "",
        "language": "python",
        "time_limit_ms": 2000,
        "memory_limit_mb": 256,
        "marks": 15,
        "test_cases": [
            {"input_data": "12345\n6789", "expected_output": "19134", "is_public": True, "weight": 2},
            {"input_data": "999\n1", "expected_output": "1000", "is_public": True, "weight": 2},
            {"input_data": "456\n77", "expected_output": "533", "is_public": True, "weight": 2},
            {"input_data": "1111111111\n2222222222", "expected_output": "3333333333", "is_public": True, "weight": 2},
            {"input_data": "9876543210\n1234567890", "expected_output": "11111111100", "is_public": True, "weight": 2},
            {"input_data": "999999999999\n1", "expected_output": "1000000000000", "is_public": False, "weight": 2},
            {"input_data": "582734918237491283\n481923749128374918", "expected_output": "1064658667365866201", "is_public": False, "weight": 3},
        ]
    },
    {
        "title": "Sum of Digits and Divide by 2",
        "description": (
            "Given a positive integer N, find the sum of all its digits. "
            "Then divide the resulting sum by 2 and return the answer."
        ),
        "input_format": "- The first line contains an integer N.",
        "output_format": "- Print the result obtained after dividing the sum of the digits by 2.",
        "constraints": (
            "2 ≤ N ≤ 10^9\n"
            "N is a positive integer.\n"
            "The sum of the digits of N will always be even."
        ),
        "starter_code": "",
        "language": "python",
        "time_limit_ms": 2000,
        "memory_limit_mb": 256,
        "marks": 25,
        "test_cases": [
            {"input_data": "1234", "expected_output": "5", "is_public": True, "weight": 3},
            {"input_data": "9876", "expected_output": "15", "is_public": True, "weight": 3},
            {"input_data": "22", "expected_output": "2", "is_public": True, "weight": 3},
            {"input_data": "1357", "expected_output": "8", "is_public": True, "weight": 3},
            {"input_data": "88", "expected_output": "8", "is_public": True, "weight": 3},
            {"input_data": "2468", "expected_output": "10", "is_public": False, "weight": 5},
            {"input_data": "9999", "expected_output": "18", "is_public": False, "weight": 5},
        ]
    }
]

def seed_database():
    """Seed all 4 sections in the database."""
    # Seed MCQs if empty or outdated count
    if MCQQuestion.query.count() != len(MCQ_DATA):
        print("[seed] Seeding / refreshing 30 MCQ questions...")
        MCQQuestion.query.delete()
        for q_data in MCQ_DATA:
            q = MCQQuestion(**q_data)
            db.session.add(q)

    # Seed Excel questions
    if ExcelQuestion.query.count() != len(EXCEL_DATA):
        print("[seed] Seeding / refreshing 10 Excel questions...")
        ExcelQuestion.query.delete()
        for ex_data in EXCEL_DATA:
            ex_q = ExcelQuestion(**ex_data)
            db.session.add(ex_q)

    # Seed SQL questions
    if SQLQuestion.query.count() != len(SQL_DATA):
        print("[seed] Seeding / refreshing 10 SQL questions...")
        SQLQuestion.query.delete()
        for sql_data in SQL_DATA:
            sql_q = SQLQuestion(**sql_data)
            db.session.add(sql_q)

    # Seed Coding questions and test cases (always refresh to match current CODING_QUESTIONS)
    first_q = CodingQuestion.query.first()
    needs_refresh = (
        CodingQuestion.query.count() != len(CODING_QUESTIONS) or
        (first_q and first_q.title != CODING_QUESTIONS[0]['title']) or
        TestCase.query.count() != 14
    )

    if needs_refresh:
        print("[seed] Seeding / refreshing 2 DSA Coding problems and 14 test cases...")
        from models.submission import TestResult, CodingSubmission
        TestResult.query.delete()
        CodingSubmission.query.delete()
        TestCase.query.delete()
        CodingQuestion.query.delete()
        db.session.flush()

        for cq_dict in CODING_QUESTIONS:
            cq_data = dict(cq_dict)
            tcs = cq_data.pop("test_cases")
            cq = CodingQuestion(**cq_data)
            db.session.add(cq)
            db.session.flush()

            for tc_data in tcs:
                tc = TestCase(coding_question_id=cq.id, **tc_data)
                db.session.add(tc)

    db.session.commit()
    print("[seed] Successfully verified and seeded all 4 technical assessment sections.")
