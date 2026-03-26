import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
# Use BACKEND_DB_URL to point chatbot at the same database as Spring Boot.
# Default: local SQLite for standalone development.
# Example for H2 compatibility: jdbc URLs are not supported; use a shared MySQL/PostgreSQL.
# Example: DATABASE_URL=mysql+pymysql://root:root@localhost:3306/ecommerce_demo
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ecommerce.db")
USE_SHARED_DB = os.getenv("USE_SHARED_DB", "false").lower() == "true"
MAX_RETRIES = 2

# Internal API key for backend→chatbot communication
# This prevents direct unauthorized access to the chatbot microservice
INTERNAL_API_KEY = os.getenv("CHATBOT_API_KEY", "")
if not INTERNAL_API_KEY:
    print("WARNING: CHATBOT_API_KEY not set. Set it in .env for secure operation.")
