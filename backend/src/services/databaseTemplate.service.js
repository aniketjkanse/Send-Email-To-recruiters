const {
  prisma
} = require('../config/prisma');

const defaultTemplate = {
  subject:
    'Application for QA Automation Engineer Role',

  body: [
    'Hi,',
    '',
    'I wanted to share my profile for suitable QA Automation opportunities.',
    '',
    'Please find my resume attached for your reference.',
    '',
    'Thanks'
  ].join('\n'),

  followUp1Body: [
    'Dear Sir/Madam,',
    '',
    'I wanted to follow up on my previous email regarding suitable opportunities.',
    '',
    'I remain interested and would appreciate any update regarding my profile.',
    '',
    'Thank you for your time and consideration.',
    '',
    'Best Regards'
  ].join('\n'),

  followUp2Body: [
    'Dear Sir/Madam,',
    '',
    'I am writing one final follow-up regarding my previous email.',
    '',
    'Please consider my profile if a suitable opportunity is available.',
    '',
    'Thank you for your time.',
    '',
    'Best Regards'
  ].join('\n'),

  dailyLimit: 100,
  followUp1DailyLimit: 25,
  followUp2DailyLimit: 15,
  minDelaySeconds: 180,
  maxDelaySeconds: 420,
  skipPersonalEmails: true,
  dryRun: true
};

function toSafeNumber(
  value,
  fallbackValue,
  minimumValue = 0
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallbackValue;
  }

  const convertedValue =
    Number(value);

  if (
    !Number.isFinite(convertedValue) ||
    convertedValue < minimumValue
  ) {
    return fallbackValue;
  }

  return Math.floor(convertedValue);
}

function toBoolean(
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

function mapTemplateResponse(
  template
) {
  return {
    id:
      template.id,

    userId:
      template.userId,

    subject:
      template.subject,

    body:
      template.body,

    followUp1Body:
      template.followUp1Body || '',

    followUp2Body:
      template.followUp2Body || '',

    dailyLimit:
      template.dailyLimit,

    followUp1DailyLimit:
      template.followUp1DailyLimit,

    followUp2DailyLimit:
      template.followUp2DailyLimit,

    minDelaySeconds:
      template.minDelaySeconds,

    maxDelaySeconds:
      template.maxDelaySeconds,

    skipPersonalEmails:
      template.skipPersonalEmails,

    dryRun:
      template.dryRun,

    createdAt:
      template.createdAt,

    updatedAt:
      template.updatedAt
  };
}

async function verifyUser(
  userId
) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId
      },

      select: {
        id: true,
        isActive: true
      }
    });

  if (!user) {
    throw new Error(
      'User account was not found.'
    );
  }

  if (user.isActive !== true) {
    throw new Error(
      'User account is inactive.'
    );
  }

  return user;
}

async function getDatabaseTemplate(
  userId
) {
  await verifyUser(userId);

  let template =
    await prisma.emailTemplate.findFirst({
      where: {
        userId
      },

      orderBy: {
        createdAt: 'asc'
      }
    });

  /*
   * Register already creates a template.
   * This fallback handles old users or
   * manually created database records.
   */
  if (!template) {
    template =
      await prisma.emailTemplate.create({
        data: {
          userId,

          ...defaultTemplate
        }
      });
  }

  return mapTemplateResponse(
    template
  );
}

async function saveDatabaseTemplate(
  userId,
  input = {}
) {
  await verifyUser(userId);

  let currentTemplate =
    await prisma.emailTemplate.findFirst({
      where: {
        userId
      },

      orderBy: {
        createdAt: 'asc'
      }
    });

  if (!currentTemplate) {
    currentTemplate =
      await prisma.emailTemplate.create({
        data: {
          userId,

          ...defaultTemplate
        }
      });
  }

  const current =
    mapTemplateResponse(
      currentTemplate
    );

  const subject =
    input.subject !== undefined
      ? String(input.subject).trim()
      : current.subject;

  const body =
    input.body !== undefined
      ? String(input.body)
      : current.body;

  const followUp1Body =
    input.followUp1Body !== undefined
      ? String(input.followUp1Body)
      : current.followUp1Body;

  const followUp2Body =
    input.followUp2Body !== undefined
      ? String(input.followUp2Body)
      : current.followUp2Body;

  if (!subject) {
    throw new Error(
      'Template subject is required.'
    );
  }

  if (!body.trim()) {
    throw new Error(
      'Initial email body is required.'
    );
  }

  const dailyLimit =
    toSafeNumber(
      input.dailyLimit,
      current.dailyLimit,
      1
    );

  const followUp1DailyLimit =
    toSafeNumber(
      input.followUp1DailyLimit,
      current.followUp1DailyLimit,
      1
    );

  const followUp2DailyLimit =
    toSafeNumber(
      input.followUp2DailyLimit,
      current.followUp2DailyLimit,
      1
    );

  const minDelaySeconds =
    toSafeNumber(
      input.minDelaySeconds,
      current.minDelaySeconds,
      0
    );

  let maxDelaySeconds =
    toSafeNumber(
      input.maxDelaySeconds,
      current.maxDelaySeconds,
      0
    );

  if (
    maxDelaySeconds <
    minDelaySeconds
  ) {
    maxDelaySeconds =
      minDelaySeconds;
  }

  const skipPersonalEmails =
    toBoolean(
      input.skipPersonalEmails,
      current.skipPersonalEmails
    );

  const dryRun =
    toBoolean(
      input.dryRun,
      current.dryRun
    );

  const updatedTemplate =
    await prisma.emailTemplate.update({
      where: {
        id:
          currentTemplate.id
      },

      data: {
        subject,
        body,
        followUp1Body,
        followUp2Body,
        dailyLimit,
        followUp1DailyLimit,
        followUp2DailyLimit,
        minDelaySeconds,
        maxDelaySeconds,
        skipPersonalEmails,
        dryRun
      }
    });

  return mapTemplateResponse(
    updatedTemplate
  );
}

async function resetDatabaseTemplate(
  userId
) {
  await verifyUser(userId);

  const currentTemplate =
    await prisma.emailTemplate.findFirst({
      where: {
        userId
      }
    });

  let template;

  if (currentTemplate) {
    template =
      await prisma.emailTemplate.update({
        where: {
          id:
            currentTemplate.id
        },

        data:
          defaultTemplate
      });
  } else {
    template =
      await prisma.emailTemplate.create({
        data: {
          userId,

          ...defaultTemplate
        }
      });
  }

  return mapTemplateResponse(
    template
  );
}

module.exports = {
  defaultTemplate,
  getDatabaseTemplate,
  saveDatabaseTemplate,
  resetDatabaseTemplate
};