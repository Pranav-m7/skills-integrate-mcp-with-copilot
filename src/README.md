# Mergington High School Activities API

A simple FastAPI application for viewing extracurricular activities and managing student registrations.

## Features

- View all available extracurricular activities
- Teacher sign-in for registering and unregistering students
- Public viewing of activities and participant rosters

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. From the `src` directory, create a teacher login. Passwords are stored as
   PBKDF2 hashes in a local `teachers.json` file, which is ignored by Git:

   ```
   python manage_teachers.py teacher-name
   ```

   The command securely prompts for a password and confirmation. It can be
   rerun to change that teacher's password. The expected JSON structure is
   shown in `teachers.example.json`. To use another credentials file, set the
   `TEACHERS_FILE` environment variable before starting the API.

3. From the `src` directory, start the application:

   ```
   uvicorn app:app --reload
   ```

4. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

   The API allows public activity and roster viewing; signup and unregister
   requests require a teacher session. Teacher sessions expire after eight
   hours and are cleared when the server restarts.

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| POST   | `/auth/login`                                                      | Sign in with a teacher username and password                        |
| GET    | `/auth/me`                                                         | Check the current teacher session                                   |
| POST   | `/auth/logout`                                                     | Sign out and clear the session                                      |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Register a student (teacher session required)                       |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Unregister a student (teacher session required)                  |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

Activity data is stored in memory and resets when the server restarts. Teacher
credentials are stored locally in `teachers.json`; sessions also reset when
the server restarts.
