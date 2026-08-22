const fs = require('fs');

const {
  EMAIL_TEMPLATE_FILE
} = require('../utils/path.util');

const {
  readJson,
  writeJson
} = require('../utils/file.util');

const defaultTemplate = {
  subject:
    'Application for QA Automation Engineer Role',

  body: [
    'Hi,',
    '',
    'I came across your job post and wanted to share my profile for suitable QA / Automation Testing roles.',
    '',
    'I have experience in Selenium, Java, Cucumber BDD, API Automation, Rest Assured, TestNG, Git, Jenkins/Azure DevOps, and automation framework development.',
    '',
    'Please find my resume attached for your reference.',
    '',
    'If this is not relevant, please ignore this email.',
    '',
    'Thanks,',
    'Aniket Kanse'
  ].join('\n'),

  followUp1Body: [
    'Dear Sir/Madam,',
    '',
    'I hope you are doing well.',
    '',
    'I wanted to follow up on my previous email regarding suitable opportunities.',
    '',
    'I remain interested and would appreciate any update regarding my profile.',
    '',
    'Thank you for your time and consideration.',
    '',
    'Best Regards,',
    'Aniket Kanse'
  ].join('\n'),

  followUp2Body: [
    'Dear Sir/Madam,',
    '',
    'I hope you are doing well.',
    '',
    'I am writing one final follow-up regarding my earlier email.',
    '',
    'Please consider my profile if a suitable opportunity is available now or in the future.',
    '',
    'Thank you for your time and consideration.',
    '',
    'Best Regards,',
    'Aniket Kanse'
  ].join('\n'),

  /*
   * Initial email daily limit.
   */
  dailyLimit: 100,

  /*
   * Separate follow-up limits.
   */
  followUp1DailyLimit: 25,

  followUp2DailyLimit: 15,

  resumeFileName:
    'Aniket_Kanse_Resume.pdf',

  minDelaySeconds: 180,

  maxDelaySeconds: 420,

  stopAfterContinuousFailures: 3,

  stopAfterTotalFailures: 8,

  skipPersonalEmails: true,

  dryRun: true,

  blockedDomains: [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'rediffmail.com',
    'icloud.com',
    'protonmail.com'
  ]
};

function readTemplate() {
  if (
    !fs.existsSync(
      EMAIL_TEMPLATE_FILE
    )
  ) {
    writeJson(
      EMAIL_TEMPLATE_FILE,
      defaultTemplate
    );

    return {
      ...defaultTemplate
    };
  }

  const savedTemplate =
    readJson(
      EMAIL_TEMPLATE_FILE,
      defaultTemplate
    );

  return {
    ...defaultTemplate,
    ...savedTemplate,

    blockedDomains:
      Array.isArray(
        savedTemplate.blockedDomains
      )
        ? savedTemplate.blockedDomains
        : defaultTemplate.blockedDomains
  };
}

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

  return Math.floor(
    convertedValue
  );
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

function normalizeBlockedDomains(
  blockedDomains,
  currentBlockedDomains
) {
  if (
    !Array.isArray(
      blockedDomains
    )
  ) {
    return currentBlockedDomains;
  }

  return [
    ...new Set(
      blockedDomains
        .map(domain =>
          String(domain || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    )
  ];
}

function saveTemplate(
  template = {}
) {
  const current =
    readTemplate();

  const updated = {
    ...current,
    ...template,

    subject:
      template.subject !== undefined
        ? String(template.subject)
        : current.subject,

    body:
      template.body !== undefined
        ? String(template.body)
        : current.body,

    followUp1Body:
      template.followUp1Body !== undefined
        ? String(
            template.followUp1Body
          )
        : current.followUp1Body,

    followUp2Body:
      template.followUp2Body !== undefined
        ? String(
            template.followUp2Body
          )
        : current.followUp2Body,

    dailyLimit:
      toSafeNumber(
        template.dailyLimit,
        current.dailyLimit,
        1
      ),

    followUp1DailyLimit:
      toSafeNumber(
        template.followUp1DailyLimit,
        current.followUp1DailyLimit,
        1
      ),

    followUp2DailyLimit:
      toSafeNumber(
        template.followUp2DailyLimit,
        current.followUp2DailyLimit,
        1
      ),

    minDelaySeconds:
      toSafeNumber(
        template.minDelaySeconds,
        current.minDelaySeconds,
        0
      ),

    maxDelaySeconds:
      toSafeNumber(
        template.maxDelaySeconds,
        current.maxDelaySeconds,
        0
      ),

    stopAfterContinuousFailures:
      toSafeNumber(
        template.stopAfterContinuousFailures,
        current.stopAfterContinuousFailures,
        1
      ),

    stopAfterTotalFailures:
      toSafeNumber(
        template.stopAfterTotalFailures,
        current.stopAfterTotalFailures,
        1
      ),

    skipPersonalEmails:
      toBoolean(
        template.skipPersonalEmails,
        current.skipPersonalEmails
      ),

    dryRun:
      toBoolean(
        template.dryRun,
        current.dryRun
      ),

    blockedDomains:
      normalizeBlockedDomains(
        template.blockedDomains,
        current.blockedDomains
      )
  };

  if (
    updated.maxDelaySeconds <
    updated.minDelaySeconds
  ) {
    updated.maxDelaySeconds =
      updated.minDelaySeconds;
  }

  writeJson(
    EMAIL_TEMPLATE_FILE,
    updated
  );

  return updated;
}

module.exports = {
  readTemplate,
  saveTemplate,
  defaultTemplate
};