# Architecture

## Modules

- Frontend React UI
- Backend Express API
- File storage under `backend/src/data`
- Email filtering service
- Template service
- Scheduler service
- Mail service
- Excel history service

## Data files

- `extracted_emails.txt`: daily input emails
- `sent_emails.json`: already contacted emails
- `send_history.xlsx`: human-readable history
- `email_template.json`: subject, body, and safety settings
- `uploads/resume.pdf`: resume attachment

## API endpoints

- `POST /api/upload/emails`
- `POST /api/upload/resume`
- `GET /api/template`
- `POST /api/template`
- `GET /api/preview`
- `POST /api/send/start`
- `GET /api/send/status`
- `GET /api/history/download`
