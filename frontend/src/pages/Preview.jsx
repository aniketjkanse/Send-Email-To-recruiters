import {
  useEffect,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

import SummaryCard from
  '../components/SummaryCard.jsx';

import EmailList from
  '../components/EmailList.jsx';

function Preview() {
  const [
    preview,
    setPreview
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState('');

  async function loadPreview(
    isRefresh = false
  ) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      /*
       * api.get automatically adds:
       *
       * Authorization: Bearer JWT_TOKEN
       */
      const response =
        await api.get(
          '/preview'
        );

      setPreview(
        response.data
      );
    } catch (requestError) {
      console.error(
        'Preview loading failed:',
        requestError
      );

      setError(
        requestError.message ||
        'Unable to load email preview.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPreview();
  }, []);

  function refreshPreview() {
    loadPreview(true);
  }

  if (loading) {
    return (
      <section>
        <h1>
          Email Preview
        </h1>

        <div className="card">
          Loading your email preview...
        </div>
      </section>
    );
  }

  if (
    error &&
    !preview
  ) {
    return (
      <section>
        <h1>
          Email Preview
        </h1>

        <div
          style={{
            padding:
              '16px',

            marginBottom:
              '18px',

            color:
              '#a21628',

            background:
              '#fff0f2',

            border:
              '1px solid #f2bac2',

            borderRadius:
              '9px'
          }}
        >
          {error}
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={
            refreshPreview
          }
          disabled={
            refreshing
          }
        >
          {refreshing
            ? 'Retrying...'
            : 'Retry Preview'}
        </button>
      </section>
    );
  }

  const totalInput =
    preview?.totalInput ??
    preview?.counts?.totalInput ??
    0;

  const uniqueInput =
    preview?.uniqueInput ??
    preview?.counts?.uniqueInput ??
    0;

  const newEmails =
    Array.isArray(
      preview?.newEmails
    )
      ? preview.newEmails
      : [];

  const alreadySentEmails =
    Array.isArray(
      preview?.alreadySentEmails
    )
      ? preview.alreadySentEmails
      : [];

  const blockedEmails =
    Array.isArray(
      preview?.blockedEmails
    )
      ? preview.blockedEmails
      : [];

  const invalidEmails =
    Array.isArray(
      preview?.invalidEmails
    )
      ? preview.invalidEmails
      : [];

  const template =
    preview?.template ||
    {};

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
            '22px'
        }}
      >
        <div>
          <h1
            style={{
              marginBottom:
                '7px'
            }}
          >
            Email Preview
          </h1>

          <p
            className="muted"
            style={{
              margin:
                0
            }}
          >
            Review filtered recipients
            before starting the email
            scheduler.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={
            refreshPreview
          }
          disabled={
            refreshing
          }
        >
          {refreshing
            ? 'Refreshing...'
            : 'Refresh Preview'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding:
              '13px 15px',

            marginBottom:
              '18px',

            color:
              '#a21628',

            background:
              '#fff0f2',

            border:
              '1px solid #f2bac2',

            borderRadius:
              '9px'
          }}
        >
          {error}
        </div>
      )}

      {preview?.source ===
        'POSTGRESQL' && (
        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            flexWrap:
              'wrap',

            gap:
              '14px',

            padding:
              '16px 18px',

            marginBottom:
              '22px',

            background:
              '#eef8f2',

            border:
              '1px solid #b9dfc7',

            borderRadius:
              '11px'
          }}
        >
          <div>
            <strong
              style={{
                display:
                  'block',

                marginBottom:
                  '5px',

                color:
                  '#17653a'
              }}
            >
              PostgreSQL Template Active
            </strong>

            <span
              style={{
                color:
                  '#557064',

                fontSize:
                  '13px'
              }}
            >
              This preview uses the
              template belonging to the
              currently logged-in user.
            </span>
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
                '1px solid #b9dfc7',

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
      )}

      <div className="grid-cards">
        <SummaryCard
          label="Total Input"
          value={totalInput}
        />

        <SummaryCard
          label="Unique Input"
          value={uniqueInput}
        />

        <SummaryCard
          label="New"
          value={
            newEmails.length
          }
          tone="success"
        />

        <SummaryCard
          label="Already Sent"
          value={
            alreadySentEmails.length
          }
          tone="warning"
        />

        <SummaryCard
          label="Blocked"
          value={
            blockedEmails.length
          }
          tone="danger"
        />

        <SummaryCard
          label="Invalid"
          value={
            invalidEmails.length
          }
          tone="danger"
        />
      </div>

      <div
        style={{
          padding:
            '20px',

          marginTop:
            '22px',

          marginBottom:
            '22px',

          background:
            '#ffffff',

          border:
            '1px solid #dce4ef',

          borderRadius:
            '13px',

          boxShadow:
            '0 6px 18px rgba(15, 39, 73, 0.05)'
        }}
      >
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
              '16px'
          }}
        >
          <div>
            <h2
              style={{
                margin:
                  '0 0 8px',

                color:
                  '#102747'
              }}
            >
              Active Initial Template
            </h2>

            <p
              style={{
                margin:
                  0,

                color:
                  '#68788e'
              }}
            >
              Settings currently used to
              generate this preview.
            </p>
          </div>

          <div
            style={{
              display:
                'flex',

              flexWrap:
                'wrap',

              gap:
                '8px'
            }}
          >
            <span
              style={{
                padding:
                  '6px 10px',

                color:
                  '#34506f',

                background:
                  '#f3f6fa',

                borderRadius:
                  '20px',

                fontSize:
                  '12px',

                fontWeight:
                  '700'
              }}
            >
              Daily Limit:
              {' '}
              {template.dailyLimit ??
                0}
            </span>

            <span
              style={{
                padding:
                  '6px 10px',

                color:
                  '#34506f',

                background:
                  '#f3f6fa',

                borderRadius:
                  '20px',

                fontSize:
                  '12px',

                fontWeight:
                  '700'
              }}
            >
              Delay:
              {' '}
              {template
                .minDelaySeconds ??
                0}
              {' - '}
              {template
                .maxDelaySeconds ??
                0}
              {' sec'}
            </span>

            <span
              style={{
                padding:
                  '6px 10px',

                color:
                  template.dryRun
                    ? '#8a5a00'
                    : '#17653a',

                background:
                  template.dryRun
                    ? '#fff4d8'
                    : '#eaf8f0',

                borderRadius:
                  '20px',

                fontSize:
                  '12px',

                fontWeight:
                  '800'
              }}
            >
              {template.dryRun
                ? 'Dry Run ON'
                : 'Live Sending'}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop:
              '18px'
          }}
        >
          <strong
            style={{
              display:
                'block',

              marginBottom:
                '7px',

              color:
                '#1b2f4b'
            }}
          >
            Subject
          </strong>

          <div
            style={{
              padding:
                '12px 14px',

              color:
                '#24364f',

              background:
                '#f6f8fb',

              border:
                '1px solid #e0e6ee',

              borderRadius:
                '8px'
            }}
          >
            {template.subject ||
              'No subject configured'}
          </div>
        </div>

        <div
          style={{
            marginTop:
              '16px'
          }}
        >
          <strong
            style={{
              display:
                'block',

              marginBottom:
                '7px',

              color:
                '#1b2f4b'
            }}
          >
            Personal Domain Filtering
          </strong>

          <div
            style={{
              color:
                '#68788e',

              fontSize:
                '14px'
            }}
          >
            {template
              .skipPersonalEmails
              ? (
                'Personal email domains are currently blocked.'
              )
              : (
                'Personal email domains are allowed.'
              )}
          </div>
        </div>
      </div>

      <EmailList
        title="New Emails Ready To Send"
        emails={newEmails}
      />

      <EmailList
        title="Already Sent Emails"
        emails={
          alreadySentEmails
        }
      />

      <EmailList
        title="Blocked Personal Domain Emails"
        emails={
          blockedEmails
        }
      />

      <EmailList
        title="Invalid Emails"
        emails={
          invalidEmails
        }
      />
    </section>
  );
}

export default Preview;