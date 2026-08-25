const {
  getDatabaseTemplate
} = require(
  './databaseTemplate.service'
);

const {
  getFollowUpRecords
} = require(
  './databaseFollowUp.service'
);

const {
  sendFollowUp1,
  sendFollowUp2
} = require(
  './followUpSender.service'
);

const {
  countSentEmailsToday
} = require(
  './sentEmail.service'
);

/*
 * One in-memory Follow-Up batch state
 * is maintained for each logged-in user.
 *
 * Redis and BullMQ can replace this
 * in-memory state later.
 */
const followUpBatchStates =
  new Map();

const BATCH_TYPES = {
  FOLLOW_UP_1:
    'FOLLOW_UP_1',

  FOLLOW_UP_2:
    'FOLLOW_UP_2'
};

function createInitialBatchState() {
  return {
    status:
      'IDLE',

    batchType:
      '',

    selected:
      0,

    processed:
      0,

    sent:
      0,

    dryRun:
      0,

    failed:
      0,

    skipped:
      0,

    currentEmail:
      '',

    dailyLimit:
      0,

    sentToday:
      0,

    remainingCapacity:
      0,

    eligibleCount:
      0,

    startedAt:
      '',

    completedAt:
      '',

    stopRequested:
      false,

    message:
      '',

    failures:
      []
  };
}

function requireUserId(
  userId
) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function normalizeBatchType(
  value
) {
  const batchType =
    String(
      value || ''
    )
      .trim()
      .toUpperCase();

  if (
    batchType !==
      BATCH_TYPES.FOLLOW_UP_1 &&
    batchType !==
      BATCH_TYPES.FOLLOW_UP_2
  ) {
    throw new Error(
      'Invalid Follow-Up batch type.'
    );
  }

  return batchType;
}

function normalizePositiveInteger(
  value,
  fallbackValue
) {
  const parsedValue =
    Number(value);

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    parsedValue < 1
  ) {
    return fallbackValue;
  }

  return Math.floor(
    parsedValue
  );
}

function getMutableBatchState(
  userId
) {
  requireUserId(
    userId
  );

  if (
    !followUpBatchStates.has(
      userId
    )
  ) {
    followUpBatchStates.set(
      userId,
      createInitialBatchState()
    );
  }

  return followUpBatchStates.get(
    userId
  );
}

function getFollowUpBatchState(
  userId
) {
  const state =
    getMutableBatchState(
      userId
    );

  return {
    ...state,

    failures: [
      ...state.failures
    ]
  };
}

function isBatchActive(
  state
) {
  return (
    state.status ===
      'STARTING' ||
    state.status ===
      'RUNNING' ||
    state.status ===
      'STOPPING'
  );
}

function resetFollowUpBatchState(
  userId
) {
  requireUserId(
    userId
  );

  const currentState =
    getMutableBatchState(
      userId
    );

  if (
    isBatchActive(
      currentState
    )
  ) {
    throw new Error(
      'Cannot reset while a Follow-Up batch is active.'
    );
  }

  const newState =
    createInitialBatchState();

  followUpBatchStates.set(
    userId,
    newState
  );

  return {
    ...newState,

    failures: []
  };
}

function requestFollowUpBatchStop(
  userId
) {
  const state =
    getMutableBatchState(
      userId
    );

  if (
    !isBatchActive(
      state
    )
  ) {
    state.message =
      'Follow-Up batch is not running.';

    return {
      ...state,

      failures: [
        ...state.failures
      ]
    };
  }

  state.stopRequested =
    true;

  state.status =
    'STOPPING';

  state.message =
    'Stop requested. The batch will stop before the next recipient.';

  return {
    ...state,

    failures: [
      ...state.failures
    ]
  };
}

