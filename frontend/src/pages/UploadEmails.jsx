import { useEffect, useState } from 'react';
import { api } from '../services/api';

function UploadEmails() {
  const [emailsFile, setEmailsFile] = useState(null);
  const [resume, setResume] = useState(null);
  const [message, setMessage] = useState('');
  const [resumeStatus, setResumeStatus] = useState(null);

  useEffect(() => {
    loadResumeStatus();
  }, []);

  async function loadResumeStatus() {
    const r = await api.get('/upload/resume/status');
    setResumeStatus(r.data);
  }

  async function uploadEmails() {
    const fd = new FormData();
    fd.append('emailsFile', emailsFile);

    const r = await api.post('/upload/emails', fd);

    setMessage(r.data.message);
  }

  async function uploadResume() {
    const fd = new FormData();
    fd.append('resume', resume);

    const r = await api.post('/upload/resume', fd);

    setMessage(r.data.message);

    loadResumeStatus();
  }

  async function deleteResume() {
    const r = await api.delete('/upload/resume');

    setMessage(r.data.message);

    setResume(null);

    loadResumeStatus();
  }

  return (
    <section>
      <h1>Upload Files</h1>

      <div className="panel">
        <h3>Upload Extracted Emails</h3>

        <input
          type="file"
          accept=".txt,.csv"
          onChange={(e) => setEmailsFile(e.target.files[0])}
        />

        <button
          disabled={!emailsFile}
          onClick={uploadEmails}
        >
          Upload Emails
        </button>
      </div>

      <div className="panel">
        <h3>Upload Resume</h3>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setResume(e.target.files[0])}
        />

        <button
          disabled={!resume}
          onClick={uploadResume}
        >
          Upload Resume
        </button>

        <button
          onClick={deleteResume}
          style={{ marginLeft: '10px' }}
        >
          Delete Resume
        </button>

        {resumeStatus?.uploaded && (
          <div style={{ marginTop: '10px', color: 'green' }}>
            Current Resume: {resumeStatus.fileName}
          </div>
        )}
      </div>

      {message && (
        <div className="notice">
          {message}
        </div>
      )}
    </section>
  );
}

export default UploadEmails;