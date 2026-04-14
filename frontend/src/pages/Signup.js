import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const SIGNUP_DRAFT_KEY = 'signup-draft';

const INPUT = {
  background: '#f8f4ec', border: '1px solid #d4caba', color: '#0f0f0d',
  width: '100%', borderRadius: 10, padding: '14px 16px', fontSize: 15,
  fontFamily: 'inherit', fontWeight: 450,
  outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
};
const onFocus = (e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)'; };
const onBlur = (e) => { e.currentTarget.style.borderColor = '#d4caba'; };

function Signup() {
  const location = useLocation();
  const routeDraft = location.state?.signupDraft || null;
  const [name, setName] = useState(() => (routeDraft && typeof routeDraft.name === 'string' ? routeDraft.name : ''));
  const [email, setEmail] = useState(() => (routeDraft && typeof routeDraft.email === 'string' ? routeDraft.email : ''));
  const [password, setPassword] = useState(() => (routeDraft && typeof routeDraft.password === 'string' ? routeDraft.password : ''));
  const [consentedEula, setConsentedEula] = useState(() => Boolean(routeDraft?.consentedEula));
  const [activeField, setActiveField] = useState(() => (routeDraft && typeof routeDraft.activeField === 'string' ? routeDraft.activeField : ''));
  const [error, setError] = useState('');
  const [consentError, setConsentError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (routeDraft && typeof routeDraft === 'object') {
      return;
    }

    try {
      const saved = window.sessionStorage.getItem(SIGNUP_DRAFT_KEY);
      if (!saved) return;

      const draft = JSON.parse(saved);
      if (draft && typeof draft === 'object') {
        setName(typeof draft.name === 'string' ? draft.name : '');
        setEmail(typeof draft.email === 'string' ? draft.email : '');
        setPassword(typeof draft.password === 'string' ? draft.password : '');
        setConsentedEula(Boolean(draft.consentedEula));
        setActiveField(typeof draft.activeField === 'string' ? draft.activeField : '');
      }
    } catch {
      // Ignore malformed draft state.
    }
  }, [routeDraft]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        SIGNUP_DRAFT_KEY,
        JSON.stringify({ name, email, password, consentedEula, activeField })
      );
    } catch {
      // Ignore storage failures.
    }
  }, [name, email, password, consentedEula, activeField]);

  useEffect(() => {
    if (activeField === 'name' && nameRef.current) {
      nameRef.current.focus();
    } else if (activeField === 'email' && emailRef.current) {
      emailRef.current.focus();
    } else if (activeField === 'password' && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [activeField]);

  const currentDraft = {
    name,
    email,
    password,
    consentedEula,
    activeField,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setConsentError('');

    if (!consentedEula) {
      setConsentError('Please consent to the End User License Agreement first!');
      return;
    }

    setLoading(true);
    const result = await signup(email, password, name);
    if (result.success) {
      try {
        window.sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
      } catch {
        // Ignore storage failures.
      }
      navigate('/dashboard');
    } else {
      setError(result.error || 'Signup failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f5f0e8' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="AI4Careers" style={{ width: 56, height: 56, borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginBottom: 16 }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f0f0d', margin: 0 }}>AI4Careers</h1>
          <p style={{ fontSize: 14, color: '#7a7268', marginTop: 6 }}>Your AI-powered career toolkit</p>
        </div>

        <div style={{ background: '#ede8dc', border: '1px solid #d4caba', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '24px 28px 0' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f0f0d', margin: 0 }}>Create Account</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288' }}>Full Name</label>
              <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required
                style={INPUT} onFocus={(e) => { setActiveField('name'); onFocus(e); }} onBlur={onBlur} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288' }}>Email</label>
              <input ref={emailRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                style={INPUT} onFocus={(e) => { setActiveField('email'); onFocus(e); }} onBlur={onBlur} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288' }}>Password</label>
              <input ref={passwordRef} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                style={INPUT} onFocus={(e) => { setActiveField('password'); onFocus(e); }} onBlur={onBlur} />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: -2, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consentedEula}
                onChange={(e) => {
                  setConsentedEula(e.target.checked);
                  if (e.target.checked) {
                    setConsentError('');
                  }
                }}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: '#1a1a18', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, lineHeight: 1.5, color: '#5c574f' }}>
                I have read and agreed to the{' '}
                <Link
                  to="/eula"
                  state={{ signupDraft: currentDraft }}
                  style={{ color: '#0f0f0d', fontWeight: 600, textDecoration: 'underline' }}
                >
                  End User License Agreement (EULA)
                </Link>.
              </span>
            </label>

            {error && (
              <p style={{ fontSize: 13, color: '#b91c1c', background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)', borderRadius: 8, padding: '12px 16px', margin: 0 }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 600,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: '#1a1a18',
              color: '#f5f0e8', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#2a2a28'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a18'; }}
            >
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            {consentError && (
              <p style={{ fontSize: 13, color: '#b91c1c', margin: '-8px 0 0' }}>
                {consentError}
              </p>
            )}

            <p style={{ textAlign: 'center', fontSize: 14, color: '#7a7268', margin: 0 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#0f0f0d', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export default Signup;
