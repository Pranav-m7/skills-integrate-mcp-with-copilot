import json
import tempfile
import unittest
from pathlib import Path

from src.auth import hash_password, load_teacher_credentials, verify_password


class TeacherAuthTests(unittest.TestCase):
    def test_password_hash_uses_random_salt_and_verifies_password(self):
        password = "correct horse battery staple"
        first_hash = hash_password(password)
        second_hash = hash_password(password)

        self.assertNotEqual(first_hash, second_hash)
        self.assertTrue(verify_password(password, first_hash))
        self.assertFalse(verify_password("incorrect password", first_hash))

    def test_loads_credentials_from_supported_json_format(self):
        password_hash = hash_password("teacher password")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "teachers.json"
            path.write_text(
                json.dumps(
                    {
                        "format": "mergington-teachers",
                        "version": 1,
                        "teachers": [
                            {
                                "username": "teacher.one",
                                "password_hash": password_hash,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            credentials = load_teacher_credentials(path)

        self.assertEqual(list(credentials), ["teacher.one"])
        self.assertTrue(
            verify_password("teacher password", credentials["teacher.one"])
        )

    def test_rejects_invalid_credentials_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "teachers.json"
            path.write_text('{"teachers": []}', encoding="utf-8")

            with self.assertRaises(ValueError):
                load_teacher_credentials(path)

    def test_rejects_duplicate_or_malformed_teacher_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "teachers.json"
            path.write_text(
                json.dumps(
                    {
                        "format": "mergington-teachers",
                        "version": 1,
                        "teachers": [
                            {"username": "teacher", "password_hash": "invalid"},
                            {"username": "teacher", "password_hash": "invalid"},
                        ],
                    }
                ),
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                load_teacher_credentials(path)


if __name__ == "__main__":
    unittest.main()
