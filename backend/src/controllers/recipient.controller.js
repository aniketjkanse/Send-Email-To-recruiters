const {
  replaceRecipients,
  appendRecipients,
  getRecipients,
  deleteRecipient,
  clearRecipients,
  countRecipients
} = require(
  '../services/recipient.service'
);

async function getAllRecipients(
  req,
  res
) {
  try {
    const userId =
      req.user.id;

    const recipients =
      await getRecipients(
        userId
      );

    return res.json({
      source:
        'POSTGRESQL',

      total:
        recipients.length,

      recipients
    });
  } catch (error) {
    console.error(
      'Unable to load recipients:',
      error.message
    );

    return res
      .status(500)
      .json({
        message:
          error.message
      });
  }
}

async function replaceAllRecipients(
  req,
  res
) {
  try {
    const emails =
      req.body?.emails;

    if (
      !Array.isArray(emails) ||
      emails.length === 0
    ) {
      return res
        .status(400)
        .json({
          message:
            'Provide at least one recipient email address.'
        });
    }

    const result =
      await replaceRecipients(
        req.user.id,
        emails,
        {
          source:
            req.body?.source ||
            'MANUAL',

          originalFile:
            req.body
              ?.originalFile ||
            ''
        }
      );

    return res.json({
      message:
        `${result.validCount} recipient(s) saved successfully.`,

      source:
        'POSTGRESQL',

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to replace recipients:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

async function addRecipients(
  req,
  res
) {
  try {
    const emails =
      req.body?.emails;

    if (
      !Array.isArray(emails) ||
      emails.length === 0
    ) {
      return res
        .status(400)
        .json({
          message:
            'Provide at least one recipient email address.'
        });
    }

    const result =
      await appendRecipients(
        req.user.id,
        emails,
        {
          source:
            req.body?.source ||
            'MANUAL',

          originalFile:
            req.body
              ?.originalFile ||
            ''
        }
      );

    return res.json({
      message:
        `${result.insertedCount} new recipient(s) added.`,

      source:
        'POSTGRESQL',

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to add recipients:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

async function removeRecipient(
  req,
  res
) {
  try {
    const recipientId =
      req.params.id;

    const result =
      await deleteRecipient(
        req.user.id,
        recipientId
      );

    if (!result.deleted) {
      return res
        .status(404)
        .json({
          message:
            'Recipient was not found.'
        });
    }

    return res.json({
      message:
        'Recipient removed successfully.',

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to remove recipient:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

async function removeAllRecipients(
  req,
  res
) {
  try {
    const result =
      await clearRecipients(
        req.user.id
      );

    return res.json({
      message:
        `${result.deletedCount} recipient(s) removed.`,

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to clear recipients:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

async function getRecipientCount(
  req,
  res
) {
  try {
    const total =
      await countRecipients(
        req.user.id
      );

    return res.json({
      source:
        'POSTGRESQL',

      total
    });
  } catch (error) {
    console.error(
      'Unable to count recipients:',
      error.message
    );

    return res
      .status(500)
      .json({
        message:
          error.message
      });
  }
}

module.exports = {
  getAllRecipients,
  replaceAllRecipients,
  addRecipients,
  removeRecipient,
  removeAllRecipients,
  getRecipientCount
};