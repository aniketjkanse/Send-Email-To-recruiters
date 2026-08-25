const {
  registerUser,
  loginUser,
  getUserById
} = require(
  '../services/auth.service'
);

async function register(
  req,
  res
) {
  try {
    const result =
      await registerUser({
        name:
          req.body?.name,

        email:
          req.body?.email,

        password:
          req.body?.password
      });

    return res
      .status(201)
      .json({
        message:
          'Account registered successfully.',

        ...result
      });
  } catch (error) {
    console.error(
      'Registration failed:',
      error.message
    );

    const duplicateAccount =
      error.message.includes(
        'already exists'
      );

    return res
      .status(
        duplicateAccount
          ? 409
          : 400
      )
      .json({
        message:
          error.message
      });
  }
}

async function login(
  req,
  res
) {
  try {
    const result =
      await loginUser({
        email:
          req.body?.email,

        password:
          req.body?.password
      });

    return res.json({
      message:
        'Login successful.',

      ...result
    });
  } catch (error) {
    console.error(
      'Login failed:',
      error.message
    );

    return res
      .status(401)
      .json({
        message:
          error.message
      });
  }
}

async function getCurrentUser(
  req,
  res
) {
  try {
    const user =
      await getUserById(
        req.user.id
      );

    return res.json({
      user
    });
  } catch (error) {
    console.error(
      'Unable to load current user:',
      error.message
    );

    return res
      .status(404)
      .json({
        message:
          error.message
      });
  }
}

module.exports = {
  register,
  login,
  getCurrentUser
};