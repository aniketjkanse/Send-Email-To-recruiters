const { ImapFlow } = require('imapflow');
const MailComposer = require('nodemailer/lib/mail-composer');

/*
 * Dry-run mode does not send anything. Instead it drops a real draft
 * into the sender's Gmail "Drafts" folder over IMAP (app-password auth,
 * no OAuth needed) so every message can be reviewed before a real run.
 */

function composeRawMessage(mailOptions) {
  return new Promise((resolve, reject) => {
    new MailComposer(mailOptions)
      .compile()
      .build((error, message) => {
        if (error) {
          return reject(error);
        }

        resolve(message);
      });
  });
}

async function findDraftsMailbox(client) {
  try {
    const mailboxes = await client.list();

    const bySpecialUse = mailboxes.find(
      box => box.specialUse === '\\Drafts'
    );

    if (bySpecialUse) {
      return bySpecialUse.path;
    }

    const byName = mailboxes.find(box =>
      /drafts/i.test(box.path)
    );

    if (byName) {
      return byName.path;
    }
  } catch (error) {
    console.log(
      'Unable to list mailboxes, falling back to [Gmail]/Drafts:',
      error.message
    );
  }

  return '[Gmail]/Drafts';
}

async function createGmailDraft(mailOptions) {
  /*
   * Lazy require avoids a circular load with mail.service.
   */
  const {
    getGmailCredentials
  } = require('./mail.service');

  const credentials = getGmailCredentials();

  if (
    !credentials.emailUser ||
    !credentials.emailPass
  ) {
    throw new Error(
      'Gmail credentials are missing — cannot create draft.'
    );
  }

  const raw = await composeRawMessage({
    ...mailOptions,
    from: credentials.emailUser
  });

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,

    auth: {
      user: credentials.emailUser,
      pass: credentials.emailPass
    },

    logger: false
  });

  await client.connect();

  try {
    const mailbox =
      await findDraftsMailbox(client);

    const result = await client.append(
      mailbox,
      raw,
      ['\\Draft'],
      new Date()
    );

    return {
      mailbox,
      uid: result && result.uid
    };
  } finally {
    try {
      await client.logout();
    } catch (error) {
      client.close();
    }
  }
}

module.exports = {
  createGmailDraft
};
