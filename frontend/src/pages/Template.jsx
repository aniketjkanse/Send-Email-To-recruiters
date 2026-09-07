import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

function Template() {
  const [form, setForm] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const resumeInputRef = useRef(null);

  async function reload() {
    const [listRes, formRes] = await Promise.all([
      api.get('/template/list'),
      api.get('/template')
    ]);
    setTemplates(listRes.data.templates || []);
    setActiveId(listRes.data.activeTemplateId || '');
    setForm(formRes.data);
  }

  useEffect(() => {
    reload();
  }, []);

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function switchTemplate(id) {
    if (!id || id === activeId) return;
    setBusy(true);
    try {
      await api.post(`/template/${id}/activate`);
      await reload();
      setMessage('Switched template.');
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          'Could not switch template.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    setBusy(true);
    try {
      const r = await api.post('/template', form);
      await reload();
      setMessage(r.data.message);
    } finally {
      setBusy(false);
    }
  }

  async function newTemplate() {
    const name = window.prompt('Name for the new template?');
    if (!name || !name.trim()) return;
    setBusy(true);
    try {
      await api.post('/template/list', { name: name.trim(), copyFromId: activeId });
      await reload();
      setMessage('Template created. It is now active.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate() {
    if (templates.length <= 1) {
      setMessage('Cannot delete the last remaining template.');
      return;
    }
    if (!window.confirm(`Delete template "${form.name}"?`)) return;
    setBusy(true);
    try {
      await api.delete(`/template/${activeId}`);
      await reload();
      setMessage('Template deleted.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Delete failed.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadResume(file) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const r = await api.post(`/template/${activeId}/resume`, fd);
      await reload();
      setMessage(r.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Resume upload failed.');
    } finally {
      setBusy(false);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  }

  async function removeResume() {
    if (!window.confirm('Remove the resume attached to this template?')) return;
    setBusy(true);
    try {
      const r = await api.delete(`/template/${activeId}/resume`);
      await reload();
      setMessage(r.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Remove failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!form) return <p>Loading template...</p>;

  return (
    <section>
      <h1>Email Template &amp; Safety Settings</h1>

      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label style={{ margin: 0 }}>Active template</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" disabled={busy} onClick={newTemplate}>New</button>
            <button type="button" disabled={busy || templates.length <= 1} onClick={deleteTemplate}>
              Delete
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {templates.map(t => {
            const active = t.id === activeId;
            return (
              <button
                key={t.id}
                type="button"
                disabled={busy}
                onClick={() => switchTemplate(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '0.7rem',
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  border: active ? '1px solid #059669' : '1px solid var(--border)',
                  background: active ? '#059669' : 'transparent',
                  color: active ? '#ffffff' : 'var(--text)'
                }}
              >
                <span style={{ flex: 1 }}>{t.name}</span>
                {t.dryRun && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.35rem',
                      background: active ? 'rgba(255,255,255,0.2)' : 'rgba(245,158,11,0.15)',
                      color: active ? '#ffffff' : '#f59e0b'
                    }}
                  >
                    dry run
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <label>Resume (attached to this template only)</label>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 0.9rem',
            border: '1px solid var(--border)',
            borderRadius: '0.7rem'
          }}
        >
          <span style={{ fontSize: '13px' }}>
            {form.hasResume ? (
              <>
                Attached: <strong>{form.resumeName || 'Resume.pdf'}</strong>
                {!form.resumeOwn && (
                  <em style={{ color: 'var(--muted)' }}> — shared resume, upload one to make it template-specific</em>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--muted)' }}>No resume attached to this template</span>
            )}
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button type="button" disabled={busy} onClick={() => resumeInputRef.current?.click()}>
              {form.hasResume && form.resumeOwn ? 'Replace' : 'Attach resume'}
            </button>
            {form.hasResume && form.resumeOwn && (
              <button type="button" disabled={busy} onClick={removeResume}>
                Remove
              </button>
            )}
          </div>

          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => uploadResume(e.target.files[0])}
          />
        </div>
      </div>

      <div className="panel">
        <label>Template Name</label>
        <input value={form.name || ''} onChange={e => updateField('name', e.target.value)} />

        <label>Subject</label>
        <input value={form.subject} onChange={e => updateField('subject', e.target.value)} />

        <label>Body</label>
        <textarea rows="12" value={form.body} onChange={e => updateField('body', e.target.value)} />

        <label>Daily Limit</label>
        <input
          type="number"
          value={form.dailyLimit}
          onChange={e => updateField('dailyLimit', Number(e.target.value))}
        />

        <label>Follow-Up 1 Daily Limit</label>
        <input
          type="number"
          value={form.followUp1DailyLimit}
          onChange={e => updateField('followUp1DailyLimit', Number(e.target.value))}
        />

        <label>Follow-Up 2 Daily Limit</label>
        <input
          type="number"
          value={form.followUp2DailyLimit}
          onChange={e => updateField('followUp2DailyLimit', Number(e.target.value))}
        />

        <label>Minimum Delay Seconds</label>
        <input
          type="number"
          value={form.minDelaySeconds}
          onChange={e => updateField('minDelaySeconds', Number(e.target.value))}
        />

        <label>Maximum Delay Seconds</label>
        <input
          type="number"
          value={form.maxDelaySeconds}
          onChange={e => updateField('maxDelaySeconds', Number(e.target.value))}
        />

        <label>Stop After Continuous Failures</label>
        <input
          type="number"
          value={form.stopAfterContinuousFailures}
          onChange={e => updateField('stopAfterContinuousFailures', Number(e.target.value))}
        />

        <label>Stop After Total Failures</label>
        <input
          type="number"
          value={form.stopAfterTotalFailures}
          onChange={e => updateField('stopAfterTotalFailures', Number(e.target.value))}
        />

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.skipPersonalEmails}
            onChange={e => updateField('skipPersonalEmails', e.target.checked)}
          />{' '}
          Skip personal email domains
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.dryRun}
            onChange={e => updateField('dryRun', e.target.checked)}
          />{' '}
          Dry run mode
        </label>

        <button disabled={busy} onClick={saveTemplate}>Save Template</button>
      </div>

      {message && <div className="notice">{message}</div>}
    </section>
  );
}

export default Template;
