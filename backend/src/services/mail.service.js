const fs = require('fs');
const nodemailer = require('nodemailer');

const { RESUME_FILE } = require('../utils/path.util');
const { readSenderConfig } = require('./senderConfig.service');

function buildAttachmentsForGmail(template) {
  if (!fs.existsSync(RESUME_FILE)) {
    return [];
  }

  let uploadedFileName = 'Resume.pdf';

  if (fs.existsSync(`${RESUME_FILE}.meta`)) {
    const meta = JSON.parse(
      fs.readFileSync(`${RESUME_FILE}.meta`, 'utf8')
    );

    uploadedFileName = meta.originalName;
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

  return {
    emailUser: senderConfig.emailUser || process.env.EMAIL_USER,
    emailPass: senderConfig.emailPass || process.env.EMAIL_PASS
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

async function sendWithGmail(toEmail, template) {
  const credentials = getGmailCredentials();

  if (!credentials.emailUser || !credentials.emailPass) {
    throw new Error(
      'Gmail sender email or app password is missing.'
    );
  }

  const transporter = createGmailTransporter(credentials);

  const mailOptions = {
    from: credentials.emailUser,
    to: toEmail,
    subject: template.subject,
    text: template.body,
    attachments: buildAttachmentsForGmail(template)
  };

  console.log('==================================');
  console.log('Sending Email');
  console.log('To:', toEmail);
  console.log('Subject:', template.subject);
  console.log('Attachments:', mailOptions.attachments);
  console.log('==================================');

  await transporter.sendMail(mailOptions);

  return {
    status: 'SENT',
    reason: ''
  };
}

async function sendEmail(toEmail, template) {
  const dryRun =
    template.dryRun === true ||
    process.env.DEFAULT_DRY_RUN === 'true';

  console.log('========== EMAIL SEND START ==========');
  console.log('To Email:', toEmail);
  console.log('Dry Run:', dryRun);
  console.log('Subject:', template.subject);

  if (dryRun) {
    console.log(
      `[DRY RUN] Email not actually sent to ${toEmail}`
    );

    return {
      status: 'DRY_RUN',
      reason: `Dry run enabled. Email not actually sent to ${toEmail}.`
    };
  }

  try {
    return await sendWithGmail(toEmail, template);
  } catch (error) {
    console.log('Email sending failed for:', toEmail);
    console.log('Error message:', error.message);
    throw error;
  }
}

module.exports = { sendEmail };