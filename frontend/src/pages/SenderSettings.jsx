import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../ToastContext.jsx';

function SenderSettings() {
  const [emailProvider, setEmailProvider] = useState('gmail');
  const [emailUser, setEmailUser] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [isPasswordSaved, setIsPasswordSaved] = useState(false);

  const [addSecondAccount, setAddSecondAccount] = useState(false);
  const [emailUser2, setEmailUser2] = useState('');
  const [emailPass2, setEmailPass2] = useState('');
  const [isPassword2Saved, setIsPassword2Saved] = useState(false);

  const notify = useToast();

  async function loadConfig() {
    const response = await api.get('/config');

    setEmailProvider(response.data.emailProvider || 'gmail');
    setEmailUser(response.data.emailUser || '');
    setIsPasswordSaved(response.data.isPasswordSaved || false);

    setEmailUser2(response.data.emailUser2 || '');
    setIsPassword2Saved(response.data.isPassword2Saved || false);
    setAddSecondAccount(Boolean(response.data.emailUser2));
  }

  async function saveConfig() {
    try {
      const response = await api.post('/config', {
        emailProvider,
        emailUser,
        emailPass,
        emailUser2: addSecondAccount ? emailUser2 : '',
        emailPass2: addSecondAccount ? emailPass2 : ''
      });

      notify(response.data.message, 'success');
      setEmailPass('');
      setEmailPass2('');
      await loadConfig();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to save sender settings', 'error');
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <section>
      <h1>Sender Settings</h1>

      <div className="panel">
        <p className="muted">
          Save Gmail sender details here. Use Gmail App Password, not normal Gmail password.
        </p>

        <label>Email Provider</label>
        <input
          value={emailProvider}
          onChange={e => setEmailProvider(e.target.value)}
          placeholder="gmail"
        />

        <label>Sender Email</label>
        <input
          value={emailUser}
          onChange={e => setEmailUser(e.target.value)}
          placeholder="your-email@gmail.com"
        />

        <label>Gmail App Password</label>
        <input
          type="password"
          value={emailPass}
          onChange={e => setEmailPass(e.target.value)}
          placeholder={
            isPasswordSaved
              ? 'Password already saved. Enter new password only if changing.'
              : 'Enter Gmail app password'
          }
        />

        {isPasswordSaved && (
          <div className="notice">
            Sender password is already saved in backend local config.
          </div>
        )}

        <div className="checkbox-row" style={{ marginTop: 20 }}>
          <input
            type="checkbox"
            id="add-second-account"
            checked={addSecondAccount}
            onChange={(e) => setAddSecondAccount(e.target.checked)}
          />
          <label htmlFor="add-second-account" style={{ margin: 0 }}>
            Add a second Gmail account (optional)
          </label>
        </div>

        {addSecondAccount && (
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 p-4">
            <p className="muted" style={{ marginTop: 0 }}>
              When a second account is configured, the scheduler picks one of the two accounts
              at random for every outgoing email — spreading volume across both inboxes.
            </p>

            <label>Second Sender Email</label>
            <input
              value={emailUser2}
              onChange={e => setEmailUser2(e.target.value)}
              placeholder="your-second-email@gmail.com"
            />

            <label>Second Gmail App Password</label>
            <input
              type="password"
              value={emailPass2}
              onChange={e => setEmailPass2(e.target.value)}
              placeholder={
                isPassword2Saved
                  ? 'Password already saved. Enter new password only if changing.'
                  : 'Enter Gmail app password'
              }
            />

            {isPassword2Saved && (
              <div className="notice">
                Second account password is already saved in backend local config.
              </div>
            )}
          </div>
        )}

        <button onClick={saveConfig}>
          Save Sender Settings
        </button>
      </div>
    </section>
  );
}

export default SenderSettings;
