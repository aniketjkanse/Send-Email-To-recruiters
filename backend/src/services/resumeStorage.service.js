const fs =
  require('fs');

const fsPromises =
  require('fs/promises');

const path =
  require('path');

const crypto =
  require('crypto');

const {
  prisma
} = require(
  '../config/prisma'
);

const {
  PRIVATE_RESUME_DIR
} = require(
  '../utils/path.util'
);

/*
 * Private per-user Resume location:
 *
 * backend/src/data/private/resumes/USER_ID/
 *
 * This directory is outside the public
 * /uploads Express static directory.
 */
const UPLOAD_ROOT =
  PRIVATE_RESUME_DIR;

/*
 * Maximum Resume size:
 * 10 MB
 */
const MAX_RESUME_SIZE =
  10 *
  1024 *
  1024;

const ALLOWED_MIME_TYPES =
  new Set([
    'application/pdf',

    'application/msword',

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

const ALLOWED_EXTENSIONS =
  new Set([
    '.pdf',
    '.doc',
    '.docx'
  ]);

const MIME_TYPE_EXTENSIONS = {
  'application/pdf':
    '.pdf',

  'application/msword':
    '.doc',

  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx'
};

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

function normalizeFileName(
  value
) {
  const rawFileName =
    path.basename(
      String(
        value ||
        'resume'
      )
    );

  const extension =
    path
      .extname(
        rawFileName
      )
      .toLowerCase();

  const baseName =
    path
      .basename(
        rawFileName,
        extension
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        '-'
      )
      .replace(
        /-+/g,
        '-'
      )
      .replace(
        /^[-_.]+|[-_.]+$/g,
        ''
      )
      .slice(
        0,
        100
      );

  return (
    `${baseName || 'resume'}${extension}`
  );
}

function normalizeMimeType(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}

function resolveResumeExtension(
  originalName,
  mimeType
) {
  const normalizedMimeType =
    normalizeMimeType(
      mimeType
    );

  const extensionFromMimeType =
    MIME_TYPE_EXTENSIONS[
      normalizedMimeType
    ];

  if (extensionFromMimeType) {
    return extensionFromMimeType;
  }

  return path
    .extname(
      String(
        originalName || ''
      )
    )
    .toLowerCase();
}

function validateResumeFile({
  originalName,
  mimeType,
  fileSize
}) {
  const normalizedOriginalName =
    normalizeFileName(
      originalName
    );

  const normalizedMimeType =
    normalizeMimeType(
      mimeType
    );

  const normalizedFileSize =
    Number(
      fileSize
    );

  if (!normalizedOriginalName) {
    throw new Error(
      'Resume filename is required.'
    );
  }

  if (
    !ALLOWED_MIME_TYPES.has(
      normalizedMimeType
    )
  ) {
    throw new Error(
      'Only PDF, DOC, and DOCX resume files are allowed.'
    );
  }

  if (
    !Number.isFinite(
      normalizedFileSize
    ) ||
    normalizedFileSize <= 0
  ) {
    throw new Error(
      'Resume file is empty or invalid.'
    );
  }

  if (
    normalizedFileSize >
    MAX_RESUME_SIZE
  ) {
    throw new Error(
      'Resume file size must not exceed 10 MB.'
    );
  }

  const originalExtension =
    path
      .extname(
        normalizedOriginalName
      )
      .toLowerCase();

  const expectedExtension =
    resolveResumeExtension(
      normalizedOriginalName,
      normalizedMimeType
    );

  if (
    !ALLOWED_EXTENSIONS.has(
      originalExtension
    )
  ) {
    throw new Error(
      'Resume filename must use PDF, DOC, or DOCX extension.'
    );
  }

  if (
    originalExtension !==
    expectedExtension
  ) {
    throw new Error(
      'Resume file extension does not match its content type.'
    );
  }

  return {
    originalName:
      normalizedOriginalName,

    mimeType:
      normalizedMimeType,

    fileSize:
      Math.floor(
        normalizedFileSize
      ),

    extension:
      expectedExtension
  };
}

function getSafeUserFolderName(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const safeUserId =
    normalizedUserId.replace(
      /[^a-zA-Z0-9_-]/g,
      ''
    );

  if (!safeUserId) {
    throw new Error(
      'Authenticated user ID is invalid.'
    );
  }

  return safeUserId;
}

function getUserResumeDirectory(
  userId
) {
  const safeUserId =
    getSafeUserFolderName(
      userId
    );

  return path.join(
    UPLOAD_ROOT,
    safeUserId
  );
}

function createStoredFileName(
  extension
) {
  const normalizedExtension =
    String(
      extension || ''
    ).toLowerCase();

  if (
    !ALLOWED_EXTENSIONS.has(
      normalizedExtension
    )
  ) {
    throw new Error(
      'Invalid Resume file extension.'
    );
  }

  const timestamp =
    Date.now();

  const randomValue =
    crypto
      .randomBytes(12)
      .toString('hex');

  return (
    `resume-${timestamp}-${randomValue}${normalizedExtension}`
  );
}

function isPathInsideDirectory(
  parentDirectory,
  targetPath
) {
  if (
    !parentDirectory ||
    !targetPath
  ) {
    return false;
  }

  const resolvedParent =
    path.resolve(
      parentDirectory
    );

  const resolvedTarget =
    path.resolve(
      targetPath
    );

  const relativePath =
    path.relative(
      resolvedParent,
      resolvedTarget
    );

  return (
    Boolean(
      relativePath
    ) &&
    !relativePath.startsWith(
      '..'
    ) &&
    !path.isAbsolute(
      relativePath
    )
  );
}

function mapResumeRecord(
  record
) {
  if (!record) {
    return null;
  }

  return {
    id:
      record.id,

    originalName:
      record.originalName,

    storedName:
      record.storedName,

    mimeType:
      record.mimeType,

    fileSize:
      record.fileSize,

    isActive:
      record.isActive,

    uploadedAt:
      record.uploadedAt,

    createdAt:
      record.createdAt,

    updatedAt:
      record.updatedAt
  };
}

async function ensureUploadRoot() {
  await fsPromises.mkdir(
    UPLOAD_ROOT,
    {
      recursive:
        true
    }
  );

  return UPLOAD_ROOT;
}

async function ensureUserResumeDirectory(
  userId
) {
  await ensureUploadRoot();

  const userDirectory =
    getUserResumeDirectory(
      userId
    );

  await fsPromises.mkdir(
    userDirectory,
    {
      recursive:
        true
    }
  );

  return userDirectory;
}

async function fileExists(
  filePath
) {
  if (!filePath) {
    return false;
  }

  try {
    await fsPromises.access(
      filePath,
      fs.constants.F_OK
    );

    return true;
  } catch {
    return false;
  }
}

async function deleteFileSafely(
  filePath,
  expectedParentDirectory
) {
  if (
    !filePath ||
    !expectedParentDirectory
  ) {
    return false;
  }

  if (
    !isPathInsideDirectory(
      expectedParentDirectory,
      filePath
    )
  ) {
    console.error(
      'Resume file deletion blocked because the path is outside the user directory.'
    );

    return false;
  }

  try {
    await fsPromises.unlink(
      filePath
    );

    return true;
  } catch (error) {
    if (
      error.code ===
      'ENOENT'
    ) {
      return false;
    }

    console.error(
      `Unable to delete Resume file ${filePath}:`,
      error.message
    );

    return false;
  }
}

async function getActiveResumeRecord(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  return prisma.resume.findFirst({
    where: {
      userId:
        normalizedUserId,

      isActive:
        true
    },

    orderBy: {
      uploadedAt:
        'desc'
    }
  });
}

async function getActiveResume(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const record =
    await getActiveResumeRecord(
      normalizedUserId
    );

  if (!record) {
    return null;
  }

  const userDirectory =
    getUserResumeDirectory(
      normalizedUserId
    );

  const validStoragePath =
    isPathInsideDirectory(
      userDirectory,
      record.storagePath
    );

  const physicalFileExists =
    validStoragePath
      ? await fileExists(
          record.storagePath
        )
      : false;

  return {
    ...mapResumeRecord(
      record
    ),

    fileExists:
      physicalFileExists
  };
}

async function getActiveResumeFile(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const record =
    await getActiveResumeRecord(
      normalizedUserId
    );

  if (!record) {
    return null;
  }

  const userDirectory =
    getUserResumeDirectory(
      normalizedUserId
    );

  if (
    !isPathInsideDirectory(
      userDirectory,
      record.storagePath
    )
  ) {
    throw new Error(
      'Stored Resume path is invalid.'
    );
  }

  const physicalFileExists =
    await fileExists(
      record.storagePath
    );

  if (!physicalFileExists) {
    throw new Error(
      'Resume metadata exists, but the physical file is missing.'
    );
  }

  return {
    ...mapResumeRecord(
      record
    ),

    storagePath:
      record.storagePath
  };
}

async function getResumeHistory(
  userId,
  limit = 20
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const parsedLimit =
    Number(
      limit
    );

  const safeLimit =
    Number.isFinite(
      parsedLimit
    ) &&
    parsedLimit > 0
      ? Math.min(
          Math.floor(
            parsedLimit
          ),
          100
        )
      : 20;

  const records =
    await prisma.resume.findMany({
      where: {
        userId:
          normalizedUserId
      },

      orderBy: {
        uploadedAt:
          'desc'
      },

      take:
        safeLimit
    });

  return records.map(
    mapResumeRecord
  );
}

async function saveResume(
  userId,
  file
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  if (!file) {
    throw new Error(
      'Resume file is required.'
    );
  }

  const validation =
    validateResumeFile({
      originalName:
        file.originalname,

      mimeType:
        file.mimetype,

      fileSize:
        file.size
    });

  if (
    !Buffer.isBuffer(
      file.buffer
    )
  ) {
    throw new Error(
      'Resume upload buffer is missing.'
    );
  }

  if (
    file.buffer.length !==
    validation.fileSize
  ) {
    throw new Error(
      'Resume file size does not match the uploaded content.'
    );
  }

  const userDirectory =
    await ensureUserResumeDirectory(
      normalizedUserId
    );

  const storedName =
    createStoredFileName(
      validation.extension
    );

  const storagePath =
    path.join(
      userDirectory,
      storedName
    );

  if (
    !isPathInsideDirectory(
      userDirectory,
      storagePath
    )
  ) {
    throw new Error(
      'Generated Resume storage path is invalid.'
    );
  }

  let fileWritten =
    false;

  try {
    await fsPromises.writeFile(
      storagePath,
      file.buffer,
      {
        flag:
          'wx'
      }
    );

    fileWritten =
      true;

    const createdRecord =
      await prisma.$transaction(
        async transaction => {
          await transaction.resume.updateMany({
            where: {
              userId:
                normalizedUserId,

              isActive:
                true
            },

            data: {
              isActive:
                false
            }
          });

          return transaction.resume.create({
            data: {
              userId:
                normalizedUserId,

              originalName:
                validation.originalName,

              storedName,

              storagePath,

              mimeType:
                validation.mimeType,

              fileSize:
                validation.fileSize,

              isActive:
                true,

              uploadedAt:
                new Date()
            }
          });
        }
      );

    return mapResumeRecord(
      createdRecord
    );
  } catch (error) {
    if (fileWritten) {
      await deleteFileSafely(
        storagePath,
        userDirectory
      );
    }

    throw error;
  }
}

async function deactivateResume(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const activeRecord =
    await getActiveResumeRecord(
      normalizedUserId
    );

  if (!activeRecord) {
    return {
      removed:
        false,

      fileDeleted:
        false,

      message:
        'No active Resume is configured.'
    };
  }

  const userDirectory =
    getUserResumeDirectory(
      normalizedUserId
    );

  const updateResult =
    await prisma.resume.updateMany({
      where: {
        id:
          activeRecord.id,

        userId:
          normalizedUserId,

        isActive:
          true
      },

      data: {
        isActive:
          false
      }
    });

  const fileDeleted =
    await deleteFileSafely(
      activeRecord.storagePath,
      userDirectory
    );

  return {
    removed:
      updateResult.count > 0,

    fileDeleted,

    resume:
      mapResumeRecord({
        ...activeRecord,

        isActive:
          false
      }),

    message:
      updateResult.count > 0
        ? 'Resume removed successfully.'
        : 'Resume was already inactive.'
  };
}

async function deleteResumePermanently(
  userId,
  resumeId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedResumeId =
    String(
      resumeId || ''
    ).trim();

  if (!normalizedResumeId) {
    throw new Error(
      'Resume ID is required.'
    );
  }

  const record =
    await prisma.resume.findFirst({
      where: {
        id:
          normalizedResumeId,

        userId:
          normalizedUserId
      }
    });

  if (!record) {
    return {
      deleted:
        false,

      fileDeleted:
        false,

      message:
        'Resume record was not found.'
    };
  }

  const userDirectory =
    getUserResumeDirectory(
      normalizedUserId
    );

  /*
   * Prevent the active Resume from being
   * deleted through the History endpoint.
   *
   * The active Resume must be removed or
   * replaced through the dedicated API.
   */
  if (
    record.isActive ===
    true
  ) {
    throw new Error(
      'The active Resume cannot be deleted from history. Remove or replace the active Resume first.'
    );
  }

  const deleteResult =
    await prisma.resume.deleteMany({
      where: {
        id:
          normalizedResumeId,

        userId:
          normalizedUserId,

        isActive:
          false
      }
    });

  if (
    deleteResult.count ===
    0
  ) {
    return {
      deleted:
        false,

      fileDeleted:
        false,

      message:
        'Resume record was not found or is currently active.'
    };
  }

  const fileDeleted =
    await deleteFileSafely(
      record.storagePath,
      userDirectory
    );

  return {
    deleted:
      true,

    fileDeleted,

    resume:
      mapResumeRecord(
        record
      ),

    message:
      'Resume permanently deleted.'
  };
}

async function cleanupInactiveResumeFiles(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const inactiveRecords =
    await prisma.resume.findMany({
      where: {
        userId:
          normalizedUserId,

        isActive:
          false
      }
    });

  const userDirectory =
    getUserResumeDirectory(
      normalizedUserId
    );

  let deletedFiles =
    0;

  let failedFileDeletes =
    0;

  for (
    const record of
      inactiveRecords
  ) {
    const physicalFileExists =
      await fileExists(
        record.storagePath
      );

    if (!physicalFileExists) {
      continue;
    }

    const deleted =
      await deleteFileSafely(
        record.storagePath,
        userDirectory
      );

    if (deleted) {
      deletedFiles +=
        1;
    } else {
      failedFileDeletes +=
        1;
    }
  }

  return {
    checkedRecords:
      inactiveRecords.length,

    deletedFiles,

    failedFileDeletes
  };
}

/*
 * Delete all inactive Resume history
 * belonging to one authenticated user.
 *
 * The active Resume database record and
 * physical file are preserved.
 */
async function deleteAllInactiveResumeHistory(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const inactiveRecords =
    await prisma.resume.findMany({
      where: {
        userId:
          normalizedUserId,

        isActive:
          false
      },

      orderBy: {
        uploadedAt:
          'desc'
      }
    });

  if (
    inactiveRecords.length ===
    0
  ) {
    return {
      deletedRecords:
        0,

      deletedFiles:
        0,

      failedFileDeletes:
        0,

      activeResumePreserved:
        true,

      message:
        'No inactive Resume history is available.'
    };
  }

  const userDirectory =
    getUserResumeDirectory(
      normalizedUserId
    );

  let deletedFiles =
    0;

  let failedFileDeletes =
    0;

  for (
    const record of
      inactiveRecords
  ) {
    const physicalFileExists =
      await fileExists(
        record.storagePath
      );

    if (!physicalFileExists) {
      continue;
    }

    const fileDeleted =
      await deleteFileSafely(
        record.storagePath,
        userDirectory
      );

    if (fileDeleted) {
      deletedFiles +=
        1;
    } else {
      failedFileDeletes +=
        1;
    }
  }

  const deleteResult =
    await prisma.resume.deleteMany({
      where: {
        userId:
          normalizedUserId,

        isActive:
          false
      }
    });

  return {
    deletedRecords:
      deleteResult.count,

    deletedFiles,

    failedFileDeletes,

    activeResumePreserved:
      true,

    message:
      deleteResult.count > 0
        ? (
          `${deleteResult.count} Resume history record(s) deleted successfully.`
        )
        : (
          'No inactive Resume history is available.'
        )
  };
}

module.exports = {
  UPLOAD_ROOT,
  MAX_RESUME_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MIME_TYPE_EXTENSIONS,
  requireUserId,
  normalizeFileName,
  normalizeMimeType,
  resolveResumeExtension,
  validateResumeFile,
  getSafeUserFolderName,
  getUserResumeDirectory,
  createStoredFileName,
  isPathInsideDirectory,
  mapResumeRecord,
  ensureUploadRoot,
  ensureUserResumeDirectory,
  fileExists,
  deleteFileSafely,
  getActiveResumeRecord,
  getActiveResume,
  getActiveResumeFile,
  getResumeHistory,
  saveResume,
  deactivateResume,
  deleteResumePermanently,
  cleanupInactiveResumeFiles,
  deleteAllInactiveResumeHistory
};