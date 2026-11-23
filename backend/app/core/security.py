import hashlib
import hmac
import secrets

SECRET_KEY = "digitalgarage_organizer_secret_key_2026"


def hash_password(password: str) -> str:
    """Hashes password using PBKDF2-HMAC-SHA256 with a random per-user salt."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"pbkdf2_sha256${salt}${dk.hex()}"


def _legacy_hash_password(password: str) -> str:
    """Legacy static-salt SHA256 hash used by seed data."""
    salt = "dg_salt_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against PBKDF2 or legacy SHA256 hash."""
    if hashed_password.startswith("pbkdf2_sha256$"):
        try:
            _, salt, expected_hex = hashed_password.split("$", 2)
            dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100_000)
            return hmac.compare_digest(dk.hex(), expected_hex)
        except ValueError:
            return False
    return hmac.compare_digest(_legacy_hash_password(plain_password), hashed_password)


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
