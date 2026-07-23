const fs = require('fs');
const nodemailer = require('nodemailer');
const { RESUME_FILE } = require('../utils/path.util');
const { readSenderConfig } = require('./senderConfig.service');

function getSenderCredentials() {
  const senderConfig = readSenderConfig();

  return {
    emailProvider:
      senderConfig.emailProvider ||
      process.env.EMAIL_PROVIDER ||
      'gmail',

    emailUser:
      senderConfig.emailUser ||
      process.env.EMAIL_USER,

    emailPass:
      senderConfig.emailPass ||
      process.env.EMAIL_PASS
  };
}

function createTransporter(credentials) {
  return nodemailer.createTransport({
    service: credentials.emailProvider || 'gmail',
    auth: {
      user: credentials.emailUser,
      pass: credentials.emailPass
    }
  });
}

function buildAttachments(template) {
  if (!fs.existsSync(RESUME_FILE)) {
    return [];
  }

  return [
    {
      filename: template.resumeFileName || 'Resume.pdf',
      path: RESUME_FILE
    }
  ];
}

async function sendEmail(toEmail, template) {
  const dryRun =
    template.dryRun === true || process.env.DEFAULT_DRY_RUN === 'true';

  const attachments = buildAttachments(template);

  if (dryRun) {
    console.log(`[DRY RUN] Email not actually sent to ${toEmail}`);
    console.log('Subject:', template.subject);
    console.log('Attachment Count:', attachments.length);

    return {
      status: 'DRY_RUN',
      reason: `Dry run enabled. Email not actually sent to ${toEmail}.`
    };
  }

  const credentials = getSenderCredentials();

  if (!credentials.emailUser || !credentials.emailPass) {
    throw new Error(
      'Sender email or app password is missing. Please save sender settings first.'
    );
  }

  const transporter = createTransporter(credentials);

  const mailOptions = {
    from: credentials.emailUser,
    to: toEmail,
    subject: template.subject,
    text: template.body,
    attachments
  };

  await transporter.sendMail(mailOptions);

  return {
    status: 'SENT',
    reason: ''
  };
}

module.exports = { sendEmail };