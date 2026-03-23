import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listResumes, deleteResume, getResume, updatePreferences } from '../services/api';

function PillGroup({ label, options, selected, onChange, hint }) {
  const toggle = (opt) => {
    onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt]);
  };
  return (
    <div className="form-group">
      <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{label}</label>
      {hint && <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: '8px', marginTop: 0 }}>{hint}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map(opt => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: active ? '2px solid #3182ce' : '2px solid #cbd5e0',
                background: active ? '#3182ce' : '#fff',
                color: active ? '#fff' : '#4a5568',
                fontWeight: active ? 600 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const WORK_AUTH_OPTIONS = [
  'US Citizen',
  'US Permanent Resident (Green Card)',
  'OPT',
  'CPT',
  'H1B',
  'TN Visa',
  'O-1 Visa',
  'Other',
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

const WORK_MODE_OPTIONS = ['Remote', 'Hybrid', 'On-site'];

const ROLE_TYPE_OPTIONS = ['Internship', 'Full-Time'];


function Profile() {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();

  const [resumes, setResumes] = useState([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState('');

  const [prefs, setPrefs] = useState({
    needs_sponsorship: false,
    work_authorization: [],
    preferred_locations: [],
    work_modes: [],
    role_types: [],
  });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsStatus, setPrefsStatus] = useState('');
  const [prefsError, setPrefsError] = useState('');

  const fetchResumes = useCallback(async () => {
    setResumeLoading(true);
    setResumeError('');
    try {
      const result = await listResumes(token);
      setResumes(result.resumes || []);
    } catch {
      setResumeError('Failed to load resumes.');
    } finally {
      setResumeLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  useEffect(() => {
    if (user?.preferences) {
      const p = user.preferences;
      setPrefs({
        needs_sponsorship: p.needs_sponsorship || false,
        work_authorization: p.work_authorization || [],
        preferred_locations: p.preferred_locations || [],
        work_modes: p.work_modes || [],
        role_types: p.role_types || [],
      });
    }
  }, [user]);

  const getPdfBlobUrl = async (resume) => {
    const result = await getResume(token, resume.resume_id);
    if (result.error || !result.pdf_data) {
      alert('PDF not available for this resume.');
      return null;
    }
    const bytes = atob(result.pdf_data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
  };

  const handlePreview = async (resume) => {
    try {
      const url = await getPdfBlobUrl(resume);
      if (url) window.open(url, '_blank');
    } catch { alert('Failed to preview resume.'); }
  };

  const handleDownload = async (resume) => {
    try {
      const url = await getPdfBlobUrl(resume);
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Failed to download resume.'); }
  };

  const handleDelete = async (resume_id) => {
    if (!window.confirm('Delete this resume?')) return;
    const result = await deleteResume(token, resume_id);
    if (result.error) setResumeError('Failed to delete resume.');
    else {
      setResumes((prev) => prev.filter((r) => r.resume_id !== resume_id));
      await refreshUser();
    }
  };

  const handlePrefsSubmit = async (e) => {
    e.preventDefault();
    setPrefsSaving(true);
    setPrefsStatus('');
    setPrefsError('');
    try {
      const result = await updatePreferences(token, {
        needs_sponsorship: prefs.needs_sponsorship,
        work_authorization: prefs.work_authorization,
        preferred_locations: prefs.preferred_locations,
        work_modes: prefs.work_modes,
        role_types: prefs.role_types,
      });
      if (result.error) throw new Error(result.error);
      setPrefsStatus('Preferences saved.');
      await refreshUser();
    } catch (err) {
      setPrefsError(err.message || 'Failed to save preferences.');
    } finally {
      setPrefsSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-brand"><h2>AI4Careers</h2></div>
        <div className="nav-links">
          <span className="user-name">Hello, {user?.name}</span>
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          <button className="btn-secondary" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <h2 style={{ marginBottom: '24px', color: '#333', fontSize: '24px' }}>My Profile & Preferences</h2>

        {/* Resumes */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>My Resumes</h3>
            <button className="btn-primary" onClick={() => navigate('/resume-upload')}>+ Upload New</button>
          </div>

          {resumeError && <div className="error-message">{resumeError}</div>}

          {resumeLoading ? <p>Loading resumes...</p> : resumes.length === 0 ? (
            <p style={{ color: '#888' }}>No resumes uploaded yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Filename</th>
                  <th style={{ padding: '8px' }}>Uploaded</th>
                  <th style={{ padding: '8px' }}>Skills Found</th>
                  <th style={{ padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r.resume_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{r.filename}</td>
                    <td style={{ padding: '8px' }}>{new Date(r.uploaded_at).toLocaleDateString()}</td>
                    <td style={{ padding: '8px' }}>{r.skills_count}</td>
                    <td style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" onClick={() => handlePreview(r)}>Preview</button>
                      <button className="btn-secondary" onClick={() => handleDownload(r)}>Download</button>
                      <button className="btn-secondary" style={{ color: '#e53e3e', borderColor: '#e53e3e' }} onClick={() => handleDelete(r.resume_id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Preferences */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>Career Preferences</h3>

          {prefsError && <div className="error-message">{prefsError}</div>}
          {prefsStatus && <div className="success-message">{prefsStatus}</div>}

          <form onSubmit={handlePrefsSubmit}>

            {/* Needs Sponsorship */}
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Do you need visa sponsorship?
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['Yes', 'No'].map((opt) => {
                  const active = prefs.needs_sponsorship === (opt === 'Yes');
                  const color = opt === 'Yes' ? '#e53e3e' : '#38a169';
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPrefs({ ...prefs, needs_sponsorship: opt === 'Yes' })}
                      style={{
                        padding: '8px 28px',
                        borderRadius: '999px',
                        border: `2px solid ${color}`,
                        background: active ? color : '#fff',
                        color: active ? '#fff' : color,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >{opt}</button>
                  );
                })}
              </div>
            </div>

            <PillGroup
              label="Work Authorization"
              hint="Select all that apply"
              options={WORK_AUTH_OPTIONS}
              selected={prefs.work_authorization}
              onChange={(val) => setPrefs({ ...prefs, work_authorization: val })}
            />

            <PillGroup
              label="Preferred Locations"
              hint="Select states you're open to working in"
              options={US_STATES}
              selected={prefs.preferred_locations}
              onChange={(val) => setPrefs({ ...prefs, preferred_locations: val })}
            />

            <PillGroup
              label="Work Modes"
              options={WORK_MODE_OPTIONS}
              selected={prefs.work_modes}
              onChange={(val) => setPrefs({ ...prefs, work_modes: val })}
            />

            <PillGroup
              label="Role Types"
              options={ROLE_TYPE_OPTIONS}
              selected={prefs.role_types}
              onChange={(val) => setPrefs({ ...prefs, role_types: val })}
            />

            <button type="submit" className="btn-primary" disabled={prefsSaving} style={{ marginTop: '1rem' }}>
              {prefsSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
