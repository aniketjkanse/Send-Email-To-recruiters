const fs = require('fs');
const nodemailer = require('nodemailer');

const {
  RESUME_FILE
} = require('../utils/path.util');

const {
  readSenderConfig
} = require('./senderConfig.service');

function normalizeGmailAddress(emailUser) {
  const value = String(emailUser || '').trim();

  if (!value) {
    return '';
  }

  if (!value.includes('@')) {
    return `${value}@gmail.com`;
  }

  return value.toLowerCase();
}

function buildAttachmentsForGmail() {
  if (!fs.existsSync(RESUME_FILE)) {
    return [];
  }

  let uploadedFileName = 'Resume.pdf';

  const metadataFile = `${RESUME_FILE}.meta`;

  if (fs.existsSync(metadataFile)) {
    try {
      const metadata = JSON.parse(
        fs.readFileSync(metadataFile, 'utf8')
      );

      if (metadata.originalName) {
        uploadedFileName = metadata.originalName;
      }
    } catch (error) {
      console.log(
        'Could not read resume metadata:',
        error.message
      );
    }
  }

  return [
    {
      filename: uploadedFileName,
      path: RESUME_FILE,
      contentType: 'application/pdf'
    }
  ];
}

function getGmailCredentials() {
  const senderConfig = readSenderConfig();

  const configuredUser =
    senderConfig.emailUser ||
    process.env.EMAIL_USER;

  const configuredPassword =
    senderConfig.emailPass ||
    process.env.EMAIL_PASS;

  return {
    emailUser: normalizeGmailAddress(
      configuredUser
    ),
    emailPass: String(
      configuredPassword || ''
    ).trim()
  };
}

function createGmailTransporter(credentials) {
  return nodemailer.createTransport({
    service: 'gmail',

    auth: {
      user: credentials.emailUser,
      pass: credentials.emailPass
    }
  });
}

async function sendWithGmail(
  toEmail,
  template,
  options = {}
) {
  const credentials = getGmailCredentials();

  if (
    !credentials.emailUser ||
    !credentials.emailPass
  ) {
    throw new Error(
      'Gmail sender email or app password is missing.'
    );
  }

  const transporter =
    createGmailTransporter(credentials);

  const isFollowUp =
    options.isFollowUp === true;

  const mailOptions = {
    from: credentials.emailUser,

    to: String(toEmail || '')
      .trim()
      .toLowerCase(),

    subject:
      options.subject ||
      template.subject,

    text:
      options.body ||
      template.body,

    attachments: isFollowUp
      ? []
      : buildAttachmentsForGmail()
  };

  /*
   * These headers connect the follow-up with
   * the previous email conversation.
   */
  if (
    isFollowUp &&
    options.parentMessageId
  ) {
    mailOptions.inReplyTo =
      options.parentMessageId;

    mailOptions.references =
      options.references &&
      options.references.length
        ? options.references
        : [options.parentMessageId];
  }

  console.log('==================================');
  console.log(
    isFollowUp
      ? 'Sending Follow-Up Email'
      : 'Sending Initial Email'
  );
  console.log('From:', credentials.emailUser);
  console.log('To:', mailOptions.to);
  console.log('Subject:', mailOptions.subject);
  console.log(
    'Attachments:',
    mailOptions.attachments.length
  );
  console.log(
    'In-Reply-To:',
    mailOptions.inReplyTo || 'Not applicable'
  );
  console.log('==================================');

  const info = await transporter.sendMail(
    mailOptions
  );

  return {
    status: 'SENT',
    reason: '',
    messageId: info.messageId || '',
    accepted: info.accepted || [],
    rejected: info.rejected || []
  };
}

async function sendEmail(
  toEmail,
  template,
  options = {}
) {
  const dryRun =
    template.dryRun === true ||
    process.env.DEFAULT_DRY_RUN === 'true';

  console.log(
    '========== EMAIL SEND START =========='
  );

  console.log('To Email:', toEmail);
  console.log('Dry Run:', dryRun);

  console.log(
    'Email Type:',
    options.isFollowUp
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

  try {
    return await sendWithGmail(
      toEmail,
      template,
      options
    );
  } catch (error) {
    console.log(
      'Email sending failed for:',
      toEmail
    );

    console.log(
      'Error message:',
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