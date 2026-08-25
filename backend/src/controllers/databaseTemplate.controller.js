const {
  getDatabaseTemplate,
  saveDatabaseTemplate,
  resetDatabaseTemplate
} = require(
  '../services/databaseTemplate.service'
);

async function getTemplate(
  req,
  res
) {
  try {
    const template =
      await getDatabaseTemplate(
        req.user.id
      );

    return res.json({
      source:
        'POSTGRESQL',

      template
    });
  } catch (error) {
    console.error(
      'Unable to read PostgreSQL template:',
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

async function saveTemplate(
  req,
  res
) {
  try {
    const template =
      await saveDatabaseTemplate(
        req.user.id,
        req.body || {}
      );

    return res.json({
      message:
        'Template saved successfully in PostgreSQL.',

      source:
        'POSTGRESQL',

      template
    });
  } catch (error) {
    console.error(
      'Unable to save PostgreSQL template:',
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

async function resetTemplate(
  req,
  res
) {
  try {
    const template =
      await resetDatabaseTemplate(
        req.user.id
      );

    return res.json({
      message:
        'Template reset successfully.',

      source:
        'POSTGRESQL',

      template
    });
  } catch (error) {
    console.error(
      'Unable to reset PostgreSQL template:',
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

module.exports = {
  getTemplate,
  saveTemplate,
  resetTemplate
};
