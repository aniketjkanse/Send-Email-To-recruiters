const {
  replaceRecipients,
  appendRecipients
} = require(
  './recipient.service'
);

function requireUserId(userId) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function extractEmailValue(item) {
  if (
    typeof item === 'string'
  ) {
    return item;
  }

  if (
    item &&
    typeof item === 'object'
  ) {
    return (
      item.email ||
      item.emailAddress ||
      item.recipientEmail ||
      item.recipient ||
      ''
    );
  }

  return '';
}

function normalizeExtractedEmails(
  extractedData
) {
  if (
    !Array.isArray(extractedData)
  ) {
    return [];
  }

  return extractedData
    .map(extractEmailValue)
    .map(value => {
      return String(
        value || ''
      ).trim();
    })
    .filter(Boolean);
}

async function saveUploadedRecipients(
  userId,
  extractedData,
  options = {}
) {
  requireUserId(userId);

  const emails =
    normalizeExtractedEmails(
      extractedData
    );

  if (
    emails.length === 0
  ) {
    throw new Error(
      'No email addresses were extracted from the uploaded file.'
    );
  }

  const mode =
    String(
      options.mode ||
      'REPLACE'
    )
      .trim()
      .toUpperCase();

  const storageOptions = {
    source:
      options.source ||
      'FILE_UPLOAD',

    originalFile:
      options.originalFile ||
      ''
  };

  if (mode === 'APPEND') {
    return appendRecipients(
      userId,
      emails,
      storageOptions
    );
  }

  return replaceRecipients(
    userId,
    emails,
    storageOptions
  );
}

module.exports = {
  extractEmailValue,
  normalizeExtractedEmails,
  saveUploadedRecipients
};