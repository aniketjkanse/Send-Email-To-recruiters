import {
  useEffect,
  useRef,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

import ResumeManager from
  '../components/ResumeManager.jsx';

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

function getErrorMessage(
  error,
  fallbackMessage
) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

function UploadEmails() {
  const [
    emailsFile,
    setEmailsFile
  ] = useState(null);

  const [
    uploadMode,
    setUploadMode
  ] = useState(
    'REPLACE'
  );

  const [
    recipientCount,
    setRecipientCount
  ] = useState(0);

  const [
    uploadResult,
    setUploadResult
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    uploadingEmails,
    setUploadingEmails
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    messageType,
    setMessageType
  ] = useState('');

  const emailsInputRef =
    useRef(null);

  function showMessage(
    text,
    type = 'success'
  ) {
    setMessage(
      text
    );

    setMessageType(
      type
    );
  }

  function clearMessage() {
    setMessage('');
    setMessageType('');
  }

  async function loadRecipientCount() {
    const response =
      await api.get(
        '/recipients/count'
      );

    const total =
      response.data.total ??
      response.data.count ??
      response.data
        .recipientCount ??
      0;

    setRecipientCount(
      Number(total) || 0
    );
  }

  async function loadPageData() {
    setLoading(true);
    clearMessage();

    try {
      await loadRecipientCount();
    } catch (error) {
      console.error(
        'Unable to load Upload Emails page:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to load recipient information.'
        ),
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    () => {
      loadPageData();
    },
    []
  );

  function handleEmailsFileChange(
    event
  ) {
    const selectedFile =
      event.target
        .files?.[0] ||
      null;

    setEmailsFile(
      selectedFile
    );

    setUploadResult(
      null
    );

    clearMessage();
  }

  function validateEmailsFile() {
    if (!emailsFile) {
      throw new Error(
        'Select an email file first.'
      );
    }

    const fileName =
      String(
        emailsFile.name ||
        ''
      ).toLowerCase();

    const validExtension =
      fileName.endsWith(
        '.txt'
      ) ||
      fileName.endsWith(
        '.csv'
      );

    if (!validExtension) {
      throw new Error(
        'Recipient file must be a TXT or CSV file.'
      );
    }

    if (
      !Number.isFinite(
        emailsFile.size
      ) ||
      emailsFile.size <= 0
    ) {
      throw new Error(
        'Recipient file is empty or invalid.'
      );
    }

    if (
      emailsFile.size >
      MAX_FILE_SIZE
    ) {
      throw new Error(
        'Recipient file must be 10 MB or smaller.'
      );
    }
  }

  async function uploadEmails() {
    setUploadingEmails(true);
    clearMessage();
    setUploadResult(null);

    try {
      validateEmailsFile();

      const formData =
        new FormData();

      /*
       * This field name must match:
       *
       * upload.single('emailsFile')
       *
       * in upload.routes.js.
       */
      formData.append(
        'emailsFile',
        emailsFile
      );

      formData.append(
        'mode',
        uploadMode
      );

      const response =
        await api.post(
          '/upload/emails',
          formData
        );

      const result =
        response.data ||
        {};

      setUploadResult(
        result.recipients ||
        result.result ||
        null
      );

      showMessage(
        result.message ||
        'Recipients uploaded successfully.'
      );

      setEmailsFile(
        null
      );

      if (
        emailsInputRef.current
      ) {
        emailsInputRef
          .current
          .value =
          '';
      }

      await loadRecipientCount();
    } catch (error) {
      console.error(
        'Recipient upload failed:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to upload recipients.'
        ),
        'error'
      );
    } finally {
      setUploadingEmails(false);
    }
  }

  const operationRunning =
    uploadingEmails;

  if (loading) {
    return (
      <section>
        <h1>
          Upload Files
        </h1>

        <div className="panel">
          Loading upload information...
        </div>
      </section>
    );
  }

  return (
    <section>
      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'flex-start',

          flexWrap:
            'wrap',

          gap:
            '16px',

          marginBottom:
            '24px'
        }}
      >
        <div>
          <h1
            style={{
              marginBottom:
                '6px'
            }}
          >
            Upload Files
          </h1>

          <p
            className="muted"
            style={{
              margin:
                0
            }}
          >
            Upload recipient email
            addresses and manage your
            private Resume.
          </p>
        </div>

        <div
          style={{
            padding:
              '9px 14px',

            color:
              '#17653a',

            background:
              '#eaf8f0',

            border:
              '1px solid #b7dfc5',

            borderRadius:
              '20px',

            fontSize:
              '13px',

            fontWeight:
              '800'
          }}
        >
          PostgreSQL Recipients:
          {' '}
          {recipientCount}
        </div>
      </div>

      {message && (
        <div
          style={{
            padding:
              '13px 15px',

            marginBottom:
              '20px',

            color:
              messageType ===
              'error'
                ? '#a21628'
                : '#17653a',

            background:
              messageType ===
              'error'
                ? '#fff0f2'
                : '#eaf8f0',

            border:
              messageType ===
              'error'
                ? (
                  '1px solid ' +
                  '#f2bac2'
                )
                : (
                  '1px solid ' +
                  '#b7dfc5'
                ),

            borderRadius:
              '9px',

            fontWeight:
              '700'
          }}
        >
          {message}
        </div>
      )}

      <div className="panel">
        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'flex-start',

            flexWrap:
              'wrap',

            gap:
              '14px',

            marginBottom:
              '18px'
          }}
        >
          <div>
            <h3
              style={{
                margin:
                  '0 0 6px'
              }}
            >
              Upload Recipient Emails
            </h3>

            <p
              className="muted"
              style={{
                margin:
                  0
              }}
            >
              TXT and CSV files are
              supported. Addresses may be
              separated by lines, commas,
              or semicolons.
            </p>
          </div>

          <span
            style={{
              padding:
                '6px 11px',

              color:
                '#17653a',

              background:
                '#ffffff',

              border:
                '1px solid #b7dfc5',

              borderRadius:
                '20px',

              fontSize:
                '12px',

              fontWeight:
                '800'
            }}
          >
            PostgreSQL
          </span>
        </div>

        <div
          style={{
            marginBottom:
              '18px'
          }}
        >
          <strong
            style={{
              display:
                'block',

              marginBottom:
                '9px'
            }}
          >
            Upload Mode
          </strong>

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                (
                  'repeat(auto-fit, ' +
                  'minmax(220px, 1fr))'
                ),

              gap:
                '12px'
            }}
          >
            <label
              style={{
                display:
                  'flex',

                alignItems:
                  'flex-start',

                gap:
                  '10px',

                padding:
                  '14px',

                cursor:
                  'pointer',

                background:
                  uploadMode ===
                  'REPLACE'
                    ? '#eef6ff'
                    : '#f7f9fc',

                border:
                  uploadMode ===
                  'REPLACE'
                    ? (
                      '1px solid ' +
                      '#1769c2'
                    )
                    : (
                      '1px solid ' +
                      '#dce4ef'
                    ),

                borderRadius:
                  '9px'
              }}
            >
              <input
                type="radio"
                name="uploadMode"
                value="REPLACE"
                checked={
                  uploadMode ===
                  'REPLACE'
                }
                disabled={
                  operationRunning
                }
                onChange={
                  event => {
                    setUploadMode(
                      event.target.value
                    );
                  }
                }
              />

              <span>
                <strong
                  style={{
                    display:
                      'block'
                  }}
                >
                  Replace
                </strong>

                <small className="muted">
                  Replace only your
                  existing recipient
                  list.
                </small>
              </span>
            </label>

            <label
              style={{
                display:
                  'flex',

                alignItems:
                  'flex-start',

                gap:
                  '10px',

                padding:
                  '14px',

                cursor:
                  'pointer',

                background:
                  uploadMode ===
                  'APPEND'
                    ? '#eef6ff'
                    : '#f7f9fc',

                border:
                  uploadMode ===
                  'APPEND'
                    ? (
                      '1px solid ' +
                      '#1769c2'
                    )
                    : (
                      '1px solid ' +
                      '#dce4ef'
                    ),

                borderRadius:
                  '9px'
              }}
            >
              <input
                type="radio"
                name="uploadMode"
                value="APPEND"
                checked={
                  uploadMode ===
                  'APPEND'
                }
                disabled={
                  operationRunning
                }
                onChange={
                  event => {
                    setUploadMode(
                      event.target.value
                    );
                  }
                }
              />

              <span>
                <strong
                  style={{
                    display:
                      'block'
                  }}
                >
                  Append
                </strong>

                <small className="muted">
                  Keep existing
                  recipients and add
                  only new addresses.
                </small>
              </span>
            </label>
          </div>
        </div>

        <input
          ref={
            emailsInputRef
          }
          type="file"
          accept={
            '.txt,.csv,' +
            'text/plain,text/csv'
          }
          disabled={
            operationRunning
          }
          onChange={
            handleEmailsFileChange
          }
        />

        {emailsFile && (
          <div
            style={{
              marginTop:
                '10px',

              color:
                '#34506f',

              fontSize:
                '13px'
            }}
          >
            Selected:
            {' '}

            <strong>
              {emailsFile.name}
            </strong>
          </div>
        )}

        <button
          type="button"
          className="primary-button"
          disabled={
            !emailsFile ||
            operationRunning
          }
          onClick={
            uploadEmails
          }
          style={{
            marginTop:
              '16px'
          }}
        >
          {uploadingEmails
            ? 'Uploading...'
            : uploadMode ===
              'REPLACE'
              ? (
                'Upload and Replace'
              )
              : (
                'Upload and Append'
              )}
        </button>

        {uploadResult && (
          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                (
                  'repeat(auto-fit, ' +
                  'minmax(120px, 1fr))'
                ),

              gap:
                '10px',

              padding:
                '16px',

              marginTop:
                '18px',

              background:
                '#f7f9fc',

              border:
                '1px solid #dce4ef',

              borderRadius:
                '10px'
            }}
          >
            <ResultItem
              label="Total Input"
              value={
                uploadResult
                  .totalInput ??
                0
              }
            />

            <ResultItem
              label="Valid"
              value={
                uploadResult
                  .validCount ??
                0
              }
              color="#17653a"
            />

            <ResultItem
              label="Inserted"
              value={
                uploadResult
                  .insertedCount ??
                0
              }
              color="#1769c2"
            />

            <ResultItem
              label="Duplicates"
              value={
                uploadResult
                  .duplicateCount ??
                0
              }
              color="#8a5a00"
            />

            <ResultItem
              label="Invalid"
              value={
                uploadResult
                  .invalidCount ??
                0
              }
              color="#a21628"
            />
          </div>
        )}

        {Array.isArray(
          uploadResult
            ?.invalidEmails
        ) &&
          uploadResult
            .invalidEmails
            .length > 0 && (
          <div
            style={{
              padding:
                '14px',

              marginTop:
                '14px',

              color:
                '#8d1b2c',

              background:
                '#fff5f6',

              border:
                '1px solid #f2c3ca',

              borderRadius:
                '9px'
            }}
          >
            <strong>
              Invalid addresses
            </strong>

            <ul
              style={{
                marginBottom:
                  0
              }}
            >
              {uploadResult
                .invalidEmails
                .map(
                  (
                    email,
                    index
                  ) => (
                    <li
                      key={
                        `${email}-${index}`
                      }
                    >
                      {email}
                    </li>
                  )
                )}
            </ul>
          </div>
        )}
      </div>

      {/*
       * New private, per-user Resume
       * manager.
       *
       * This replaces the old shared
       * /api/upload/resume workflow.
       */}
      <ResumeManager />
    </section>
  );
}

function ResultItem({
  label,
  value,
  color = '#24364f'
}) {
  return (
    <div>
      <small className="muted">
        {label}
      </small>

      <strong
        style={{
          display:
            'block',

          marginTop:
            '4px',

          color,

          fontSize:
            '20px'
        }}
      >
        {value}
      </strong>
    </div>
  );
}

export default UploadEmails;