const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
module.exports = {
  DATA_DIR,
  UPLOAD_DIR,
  EXTRACTED_EMAILS_FILE: path.join(DATA_DIR, 'extracted_emails.txt'),
  SENT_EMAILS_FILE: path.join(DATA_DIR, 'sent_emails.json'),
  SEND_HISTORY_FILE: path.join(DATA_DIR, 'send_history.xlsx'),
  EMAIL_TEMPLATE_FILE: path.join(DATA_DIR, 'email_template.json'),
  RESUME_FILE: path.join(UPLOAD_DIR, 'resume.pdf')
};
