"""
Fernet symmetric encryption for AI API keys.

The ENCRYPTION_KEY env var is the only thing that can decrypt stored keys.
It must never be committed to git or stored in the database.
Generate once with:
    python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import os
from cryptography.fernet import Fernet, InvalidToken

_KEY = os.environ.get("ENCRYPTION_KEY", "").encode()


def _fernet() -> Fernet:
    if not _KEY:
        raise RuntimeError(
            "ENCRYPTION_KEY is not set. "
            "Add it to your .env file."
        )
    return Fernet(_KEY)


def encrypt(plaintext: str) -> str:
    """Encrypt an API key. Returns a base64-encoded ciphertext string."""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """
    Decrypt a stored API key ciphertext.
    Raises ValueError if the ciphertext is invalid or the key has changed.
    """
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt key — it may have been encrypted with a different key.") from exc
