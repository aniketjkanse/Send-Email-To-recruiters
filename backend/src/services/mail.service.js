const fs = require('fs');
const nodemailer = require('nodemailer');

const {
  RESUME_FILE
} = require('../utils/path.util');

const {
  readSenderConfig
} = require('./senderConfig.service');

function normalizeGmailAddress(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return '';
  }

  if (!normalized.includes('@')) {
    return `${normalized}@gmail.com`;
  }

  return normalized;
}

function getGmailCredentials() {
  const senderConfig =
    readSenderConfig();

  const accounts = [
    {
      emailUser:
        normalizeGmailAddress(
          senderConfig.emailUser ||
          process.env.EMAIL_USER
        ),

      emailPass:
        String(
          senderConfig.emailPass ||
          process.env.EMAIL_PASS ||
          ''
        ).trim()
    }
  ];

  /*
   * The second account is optional. When both an
   * address and password are saved for it, it becomes
   * eligible for random selection alongside the first.
   */
  if (senderConfig.emailUser2 && senderConfig.emailPass2) {
    accounts.push({
      emailUser:
        normalizeGmailAddress(
          senderConfig.emailUser2
        ),

      emailPass:
        String(
          senderConfig.emailPass2
        ).trim()
    });
  }

  const chosenIndex =
    accounts.length > 1
      ? Math.floor(Math.random() * accounts.length)
      : 0;

  return accounts[chosenIndex];
}

function createGmailTransporter(
  credentials
) {
  return nodemailer.createTransport({
    service: 'gmail',

    auth: {
      user:
        credentials.emailUser,

      pass:
        credentials.emailPass
    }
  });
}

function buildAttachments() {
  if (!fs.existsSync(RESUME_FILE)) {
    return [];
  }

  let filename = 'Resume.pdf';

  const metadataFile =
    `${RESUME_FILE}.meta`;

  if (fs.existsSync(metadataFile)) {
    try {
      const metadata =
        JSON.parse(
          fs.readFileSync(
            metadataFile,
            'utf8'
          )
        );

      filename =
        metadata.originalName ||
        filename;
    } catch (error) {
      console.log(
        'Unable to read resume metadata:',
        error.message
      );
    }
  }

  return [
    {
      filename,
      path: RESUME_FILE,
      contentType:
        'application/pdf'
    }
  ];
}

async function sendEmail(
  toEmail,
  template,
  options = {}
) {
  const dryRun =
    template.dryRun === true ||
    process.env.DEFAULT_DRY_RUN ===
      'true';

  const isFollowUp =
    options.isFollowUp === true;

  console.log(
    '========== EMAIL SEND START =========='
  );

  console.log(
    'To Email:',
    toEmail
  );

  console.log(
    'Dry Run:',
    dryRun
  );

  console.log(
    'Email Type:',
    isFollowUp
      ? 'FOLLOW_UP'
      : 'INITIAL'
  );

  if (dryRun) {
    console.log(
      `[DRY RUN] Email not sent to ${toEmail}`
    );

    return {
      status: 'DRY_RUN',

      reason:
        `Dry run enabled. Email not actually sent to ${toEmail}.`,

      messageId: ''
    };
  }

  const credentials =
    getGmailCredentials();

  if (
    !credentials.emailUser ||
    !credentials.emailPass
  ) {
    throw new Error(
      'Gmail sender email or app password is missing.'
    );
  }

  /*
   * A follow-up must contain a parent
   * Message-ID. Otherwise, it could be
   * delivered as a standalone email.
   */
  if (
    isFollowUp &&
    !options.parentMessageId
  ) {
    throw new Error(
      'Cannot send threaded follow-up because parent Message-ID is missing.'
    );
  }

  const transporter =
    createGmailTransporter(
      credentials
    );

  const normalizedRecipient =
    String(toEmail || '')
      .trim()
      .toLowerCase();

  const mailOptions = {
    from:
      credentials.emailUser,

    to:
      normalizedRecipient,

    subject:
      options.subject ||
      template.subject,

    text:
      options.body ||
      template.body,

    /*
     * Attach resume only to the
     * initial email.
     */
    attachments:
      isFollowUp
        ? []
        : buildAttachments()
  };

  /*
   * These headers make the follow-up
   * belong to the existing conversation.
   */
  if (isFollowUp) {
    mailOptions.inReplyTo =
      options.parentMessageId;

    mailOptions.references =
      Array.isArray(
        options.references
      ) &&
      options.references.length
        ? options.references
        : [
            options.parentMessageId
          ];
  }

  console.log(
    '=================================='
  );

  console.log(
    isFollowUp
      ? 'Sending Threaded Follow-Up'
      : 'Sending Initial Email'
  );

  console.log(
    'From:',
    credentials.emailUser
  );

  console.log(
    'To:',
    mailOptions.to
  );

  console.log(
    'Subject:',
    mailOptions.subject
  );

  console.log(
    'Attachments:',
    mailOptions.attachments.length
  );

  console.log(
    'In-Reply-To:',
    mailOptions.inReplyTo ||
    'Not applicable'
  );

  console.log(
    'References:',
    mailOptions.references ||
    'Not applicable'
  );

  console.log(
    '=================================='
  );

  try {
    const info =
      await transporter.sendMail(
        mailOptions
      );

    console.log(
      `Email successfully sent to ${normalizedRecipient}`
    );

    console.log(
      'Message-ID:',
      info.messageId
    );

    return {
      status: 'SENT',

      reason: '',

      messageId:
        info.messageId || '',

      accepted:
        info.accepted || [],

      rejected:
        info.rejected || []
    };
  } catch (error) {
    console.error(
      `Email sending failed for ${normalizedRecipient}:`,
      error.message
    );

    throw error;
  }
}

module.exports = {
  sendEmail,
  getGmailCredentials,
  normalizeGmailAddress
};