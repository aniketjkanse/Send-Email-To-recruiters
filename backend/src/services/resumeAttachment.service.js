const {
  getActiveResumeFile
} = require(
  './resumeStorage.service'
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
      'Authenticated user ID is required.'
    );
  }

  return normalizedUserId;
}

function normalizeEmailType(
  value
) {
  const emailType =
    String(
      value ||
      'INITIAL'
    )
      .trim()
      .toUpperCase();

  const allowedEmailTypes = [
    'INITIAL',
    'FOLLOW_UP_1',
    'FOLLOW_UP_2'
  ];

  if (
    !allowedEmailTypes.includes(
      emailType
    )
  ) {
    throw new Error(
      `Invalid email type: ${emailType}`
    );
  }

  return emailType;
}

/*
 * Resume attachment behavior:
 *
 * INITIAL
 * → Attach the logged-in user's active
 *   resume when one is configured.
 *
 * FOLLOW_UP_1
 * FOLLOW_UP_2
 * → Do not attach the resume.
 */
function shouldAttachResume(
  emailType
) {
  const normalizedEmailType =
    normalizeEmailType(
      emailType
    );

  return (
    normalizedEmailType ===
    'INITIAL'
  );
}

/*
 * Convert the active Resume database
 * record into Nodemailer attachment
 * format.
 */
function createNodemailerAttachment(
  resume
) {
  if (!resume) {
    return null;
  }

  if (!resume.storagePath) {
    throw new Error(
      'Active resume storage path is missing.'
    );
  }

  if (!resume.originalName) {
    throw new Error(
      'Active resume filename is missing.'
    );
  }

  if (!resume.mimeType) {
    throw new Error(
      'Active resume MIME type is missing.'
    );
  }

  return {
    filename:
      resume.originalName,

    path:
      resume.storagePath,

    contentType:
      resume.mimeType
  };
}

/*
 * Get the Nodemailer attachment list for
 * one user and email type.
 *
 * Options:
 *
 * requireResume:
 * true  → Initial sending fails when no
 *         active resume is configured.
 *
 * false → Initial sending continues
 *         without an attachment.
 */
async function getResumeAttachments(
  userId,
  emailType = 'INITIAL',
  options = {}
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedEmailType =
    normalizeEmailType(
      emailType
    );

  const requireResume =
    options.requireResume ===
    true;

  if (
    !shouldAttachResume(
      normalizedEmailType
    )
  ) {
    return {
      configured:
        false,

      attached:
        false,

      emailType:
        normalizedEmailType,

      resume:
        null,

      attachments:
        [],

      message:
        'Resume attachment is not required for Follow-Up emails.'
    };
  }

  const activeResume =
    await getActiveResumeFile(
      normalizedUserId
    );

  if (!activeResume) {
    if (requireResume) {
      throw new Error(
        'No active resume is configured. Upload a resume before sending initial emails.'
      );
    }

    return {
      configured:
        false,

      attached:
        false,

      emailType:
        normalizedEmailType,

      resume:
        null,

      attachments:
        [],

      message:
        'No active resume is configured. Initial email will continue without an attachment.'
    };
  }

  const attachment =
    createNodemailerAttachment(
      activeResume
    );

  return {
    configured:
      true,

    attached:
      true,

    emailType:
      normalizedEmailType,

    resume: {
      id:
        activeResume.id,

      originalName:
        activeResume.originalName,

      mimeType:
        activeResume.mimeType,

      fileSize:
        activeResume.fileSize,

      uploadedAt:
        activeResume.uploadedAt
    },

    attachments: [
      attachment
    ],

    message:
      'Active user resume is ready for attachment.'
  };
}

/*
 * Convenience function for initial-email
 * sending.
 *
 * Resume is required by default because
 * the original outreach workflow attaches
 * a resume to each initial email.
 */
async function getInitialEmailAttachments(
  userId,
  options = {}
) {
  return getResumeAttachments(
    userId,
    'INITIAL',
    {
      requireResume:
        options.requireResume !==
        false
    }
  );
}

/*
 * Follow-Up emails intentionally return
 * an empty attachment list.
 */
async function getFollowUpAttachments(
  userId,
  emailType
) {
  return getResumeAttachments(
    userId,
    emailType,
    {
      requireResume:
        false
    }
  );
}

module.exports = {
  requireUserId,
  normalizeEmailType,
  shouldAttachResume,
  createNodemailerAttachment,
  getResumeAttachments,
  getInitialEmailAttachments,
  getFollowUpAttachments
};