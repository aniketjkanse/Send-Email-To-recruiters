const {
  getPageData,
  refreshReplies,
  saveFollowUpTemplates,
  sendFollowUpStage,
  removeFollowUpRecords,
  restoreFollowUpRecord
} = require(
  '../services/followup.service'
);

function getFollowUpPage(
  req,
  res
) {
  try {
    return res.json(
      getPageData()
    );
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          error.message
      });
  }
}

async function checkReplies(
  req,
  res
) {
  try {
    const result =
      await refreshReplies();

    return res.json({
      message:
        'Reply check completed.',

      ...result
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          `Reply check failed: ${error.message}`
      });
  }
}

function saveTemplates(
  req,
  res
) {
  try {
    const template =
      saveFollowUpTemplates(
        req.body || {}
      );

    return res.json({
      message:
        'Follow-up settings saved.',

      template
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

async function sendFollowUp1(
  req,
  res
) {
  try {
    const result =
      await sendFollowUpStage(
        1,
        req.body?.trackerIds
      );

    return res.json({
      message:
        'Follow-Up 1 processing completed.',

      ...result
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

async function sendFollowUp2(
  req,
  res
) {
  try {
    const result =
      await sendFollowUpStage(
        2,
        req.body?.trackerIds
      );

    return res.json({
      message:
        'Follow-Up 2 processing completed.',

      ...result
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

function removeRecords(
  req,
  res
) {
  try {
    const result =
      removeFollowUpRecords(
        req.body?.trackerIds,
        req.body?.reason
      );

    return res.json({
      message:
        `${result.removedCount} record(s) removed from follow-up tracking.`,

      ...result
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

function restoreRecord(
  req,
  res
) {
  try {
    const record =
      restoreFollowUpRecord(
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
      message:
        'Follow-up record restored.',

      record
    });
  } catch (error) {
    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

module.exports = {
  getFollowUpPage,
  checkReplies,
  saveTemplates,
  sendFollowUp1,
  sendFollowUp2,
  removeRecords,
  restoreRecord
};