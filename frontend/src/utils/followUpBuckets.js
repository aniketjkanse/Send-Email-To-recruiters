const BUCKET_TYPES = {
  FOLLOW_UP_1: 'FOLLOW_UP_1',
  FOLLOW_UP_2: 'FOLLOW_UP_2',
  COMPLETED: 'COMPLETED',
  REPLIED: 'REPLIED',
  STOPPED: 'STOPPED',
  REMOVED: 'REMOVED'
};

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function hasValue(value) {
  return Boolean(
    String(value || '').trim()
  );
}

function parseDate(value) {
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

function getLocalDateKey(value) {
  const date =
    parseDate(value);

  if (!date) {
    return 'NO_DATE';
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatBucketDate(value) {
  const date =
    parseDate(value);

  if (!date) {
    return 'Date Not Available';
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  );
}

function formatDateTime(value) {
  const date =
    parseDate(value);

  if (!date) {
    return 'Not available';
  }

  return date.toLocaleString();
}

function getRecordBucket(record) {
  if (
    !record ||
    typeof record !== 'object'
  ) {
    return null;
  }

  if (record.removed === true) {
    return BUCKET_TYPES.REMOVED;
  }

  if (
    record.replyDetected === true
  ) {
    return BUCKET_TYPES.REPLIED;
  }

  if (record.stopped === true) {
    return BUCKET_TYPES.STOPPED;
  }

  const followUp1Sent =
    hasValue(
      record.followUp1MessageId
    );

  const followUp2Sent =
    hasValue(
      record.followUp2MessageId
    );

  if (followUp2Sent) {
    return BUCKET_TYPES.COMPLETED;
  }

  if (followUp1Sent) {
    return BUCKET_TYPES.FOLLOW_UP_2;
  }

  return BUCKET_TYPES.FOLLOW_UP_1;
}

function getBucketDateValue(
  record,
  bucketType
) {
  switch (bucketType) {
    case BUCKET_TYPES.FOLLOW_UP_1:
      return (
        record.initialSentAt ||
        record.sentAt ||
        record.createdAt
      );

    case BUCKET_TYPES.FOLLOW_UP_2:
      return (
        record.followUp1SentAt ||
        record.updatedAt ||
        record.initialSentAt
      );

    case BUCKET_TYPES.COMPLETED:
      return (
        record.followUp2SentAt ||
        record.updatedAt ||
        record.initialSentAt
      );

    case BUCKET_TYPES.REPLIED:
      return (
        record.replyDate ||
        record.updatedAt ||
        record.initialSentAt
      );

    case BUCKET_TYPES.STOPPED:
      return (
        record.stoppedAt ||
        record.updatedAt ||
        record.initialSentAt
      );

    case BUCKET_TYPES.REMOVED:
      return (
        record.removedAt ||
        record.updatedAt ||
        record.initialSentAt
      );

    default:
      return (
        record.updatedAt ||
        record.createdAt
      );
  }
}

function groupRecordsByDate(
  records,
  bucketType
) {
  const groupedRecords =
    new Map();

  safeArray(records).forEach(
    record => {
      const dateValue =
        getBucketDateValue(
          record,
          bucketType
        );

      const dateKey =
        getLocalDateKey(
          dateValue
        );

      if (
        !groupedRecords.has(
          dateKey
        )
      ) {
        groupedRecords.set(
          dateKey,
          {
            key: dateKey,
            dateValue,
            label:
              formatBucketDate(
                dateValue
              ),
            records: []
          }
        );
      }

      groupedRecords
        .get(dateKey)
        .records
        .push(record);
    }
  );

  return [
    ...groupedRecords.values()
  ]
    .map(group => {
      const sortedRecords = [
        ...group.records
      ].sort(
        (
          firstRecord,
          secondRecord
        ) => {
          const firstDate =
            parseDate(
              getBucketDateValue(
                firstRecord,
                bucketType
              )
            );

          const secondDate =
            parseDate(
              getBucketDateValue(
                secondRecord,
                bucketType
              )
            );

          return (
            (
              secondDate?.getTime() ||
              0
            ) -
            (
              firstDate?.getTime() ||
              0
            )
          );
        }
      );

      return {
        ...group,
        count:
          sortedRecords.length,
        records:
          sortedRecords
      };
    })
    .sort(
      (
        firstGroup,
        secondGroup
      ) => {
        if (
          firstGroup.key ===
          'NO_DATE'
        ) {
          return 1;
        }

        if (
          secondGroup.key ===
          'NO_DATE'
        ) {
          return -1;
        }

        return secondGroup.key
          .localeCompare(
            firstGroup.key
          );
      }
    );
}

function buildFollowUpBuckets(
  records
) {
  const buckets = {
    [BUCKET_TYPES.FOLLOW_UP_1]:
      [],

    [BUCKET_TYPES.FOLLOW_UP_2]:
      [],

    [BUCKET_TYPES.COMPLETED]:
      [],

    [BUCKET_TYPES.REPLIED]:
      [],

    [BUCKET_TYPES.STOPPED]:
      [],

    [BUCKET_TYPES.REMOVED]:
      []
  };

  safeArray(records).forEach(
    record => {
      const bucketType =
        getRecordBucket(record);

      if (
        bucketType &&
        buckets[bucketType]
      ) {
        buckets[
          bucketType
        ].push(record);
      }
    }
  );

  return {
    followUp1:
      groupRecordsByDate(
        buckets[
          BUCKET_TYPES
            .FOLLOW_UP_1
        ],
        BUCKET_TYPES
          .FOLLOW_UP_1
      ),

    followUp2:
      groupRecordsByDate(
        buckets[
          BUCKET_TYPES
            .FOLLOW_UP_2
        ],
        BUCKET_TYPES
          .FOLLOW_UP_2
      ),

    completed:
      groupRecordsByDate(
        buckets[
          BUCKET_TYPES
            .COMPLETED
        ],
        BUCKET_TYPES
          .COMPLETED
      ),

    replied:
      groupRecordsByDate(
        buckets[
          BUCKET_TYPES
            .REPLIED
        ],
        BUCKET_TYPES
          .REPLIED
      ),

    stopped:
      groupRecordsByDate(
        buckets[
          BUCKET_TYPES
            .STOPPED
        ],
        BUCKET_TYPES
          .STOPPED
      ),

    removed:
      groupRecordsByDate(
        buckets[
          BUCKET_TYPES
            .REMOVED
        ],
        BUCKET_TYPES
          .REMOVED
      ),

    counts: {
      followUp1:
        buckets[
          BUCKET_TYPES
            .FOLLOW_UP_1
        ].length,

      followUp2:
        buckets[
          BUCKET_TYPES
            .FOLLOW_UP_2
        ].length,

      completed:
        buckets[
          BUCKET_TYPES
            .COMPLETED
        ].length,

      replied:
        buckets[
          BUCKET_TYPES
            .REPLIED
        ].length,

      stopped:
        buckets[
          BUCKET_TYPES
            .STOPPED
        ].length,

      removed:
        buckets[
          BUCKET_TYPES
            .REMOVED
        ].length
    }
  };
}

function getBucketRecords(
  bucketGroups
) {
  return safeArray(
    bucketGroups
  ).flatMap(group => {
    return safeArray(
      group.records
    );
  });
}

/*
 * This is a frontend Vite module,
 * so use ES module exports.
 *
 * Do not use module.exports here.
 */
export {
  BUCKET_TYPES,
  safeArray,
  hasValue,
  parseDate,
  getLocalDateKey,
  formatBucketDate,
  formatDateTime,
  getRecordBucket,
  getBucketDateValue,
  groupRecordsByDate,
  buildFollowUpBuckets,
  getBucketRecords
};