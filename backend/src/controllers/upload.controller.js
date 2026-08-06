const fs = require('fs');

const {
  EXTRACTED_EMAILS_FILE,
  RESUME_FILE
} = require('../utils/path.util');

function uploadEmails(req, res) {
  if (!req.file) {
    return res.status(400).json({
      message: 'Emails file is required'
    });
  }

  fs.copyFileSync(req.file.path, EXTRACTED_EMAILS_FILE);
  fs.unlinkSync(req.file.path);

  return res.json({
    message: 'Extracted emails file uploaded successfully'
  });
}

function uploadResume(req, res) {
  if (!req.file) {
    return res.status(400).json({
      message: 'Resume file is required'
    });
  }

  fs.copyFileSync(req.file.path, RESUME_FILE);

  fs.writeFileSync(
    `${RESUME_FILE}.meta`,
    JSON.stringify({
      originalName: req.file.originalname
    })
  );

  fs.unlinkSync(req.file.path);

  return res.json({
    message: 'Resume uploaded successfully',
    fileName: req.file.originalname
  });
}

function deleteResume(req, res) {
  try {
    if (fs.existsSync(RESUME_FILE)) {
      fs.unlinkSync(RESUME_FILE);
    }

    if (fs.existsSync(`${RESUME_FILE}.meta`)) {
      fs.unlinkSync(`${RESUME_FILE}.meta`);
    }

    return res.json({
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete resume',
      error: error.message
    });
  }
}

function getResumeStatus(req, res) {
  let fileName = null;

  if (
    fs.existsSync(RESUME_FILE) &&
    fs.existsSync(`${RESUME_FILE}.meta`)
  ) {
    const meta = JSON.parse(
      fs.readFileSync(`${RESUME_FILE}.meta`, 'utf8')
    );

    fileName = meta.originalName;
  }

  return res.json({
    uploaded: fs.existsSync(RESUME_FILE),
    fileName
  });
}

module.exports = {
  uploadEmails,
  uploadResume,
  deleteResume,
  getResumeStatus
};