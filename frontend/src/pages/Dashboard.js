import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { rtListResumes, rtListExperiences, rtListStories, listSavedCompanies } from '../services/api';
import {
  FileText, Building2, Bot, User, Briefcase,
  MessageSquare, ArrowRight,
} from 'lucide-react';

const chip = (label, color = '#4a4540') => (
  <span key={label} style={{
    display: 'inline-block', background: color + '18', color: color,
    border: `1px solid ${color}44`, borderRadius: 999, padding: '2px 10px',
    fontSize: '0.78rem', fontWeight: 500, marginRight: 4, marginBottom: 4,
  }}>{label}</span>
);

function PrefsDisplay({ preferences }) {
  if (!preferences) return <p style={{ color: '#9a9288', fontSize: 14 }}>No preferences set.</p>;
  const p = preferences;
  const hasAny = p.work_authorization?.length || p.preferred_locations?.length ||
    p.work_modes?.length || p.role_types?.length;

  return (
    <div style={{ fontSize: 14 }}>
      <div style={{ marginBottom: 6 }}>
        <strong style={{ color: '#4a4540' }}>Sponsorship: </strong>
        {chip(p.needs_sponsorship ? 'Needs Sponsorship' : 'No Sponsorship Needed', p.needs_sponsorship ? '#b91c1c' : '#065f46')}
      </div>
      {p.work_authorization?.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: '#4a4540' }}>Work Auth: </strong>
          {p.work_authorization.map((a) => chip(a, '#6d28d9'))}
        </div>
      )}
      {p.work_modes?.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: '#4a4540' }}>Work Mode: </strong>
          {p.work_modes.map((m) => chip(m, '#b45309'))}
        </div>
      )}
      {p.role_types?.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: '#4a4540' }}>Roles: </strong>
          {p.role_types.map((r) => chip(r, '#1d4ed8'))}
        </div>
      )}
      {p.preferred_locations?.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: '#4a4540' }}>Locations: </strong>
          {p.preferred_locations.map((l) => chip(l, '#065f46'))}
        </div>
      )}
      {!hasAny && <span style={{ color: '#9a9288' }}>No preferences set yet.</span>}
    </div>
  );
}

const quickActions = [
  { label: 'Resume Lab', desc: 'Upload, tailor, and export resume versions', icon: FileText, to: '/resume-lab', accent: '#0f0f0d' },
  { label: 'Career Fair', desc: 'Browse companies and get matched', icon: Building2, to: '/companies', accent: '#7a7268' },
  { label: 'Experiences', desc: 'Organize work history for BQ prep', icon: Briefcase, to: '/experiences', accent: '#7a7268' },
  { label: 'BQ Prep', desc: 'Build STAR stories for interviews', icon: MessageSquare, to: '/bq', accent: '#7a7268' },
  { label: 'AI Chat', desc: 'Chat with AI about companies and prep', icon: Bot, to: '/chat', accent: '#7a7268' },
];

const EVENT_ID = 'evt_umich_fall_2025';

function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        const [resumes, experiences, stories, saved] = await Promise.allSettled([
          rtListResumes(),
          rtListExperiences(),
          rtListStories(''),
          listSavedCompanies(token, EVENT_ID),
        ]);
        if (cancelled) return;
        setStats({
          resumes: resumes.status === 'fulfilled' ? (resumes.value?.resumes ?? resumes.value ?? []).length : 0,
          experiences: experiences.status === 'fulfilled' ? (experiences.value?.experiences ?? experiences.value ?? []).length : 0,
          stories: stories.status === 'fulfilled' ? (stories.value?.stories ?? stories.value ?? []).length : 0,
          savedCompanies: saved.status === 'fulfilled' ? (Array.isArray(saved.value) ? saved.value.length : 0) : 0,
        });
      } catch { /* silent */ }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  if (!user) return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7a7268' }}>Loading…</div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f0f0d', margin: 0 }}>
              Welcome back, {user.name}
            </h1>
            <p style={{ fontSize: 15, color: '#7a7268', marginTop: 8 }}>
              Your career fair toolkit is ready to help you succeed.
            </p>
          </div>

          {/* Stats Strip */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
              {[
                { label: 'Resume Versions', value: stats.resumes, icon: FileText, to: '/resume-lab' },
                { label: 'Saved Companies', value: stats.savedCompanies, icon: Building2, to: '/companies' },
                { label: 'Experiences', value: stats.experiences, icon: Briefcase, to: '/experiences' },
                { label: 'STAR Stories', value: stats.stories, icon: MessageSquare, to: '/bq' },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => navigate(s.to)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
                    borderRadius: 12, border: '1px solid #d4caba', background: '#fff',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d4caba'; }}
                >
                  <s.icon size={18} style={{ color: '#9a9288', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 22, color: '#0f0f0d', margin: 0, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: '#9a9288', marginTop: 4, margin: 0 }}>{s.label}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288', marginBottom: 20 }}>Quick Actions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.to)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16, padding: 24,
                    borderRadius: 12, border: '1px solid #d4caba', background: '#eae5da',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d4caba'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f0ebe2', border: '1px solid #d4caba' }}>
                    <a.icon size={18} style={{ color: a.accent }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: '#0f0f0d', margin: 0 }}>{a.label}</p>
                      <ArrowRight size={14} style={{ color: '#9a9288', flexShrink: 0 }} />
                    </div>
                    <p style={{ fontSize: 13, color: '#7a7268', marginTop: 4, margin: 0 }}>{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Profile Card */}
          <div style={{ borderRadius: 12, border: '1px solid #d4caba', background: '#eae5da', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <img src="/logo.png" alt="AI4Careers" style={{ width: 48, height: 48, borderRadius: 12 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 16, color: '#0f0f0d', margin: 0 }}>{user.name}</p>
                <p style={{ fontSize: 14, color: '#7a7268', marginTop: 2 }}>{user.email}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #d4caba', paddingTop: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288', marginBottom: 12 }}>Career Preferences</h3>
              <PrefsDisplay preferences={user.preferences} />
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                  borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1px solid #d4caba',
                  background: 'transparent', color: '#7a7268', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#0f0f0d'; e.currentTarget.style.borderColor = '#b0a898'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#7a7268'; e.currentTarget.style.borderColor = '#d4caba'; }}
              >
                <User size={14} /> Edit Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
