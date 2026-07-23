# Job Outreach Email Scheduler Framework

Enterprise-style file-based framework for recruiter outreach emails.

## What this framework does

- Upload extracted recruiter/company emails as a text file.
- Keep old sent emails in `sent_emails.json` to avoid duplicate sending.
- Manage subject/body/safety settings from UI.
- Upload resume PDF.
- Preview new, duplicate, blocked, and invalid emails.
- Send one email at a time using random delay and daily limit.
- Save email history in Excel.

## What this framework does not include

This project does not include LinkedIn scraping, LinkedIn DOM automation, or any bypass logic for Gmail/LinkedIn controls. Input emails must be provided by the user through the upload screen.

## Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Update `.env`:

```env
EMAIL_USER=your-job-mail@gmail.com
EMAIL_PASS=your-gmail-app-password
DEFAULT_DRY_RUN=true
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

## Daily usage

1. Upload `extracted_emails.txt` from UI.
2. Upload resume PDF.
3. Edit email template and safety settings.
4. Preview emails.
5. Start scheduler.
6. Download Excel history.

## Recommended safety settings for 100/day

- Daily limit: 100
- Min delay: 180 seconds
- Max delay: 420 seconds
- Stop after continuous failures: 3
- Stop after total failures: 8
- Dry run first: true

## Notes

No delivery system can guarantee inbox placement. This framework uses safer sending patterns: duplicate checks, daily limits, random delay, failure stop, and dry-run mode.
