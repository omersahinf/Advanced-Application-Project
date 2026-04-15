import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-3-flash-preview")
# Use BACKEND_DB_URL to point chatbot at the same database as Spring Boot.
# Default: PostgreSQL (same as Spring Boot backend).
# Example for H2 compatibility: jdbc URLs are not supported; use a shared MySQL/PostgreSQL.
# Example: DATABASE_URL=mysql+pymysql://root:root@localhost:3306/ecommerce_demo
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/ecommerce_demo")
USE_SHARED_DB = os.getenv("USE_SHARED_DB", "false").lower() == "true"
MAX_RETRIES = 3

# Internal API key for backend→chatbot communication
# This prevents direct unauthorized access to the chatbot microservice
INTERNAL_API_KEY = os.getenv("CHATBOT_API_KEY", "")
if not INTERNAL_API_KEY:
    print("WARNING: CHATBOT_API_KEY not set. Set it in .env for secure operation.")
