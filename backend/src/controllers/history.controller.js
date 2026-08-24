const {
  getHistory,
  getHistoryById,
  getHistorySummary,
  deleteHistoryRecord,
  clearHistory
} = require(
  '../services/databaseHistory.service'
);

async function getAllHistory(
  req,
  res
) {
  try {
    const records =
      await getHistory(
        req.user.id,
        {
          status:
            req.query.status,

          emailType:
            req.query.emailType,

          recipientEmail:
            req.query
              .recipientEmail,

          limit:
            req.query.limit
        }
      );

    return res.json({
      source:
        'POSTGRESQL',

      total:
        records.length,

      history:
        records
    });
  } catch (error) {
    console.error(
      'Unable to load history:',
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

async function getHistoryDetails(
  req,
  res
) {
  try {
    const record =
      await getHistoryById(
        req.user.id,
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'History record was not found.'
        });
    }

    return res.json({
      source:
        'POSTGRESQL',

      history:
        record
    });
  } catch (error) {
    console.error(
      'Unable to load history record:',
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
      await getHistorySummary(
        req.user.id
      );

    return res.json({
      source:
        'POSTGRESQL',

      summary
    });
  } catch (error) {
    console.error(
      'Unable to load history summary:',
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

async function removeHistoryRecord(
  req,
  res
) {
  try {
    const result =
      await deleteHistoryRecord(
        req.user.id,
        req.params.id
      );

    if (!result.deleted) {
      return res
        .status(404)
        .json({
          message:
            'History record was not found.'
        });
    }

    return res.json({
      message:
        'History record deleted successfully.',

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to delete history record:',
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

async function removeAllHistory(
  req,
  res
) {
  try {
    const result =
      await clearHistory(
        req.user.id
      );

    return res.json({
      message:
        `${result.deletedCount} history record(s) deleted.`,

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to clear history:',
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
  getAllHistory,
  getHistoryDetails,
  getSummary,
  removeHistoryRecord,
  removeAllHistory
};