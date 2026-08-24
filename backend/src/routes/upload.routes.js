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
} = require(
  '../utils/path.util'
);

const {
  ensureDir
} = require(
  '../utils/file.util'
);

const {
  uploadEmails
} = require(
  '../controllers/upload.controller'
);

/*
 * Ensure the temporary upload directory
 * exists before Multer receives a
 * recipient file.
 */
ensureDir(
  UPLOAD_DIR
);

/*
 * Recipient TXT and CSV files are stored
 * temporarily inside UPLOAD_DIR.
 *
 * uploadEmails processes the file and
 * removes the temporary file afterward.
 */
const upload =
  multer({
    dest:
      UPLOAD_DIR,

    limits: {
      /*
       * Maximum recipient file size:
       * 10 MB
       */
      fileSize:
        10 *
        1024 *
        1024,

      /*
       * Accept only one recipient file
       * per request.
       */
      files:
        1
    },

    fileFilter:
      (
        req,
        file,
        callback
      ) => {
        const originalName =
          String(
            file?.originalname ||
            ''
          )
            .trim()
            .toLowerCase();

        const mimeType =
          String(
            file?.mimetype ||
            ''
          )
            .trim()
            .toLowerCase();

        const validExtension =
          originalName.endsWith(
            '.txt'
          ) ||
          originalName.endsWith(
            '.csv'
          );

        const validMimeType =
          mimeType ===
            'text/plain' ||
          mimeType ===
            'text/csv' ||
          mimeType ===
            'application/csv' ||
          mimeType ===
            'application/vnd.ms-excel' ||
          mimeType ===
            'application/octet-stream';

        if (
          !validExtension ||
          !validMimeType
        ) {
          const error =
            new Error(
              'Recipient file must be a TXT or CSV file.'
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
  });

const router =
  express.Router();

/*
 * Recipient upload requires a valid JWT.
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
 * Upload recipient email addresses.
 *
 * POST /api/upload/emails
 *
 * Content-Type:
 * multipart/form-data
 *
 * Required file field:
 * emailsFile
 *
 * Optional text field:
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
 * Convert Multer and upload-validation
 * errors into predictable JSON responses.
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
          .status(413)
          .json({
            source:
              'POSTGRESQL',

            message:
              'Recipient file must be 10 MB or smaller.'
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
              'Only one recipient file can be uploaded at a time.'
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
              'Unexpected upload field. Use the multipart field name "emailsFile".'
          });
      }

      return res
        .status(400)
        .json({
          source:
            'POSTGRESQL',

          message:
            error.message ||
            'Recipient file upload failed.'
        });
    }

    if (error) {
      const requestedStatusCode =
        Number(
          error.statusCode ||
          error.status
        );

      const statusCode =
        Number.isInteger(
          requestedStatusCode
        ) &&
        requestedStatusCode >=
          400 &&
        requestedStatusCode <=
          599
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
            'Recipient file upload failed.'
        });
    }

    return next();
  }
);

module.exports =
  router;