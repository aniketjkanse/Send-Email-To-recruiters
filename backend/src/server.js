require('dotenv').config();

const express =
  require('express');

const cors =
  require('cors');

const path =
  require('path');

const {
  prisma,
  connectDatabase,
  disconnectDatabase
} = require('./config/prisma');

/*
 * Route imports
 */
const authRoutes =
  require('./routes/auth.routes');

const senderAccountRoutes =
  require(
    './routes/senderAccount.routes'
  );

const recipientRoutes =
  require(
    './routes/recipient.routes'
  );

const configRoutes =
  require('./routes/config.routes');

const uploadRoutes =
  require('./routes/upload.routes');

const resumeRoutes =
  require('./routes/resume.routes');

const templateRoutes =
  require('./routes/template.routes');

const databaseTemplateRoutes =
  require(
    './routes/databaseTemplate.routes'
  );

const previewRoutes =
  require('./routes/preview.routes');

const sendRoutes =
  require('./routes/send.routes');

const historyRoutes =
  require('./routes/history.routes');

const replyDetectionRoutes =
  require(
    './routes/replyDetection.routes'
  );

const followUpRoutes =
  require('./routes/followup.routes');

const followUpBatchRoutes =
  require(
    './routes/followUpBatch.routes'
  );

const followUpSendRoutes =
  require(
    './routes/followUpSend.routes'
  );

const app =
  express();

const PORT =
  Number(
    process.env.PORT
  ) || 5000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'http://localhost:5173';

/*
 * CORS configuration.
 */
app.use(
  cors({
    origin:
      FRONTEND_URL,

    credentials:
      true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization'
    ]
  })
);

/*
 * Parse JSON request bodies.
 */
app.use(
  express.json({
    limit:
      '2mb'
  })
);

/*
 * Parse URL-encoded request bodies.
 */
app.use(
  express.urlencoded({
    extended:
      true,

    limit:
      '2mb'
  })
);

/*
 * Serve locally uploaded files.
 *
 * This is retained temporarily for
 * backward compatibility with the old
 * shared upload implementation.
 */
app.use(
  '/uploads',

  express.static(
    path.join(
      __dirname,
      'data',
      'uploads'
    )
  )
);

/*
 * General API health check.
 *
 * GET /api/health
 */
app.get(
  '/api/health',

  (req, res) => {
    return res.json({
      status:
        'UP',

      service:
        'Job Outreach Email Scheduler API',

      timestamp:
        new Date()
          .toISOString()
    });
  }
);

/*
 * PostgreSQL health check.
 *
 * GET /api/health/database
 */
app.get(
  '/api/health/database',

  async (req, res) => {
    try {
      await prisma.$queryRaw`
        SELECT 1
      `;

      return res.json({
        status:
          'UP',

        database:
          'PostgreSQL',

        timestamp:
          new Date()
            .toISOString()
      });
    } catch (error) {
      console.error(
        'Database health check failed:',
        error.message
      );

      return res
        .status(500)
        .json({
          status:
            'DOWN',

          database:
            'PostgreSQL',

          message:
            error.message,

          timestamp:
            new Date()
              .toISOString()
        });
    }
  }
);

/*
 * Authentication API.
 *
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 */
app.use(
  '/api/auth',
  authRoutes
);

/*
 * Per-user encrypted Sender Account.
 *
 * GET    /api/sender-account
 * PUT    /api/sender-account
 * POST   /api/sender-account/test
 * DELETE /api/sender-account
 */
app.use(
  '/api/sender-account',
  senderAccountRoutes
);

/*
 * Per-user PostgreSQL recipients.
 *
 * GET    /api/recipients
 * GET    /api/recipients/count
 * PUT    /api/recipients
 * POST   /api/recipients
 * DELETE /api/recipients
 * DELETE /api/recipients/:id
 */
app.use(
  '/api/recipients',
  recipientRoutes
);

/*
 * Legacy sender configuration.
 *
 * Keep temporarily until all callers
 * use SenderAccount.
 */
app.use(
  '/api/config',
  configRoutes
);

