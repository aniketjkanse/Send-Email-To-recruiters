const nodemailer =
  require('nodemailer');

const {
  prisma
} = require('../config/prisma');

const {
  encryptCredential,
  decryptCredential
} = require(
  '../utils/credentialCrypto.util'
);

function normalizeGmailAddress(
  value
) {
  const normalizedValue =
    String(value || '')
      .trim()
      .toLowerCase();

  if (!normalizedValue) {
    return '';
  }

  if (
    !normalizedValue.includes('@')
  ) {
    return `${normalizedValue}@gmail.com`;
  }

  return normalizedValue;
}

function validateEmail(
  emailAddress
) {
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(
    emailAddress
  );
}

function mapSenderAccount(
  senderAccount
) {
  if (!senderAccount) {
    return {
      configured: false,
      provider: 'gmail',
      emailAddress: '',
      passwordConfigured: false,
      isActive: false
    };
  }

  return {
    id:
      senderAccount.id,

    configured: true,

    provider:
      senderAccount.provider,

    emailAddress:
      senderAccount.emailAddress,

    passwordConfigured:
      Boolean(
        senderAccount
          .encryptedPassword
      ),

    isActive:
      senderAccount.isActive,

    createdAt:
      senderAccount.createdAt,

    updatedAt:
      senderAccount.updatedAt
  };
}

async function verifyUser(
  userId
) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id:
          userId
      },

      select: {
        id: true,
        isActive: true
      }
    });

  if (!user) {
    throw new Error(
      'User account was not found.'
    );
  }

  if (!user.isActive) {
    throw new Error(
      'User account is inactive.'
    );
  }

  return user;
}

async function getSenderAccount(
  userId
) {
  await verifyUser(userId);

  const senderAccount =
    await prisma.senderAccount
      .findUnique({
        where: {
          userId
        }
      });

  return mapSenderAccount(
    senderAccount
  );
}

async function getSenderCredentials(
  userId
) {
  await verifyUser(userId);

  const senderAccount =
    await prisma.senderAccount
      .findUnique({
        where: {
          userId
        }
      });

  if (!senderAccount) {
    throw new Error(
      'Sender account is not configured.'
    );
  }

  if (!senderAccount.isActive) {
    throw new Error(
      'Sender account is inactive.'
    );
  }

  if (
    !senderAccount
      .encryptedPassword
  ) {
    throw new Error(
      'Sender App Password is not configured.'
    );
  }

  const appPassword =
    decryptCredential(
      senderAccount
        .encryptedPassword
    );

  return {
    provider:
      senderAccount.provider,

    emailAddress:
      senderAccount.emailAddress,

    appPassword
  };
}

async function saveSenderAccount(
  userId,
  input = {}
) {
  await verifyUser(userId);

  const existingAccount =
    await prisma.senderAccount
      .findUnique({
        where: {
          userId
        }
      });

  const provider =
    String(
      input.provider ||
      existingAccount?.provider ||
      'gmail'
    )
      .trim()
      .toLowerCase();

  if (provider !== 'gmail') {
    throw new Error(
      'Only Gmail is currently supported.'
    );
  }

  const emailAddress =
    normalizeGmailAddress(
      input.emailAddress ||
      existingAccount
        ?.emailAddress
    );

  if (
    !validateEmail(
      emailAddress
    )
  ) {
    throw new Error(
      'Enter a valid sender email address.'
    );
  }

  const incomingPassword =
    String(
      input.appPassword || ''
    ).trim();

  let encryptedPassword =
    existingAccount
      ?.encryptedPassword ||
    '';

  if (incomingPassword) {
    encryptedPassword =
      encryptCredential(
        incomingPassword
      );
  }

  if (!encryptedPassword) {
    throw new Error(
      'Gmail App Password is required.'
    );
  }

  const isActive =
    input.isActive === undefined
      ? (
          existingAccount
            ?.isActive ??
          true
        )
      : (
          input.isActive === true ||
          input.isActive === 'true'
        );

  const senderAccount =
    await prisma.senderAccount
      .upsert({
        where: {
          userId
        },

        update: {
          provider,
          emailAddress,
          encryptedPassword,
          isActive
        },

        create: {
          userId,
          provider,
          emailAddress,
          encryptedPassword,
          isActive
        }
      });

  return mapSenderAccount(
    senderAccount
  );
}

async function testSenderAccount(
  userId
) {
  const credentials =
    await getSenderCredentials(
      userId
    );

  const transporter =
    nodemailer.createTransport({
      service: 'gmail',

      auth: {
        user:
          credentials
            .emailAddress,

        pass:
          credentials
            .appPassword
      }
    });

  await transporter.verify();

  return {
    success: true,

    provider:
      credentials.provider,

    emailAddress:
      credentials.emailAddress,

    message:
      'Gmail sender account verified successfully.'
  };
}

async function deleteSenderAccount(
  userId
) {
  await verifyUser(userId);

  const existingAccount =
    await prisma.senderAccount
      .findUnique({
        where: {
          userId
        }
      });

  if (!existingAccount) {
    return {
      deleted: false,

      message:
        'Sender account was already not configured.'
    };
  }

  await prisma.senderAccount
    .delete({
      where: {
        userId
      }
    });

  return {
    deleted: true,

    message:
      'Sender account removed successfully.'
  };
}

module.exports = {
  normalizeGmailAddress,
  getSenderAccount,
  getSenderCredentials,
  saveSenderAccount,
  testSenderAccount,
  deleteSenderAccount
};