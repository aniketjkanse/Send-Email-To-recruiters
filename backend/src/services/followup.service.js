const crypto = require('crypto');

const {
  workspaceFile
} = require('../utils/workspace.util');

const {
  readJson,
  writeJson
} = require('../utils/file.util');

/*
 * Follow-up tracking is per-template. Resolve the active workspace's
 * tracker file on each access.
 */
function FOLLOWUP_TRACKER_FILE() {
  return workspaceFile('followup_tracker.json');
}

const {
  readTemplate,
  saveTemplate
} = require('./template.service');

const {
  sendEmail
} = require('./mail.service');

const {
  checkReplies
} = require('./replyDetection.service');

function readRecords() {
  const records = readJson(
    FOLLOWUP_TRACKER_FILE(),
    []
  );

  return Array.isArray(records)
    ? records
    : [];
}

function saveRecords(records) {
  writeJson(
    FOLLOWUP_TRACKER_FILE(),
    records
  );
}

function createFollowUpRecord({
  email,
  messageId,
  sentAt,
  subject
}) {
  if (!email || !messageId) {
    console.log(
      'Follow-up record was not created because email or Message-ID is missing.'
    );

    return null;
  }

  const records =
    readRecords();

  const normalizedEmail =
    String(email)
      .trim()
      .toLowerCase();

  const existingRecord =
    records.find(record => {
      const sameEmail =
        String(record.email || '')
          .trim()
          .toLowerCase() ===
        normalizedEmail;

      const activeStatus = ![
        'REPLIED',
        'STOPPED',
        'REMOVED',
        'COMPLETED',
        'FOLLOWUP_2_SENT'
      ].includes(record.status);

      return (
        sameEmail &&
        activeStatus &&
        record.removed !== true
      );
    });

  if (existingRecord) {
    return existingRecord;
  }

  const initialSentAt =
    sentAt ||
    new Date().toISOString();

  const record = {
    id: crypto.randomUUID(),

    email:
      normalizedEmail,

    originalSubject:
      String(subject || '').trim(),

    initialMessageId:
      messageId,

    initialSentAt,

    lastMessageId:
      messageId,

    sentMessageIds: [
      messageId
    ],

    status:
      'INITIAL_SENT',

    followUpCount: 0,

    followUp1MessageId: '',

    followUp1SentAt: null,

    followUp2MessageId: '',

    followUp2SentAt: null,

    replyReceived: false,

    replyDate: null,

    replyFrom: '',

    replySubject: '',

    replyMessageId: '',

    replyDetectionMethod: '',

    removed: false,

    removedAt: null,

    removedReason: '',

    stopReason: '',

    lastError: '',

    createdAt:
      initialSentAt,

    updatedAt:
      initialSentAt
  };

  records.push(record);

  saveRecords(records);

  console.log(
    `Follow-up tracker record saved for ${normalizedEmail}`
  );

  return record;
}

function applyDetectedReplies(
  records,
  replies
) {
  const replyMap =
    new Map(
      replies.map(reply => [
        reply.trackerId,
        reply
      ])
    );

  return records.map(record => {
    const reply =
      replyMap.get(record.id);

    if (!reply) {
      return record;
    }

    return {
      ...record,

      status: 'REPLIED',

      replyReceived: true,

      replyDate:
        reply.replyDate,

      replyFrom:
        reply.replyFrom,

      replySubject:
        reply.replySubject,

      replyMessageId:
        reply.replyMessageId,

      replyDetectionMethod:
        reply.detectionMethod,

      lastError: '',

      updatedAt:
        new Date().toISOString()
    };
  });
}

function isFollowUp1Eligible(
  record
) {
  return (
    record.status ===
      'INITIAL_SENT' &&
    record.replyReceived !== true &&
    record.removed !== true &&
    Boolean(
      record.initialMessageId
    )
  );
}

function isFollowUp2Eligible(
  record
) {
  return (
    record.status ===
      'FOLLOWUP_1_SENT' &&
    Number(
      record.followUpCount
    ) === 1 &&
    record.replyReceived !== true &&
    record.removed !== true &&
    Boolean(
      record.followUp1MessageId
    )
  );
}

