const {
  buildEmailPreview
} = require(
  '../services/emailFilter.service'
);

const {
  getDatabaseTemplate
} = require(
  '../services/databaseTemplate.service'
);

async function getPreview(
  req,
  res
) {
  try {
    const userId =
      req.user.id;

    const template =
      await getDatabaseTemplate(
        userId
      );

    /*
     * buildEmailPreview is now asynchronous
     * and requires userId.
     */
    const preview =
      await buildEmailPreview(
        userId,
        template
      );

    return res.json({
      ...preview,

      source:
        'POSTGRESQL',

      templateOwnerId:
        userId,

      template: {
        id:
          template.id,

        subject:
          template.subject,

        body:
          template.body,

        dailyLimit:
          template.dailyLimit,

        minDelaySeconds:
          template.minDelaySeconds,

        maxDelaySeconds:
          template.maxDelaySeconds,

        skipPersonalEmails:
          template.skipPersonalEmails,

        dryRun:
          template.dryRun
      }
    });
  } catch (error) {
    console.error(
      'Unable to generate PostgreSQL preview:',
      error.message
    );

    return res
      .status(500)
      .json({
        message:
          `Unable to generate preview: ${error.message}`
      });
  }
}

module.exports = {
  getPreview
};