import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout, { ResizeHandle } from '../components/Layout';
import {
  rtListResumes,
  rtGetResume,
  rtDeleteResume,
  rtAdjustBullet,
  rtMoveSectionItem,
  rtUpdateSectionOrder,
  rtTailorResume,
  rtSaveTailoredResume,
  rtMatchSkills,
  rtGenerateCoverLetter,
  rtUpdateResumeParsed,
  rtExportResume,
  rtUploadResume,
  rtUpdateResumeVersion,
} from '../services/api';
import {
  ArrowLeft,
  Loader2,
  Minimize2,
  Maximize2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Sparkles,
  Target,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit2,
  Save,
  X,
  Plus,
  Download,
  Printer,
  Trash2,
  Tag,
  ArrowRight,
  Upload,
  Building2,
  Eye,
} from 'lucide-react';

const SECTION_LABELS = {
  summary: 'Summary',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
};

function getSectionLabel(section, parsed) {
  if (!parsed || typeof parsed !== 'object') return SECTION_LABELS[section] ?? section;
  const raw = parsed.section_labels?.[section];
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  return SECTION_LABELS[section] ?? section;
}

const LABEL_ACCENT = {
  general: '#7a7268',
  swe: '#3b82f6',
  faang: '#0ea5e9',
  startup: '#f97316',
  fintech: '#10b981',
  quant: '#14b8a6',
  'ml-ai': '#8b5cf6',
  data: '#06b6d4',
  research: '#f59e0b',
  uiux: '#ec4899',
  pm: '#f43f5e',
  consulting: '#84cc16',
};

