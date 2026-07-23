const {
  runScheduler,
  getState,
  resetState,
  requestStop
} = require('../services/scheduler.service');

function startSending(req, res) {
  const currentState = getState();

  if (currentState.status === 'RUNNING' || currentState.status === 'STOPPING') {
    return res.status(409).json({
      message: 'Scheduler is already running',
      state: currentState
    });
  }

  runScheduler().catch(error => {
    console.error('Scheduler failed:', error.message);
  });

  return res.json({
    message: 'Scheduler started',
    state: getState()
  });
}

function stopSending(req, res) {
  const state = requestStop();

  return res.json({
    message: 'Stop request sent',
    state
  });
}

function getSendingStatus(req, res) {
  return res.json(getState());
}

function resetSendingStatus(req, res) {
  return res.json(resetState());
}

module.exports = {
  startSending,
  stopSending,
  getSendingStatus,
  resetSendingStatus
};