const fs = require('fs');
const { EXTRACTED_EMAILS_FILE, RESUME_FILE } = require('../utils/path.util');
function uploadEmails(req, res) { if (!req.file) return res.status(400).json({ message: 'Emails file is required' }); fs.copyFileSync(req.file.path, EXTRACTED_EMAILS_FILE); fs.unlinkSync(req.file.path); return res.json({ message: 'Extracted emails file uploaded successfully' }); }
function uploadResume(req, res) { if (!req.file) return res.status(400).json({ message: 'Resume file is required' }); fs.copyFileSync(req.file.path, RESUME_FILE); fs.unlinkSync(req.file.path); return res.json({ message: 'Resume uploaded successfully' }); }
module.exports = { uploadEmails, uploadResume };
