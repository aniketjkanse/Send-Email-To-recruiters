require('dotenv').config();

const bcrypt =
  require('bcryptjs');

const jwt =
  require('jsonwebtoken');

const {
  prisma
} = require('../config/prisma');

const JWT_SECRET =
  process.env.JWT_SECRET;

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN ||
  '1d';

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is missing from backend/.env'
  );
}

const defaultTemplate = {
  subject:
    'Application for QA Automation Engineer Role',

  body: [
    'Hi,',
    '',
    'I wanted to share my profile for suitable QA Automation opportunities.',
    '',
    'Please find my resume attached for your reference.',
    '',
    'Thanks'
  ].join('\n'),

  followUp1Body: [
    'Dear Sir/Madam,',
    '',
    'I wanted to follow up on my previous email regarding suitable opportunities.',
    '',
    'I remain interested and would appreciate any update regarding my profile.',
    '',
    'Thank you for your time and consideration.',
    '',
    'Best Regards'
  ].join('\n'),

  followUp2Body: [
    'Dear Sir/Madam,',
    '',
    'I am writing one final follow-up regarding my previous email.',
    '',
    'Please consider my profile if a suitable opportunity is available.',
    '',
    'Thank you for your time.',
    '',
    'Best Regards'
  ].join('\n'),

  dailyLimit: 100,

  followUp1DailyLimit: 25,

  followUp2DailyLimit: 15,

  minDelaySeconds: 180,

  maxDelaySeconds: 420,

  skipPersonalEmails: true,

  dryRun: true
};

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function validateEmail(email) {
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(email);
}

function validatePassword(password) {
  const value =
    String(password || '');

  if (value.length < 8) {
    throw new Error(
      'Password must contain at least 8 characters.'
    );
  }

  if (!/[A-Za-z]/.test(value)) {
    throw new Error(
      'Password must contain at least one letter.'
    );
  }

  if (!/[0-9]/.test(value)) {
    throw new Error(
      'Password must contain at least one number.'
    );
  }

  return value;
}

function sanitizeUser(user) {
  return {
    id:
      user.id,

    name:
      user.name,

    email:
      user.email,

    isActive:
      user.isActive,

    createdAt:
      user.createdAt,

    updatedAt:
      user.updatedAt
  };
}

function createToken(user) {
  return jwt.sign(
    {
      userId:
        user.id,

      email:
        user.email
    },
    JWT_SECRET,
    {
      expiresIn:
        JWT_EXPIRES_IN
    }
  );
}

async function registerUser({
  name,
  email,
  password
}) {
  const normalizedEmail =
    normalizeEmail(email);

  const normalizedName =
    String(name || '')
      .trim();

  if (!normalizedName) {
    throw new Error(
      'Name is required.'
    );
  }

  if (
    normalizedName.length < 2
  ) {
    throw new Error(
      'Name must contain at least 2 characters.'
    );
  }

  if (
    !validateEmail(
      normalizedEmail
    )
  ) {
    throw new Error(
      'Enter a valid email address.'
    );
  }

  const validatedPassword =
    validatePassword(password);

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email:
          normalizedEmail
      }
    });

  if (existingUser) {
    throw new Error(
      'An account already exists with this email address.'
    );
  }

  const passwordHash =
    await bcrypt.hash(
      validatedPassword,
      12
    );

  /*
   * User and default template are created
   * in one database transaction.
   *
   * If template creation fails, the user
   * creation is rolled back.
   */
  const user =
    await prisma.$transaction(
      async transaction => {
        const createdUser =
          await transaction.user.create({
            data: {
              name:
                normalizedName,

              email:
                normalizedEmail,

              passwordHash,

              isActive:
                true
            }
          });

        await transaction
          .emailTemplate
          .create({
            data: {
              userId:
                createdUser.id,

              ...defaultTemplate
            }
          });

        return createdUser;
      }
    );

  const token =
    createToken(user);

  return {
    token,

    user:
      sanitizeUser(user)
  };
}

async function loginUser({
  email,
  password
}) {
  const normalizedEmail =
    normalizeEmail(email);

  if (
    !validateEmail(
      normalizedEmail
    )
  ) {
    throw new Error(
      'Enter a valid email address.'
    );
  }

  if (!password) {
    throw new Error(
      'Password is required.'
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        email:
          normalizedEmail
      }
    });

  /*
   * Use the same error for missing user
   * and incorrect password.
   *
   * This avoids exposing whether an
   * account exists.
   */
  if (!user) {
    throw new Error(
      'Invalid email or password.'
    );
  }

  if (user.isActive !== true) {
    throw new Error(
      'This account is inactive.'
    );
  }

  const passwordMatches =
    await bcrypt.compare(
      String(password),
      user.passwordHash
    );

  if (!passwordMatches) {
    throw new Error(
      'Invalid email or password.'
    );
  }

  const token =
    createToken(user);

  return {
    token,

    user:
      sanitizeUser(user)
  };
}

async function getUserById(
  userId
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id:
          userId
      }
    });

  if (!user) {
    throw new Error(
      'User account was not found.'
    );
  }

  if (user.isActive !== true) {
    throw new Error(
      'This account is inactive.'
    );
  }

  return sanitizeUser(user);
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  sanitizeUser,
  createToken
};