/*
 * Legacy recipient-file and shared
 * resume upload routes.
 *
 * Keep temporarily until the frontend
 * and email sender use /api/resume.
 */
app.use(
  '/api/upload',
  uploadRoutes
);

/*
 * Authenticated per-user Resume API.
 *
 * GET    /api/resume
 * GET    /api/resume/history
 * POST   /api/resume
 * DELETE /api/resume
 * DELETE /api/resume/:id
 */
app.use(
  '/api/resume',
  resumeRoutes
);

/*
 * Legacy JSON template API.
 *
 * Keep temporarily until all old
 * template dependencies are removed.
 */
app.use(
  '/api/template',
  templateRoutes
);

/*
 * Per-user PostgreSQL template API.
 *
 * GET  /api/db-template
 * PUT  /api/db-template
 * POST /api/db-template/reset
 */
app.use(
  '/api/db-template',
  databaseTemplateRoutes
);

/*
 * Per-user PostgreSQL preview.
 *
 * Uses:
 *
 * EmailTemplate
 * Recipient
 * SentEmail
 */
app.use(
  '/api/preview',
  previewRoutes
);

/*
 * Per-user initial-email scheduler.
 *
 * POST /api/send/start
 * GET  /api/send/status
 * POST /api/send/stop
 * POST /api/send/reset
 */
app.use(
  '/api/send',
  sendRoutes
);

/*
 * Per-user PostgreSQL Email History.
 *
 * GET    /api/history
 * GET    /api/history/summary
 * GET    /api/history/:id
 * DELETE /api/history
 * DELETE /api/history/:id
 */
app.use(
  '/api/history',
  historyRoutes
);

/*
 * Gmail IMAP reply-detection routes.
 *
 * These fixed routes are registered
 * before the general Follow-Up routes.
 *
 * POST /api/followups/test-imap
 * POST /api/followups/refresh-replies
 * POST /api/followups/:id/check-reply
 */
app.use(
  '/api/followups',
  replyDetectionRoutes
);

/*
 * Per-user PostgreSQL Follow-Up tracker.
 *
 * GET    /api/followups
 * GET    /api/followups/summary
 * GET    /api/followups/:id
 *
 * POST   /api/followups/:id/reply
 * POST   /api/followups/:id/reply-check
 * POST   /api/followups/:id/error
 * POST   /api/followups/:id/remove
 * POST   /api/followups/:id/restore
 * POST   /api/followups/:id/stop
 * POST   /api/followups/:id/resume
 *
 * DELETE /api/followups/:id
 */
app.use(
  '/api/followups',
  followUpRoutes
);

/*
 * Per-user Follow-Up batch API.
 *
 * Fixed batch routes are registered
 * before individual tracker-ID routes.
 *
 * GET  /api/followup-send/eligibility
 *
 * POST /api/followup-send/batch/follow-up-1
 * POST /api/followup-send/batch/follow-up-2
 *
 * GET  /api/followup-send/batch/status
 * POST /api/followup-send/batch/stop
 * POST /api/followup-send/batch/reset
 */
app.use(
  '/api/followup-send',
  followUpBatchRoutes
);

/*
 * Per-user individual Follow-Up sending.
 *
 * POST
 * /api/followup-send/:id/follow-up-1
 *
 * POST
 * /api/followup-send/:id/follow-up-2
 */
app.use(
  '/api/followup-send',
  followUpSendRoutes
);

/*
 * API-specific 404 handler.
 *
 * Keep after every valid API route.
 */
app.use(
  '/api',

  (req, res) => {
    return res
      .status(404)
      .json({
        message:
          `API endpoint not found: ${req.method} ${req.originalUrl}`
      });
  }
);

/*
 * General 404 handler.
 *
 * Keep after every valid route.
 */
app.use(
  (req, res) => {
    return res
      .status(404)
      .json({
        message:
          `Endpoint not found: ${req.method} ${req.originalUrl}`
      });
  }
);

/*
 * Central Express error handler.
 *
 * Express recognizes this as an error
 * handler because it has four arguments.
 */
