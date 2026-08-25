const {
  getActiveResume,
  getResumeHistory,
  saveResume,
  deactivateResume,
  deleteResumePermanently,
  deleteAllInactiveResumeHistory
} = require(
  '../services/resumeStorage.service'
);

function getAuthenticatedUserId(
  req
) {
  const userId =
    String(
      req.user?.id ||
      ''
    ).trim();

  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function getErrorStatusCode(
  error
) {
  const message =
    String(
      error?.message ||
      ''
    ).toLowerCase();

  if (
    message.includes(
      'not found'
    )
  ) {
    return 404;
  }

  if (
    message.includes(
      'too large'
    ) ||
    message.includes(
      '10 mb'
    )
  ) {
    return 413;
  }

  return 400;
}

function normalizeHistoryLimit(
  value
) {
  const parsedValue =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    parsedValue < 1
  ) {
    return 20;
  }

  return Math.min(
    Math.floor(
      parsedValue
    ),
    100
  );
}

async function getCurrentResume(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const resume =
      await getActiveResume(
        userId
      );

    if (!resume) {
      return res.json({
        source:
          'POSTGRESQL',

        configured:
          false,

        resume:
          null,

        message:
          'No active resume is configured.'
      });
    }

    return res.json({
      source:
        'POSTGRESQL',

      configured:
        true,

      resume,

      message:
        resume.fileExists
          ? (
            'Active resume loaded successfully.'
          )
          : (
            'Resume metadata exists, but the physical file is missing.'
          )
    });
  } catch (error) {
    console.error(
      'Unable to load active resume:',
      error
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        source:
          'POSTGRESQL',

        configured:
          false,

        resume:
          null,

        message:
          error.message ||
          'Unable to load active resume.'
      });
  }
}

async function getUserResumeHistory(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const limit =
      normalizeHistoryLimit(
        req.query.limit
      );

    const resumes =
      await getResumeHistory(
        userId,
        limit
      );

    return res.json({
      source:
        'POSTGRESQL',

      total:
        resumes.length,

      resumes,

      message:
        'Resume history loaded successfully.'
    });
  } catch (error) {
    console.error(
      'Unable to load Resume history:',
      error
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        source:
          'POSTGRESQL',

        total:
          0,

        resumes:
          [],

        message:
          error.message ||
          'Unable to load Resume history.'
      });
  }
}

async function uploadResume(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!req.file) {
      return res
        .status(400)
        .json({
          source:
            'POSTGRESQL',

          message:
            'Resume file is required. Use the multipart field name "resume".'
        });
    }

    const resume =
      await saveResume(
        userId,
        req.file
      );

    return res
      .status(201)
      .json({
        source:
          'POSTGRESQL',

        configured:
          true,

        resume,

        message:
          'Resume uploaded successfully.'
      });
  } catch (error) {
    console.error(
      'Resume upload failed:',
      error
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        source:
          'POSTGRESQL',

        configured:
          false,

        message:
          error.message ||
          'Unable to upload Resume.'
      });
  }
}

async function removeCurrentResume(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const result =
      await deactivateResume(
        userId
      );

    return res.json({
      source:
        'POSTGRESQL',

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to remove active Resume:',
      error
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        source:
          'POSTGRESQL',

        removed:
          false,

        message:
          error.message ||
          'Unable to remove active Resume.'
      });
  }
}

async function deleteResumeById(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const resumeId =
      String(
        req.params.id ||
        ''
      ).trim();

    if (!resumeId) {
      return res
        .status(400)
        .json({
          source:
            'POSTGRESQL',

          deleted:
            false,

          message:
            'Resume ID is required.'
        });
    }

    const result =
      await deleteResumePermanently(
        userId,
        resumeId
      );

    if (!result.deleted) {
      return res
        .status(404)
        .json({
          source:
            'POSTGRESQL',

          ...result
        });
    }

    return res.json({
      source:
        'POSTGRESQL',

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to permanently delete Resume:',
      error
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        source:
          'POSTGRESQL',

        deleted:
          false,

        message:
          error.message ||
          'Unable to permanently delete Resume.'
      });
  }
}

/*
 * Delete every inactive Resume history
 * record for the authenticated user.
 *
 * The current active Resume is preserved.
 *
 * DELETE /api/resume/history
 */
async function deleteUserResumeHistory(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const result =
      await deleteAllInactiveResumeHistory(
        userId
      );

    return res.json({
      source:
        'POSTGRESQL',

      activeResumePreserved:
        true,

      ...result
    });
  } catch (error) {
    console.error(
      'Unable to delete Resume history:',
      error
    );

    return res
      .status(
        getErrorStatusCode(
          error
        )
      )
      .json({
        source:
          'POSTGRESQL',

        activeResumePreserved:
          true,

        deletedRecords:
          0,

        deletedFiles:
          0,

        message:
          error.message ||
          'Unable to delete Resume history.'
      });
  }
}

module.exports = {
  getCurrentResume,
  getUserResumeHistory,
  uploadResume,
  removeCurrentResume,
  deleteResumeById,
  deleteUserResumeHistory
};