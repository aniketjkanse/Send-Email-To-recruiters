const crypto =
  require('crypto');

const {
  prisma
} = require('../config/prisma');

function requireUserId(userId) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  const normalizedEmail =
    normalizeEmail(value);

  const emailPattern =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  return emailPattern.test(
    normalizedEmail
  );
}

function normalizeEmailList(emails) {
  if (!Array.isArray(emails)) {
    return [];
  }

  return [
    ...new Set(
      emails
        .map(normalizeEmail)
        .filter(Boolean)
    )
  ];
}

function separateValidAndInvalidEmails(
  emails
) {
  const validEmails = [];
  const invalidEmails = [];

  emails.forEach(email => {
    if (isValidEmail(email)) {
      validEmails.push(email);
    } else {
      invalidEmails.push(email);
    }
  });

  return {
    validEmails,
    invalidEmails
  };
}

function normalizeSource(value) {
  return String(
    value || 'UPLOAD'
  )
    .trim()
    .toUpperCase();
}

function normalizeOriginalFile(value) {
  const originalFile =
    String(value || '')
      .trim();

  return originalFile || null;
}

/*
 * Replace the authenticated user's entire
 * recipient list with the provided emails.
 *
 * Existing recipients belonging to other
 * users are never modified.
 */
async function replaceRecipients(
  userId,
  emails,
  options = {}
) {
  requireUserId(userId);

  const normalizedEmails =
    normalizeEmailList(emails);

  if (
    normalizedEmails.length === 0
  ) {
    throw new Error(
      'No recipient email addresses were provided.'
    );
  }

  const {
    validEmails,
    invalidEmails
  } =
    separateValidAndInvalidEmails(
      normalizedEmails
    );

  if (
    validEmails.length === 0
  ) {
    throw new Error(
      'No valid recipient email addresses were found.'
    );
  }

  const uploadBatchId =
    String(
      options.uploadBatchId ||
      crypto.randomUUID()
    ).trim();

  const source =
    normalizeSource(
      options.source
    );

  const originalFile =
    normalizeOriginalFile(
      options.originalFile
    );

  await prisma.$transaction(
    async transaction => {
      /*
       * Delete only this user's previous
       * recipients.
       */
      await transaction.recipient
        .deleteMany({
          where: {
            userId
          }
        });

      await transaction.recipient
        .createMany({
          data:
            validEmails.map(
              email => ({
                userId,

                email,

                source,

                originalFile,

                uploadBatchId,

                isActive:
                  true
              })
            ),

          skipDuplicates:
            true
        });
    }
  );

  return {
    uploadBatchId,

    totalInput:
      normalizedEmails.length,

    validCount:
      validEmails.length,

    insertedCount:
      validEmails.length,

    duplicateCount:
      0,

    invalidCount:
      invalidEmails.length,

    validEmails,

    invalidEmails
  };
}

/*
 * Append emails to the authenticated user's
 * current recipient list.
 *
 * Existing addresses are skipped because the
 * database has a unique userId + email rule.
 */
async function appendRecipients(
  userId,
  emails,
  options = {}
) {
  requireUserId(userId);

  const normalizedEmails =
    normalizeEmailList(emails);

  if (
    normalizedEmails.length === 0
  ) {
    throw new Error(
      'No recipient email addresses were provided.'
    );
  }

  const {
    validEmails,
    invalidEmails
  } =
    separateValidAndInvalidEmails(
      normalizedEmails
    );

  if (
    validEmails.length === 0
  ) {
    throw new Error(
      'No valid recipient email addresses were found.'
    );
  }

  const uploadBatchId =
    String(
      options.uploadBatchId ||
      crypto.randomUUID()
    ).trim();

  const source =
    normalizeSource(
      options.source
    );

  const originalFile =
    normalizeOriginalFile(
      options.originalFile
    );

  const result =
    await prisma.recipient
      .createMany({
        data:
          validEmails.map(
            email => ({
              userId,

              email,

              source,

              originalFile,

              uploadBatchId,

              isActive:
                true
            })
          ),

        skipDuplicates:
          true
      });

  return {
    uploadBatchId,

    totalInput:
      normalizedEmails.length,

    validCount:
      validEmails.length,

    insertedCount:
      result.count,

    duplicateCount:
      validEmails.length -
      result.count,

    invalidCount:
      invalidEmails.length,

    invalidEmails
  };
}

