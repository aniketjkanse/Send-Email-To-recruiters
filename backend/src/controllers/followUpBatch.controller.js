const {
  BATCH_TYPES,
  getFollowUpBatchState,
  resetFollowUpBatchState,
  requestFollowUpBatchStop,
  getFollowUpEligibility,
  startFollowUpBatch
} = require(
  '../services/followUpBatch.service'
);

function getAuthenticatedUserId(
  req
) {
  const userId =
    req.user?.id;

  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function isActiveBatchState(
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

function getErrorStatusCode(
  error
) {
  const message =
    String(
      error?.message ||
      ''
    );

  if (
    message.includes(
      'already active'
    ) ||
    message.includes(
      'Cannot reset'
    )
  ) {
    return 409;
  }

  return 400;
}

/*
 * GET /api/followup-send/eligibility
 *
 * Returns immediate eligibility and
 * remaining daily capacity for both
 * Follow-Up types.
 */
async function getEligibility(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const eligibility =
      await getFollowUpEligibility(
        userId
      );

    return res.json({
      message:
        'Follow-Up eligibility loaded successfully.',

      ...eligibility
    });
  } catch (error) {
    console.error(
      'Unable to load Follow-Up eligibility:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message ||
          'Unable to load Follow-Up eligibility.'
      });
  }
}

/*
 * Start a batch without making the HTTP
 * request wait for every recipient.
 *
 * startFollowUpBatch sets STARTING before
 * its first database await, so status is
 * available immediately after this call.
 */
function launchBatch(
  userId,
  batchType
) {
  const batchPromise =
    startFollowUpBatch(
      userId,
      batchType
    );

  batchPromise.catch(
    error => {
      console.error(
        `${batchType} background batch failed:`,
        error.message
      );
    }
  );
}

/*
 * POST
 * /api/followup-send/batch/follow-up-1
 */
async function startFollowUp1Batch(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const currentState =
      getFollowUpBatchState(
        userId
      );

    if (
      isActiveBatchState(
        currentState
      )
    ) {
      return res
        .status(409)
        .json({
          message:
            'A Follow-Up batch is already active for this user.',

          state:
            currentState
        });
    }

    launchBatch(
      userId,
      BATCH_TYPES
        .FOLLOW_UP_1
    );

    const startedState =
      getFollowUpBatchState(
        userId
      );

    return res
      .status(202)
      .json({
        message:
          'Follow-Up 1 batch started.',

        source:
          'POSTGRESQL',

        state:
          startedState
      });
  } catch (error) {
    console.error(
      'Unable to start Follow-Up 1 batch:',
      error.message
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        message:
          error.message ||
          'Unable to start Follow-Up 1 batch.'
      });
  }
}

/*
 * POST
 * /api/followup-send/batch/follow-up-2
 */
async function startFollowUp2Batch(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const currentState =
      getFollowUpBatchState(
        userId
      );

    if (
      isActiveBatchState(
        currentState
      )
    ) {
      return res
        .status(409)
        .json({
          message:
            'A Follow-Up batch is already active for this user.',

          state:
            currentState
        });
    }

    launchBatch(
      userId,
      BATCH_TYPES
        .FOLLOW_UP_2
    );

    const startedState =
      getFollowUpBatchState(
        userId
      );

    return res
      .status(202)
      .json({
        message:
          'Follow-Up 2 batch started.',

        source:
          'POSTGRESQL',

        state:
          startedState
      });
  } catch (error) {
    console.error(
      'Unable to start Follow-Up 2 batch:',
      error.message
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        message:
          error.message ||
          'Unable to start Follow-Up 2 batch.'
      });
  }
}

/*
 * GET
 * /api/followup-send/batch/status
 */
function getBatchStatus(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const state =
      getFollowUpBatchState(
        userId
      );

    return res.json({
      source:
        'IN_MEMORY_PER_USER',

      userId,

      state
    });
  } catch (error) {
    console.error(
      'Unable to read Follow-Up batch status:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message ||
          'Unable to read Follow-Up batch status.'
      });
  }
}

/*
 * POST
 * /api/followup-send/batch/stop
 */
function stopBatch(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const state =
      requestFollowUpBatchStop(
        userId
      );

    const statusCode =
      state.status ===
        'STOPPING'
        ? 202
        : 200;

    return res
      .status(statusCode)
      .json({
        message:
          state.message,

        source:
          'IN_MEMORY_PER_USER',

        state
      });
  } catch (error) {
    console.error(
      'Unable to stop Follow-Up batch:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message ||
          'Unable to stop Follow-Up batch.'
      });
  }
}

/*
 * POST
 * /api/followup-send/batch/reset
 */
function resetBatch(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const state =
      resetFollowUpBatchState(
        userId
      );

    return res.json({
      message:
        'Follow-Up batch state reset successfully.',

      source:
        'IN_MEMORY_PER_USER',

      state
    });
  } catch (error) {
    console.error(
      'Unable to reset Follow-Up batch:',
      error.message
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        message:
          error.message ||
          'Unable to reset Follow-Up batch.'
      });
  }
}

module.exports = {
  getEligibility,
  startFollowUp1Batch,
  startFollowUp2Batch,
  getBatchStatus,
  stopBatch,
  resetBatch
};