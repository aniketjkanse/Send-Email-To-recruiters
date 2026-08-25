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
  getCurrentResume,
  getUserResumeHistory,
  uploadResume,
  removeCurrentResume,
  deleteResumeById,
  deleteUserResumeHistory
} = require(
  '../controllers/resume.controller'
);

const {
  MAX_RESUME_SIZE,
  ALLOWED_MIME_TYPES
} = require(
  '../services/resumeStorage.service'
);

const router =
  express.Router();

/*
 * Keep uploaded files in memory.
 *
 * resumeStorage.service.js validates
 * and writes the file into the logged-in
 * user's private resume directory.
 */
const storage =
  multer.memoryStorage();

function resumeFileFilter(
  req,
  file,
  callback
) {
  const mimeType =
    String(
      file?.mimetype ||
      ''
    )
      .trim()
      .toLowerCase();

  if (
    !ALLOWED_MIME_TYPES.has(
      mimeType
    )
  ) {
    const error =
      new Error(
        'Only PDF, DOC, and DOCX resume files are allowed.'
      );

    error.statusCode =
      400;

    callback(
      error
    );

    return;
  }

  callback(
    null,
    true
  );
}

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_RESUME_SIZE,

      files:
        1
    },

    fileFilter:
      resumeFileFilter
  });

/*
 * Convert Multer upload errors into
 * predictable JSON responses.
 */
function handleResumeUpload(
  req,
  res,
  next
) {
  upload.single(
    'resume'
  )(
    req,
    res,
    error => {
      if (!error) {
        next();

        return;
      }

      if (
        error instanceof
        multer.MulterError
      ) {
        if (
          error.code ===
          'LIMIT_FILE_SIZE'
        ) {
          return res
            .status(413)
            .json({
              source:
                'POSTGRESQL',

              message:
                'Resume file size must not exceed 10 MB.'
            });
        }

        if (
          error.code ===
          'LIMIT_FILE_COUNT'
        ) {
          return res
            .status(400)
            .json({
              source:
                'POSTGRESQL',

              message:
                'Only one Resume file can be uploaded at a time.'
            });
        }

        if (
          error.code ===
          'LIMIT_UNEXPECTED_FILE'
        ) {
          return res
            .status(400)
            .json({
              source:
                'POSTGRESQL',

              message:
                'Use the multipart field name "resume".'
            });
        }

        return res
          .status(400)
          .json({
            source:
              'POSTGRESQL',

            message:
              error.message ||
              'Resume upload validation failed.'
          });
      }

      const requestedStatusCode =
        Number(
          error.statusCode ||
          error.status
        );

      const statusCode =
        Number.isInteger(
          requestedStatusCode
        ) &&
        requestedStatusCode >= 400 &&
        requestedStatusCode <= 599
          ? requestedStatusCode
          : 400;

      return res
        .status(
          statusCode
        )
        .json({
          source:
            'POSTGRESQL',

          message:
            error.message ||
            'Resume upload failed.'
        });
    }
  );
}

/*
 * Every Resume API requires a valid JWT.
 *
 * authenticateToken provides:
 *
 * req.user.id
 * req.user.email
 */
router.use(
  authenticateToken
);

/*
 * Important route order:
 *
 * Fixed /history routes must be declared
 * before the dynamic /:id route.
 */

/*
 * Get all Resume metadata records for
 * the authenticated user.
 *
 * GET /api/resume/history
 */
router.get(
  '/history',
  getUserResumeHistory
);

/*
 * Delete all inactive Resume history
 * belonging to the authenticated user.
 *
 * The current active Resume is preserved.
 *
 * DELETE /api/resume/history
 */
router.delete(
  '/history',
  deleteUserResumeHistory
);

/*
 * Get the authenticated user's active
 * Resume.
 *
 * GET /api/resume
 */
router.get(
  '/',
  getCurrentResume
);

/*
 * Upload or replace the authenticated
 * user's active Resume.
 *
 * POST /api/resume
 *
 * Body:
 * multipart/form-data
 *
 * File field:
 * resume
 */
router.post(
  '/',
  handleResumeUpload,
  uploadResume
);

/*
 * Remove the authenticated user's current
 * active Resume.
 *
 * DELETE /api/resume
 */
router.delete(
  '/',
  removeCurrentResume
);

/*
 * Permanently delete one Resume record
 * belonging to the authenticated user.
 *
 * DELETE /api/resume/:id
 */
router.delete(
  '/:id',
  deleteResumeById
);

module.exports =
  router;