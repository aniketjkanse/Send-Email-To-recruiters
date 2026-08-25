require('dotenv').config();

const jwt =
  require('jsonwebtoken');

const {
  prisma
} = require('../config/prisma');

const JWT_SECRET =
  process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is missing from backend/.env'
  );
}

async function authenticateToken(
  req,
  res,
  next
) {
  try {
    const authorizationHeader =
      req.headers.authorization;

    if (!authorizationHeader) {
      return res
        .status(401)
        .json({
          message:
            'Authorization token is required.'
        });
    }

    const [
      scheme,
      token
    ] = authorizationHeader.split(
      ' '
    );

    if (
      scheme !== 'Bearer' ||
      !token
    ) {
      return res
        .status(401)
        .json({
          message:
            'Authorization header must use Bearer token format.'
        });
    }

    let decodedToken;

    try {
      decodedToken =
        jwt.verify(
          token,
          JWT_SECRET
        );
    } catch (error) {
      return res
        .status(401)
        .json({
          message:
            'Token is invalid or expired.'
        });
    }

    if (
      !decodedToken.userId
    ) {
      return res
        .status(401)
        .json({
          message:
            'Token does not contain a valid user ID.'
        });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id:
            decodedToken.userId
        },

        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

    if (!user) {
      return res
        .status(401)
        .json({
          message:
            'User account was not found.'
        });
    }

    if (user.isActive !== true) {
      return res
        .status(403)
        .json({
          message:
            'User account is inactive.'
        });
    }

    /*
     * Every protected controller can now use:
     *
     * req.user.id
     * req.user.email
     */
    req.user =
      user;

    next();
  } catch (error) {
    console.error(
      'Authentication middleware failed:',
      error.message
    );

    return res
      .status(500)
      .json({
        message:
          'Authentication processing failed.'
      });
  }
}

module.exports = {
  authenticateToken
};
