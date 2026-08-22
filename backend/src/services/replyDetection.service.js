const {
  ImapFlow
} = require('imapflow');

const {
  simpleParser
} = require('mailparser');

const {
  getGmailCredentials
} = require('./mail.service');

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeMessageId(value) {
  return String(value || '')
    .trim()
    .replace(/^<|>$/g, '')
    .toLowerCase();
}

function extractMessageIds(value) {
  if (!value) {
    return [];
  }

  const text = Array.isArray(value)
    ? value.join(' ')
    : String(value);

  const messageIdMatches =
    text.match(/<[^>]+>/g);

  if (messageIdMatches) {
    return messageIdMatches
      .map(normalizeMessageId)
      .filter(Boolean);
  }

  return text
    .split(/\s+/)
    .map(normalizeMessageId)
    .filter(Boolean);
}

function getTrackedMessageIds(record) {
  const messageIds = [
    record.initialMessageId,
    record.followUp1MessageId,
    record.followUp2MessageId,
    record.lastMessageId,
    ...(record.sentMessageIds || [])
  ];

  return new Set(
    messageIds
      .map(normalizeMessageId)
      .filter(Boolean)
  );
}

function isActiveRecord(record) {
  if (!record) {
    return false;
  }

  if (
    !record.email ||
    !record.initialSentAt
  ) {
    return false;
  }

  if (record.replyReceived === true) {
    return false;
  }

  return ![
    'REPLIED',
    'STOPPED',
    'FOLLOWUP_2_SENT',
    'COMPLETED'
  ].includes(record.status);
}

function extractSenderEmail(parsedEmail) {
  const senderValue =
    parsedEmail.from?.value;

  if (
    !Array.isArray(senderValue) ||
    senderValue.length === 0
  ) {
    return '';
  }

  return normalizeEmail(
    senderValue[0]?.address
  );
}

async function createImapClient() {
  const credentials =
    getGmailCredentials();

  if (
    !credentials.emailUser ||
    !credentials.emailPass
  ) {
    throw new Error(
      'Gmail credentials are missing for reply detection.'
    );
  }

  return new ImapFlow({
    host: 'imap.gmail.com',

    port: 993,

    secure: true,

    auth: {
      user:
        credentials.emailUser,

      pass:
        credentials.emailPass
    },

    logger: false
  });
}

async function findReplyForRecord(
  client,
  record
) {
  const recipientEmail =
    normalizeEmail(record.email);

  const initialSentAt =
    new Date(record.initialSentAt);

  if (!recipientEmail) {
    return null;
  }

  if (
    Number.isNaN(
      initialSentAt.getTime()
    )
  ) {
    console.log(
      `Invalid initial sent date for ${recipientEmail}`
    );

    return null;
  }

  /*
   * Search the sender Gmail inbox for
   * messages received from this recipient
   * after the initial email was sent.
   */
  const messageUids =
    await client.search({
      from: recipientEmail,

      since: initialSentAt
    });

  if (
    !messageUids ||
    messageUids.length === 0
  ) {
    return null;
  }

  const trackedMessageIds =
    getTrackedMessageIds(record);

  for await (
    const message of client.fetch(
      messageUids,
      {
        uid: true,

        source: true,

        internalDate: true
      }
    )
  ) {
    if (!message.source) {
      continue;
    }

    const parsedEmail =
      await simpleParser(
        message.source
      );

    const senderEmail =
      extractSenderEmail(
        parsedEmail
      );

    if (
      senderEmail !== recipientEmail
    ) {
      continue;
    }

    const receivedDate =
      new Date(
        parsedEmail.date ||
        message.internalDate ||
        0
      );

    if (
      Number.isNaN(
        receivedDate.getTime()
      )
    ) {
      continue;
    }

    /*
     * Ignore messages received before or
     * exactly when the initial email was sent.
     */
    if (
      receivedDate <= initialSentAt
    ) {
      continue;
    }

    const relatedMessageIds = [
      ...extractMessageIds(
        parsedEmail.inReplyTo
      ),

      ...extractMessageIds(
        parsedEmail.references
      )
    ];

    /*
     * The reply must reference one of the
     * Message-IDs created by this application.
     *
     * This avoids treating an unrelated email
     * from the same recipient as a reply.
     */
    const belongsToTrackedThread =
      relatedMessageIds.some(
        messageId =>
          trackedMessageIds.has(
            messageId
          )
      );

    if (!belongsToTrackedThread) {
      continue;
    }

    return {
      trackerId:
        record.id,

      replyFrom:
        senderEmail,

      replyDate:
        receivedDate.toISOString(),

      replySubject:
        parsedEmail.subject || '',

      replyMessageId:
        parsedEmail.messageId || '',

      detectionMethod:
        'MESSAGE_THREAD',

      inboxUid:
        message.uid
    };
  }

  return null;
}

async function checkReplies(records) {
  if (!Array.isArray(records)) {
    throw new Error(
      'Reply check requires a records array.'
    );
  }

  const activeRecords =
    records.filter(
      isActiveRecord
    );

  if (
    activeRecords.length === 0
  ) {
    console.log(
      'No active follow-up records require reply checking.'
    );

    return [];
  }

  const client =
    await createImapClient();

  const detectedReplies = [];

  let mailboxLock = null;

  try {
    console.log(
      'Connecting to Gmail inbox for reply detection...'
    );

    await client.connect();

    mailboxLock =
      await client.getMailboxLock(
        'INBOX'
      );

    console.log(
      `Checking replies for ${activeRecords.length} active record(s)`
    );

    for (
      const record of activeRecords
    ) {
      console.log(
        `Checking reply from ${record.email}`
      );

      const reply =
        await findReplyForRecord(
          client,
          record
        );

      if (reply) {
        detectedReplies.push(
          reply
        );

        console.log(
          `Reply detected from ${record.email}`
        );
      } else {
        console.log(
          `No reply detected from ${record.email}`
        );
      }
    }
  } catch (error) {
    console.error(
      'Gmail reply detection failed:',
      error.message
    );

    /*
     * Rethrow the error.
     *
     * The follow-up service will stop instead
     * of sending emails without verifying replies.
     */
    throw error;
  } finally {
    if (mailboxLock) {
      mailboxLock.release();
    }

    if (
      client &&
      client.usable
    ) {
      try {
        await client.logout();
      } catch (logoutError) {
        console.log(
          'Gmail logout warning:',
          logoutError.message
        );
      }
    }
  }

  console.log(
    `Reply detection completed. Replies found: ${detectedReplies.length}`
  );

  return detectedReplies;
}

module.exports = {
  checkReplies
};