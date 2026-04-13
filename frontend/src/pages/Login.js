import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const INPUT = {
  background: '#f8f4ec', border: '1px solid #d4caba', color: '#0f0f0d',
  width: '100%', borderRadius: 10, padding: '14px 16px', fontSize: 15,
  fontFamily: 'inherit', fontWeight: 450,
  outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
};
const onFocus = (e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)'; };
const onBlur = (e) => { e.currentTarget.style.borderColor = '#d4caba'; };

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid credentials');
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
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f0f0d', margin: 0 }}>Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                style={INPUT} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9288' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                style={INPUT} onFocus={onFocus} onBlur={onBlur} />
            </div>

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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 14, color: '#7a7268', margin: 0 }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#0f0f0d', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
            </p>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export default Login;