function isSameLocalDay(
  dateValue,
  comparisonDate = new Date()
) {
  if (!dateValue) {
    return false;
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  return (
    date.getFullYear() ===
      comparisonDate.getFullYear() &&
    date.getMonth() ===
      comparisonDate.getMonth() &&
    date.getDate() ===
      comparisonDate.getDate()
  );
}

function calculateDailyUsage(
  records,
  template
) {
  const followUp1SentToday =
    records.filter(record =>
      isSameLocalDay(
        record.followUp1SentAt
      )
    ).length;

  const followUp2SentToday =
    records.filter(record =>
      isSameLocalDay(
        record.followUp2SentAt
      )
    ).length;

  const followUp1DailyLimit =
    Number(
      template.followUp1DailyLimit ||
      25
    );

  const followUp2DailyLimit =
    Number(
      template.followUp2DailyLimit ||
      15
    );

  return {
    followUp1: {
      sentToday:
        followUp1SentToday,

      dailyLimit:
        followUp1DailyLimit,

      remaining:
        Math.max(
          0,
          followUp1DailyLimit -
          followUp1SentToday
        )
    },

    followUp2: {
      sentToday:
        followUp2SentToday,

      dailyLimit:
        followUp2DailyLimit,

      remaining:
        Math.max(
          0,
          followUp2DailyLimit -
          followUp2SentToday
        )
    }
  };
}

function groupRecords(
  records = readRecords()
) {
  return {
    followUp1Eligible:
      records.filter(
        isFollowUp1Eligible
      ),

    followUp2Eligible:
      records.filter(
        isFollowUp2Eligible
      ),

    replied:
      records.filter(record => {
        return (
          record.status ===
          'REPLIED'
        );
      }),

    completed:
      records.filter(record => {
        return (
          record.status ===
            'FOLLOWUP_2_SENT' ||
          record.status ===
            'COMPLETED'
        );
      }),

    stopped:
      records.filter(record => {
        return (
          record.status ===
          'STOPPED'
        );
      }),

    removed:
      records.filter(record => {
        return (
          record.removed === true ||
          record.status ===
            'REMOVED'
        );
      }),

    failed:
      records.filter(record => {
        return String(
          record.status || ''
        ).endsWith('_FAILED');
      })
  };
}

function getTemplates() {
  const template =
    readTemplate();

  return {
    followUp1Body:
      template.followUp1Body ||
      '',

    followUp2Body:
      template.followUp2Body ||
      '',

    followUp1DailyLimit:
      Number(
        template.followUp1DailyLimit ||
        25
      ),

    followUp2DailyLimit:
      Number(
        template.followUp2DailyLimit ||
        15
      )
  };
}

function getPageData() {
  const records =
    readRecords();

  const template =
    readTemplate();

  return {
    templates:
      getTemplates(),

    dailyUsage:
      calculateDailyUsage(
        records,
        template
      ),

    ...groupRecords(records)
  };
}

function saveFollowUpTemplates(
  payload = {}
) {
  const followUp1Body =
    String(
      payload.followUp1Body ||
      ''
    ).trim();

  const followUp2Body =
    String(
      payload.followUp2Body ||
      ''
    ).trim();

  const followUp1DailyLimit =
    Number(
      payload.followUp1DailyLimit
    );

  const followUp2DailyLimit =
    Number(
      payload.followUp2DailyLimit
    );

  if (!followUp1Body) {
    throw new Error(
      'Follow-Up 1 body is required.'
    );
  }

  if (!followUp2Body) {
    throw new Error(
      'Follow-Up 2 body is required.'
    );
  }

  if (
    !Number.isFinite(
      followUp1DailyLimit
    ) ||
    followUp1DailyLimit < 1
  ) {
    throw new Error(
      'Follow-Up 1 daily limit must be at least 1.'
    );
  }

  if (
    !Number.isFinite(
      followUp2DailyLimit
    ) ||
    followUp2DailyLimit < 1
  ) {
    throw new Error(
      'Follow-Up 2 daily limit must be at least 1.'
    );
  }

  return saveTemplate({
    followUp1Body,

    followUp2Body,

    followUp1DailyLimit:
      Math.floor(
        followUp1DailyLimit
      ),

    followUp2DailyLimit:
      Math.floor(
        followUp2DailyLimit
      )
  });
}

async function refreshReplies() {
  let records =
    readRecords();

  const activeRecords =
    records.filter(record => {
      return (
        record.removed !== true &&
        record.status !==
          'REMOVED'
      );
    });

  const detectedReplies =
    await checkReplies(
      activeRecords
    );

  records =
    applyDetectedReplies(
      records,
      detectedReplies
    );

  saveRecords(records);

  return {
    repliesFound:
      detectedReplies.length,

    pageData:
      getPageData()
  };
}

function validateEligibility(
  record,
  stage
) {
  if (!record) {
    return {
      eligible: false,

      reason:
        'Tracker record was not found.'
    };
  }

  if (
    record.removed === true ||
    record.status === 'REMOVED'
  ) {
    return {
      eligible: false,

      reason:
        'Record was removed from follow-up tracking.'
    };
  }

  if (
    record.replyReceived === true ||
    record.status === 'REPLIED'
  ) {
    return {
      eligible: false,

      reason:
        'Recipient has already replied.'
    };
  }

  if (
    record.status === 'STOPPED'
  ) {
    return {
      eligible: false,

      reason:
        'Follow-up was stopped manually.'
    };
  }

  if (stage === 1) {
    if (
      record.status !==
      'INITIAL_SENT'
    ) {
      return {
        eligible: false,

        reason:
          'Follow-Up 1 is not allowed for the current status.'
      };
    }

    if (
      !record.initialMessageId
    ) {
      return {
        eligible: false,

        reason:
          'Original Message-ID is missing.'
      };
    }

    return {
      eligible: true,
      reason: ''
    };
  }

  if (stage === 2) {
    if (
      record.status !==
        'FOLLOWUP_1_SENT' ||
      Number(
        record.followUpCount
      ) !== 1
    ) {
      return {
        eligible: false,

        reason:
          'Follow-Up 2 is allowed only after Follow-Up 1.'
      };
    }

    if (
      !record.followUp1MessageId
    ) {
      return {
        eligible: false,

        reason:
          'Follow-Up 1 Message-ID is missing.'
      };
    }

    return {
      eligible: true,
      reason: ''
    };
  }

  return {
    eligible: false,

    reason:
      'Invalid follow-up stage.'
  };
}

function buildThreadSubject(
  record
) {
  const originalSubject =
    String(
      record.originalSubject ||
      ''
    ).trim();

  if (!originalSubject) {
    throw new Error(
      'Original email subject is missing.'
    );
  }

  if (
    /^re\s*:/i.test(
      originalSubject
    )
  ) {
    return originalSubject;
  }

  return `Re: ${originalSubject}`;
}

function buildReferences(
  record,
  stage
) {
  const referenceIds = [
    ...(
      record.sentMessageIds ||
      []
    ),

    record.initialMessageId
  ];

  if (stage === 2) {
    referenceIds.push(
      record.followUp1MessageId
    );
  }

  return [
    ...new Set(
      referenceIds.filter(Boolean)
    )
  ];
}

async function sendFollowUpStage(
  stage,
  trackerIds
) {
  if (![1, 2].includes(stage)) {
    throw new Error(
      'Invalid follow-up stage.'
    );
  }

  if (
    !Array.isArray(trackerIds) ||
    trackerIds.length === 0
  ) {
    throw new Error(
      'Select at least one email.'
    );
  }

  let records =
    readRecords();

  /*
   * Check replies immediately before
   * sending any follow-up.
   */
  const activeRecords =
    records.filter(record => {
      return (
        record.removed !== true &&
        record.status !==
          'REMOVED'
      );
    });

  const detectedReplies =
    await checkReplies(
      activeRecords
    );

  records =
    applyDetectedReplies(
      records,
      detectedReplies
    );

  saveRecords(records);

  const template =
    readTemplate();

  const dailyUsage =
    calculateDailyUsage(
      records,
      template
    );

  const availableLimit =
    stage === 1
      ? dailyUsage.followUp1.remaining
      : dailyUsage.followUp2.remaining;

  if (availableLimit <= 0) {
    throw new Error(
      `Follow-Up ${stage} daily limit has already been reached.`
    );
  }

  const selectedBody =
    stage === 1
      ? template.followUp1Body
      : template.followUp2Body;

  const body =
    String(
      selectedBody || ''
    ).trim();

  if (!body) {
    throw new Error(
      `Follow-Up ${stage} body is empty.`
    );
  }

  const uniqueTrackerIds = [
    ...new Set(trackerIds)
  ];

  const idsAllowedToday =
    uniqueTrackerIds.slice(
      0,
      availableLimit
    );

  const idsOverDailyLimit =
    uniqueTrackerIds.slice(
      availableLimit
    );

  const resultSummary = {
    sent: [],

    skipped:
      idsOverDailyLimit.map(id => {
        const record =
          records.find(
            item =>
              item.id === id
          );

        return {
          id,

          email:
            record?.email ||
            '',

          reason:
            `Follow-Up ${stage} daily limit reached.`
        };
      }),

    failed: [],

    replied:
      detectedReplies.map(
        reply =>
          reply.trackerId
      )
  };

  for (
    const trackerId of
    idsAllowedToday
  ) {
    const recordIndex =
      records.findIndex(
        record =>
          record.id ===
          trackerId
      );

    const record =
      records[recordIndex];

    const validation =
      validateEligibility(
        record,
        stage
      );

    if (!validation.eligible) {
      resultSummary.skipped.push({
        id: trackerId,

        email:
          record?.email ||
          '',

        reason:
          validation.reason
      });

      continue;
    }

    try {
      const subject =
        buildThreadSubject(
          record
        );

      const parentMessageId =
        stage === 1
          ? record.initialMessageId
          : record.followUp1MessageId;

      const references =
        buildReferences(
          record,
          stage
        );

      const sendResult =
        await sendEmail(
          record.email,
          template,
          {
            isFollowUp: true,

            subject,

            body,

            parentMessageId,

            references
          }
        );

      if (
        sendResult.status !==
        'SENT'
      ) {
        throw new Error(
          sendResult.reason ||
          `Follow-Up ${stage} was not sent.`
        );
      }

      if (
        !sendResult.messageId
      ) {
        throw new Error(
          `Follow-Up ${stage} was sent, but Gmail did not return a Message-ID.`
        );
      }

      const sentAt =
        new Date().toISOString();

      const sentMessageIds = [
        ...new Set([
          ...(
            record.sentMessageIds ||
            []
          ),

          sendResult.messageId
        ])
      ];

      if (stage === 1) {
        records[recordIndex] = {
          ...record,

          status:
            'FOLLOWUP_1_SENT',

          followUpCount: 1,

          followUp1MessageId:
            sendResult.messageId,

          followUp1SentAt:
            sentAt,

          lastMessageId:
            sendResult.messageId,

          sentMessageIds,

          lastError: '',

          updatedAt:
            sentAt
        };
      } else {
        records[recordIndex] = {
          ...record,

          status:
            'FOLLOWUP_2_SENT',

          followUpCount: 2,

          followUp2MessageId:
            sendResult.messageId,

          followUp2SentAt:
            sentAt,

          lastMessageId:
            sendResult.messageId,

          sentMessageIds,

          lastError: '',

          updatedAt:
            sentAt
        };
      }

      /*
       * Save immediately after every
       * successful follow-up.
       */
      saveRecords(records);

      resultSummary.sent.push({
        id: trackerId,

        email:
          record.email,

        stage,

        messageId:
          sendResult.messageId
      });
    } catch (error) {
      /*
       * Keep the original status so the
       * email can be selected and retried.
       */
      if (recordIndex >= 0) {
        records[recordIndex] = {
          ...records[recordIndex],

          lastError:
            error.message,

          updatedAt:
            new Date().toISOString()
        };

        saveRecords(records);
      }

      resultSummary.failed.push({
        id: trackerId,

        email:
          record?.email ||
          '',

        reason:
          error.message
      });
    }
  }

  return {
    ...resultSummary,

    pageData:
      getPageData()
  };
}

function removeFollowUpRecords(
  trackerIds,
  reason =
    'Removed manually'
) {
  if (
    !Array.isArray(trackerIds) ||
    trackerIds.length === 0
  ) {
    throw new Error(
      'Select at least one email to remove.'
    );
  }

  const records =
    readRecords();

  const removalIds =
    new Set(trackerIds);

  const removedAt =
    new Date().toISOString();

  let removedCount = 0;

  const updatedRecords =
    records.map(record => {
      if (
        !removalIds.has(
          record.id
        )
      ) {
        return record;
      }

      removedCount += 1;

      return {
        ...record,

        status: 'REMOVED',

        removed: true,

        removedAt,

        removedReason:
          String(reason || '')
            .trim() ||
          'Removed manually',

        updatedAt:
          removedAt
      };
    });

  saveRecords(
    updatedRecords
  );

  return {
    removedCount,

    pageData:
      getPageData()
  };
}

function restoreFollowUpRecord(
  trackerId
) {
  const records =
    readRecords();

  const recordIndex =
    records.findIndex(
      record =>
        record.id ===
        trackerId
    );

  if (recordIndex === -1) {
    return null;
  }

  const record =
    records[recordIndex];

  let restoredStatus =
    'INITIAL_SENT';

  if (
    record.followUp1SentAt &&
    !record.followUp2SentAt
  ) {
    restoredStatus =
      'FOLLOWUP_1_SENT';
  }

  if (
    record.followUp2SentAt
  ) {
    restoredStatus =
      'FOLLOWUP_2_SENT';
  }

  if (
    record.replyReceived
  ) {
    restoredStatus =
      'REPLIED';
  }

  records[recordIndex] = {
    ...record,

    status:
      restoredStatus,

    removed: false,

    removedAt: null,

    removedReason: '',

    updatedAt:
      new Date().toISOString()
  };

  saveRecords(records);

  return records[recordIndex];
}

module.exports = {
  createFollowUpRecord,
  getPageData,
  refreshReplies,
  saveFollowUpTemplates,
  sendFollowUpStage,
  removeFollowUpRecords,
  restoreFollowUpRecord
};