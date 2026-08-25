const {
  ImapFlow
} = require('imapflow');

const {
  getSenderCredentials
} = require(
  './senderAccount.service'
);

function requireUserId(
  userId
) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function normalizeEmail(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}

function normalizeMessageId(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .replace(
      /^<|>$/g,
      ''
    )
    .toLowerCase();
}

function normalizeSubject(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .replace(
      /^(re|fw|fwd)\s*:\s*/i,
      ''
    )
    .trim()
    .toLowerCase();
}

function parseDate(
  value
) {
  if (!value) {
    return null;
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return parsedDate;
}

function getAddressFromEnvelope(
  addressList
) {
  if (
    !Array.isArray(
      addressList
    ) ||
    addressList.length === 0
  ) {
    return '';
  }

  return normalizeEmail(
    addressList[0]?.address
  );
}

function getHeaderValue(
  rawHeaders,
  headerName
) {
  const normalizedHeaders =
    String(
      rawHeaders || ''
    ).replace(
      /\r?\n[ \t]+/g,
      ' '
    );

  const pattern =
    new RegExp(
      `^${headerName}\\s*:\\s*(.+)$`,
      'im'
    );

  const match =
    normalizedHeaders.match(
      pattern
    );

  return String(
    match?.[1] || ''
  ).trim();
}

function extractMessageIds(
  value
) {
  const text =
    String(
      value || ''
    );

  const bracketMatches =
    text.match(
      /<[^<>]+>/g
    );

  if (
    Array.isArray(
      bracketMatches
    ) &&
    bracketMatches.length > 0
  ) {
    return [
      ...new Set(
        bracketMatches
          .map(
            normalizeMessageId
          )
          .filter(Boolean)
      )
    ];
  }

  const normalizedValue =
    normalizeMessageId(
      text
    );

  if (!normalizedValue) {
    return [];
  }

  return [
    normalizedValue
  ];
}

function buildTrackedMessageIdSet(
  tracker
) {
  const messageIds = [
    tracker
      ?.initialMessageId,

    tracker
      ?.followUp1MessageId,

    tracker
      ?.followUp2MessageId
  ];

  return new Set(
    messageIds
      .map(
        normalizeMessageId
      )
      .filter(Boolean)
  );
}

function getLatestTrackedSentDate(
  tracker
) {
  const trackedDates = [
    tracker
      ?.initialSentAt,

    tracker
      ?.followUp1SentAt,

    tracker
      ?.followUp2SentAt
  ]
    .map(parseDate)
    .filter(Boolean)
    .sort(
      (
        firstDate,
        secondDate
      ) => {
        return (
          secondDate.getTime() -
          firstDate.getTime()
        );
      }
    );

  return (
    trackedDates[0] ||
    null
  );
}

function createImapClient(
  credentials
) {
  if (
    !credentials ||
    !credentials.emailAddress ||
    !credentials.appPassword
  ) {
    throw new Error(
      'Gmail sender credentials are incomplete.'
    );
  }

  return new ImapFlow({
    host:
      'imap.gmail.com',

    port:
      993,

    secure:
      true,

    auth: {
      user:
        credentials
          .emailAddress,

      pass:
        credentials
          .appPassword
    },

    logger:
      false
  });
}

function getRawHeaders(
  message
) {
  if (!message?.headers) {
    return '';
  }

  if (
    Buffer.isBuffer(
      message.headers
    )
  ) {
    return message
      .headers
      .toString('utf8');
  }

  return String(
    message.headers
  );
}

function messageDateIsAfterTrackedSend(
  message,
  tracker
) {
  const latestTrackedDate =
    getLatestTrackedSentDate(
      tracker
    );

  if (!latestTrackedDate) {
    return true;
  }

  const messageDate =
    parseDate(
      message
        ?.envelope
        ?.date ||
      message
        ?.internalDate
    );

  if (!messageDate) {
    return false;
  }

  return (
    messageDate.getTime() >
    latestTrackedDate.getTime()
  );
}

function messageSenderMatchesTracker(
  message,
  tracker
) {
  const senderEmail =
    getAddressFromEnvelope(
      message
        ?.envelope
        ?.from
    );

  const trackedRecipient =
    normalizeEmail(
      tracker
        ?.recipientEmail ||
      tracker
        ?.email
    );

  if (
    !senderEmail ||
    !trackedRecipient
  ) {
    return false;
  }

  return (
    senderEmail ===
    trackedRecipient
  );
}

function messageThreadMatchesTracker(
  message,
  tracker
) {
  const trackedMessageIds =
    buildTrackedMessageIdSet(
      tracker
    );

  if (
    trackedMessageIds.size === 0
  ) {
    return false;
  }

  const envelopeInReplyTo =
    normalizeMessageId(
      message
        ?.envelope
        ?.inReplyTo
    );

  if (
    envelopeInReplyTo &&
    trackedMessageIds.has(
      envelopeInReplyTo
    )
  ) {
    return true;
  }

  const rawHeaders =
    getRawHeaders(
      message
    );

  const headerInReplyTo =
    getHeaderValue(
      rawHeaders,
      'In-Reply-To'
    );

  const references =
    getHeaderValue(
      rawHeaders,
      'References'
    );

  const replyMessageIds = [
    ...extractMessageIds(
      headerInReplyTo
    ),

    ...extractMessageIds(
      references
    )
  ];

  return replyMessageIds.some(
    messageId => {
      return trackedMessageIds.has(
        messageId
      );
    }
  );
}

function doesMessageMatchTracker(
  message,
  tracker
) {
  if (
    !message ||
    !tracker
  ) {
    return false;
  }

  if (
    !messageSenderMatchesTracker(
      message,
      tracker
    )
  ) {
    return false;
  }

  if (
    !messageDateIsAfterTrackedSend(
      message,
      tracker
    )
  ) {
    return false;
  }

  return messageThreadMatchesTracker(
    message,
    tracker
  );
}

function mapReplyMessage(
  message
) {
  const envelope =
    message?.envelope ||
    {};

  const rawHeaders =
    getRawHeaders(
      message
    );

  const messageId =
    envelope.messageId ||
    getHeaderValue(
      rawHeaders,
      'Message-ID'
    ) ||
    '';

  const inReplyTo =
    envelope.inReplyTo ||
    getHeaderValue(
      rawHeaders,
      'In-Reply-To'
    ) ||
    '';

  const references =
    extractMessageIds(
      getHeaderValue(
        rawHeaders,
        'References'
      )
    );

  return {
    uid:
      message.uid,

    messageId,

    inReplyTo,

    references,

    from:
      getAddressFromEnvelope(
        envelope.from
      ),

    subject:
      envelope.subject ||
      '',

    normalizedSubject:
      normalizeSubject(
        envelope.subject
      ),

    date:
      envelope.date ||
      message.internalDate ||
      null
  };
}

async function findReplyForTracker(
  client,
  tracker
) {
  if (!client) {
    throw new Error(
      'Connected Gmail client is required.'
    );
  }

  if (!tracker) {
    throw new Error(
      'Follow-up tracker is required.'
    );
  }

  const recipientEmail =
    normalizeEmail(
      tracker
        .recipientEmail ||
      tracker.email
    );

  if (!recipientEmail) {
    throw new Error(
      'Tracked recipient email is missing.'
    );
  }

  const initialSentAt =
    parseDate(
      tracker
        .initialSentAt ||
      tracker.sentAt
    );

  if (!initialSentAt) {
    throw new Error(
      'Initial sent date is missing or invalid.'
    );
  }

  /*
   * IMAP searches by calendar date.
   *
   * Search one day earlier to avoid
   * timezone-boundary problems. The exact
   * timestamp is checked afterward.
   */
  const searchSince =
    new Date(
      initialSentAt.getTime() -
      (
        24 *
        60 *
        60 *
        1000
      )
    );

  const messageUids =
    await client.search(
      {
        since:
          searchSince,

        from:
          recipientEmail
      },
      {
        uid:
          true
      }
    );

  if (
    !Array.isArray(
      messageUids
    ) ||
    messageUids.length === 0
  ) {
    return null;
  }

  const messages =
    await client.fetchAll(
      messageUids,
      {
        uid:
          true,

        envelope:
          true,

        internalDate:
          true,

        headers: [
          'Message-ID',
          'In-Reply-To',
          'References',
          'From',
          'Subject',
          'Date'
        ]
      },
      {
        uid:
          true
      }
    );

  const matchingMessages =
    messages
      .filter(
        message => {
          return doesMessageMatchTracker(
            message,
            tracker
          );
        }
      )
      .sort(
        (
          firstMessage,
          secondMessage
        ) => {
          const firstDate =
            parseDate(
              firstMessage
                ?.envelope
                ?.date ||
              firstMessage
                ?.internalDate
            );

          const secondDate =
            parseDate(
              secondMessage
                ?.envelope
                ?.date ||
              secondMessage
                ?.internalDate
            );

          return (
            (
              secondDate
                ?.getTime() ||
              0
            ) -
            (
              firstDate
                ?.getTime() ||
              0
            )
          );
        }
      );

  if (
    matchingMessages.length === 0
  ) {
    return null;
  }

  return mapReplyMessage(
    matchingMessages[0]
  );
}

async function findRepliesForTrackers(
  client,
  trackers
) {
  if (
    !Array.isArray(
      trackers
    )
  ) {
    return [];
  }

  const results = [];

  /*
   * Process trackers sequentially on the
   * same mailbox connection.
   *
   * This avoids issuing overlapping IMAP
   * commands on one client.
   */
  for (
    const tracker of trackers
  ) {
    try {
      const reply =
        await findReplyForTracker(
          client,
          tracker
        );

      results.push({
        trackerId:
          tracker.id,

        recipientEmail:
          tracker
            .recipientEmail,

        reply,

        error:
          null
      });
    } catch (error) {
      results.push({
        trackerId:
          tracker.id,

        recipientEmail:
          tracker
            .recipientEmail,

        reply:
          null,

        error:
          error.message
      });
    }
  }

  return results;
}

async function withGmailInbox(
  userId,
  callback
) {
  requireUserId(
    userId
  );

  if (
    typeof callback !==
    'function'
  ) {
    throw new Error(
      'Gmail mailbox callback is required.'
    );
  }

  const credentials =
    await getSenderCredentials(
      userId
    );

  const client =
    createImapClient(
      credentials
    );

  let mailboxLock =
    null;

  let connected =
    false;

  try {
    await client.connect();

    connected =
      true;

    mailboxLock =
      await client
        .getMailboxLock(
          'INBOX'
        );

    return await callback(
      client,
      {
        senderEmail:
          credentials
            .emailAddress
      }
    );
  } finally {
    if (mailboxLock) {
      try {
        mailboxLock.release();
      } catch (error) {
        console.error(
          'Unable to release Gmail mailbox lock:',
          error.message
        );
      }
    }

    if (connected) {
      try {
        await client.logout();
      } catch (error) {
        console.error(
          'Gmail IMAP logout failed:',
          error.message
        );
      }
    }
  }
}

async function testGmailImapConnection(
  userId
) {
  return withGmailInbox(
    userId,
    async (
      client,
      context
    ) => {
      return {
        success:
          true,

        senderEmail:
          context.senderEmail,

        mailbox:
          client
            .mailbox
            ?.path ||
          'INBOX',

        messageCount:
          client
            .mailbox
            ?.exists ||
          0,

        message:
          'Gmail IMAP connection verified successfully.'
      };
    }
  );
}

module.exports = {
  normalizeEmail,
  normalizeMessageId,
  normalizeSubject,
  parseDate,
  getAddressFromEnvelope,
  getHeaderValue,
  extractMessageIds,
  buildTrackedMessageIdSet,
  getLatestTrackedSentDate,
  createImapClient,
  getRawHeaders,
  messageDateIsAfterTrackedSend,
  messageSenderMatchesTracker,
  messageThreadMatchesTracker,
  doesMessageMatchTracker,
  mapReplyMessage,
  findReplyForTracker,
  findRepliesForTrackers,
  withGmailInbox,
  testGmailImapConnection
};