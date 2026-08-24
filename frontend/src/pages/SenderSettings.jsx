import {
  useEffect,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

import './SenderSettings.css';

const emptySenderAccount = {
  provider: 'gmail',
  emailAddress: '',
  appPassword: '',
  isActive: true,
  configured: false,
  passwordConfigured: false
};

function SenderSettings() {
  const [
    senderAccount,
    setSenderAccount
  ] = useState(
    emptySenderAccount
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
    testing,
    setTesting
  ] = useState(false);

  const [
    deleting,
    setDeleting
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    messageType,
    setMessageType
  ] = useState('');

  async function loadSenderAccount() {
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response =
        await api.get(
          '/sender-account'
        );

      const account =
        response.data
          .senderAccount ||
        {};

      setSenderAccount({
        provider:
          account.provider ||
          'gmail',

        emailAddress:
          account.emailAddress ||
          '',

        appPassword: '',

        isActive:
          account.isActive ??
          true,

        configured:
          account.configured ===
          true,

        passwordConfigured:
          account
            .passwordConfigured ===
          true
      });
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
    loadSenderAccount();
  }, []);

  function updateField(
    event
  ) {
    const {
      name,
      value,
      checked,
      type
    } = event.target;

    setSenderAccount(
      current => ({
        ...current,

        [name]:
          type === 'checkbox'
            ? checked
            : value
      })
    );
  }

  function validateForm() {
    const email =
      String(
        senderAccount.emailAddress ||
        ''
      ).trim();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(email)
    ) {
      throw new Error(
        'Enter a valid Gmail address.'
      );
    }

    if (
      !senderAccount
        .passwordConfigured &&
      !String(
        senderAccount.appPassword ||
        ''
      ).trim()
    ) {
      throw new Error(
        'Gmail App Password is required.'
      );
    }
  }

  async function saveAccount(
    event
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setMessageType('');

    try {
      validateForm();

      const payload = {
        provider:
          senderAccount.provider,

        emailAddress:
          String(
            senderAccount.emailAddress
          )
            .trim()
            .toLowerCase(),

        isActive:
          Boolean(
            senderAccount.isActive
          )
      };

      /*
       * Send the App Password only when the
       * user entered a new value.
       *
       * Leaving it empty preserves the saved
       * encrypted password.
       */
      if (
        String(
          senderAccount.appPassword ||
          ''
        ).trim()
      ) {
        payload.appPassword =
          String(
            senderAccount
              .appPassword
          ).trim();
      }

      const response =
        await api.put(
          '/sender-account',
          payload
        );

      const saved =
        response.data
          .senderAccount;

      setSenderAccount({
        provider:
          saved.provider,

        emailAddress:
          saved.emailAddress,

        appPassword: '',

        isActive:
          saved.isActive,

        configured:
          saved.configured,

        passwordConfigured:
          saved
            .passwordConfigured
      });

      setMessage(
        response.data.message ||
        'Sender account saved securely.'
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

  async function testAccount() {
    setTesting(true);
    setMessage('');
    setMessageType('');

    try {
      const response =
        await api.post(
          '/sender-account/test',
          {}
        );

      setMessage(
        response.data.message ||
        'Sender account verified successfully.'
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
      setTesting(false);
    }
  }

  async function deleteAccount() {
    const confirmed =
      window.confirm(
        'Remove this sender account?\n\n' +
        'The encrypted Gmail App Password will be deleted.'
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage('');
    setMessageType('');

    try {
      const response =
        await api.delete(
          '/sender-account'
        );

      setSenderAccount({
        ...emptySenderAccount
      });

      setMessage(
        response.data.message ||
        'Sender account removed successfully.'
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
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="sender-settings-page">
        <section className="sender-settings-card">
          Loading sender settings...
        </section>
      </div>
    );
  }

  return (
    <div className="sender-settings-page">
      <section className="sender-settings-card">
        <header className="sender-settings-header">
          <div>
            <h1>
              Sender Settings
            </h1>

            <p>
              Configure the Gmail account
              used by the logged-in user.
              The App Password is encrypted
              before it is stored.
            </p>
          </div>

          <span
            className={
              senderAccount.configured
                ? 'sender-status sender-status-configured'
                : 'sender-status sender-status-missing'
            }
          >
            {senderAccount.configured
              ? 'Configured'
              : 'Not Configured'}
          </span>
        </header>

        {message && (
          <div
            className={
              messageType === 'error'
                ? 'sender-message sender-message-error'
                : 'sender-message sender-message-success'
            }
          >
            {message}
          </div>
        )}

        <form
          onSubmit={
            saveAccount
          }
        >
          <div className="sender-settings-section">
            <h2>
              Gmail Account
            </h2>

            <label className="sender-field">
              <span>
                Provider
              </span>

              <select
                name="provider"
                value={
                  senderAccount.provider
                }
                onChange={
                  updateField
                }
              >
                <option value="gmail">
                  Gmail
                </option>
              </select>
            </label>

            <label className="sender-field">
              <span>
                Gmail Address
              </span>

              <input
                type="email"
                name="emailAddress"
                value={
                  senderAccount
                    .emailAddress
                }
                onChange={
                  updateField
                }
                placeholder="youraccount@gmail.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="sender-field">
              <span>
                Gmail App Password
              </span>

              <input
                type="password"
                name="appPassword"
                value={
                  senderAccount
                    .appPassword
                }
                onChange={
                  updateField
                }
                placeholder={
                  senderAccount
                    .passwordConfigured
                    ? 'Leave empty to keep saved password'
                    : 'Enter Gmail App Password'
                }
                autoComplete="new-password"
              />

              <small>
                {senderAccount
                  .passwordConfigured
                  ? (
                    'An encrypted App Password is already saved. Enter a new value only when changing it.'
                  )
                  : (
                    'Use a Gmail App Password, not your normal Gmail password.'
                  )}
              </small>
            </label>

            <label className="sender-active-option">
              <input
                type="checkbox"
                name="isActive"
                checked={
                  senderAccount
                    .isActive
                }
                onChange={
                  updateField
                }
              />

              <div>
                <strong>
                  Sender account active
                </strong>

                <span>
                  Disable this option to
                  prevent live sending from
                  this Gmail account.
                </span>
              </div>
            </label>
          </div>

          <footer className="sender-actions">
            <button
              type="submit"
              className="sender-button sender-button-primary"
              disabled={
                saving ||
                testing ||
                deleting
              }
            >
              {saving
                ? 'Saving...'
                : 'Save Securely'}
            </button>

            <button
              type="button"
              className="sender-button sender-button-secondary"
              disabled={
                saving ||
                testing ||
                deleting ||
                !senderAccount
                  .configured
              }
              onClick={
                testAccount
              }
            >
              {testing
                ? 'Testing...'
                : 'Test Gmail Connection'}
            </button>

            <button
              type="button"
              className="sender-button sender-button-danger"
              disabled={
                saving ||
                testing ||
                deleting ||
                !senderAccount
                  .configured
              }
              onClick={
                deleteAccount
              }
            >
              {deleting
                ? 'Removing...'
                : 'Remove Account'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default SenderSettings;