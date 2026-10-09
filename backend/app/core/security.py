import hashlib
import hmac
import secrets

SECRET_KEY = "digitalgarage_organizer_secret_key_2026"


def hash_password(password: str) -> str:
    """Hashes password using SHA256 with salt."""
    salt = "dg_salt_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against stored hash."""
    return hash_password(plain_password) == hashed_password


def create_organizer_token(email: str) -> str:
    """Creates a secure token for an authenticated organizer session."""
    raw_token = f"{email}:{secrets.token_hex(16)}"
    sig = hmac.new(SECRET_KEY.encode(), raw_token.encode(), hashlib.sha256).hexdigest()
    return f"{raw_token}:{sig}"


def verify_organizer_token(token: str) -> str | None:
    """Validates organizer session token and returns email if valid."""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return None
        email, rand, sig = parts
        raw_token = f"{email}:{rand}"
        expected_sig = hmac.new(SECRET_KEY.encode(), raw_token.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected_sig):
            return email
        return None
    except Exception:
        return None