/*
 * Return complete active recipient records
 * belonging to the authenticated user.
 */
async function getRecipients(userId) {
  requireUserId(userId);

  return prisma.recipient.findMany({
    where: {
      userId,

      isActive:
        true
    },

    orderBy: {
      createdAt:
        'asc'
    }
  });
}

/*
 * Return only recipient email strings.
 *
 * Preview and Scheduler will use this later.
 */
async function getRecipientEmails(userId) {
  requireUserId(userId);

  const recipients =
    await prisma.recipient.findMany({
      where: {
        userId,

        isActive:
          true
      },

      select: {
        email: true
      },

      orderBy: {
        createdAt:
          'asc'
      }
    });

  return recipients
    .map(recipient => {
      return normalizeEmail(
        recipient.email
      );
    })
    .filter(Boolean);
}

/*
 * Return recipient records from one upload
 * batch belonging to the authenticated user.
 */
async function getRecipientsByBatch(
  userId,
  uploadBatchId
) {
  requireUserId(userId);

  if (!uploadBatchId) {
    throw new Error(
      'Upload batch ID is required.'
    );
  }

  return prisma.recipient.findMany({
    where: {
      userId,

      uploadBatchId,

      isActive:
        true
    },

    orderBy: {
      createdAt:
        'asc'
    }
  });
}

/*
 * Remove one recipient safely.
 *
 * deleteMany is used so the operation can be
 * scoped by both recipient ID and user ID.
 */
async function deleteRecipient(
  userId,
  recipientId
) {
  requireUserId(userId);

  if (!recipientId) {
    throw new Error(
      'Recipient ID is required.'
    );
  }

  const result =
    await prisma.recipient
      .deleteMany({
        where: {
          id:
            recipientId,

          userId
        }
      });

  return {
    deleted:
      result.count > 0,

    deletedCount:
      result.count
  };
}

/*
 * Remove multiple selected recipient records
 * belonging to the authenticated user.
 */
async function deleteRecipients(
  userId,
  recipientIds
) {
  requireUserId(userId);

  if (
    !Array.isArray(recipientIds) ||
    recipientIds.length === 0
  ) {
    throw new Error(
      'Select at least one recipient.'
    );
  }

  const uniqueRecipientIds = [
    ...new Set(
      recipientIds
        .map(id =>
          String(id || '')
            .trim()
        )
        .filter(Boolean)
    )
  ];

  if (
    uniqueRecipientIds.length === 0
  ) {
    throw new Error(
      'No valid recipient IDs were provided.'
    );
  }

  const result =
    await prisma.recipient
      .deleteMany({
        where: {
          userId,

          id: {
            in:
              uniqueRecipientIds
          }
        }
      });

  return {
    deletedCount:
      result.count
  };
}

/*
 * Remove every recipient belonging to the
 * authenticated user.
 */
async function clearRecipients(userId) {
  requireUserId(userId);

  const result =
    await prisma.recipient
      .deleteMany({
        where: {
          userId
        }
      });

  return {
    deletedCount:
      result.count
  };
}

/*
 * Activate or deactivate one recipient.
 */
async function setRecipientActiveStatus(
  userId,
  recipientId,
  isActive
) {
  requireUserId(userId);

  if (!recipientId) {
    throw new Error(
      'Recipient ID is required.'
    );
  }

  const existingRecipient =
    await prisma.recipient
      .findFirst({
        where: {
          id:
            recipientId,

          userId
        }
      });

  if (!existingRecipient) {
    return null;
  }

  return prisma.recipient.update({
    where: {
      id:
        existingRecipient.id
    },

    data: {
      isActive:
        Boolean(isActive)
    }
  });
}

async function countRecipients(userId) {
  requireUserId(userId);

  return prisma.recipient.count({
    where: {
      userId,

      isActive:
        true
    }
  });
}

async function countAllRecipients(userId) {
  requireUserId(userId);

  return prisma.recipient.count({
    where: {
      userId
    }
  });
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  normalizeEmailList,
  separateValidAndInvalidEmails,
  normalizeSource,
  replaceRecipients,
  appendRecipients,
  getRecipients,
  getRecipientEmails,
  getRecipientsByBatch,
  deleteRecipient,
  deleteRecipients,
  clearRecipients,
  setRecipientActiveStatus,
  countRecipients,
  countAllRecipients
};