import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/dgticketing")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

PAGARME_API_KEY = os.getenv("PAGARME_API_KEY", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "events@digitalgarage.com.br")
SMTP_PASS = os.getenv("SMTP_PASS", "")

WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL", "")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5175")
