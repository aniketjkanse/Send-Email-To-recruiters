const {
  getRecipientEmails
} = require(
  './recipient.service'
);

const {
  getSentRecipientEmails
} = require(
  './sentEmail.service'
);

const DEFAULT_BLOCKED_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'rediffmail.com',
  'icloud.com',
  'protonmail.com'
];

function requireUserId(userId) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  const normalizedEmail =
    normalizeEmail(email);

  const emailPattern =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  return emailPattern.test(
    normalizedEmail
  );
}

function getDomain(email) {
  const normalizedEmail =
    normalizeEmail(email);

  const atIndex =
    normalizedEmail
      .lastIndexOf('@');

  if (atIndex === -1) {
    return '';
  }

  return normalizedEmail
    .slice(
      atIndex + 1
    )
    .trim();
}

function normalizeBlockedDomains(
  blockedDomains
) {
  if (
    !Array.isArray(
      blockedDomains
    ) ||
    blockedDomains.length === 0
  ) {
    return [
      ...DEFAULT_BLOCKED_DOMAINS
    ];
  }

  return [
    ...new Set(
      blockedDomains
        .map(domain => {
          return String(
            domain || ''
          )
            .trim()
            .toLowerCase();
        })
        .filter(Boolean)
    )
  ];
}

function isBlockedDomain(
  email,
  blockedDomains =
    DEFAULT_BLOCKED_DOMAINS
) {
  const domain =
    getDomain(email);

  if (!domain) {
    return false;
  }

  const normalizedBlockedDomains =
    normalizeBlockedDomains(
      blockedDomains
    );

  return normalizedBlockedDomains
    .includes(domain);
}

/*
 * PostgreSQL-based email preview.
 *
 * This function is asynchronous because:
 *
 * 1. Recipients come from Recipient table.
 * 2. Previously sent addresses come from
 *    SentEmail table.
 * 3. Both queries are filtered by userId.
 */
async function buildEmailPreview(
  userId,
  template = {}
) {
  requireUserId(userId);

  const [
    recipientEmails,
    sentRecipientEmails
  ] = await Promise.all([
    getRecipientEmails(
      userId
    ),

    getSentRecipientEmails(
      userId,
      'INITIAL'
    )
  ]);

  const normalizedRecipientEmails =
    Array.isArray(
      recipientEmails
    )
      ? recipientEmails
          .map(normalizeEmail)
          .filter(Boolean)
      : [];

  const normalizedSentEmails =
    Array.isArray(
      sentRecipientEmails
    )
      ? sentRecipientEmails
          .map(normalizeEmail)
          .filter(Boolean)
      : [];

  const uniqueInputEmails = [
    ...new Set(
      normalizedRecipientEmails
    )
  ];

  const sentEmailSet =
    new Set(
      normalizedSentEmails
    );

  const blockedDomains =
    normalizeBlockedDomains(
      template.blockedDomains
    );

  const skipPersonalEmails =
    template.skipPersonalEmails !==
    false;

  const newEmails = [];

  const alreadySentEmails = [];

  const blockedEmails = [];

  const invalidEmails = [];

  uniqueInputEmails.forEach(
    email => {
      if (
        !isValidEmail(email)
      ) {
        invalidEmails.push(
          email
        );

        return;
      }

      if (
        skipPersonalEmails &&
        isBlockedDomain(
          email,
          blockedDomains
        )
      ) {
        blockedEmails.push(
          email
        );

        return;
      }

      if (
        sentEmailSet.has(email)
      ) {
        alreadySentEmails.push(
          email
        );

        return;
      }

      newEmails.push(
        email
      );
    }
  );

  return {
    totalInput:
      normalizedRecipientEmails.length,

    uniqueInput:
      uniqueInputEmails.length,

    newEmails,

    alreadySentEmails,

    blockedEmails,

    invalidEmails,

    counts: {
      totalInput:
        normalizedRecipientEmails.length,

      uniqueInput:
        uniqueInputEmails.length,

      newEmails:
        newEmails.length,

      alreadySentEmails:
        alreadySentEmails.length,

      blockedEmails:
        blockedEmails.length,

      invalidEmails:
        invalidEmails.length
    },

    dataSource: {
      recipients:
        'POSTGRESQL',

      sentEmails:
        'POSTGRESQL',

      template:
        'POSTGRESQL'
    }
  };
}

module.exports = {
  DEFAULT_BLOCKED_DOMAINS,
  normalizeEmail,
  isValidEmail,
  getDomain,
  normalizeBlockedDomains,
  isBlockedDomain,
  buildEmailPreview
};