app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      'Unhandled backend error:',
      error
    );

    if (
      res.headersSent
    ) {
      return next(
        error
      );
    }

    const requestedStatusCode =
      Number(
        error.status ||
        error.statusCode
      );

    const validStatusCode =
      Number.isInteger(
        requestedStatusCode
      ) &&
      requestedStatusCode >= 400 &&
      requestedStatusCode <= 599;

    const statusCode =
      validStatusCode
        ? requestedStatusCode
        : 500;

    return res
      .status(
        statusCode
      )
      .json({
        message:
          error.message ||
          'Internal server error.'
      });
  }
);

let server =
  null;

let shutdownInProgress =
  false;

/*
 * Connect to PostgreSQL before starting
 * the Express HTTP server.
 */
async function startServer() {
  try {
    await connectDatabase();

    server =
      app.listen(
        PORT,

        () => {
          console.log(
            '=================================='
          );

          console.log(
            `Backend running on port ${PORT}`
          );

          console.log(
            `Frontend allowed: ${FRONTEND_URL}`
          );

          console.log(
            `Health API: http://localhost:${PORT}/api/health`
          );

          console.log(
            `Database Health API: http://localhost:${PORT}/api/health/database`
          );

          console.log(
            'Authentication API ready'
          );

          console.log(
            'PostgreSQL Template API ready'
          );

          console.log(
            'Sender Account API ready'
          );

          console.log(
            'PostgreSQL Recipient API ready'
          );

          console.log(
            'Per-user Resume API ready'
          );

          console.log(
            'PostgreSQL Preview API ready'
          );

          console.log(
            'Per-user Scheduler API ready'
          );

          console.log(
            'PostgreSQL Email History API ready'
          );

          console.log(
            'PostgreSQL Follow-Up Tracker API ready'
          );

          console.log(
            'Follow-Up Batch API ready'
          );

          console.log(
            'Follow-Up Sending API ready'
          );

          console.log(
            'Gmail Reply Detection API ready'
          );

          console.log(
            '=================================='
          );
        }
      );

    server.on(
      'error',

      error => {
        console.error(
          'HTTP server error:',
          error
        );
      }
    );
  } catch (error) {
    console.error(
      'Backend could not start:',
      error.message
    );

    try {
      await disconnectDatabase();
    } catch (
      disconnectError
    ) {
      console.error(
        'Database cleanup after startup failure failed:',
        disconnectError.message
      );
    }

    process.exitCode =
      1;
  }
}

/*
 * Graceful shutdown.
 *
 * Closes:
 *
 * 1. Express HTTP server
 * 2. Prisma Client
 * 3. PostgreSQL connection pool
 */
async function shutdownServer(
  signal,
  exitCode = 0
) {
  if (
    shutdownInProgress
  ) {
    return;
  }

  shutdownInProgress =
    true;

  console.log(
    `${signal} received. Shutting down safely...`
  );

  try {
    if (server) {
      await new Promise(
        (
          resolve,
          reject
        ) => {
          server.close(
            error => {
              if (error) {
                reject(
                  error
                );

                return;
              }

              resolve();
            }
          );
        }
      );

      server =
        null;

      console.log(
        'HTTP server closed successfully'
      );
    }

    await disconnectDatabase();

    console.log(
      'Backend and PostgreSQL connections closed successfully'
    );

    process.exit(
      exitCode
    );
  } catch (error) {
    console.error(
      'Shutdown failed:',
      error.message
    );

    process.exit(
      1
    );
  }
}

/*
 * Process shutdown handlers.
 */
process.on(
  'SIGINT',

  () => {
    shutdownServer(
      'SIGINT',
      0
    );
  }
);

process.on(
  'SIGTERM',

  () => {
    shutdownServer(
      'SIGTERM',
      0
    );
  }
);

process.on(
  'unhandledRejection',

  reason => {
    console.error(
      'Unhandled Promise Rejection:',
      reason
    );
  }
);

process.on(
  'uncaughtException',

  error => {
    console.error(
      'Uncaught Exception:',
      error
    );

    shutdownServer(
      'UNCAUGHT_EXCEPTION',
      1
    );
  }
);

startServer();

module.exports =
  app;