const LABEL_BADGE_STYLE = {
  general: { background: '#ede8dc', color: '#7a7268', border: '1px solid #d4caba' },
  swe: { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' },
  faang: { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' },
  startup: { background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' },
  fintech: { background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' },
  quant: { background: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' },
  'ml-ai': { background: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe' },
  data: { background: '#cffafe', color: '#0e7490', border: '1px solid #a5f3fc' },
  research: { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' },
  uiux: { background: '#fce7f3', color: '#be185d', border: '1px solid #fbcfe8' },
  pm: { background: '#ffe4e6', color: '#be123c', border: '1px solid #fecdd3' },
  consulting: { background: '#ecfccb', color: '#3f6212', border: '1px solid #d9f99d' },
};

const LABEL_OPTIONS = [
  'general',
  'swe',
  'faang',
  'startup',
  'fintech',
  'quant',
  'ml-ai',
  'data',
  'research',
  'uiux',
  'pm',
  'consulting',
];

/** Area / role-focus tags (stored as `label` in the API). */
const AREA_OPTIONS = LABEL_OPTIONS;

/** Target employer tags for organizing versions (stored as `company_tag`). */
const COMPANY_TAG_OPTIONS = [
  'Other',
  'Amazon',
  'Apple',
  'Google',
  'Meta',
  'Microsoft',
  'Netflix',
  'NVIDIA',
  'OpenAI',
  'Oracle',
  'Salesforce',
  'Stripe',
  'Bloomberg',
  'Citadel',
  'Cisco',
  'Databricks',
  'Deloitte',
  'Goldman Sachs',
  'IBM',
  'Jane Street',
  'JPMorgan',
  'McKinsey',
  'BCG',
  'Bain',
  'Two Sigma',
  'Uber',
  'Adobe',
];

function formatAreaLabel(area) {
  return area === 'general' ? 'other' : area;
}

function normalizeCompanyTag(r) {
  const t = r && r.company_tag;
  if (t == null || String(t).trim() === '') return 'Other';
  return String(t).trim();
}

const COMPANY_TAG_BADGE = {
  background: '#e8e4dc',
  color: '#3d3a36',
  border: '1px solid #c8bfb0',
};

const spinStyle = { animation: 'resumeLabSpin 0.8s linear infinite' };

function MoveButtons({ onUp, onDown, disableUp, disableDown, size = 14 }) {
  const btn = (disabled) => ({
    padding: 2,
    border: 'none',
    background: 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.2 : 1,
    color: '#9a9288',
    transition: 'color 0.15s',
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <button
        type="button"
        onClick={onUp}
        disabled={disableUp}
        style={btn(disableUp)}
        onMouseEnter={(e) => {
          if (!disableUp) e.currentTarget.style.color = '#0f0f0d';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9a9288';
        }}
      >
        <ChevronUp size={size} />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={disableDown}
        style={btn(disableDown)}
        onMouseEnter={(e) => {
          if (!disableDown) e.currentTarget.style.color = '#0f0f0d';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9a9288';
        }}
      >
        <ChevronDown size={size} />
      </button>
    </div>
  );
}

function cloneParsed(obj) {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

const CONTACT_FORM_KEYS = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'github', label: 'GitHub' },
  { key: 'location', label: 'Location' },
];

function isRenderableContactValue(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (!s) return false;
  const low = s.toLowerCase();
  if (
    low === 'unknown'
    || low === 'n/a'
    || low === 'na'
    || low === 'tbd'
    || low === 'none'
    || low === 'not provided'
    || low === 'not available'
    || low === '-'
    || low === '—'
  ) {
    return false;
  }
  return true;
}

function getRenderableContactEntries(contact) {
  if (!contact || typeof contact !== 'object') return [];
  return CONTACT_FORM_KEYS.map(({ key }) => [key, contact[key]]).filter(([, v]) => isRenderableContactValue(v));
}

/** Prefer printable values from `current`; fill gaps from `fallback` when current is missing or placeholder. */
function mergeContactForExport(current, fallback) {
  const cur = current && typeof current === 'object' ? current : {};
  const fb = fallback && typeof fallback === 'object' ? fallback : {};
  const out = {};
  CONTACT_FORM_KEYS.forEach(({ key }) => {
    const a = cur[key];
    const b = fb[key];
    const use = isRenderableContactValue(a) ? String(a).trim() : isRenderableContactValue(b) ? String(b).trim() : null;
    if (use) out[key] = use;
  });
  return out;
}

function emptyContactForm() {
  return { email: '', phone: '', linkedin: '', github: '', location: '' };
}

function contactToForm(contact) {
  const base = emptyContactForm();
  if (!contact || typeof contact !== 'object') return base;
  CONTACT_FORM_KEYS.forEach(({ key }) => {
    const v = contact[key];
    base[key] = v != null ? String(v) : '';
  });
  return base;
}

function buildPrintHTML(parsed, versionName, sectionOrder) {
  const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const entries = getRenderableContactEntries(parsed.contact);
  const contact = entries.length ? entries.map(([, v]) => esc(v)).join('  |  ') : '';
  const sectionHTML = {};

  if (parsed.summary) {
    sectionHTML.summary = `<div class="section">
      <div class="sh">${esc(getSectionLabel('summary', parsed))}</div>
      <p>${esc(parsed.summary)}</p>
    </div>`;
  }

  if (parsed.experience?.length) {
    const entries = parsed.experience
      .map(
        (exp) => `
      <div class="entry">
        <div class="row"><span class="bold">${esc(exp.role)}</span><span class="date">${esc(exp.dates)}</span></div>
        <div class="sub">${esc(exp.company)}${exp.location ? ` · ${esc(exp.location)}` : ''}</div>
        ${exp.bullets?.length ? `<ul>${exp.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      </div>`
      )
      .join('');
    sectionHTML.experience = `<div class="section"><div class="sh">${esc(getSectionLabel('experience', parsed))}</div>${entries}</div>`;
  }

  if (parsed.education?.length) {
    const entries = parsed.education
      .map(
        (edu) => `
      <div class="entry">
        <div class="row"><span class="bold">${esc(edu.institution)}</span><span class="date">${esc(edu.dates)}</span></div>
        <div class="sub">${esc(edu.degree)}${edu.gpa ? ` · GPA ${esc(edu.gpa)}` : ''}</div>
      </div>`
      )
      .join('');
    sectionHTML.education = `<div class="section"><div class="sh">${esc(getSectionLabel('education', parsed))}</div>${entries}</div>`;
  }

  if (parsed.skills?.length) {
    sectionHTML.skills = `<div class="section">
      <div class="sh">${esc(getSectionLabel('skills', parsed))}</div>
      <p>${parsed.skills.map(esc).join(', ')}</p>
    </div>`;
  }

  if (parsed.projects?.length) {
    const entries = parsed.projects
      .map(
        (proj) => `
      <div class="entry">
        <div class="row"><span class="bold">${esc(proj.name)}</span><span class="date">${esc(proj.dates ?? '')}</span></div>
        ${proj.technologies?.length ? `<div class="tech">Technologies: ${proj.technologies.map(esc).join(', ')}</div>` : ''}
        ${proj.bullets?.length ? `<ul>${proj.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      </div>`
      )
      .join('');
    sectionHTML.projects = `<div class="section"><div class="sh">${esc(getSectionLabel('projects', parsed))}</div>${entries}</div>`;
  }

  if (parsed.certifications?.length) {
    sectionHTML.certifications = `<div class="section">
      <div class="sh">${esc(getSectionLabel('certifications', parsed))}</div>
      <ul>${parsed.certifications.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </div>`;
  }

  const body = sectionOrder.map((k) => sectionHTML[k] ?? '').join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(versionName)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Calibri,Arial,sans-serif;font-size:10.5pt;color:#111;background:#fff;padding:0.75in 0.95in}
  h1{text-align:center;font-size:19pt;font-weight:700;margin-bottom:4px}
  .contact{text-align:center;font-size:9pt;color:#444;margin-bottom:10px;padding:0 0.15in}
  .section{margin-top:11px}
  .sh{font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#222;
      border-bottom:1.5px solid #6633cc;padding-bottom:2px;margin-bottom:5px}
  .entry{margin-bottom:7px}
  .row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
  .bold{font-weight:700;font-size:10.5pt}
  .date{font-size:9pt;color:#555;white-space:nowrap;flex-shrink:0}
  .sub{font-size:9.5pt;color:#444;margin-top:1px}
  .tech{font-size:9pt;color:#555;font-style:italic;margin-top:2px}
  ul{margin-left:15px;margin-top:3px}
  ul li{margin-bottom:2px;line-height:1.35}
  @page{margin:0.85in 0.95in;size:letter}
  @media print{
    body{padding:0.15in 0.25in}
  }
</style>
</head>
<body>
<h1>${esc(parsed.name ?? versionName)}</h1>
${contact ? `<div class="contact">${contact}</div>` : ''}
${body}
</body></html>`;
}

function getApiError(err) {
  return err?.response?.data?.detail || err?.message || 'Request failed';
}

function ResumePreviewModal({ title, html, onClose }) {
  if (!html) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resume preview"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15,15,13,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        style={{
          maxWidth: 920,
          width: '100%',
          maxHeight: '92vh',
          background: '#eae5da',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          border: '1px solid #d4caba',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid #d4caba',
            background: '#f0ebe2',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 15, color: '#0f0f0d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'Preview'}</span>
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            style={{
              flexShrink: 0,
              padding: 8,
              border: 'none',
              borderRadius: 10,
              background: 'transparent',
              cursor: 'pointer',
              color: '#7a7268',
              lineHeight: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0f0f0d';
              e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#7a7268';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>
        <iframe title="Resume preview" srcDoc={html} style={{ flex: 1, width: '100%', minHeight: 520, border: 'none', background: '#fff' }} />
      </div>
    </div>
  );
}

// ─── Upload modal ───────────────────────────────────────────────────────────

function UploadModal({ onClose, onUploaded }) {
  const [mode, setMode] = useState('file');
  const [file, setFile] = useState(null);
  const [plainText, setPlainText] = useState('');
  const [versionName, setVersionName] = useState('');
  const [label, setLabel] = useState('general');
  const [companyTag, setCompanyTag] = useState('Other');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const INPUT = {
    background: '#f8f4ec',
    border: '1px solid #d4caba',
    color: '#0f0f0d',
    width: '100%',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.15s',
  };
  const onFocus = (e) => {
    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)';
  };
  const onBlur = (e) => {
    e.currentTarget.style.borderColor = '#d4caba';
  };

  const dragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const drop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setMode('file');
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'file' && !file) {
      setError('Please select a file');
      return;
    }
    if (mode === 'text' && !plainText.trim()) {
      setError('Please paste your resume text');
      return;
    }
    setLoading(true);
    try {
      await rtUploadResume({
        file: mode === 'file' ? file : undefined,
        plain_text: mode === 'text' ? plainText : undefined,
        version_name: versionName || (file?.name.replace(/\.[^.]+$/, '') ?? 'My Resume'),
        label,
        company_tag: companyTag,
      });
      onUploaded();
    } catch {
      setError('Upload failed — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15,15,13,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          background: '#ede8dc',
          border: '1px solid #d4caba',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 28px',
            borderBottom: '1px solid #d4caba',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f0f0d', margin: 0 }}>Upload Resume</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ color: '#9a9288', padding: 6, borderRadius: 8, lineHeight: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0f0f0d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9a9288';
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', background: '#e4ddd0', border: '1px solid #d4caba', borderRadius: 10, padding: 5, gap: 4 }}>
            {['file', 'text'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  ...(mode === m
                    ? { background: '#1a1a18', color: '#f5f0e8' }
                    : { background: 'transparent', color: '#7a7268' }),
                }}
              >
                {m === 'file' ? 'Upload File' : 'Paste Text'}
              </button>
            ))}
          </div>

          {mode === 'file' && (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
              }}
              onDragOver={dragOver}
              onDrop={drop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: '1.5px dashed #c8bfb0',
                borderRadius: 10,
                padding: '36px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f0ebe2',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.3)';
                e.currentTarget.style.background = '#eae5da';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#c8bfb0';
                e.currentTarget.style.background = '#f0ebe2';
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#0f0f0d' }}>
                  <FileText size={20} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</span>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: '#e4ddd0',
                      border: '1px solid #d4caba',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <Upload size={20} color="#7a7268" />
                  </div>
                  <p style={{ fontSize: 14, color: '#4a4540', margin: 0 }}>
                    Drop your resume here, or <strong>browse</strong>
                  </p>
                  <p style={{ fontSize: 12, color: '#b0a898', marginTop: 6, marginBottom: 0 }}>PDF, DOCX, or TXT — up to 10 MB</p>
                </>
              )}
            </div>
          )}

          {mode === 'text' && (
            <textarea
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              placeholder="Paste your resume text here…"
              rows={8}
              style={{ ...INPUT, resize: 'none' }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288' }}>Version Name</label>
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. Tech Companies v1"
              style={INPUT}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288' }}>Area</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AREA_OPTIONS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: '1px solid',
                    ...(label === l
                      ? { background: '#1a1a18', color: '#f5f0e8', borderColor: '#1a1a18' }
                      : { background: '#f0ebe2', color: '#4a4540', borderColor: '#d4caba' }),
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288' }}>Company</label>
            <select
              value={companyTag}
              onChange={(e) => setCompanyTag(e.target.value)}
              style={{
                ...INPUT,
                cursor: 'pointer',
                appearance: 'auto',
              }}
              onFocus={onFocus}
              onBlur={onBlur}
            >
              {COMPANY_TAG_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: '#9a9288', margin: 0 }}>Use this to group versions by target employer. Unlisted employers stay under Other.</p>
          </div>

          {error && (
            <p
              style={{
                fontSize: 13,
                color: '#b91c1c',
                background: 'rgba(185,28,28,0.08)',
                border: '1px solid rgba(185,28,28,0.2)',
                borderRadius: 8,
                padding: '12px 16px',
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px 0',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid #d4caba',
                background: 'transparent',
                color: '#7a7268',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f0f0d';
                e.currentTarget.style.borderColor = '#b0a898';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#7a7268';
                e.currentTarget.style.borderColor = '#d4caba';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px 0',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                background: '#1a1a18',
                color: '#f5f0e8',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#2a2a28';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1a1a18';
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} style={spinStyle} />Parsing…
                </>
              ) : (
                'Upload & Parse'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditResumeMetaModal({ resume, onClose, onSaved }) {
  const [versionName, setVersionName] = useState(resume.version_name || '');
  const [area, setArea] = useState(resume.label || 'general');
  const [companyTag, setCompanyTag] = useState(normalizeCompanyTag(resume));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setVersionName(resume.version_name || '');
    setArea(resume.label || 'general');
    setCompanyTag(normalizeCompanyTag(resume));
  }, [resume]);

  const inputStyle = {
    width: '100%',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 15,
    background: '#f8f4ec',
    border: '1px solid #d4caba',
    color: '#0f0f0d',
    outline: 'none',
    boxSizing: 'border-box',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await rtUpdateResumeVersion(resume.resume_id, {
        version_name: versionName.trim(),
        label: area,
        company_tag: companyTag,
      });
      onSaved();
    } catch {
      setError('Could not save — try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15,15,13,0.5)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ede8dc',
          border: '1px solid #d4caba',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #d4caba' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0f0f0d', margin: 0 }}>Version tags</h2>
          <button type="button" onClick={onClose} style={{ color: '#9a9288', padding: 6, borderRadius: 8, lineHeight: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288', display: 'block', marginBottom: 8 }}>Version name</label>
            <input type="text" value={versionName} onChange={(e) => setVersionName(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288', display: 'block', marginBottom: 10 }}>Area</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AREA_OPTIONS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setArea(l)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1px solid',
                    ...(area === l
                      ? { background: '#1a1a18', color: '#f5f0e8', borderColor: '#1a1a18' }
                      : { background: '#f0ebe2', color: '#4a4540', borderColor: '#d4caba' }),
                  }}
                >
                  {formatAreaLabel(l)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288', display: 'block', marginBottom: 8 }}>Company</label>
            <select value={companyTag} onChange={(e) => setCompanyTag(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {COMPANY_TAG_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {error && <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1px solid #d4caba', background: 'transparent', color: '#7a7268', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !versionName.trim()}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                background: '#1a1a18',
                color: '#f5f0e8',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? <Loader2 size={15} style={spinStyle} /> : null}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Save tailored modal ─────────────────────────────────────────────────────

function SaveTailoredModal({ resumeId, tailoredParsed, currentVersionName, tailorCompany, onClose, onSaved }) {
  const [mode, setMode] = useState('new');
  const [newName, setNewName] = useState(`${currentVersionName} (Tailored)`);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleSave() {
    setSaveError('');
    setLoading(true);
    try {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(JSON.stringify(tailoredParsed));
      } catch {
        setSaveError('Could not serialize resume data. Try refreshing the page.');
        return;
      }
      const trimmedCo = tailorCompany != null ? String(tailorCompany).trim() : '';
      const res = await rtSaveTailoredResume({
        resume_id: resumeId,
        tailored_parsed: parsedPayload,
        save_as_new: mode === 'new',
        new_version_name: mode === 'new' ? newName : undefined,
        ...(trimmedCo ? { company_tag: trimmedCo } : {}),
      });
      if (res?.error) {
        setSaveError(typeof res.error === 'string' ? res.error : JSON.stringify(res.error));
        return;
      }
      onSaved(res?.resume_id);
    } catch (e) {
      setSaveError(getApiError(e) || 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    borderRadius: 12,
    padding: '16px',
    fontSize: 16,
    background: '#f8f4ec',
    border: '1px solid #d4caba',
    color: '#0f0f0d',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15,15,13,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          background: '#ede8dc',
          border: '1px solid #d4caba',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #d4caba' }}>
          <h2 style={{ fontWeight: 600, color: '#0f0f0d', margin: 0, fontSize: 17 }}>Save Tailored Resume</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#7a7268',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0f0f0d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#7a7268';
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {saveError && (
            <div style={{ borderRadius: 12, padding: '12px 16px', background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.25)', color: '#991b1b', fontSize: 14, lineHeight: 1.45 }}>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', borderRadius: 12, padding: 4, background: '#eae5da', border: '1px solid #d4caba' }}>
            {['new', 'overwrite'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '14px 0',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  ...(mode === m
                    ? { background: '#1a1a18', color: '#f5f0e8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
                    : { background: 'transparent', color: '#7a7268' }),
                }}
                onMouseEnter={(e) => {
                  if (mode !== m) e.currentTarget.style.color = '#0f0f0d';
                }}
                onMouseLeave={(e) => {
                  if (mode !== m) e.currentTarget.style.color = '#7a7268';
                }}
              >
                {m === 'new' ? 'Save as New Version' : 'Overwrite Current'}
              </button>
            ))}
          </div>

          {mode === 'new' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288', marginBottom: 6 }}>
                New version name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d4caba';
                }}
              />
            </div>
          )}

          {mode === 'overwrite' && (
            <div style={{ borderRadius: 12, padding: '12px 16px', background: '#eae5da', border: '1px solid #d4caba' }}>
              <p style={{ fontSize: 14, color: '#0f0f0d', margin: 0, lineHeight: 1.5 }}>
                This will replace the current resume content. The original text is still preserved.
              </p>
            </div>
          )}

          <p style={{ fontSize: 13, color: '#7a7268', margin: 0, lineHeight: 1.45 }}>
            {String(tailorCompany ?? '').trim() ? (
              <>
                This version will be tagged for <strong style={{ color: '#0f0f0d' }}>{String(tailorCompany).trim()}</strong> (from the Tailor sidebar Company field).
              </>
            ) : (
              <>Optional: enter a company in the Tailor sidebar before saving to organize this version by employer.</>
            )}
          </p>

          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '16px 0',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 500,
                border: '1px solid #d4caba',
                background: 'transparent',
                color: '#7a7268',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f0f0d';
                e.currentTarget.style.borderColor = '#b0a898';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#7a7268';
                e.currentTarget.style.borderColor = '#d4caba';
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={{
                flex: 1,
                padding: '16px 0',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                border: 'none',
                background: '#1a1a18',
                color: '#f5f0e8',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#2a2a28';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = '#1a1a18';
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} style={spinStyle} />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumeLabDashboard() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filterArea, setFilterArea] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [dashPreviewOpen, setDashPreviewOpen] = useState(false);
  const [dashPreviewHtml, setDashPreviewHtml] = useState('');
  const [dashPreviewTitle, setDashPreviewTitle] = useState('');
  const [dashPreviewLoadingId, setDashPreviewLoadingId] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  async function load() {
    setLoading(true);
    try {
      const data = await rtListResumes();
      const list = Array.isArray(data) ? data : data?.resumes ?? [];
      setResumes(Array.isArray(list) ? list : []);
    } catch {
      setResumes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (filterCompany === 'all') return;
    const stillThere = resumes.some((r) => normalizeCompanyTag(r) === filterCompany);
    if (!stillThere) setFilterCompany('all');
  }, [resumes, filterCompany]);

  useEffect(() => {
    if (loading || resumes.length === 0) return;
    const companyQ = searchParams.get('company');
    if (!companyQ || !String(companyQ).trim()) return;
    const sorted = [...resumes].sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });
    const target = sorted[0];
    if (!target?.resume_id) return;
    const next = new URLSearchParams(searchParams);
    next.set('company', String(companyQ).trim());
    navigate(`/resume-lab/${target.resume_id}?${next.toString()}`, { replace: true });
  }, [loading, resumes, searchParams, navigate]);

  async function handleDelete(resumeId, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this resume version?')) return;
    await rtDeleteResume(resumeId);
    setResumes((prev) => prev.filter((r) => r.resume_id !== resumeId));
  }

  async function openDashboardPreview(resumeId, e) {
    e.stopPropagation();
    setDashPreviewLoadingId(resumeId);
    try {
      const r = await rtGetResume(resumeId);
      if (!r) return;
      let order = r.section_order;
      if (!order || order.length === 0) {
        order = [];
        const p = r.parsed || {};
        if (p.summary) order.push('summary');
        if (p.experience?.length) order.push('experience');
        if (p.projects?.length) order.push('projects');
        if (p.education?.length) order.push('education');
        if (p.skills?.length) order.push('skills');
        if (p.certifications?.length) order.push('certifications');
      }
      const parsed = r.parsed || {};
      const merged = {
        ...parsed,
        contact: mergeContactForExport(parsed.contact, parsed.contact),
      };
      setDashPreviewHtml(buildPrintHTML(merged, r.version_name, order));
      setDashPreviewTitle(r.version_name || 'Resume preview');
      setDashPreviewOpen(true);
    } catch (err) {
      window.alert(getApiError(err) || 'Could not load preview');
    } finally {
      setDashPreviewLoadingId(null);
    }
  }

  return (
    <>
      <style>{`@keyframes resumeLabSpin { to { transform: rotate(360deg); } }`}</style>
      <Layout>
        <div style={{ flex: 1, overflowY: 'auto', padding: 32, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 24, right: 32 }}>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                background: '#1a1a18',
                color: '#f5f0e8',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2a2a28';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1a1a18';
              }}
            >
              <Plus size={15} /> Upload Resume
            </button>
          </div>

          <div style={{ maxWidth: 896, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f0f0d', margin: 0 }}>Resume Versions</h1>
              <p style={{ fontSize: 15, color: '#7a7268', marginTop: 8 }}>Manage and tailor your resume versions for each application</p>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#7a7268', justifyContent: 'center', padding: '64px 0' }}>
                <Loader2 size={18} style={spinStyle} /> Loading your resumes…
              </div>
            ) : resumes.length === 0 ? (
              <div style={{ border: '2px dashed #d4caba', borderRadius: 16, padding: '112px 32px', textAlign: 'center' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    marginBottom: 24,
                    background: '#f0ebe2',
                    border: '1px solid #d4caba',
                  }}
                >
                  <FileText size={36} style={{ color: '#9a9288' }} />
                </div>
                <p style={{ fontSize: 20, fontWeight: 600, color: '#0f0f0d', marginBottom: 12 }}>No resume versions yet</p>
                <p style={{ fontSize: 15, color: '#7a7268', marginBottom: 32, maxWidth: 360, margin: '0 auto 32px' }}>
                  Upload a PDF, DOCX, or paste plain text to get started. AI will parse and structure your resume instantly.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  style={{
                    padding: '14px 32px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    background: '#1a1a18',
                    color: '#f5f0e8',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2a2a28';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#1a1a18';
                  }}
                >
                  Upload your first resume
                </button>
              </div>
            ) : (() => {
              const areaCounts = {};
              const companyCounts = {};
              resumes.forEach((r) => {
                const ar = r.label || 'general';
                areaCounts[ar] = (areaCounts[ar] || 0) + 1;
                const co = normalizeCompanyTag(r);
                companyCounts[co] = (companyCounts[co] || 0) + 1;
              });
              const areaKeys = Object.keys(areaCounts).sort((a, b) => {
                if (a === 'general') return 1;
                if (b === 'general') return -1;
                return a.localeCompare(b);
              });
              const companyKeys = Object.keys(companyCounts).sort((a, b) => {
                if (a === 'Other') return -1;
                if (b === 'Other') return 1;
                return a.localeCompare(b);
              });

              const filtered = resumes.filter((r) => {
                const areaOk = filterArea === 'all' || (r.label || 'general') === filterArea;
                const companyOk = filterCompany === 'all' || normalizeCompanyTag(r) === filterCompany;
                return areaOk && companyOk;
              });

              const sorted = [...filtered].sort((a, b) => {
                switch (sortBy) {
                  case 'date-asc': {
                    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    return ta - tb;
                  }
                  case 'name-asc':
                    return (a.version_name || '').localeCompare(b.version_name || '');
                  case 'name-desc':
                    return (b.version_name || '').localeCompare(a.version_name || '');
                  default: {
                    const ta2 = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    const tb2 = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    return tb2 - ta2;
                  }
                }
              });

              const filterPillStyle = (active) => ({
                padding: '7px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: active ? '1px solid #1a1a18' : '1px solid #d4caba',
                background: active ? '#1a1a18' : 'transparent',
                color: active ? '#f5f0e8' : '#7a7268',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              });

              return (
                <>
                  <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9a9288' }}>Area</span>
                      <button
                        type="button"
                        onClick={() => { setFilterArea('all'); setFilterCompany('all'); }}
                        disabled={filterArea === 'all' && filterCompany === 'all'}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #d4caba',
                          background: 'transparent',
                          color: filterArea === 'all' && filterCompany === 'all' ? '#c8bfb0' : '#7a7268',
                          cursor: filterArea === 'all' && filterCompany === 'all' ? 'default' : 'pointer',
                        }}
                      >
                        Reset filters
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button type="button" onClick={() => setFilterArea('all')} style={filterPillStyle(filterArea === 'all')}>
                        All areas <span style={{ fontSize: 11, opacity: 0.7 }}>({resumes.length})</span>
                      </button>
                      {areaKeys.map((lbl) => {
                        const badge = LABEL_BADGE_STYLE[lbl] || LABEL_BADGE_STYLE.general;
                        const active = filterArea === lbl;
                        return (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setFilterArea(lbl)}
                            style={active ? filterPillStyle(true) : {
                              ...filterPillStyle(false),
                              background: badge.background,
                              color: badge.color,
                              border: badge.border,
                            }}
                          >
                            {formatAreaLabel(lbl)}
                            <span style={{ fontSize: 11, opacity: 0.7 }}>({areaCounts[lbl]})</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 220px', minWidth: 0, maxWidth: 480 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9a9288', display: 'block' }}>Company</span>
                        <div style={{ position: 'relative', marginTop: 6, width: '100%' }}>
                          <select
                            value={filterCompany}
                            onChange={(e) => setFilterCompany(e.target.value)}
                            aria-label="Filter by company"
                            style={{
                              width: '100%',
                              appearance: 'none',
                              padding: '10px 36px 10px 14px',
                              borderRadius: 10,
                              border: '1px solid #d4caba',
                              background: '#f8f4ec',
                              color: '#4a4540',
                              fontSize: 13,
                              fontWeight: 500,
                              outline: 'none',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          >
                            <option value="all">All companies ({resumes.length})</option>
                            {companyKeys.map((co) => (
                              <option key={co} value={co}>
                                {co} ({companyCounts[co]})
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={13}
                            style={{
                              position: 'absolute',
                              right: 12,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                              color: '#7a7268',
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ flex: '0 1 220px', minWidth: 180 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9a9288', display: 'block' }}>Sort</span>
                        <div style={{ position: 'relative', marginTop: 6, width: '100%' }}>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            aria-label="Sort resumes"
                            style={{
                              width: '100%',
                              appearance: 'none',
                              padding: '10px 32px 10px 12px',
                              borderRadius: 10,
                              border: '1px solid #d4caba',
                              background: '#f8f4ec',
                              color: '#4a4540',
                              fontSize: 13,
                              fontWeight: 500,
                              outline: 'none',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                            }}
                          >
                            <option value="date-desc">Newest first</option>
                            <option value="date-asc">Oldest first</option>
                            <option value="name-asc">Name A → Z</option>
                            <option value="name-desc">Name Z → A</option>
                          </select>
                          <ChevronDown
                            size={13}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                              color: '#7a7268',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {sorted.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#9a9288', fontSize: 14 }}>
                      No resumes match this filter.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                      {sorted.map((r) => {
                  const accent = LABEL_ACCENT[r.label] ?? LABEL_ACCENT.general;
                  return (
                    <div
                      key={r.resume_id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigate(`/resume-lab/${r.resume_id}`);
                      }}
                      onClick={() => navigate(`/resume-lab/${r.resume_id}`)}
                      style={{
                        position: 'relative',
                        borderRadius: 12,
                        cursor: 'pointer',
                        background: '#eae5da',
                        border: '1px solid #d4caba',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.borderColor = 'rgba(0,0,0,0.2)';
                        el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
                        el.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.borderColor = '#d4caba';
                        el.style.boxShadow = 'none';
                        el.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: `${accent}18`,
                              border: `1px solid ${accent}30`,
                            }}
                          >
                            <FileText size={22} style={{ color: accent }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              title="Preview"
                              onClick={(e) => openDashboardPreview(r.resume_id, e)}
                              disabled={dashPreviewLoadingId === r.resume_id}
                              style={{
                                padding: 6,
                                borderRadius: 8,
                                border: 'none',
                                background: 'transparent',
                                cursor: dashPreviewLoadingId === r.resume_id ? 'wait' : 'pointer',
                                color: '#9a9288',
                                transition: 'all 0.15s',
                                lineHeight: 0,
                              }}
                              onMouseEnter={(e) => {
                                if (dashPreviewLoadingId === r.resume_id) return;
                                e.currentTarget.style.color = '#0f0f0d';
                                e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#9a9288';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              {dashPreviewLoadingId === r.resume_id ? <Loader2 size={16} style={spinStyle} /> : <Eye size={16} />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(r.resume_id, e)}
                              style={{
                                padding: 6,
                                borderRadius: 8,
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#9a9288',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#fca5a5';
                                e.currentTarget.style.background = 'rgba(185,28,28,0.12)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#9a9288';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <h3
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                            color: '#0f0f0d',
                            marginBottom: 6,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.version_name}
                        </h3>
                        {r.name && (
                          <p style={{ fontSize: 14, color: '#7a7268', marginBottom: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: r.name ? 0 : 20, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                padding: '5px 10px',
                                borderRadius: 20,
                                fontWeight: 500,
                                background: `${accent}18`,
                                color: accent,
                                border: `1px solid ${accent}30`,
                              }}
                            >
                              <Tag size={10} /> {formatAreaLabel(r.label || 'general')}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                padding: '5px 10px',
                                borderRadius: 20,
                                fontWeight: 500,
                                ...COMPANY_TAG_BADGE,
                              }}
                            >
                              <Building2 size={10} /> {normalizeCompanyTag(r)}
                            </span>
                          </div>
                          <ArrowRight size={16} style={{ color: '#9a9288', flexShrink: 0 }} />
                        </div>

                        <p style={{ fontSize: 12, color: '#b0a898', marginTop: 16 }}>
                          {r.updated_at
                            ? new Date(r.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onUploaded={() => {
              setShowUpload(false);
              load();
            }}
          />
        )}
        {dashPreviewOpen && (
          <ResumePreviewModal
            title={dashPreviewTitle}
            html={dashPreviewHtml}
            onClose={() => {
              setDashPreviewOpen(false);
              setDashPreviewHtml('');
              setDashPreviewTitle('');
            }}
          />
        )}
      </Layout>
    </>
  );
}

const RL_SIDEBAR_KEY = 'rl_sidebar_width';
const RL_SIDEBAR_DEFAULT = 360;
const RL_SIDEBAR_MIN = 260;
const RL_SIDEBAR_MAX = 540;

function ResumeLabDetail({ id, navigate }) {
  const [searchParams] = useSearchParams();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adjustingBullet, setAdjustingBullet] = useState(null);
  const [movingSection, setMovingSection] = useState(null);
  const [movingItem, setMovingItem] = useState(null);
  const [hoverBulletKey, setHoverBulletKey] = useState(null);
  const [hoverSectionReorder, setHoverSectionReorder] = useState(null);
  const [hoverEntryKey, setHoverEntryKey] = useState(null);
  const [bulletPromptKey, setBulletPromptKey] = useState(null);
  const [bulletPrompt, setBulletPrompt] = useState('');

  const [rlSidebarW, setRlSidebarW] = useState(() => {
    try { const v = parseInt(localStorage.getItem(RL_SIDEBAR_KEY)); return (v >= RL_SIDEBAR_MIN && v <= RL_SIDEBAR_MAX) ? v : RL_SIDEBAR_DEFAULT; }
    catch { return RL_SIDEBAR_DEFAULT; }
  });
  useEffect(() => { try { localStorage.setItem(RL_SIDEBAR_KEY, String(rlSidebarW)); } catch { /* noop */ } }, [rlSidebarW]);
  const handleRlSidebarDrag = useCallback((dx) => {
    setRlSidebarW((w) => Math.min(RL_SIDEBAR_MAX, Math.max(RL_SIDEBAR_MIN, w - dx)));
  }, []);

  const [sidebarTab, setSidebarTab] = useState('tailor');
  const [jd, setJd] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [company, setCompany] = useState('');
  const [companyBannerDismissed, setCompanyBannerDismissed] = useState(false);
  const [addSummary, setAddSummary] = useState(false);
  const [quantify, setQuantify] = useState(false);
  const [keywordOptimize, setKeywordOptimize] = useState(true);
  const [tailoring, setTailoring] = useState(false);
  const [tailoredParsed, setTailoredParsed] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsResult, setSkillsResult] = useState(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [copied, setCopied] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editedParsed, setEditedParsed] = useState(null);
  const [editVersionName, setEditVersionName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const [exporting, setExporting] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [contactForm, setContactForm] = useState(() => emptyContactForm());
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaveMsg, setContactSaveMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setResume(null);
    setLoading(true);
    rtGetResume(id)
      .then((r) => {
        if (cancelled || !r) return;
        if (!r.section_order || r.section_order.length === 0) {
          const order = [];
          if (r.parsed?.summary) order.push('summary');
          if (r.parsed?.experience?.length) order.push('experience');
          if (r.parsed?.projects?.length) order.push('projects');
          if (r.parsed?.education?.length) order.push('education');
          if (r.parsed?.skills?.length) order.push('skills');
          if (r.parsed?.certifications?.length) order.push('certifications');
          r.section_order = order;
        }
        setResume(r);
      })
      .catch(() => {
        if (!cancelled) setResume(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const companyQuery = searchParams.get('company');

  useEffect(() => {
    setCompanyBannerDismissed(false);
  }, [companyQuery, id]);

  useEffect(() => {
    if (!id) return;
    const q = searchParams.get('company');
    if (q != null && String(q).trim() !== '') {
      setCompany(String(q).trim());
      setSidebarTab('tailor');
    }
  }, [id, searchParams]);

  useEffect(() => {
    if (!resume?.resume_id) return;
    const q = searchParams.get('company');
    if (q != null && String(q).trim() !== '') return;
    const tag = normalizeCompanyTag(resume);
    setCompany(tag === 'Other' ? '' : tag);
    /* Sync from stored tag when switching resumes or after save; omit full `resume` dep to avoid clobbering the Company field during other updates. */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume?.resume_id, resume?.company_tag, searchParams only
  }, [resume?.resume_id, resume?.company_tag, searchParams]);

  useEffect(() => {
    if (!resume?.resume_id) return;
    setContactForm(contactToForm(resume.parsed?.contact));
  // Intentionally only when switching resume; other updates sync via saveContactFields / saveEdits.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resume?.resume_id only
  }, [resume?.resume_id]);

  function enterEditMode() {
    if (!resume) return;
    setTailoredParsed(null);
    setEditedParsed(cloneParsed(resume.parsed || {}));
    setEditVersionName(resume.version_name || '');
    setEditMode(true);
  }

  function cancelEditMode() {
    setEditMode(false);
    setEditedParsed(null);
    setEditVersionName('');
    setNewSkill('');
    setNewCert('');
    setSaveError('');
  }

  function updateEdit(updater) {
    setEditedParsed((prev) => {
      if (!prev) return prev;
      const next = cloneParsed(prev);
      updater(next);
      return next;
    });
  }

  async function saveEdits() {
    if (!resume || !editedParsed) return;
    setSaving(true);
    setSaveError('');
    try {
      await rtUpdateResumeVersion(resume.resume_id, { version_name: editVersionName.trim() });
      await rtUpdateResumeParsed(resume.resume_id, editedParsed);
      const nextVersionName = editVersionName.trim() || resume.version_name;
      setResume((prev) => (prev ? { ...prev, version_name: nextVersionName, parsed: editedParsed } : prev));
      setContactForm(contactToForm(editedParsed.contact));
      setEditMode(false);
      setEditedParsed(null);
      setEditVersionName('');
      setNewSkill('');
      setNewCert('');
    } catch (err) {
      setSaveError(getApiError(err) || 'Save failed — make sure the server is running and try again');
    } finally {
      setSaving(false);
    }
  }

  async function saveContactFields() {
    if (!resume || editMode) return;
    setSavingContact(true);
    setContactSaveMsg('');
    try {
      const next = cloneParsed(resume.parsed);
      next.contact = {};
      CONTACT_FORM_KEYS.forEach(({ key }) => {
        const v = contactForm[key]?.trim();
        if (isRenderableContactValue(v)) next.contact[key] = v;
      });
      await rtUpdateResumeParsed(resume.resume_id, next);
      setResume((prev) => (prev ? { ...prev, parsed: next } : prev));
      setContactSaveMsg('Saved');
      setTimeout(() => setContactSaveMsg(''), 2800);
    } catch (err) {
      setContactSaveMsg(getApiError(err) || 'Save failed');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleExportDocx() {
    if (!resume) return;
    setExporting(true);
    try {
      const res = await rtExportResume(resume.resume_id);
      const bytes = Uint8Array.from(atob(res.file_data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    if (!resume) return;
    const parsed = editMode && editedParsed ? editedParsed : tailoredParsed ?? resume.parsed;
    const merged = {
      ...parsed,
      contact: mergeContactForExport(parsed.contact, resume.parsed?.contact),
    };
    const versionTitle = editMode && editVersionName.trim() ? editVersionName.trim() : resume.version_name;
    const html = buildPrintHTML(merged, versionTitle, resume.section_order);
    const win = window.open('', '_blank');
    if (!win) {
      window.alert('Allow popups to export PDF');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  function openResumePreview() {
    if (!resume) return;
    const parsed = editMode && editedParsed ? editedParsed : tailoredParsed ?? resume.parsed;
    const merged = {
      ...parsed,
      contact: mergeContactForExport(parsed.contact, resume.parsed?.contact),
    };
    const versionTitle = editMode && editVersionName.trim() ? editVersionName.trim() : resume.version_name;
    setPreviewHtml(buildPrintHTML(merged, versionTitle, resume.section_order));
    setPreviewOpen(true);
  }

  async function handleAdjustBullet(section, sectionIdx, bulletIdx, direction, prompt) {
    if (!resume) return;
    const key = `${section}-${sectionIdx}-${bulletIdx}`;
    setAdjustingBullet(key);
    setBulletPromptKey(null);
    setBulletPrompt('');
    const bullet = resume.parsed[section][sectionIdx].bullets[bulletIdx];
    try {
      const res = await rtAdjustBullet(bullet, direction, prompt || undefined);
      if (res?.error) {
        alert(res.error);
        return;
      }
      setResume((prev) => {
        if (!prev) return prev;
        const u = cloneParsed(prev);
        u.parsed[section][sectionIdx].bullets[bulletIdx] = res.bullet;
        return u;
      });
    } catch (e) {
      alert(getApiError(e) || 'Adjust failed');
    } finally {
      setAdjustingBullet(null);
    }
  }

  async function handleDeleteBullet(section, sectionIdx, bulletIdx) {
    if (!resume) return;
    const updated = cloneParsed(resume);
    updated.parsed[section][sectionIdx].bullets.splice(bulletIdx, 1);
    setResume(updated);
    try {
      await rtUpdateResumeParsed(resume.resume_id, updated.parsed);
    } catch { /* will revert on next load */ }
  }

  async function handleDeleteEntry(section, sectionIdx) {
    if (!resume) return;
    const label = section === 'experience' ? 'experience' : section === 'projects' ? 'project' : 'entry';
    if (!window.confirm(`Delete this ${label}?`)) return;
    const updated = cloneParsed(resume);
    updated.parsed[section].splice(sectionIdx, 1);
    setResume(updated);
    try {
      await rtUpdateResumeParsed(resume.resume_id, updated.parsed);
    } catch { /* will revert on next load */ }
  }

  async function handleDeleteSection(section) {
    if (!resume) return;
    if (!window.confirm(`Remove the entire "${getSectionLabel(section, resume.parsed)}" section?`)) return;
    const updated = cloneParsed(resume);
    if (section === 'summary') {
      updated.parsed.summary = '';
    } else if (Array.isArray(updated.parsed[section])) {
      updated.parsed[section] = [];
    }
    updated.section_order = updated.section_order.filter((s) => s !== section);
    setResume(updated);
    try {
      await rtUpdateResumeParsed(resume.resume_id, updated.parsed);
      await rtUpdateSectionOrder(resume.resume_id, updated.section_order);
    } catch { /* will revert on next load */ }
  }

  async function handleMoveItem(section, index, direction) {
    if (!resume) return;
    const key = `${section}-${index}`;
    setMovingItem(key);
    try {
      await rtMoveSectionItem(resume.resume_id, section, index, direction);
      setResume((prev) => {
        if (!prev) return prev;
        const u = cloneParsed(prev);
        const items = u.parsed[section];
        const newIdx = direction === 'up' ? index - 1 : index + 1;
        if (newIdx < 0 || newIdx >= items.length) return prev;
        const tmp = items[newIdx];
        items[newIdx] = items[index];
        items[index] = tmp;
        return u;
      });
    } finally {
      setMovingItem(null);
    }
  }

  async function handleMoveSection(section, direction) {
    if (!resume) return;
    setMovingSection(section);
    try {
      const order = [...resume.section_order];
      const idx = order.indexOf(section);
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= order.length) return;
      const tmp = order[newIdx];
      order[newIdx] = order[idx];
      order[idx] = tmp;
      await rtUpdateSectionOrder(resume.resume_id, order);
      setResume((prev) => (prev ? { ...prev, section_order: order } : prev));
    } finally {
      setMovingSection(null);
    }
  }

  async function handleTailor() {
    if (!resume || !jd.trim()) return;
    setTailoring(true);
    setTailoredParsed(null);
    try {
      const res = await rtTailorResume({
        resume_id: resume.resume_id,
        job_description: jd,
        target_role: targetRole || undefined,
        company: company || undefined,
        add_summary: addSummary,
        quantify,
        keyword_optimize: keywordOptimize,
      });
      if (res?.error) {
        alert(`Tailoring failed: ${res.error}`);
      } else {
        setTailoredParsed(res.tailored_parsed);
      }
    } catch (err) {
      alert(`Tailoring failed — ${getApiError(err)}`);
    } finally {
      setTailoring(false);
    }
  }

  async function handleMatchSkills() {
    if (!resume || !jd.trim()) return;
    setSkillsLoading(true);
    setSkillsResult(null);
    try {
      setSkillsResult(await rtMatchSkills(resume.resume_id, jd));
    } finally {
      setSkillsLoading(false);
    }
  }

  async function handleCoverLetter() {
    if (!resume || !targetRole.trim() || !company.trim()) return;
    setCoverLoading(true);
    setCoverLetter('');
    try {
      const res = await rtGenerateCoverLetter({ resume_id: resume.resume_id, target_role: targetRole, company });
      setCoverLetter(res.cover_letter);
    } finally {
      setCoverLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayParsed = editMode ? editedParsed : tailoredParsed ?? resume?.parsed;

  const inputBase = {
    background: '#f8f4ec',
    border: '1px solid #d4caba',
    color: '#0f0f0d',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    fontFamily: 'inherit',
    fontWeight: 450,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  function eInput(value, onChange, placeholder = '', extra = {}) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputBase, ...extra }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#d4caba';
        }}
      />
    );
  }

  function eTextarea(value, onChange, placeholder = '', rows = 2) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ ...inputBase, resize: 'none' }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#d4caba';
        }}
      />
    );
  }

  function renderBullets(bullets, section, sectionIdx, origBullets) {
    if (editMode && editedParsed) {
      const editBullets = editedParsed[section][sectionIdx].bullets;
      return (
        <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: 'none', marginBottom: 0 }}>
          {editBullets.map((b, bi) => (
            <li key={bi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ marginTop: 12, flexShrink: 0, fontSize: 12, color: '#9a9288' }}>·</span>
              <div style={{ flex: 1, minWidth: 0 }}>{eTextarea(b, (v) => updateEdit((p) => { p[section][sectionIdx].bullets[bi] = v; }), 'Bullet…')}</div>
              <button
                type="button"
                onClick={() => updateEdit((p) => { p[section][sectionIdx].bullets.splice(bi, 1); })}
                style={{ marginTop: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#4a4540', flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </li>
          ))}
          <li style={{ listStyle: 'none' }}>
            <button
              type="button"
              onClick={() => updateEdit((p) => { p[section][sectionIdx].bullets.push(''); })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                marginTop: 6,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#7a7268',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f0f0d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#7a7268';
              }}
            >
              <Plus size={12} /> Add bullet
            </button>
          </li>
        </ul>
      );
    }
    return (
      <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: 'none', marginBottom: 0 }}>
        {bullets.map((b, bi) => {
          const key = `${section}-${sectionIdx}-${bi}`;
          const adjusting = adjustingBullet === key;
          const changed = origBullets && origBullets[bi] !== b;
          const showControls = hoverBulletKey === key && !tailoredParsed;
          const promptOpen = bulletPromptKey === key;
          return (
            <li
              key={bi}
              style={{ marginBottom: 8 }}
              onMouseEnter={() => setHoverBulletKey(key)}
              onMouseLeave={() => setHoverBulletKey(null)}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ marginTop: 2, flexShrink: 0, fontSize: 12, color: '#9a9288' }}>·</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {adjusting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#7a7268' }}>
                      <Loader2 size={12} style={spinStyle} /> Rewriting…
                    </div>
                  ) : (
                    <span style={{ fontSize: 14, lineHeight: 1.6, color: changed ? '#4a4540' : '#0f0f0d' }}>{b}</span>
                  )}
                </div>
                {!tailoredParsed && (
                  <div style={{ display: 'flex', gap: 2, opacity: showControls ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
                    <button
                      type="button"
                      title="Shorten"
                      disabled={!!adjustingBullet}
                      onClick={() => handleAdjustBullet(section, sectionIdx, bi, 'shorten')}
                      style={{
                        padding: 4,
                        border: 'none',
                        background: 'transparent',
                        cursor: adjustingBullet ? 'not-allowed' : 'pointer',
                        opacity: adjustingBullet ? 0.3 : 1,
                        color: '#9a9288',
                      }}
                      onMouseEnter={(e) => { if (!adjustingBullet) e.currentTarget.style.color = '#0f0f0d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#9a9288'; }}
                    >
                      <Minimize2 size={12} />
                    </button>
                    <button
                      type="button"
                      title="Lengthen"
                      disabled={!!adjustingBullet}
                      onClick={() => handleAdjustBullet(section, sectionIdx, bi, 'lengthen')}
                      style={{
                        padding: 4,
                        border: 'none',
                        background: 'transparent',
                        cursor: adjustingBullet ? 'not-allowed' : 'pointer',
                        opacity: adjustingBullet ? 0.3 : 1,
                        color: '#9a9288',
                      }}
                      onMouseEnter={(e) => { if (!adjustingBullet) e.currentTarget.style.color = '#0f0f0d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#9a9288'; }}
                    >
                      <Maximize2 size={12} />
                    </button>
                    <button
                      type="button"
                      title="Rewrite with instructions"
                      disabled={!!adjustingBullet}
                      onClick={() => { setBulletPromptKey(promptOpen ? null : key); setBulletPrompt(''); }}
                      style={{
                        padding: 4,
                        border: 'none',
                        background: promptOpen ? 'rgba(0,0,0,0.08)' : 'transparent',
                        borderRadius: 4,
                        cursor: adjustingBullet ? 'not-allowed' : 'pointer',
                        opacity: adjustingBullet ? 0.3 : 1,
                        color: promptOpen ? '#0f0f0d' : '#9a9288',
                      }}
                      onMouseEnter={(e) => { if (!adjustingBullet) e.currentTarget.style.color = '#0f0f0d'; }}
                      onMouseLeave={(e) => { if (!promptOpen) e.currentTarget.style.color = '#9a9288'; }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      title="Delete bullet"
                      disabled={!!adjustingBullet}
                      onClick={() => handleDeleteBullet(section, sectionIdx, bi)}
                      style={{
                        padding: 4,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#9a9288',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#9a9288'; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
              {promptOpen && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6, marginLeft: 20, alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={bulletPrompt}
                    onChange={(e) => setBulletPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && bulletPrompt.trim()) {
                        handleAdjustBullet(section, sectionIdx, bi, 'rewrite', bulletPrompt.trim());
                      }
                      if (e.key === 'Escape') { setBulletPromptKey(null); setBulletPrompt(''); }
                    }}
                    placeholder="e.g. be more quantitative, add metrics…"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 13,
                      borderRadius: 8,
                      border: '1px solid #d4caba',
                      background: '#f8f4ec',
                      color: '#0f0f0d',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#d4caba'; }}
                  />
                  <button
                    type="button"
                    disabled={!bulletPrompt.trim() || !!adjustingBullet}
                    onClick={() => handleAdjustBullet(section, sectionIdx, bi, 'rewrite', bulletPrompt.trim())}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      background: '#1a1a18',
                      color: '#f5f0e8',
                      cursor: !bulletPrompt.trim() ? 'not-allowed' : 'pointer',
                      opacity: !bulletPrompt.trim() ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Sparkles size={12} /> Rewrite
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBulletPromptKey(null); setBulletPrompt(''); }}
                    style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9288', lineHeight: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  function renderSectionWrapper(section, children) {
    if (!resume) return null;
    const order = resume.section_order;
    const pos = order.indexOf(section);
    const isMoving = movingSection === section;
    const showReorder = hoverSectionReorder === section && !tailoredParsed && !editMode;
    return (
      <div
        key={section}
        style={{
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          transition: 'opacity 0.15s',
          opacity: isMoving ? 0.6 : 1,
          background: '#eae5da',
          border: '1px solid #d4caba',
        }}
        onMouseEnter={() => setHoverSectionReorder(section)}
        onMouseLeave={() => setHoverSectionReorder(null)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
          {editMode && editedParsed ? (
            <input
              type="text"
              value={editedParsed.section_labels?.[section] ?? ''}
              placeholder={SECTION_LABELS[section]}
              onChange={(e) => {
                const v = e.target.value;
                updateEdit((p) => {
                  if (!p.section_labels) p.section_labels = {};
                  if (!v.trim()) {
                    delete p.section_labels[section];
                    if (Object.keys(p.section_labels).length === 0) delete p.section_labels;
                  } else {
                    p.section_labels[section] = v;
                  }
                });
              }}
              style={{
                ...inputBase,
                flex: 1,
                minWidth: 0,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                padding: '10px 14px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d4caba';
              }}
            />
          ) : (
            <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#9a9288', margin: 0, flex: 1, minWidth: 0 }}>
              {getSectionLabel(section, displayParsed)}
            </h2>
          )}
          {!tailoredParsed && !editMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: showReorder ? 1 : 0.3, transition: 'opacity 0.15s', flexShrink: 0 }}>
              <button
                type="button"
                title={`Remove ${getSectionLabel(section, resume.parsed)} section`}
                onClick={() => handleDeleteSection(section)}
                style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#b0a898', lineHeight: 0, transition: 'color 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#b0a898'; }}
              >
                <Trash2 size={13} />
              </button>
              <GripVertical size={13} style={{ color: '#b0a898' }} />
              <MoveButtons
                size={14}
                onUp={() => handleMoveSection(section, 'up')}
                onDown={() => handleMoveSection(section, 'down')}
                disableUp={pos <= 0 || isMoving}
                disableDown={pos >= order.length - 1 || isMoving}
              />
            </div>
          )}
        </div>
        {children}
      </div>
    );
  }

  function renderSection(section) {
    if (!resume || !displayParsed) return null;
    const parsed = displayParsed;
    const origParsed = resume.parsed;

    switch (section) {
      case 'summary':
        if (!parsed.summary && !editMode) return null;
        return renderSectionWrapper(
          'summary',
          editMode && editedParsed
            ? eTextarea(editedParsed.summary, (v) => updateEdit((p) => { p.summary = v; }), 'Professional summary…', 4)
            : (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: tailoredParsed && parsed.summary !== origParsed.summary ? '#4a4540' : '#0f0f0d', margin: 0 }}>
                {parsed.summary}
              </p>
            ),
        );

      case 'experience':
        if (!parsed.experience?.length) return null;
        return renderSectionWrapper(
          'experience',
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {parsed.experience.map((exp, si) => {
              const isMovingItem = movingItem === `experience-${si}`;
              const origExp = origParsed.experience?.[si];
              const entryKey = `experience-${si}`;
              const showItemMove = hoverEntryKey === entryKey && !tailoredParsed && !editMode && parsed.experience.length > 1;
              return (
                <div
                  key={si}
                  style={{ transition: 'opacity 0.15s', opacity: isMovingItem ? 0.4 : 1 }}
                  onMouseEnter={() => setHoverEntryKey(entryKey)}
                  onMouseLeave={() => setHoverEntryKey(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {!tailoredParsed && !editMode && parsed.experience.length > 1 && (
                      <div style={{ opacity: showItemMove ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0, marginTop: 2 }}>
                        <MoveButtons
                          onUp={() => handleMoveItem('experience', si, 'up')}
                          onDown={() => handleMoveItem('experience', si, 'down')}
                          disableUp={si === 0 || isMovingItem}
                          disableDown={si === parsed.experience.length - 1 || isMovingItem}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editMode && editedParsed ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                          {eInput(editedParsed.experience[si].role, (v) => updateEdit((p) => { p.experience[si].role = v; }), 'Role / Title')}
                          {eInput(editedParsed.experience[si].company, (v) => updateEdit((p) => { p.experience[si].company = v; }), 'Company')}
                          {eInput(editedParsed.experience[si].dates, (v) => updateEdit((p) => { p.experience[si].dates = v; }), 'Dates')}
                          {eInput(editedParsed.experience[si].location ?? '', (v) => updateEdit((p) => { p.experience[si].location = v; }), 'Location')}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 14, color: '#0f0f0d', margin: 0 }}>{exp.role}</p>
                            <p style={{ fontSize: 12, marginTop: 4, color: '#7a7268', marginBottom: 0 }}>
                              {exp.company}
                              {exp.location ? ` · ${exp.location}` : ''}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                            <span style={{ fontSize: 12, color: '#9a9288' }}>{exp.dates}</span>
                            {!tailoredParsed && (
                              <button
                                type="button"
                                title="Delete experience"
                                onClick={() => handleDeleteEntry('experience', si)}
                                style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#c8bfb0', lineHeight: 0, opacity: hoverEntryKey === entryKey ? 1 : 0, transition: 'opacity 0.15s, color 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#c8bfb0'; }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {renderBullets(
                        editMode && editedParsed ? editedParsed.experience[si].bullets : exp.bullets,
                        'experience',
                        si,
                        tailoredParsed ? origExp?.bullets : undefined,
                      )}
                    </div>
                  </div>
                  {si < parsed.experience.length - 1 && <div style={{ borderBottom: '1px solid #d4caba', marginTop: 24 }} />}
                </div>
              );
            })}
          </div>,
        );

      case 'projects':
        if (!parsed.projects?.length) return null;
        return renderSectionWrapper(
          'projects',
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {parsed.projects.map((proj, si) => {
              const isMovingItem = movingItem === `projects-${si}`;
              const origProj = origParsed.projects?.[si];
              const entryKey = `projects-${si}`;
              const showItemMove = hoverEntryKey === entryKey && !tailoredParsed && !editMode && parsed.projects.length > 1;
              return (
                <div
                  key={si}
                  style={{ transition: 'opacity 0.15s', opacity: isMovingItem ? 0.4 : 1 }}
                  onMouseEnter={() => setHoverEntryKey(entryKey)}
                  onMouseLeave={() => setHoverEntryKey(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {!tailoredParsed && !editMode && parsed.projects.length > 1 && (
                      <div style={{ opacity: showItemMove ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0, marginTop: 2 }}>
                        <MoveButtons
                          onUp={() => handleMoveItem('projects', si, 'up')}
                          onDown={() => handleMoveItem('projects', si, 'down')}
                          disableUp={si === 0 || isMovingItem}
                          disableDown={si === parsed.projects.length - 1 || isMovingItem}
                        />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editMode && editedParsed ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                          {eInput(editedParsed.projects[si].name, (v) => updateEdit((p) => { p.projects[si].name = v; }), 'Project name')}
                          {eInput(editedParsed.projects[si].dates ?? '', (v) => updateEdit((p) => { p.projects[si].dates = v; }), 'Dates')}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: '#0f0f0d', margin: 0 }}>{proj.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                            <span style={{ fontSize: 12, color: '#9a9288' }}>{proj.dates}</span>
                            {!tailoredParsed && (
                              <button
                                type="button"
                                title="Delete project"
                                onClick={() => handleDeleteEntry('projects', si)}
                                style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#c8bfb0', lineHeight: 0, opacity: hoverEntryKey === entryKey ? 1 : 0, transition: 'opacity 0.15s, color 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#c8bfb0'; }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {(proj.technologies ?? []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {(proj.technologies ?? []).map((t, ti) => (
                            <span
                              key={ti}
                              style={{
                                fontSize: 12,
                                padding: '4px 10px',
                                borderRadius: 9999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#eae5da',
                                color: '#4a4540',
                                border: '1px solid #d4caba',
                              }}
                            >
                              {t}
                              {editMode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEdit((p) => {
                                      if (!p.projects[si].technologies) p.projects[si].technologies = [];
                                      p.projects[si].technologies.splice(ti, 1);
                                    })
                                  }
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9288', lineHeight: 1 }}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {renderBullets(
                        editMode && editedParsed ? editedParsed.projects[si].bullets : proj.bullets,
                        'projects',
                        si,
                        tailoredParsed ? origProj?.bullets : undefined,
                      )}
                    </div>
                  </div>
                  {si < parsed.projects.length - 1 && <div style={{ borderBottom: '1px solid #d4caba', marginTop: 20 }} />}
                </div>
              );
            })}
          </div>,
        );

      case 'education':
        if (!parsed.education?.length) return null;
        return renderSectionWrapper(
          'education',
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {parsed.education.map((edu, si) => {
              const isMovingItem = movingItem === `education-${si}`;
              const entryKey = `education-${si}`;
              const showItemMove = hoverEntryKey === entryKey && !tailoredParsed && !editMode && parsed.education.length > 1;
              return (
                <div
                  key={si}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.15s', opacity: isMovingItem ? 0.4 : 1 }}
                  onMouseEnter={() => setHoverEntryKey(entryKey)}
                  onMouseLeave={() => setHoverEntryKey(null)}
                >
                  {!tailoredParsed && !editMode && parsed.education.length > 1 && (
                    <div style={{ opacity: showItemMove ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
                      <MoveButtons
                        onUp={() => handleMoveItem('education', si, 'up')}
                        onDown={() => handleMoveItem('education', si, 'down')}
                        disableUp={si === 0 || isMovingItem}
                        disableDown={si === parsed.education.length - 1 || isMovingItem}
                      />
                    </div>
                  )}
                  {editMode && editedParsed ? (
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {eInput(editedParsed.education[si].institution, (v) => updateEdit((p) => { p.education[si].institution = v; }), 'Institution')}
                      {eInput(editedParsed.education[si].dates, (v) => updateEdit((p) => { p.education[si].dates = v; }), 'Dates')}
                      {eInput(editedParsed.education[si].degree, (v) => updateEdit((p) => { p.education[si].degree = v; }), 'Degree')}
                      {eInput(editedParsed.education[si].gpa ?? '', (v) => updateEdit((p) => { p.education[si].gpa = v; }), 'GPA (optional)')}
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f0f0d', margin: 0 }}>{edu.institution}</p>
                        <p style={{ fontSize: 12, marginTop: 4, color: '#7a7268', marginBottom: 0 }}>
                          {edu.degree}
                          {edu.gpa ? ` · GPA ${edu.gpa}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                        <span style={{ fontSize: 12, color: '#9a9288' }}>{edu.dates}</span>
                        {!tailoredParsed && (
                          <button
                            type="button"
                            title="Delete education"
                            onClick={() => handleDeleteEntry('education', si)}
                            style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#c8bfb0', lineHeight: 0, opacity: hoverEntryKey === entryKey ? 1 : 0, transition: 'opacity 0.15s, color 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#c8bfb0'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>,
        );

      case 'skills':
        if (!parsed.skills?.length && !editMode) return null;
        return renderSectionWrapper(
          'skills',
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(editMode && editedParsed ? editedParsed.skills : parsed.skills).map((s, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 9999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#f0ebe2',
                  border: '1px solid #d4caba',
                  color: '#4a4540',
                }}
              >
                {s}
                {editMode && (
                  <button
                    type="button"
                    onClick={() => updateEdit((p) => { p.skills.splice(i, 1); })}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9288', lineHeight: 1 }}
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            ))}
            {editMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSkill.trim()) {
                      updateEdit((p) => { p.skills.push(newSkill.trim()); });
                      setNewSkill('');
                    }
                  }}
                  placeholder="Add skill…"
                  style={{ ...inputBase, width: 128, borderRadius: 9999, padding: '6px 12px', fontSize: 12 }}
                  onFocus={(ev) => { ev.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)'; }}
                  onBlur={(ev) => { ev.currentTarget.style.borderColor = '#d4caba'; }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSkill.trim()) {
                      updateEdit((p) => { p.skills.push(newSkill.trim()); });
                      setNewSkill('');
                    }
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7a7268' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#0f0f0d'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#7a7268'; }}
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>,
        );

      case 'certifications':
        if (!parsed.certifications?.length && !editMode) return null;
        return renderSectionWrapper(
          'certifications',
          <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
            {(editMode && editedParsed ? editedParsed.certifications : parsed.certifications).map((c, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, flexShrink: 0, color: '#9a9288' }}>·</span>
                {editMode && editedParsed ? (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    {eInput(editedParsed.certifications[i], (v) => updateEdit((p) => { p.certifications[i] = v; }), 'Certification…')}
                    <button
                      type="button"
                      onClick={() => updateEdit((p) => { p.certifications.splice(i, 1); })}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9288', flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 14, color: '#0f0f0d' }}>{c}</span>
                )}
              </li>
            ))}
            {editMode && (
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, listStyle: 'none' }}>
                <input
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCert.trim()) {
                      updateEdit((p) => { p.certifications.push(newCert.trim()); });
                      setNewCert('');
                    }
                  }}
                  placeholder="Add certification…"
                  style={{ ...inputBase, flex: 1, padding: '10px 16px' }}
                  onFocus={(ev) => { ev.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)'; }}
                  onBlur={(ev) => { ev.currentTarget.style.borderColor = '#d4caba'; }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCert.trim()) {
                      updateEdit((p) => { p.certifications.push(newCert.trim()); });
                      setNewCert('');
                    }
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7a7268' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#0f0f0d'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#7a7268'; }}
                >
                  <Plus size={14} />
                </button>
              </li>
            )}
          </ul>,
        );

      default:
        return null;
    }
  }

  const TABS = [
    { id: 'tailor', label: 'Tailor', icon: Sparkles },
    { id: 'skills', label: 'Skills', icon: Target },
    { id: 'cover', label: 'Cover', icon: FileText },
  ];

  function ToggleChip({ label, value, onChange }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={
          value
            ? { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid #1a1a18', background: '#1a1a18', color: '#f5f0e8' }
            : { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid #d4caba', background: '#f0ebe2', color: '#4a4540' }
        }
      >
        {label}
      </button>
    );
  }

  function SidebarLabel({ children }) {
    return (
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288', display: 'block' }}>{children}</label>
    );
  }

  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
  const sidebarInputStyle = {
    background: '#f8f4ec',
    border: '1px solid #d4caba',
    color: '#0f0f0d',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 15,
    fontFamily: 'inherit',
    fontWeight: 450,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };
  const inputFocus = (e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)'; };
  const inputBlur = (e) => { e.currentTarget.style.borderColor = '#d4caba'; };
  const ctaStyle = {
    padding: '14px 0',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    background: '#1a1a18',
    color: '#f5f0e8',
    border: 'none',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'background 0.15s',
  };

  function renderSidebar() {
    if (sidebarTab === 'tailor') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={fieldStyle}>
            <SidebarLabel>
              Job Description <span style={{ color: '#f87171' }}>*</span>
            </SidebarLabel>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here…"
              rows={8}
              style={{ ...sidebarInputStyle, resize: 'none' }}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}>
              <SidebarLabel>Target Role</SidebarLabel>
              <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. SWE II" style={sidebarInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
            <div style={fieldStyle}>
              <SidebarLabel>Company</SidebarLabel>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Anthropic" style={sidebarInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
          </div>
          <div style={fieldStyle}>
            <SidebarLabel>Options</SidebarLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <ToggleChip label="Keyword Optimize" value={keywordOptimize} onChange={setKeywordOptimize} />
              <ToggleChip label="Add Summary" value={addSummary} onChange={setAddSummary} />
              <ToggleChip label="Quantify Bullets" value={quantify} onChange={setQuantify} />
            </div>
          </div>
          <button
            type="button"
            onClick={handleTailor}
            disabled={tailoring || !jd.trim()}
            style={{ ...ctaStyle, opacity: tailoring || !jd.trim() ? 0.5 : 1 }}
            onMouseEnter={(e) => {
              if (!tailoring) e.currentTarget.style.background = '#2a2a28';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1a18';
            }}
          >
            {tailoring ? (
              <>
                <Loader2 size={14} style={spinStyle} />
                Tailoring…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Tailor Resume
              </>
            )}
          </button>
          {tailoredParsed && (
            <div style={{ borderRadius: 12, padding: 16, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#0f0f0d', marginTop: 0, marginBottom: 12 }}>Preview active — highlighted text = AI changes</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(true)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', background: '#1a1a18', color: '#f5f0e8' }}
                >
                  Save Version
                </button>
                <button
                  type="button"
                  onClick={() => setTailoredParsed(null)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, border: '1px solid #d4caba', background: 'transparent', color: '#7a7268', cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0f0f0d';
                    e.currentTarget.style.borderColor = '#b8b0a0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#7a7268';
                    e.currentTarget.style.borderColor = '#d4caba';
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (sidebarTab === 'skills') {
      const score = skillsResult?.score ?? 0;
      const barColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
      const scoreTextColor = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626';
      const chipSets = skillsResult
        ? [
            { list: skillsResult.matched, label: 'Matched', icon: CheckCircle2, chipBg: 'rgba(16,185,129,0.12)', chipBorder: 'rgba(16,185,129,0.35)', chipColor: '#047857' },
            { list: skillsResult.partial, label: 'Partial', icon: AlertCircle, chipBg: 'rgba(245,158,11,0.12)', chipBorder: 'rgba(245,158,11,0.35)', chipColor: '#b45309' },
            { list: skillsResult.missing_key, label: 'Missing', icon: XCircle, chipBg: 'rgba(239,68,68,0.12)', chipBorder: 'rgba(239,68,68,0.35)', chipColor: '#b91c1c' },
          ].filter((g) => g.list.length)
        : [];

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={fieldStyle}>
            <SidebarLabel>
              Job Description <span style={{ color: '#f87171' }}>*</span>
            </SidebarLabel>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here…"
              rows={8}
              style={{ ...sidebarInputStyle, resize: 'none' }}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
          <button
            type="button"
            onClick={handleMatchSkills}
            disabled={skillsLoading || !jd.trim()}
            style={{ ...ctaStyle, opacity: skillsLoading || !jd.trim() ? 0.5 : 1 }}
            onMouseEnter={(e) => {
              if (!skillsLoading) e.currentTarget.style.background = '#2a2a28';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1a18';
            }}
          >
            {skillsLoading ? (
              <>
                <Loader2 size={14} style={spinStyle} />
                Analyzing…
              </>
            ) : (
              <>
                <Target size={14} />
                Analyze Skills
              </>
            )}
          </button>
          {skillsResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eae5da', border: '1px solid #d4caba' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#4a4540' }}>Match Score</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 96, height: 8, borderRadius: 9999, overflow: 'hidden', background: '#d4caba' }}>
                    <div style={{ height: '100%', borderRadius: 9999, width: `${skillsResult.score}%`, background: barColor }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: scoreTextColor }}>{skillsResult.score}%</span>
                </div>
              </div>
              {chipSets.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon size={13} style={{ color: g.chipColor }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: g.chipColor }}>
                        {g.label} ({g.list.length})
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {g.list.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 12,
                            padding: '4px 10px',
                            borderRadius: 9999,
                            background: g.chipBg,
                            border: `1px solid ${g.chipBorder}`,
                            color: g.chipColor,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (sidebarTab === 'cover') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}>
              <SidebarLabel>
                Target Role <span style={{ color: '#f87171' }}>*</span>
              </SidebarLabel>
              <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. SWE II" style={sidebarInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
            <div style={fieldStyle}>
              <SidebarLabel>
                Company <span style={{ color: '#f87171' }}>*</span>
              </SidebarLabel>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Anthropic" style={sidebarInputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
          </div>
          <button
            type="button"
            onClick={handleCoverLetter}
            disabled={coverLoading || !targetRole.trim() || !company.trim()}
            style={{ ...ctaStyle, opacity: coverLoading || !targetRole.trim() || !company.trim() ? 0.5 : 1 }}
            onMouseEnter={(e) => {
              if (!coverLoading) e.currentTarget.style.background = '#2a2a28';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a1a18';
            }}
          >
            {coverLoading ? (
              <>
                <Loader2 size={14} style={spinStyle} />
                Generating…
              </>
            ) : (
              <>
                <FileText size={14} />
                Generate Cover Letter
              </>
            )}
          </button>
          {coverLetter && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#7a7268' }}>Generated cover letter</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #d4caba', background: 'transparent', color: '#7a7268', cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0f0f0d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#7a7268';
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={12} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div style={{ borderRadius: 12, padding: 16, maxHeight: 400, overflowY: 'auto', background: '#f8f4ec', border: '1px solid #d4caba' }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#0f0f0d', margin: 0 }}>{coverLetter}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  const labelBadge = resume ? LABEL_BADGE_STYLE[resume.label] ?? LABEL_BADGE_STYLE.general : null;
  const companyDisplay = resume ? normalizeCompanyTag(resume) : 'Other';

  if (loading) {
    return (
      <>
        <style>{`@keyframes resumeLabSpin { to { transform: rotate(360deg); } }`}</style>
        <Layout>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, color: '#7a7268' }}>
            <Loader2 style={{ ...spinStyle, marginRight: 8 }} size={20} /> Loading…
          </div>
        </Layout>
      </>
    );
  }

  if (!resume) {
    return (
      <Layout>
        <div style={{ padding: 32, color: '#7a7268' }}>Resume not found.</div>
      </Layout>
    );
  }

  return (
    <>
      <style>{`@keyframes resumeLabSpin { to { transform: rotate(360deg); } }`}</style>
      <Layout>
        <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 32, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => navigate('/resume-lab')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 28, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9288', transition: 'color 0.15s' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f0f0d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9a9288';
              }}
            >
              <ArrowLeft size={16} /> Back to Resumes
            </button>

            {companyQuery?.trim() && !companyBannerDismissed && (
              <div
                style={{
                  marginBottom: 20,
                  padding: '12px 16px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.22)',
                }}
              >
                <span style={{ fontSize: 14, color: '#1e3a8a' }}>
                  Tailoring for <strong>{company.trim() || companyQuery.trim()}</strong> from Companies page
                </span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setCompanyBannerDismissed(true)}
                  style={{
                    flexShrink: 0,
                    padding: 6,
                    border: 'none',
                    borderRadius: 8,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#64748b',
                    lineHeight: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0f0f0d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#0f0f0d', margin: 0 }}>
                    {editMode ? editVersionName || resume.version_name : resume.version_name}
                  </h1>
                  <p style={{ fontSize: 14, marginTop: 8, color: '#7a7268', marginBottom: 0 }}>
                    {editMode && editedParsed ? editedParsed.name ?? '' : resume.parsed?.name ?? ''}
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 12, padding: '6px 12px', borderRadius: 9999, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6, ...labelBadge }}>
                    <Tag size={11} />
                    {formatAreaLabel(resume.label || 'general')}
                  </span>
                  <span style={{ fontSize: 12, padding: '6px 12px', borderRadius: 9999, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6, ...COMPANY_TAG_BADGE }}>
                    <Building2 size={11} />
                    {companyDisplay}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMetaModal(true)}
                    style={{
                      fontSize: 12,
                      padding: '6px 12px',
                      borderRadius: 9999,
                      fontWeight: 500,
                      border: '1px solid #d4caba',
                      background: 'transparent',
                      color: '#7a7268',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0f0f0d';
                      e.currentTarget.style.borderColor = '#b8b0a0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#7a7268';
                      e.currentTarget.style.borderColor = '#d4caba';
                    }}
                  >
                    Edit tags
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  title="Preview resume"
                  onClick={openResumePreview}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 12, border: '1px solid #d4caba', background: 'transparent', color: '#7a7268', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0f0f0d';
                    e.currentTarget.style.borderColor = '#b8b0a0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#7a7268';
                    e.currentTarget.style.borderColor = '#d4caba';
                  }}
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  type="button"
                  title="Export as PDF"
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 12, border: '1px solid #d4caba', background: 'transparent', color: '#7a7268', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0f0f0d';
                    e.currentTarget.style.borderColor = '#b8b0a0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#7a7268';
                    e.currentTarget.style.borderColor = '#d4caba';
                  }}
                >
                  <Printer size={14} /> PDF
                </button>
                <button
                  type="button"
                  title="Download DOCX"
                  onClick={handleExportDocx}
                  disabled={exporting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    padding: '8px 16px',
                    borderRadius: 12,
                    border: '1px solid #d4caba',
                    background: 'transparent',
                    color: '#7a7268',
                    cursor: exporting ? 'wait' : 'pointer',
                    opacity: exporting ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0f0f0d';
                    e.currentTarget.style.borderColor = '#b8b0a0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#7a7268';
                    e.currentTarget.style.borderColor = '#d4caba';
                  }}
                >
                  {exporting ? <Loader2 size={14} style={spinStyle} /> : <Download size={14} />} DOCX
                </button>
                {!tailoredParsed && !editMode && (
                  <button
                    type="button"
                    onClick={enterEditMode}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 12, border: '1px solid #d4caba', background: 'transparent', color: '#7a7268', cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#b8b0a0';
                      e.currentTarget.style.color = '#0f0f0d';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d4caba';
                      e.currentTarget.style.color = '#7a7268';
                    }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                )}
                {editMode && (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditMode}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 12, border: '1px solid #d4caba', background: 'transparent', color: '#7a7268', cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#0f0f0d';
                        e.currentTarget.style.borderColor = '#b8b0a0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#7a7268';
                        e.currentTarget.style.borderColor = '#d4caba';
                      }}
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdits}
                      disabled={saving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 14,
                        padding: '8px 16px',
                        borderRadius: 12,
                        border: 'none',
                        background: '#1a1a18',
                        color: '#f5f0e8',
                        cursor: saving ? 'wait' : 'pointer',
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      {saving ? <Loader2 size={14} style={spinStyle} /> : <Save size={14} />}
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {editMode && (
              <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Edit2 size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#b45309' }}>
                    Edit mode — modify any field, then click <strong>Save Changes</strong> below.
                  </span>
                </div>
                {editedParsed && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 14,
                      padding: '16px 20px',
                      borderRadius: 12,
                      border: '1px solid #d4caba',
                      background: '#f8f4ec',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#4a4540' }} htmlFor="rl-edit-version-title">
                        Version title
                      </label>
                      <input
                        id="rl-edit-version-title"
                        value={editVersionName}
                        onChange={(e) => setEditVersionName(e.target.value)}
                        placeholder="Resume version name"
                        style={{
                          background: '#f8f4ec',
                          border: '1px solid #d4caba',
                          color: '#0f0f0d',
                          borderRadius: 10,
                          padding: '12px 14px',
                          fontSize: 14,
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d4caba';
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#4a4540' }} htmlFor="rl-edit-name">
                        Name on resume
                      </label>
                      <input
                        id="rl-edit-name"
                        value={editedParsed.name ?? ''}
                        onChange={(e) => updateEdit((p) => { p.name = e.target.value; })}
                        placeholder="Your name"
                        style={{
                          background: '#f8f4ec',
                          border: '1px solid #d4caba',
                          color: '#0f0f0d',
                          borderRadius: 10,
                          padding: '12px 14px',
                          fontSize: 14,
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d4caba';
                        }}
                      />
                    </div>
                  </div>
                )}
                {saveError && (
                  <div style={{ padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(185,28,28,0.3)' }}>
                    <X size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#991b1b' }}>{saveError}</span>
                  </div>
                )}
              </div>
            )}
            {tailoredParsed && !editMode && (
              <div style={{ marginBottom: 20, padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} style={{ color: '#4a4540' }} />
                  <span style={{ fontSize: 14, color: '#0f0f0d' }}>Tailored preview — highlighted text = AI changes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => setShowSaveModal(true)} style={{ fontSize: 14, padding: '6px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#1a1a18', color: '#f5f0e8' }}>
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setTailoredParsed(null)}
                    style={{ fontSize: 14, padding: '6px 12px', borderRadius: 12, border: '1px solid #d4caba', background: 'transparent', color: '#7a7268', cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0f0f0d';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#7a7268';
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {editMode && getRenderableContactEntries(editedParsed?.contact).length > 0 && (
              <div style={{ borderRadius: 12, padding: '16px 24px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: '8px 24px', background: '#eae5da', border: '1px solid #d4caba' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9a9288', width: '100%' }}>Contact (saved with Save Changes)</span>
                {getRenderableContactEntries(editedParsed.contact).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 14, color: '#4a4540' }}>
                    <span style={{ color: '#9a9288' }}>{k}: </span>
                    {v}
                  </span>
                ))}
              </div>
            )}

            {!editMode && (
              <div style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #d4caba', background: '#f8f4ec', padding: '20px 24px' }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9a9288', margin: '0 0 8px' }}>Contact & links</h3>
                <p style={{ fontSize: 13, color: '#7a7268', margin: '0 0 16px', lineHeight: 1.45 }}>
                  Only fields you fill in appear on PDF and DOCX. Values like &quot;UNKNOWN&quot; or empty lines are skipped.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  {CONTACT_FORM_KEYS.map(({ key, label }) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#4a4540' }} htmlFor={`rl-contact-${key}`}>{label}</label>
                      <input
                        id={`rl-contact-${key}`}
                        value={contactForm[key] || ''}
                        onChange={(e) => setContactForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={
                          key === 'linkedin'
                            ? 'https://linkedin.com/in/…'
                            : key === 'github'
                              ? 'https://github.com/…'
                              : `Your ${label.toLowerCase()}`
                        }
                        style={{
                          background: '#f8f4ec',
                          border: '1px solid #d4caba',
                          color: '#0f0f0d',
                          borderRadius: 10,
                          padding: '12px 14px',
                          fontSize: 14,
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d4caba';
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={saveContactFields}
                    disabled={savingContact}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 18px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      border: 'none',
                      background: '#1a1a18',
                      color: '#f5f0e8',
                      cursor: savingContact ? 'wait' : 'pointer',
                      opacity: savingContact ? 0.7 : 1,
                    }}
                  >
                    {savingContact ? <Loader2 size={15} style={spinStyle} /> : null}
                    Save contact
                  </button>
                  {contactSaveMsg ? (
                    <span style={{ fontSize: 13, color: contactSaveMsg.toLowerCase().includes('fail') ? '#b91c1c' : '#047857' }}>{contactSaveMsg}</span>
                  ) : null}
                </div>
                {getRenderableContactEntries(resume.parsed?.contact).length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #d4caba', display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#9a9288', width: '100%' }}>On resume</span>
                    {getRenderableContactEntries(resume.parsed.contact).map(([k, v]) => (
                      <span key={k} style={{ fontSize: 13, color: '#4a4540' }}>
                        <span style={{ color: '#9a9288' }}>{k}: </span>
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!tailoredParsed && !editMode && (
              <p style={{ fontSize: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, color: '#b0a898', marginTop: 0 }}>
                <GripVertical size={12} />
                Hover over sections or entries to reorder · Use Edit to change text
              </p>
            )}

            {resume.section_order.map((s) => renderSection(s))}
          </div>

          <ResizeHandle onDrag={handleRlSidebarDrag} />
          <div style={{ width: rlSidebarW, flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', borderLeft: '1px solid #d4caba', background: '#ede8dc' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #d4caba', flexShrink: 0 }}>
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = sidebarTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSidebarTab(t.id)}
                    style={{
                      flex: 1,
                      padding: '14px 0',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'transparent',
                      color: active ? '#0f0f0d' : '#7a7268',
                      borderBottom: active ? '2px solid #0f0f0d' : '2px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.color = '#4a4540';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.color = '#7a7268';
                    }}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>{renderSidebar()}</div>
          </div>
        </div>

        {showMetaModal && resume && (
          <EditResumeMetaModal
            resume={resume}
            onClose={() => setShowMetaModal(false)}
            onSaved={async () => {
              setShowMetaModal(false);
              try {
                const r = await rtGetResume(id);
                if (r) setResume(r);
              } catch { /* noop */ }
            }}
          />
        )}

        {showSaveModal && tailoredParsed && resume && (
          <SaveTailoredModal
            resumeId={resume.resume_id}
            tailoredParsed={tailoredParsed}
            currentVersionName={resume.version_name}
            tailorCompany={company}
            onClose={() => setShowSaveModal(false)}
            onSaved={(newId) => {
              setShowSaveModal(false);
              setTailoredParsed(null);
              if (newId) navigate(`/resume-lab/${newId}`);
              else rtGetResume(resume.resume_id).then((r) => setResume(r));
            }}
          />
        )}

        {previewOpen && (
          <ResumePreviewModal
            title={(editMode && editVersionName.trim()) ? editVersionName.trim() : resume?.version_name || 'Preview'}
            html={previewHtml}
            onClose={() => {
              setPreviewOpen(false);
              setPreviewHtml('');
            }}
          />
        )}
      </Layout>
    </>
  );
}

export default function ResumeLab() {
  const { id } = useParams();
  const navigate = useNavigate();
  if (!id) return <ResumeLabDashboard />;
  return <ResumeLabDetail id={id} navigate={navigate} />;
}
