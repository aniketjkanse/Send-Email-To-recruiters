const fs =
  require('fs');

const {
  saveUploadedRecipients
} = require(
  '../services/recipientUpload.service'
);

/*
 * Safely delete the temporary Multer file.
 *
 * This function does not throw when the
 * file has already been removed.
 */
function deleteTemporaryFile(
  filePath
) {
  const normalizedFilePath =
    String(
      filePath || ''
    ).trim();

  if (!normalizedFilePath) {
    return false;
  }

  try {
    if (
      !fs.existsSync(
        normalizedFilePath
      )
    ) {
      return false;
    }

    fs.unlinkSync(
      normalizedFilePath
    );

    return true;
  } catch (error) {
    console.error(
      'Unable to delete temporary upload file:',
      error.message
    );

    return false;
  }
}

/*
 * Read recipient email addresses from the
 * uploaded TXT or CSV file.
 *
 * Supported separators:
 *
 * New line
 * Comma
 * Semicolon
 */
function extractEmailsFromTextFile(
  filePath
) {
  const normalizedFilePath =
    String(
      filePath || ''
    ).trim();

  if (!normalizedFilePath) {
    throw new Error(
      'Uploaded recipient file path is missing.'
    );
  }

  if (
    !fs.existsSync(
      normalizedFilePath
    )
  ) {
    throw new Error(
      'Uploaded recipient file was not found.'
    );
  }

  const fileContent =
    fs.readFileSync(
      normalizedFilePath,
      'utf8'
    );

  return fileContent
    .split(
      /[\r\n,;]+/
    )
    .map(
      value => {
        return String(
          value || ''
        ).trim();
      }
    )
    .filter(Boolean);
}

function getAuthenticatedUserId(
  req
) {
  const userId =
    String(
      req.user?.id ||
      ''
    ).trim();

  if (!userId) {
    throw new Error(
      'Authenticated user is required.'
    );
  }

  return userId;
}

function normalizeUploadMode(
  value
) {
  const mode =
    String(
      value ||
      'REPLACE'
    )
      .trim()
      .toUpperCase();

  const supportedModes = [
    'REPLACE',
    'APPEND'
  ];

  if (
    !supportedModes.includes(
      mode
    )
  ) {
    throw new Error(
      'Upload mode must be REPLACE or APPEND.'
    );
  }

  return mode;
}

function getErrorStatusCode(
  error
) {
  const message =
    String(
      error?.message ||
      ''
    ).toLowerCase();

  if (
    message.includes(
      'authenticated user'
    )
  ) {
    return 401;
  }

  if (
    message.includes(
      'not found'
    )
  ) {
    return 400;
  }

  if (
    message.includes(
      'required'
    ) ||
    message.includes(
      'must be'
    ) ||
    message.includes(
      'no email addresses'
    )
  ) {
    return 400;
  }

  return 500;
}

/*
 * Upload recipient email addresses.
 *
 * POST /api/upload/emails
 *
 * Required multipart field:
 *
 * emailsFile
 *
 * Optional text field:
 *
 * mode = REPLACE
 * mode = APPEND
 *
 * PostgreSQL Recipient is the only
 * persistent recipient data source.
 */
async function uploadEmails(
  req,
  res
) {
  let temporaryFilePath =
    '';

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          source:
            'POSTGRESQL',

          message:
            'Recipient file is required. Use the multipart field name "emailsFile".'
        });
    }

    const userId =
      getAuthenticatedUserId(
        req
      );

    const uploadMode =
      normalizeUploadMode(
        req.body?.mode
      );

    temporaryFilePath =
      String(
        req.file.path ||
        ''
      ).trim();

    const extractedEmails =
      extractEmailsFromTextFile(
        temporaryFilePath
      );

    if (
      extractedEmails.length ===
      0
    ) {
      throw new Error(
        'No email addresses were found in the uploaded file.'
      );
    }

    /*
     * Save the recipient list directly in
     * PostgreSQL.
     *
     * No extracted_emails.txt file is
     * created or updated.
     */
    const databaseResult =
      await saveUploadedRecipients(
        userId,
        extractedEmails,
        {
          mode:
            uploadMode,

          source:
            'FILE_UPLOAD',

          originalFile:
            req.file.originalname ||
            ''
        }
      );

    deleteTemporaryFile(
      temporaryFilePath
    );

    temporaryFilePath =
      '';

    return res.json({
      source:
        'POSTGRESQL',

      message:
        uploadMode ===
        'APPEND'
          ? (
            'Recipients appended successfully.'
          )
          : (
            'Recipients replaced successfully.'
          ),

      file: {
        originalName:
          req.file.originalname ||
          '',

        size:
          Number(
            req.file.size
          ) || 0,

        mimeType:
          req.file.mimetype ||
          ''
      },

      recipients: {
        uploadBatchId:
          databaseResult
            .uploadBatchId ||
          '',

        mode:
          uploadMode,

        totalInput:
          Number(
            databaseResult
              .totalInput
          ) || 0,

        validCount:
          Number(
            databaseResult
              .validCount
          ) || 0,

        insertedCount:
          Number(
            databaseResult
              .insertedCount
          ) || 0,

        duplicateCount:
          Number(
            databaseResult
              .duplicateCount
          ) || 0,

        invalidCount:
          Number(
            databaseResult
              .invalidCount
          ) || 0,

        validEmails:
          Array.isArray(
            databaseResult
              .validEmails
          )
            ? databaseResult
                .validEmails
            : [],

        invalidEmails:
          Array.isArray(
            databaseResult
              .invalidEmails
          )
            ? databaseResult
                .invalidEmails
            : []
      }
    });
  } catch (error) {
    console.error(
      'Recipient upload failed:',
      error
    );

    deleteTemporaryFile(
      temporaryFilePath
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        source:
          'POSTGRESQL',

        message:
          error.message ||
          'Unable to process the uploaded recipient file.'
      });
  }
}

module.exports = {
  deleteTemporaryFile,
  extractEmailsFromTextFile,
  getAuthenticatedUserId,
  normalizeUploadMode,
  uploadEmails
};