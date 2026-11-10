"""Teacher credential loading and password verification."""

import hashlib
import hmac
import json
import re
import secrets
from pathlib import Path

PASSWORD_ITERATIONS = 310_000
PASSWORD_HASH_PREFIX = "pbkdf2_sha256"
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def validate_username(username: str) -> bool:
    return bool(USERNAME_PATTERN.fullmatch(username))


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password must not be empty")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    return "$".join(
        (
            PASSWORD_HASH_PREFIX,
            str(PASSWORD_ITERATIONS),
            salt.hex(),
            digest.hex(),
        )
    )


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, digest_hex = encoded_hash.split("$")
        iterations = int(iterations_text)
        salt = bytes.fromhex(salt_hex)
        expected_digest = bytes.fromhex(digest_hex)
    except (AttributeError, TypeError, ValueError):
        return False

    if (
        algorithm != PASSWORD_HASH_PREFIX
        or not 100_000 <= iterations <= 1_000_000
        or len(salt) != 16
        or len(expected_digest) != 32
    ):
        return False

    actual_digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations
    )
    return hmac.compare_digest(actual_digest, expected_digest)


def load_teacher_credentials(path: Path) -> dict[str, str]:
    try:
        with path.open(encoding="utf-8") as credentials_file:
            data = json.load(credentials_file)
    except json.JSONDecodeError as exc:
        raise ValueError("Teacher credentials file contains invalid JSON") from exc

    if (
        not isinstance(data, dict)
        or data.get("format") != "mergington-teachers"
        or data.get("version") != 1
        or not isinstance(data.get("teachers"), list)
    ):
        raise ValueError("Teacher credentials file has an unsupported format")

    credentials = {}
    for teacher in data["teachers"]:
        if not isinstance(teacher, dict):
            raise ValueError("Teacher credential entry must be an object")
        username = teacher.get("username")
        password_hash = teacher.get("password_hash")
        if (
            not isinstance(username, str)
            or not validate_username(username)
            or not isinstance(password_hash, str)
            or not verify_password_hash_format(password_hash)
            or username in credentials
        ):
            raise ValueError("Teacher credential entry is invalid")
        credentials[username] = password_hash
    return credentials


def verify_password_hash_format(encoded_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, digest_hex = encoded_hash.split("$")
        iterations = int(iterations_text)
        salt = bytes.fromhex(salt_hex)
        digest = bytes.fromhex(digest_hex)
    except (TypeError, ValueError):
        return False
    return (
        algorithm == PASSWORD_HASH_PREFIX
        and 100_000 <= iterations <= 1_000_000
        and len(salt) == 16
        and len(digest) == 32
    )
