const nodemailer =
  require('nodemailer');

const {
  getSenderCredentials
} = require(
  './senderAccount.service'
);

const {
  getInitialEmailAttachments
} = require(
  './resumeAttachment.service'
);

function requireUserId(
  userId
) {
  const normalizedUserId =
    String(
      userId || ''
    ).trim();

  if (!normalizedUserId) {
    throw new Error(
      'Authenticated user ID is required for sending email.'
    );
  }

  return normalizedUserId;
}

function normalizeRecipientEmail(
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
  ).trim();
}

/*
 * Build attachments based on the
 * authenticated user and email type.
 *
 * Initial email:
 * Attach the authenticated user's active
 * resume.
 *
 * Follow-Up email:
 * Do not attach a resume.
 */
async function buildAttachments(
  userId,
  isFollowUp = false
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  if (isFollowUp) {
    return {
      configured:
        false,

      attached:
        false,

      resume:
        null,

      attachments:
        [],

      message:
        'Resume is not attached to Follow-Up emails.'
    };
  }

  return getInitialEmailAttachments(
    normalizedUserId,
    {
      requireResume:
        true
    }
  );
}

function createTransporter(
  credentials
) {
  if (
    !credentials ||
    typeof credentials !==
      'object'
  ) {
    throw new Error(
      'Sender credentials are required.'
    );
  }

  const provider =
    String(
      credentials.provider ||
      ''
    )
      .trim()
      .toLowerCase();

  if (
    provider !==
    'gmail'
  ) {
    throw new Error(
      `Unsupported email provider: ${credentials.provider}`
    );
  }

  const emailAddress =
    String(
      credentials.emailAddress ||
      ''
    ).trim();

  const appPassword =
    String(
      credentials.appPassword ||
      ''
    ).trim();

  if (!emailAddress) {
    throw new Error(
      'Sender email address is missing.'
    );
  }

  if (!appPassword) {
    throw new Error(
      'Gmail App Password is missing.'
    );
  }

  return nodemailer.createTransport({
    service:
      'gmail',

    auth: {
      user:
        emailAddress,

      pass:
        appPassword
    }
  });
}

/*
 * Signature:
 *
 * sendEmail(
 *   userId,
 *   recipientEmail,
 *   template,
 *   options
 * )
 *
 * options:
 *
 * isFollowUp
 * parentMessageId
 * references
 * subject
 * body
 */
async function sendEmail(
  userId,
  toEmail,
  template = {},
  options = {}
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedRecipient =
    normalizeRecipientEmail(
      toEmail
    );

  if (!normalizedRecipient) {
    throw new Error(
      'Recipient email address is required.'
    );
  }

  const dryRun =
    template.dryRun ===
    true;

  const isFollowUp =
    options.isFollowUp ===
    true;

  const emailType =
    isFollowUp
      ? 'FOLLOW_UP'
      : 'INITIAL';

  const subject =
    String(
      options.subject ||
      template.subject ||
      ''
    ).trim();

  const body =
    String(
      options.body ||
      template.body ||
      ''
    );

  if (!subject) {
    throw new Error(
      'Email subject is required.'
    );
  }

  if (!body.trim()) {
    throw new Error(
      'Email body is required.'
    );
  }

  const parentMessageId =
    normalizeMessageId(
      options.parentMessageId
    );

  /*
   * Follow-Ups must remain in the
   * original Gmail conversation.
   */
  if (
    isFollowUp &&
    !parentMessageId
  ) {
    throw new Error(
      'Cannot send threaded follow-up because parent Message-ID is missing.'
    );
  }

  console.log(
    '========== EMAIL SEND START =========='
  );

  console.log(
    'User ID:',
    normalizedUserId
  );

  console.log(
    'Recipient:',
    normalizedRecipient
  );

  console.log(
    'Email Type:',
    emailType
  );

  console.log(
    'Dry Run:',
    dryRun
  );

  /*
   * Dry Run does not:
   *
   * Load Gmail credentials
   * Connect to Gmail
   * Require a physical resume
   * Send a real email
   */
  if (dryRun) {
    console.log(
      `[DRY RUN] ${emailType} email not sent to ${normalizedRecipient}`
    );

    return {
      status:
        'DRY_RUN',

      reason:
        `Dry Run enabled. Email not actually sent to ${normalizedRecipient}.`,

      messageId:
        '',

      accepted:
        [],

      rejected:
        [],

      senderEmail:
        '',

      attachmentCount:
        0,

      resumeAttached:
        false,

      emailType
    };
  }

  /*
   * Load the authenticated user's
   * encrypted Gmail sender credentials
   * from PostgreSQL.
   */
  const credentials =
    await getSenderCredentials(
      normalizedUserId
    );

  if (
    !credentials ||
    !credentials.emailAddress ||
    !credentials.appPassword
  ) {
    throw new Error(
      'Sender email or Gmail App Password is missing.'
    );
  }

  /*
   * Initial live emails require the
   * authenticated user's active resume.
   *
   * Follow-Up emails return an empty
   * attachment list.
   */
  const attachmentResult =
    await buildAttachments(
      normalizedUserId,
      isFollowUp
    );

  const attachments =
    Array.isArray(
      attachmentResult.attachments
    )
      ? attachmentResult.attachments
      : [];

  const transporter =
    createTransporter(
      credentials
    );

  const mailOptions = {
    from:
      credentials.emailAddress,

    to:
      normalizedRecipient,

    subject,

    text:
      body,

    attachments
  };

  if (isFollowUp) {
    mailOptions.inReplyTo =
      parentMessageId;

    const references =
      Array.isArray(
        options.references
      )
        ? options.references
            .map(
              normalizeMessageId
            )
            .filter(Boolean)
        : [];

    if (
      !references.includes(
        parentMessageId
      )
    ) {
      references.push(
        parentMessageId
      );
    }

    mailOptions.references =
      references;
  }

  console.log(
    'Sender:',
    credentials.emailAddress
  );

  console.log(
    'Subject:',
    subject
  );

  console.log(
    'Attachments:',
    attachments.length
  );

  console.log(
    'Resume Attached:',
    attachmentResult.attached ===
      true
  );

  console.log(
    'Resume Filename:',
    attachmentResult.resume
      ?.originalName ||
      'Not applicable'
  );

  console.log(
    'In-Reply-To:',
    mailOptions.inReplyTo ||
    'Not applicable'
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

    console.log(
      '========== EMAIL SEND END =========='
    );

    return {
      status:
        'SENT',

      reason:
        '',

      messageId:
        info.messageId ||
        '',

      accepted:
        info.accepted ||
        [],

      rejected:
        info.rejected ||
        [],

      senderEmail:
        credentials.emailAddress,

      attachmentCount:
        attachments.length,

      resumeAttached:
        attachmentResult.attached ===
        true,

      resume:
        attachmentResult.resume ||
        null,

      emailType
    };
  } catch (error) {
    console.error(
      `Email sending failed for ${normalizedRecipient}:`,
      error.message
    );

    console.log(
      '========== EMAIL SEND END =========='
    );

    throw error;
  }
}

module.exports = {
  sendEmail,
  createTransporter,
  buildAttachments,
  normalizeRecipientEmail,
  normalizeMessageId
};