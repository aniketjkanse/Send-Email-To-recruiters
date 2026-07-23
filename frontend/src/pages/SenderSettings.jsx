import { useEffect, useState } from 'react';
import { api } from '../services/api';

function SenderSettings() {
  const [emailProvider, setEmailProvider] = useState('gmail');
  const [emailUser, setEmailUser] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [isPasswordSaved, setIsPasswordSaved] = useState(false);
  const [message, setMessage] = useState('');

  async function loadConfig() {
    const response = await api.get('/config');

    setEmailProvider(response.data.emailProvider || 'gmail');
    setEmailUser(response.data.emailUser || '');
    setIsPasswordSaved(response.data.isPasswordSaved || false);
  }

  async function saveConfig() {
    const response = await api.post('/config', {
      emailProvider,
      emailUser,
      emailPass
    });

    setMessage(response.data.message);
    setEmailPass('');
    await loadConfig();
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

        <button onClick={saveConfig}>
          Save Sender Settings
        </button>

        {isPasswordSaved && (
          <div className="notice">
            Sender password is already saved in backend local config.
          </div>
        )}

        {message && <div className="notice">{message}</div>}
      </div>
    </section>
  );
}

export default SenderSettings;