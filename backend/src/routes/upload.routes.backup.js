const express =
  require('express');

const multer =
  require('multer');

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const {
  UPLOAD_DIR
} = require('../utils/path.util');

const {
  ensureDir
} = require('../utils/file.util');

const {
  uploadEmails,
  uploadResume,
  deleteResume,
  getResumeStatus
} = require(
  '../controllers/upload.controller'
);

/*
 * Ensure the temporary upload directory
 * exists before Multer receives a file.
 */
ensureDir(
  UPLOAD_DIR
);

/*
 * Multer stores incoming files temporarily
 * inside UPLOAD_DIR.
 *
 * The upload controller moves or deletes
 * these temporary files after processing.
 */
const upload =
  multer({
    dest:
      UPLOAD_DIR,

    limits: {
      /*
       * Maximum allowed file size:
       * 10 MB
       */
      fileSize:
        10 * 1024 * 1024,

      /*
       * Only one file is accepted by each
       * upload endpoint.
       */
      files:
        1
    }
  });

const router =
  express.Router();

/*
 * All upload and resume operations require
 * a valid JWT token.
 *
 * authenticateToken adds:
 *
 * req.user.id
 * req.user.email
 */
router.use(
  authenticateToken
);

/*
 * Upload recipient email file.
 *
 * POST /api/upload/emails
 *
 * Multipart field name:
 *
 * emailsFile
 *
 * Additional optional field:
 *
 * mode = REPLACE
 * mode = APPEND
 */
router.post(
  '/emails',

  upload.single(
    'emailsFile'
  ),

  uploadEmails
);

/*
 * Upload resume.
 *
 * POST /api/upload/resume
 *
 * Multipart field name:
 *
 * resume
 */
router.post(
  '/resume',

  upload.single(
    'resume'
  ),

  uploadResume
);

/*
 * Delete the logged-in user's currently
 * configured resume.
 *
 * DELETE /api/upload/resume
 */
router.delete(
  '/resume',

  deleteResume
);

/*
 * Get resume-upload status.
 *
 * GET /api/upload/resume/status
 */
router.get(
  '/resume/status',

  getResumeStatus
);

/*
 * Handle Multer errors from the upload
 * endpoints above.
 */
router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        'LIMIT_FILE_SIZE'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Uploaded file must be 10 MB or smaller.'
          });
      }

      if (
        error.code ===
        'LIMIT_FILE_COUNT'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Only one file can be uploaded at a time.'
          });
      }

      if (
        error.code ===
        'LIMIT_UNEXPECTED_FILE'
      ) {
        return res
          .status(400)
          .json({
            message:
              'Unexpected upload field. Use "emailsFile" for recipient files and "resume" for resume files.'
          });
      }

      return res
        .status(400)
        .json({
          message:
            error.message ||
            'File upload failed.'
        });
    }

    if (error) {
      return next(error);
    }

    return next();
  }
);

module.exports =
  router;