import { useEffect, useState } from 'react';
import { api } from '../services/api';

function Sender() {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await api.get('/send/status');
    setStatus(response.data);
  }

  async function start() {
    const response = await api.post('/send/start');
    setMessage(response.data.message);
    await load();
  }

  async function stop() {
    const response = await api.post('/send/stop');
    setMessage(response.data.message);
    await load();
  }

  async function downloadHistory() {
    window.open('http://localhost:5000/api/history/download', '_blank');
  }

  useEffect(() => {
    load();

    const intervalId = setInterval(load, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const isRunning =
    status?.status === 'RUNNING' || status?.status === 'STOPPING';

  return (
    <section>
      <h1>Start Scheduled Sending</h1>

      <div className="panel">
        <p>
          This sends only new emails, skips duplicates, applies daily limit,
          and uses random delay configured in Template.
        </p>

        <button onClick={start} disabled={isRunning}>
          Start Scheduler
        </button>

        <button
          className="danger-button"
          onClick={stop}
          disabled={!isRunning}
        >
          Stop Scheduler
        </button>

        <button className="secondary" onClick={downloadHistory}>
          Download History
        </button>

        {message && <div className="notice">{message}</div>}
      </div>

      {status && (
        <div className="panel">
          <h3>Scheduler Status</h3>

          <p><b>Status:</b> {status.status}</p>
          <p><b>Selected:</b> {status.selected}</p>
          <p><b>Sent:</b> {status.sent}</p>
          <p><b>Failed:</b> {status.failed}</p>
          <p><b>Skipped / Dry Run:</b> {status.skipped}</p>
          <p><b>Current:</b> {status.currentEmail || '-'}</p>
          <p><b>Message:</b> {status.message || '-'}</p>
        </div>
      )}
    </section>
  );
}

export default Sender;