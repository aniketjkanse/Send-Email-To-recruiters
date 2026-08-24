import {
  useEffect,
  useState
} from 'react';

import {
  apiGet,
  apiPost,
  apiPut
} from '../services/api.js';

import './Template.css';

const emptyTemplate = {
  subject: '',
  body: '',
  dailyLimit: 100,
  minDelaySeconds: 180,
  maxDelaySeconds: 420,
  skipPersonalEmails: true,
  dryRun: true
};

function Template() {
  const [
    template,
    setTemplate
  ] = useState(
    emptyTemplate
  );

  const [
    originalTemplate,
    setOriginalTemplate
  ] = useState(
    emptyTemplate
  );

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    resetting,
    setResetting
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    messageType,
    setMessageType
  ] = useState('');

  async function loadTemplate() {
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const result =
        await apiGet(
          '/db-template'
        );

      const databaseTemplate =
        result.template || {};

      const loadedTemplate = {
        subject:
          databaseTemplate.subject ||
          '',

        body:
          databaseTemplate.body ||
          '',

        dailyLimit:
          databaseTemplate.dailyLimit ??
          100,

        minDelaySeconds:
          databaseTemplate
            .minDelaySeconds ??
          180,

        maxDelaySeconds:
          databaseTemplate
            .maxDelaySeconds ??
          420,

        skipPersonalEmails:
          databaseTemplate
            .skipPersonalEmails ??
          true,

        dryRun:
          databaseTemplate.dryRun ??
          true
      };

      setTemplate(
        loadedTemplate
      );

      setOriginalTemplate(
        loadedTemplate
      );
    } catch (error) {
      setMessage(
        error.message
      );

      setMessageType(
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplate();
  }, []);

  function updateField(
    event
  ) {
    const {
      name,
      value,
      type,
      checked
    } = event.target;

    setTemplate(current => ({
      ...current,

      [name]:
        type === 'checkbox'
          ? checked
          : value
    }));
  }

  function validateTemplate() {
    const subject =
      String(
        template.subject || ''
      ).trim();

    const body =
      String(
        template.body || ''
      ).trim();

    const dailyLimit =
      Number(
        template.dailyLimit
      );

    const minDelaySeconds =
      Number(
        template.minDelaySeconds
      );

    const maxDelaySeconds =
      Number(
        template.maxDelaySeconds
      );

    if (!subject) {
      throw new Error(
        'Email subject is required.'
      );
    }

    if (!body) {
      throw new Error(
        'Email body is required.'
      );
    }

    if (
      !Number.isFinite(
        dailyLimit
      ) ||
      dailyLimit < 1
    ) {
      throw new Error(
        'Daily limit must be at least 1.'
      );
    }

    if (
      !Number.isFinite(
        minDelaySeconds
      ) ||
      minDelaySeconds < 0
    ) {
      throw new Error(
        'Minimum delay cannot be negative.'
      );
    }

    if (
      !Number.isFinite(
        maxDelaySeconds
      ) ||
      maxDelaySeconds <
        minDelaySeconds
    ) {
      throw new Error(
        'Maximum delay must be greater than or equal to minimum delay.'
      );
    }
  }

  async function handleSave(
    event
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setMessageType('');

    try {
      validateTemplate();

      /*
       * Send only initial-email settings.
       *
       * Follow-Up bodies and limits remain
       * untouched in PostgreSQL because the
       * backend performs a partial update.
       */
      const payload = {
        subject:
          String(
            template.subject
          ).trim(),

        body:
          String(
            template.body
          ),

        dailyLimit:
          Number(
            template.dailyLimit
          ),

        minDelaySeconds:
          Number(
            template.minDelaySeconds
          ),

        maxDelaySeconds:
          Number(
            template.maxDelaySeconds
          ),

        skipPersonalEmails:
          Boolean(
            template
              .skipPersonalEmails
          ),

        dryRun:
          Boolean(
            template.dryRun
          )
      };

      const result =
        await apiPut(
          '/db-template',
          payload
        );

      const savedData =
        result.template || {};

      const savedTemplate = {
        subject:
          savedData.subject ||
          '',

        body:
          savedData.body ||
          '',

        dailyLimit:
          savedData.dailyLimit ??
          100,

        minDelaySeconds:
          savedData
            .minDelaySeconds ??
          180,

        maxDelaySeconds:
          savedData
            .maxDelaySeconds ??
          420,

        skipPersonalEmails:
          savedData
            .skipPersonalEmails ??
          true,

        dryRun:
          savedData.dryRun ??
          true
      };

      setTemplate(
        savedTemplate
      );

      setOriginalTemplate(
        savedTemplate
      );

      setMessage(
        'Initial email template saved successfully.'
      );

      setMessageType(
        'success'
      );
    } catch (error) {
      setMessage(
        error.message
      );

      setMessageType(
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed =
      window.confirm(
        'Reset the initial email template to default values?'
      );

    if (!confirmed) {
      return;
    }

    setResetting(true);
    setMessage('');
    setMessageType('');

    try {
      /*
       * This existing reset endpoint currently
       * resets every template field, including
       * follow-ups.
       *
       * We therefore perform an initial-template
       * reset through PUT instead, so the
       * Follow-Ups tab remains untouched.
       */
      const resetPayload = {
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

        dailyLimit: 100,

        minDelaySeconds: 180,

        maxDelaySeconds: 420,

        skipPersonalEmails: true,

        dryRun: true
      };

      const result =
        await apiPut(
          '/db-template',
          resetPayload
        );

      const resetData =
        result.template || {};

      const resetTemplate = {
        subject:
          resetData.subject ||
          resetPayload.subject,

        body:
          resetData.body ||
          resetPayload.body,

        dailyLimit:
          resetData.dailyLimit ??
          resetPayload.dailyLimit,

        minDelaySeconds:
          resetData
            .minDelaySeconds ??
          resetPayload
            .minDelaySeconds,

        maxDelaySeconds:
          resetData
            .maxDelaySeconds ??
          resetPayload
            .maxDelaySeconds,

        skipPersonalEmails:
          resetData
            .skipPersonalEmails ??
          resetPayload
            .skipPersonalEmails,

        dryRun:
          resetData.dryRun ??
          resetPayload.dryRun
      };

      setTemplate(
        resetTemplate
      );

      setOriginalTemplate(
        resetTemplate
      );

      setMessage(
        'Initial email template reset successfully.'
      );

      setMessageType(
        'success'
      );
    } catch (error) {
      setMessage(
        error.message
      );

      setMessageType(
        'error'
      );
    } finally {
      setResetting(false);
    }
  }

  function discardChanges() {
    setTemplate({
      ...originalTemplate
    });

    setMessage(
      'Unsaved changes discarded.'
    );

    setMessageType(
      'success'
    );
  }

  const hasUnsavedChanges =
    JSON.stringify(template) !==
    JSON.stringify(
      originalTemplate
    );

  if (loading) {
    return (
      <div className="template-page">
        <section className="template-card template-loading">
          Loading your template...
        </section>
      </div>
    );
  }

  return (
    <div className="template-page">
      <section className="template-card">
        <header className="template-header">
          <div>
            <h1>
              Initial Email Template
            </h1>

            <p>
              Configure the first email
              sent to recruiters. Follow-Up
              templates are managed from the
              Follow-Ups tab.
            </p>
          </div>

          <span className="database-badge">
            PostgreSQL
          </span>
        </header>

        {message && (
          <div
            className={
              messageType === 'error'
                ? 'template-message template-message-error'
                : 'template-message template-message-success'
            }
          >
            {message}
          </div>
        )}

        <form
          className="template-form"
          onSubmit={
            handleSave
          }
        >
          <div className="template-section">
            <div className="template-section-heading">
              <h2>
                Email Content
              </h2>

              <p>
                This content is used only
                for the initial outreach
                email.
              </p>
            </div>

            <label className="template-field">
              <span>
                Subject
              </span>

              <input
                type="text"
                name="subject"
                value={
                  template.subject
                }
                onChange={
                  updateField
                }
                placeholder="Enter initial email subject"
                required
              />
            </label>

            <label className="template-field">
              <span>
                Email Body
              </span>

              <textarea
                name="body"
                rows="13"
                value={
                  template.body
                }
                onChange={
                  updateField
                }
                placeholder="Enter initial email body"
                required
              />
            </label>
          </div>

          <div className="template-section">
            <div className="template-section-heading">
              <h2>
                Sending Controls
              </h2>

              <p>
                These settings apply only
                to initial emails.
              </p>
            </div>

            <div className="template-controls-grid">
              <label className="template-field">
                <span>
                  Daily Limit
                </span>

                <input
                  type="number"
                  name="dailyLimit"
                  min="1"
                  value={
                    template.dailyLimit
                  }
                  onChange={
                    updateField
                  }
                  required
                />

                <small>
                  Maximum number of initial
                  emails to send per day.
                </small>
              </label>

              <label className="template-field">
                <span>
                  Minimum Delay
                </span>

                <div className="input-with-unit">
                  <input
                    type="number"
                    name="minDelaySeconds"
                    min="0"
                    value={
                      template
                        .minDelaySeconds
                    }
                    onChange={
                      updateField
                    }
                    required
                  />

                  <span>
                    seconds
                  </span>
                </div>
              </label>

              <label className="template-field">
                <span>
                  Maximum Delay
                </span>

                <div className="input-with-unit">
                  <input
                    type="number"
                    name="maxDelaySeconds"
                    min="0"
                    value={
                      template
                        .maxDelaySeconds
                    }
                    onChange={
                      updateField
                    }
                    required
                  />

                  <span>
                    seconds
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="template-section">
            <div className="template-section-heading">
              <h2>
                Safety Settings
              </h2>

              <p>
                Configure recipient filtering
                and test mode.
              </p>
            </div>

            <div className="safety-settings">
              <label className="safety-option">
                <input
                  type="checkbox"
                  name="skipPersonalEmails"
                  checked={
                    template
                      .skipPersonalEmails
                  }
                  onChange={
                    updateField
                  }
                />

                <div>
                  <strong>
                    Skip personal email domains
                  </strong>

                  <span>
                    Exclude configured personal
                    domains from initial outreach.
                  </span>
                </div>
              </label>

              <label className="safety-option">
                <input
                  type="checkbox"
                  name="dryRun"
                  checked={
                    template.dryRun
                  }
                  onChange={
                    updateField
                  }
                />

                <div>
                  <strong>
                    Dry-run mode
                  </strong>

                  <span>
                    Test the workflow without
                    sending real emails.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <footer className="template-actions">
            <button
              type="submit"
              className="template-button template-button-primary"
              disabled={
                saving ||
                resetting ||
                !hasUnsavedChanges
              }
            >
              {saving
                ? 'Saving...'
                : 'Save Template'}
            </button>

            <button
              type="button"
              className="template-button template-button-secondary"
              disabled={
                saving ||
                resetting ||
                !hasUnsavedChanges
              }
              onClick={
                discardChanges
              }
            >
              Discard Changes
            </button>

            <button
              type="button"
              className="template-button template-button-danger"
              disabled={
                saving ||
                resetting
              }
              onClick={
                handleReset
              }
            >
              {resetting
                ? 'Resetting...'
                : 'Reset Initial Template'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default Template;