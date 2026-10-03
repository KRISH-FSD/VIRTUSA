import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'codeeval-dev-secret-2026')
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'assessment.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Section Durations in Minutes
    SECTION_MCQ_MINUTES = 40      # Section 1: 30 Questions (40 mins)
    SECTION_EXCEL_MINUTES = 25    # Section 2: 10 Questions (25 mins)
    SECTION_SQL_MINUTES = 25      # Section 3: 10 Questions (25 mins)
    SECTION_CODING_MINUTES = 40   # Section 4: 2 DSA Problems (15 min + 25 min = 40 mins)

    MAX_SOURCE_SIZE_BYTES = 65536  # 64 KB
    DOCKER_TIMEOUT_SECONDS = 5
    DOCKER_MEMORY_LIMIT = '256m'
    DOCKER_CPU_LIMIT = '1'
    DOCKER_PIDS_LIMIT = 64