function parseDate(
  value
) {
  if (!value) {
    return null;
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return parsedDate;
}

function getRecordSortDate(
  record,
  batchType
) {
  if (
    batchType ===
    BATCH_TYPES.FOLLOW_UP_2
  ) {
    return (
      parseDate(
        record.followUp1SentAt
      ) ||
      parseDate(
        record.updatedAt
      ) ||
      parseDate(
        record.initialSentAt
      )
    );
  }

  return (
    parseDate(
      record.initialSentAt
    ) ||
    parseDate(
      record.createdAt
    )
  );
}

function sortEligibleRecords(
  records,
  batchType
) {
  return [
    ...records
  ].sort(
    (
      firstRecord,
      secondRecord
    ) => {
      const firstDate =
        getRecordSortDate(
          firstRecord,
          batchType
        );

      const secondDate =
        getRecordSortDate(
          secondRecord,
          batchType
        );

      /*
       * Process older records first.
       */
      return (
        (
          firstDate?.getTime() ||
          0
        ) -
        (
          secondDate?.getTime() ||
          0
        )
      );
    }
  );
}

function isBaseRecordEligible(
  record
) {
  if (
    !record ||
    typeof record !==
      'object'
  ) {
    return false;
  }

  if (
    record.removed ===
    true
  ) {
    return false;
  }

  if (
    record.stopped ===
    true
  ) {
    return false;
  }

  if (
    record.replyDetected ===
    true
  ) {
    return false;
  }

  if (
    !String(
      record.initialMessageId ||
      ''
    ).trim()
  ) {
    return false;
  }

  if (
    !String(
      record.recipientEmail ||
      record.email ||
      ''
    ).trim()
  ) {
    return false;
  }

  return true;
}

function isFollowUp1Eligible(
  record
) {
  if (
    !isBaseRecordEligible(
      record
    )
  ) {
    return false;
  }

  return !String(
    record.followUp1MessageId ||
    ''
  ).trim();
}

function isFollowUp2Eligible(
  record
) {
  if (
    !isBaseRecordEligible(
      record
    )
  ) {
    return false;
  }

  const followUp1Sent =
    Boolean(
      String(
        record.followUp1MessageId ||
        ''
      ).trim()
    );

  const followUp2Sent =
    Boolean(
      String(
        record.followUp2MessageId ||
        ''
      ).trim()
    );

  return (
    followUp1Sent &&
    !followUp2Sent
  );
}

function filterEligibleRecords(
  records,
  batchType
) {
  if (
    !Array.isArray(
      records
    )
  ) {
    return [];
  }

  const eligibleRecords =
    records.filter(
      record => {
        if (
          batchType ===
          BATCH_TYPES.FOLLOW_UP_1
        ) {
          return isFollowUp1Eligible(
            record
          );
        }

        return isFollowUp2Eligible(
          record
        );
      }
    );

  return sortEligibleRecords(
    eligibleRecords,
    batchType
  );
}

function getTemplateDailyLimit(
  template,
  batchType
) {
  if (
    batchType ===
    BATCH_TYPES.FOLLOW_UP_1
  ) {
    return normalizePositiveInteger(
      template
        .followUp1DailyLimit,
      25
    );
  }

  return normalizePositiveInteger(
    template
      .followUp2DailyLimit,
    15
  );
}

async function getFollowUpEligibility(
  userId
) {
  requireUserId(
    userId
  );

  const [
    template,
    records,
    followUp1SentToday,
    followUp2SentToday
  ] = await Promise.all([
    getDatabaseTemplate(
      userId
    ),

    getFollowUpRecords(
      userId,
      {
        includeRemoved:
          true,

        includeStopped:
          true,

        limit:
          500
      }
    ),

    countSentEmailsToday(
      userId,
      BATCH_TYPES.FOLLOW_UP_1
    ),

    countSentEmailsToday(
      userId,
      BATCH_TYPES.FOLLOW_UP_2
    )
  ]);

  const followUp1Eligible =
    filterEligibleRecords(
      records,
      BATCH_TYPES.FOLLOW_UP_1
    );

  const followUp2Eligible =
    filterEligibleRecords(
      records,
      BATCH_TYPES.FOLLOW_UP_2
    );

  const followUp1DailyLimit =
    getTemplateDailyLimit(
      template,
      BATCH_TYPES.FOLLOW_UP_1
    );

  const followUp2DailyLimit =
    getTemplateDailyLimit(
      template,
      BATCH_TYPES.FOLLOW_UP_2
    );

  const followUp1Remaining =
    Math.max(
      0,
      followUp1DailyLimit -
      followUp1SentToday
    );

  const followUp2Remaining =
    Math.max(
      0,
      followUp2DailyLimit -
      followUp2SentToday
    );

  return {
    source:
      'POSTGRESQL',

    dryRun:
      template.dryRun ===
      true,

    followUp1: {
      eligibleCount:
        followUp1Eligible.length,

      dailyLimit:
        followUp1DailyLimit,

      sentToday:
        followUp1SentToday,

      remainingCapacity:
        followUp1Remaining,

      selectableCount:
        Math.min(
          followUp1Eligible.length,
          followUp1Remaining
        )
    },

    followUp2: {
      eligibleCount:
        followUp2Eligible.length,

      dailyLimit:
        followUp2DailyLimit,

      sentToday:
        followUp2SentToday,

      remainingCapacity:
        followUp2Remaining,

      selectableCount:
        Math.min(
          followUp2Eligible.length,
          followUp2Remaining
        )
    }
  };
}

async function sendTrackerFollowUp(
  userId,
  trackerId,
  batchType
) {
  if (
    batchType ===
    BATCH_TYPES.FOLLOW_UP_1
  ) {
    return sendFollowUp1(
      userId,
      trackerId
    );
  }

  return sendFollowUp2(
    userId,
    trackerId
  );
}

async function startFollowUpBatch(
  userId,
  requestedBatchType
) {
  requireUserId(
    userId
  );

  const batchType =
    normalizeBatchType(
      requestedBatchType
    );

  const existingState =
    getMutableBatchState(
      userId
    );

  if (
    isBatchActive(
      existingState
    )
  ) {
    throw new Error(
      'A Follow-Up batch is already active for this user.'
    );
  }

  const state = {
    ...createInitialBatchState(),

    status:
      'STARTING',

    batchType,

    startedAt:
      new Date()
        .toISOString(),

    message:
      'Loading eligible Follow-Up records from PostgreSQL.'
  };

  followUpBatchStates.set(
    userId,
    state
  );

  try {
    const [
      template,
      records
    ] = await Promise.all([
      getDatabaseTemplate(
        userId
      ),

      getFollowUpRecords(
        userId,
        {
          includeRemoved:
            true,

          includeStopped:
            true,

          limit:
            500
        }
      )
    ]);

    const eligibleRecords =
      filterEligibleRecords(
        records,
        batchType
      );

    const dailyLimit =
      getTemplateDailyLimit(
        template,
        batchType
      );

    const sentToday =
      await countSentEmailsToday(
        userId,
        batchType
      );

    const remainingCapacity =
      Math.max(
        0,
        dailyLimit -
        sentToday
      );

    const selectedRecords =
      eligibleRecords.slice(
        0,
        remainingCapacity
      );

    state.eligibleCount =
      eligibleRecords.length;

    state.dailyLimit =
      dailyLimit;

    state.sentToday =
      sentToday;

    state.remainingCapacity =
      remainingCapacity;

    state.selected =
      selectedRecords.length;

    if (
      state.stopRequested
    ) {
      state.status =
        'STOPPED';

      state.completedAt =
        new Date()
          .toISOString();

      state.message =
        'Follow-Up batch was stopped before processing started.';

      return {
        ...state,

        failures: [
          ...state.failures
        ]
      };
    }

    if (
      eligibleRecords.length ===
      0
    ) {
      state.status =
        'COMPLETED';

      state.completedAt =
        new Date()
          .toISOString();

      state.message =
        `No eligible ${batchType} records are available.`;

      return {
        ...state,

        failures: []
      };
    }

    if (
      remainingCapacity ===
      0
    ) {
      state.status =
        'COMPLETED';

      state.completedAt =
        new Date()
          .toISOString();

      state.message =
        `The daily limit for ${batchType} has already been reached.`;

      return {
        ...state,

        failures: []
      };
    }

    state.status =
      'RUNNING';

    state.message =
      `Processing ${selectedRecords.length} ${batchType} record(s).`;

    for (
      let index = 0;
      index <
        selectedRecords.length;
      index++
    ) {
      if (
        state.stopRequested
      ) {
        state.status =
          'STOPPING';

        state.message =
          'Follow-Up batch stopped before the next recipient.';

        break;
      }

      const record =
        selectedRecords[index];

      const recipientEmail =
        record.recipientEmail ||
        record.email ||
        '';

      state.currentEmail =
        recipientEmail;

      state.message =
        `Processing ${index + 1} of ${selectedRecords.length}: ${recipientEmail}`;

      try {
        const result =
          await sendTrackerFollowUp(
            userId,
            record.id,
            batchType
          );

        state.processed +=
          1;

        if (
          result.status ===
          'SENT'
        ) {
          state.sent +=
            1;
        } else if (
          result.status ===
          'DRY_RUN'
        ) {
          state.dryRun +=
            1;
        } else {
          state.skipped +=
            1;
        }
      } catch (error) {
        state.processed +=
          1;

        state.failed +=
          1;

        state.failures.push({
          trackerId:
            record.id,

          recipientEmail,

          message:
            error.message ||
            'Unknown Follow-Up sending error.'
        });

        console.error(
          `${batchType} batch failed for ${recipientEmail}:`,
          error.message
        );
      }
    }

    state.currentEmail =
      '';

    state.completedAt =
      new Date()
        .toISOString();

    if (
      state.stopRequested
    ) {
      state.status =
        'STOPPED';

      state.message =
        `Follow-Up batch stopped safely. Sent: ${state.sent}, Dry Run: ${state.dryRun}, Failed: ${state.failed}`;
    } else {
      state.status =
        'COMPLETED';

      state.message =
        `Follow-Up batch completed. Sent: ${state.sent}, Dry Run: ${state.dryRun}, Failed: ${state.failed}, Skipped: ${state.skipped}`;
    }

    return {
      ...state,

      failures: [
        ...state.failures
      ]
    };
  } catch (error) {
    state.status =
      'FAILED';

    state.currentEmail =
      '';

    state.completedAt =
      new Date()
        .toISOString();

    state.message =
      error.message ||
      'Follow-Up batch failed.';

    throw error;
  }
}

function removeFollowUpBatchState(
  userId
) {
  requireUserId(
    userId
  );

  const state =
    getMutableBatchState(
      userId
    );

  if (
    isBatchActive(
      state
    )
  ) {
    throw new Error(
      'Cannot remove Follow-Up batch state while a batch is active.'
    );
  }

  followUpBatchStates.delete(
    userId
  );

  return createInitialBatchState();
}

module.exports = {
  BATCH_TYPES,
  createInitialBatchState,
  normalizeBatchType,
  getFollowUpBatchState,
  resetFollowUpBatchState,
  requestFollowUpBatchStop,
  filterEligibleRecords,
  isFollowUp1Eligible,
  isFollowUp2Eligible,
  getFollowUpEligibility,
  startFollowUpBatch,
  removeFollowUpBatchState
};