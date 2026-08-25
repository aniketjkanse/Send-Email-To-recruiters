import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../ToastContext.jsx';
import FileDropzone from '../components/FileDropzone.jsx';

function UploadEmails() {
  const [emailsFile, setEmailsFile] = useState(null);
  const [resume, setResume] = useState(null);
  const [uploadingEmails, setUploadingEmails] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeStatus, setResumeStatus] = useState(null);

  const notify = useToast();

  useEffect(() => {
    loadResumeStatus();
  }, []);

  async function loadResumeStatus() {
    const r = await api.get('/upload/resume/status');
    setResumeStatus(r.data);
  }

  async function uploadEmails() {
    if (!emailsFile) return;
    setUploadingEmails(true);
    try {
      const fd = new FormData();
      fd.append('emailsFile', emailsFile);
      const r = await api.post('/upload/emails', fd);
      notify(r.data.message || 'Emails uploaded', 'success');
      setEmailsFile(null);
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to upload emails file', 'error');
    } finally {
      setUploadingEmails(false);
    }
  }

  async function uploadResume() {
    if (!resume) return;
    setUploadingResume(true);
    try {
      const fd = new FormData();
      fd.append('resume', resume);
      const r = await api.post('/upload/resume', fd);
      notify(r.data.message || 'Resume uploaded', 'success');
      setResume(null);
      await loadResumeStatus();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to upload resume', 'error');
    } finally {
      setUploadingResume(false);
    }
  }

  async function deleteResume() {
    try {
      const r = await api.delete('/upload/resume');
      notify(r.data.message || 'Resume removed', 'info');
      setResume(null);
      await loadResumeStatus();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to delete resume', 'error');
    }
  }

  return (
    <section>
      <h1>Upload Files</h1>

      <div className="panel">
        <h3 className="!mt-0">Extracted Emails</h3>

        <FileDropzone
          id="emails-file"
          accept=".txt,.csv"
          file={emailsFile}
          onChange={(e) => setEmailsFile(e.target.files[0])}
          placeholder="Click to choose an emails file"
          hint=".txt or .csv — one email per line"
        />

        {emailsFile && (
          <button className="btn-glow flex items-center gap-2" disabled={uploadingEmails} onClick={uploadEmails}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
              {uploadingEmails ? 'progress_activity' : 'cloud_upload'}
            </span>
            {uploadingEmails ? 'Uploading...' : 'Upload Emails'}
          </button>
        )}
      </div>

      <div className="panel">
        <h3 className="!mt-0">Resume</h3>

        <FileDropzone
          id="resume-file"
          accept=".pdf"
          file={resume}
          onChange={(e) => setResume(e.target.files[0])}
          placeholder="Click to choose a resume PDF"
          hint="Attached to every initial outreach email"
          icon="description"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {resume && (
            <button className="btn-glow flex items-center gap-2" disabled={uploadingResume} onClick={uploadResume}>
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                {uploadingResume ? 'progress_activity' : 'cloud_upload'}
              </span>
              {uploadingResume ? 'Uploading...' : 'Upload Resume'}
            </button>
          )}

          {resumeStatus?.uploaded && (
            <button className="secondary flex items-center gap-2" onClick={deleteResume}>
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                delete
              </span>
              Delete Resume
            </button>
          )}
        </div>

        {resumeStatus?.uploaded && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
            <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: 16 }}>
              check_circle
            </span>
            Current resume: <span className="font-medium text-[var(--text)]">{resumeStatus.fileName}</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default UploadEmails;
