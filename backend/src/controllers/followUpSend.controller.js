const {
  sendFollowUp1,
  sendFollowUp2
} = require(
  '../services/followUpSender.service'
);

async function sendFirstFollowUp(
  req,
  res
) {
  try {
    const result =
      await sendFollowUp1(
        req.user.id,
        req.params.id
      );

    return res.json({
      message:
        result.message,

      source:
        'POSTGRESQL',

      status:
        result.status,

      followUp:
        result.tracker
    });
  } catch (error) {
    console.error(
      'Follow-Up 1 sending failed:',
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

async function sendSecondFollowUp(
  req,
  res
) {
  try {
    const result =
      await sendFollowUp2(
        req.user.id,
        req.params.id
      );

    return res.json({
      message:
        result.message,

      source:
        'POSTGRESQL',

      status:
        result.status,

      followUp:
        result.tracker
    });
  } catch (error) {
    console.error(
      'Follow-Up 2 sending failed:',
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
  sendFirstFollowUp,
  sendSecondFollowUp
};