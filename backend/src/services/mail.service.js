const fs = require('fs');
const axios = require('axios');
const nodemailer = require('nodemailer');

const { RESUME_FILE } = require('../utils/path.util');
const { readSenderConfig } = require('./senderConfig.service');

function buildAttachmentsForGmail(template) {
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

function buildAttachmentsForBrevo(template) {
  if (!fs.existsSync(RESUME_FILE)) {
    return [];
  }

  const fileContent = fs.readFileSync(RESUME_FILE).toString('base64');

  return [
    {
      name: template.resumeFileName || 'Resume.pdf',
      content: fileContent
    }
  ];
}

function getProvider() {
  const senderConfig = readSenderConfig();

  return (
    process.env.EMAIL_PROVIDER ||
    senderConfig.emailProvider ||
    'gmail'
  );
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

  await transporter.sendMail(mailOptions);

  return {
    status: 'SENT',
    reason: ''
  };
}

async function sendWithBrevo(toEmail, template) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Job Outreach';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is missing in Render environment variables.');
  }

  if (!senderEmail) {
    throw new Error('BREVO_SENDER_EMAIL is missing in Render environment variables.');
  }

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: toEmail
      }
    ],
    subject: template.subject,
    textContent: template.body
  };

  const attachments = buildAttachmentsForBrevo(template);

  if (attachments.length > 0) {
    payload.attachment = attachments;
  }

  console.log('Sending using Brevo API...');
  console.log('To:', toEmail);
  console.log('From:', senderEmail);
  console.log('Subject:', template.subject);

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    payload,
    {
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      }
    }
  );

  console.log('Brevo email sent successfully:', toEmail);

  return {
    status: 'SENT',
    reason: ''
  };
}

async function sendEmail(toEmail, template) {
  const dryRun =
    template.dryRun === true || process.env.DEFAULT_DRY_RUN === 'true';

  const provider = getProvider();

  console.log('========== EMAIL SEND START ==========');
  console.log('To Email:', toEmail);
  console.log('Email Provider:', provider);
  console.log('Dry Run:', dryRun);
  console.log('Subject:', template.subject);

  if (dryRun) {
    console.log(`[DRY RUN] Email not actually sent to ${toEmail}`);

    return {
      status: 'DRY_RUN',
      reason: `Dry run enabled. Email not actually sent to ${toEmail}.`
    };
  }

  try {
    if (provider.toLowerCase() === 'brevo') {
      return await sendWithBrevo(toEmail, template);
    }

    return await sendWithGmail(toEmail, template);
  } catch (error) {
    console.log('Email sending failed for:', toEmail);
    console.log('Error message:', error.message);

    if (error.response) {
      console.log('API error status:', error.response.status);
      console.log('API error data:', error.response.data);
    }

    throw error;
  }
}

module.exports = { sendEmail };