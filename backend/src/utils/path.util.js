const path =
  require('path');

const SOURCE_DIR =
  path.resolve(
    __dirname,
    '..'
  );

const DATA_DIR =
  path.join(
    SOURCE_DIR,
    'data'
  );

const UPLOAD_DIR =
  path.join(
    DATA_DIR,
    'uploads',
    'temporary'
  );

const PRIVATE_DATA_DIR =
  path.join(
    DATA_DIR,
    'private'
  );

const PRIVATE_RESUME_DIR =
  path.join(
    PRIVATE_DATA_DIR,
    'resumes'
  );

module.exports = {
  SOURCE_DIR,
  DATA_DIR,
  UPLOAD_DIR,
  PRIVATE_DATA_DIR,
  PRIVATE_RESUME_DIR
};