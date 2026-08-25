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

function normalizeStatus(value) {
  return String(
    value || 'UNKNOWN'
  )
    .trim()
    .toUpperCase();
}

function normalizeEmailType(value) {
  return String(
    value || 'INITIAL'
  )
    .trim()
    .toUpperCase();
}

function parseDate(value) {
  const parsedDate =
    value
      ? new Date(value)
      : new Date();

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw new Error(
      'History date is invalid.'
    );
  }

  return parsedDate;
}

function normalizeLimit(
  value,
  fallback = 100
) {
  const parsedValue =
    Number(value);

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    parsedValue < 1
  ) {
    return fallback;
  }

  return Math.min(
    Math.floor(parsedValue),
    500
  );
}

function mapHistoryRecord(
  record
) {
  return {
    id:
      record.id,

    userId:
      record.userId,

    recipientEmail:
      record.recipientEmail,

    email:
      record.recipientEmail,

    senderEmail:
      record.senderEmail ||
      '',

    subject:
      record.subject ||
      '',

    messageId:
      record.messageId ||
      '',

    emailType:
      record.emailType,

    status:
      record.status,

    reason:
      record.reason ||
      '',

    sentAt:
      record.sentAt,

    createdAt:
      record.createdAt,

    updatedAt:
      record.updatedAt
  };
}

async function createHistoryRecord(
  userId,
  input = {}
) {
  requireUserId(userId);

  const recipientEmail =
    normalizeEmail(
      input.recipientEmail ||
      input.email
    );

  if (!recipientEmail) {
    throw new Error(
      'Recipient email is required for history.'
    );
  }

  const record =
    await prisma.emailHistory
      .create({
        data: {
          userId,

          recipientEmail,

          senderEmail:
            normalizeEmail(
              input.senderEmail
            ) || null,

          subject:
            String(
              input.subject ||
              ''
            ).trim() ||
            null,

          messageId:
            String(
              input.messageId ||
              ''
            ).trim() ||
            null,

          emailType:
            normalizeEmailType(
              input.emailType
            ),

          status:
            normalizeStatus(
              input.status
            ),

          reason:
            String(
              input.reason ||
              ''
            ).trim() ||
            null,

          sentAt:
            parseDate(
              input.sentAt
            )
        }
      });

  return mapHistoryRecord(
    record
  );
}

async function createHistoryRecords(
  userId,
  records
) {
  requireUserId(userId);

  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {
    return [];
  }

  const savedRecords = [];

  for (
    const record of records
  ) {
    const savedRecord =
      await createHistoryRecord(
        userId,
        record
      );

    savedRecords.push(
      savedRecord
    );
  }

  return savedRecords;
}

async function getHistory(
  userId,
  options = {}
) {
  requireUserId(userId);

  const where = {
    userId
  };

  if (options.status) {
    where.status =
      normalizeStatus(
        options.status
      );
  }

  if (options.emailType) {
    where.emailType =
      normalizeEmailType(
        options.emailType
      );
  }

  if (
    options.recipientEmail
  ) {
    where.recipientEmail =
      normalizeEmail(
        options.recipientEmail
      );
  }

  const records =
    await prisma.emailHistory
      .findMany({
        where,

        orderBy: {
          sentAt:
            'desc'
        },

        take:
          normalizeLimit(
            options.limit
          )
      });

  return records.map(
    mapHistoryRecord
  );
}

async function getHistoryById(
  userId,
  historyId
) {
  requireUserId(userId);

  if (!historyId) {
    throw new Error(
      'History ID is required.'
    );
  }

  const record =
    await prisma.emailHistory
      .findFirst({
        where: {
          id:
            historyId,

          userId
        }
      });

  if (!record) {
    return null;
  }

  return mapHistoryRecord(
    record
  );
}

async function getHistorySummary(
  userId
) {
  requireUserId(userId);

  const groupedStatuses =
    await prisma.emailHistory
      .groupBy({
        by: [
          'status'
        ],

        where: {
          userId
        },

        _count: {
          _all:
            true
        }
      });

  const summary = {
    total: 0,
    sent: 0,
    failed: 0,
    dryRun: 0,
    skipped: 0
  };

  groupedStatuses.forEach(
    group => {
      const count =
        group._count._all;

      summary.total +=
        count;

      switch (
        group.status
      ) {
        case 'SENT':
          summary.sent =
            count;
          break;

        case 'FAILED':
          summary.failed =
            count;
          break;

        case 'DRY_RUN':
          summary.dryRun =
            count;
          break;

        case 'SKIPPED':
          summary.skipped =
            count;
          break;

        default:
          break;
      }
    }
  );

  return summary;
}

async function deleteHistoryRecord(
  userId,
  historyId
) {
  requireUserId(userId);

  if (!historyId) {
    throw new Error(
      'History ID is required.'
    );
  }

  const result =
    await prisma.emailHistory
      .deleteMany({
        where: {
          id:
            historyId,

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

async function clearHistory(
  userId
) {
  requireUserId(userId);

  const result =
    await prisma.emailHistory
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

module.exports = {
  normalizeEmail,
  normalizeStatus,
  normalizeEmailType,
  parseDate,
  normalizeLimit,
  mapHistoryRecord,
  createHistoryRecord,
  createHistoryRecords,
  getHistory,
  getHistoryById,
  getHistorySummary,
  deleteHistoryRecord,
  clearHistory
};