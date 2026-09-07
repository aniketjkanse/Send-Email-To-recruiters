const fs = require('fs');

const {
  RESUME_FILE
} = require('../utils/path.util');

const { workspaceFile } = require('../utils/workspace.util');
const { getResumeInfo } = require('../services/resume.service');
const { readTemplate } = require('../services/template.service');

function uploadEmails(req, res) {
  if (!req.file) {
    return res.status(400).json({
      message: 'Emails file is required'
    });
  }

  fs.copyFileSync(req.file.path, workspaceFile('extracted_emails.txt'));
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
  /*
   * Reflect the resume attached to the currently active template
   * (falls back to the shared legacy resume when none is set).
   */
  let templateId;

  try {
    templateId = readTemplate().templateId;
  } catch (error) {
    templateId = 'default';
  }

  const info = getResumeInfo(templateId);

  return res.json({
    uploaded: info.uploaded,
    fileName: info.originalName,
    templateSpecific: info.own
  });
}

module.exports = {
  uploadEmails,
  uploadResume,
  deleteResume,
  getResumeStatus
};