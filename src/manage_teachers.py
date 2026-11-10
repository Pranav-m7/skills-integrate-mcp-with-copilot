"""Add or update a teacher credential without storing a plaintext password."""

import argparse
import getpass
import json
import os
import tempfile
from pathlib import Path

from auth import hash_password, load_teacher_credentials, validate_username


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("username", help="Teacher username to add or update")
    args = parser.parse_args()
    username = args.username.strip()
    if not validate_username(username):
        parser.error("Username must be 1-64 letters, numbers, dots, underscores, or hyphens")

    credentials_path = Path(
        os.environ.get("TEACHERS_FILE", Path(__file__).with_name("teachers.json"))
    )
    credentials_path.parent.mkdir(parents=True, exist_ok=True)
    if credentials_path.exists():
        credentials = load_teacher_credentials(credentials_path)
    else:
        credentials = {}

    password = getpass.getpass("Teacher password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        parser.error("Passwords do not match")
    if len(password) < 12:
        parser.error("Password must be at least 12 characters")

    credentials[username] = hash_password(password)
    data = {
        "format": "mergington-teachers",
        "version": 1,
        "teachers": [
            {"username": name, "password_hash": password_hash}
            for name, password_hash in sorted(credentials.items())
        ],
    }

    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=credentials_path.parent,
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(data, temporary_file, indent=2)
            temporary_file.write("\n")
        temporary_path.replace(credentials_path)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()
    print(f"Saved teacher credentials to {credentials_path}")


if __name__ == "__main__":
    main()
