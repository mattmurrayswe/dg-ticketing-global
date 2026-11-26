import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/dgticketing")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Brazilian Events Gateway — InfinitePay Integrated Checkout
INFINITEPAY_HANDLE = os.getenv("INFINITEPAY_HANDLE", "")
INFINITEPAY_API_KEY = os.getenv("INFINITEPAY_API_KEY", "")
INFINITEPAY_API_URL = os.getenv("INFINITEPAY_API_URL", "https://api.checkout.infinitepay.io")

# Legacy PIX fallback key (kept for backward webhook compatibility)
PAGARME_API_KEY = os.getenv("PAGARME_API_KEY", "")

# International Events Gateway — Stripe Checkout
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "events@digitalgarage.com.br")
SMTP_PASS = os.getenv("SMTP_PASS", "")

WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL", "")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5175")
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8005")

# Digital Garage Classificados Integration
CLASSIFICADOS_API_URL = os.getenv("CLASSIFICADOS_API_URL", "http://host.docker.internal:8002/api")
CLASSIFICADOS_PUBLIC_URL = os.getenv("CLASSIFICADOS_PUBLIC_URL", "http://localhost:8002")
CLASSIFICADOS_WEB_URL = os.getenv("CLASSIFICADOS_WEB_URL", "http://localhost:3002")
FREE_EXHIBITOR_INVITE_LIMIT = int(os.getenv("FREE_EXHIBITOR_INVITE_LIMIT", "10"))
