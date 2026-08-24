const {
  runScheduler,
  getState,
  resetState,
  requestStop
} = require(
  '../services/scheduler.service'
);

async function startScheduler(
  req,
  res
) {
  const userId =
    req.user.id;

  try {
    const currentState =
      getState(userId);

    if (
      currentState.status ===
        'RUNNING' ||
      currentState.status ===
        'STOPPING'
    ) {
      return res
        .status(409)
        .json({
          message:
            'Your scheduler is already running.',

          state:
            currentState
        });
    }

    /*
     * Start without waiting for the entire
     * email batch to complete.
     */
    runScheduler(userId)
      .catch(error => {
        console.error(
          `Scheduler failed for user ${userId}:`,
          error
        );
      });

    return res
      .status(202)
      .json({
        message:
          'Scheduler started.',

        state:
          getState(userId)
      });
  } catch (error) {
    console.error(
      `Unable to start scheduler for user ${userId}:`,
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

function getSchedulerStatus(
  req,
  res
) {
  try {
    const state =
      getState(
        req.user.id
      );

    return res.json({
      userId:
        req.user.id,

      state
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

function stopScheduler(
  req,
  res
) {
  try {
    const state =
      requestStop(
        req.user.id
      );

    return res.json({
      message:
        state.message,

      state
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

function resetScheduler(
  req,
  res
) {
  try {
    const state =
      resetState(
        req.user.id
      );

    return res.json({
      message:
        'Your scheduler state was reset.',

      state
    });
  } catch (error) {
    return res
      .status(409)
      .json({
        message:
          error.message,

        state:
          getState(
            req.user.id
          )
      });
  }
}

module.exports = {
  startScheduler,
  getSchedulerStatus,
  stopScheduler,
  resetScheduler
};