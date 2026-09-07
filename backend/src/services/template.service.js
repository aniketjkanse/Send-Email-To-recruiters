const fs = require('fs');
const crypto = require('crypto');

const {
  EMAIL_TEMPLATE_FILE
} = require('../utils/path.util');

const {
  readJson,
  writeJson
} = require('../utils/file.util');

const {
  getResumeInfo
} = require('./resume.service');

/*
 * Base field defaults for a single template. The saved file may contain
 * many templates (see the store shape below); every one of them is
 * merged over these defaults when read.
 */
const defaultTemplate = {
  name: 'Default',

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

/*
 * Saved file shape:
 *
 *   {
 *     "activeTemplateId": "default",
 *     "templates": [ { "id": "...", "name": "...", ...fields } ]
 *   }
 *
 * A legacy file (a single flat template object with no "templates"
 * array) is migrated to this shape on first read.
 */

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function makeId(name) {
  const base =
    slugify(name) || 'template';

  return `${base}-${crypto
    .randomBytes(3)
    .toString('hex')}`;
}

/*
 * Merge one raw template over a base template and coerce every field to
 * a safe value. Also clamps maxDelaySeconds to be >= minDelaySeconds.
 */
function normalizeTemplate(
  raw = {},
  base = defaultTemplate
) {
  const merged = {
    ...base,
    ...raw
  };

  const normalized = {
    id:
      String(
        raw.id ||
        base.id ||
        makeId(merged.name)
      ),

    name:
      String(
        merged.name || 'Untitled'
      ).trim() || 'Untitled',

    subject:
      String(merged.subject || ''),

    body:
      String(merged.body || ''),

    followUp1Body:
      String(merged.followUp1Body || ''),

    followUp2Body:
      String(merged.followUp2Body || ''),

    dailyLimit:
      toSafeNumber(
        merged.dailyLimit,
        base.dailyLimit,
        1
      ),

    followUp1DailyLimit:
      toSafeNumber(
        merged.followUp1DailyLimit,
        base.followUp1DailyLimit,
        1
      ),

    followUp2DailyLimit:
      toSafeNumber(
        merged.followUp2DailyLimit,
        base.followUp2DailyLimit,
        1
      ),

    resumeFileName:
      String(merged.resumeFileName || ''),

    minDelaySeconds:
      toSafeNumber(
        merged.minDelaySeconds,
        base.minDelaySeconds,
        0
      ),

    maxDelaySeconds:
      toSafeNumber(
        merged.maxDelaySeconds,
        base.maxDelaySeconds,
        0
      ),

    stopAfterContinuousFailures:
      toSafeNumber(
        merged.stopAfterContinuousFailures,
        base.stopAfterContinuousFailures,
        1
      ),

    stopAfterTotalFailures:
      toSafeNumber(
        merged.stopAfterTotalFailures,
        base.stopAfterTotalFailures,
        1
      ),

    skipPersonalEmails:
      toBoolean(
        merged.skipPersonalEmails,
        base.skipPersonalEmails
      ),

    dryRun:
      toBoolean(
        merged.dryRun,
        base.dryRun
      ),

    blockedDomains:
      normalizeBlockedDomains(
        merged.blockedDomains,
        base.blockedDomains
      )
  };

  if (
    normalized.maxDelaySeconds <
    normalized.minDelaySeconds
  ) {
    normalized.maxDelaySeconds =
      normalized.minDelaySeconds;
  }

  return normalized;
}

/*
 * Turn whatever is on disk into a valid multi-template store.
 */
function buildStore(raw) {
  if (
    raw &&
    Array.isArray(raw.templates) &&
    raw.templates.length
  ) {
    const templates =
      raw.templates.map((template, index) =>
        normalizeTemplate({
          ...template,

          id:
            template.id ||
            makeId(
              template.name ||
              `template-${index + 1}`
            )
        })
      );

    const activeTemplateId =
      templates.some(
        template =>
          template.id ===
          raw.activeTemplateId
      )
        ? raw.activeTemplateId
        : templates[0].id;

    return {
      activeTemplateId,
      templates
    };
  }

  /*
   * Legacy flat template (or a missing / empty file) becomes a single
   * template with a stable "default" id.
   */
  const legacyTemplate =
    normalizeTemplate({
      ...(raw || {}),

      id: 'default',

      name:
        (raw && raw.name) || 'Default'
    });

  return {
    activeTemplateId: 'default',
    templates: [legacyTemplate]
  };
}

function readStore() {
  const raw =
    fs.existsSync(EMAIL_TEMPLATE_FILE)
      ? readJson(
          EMAIL_TEMPLATE_FILE,
          null
        )
      : null;

  const store = buildStore(raw);

  /*
   * Persist when the file was missing or still in the legacy shape so
   * later reads are cheap and consistent.
   */
  const needsWrite =
    !raw ||
    !Array.isArray(raw.templates) ||
    !raw.activeTemplateId;

  if (needsWrite) {
    writeJson(
      EMAIL_TEMPLATE_FILE,
      store
    );
  }

  return store;
}

function writeStore(store) {
  writeJson(
    EMAIL_TEMPLATE_FILE,
    store
  );

  return store;
}

function getActiveTemplate(store) {
  return (
    store.templates.find(
      template =>
        template.id ===
        store.activeTemplateId
    ) || store.templates[0]
  );
}

/*
 * Flat, backward-compatible view of the active template. Every existing
 * consumer (scheduler, mail service, preview, follow-ups) reads this.
 */
function annotateResume(template) {
  const info = getResumeInfo(template.id);

  return {
    ...template,

    hasResume: info.uploaded,

    resumeOwn: info.own,

    resumeName: info.originalName || ''
  };
}

function readTemplate() {
  const store = readStore();
  const active =
    getActiveTemplate(store);

  return {
    ...annotateResume(active),

    templateId: active.id,

    activeTemplateId:
      store.activeTemplateId
  };
}

function listTemplates() {
  const store = readStore();

  return {
    activeTemplateId:
      store.activeTemplateId,

    templates:
      store.templates.map(annotateResume)
  };
}

/*
 * Save a patch onto a template. Targets patch.id when given, otherwise
 * the active template. Partial patches are supported (follow-up screen
 * only sends follow-up fields).
 */
function saveTemplate(
  patch = {}
) {
  const store = readStore();

  const targetId =
    (patch && patch.id) ||
    store.activeTemplateId;

  let index =
    store.templates.findIndex(
      template =>
        template.id === targetId
    );

  if (index < 0) {
    index =
      store.templates.findIndex(
        template =>
          template.id ===
          store.activeTemplateId
      );
  }

  if (index < 0) {
    index = 0;
  }

  const current =
    store.templates[index];

  const merged =
    normalizeTemplate(
      {
        ...current,
        ...patch,

        id: current.id,

        name:
          patch.name !== undefined
            ? patch.name
            : current.name
      },
      current
    );

  store.templates[index] = merged;
  writeStore(store);

  return {
    ...merged,

    templateId: merged.id,

    activeTemplateId:
      store.activeTemplateId
  };
}

function createTemplate(
  input = {}
) {
  const store = readStore();

  const name =
    String(
      input.name || 'New Template'
    ).trim() || 'New Template';

  const source =
    store.templates.find(
      template =>
        template.id ===
        input.copyFromId
    ) || getActiveTemplate(store);

  const created =
    normalizeTemplate(
      {
        ...source,

        id: makeId(name),

        name
      },
      source
    );

  store.templates.push(created);
  store.activeTemplateId =
    created.id;

  writeStore(store);

  return listTemplates();
}

function deleteTemplate(id) {
  const store = readStore();

  if (store.templates.length <= 1) {
    throw new Error(
      'Cannot delete the last remaining template.'
    );
  }

  if (
    !store.templates.some(
      template =>
        template.id === id
    )
  ) {
    throw new Error(
      'Template not found.'
    );
  }

  store.templates =
    store.templates.filter(
      template =>
        template.id !== id
    );

  if (
    store.activeTemplateId === id
  ) {
    store.activeTemplateId =
      store.templates[0].id;
  }

  writeStore(store);

  return listTemplates();
}

function setActiveTemplate(id) {
  const store = readStore();

  if (
    !store.templates.some(
      template =>
        template.id === id
    )
  ) {
    throw new Error(
      'Template not found.'
    );
  }

  if (id !== store.activeTemplateId) {
    /*
     * Lazy require avoids a circular load with scheduler.service.
     * Switching template switches the whole mailing workspace, so it
     * must not happen while a send batch is in progress.
     */
    let schedulerStatus = 'IDLE';

    try {
      schedulerStatus =
        require('./scheduler.service')
          .getState().status;
    } catch (error) {
      schedulerStatus = 'IDLE';
    }

    if (
      schedulerStatus === 'RUNNING' ||
      schedulerStatus === 'STOPPING'
    ) {
      const conflict = new Error(
        'The scheduler is still sending. Stop it before switching templates.'
      );

      conflict.statusCode = 409;

      throw conflict;
    }
  }

  store.activeTemplateId = id;
  writeStore(store);

  return listTemplates();
}

module.exports = {
  readTemplate,
  saveTemplate,
  listTemplates,
  createTemplate,
  deleteTemplate,
  setActiveTemplate,
  defaultTemplate
};
