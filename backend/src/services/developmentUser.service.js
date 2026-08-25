const {
  prisma
} = require('../config/prisma');

const DEVELOPMENT_EMAIL =
  'dev@example.com';

async function getDevelopmentUser() {
  const user =
    await prisma.user.findUnique({
      where: {
        email:
          DEVELOPMENT_EMAIL
      }
    });

  if (!user) {
    throw new Error(
      'Development user was not found. Run: npx prisma db seed'
    );
  }

  if (user.isActive !== true) {
    throw new Error(
      'Development user is inactive.'
    );
  }

  return user;
}

module.exports = {
  DEVELOPMENT_EMAIL,
  getDevelopmentUser
};