require('dotenv').config();

const crypto =
  require('crypto');

const ALGORITHM =
  'aes-256-gcm';

const IV_LENGTH =
  12;

function getEncryptionKey() {
  const encodedKey =
    process.env
      .CREDENTIAL_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY is missing from backend/.env'
    );
  }

  const encryptionKey =
    Buffer.from(
      encodedKey,
      'base64'
    );

  if (
    encryptionKey.length !== 32
  ) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes.'
    );
  }

  return encryptionKey;
}

function encryptCredential(
  plainText
) {
  const credential =
    String(
      plainText || ''
    ).trim();

  if (!credential) {
    throw new Error(
      'Credential value is required.'
    );
  }

  const encryptionKey =
    getEncryptionKey();

  const initializationVector =
    crypto.randomBytes(
      IV_LENGTH
    );

  const cipher =
    crypto.createCipheriv(
      ALGORITHM,
      encryptionKey,
      initializationVector
    );

  const encryptedBuffer =
    Buffer.concat([
      cipher.update(
        credential,
        'utf8'
      ),

      cipher.final()
    ]);

  const authenticationTag =
    cipher.getAuthTag();

  return [
    initializationVector
      .toString('base64'),

    authenticationTag
      .toString('base64'),

    encryptedBuffer
      .toString('base64')
  ].join('.');
}

function decryptCredential(
  encryptedValue
) {
  const value =
    String(
      encryptedValue || ''
    ).trim();

  if (!value) {
    throw new Error(
      'Encrypted credential is missing.'
    );
  }

  const parts =
    value.split('.');

  if (parts.length !== 3) {
    throw new Error(
      'Encrypted credential format is invalid.'
    );
  }

  const [
    initializationVectorValue,
    authenticationTagValue,
    encryptedCredentialValue
  ] = parts;

  const initializationVector =
    Buffer.from(
      initializationVectorValue,
      'base64'
    );

  const authenticationTag =
    Buffer.from(
      authenticationTagValue,
      'base64'
    );

  const encryptedCredential =
    Buffer.from(
      encryptedCredentialValue,
      'base64'
    );

  const encryptionKey =
    getEncryptionKey();

  const decipher =
    crypto.createDecipheriv(
      ALGORITHM,
      encryptionKey,
      initializationVector
    );

  decipher.setAuthTag(
    authenticationTag
  );

  const decryptedBuffer =
    Buffer.concat([
      decipher.update(
        encryptedCredential
      ),

      decipher.final()
    ]);

  return decryptedBuffer.toString(
    'utf8'
  );
}

module.exports = {
  encryptCredential,
  decryptCredential
};