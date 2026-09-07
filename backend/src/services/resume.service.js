const fs = require('fs');
const path = require('path');

const {
  UPLOAD_DIR,
  RESUME_FILE
} = require('../utils/path.util');

const { ensureDir } = require('../utils/file.util');

/*
 * Each template keeps its own resume on disk as
 *   uploads/resume_<templateId>.pdf   (+ a .meta JSON sidecar)
 *
 * The old single-resume file (uploads/resume.pdf) is still honoured as
 * a fallback so nothing breaks for templates that never got their own.
 */

function safeId(templateId) {
  return String(templateId || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'default';
}

function resumePathFor(templateId) {
  return path.join(
    UPLOAD_DIR,
    `resume_${safeId(templateId)}.pdf`
  );
}

function metaPathFor(templateId) {
  return `${resumePathFor(templateId)}.meta`;
}

function readOriginalName(metaFile, fallback) {
  try {
    if (fs.existsSync(metaFile)) {
      const meta = JSON.parse(
        fs.readFileSync(metaFile, 'utf8')
      );

      return meta.originalName || fallback;
    }
  } catch (error) {
    console.log(
      'Unable to read resume metadata:',
      error.message
    );
  }

  return fallback;
}

/*
 * Resolve the resume that should be attached for a template. Returns the
 * template-specific file when present, otherwise the legacy shared file.
 */
function getResumeInfo(templateId) {
  const ownPath = resumePathFor(templateId);

  if (fs.existsSync(ownPath)) {
    return {
      uploaded: true,
      own: true,
      path: ownPath,
      originalName: readOriginalName(
        metaPathFor(templateId),
        'Resume.pdf'
      )
    };
  }

  if (fs.existsSync(RESUME_FILE)) {
    return {
      uploaded: true,
      own: false,
      path: RESUME_FILE,
      originalName: readOriginalName(
        `${RESUME_FILE}.meta`,
        'Resume.pdf'
      )
    };
  }

  return {
    uploaded: false,
    own: false,
    path: null,
    originalName: null
  };
}

function saveResume(templateId, tempFilePath, originalName) {
  ensureDir(UPLOAD_DIR);

  const target = resumePathFor(templateId);

  fs.copyFileSync(tempFilePath, target);

  fs.writeFileSync(
    metaPathFor(templateId),
    JSON.stringify({
      originalName: originalName || 'Resume.pdf'
    })
  );

  return getResumeInfo(templateId);
}

function deleteResume(templateId) {
  const target = resumePathFor(templateId);
  const meta = metaPathFor(templateId);

  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }

  if (fs.existsSync(meta)) {
    fs.unlinkSync(meta);
  }

  return getResumeInfo(templateId);
}

module.exports = {
  resumePathFor,
  getResumeInfo,
  saveResume,
  deleteResume
};
