const {
  getFollowUpRecords,
  getFollowUpRecordById,
  getFollowUpSummary,
  markFollowUp1Sent,
  markFollowUp2Sent,
  markReplyDetected,
  markReplyCheckCompleted,
  setFollowUpError,
  removeFollowUpRecord,
  restoreFollowUpRecord,
  stopFollowUps,
  resumeFollowUps,
  deleteFollowUpRecord
} = require(
  '../services/databaseFollowUp.service'
);

function parseBoolean(
  value,
  fallbackValue
) {
  if (
    value === true ||
    value === 'true'
  ) {
    return true;
  }

  if (
    value === false ||
    value === 'false'
  ) {
    return false;
  }

  return fallbackValue;
}

async function getAllFollowUps(
  req,
  res
) {
  try {
    const records =
      await getFollowUpRecords(
        req.user.id,
        {
          status:
            req.query.status,

          includeRemoved:
            parseBoolean(
              req.query
                .includeRemoved,
              false
            ),

          includeStopped:
            parseBoolean(
              req.query
                .includeStopped,
              false
            ),

          replyDetected:
            req.query
              .replyDetected,

          limit:
            req.query.limit
        }
      );

    return res.json({
      source:
        'POSTGRESQL',

      total:
        records.length,

      followUps:
        records,

      records
    });
  } catch (error) {
    console.error(
      'Unable to load follow-up records:',
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

async function getFollowUpDetails(
  req,
  res
) {
  try {
    const record =
      await getFollowUpRecordById(
        req.user.id,
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'Follow-up record was not found.'
        });
    }

    return res.json({
      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to load follow-up record:',
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

async function getSummary(
  req,
  res
) {
  try {
    const summary =
      await getFollowUpSummary(
        req.user.id
      );

    return res.json({
      source:
        'POSTGRESQL',

      summary
    });
  } catch (error) {
    console.error(
      'Unable to load follow-up summary:',
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

async function completeFollowUp1(
  req,
  res
) {
  try {
    const record =
      await markFollowUp1Sent(
        req.user.id,
        req.params.id,
        {
          messageId:
            req.body
              ?.messageId,

          followUp1MessageId:
            req.body
              ?.followUp1MessageId,

          sentAt:
            req.body?.sentAt,

          followUp1SentAt:
            req.body
              ?.followUp1SentAt
        }
      );

    return res.json({
      message:
        'Follow-Up 1 marked as sent.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to mark Follow-Up 1 as sent:',
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

async function completeFollowUp2(
  req,
  res
) {
  try {
    const record =
      await markFollowUp2Sent(
        req.user.id,
        req.params.id,
        {
          messageId:
            req.body
              ?.messageId,

          followUp2MessageId:
            req.body
              ?.followUp2MessageId,

          sentAt:
            req.body?.sentAt,

          followUp2SentAt:
            req.body
              ?.followUp2SentAt
        }
      );

    return res.json({
      message:
        'Follow-Up 2 marked as sent.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to mark Follow-Up 2 as sent:',
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

async function saveDetectedReply(
  req,
  res
) {
  try {
    const record =
      await markReplyDetected(
        req.user.id,
        req.params.id,
        {
          replyMessageId:
            req.body
              ?.replyMessageId,

          messageId:
            req.body
              ?.messageId,

          replySubject:
            req.body
              ?.replySubject,

          subject:
            req.body?.subject,

          replyDate:
            req.body
              ?.replyDate
        }
      );

    return res.json({
      message:
        'Reply recorded successfully. Future follow-ups are stopped.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to record reply:',
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

async function completeReplyCheck(
  req,
  res
) {
  try {
    const record =
      await markReplyCheckCompleted(
        req.user.id,
        req.params.id
      );

    return res.json({
      message:
        'Reply check timestamp updated.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to update reply check:',
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

async function saveFollowUpError(
  req,
  res
) {
  try {
    const errorMessage =
      String(
        req.body
          ?.errorMessage ||
        req.body?.message ||
        ''
      ).trim();

    if (!errorMessage) {
      return res
        .status(400)
        .json({
          message:
            'Error message is required.'
        });
    }

    const record =
      await setFollowUpError(
        req.user.id,
        req.params.id,
        errorMessage
      );

    return res.json({
      message:
        'Follow-up error saved.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to save follow-up error:',
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

async function removeRecord(
  req,
  res
) {
  try {
    const record =
      await removeFollowUpRecord(
        req.user.id,
        req.params.id,
        req.body?.reason ||
        ''
      );

    return res.json({
      message:
        'Follow-up record removed successfully.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to remove follow-up record:',
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

async function restoreRecord(
  req,
  res
) {
  try {
    const record =
      await restoreFollowUpRecord(
        req.user.id,
        req.params.id
      );

    return res.json({
      message:
        'Follow-up record restored successfully.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to restore follow-up record:',
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

async function stopRecord(
  req,
  res
) {
  try {
    const record =
      await stopFollowUps(
        req.user.id,
        req.params.id,
        req.body?.reason ||
        'Stopped manually'
      );

    return res.json({
      message:
        'Future follow-ups stopped successfully.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to stop follow-ups:',
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

async function resumeRecord(
  req,
  res
) {
  try {
    const record =
      await resumeFollowUps(
        req.user.id,
        req.params.id
      );

    return res.json({
      message:
        'Follow-ups resumed successfully.',

      source:
        'POSTGRESQL',

      followUp:
        record,

      record
    });
  } catch (error) {
    console.error(
      'Unable to resume follow-ups:',
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

async function permanentlyDeleteRecord(
  req,
  res
) {
  try {
    const result =
      await deleteFollowUpRecord(
        req.user.id,
        req.params.id
      );

    if (!result.deleted) {
      return res
        .status(404)
        .json({
          message:
            'Follow-up record was not found.'
        });
    }

    return res.json({
      message:
        'Follow-up record permanently deleted.',

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to delete follow-up record:',
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

module.exports = {
  getAllFollowUps,
  getFollowUpDetails,
  getSummary,
  completeFollowUp1,
  completeFollowUp2,
  saveDetectedReply,
  completeReplyCheck,
  saveFollowUpError,
  removeRecord,
  restoreRecord,
  stopRecord,
  resumeRecord,
  permanentlyDeleteRecord
};