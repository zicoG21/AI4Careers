import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Briefcase, MessageSquare, LogOut,
  Building2, Bot, User, Home,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/resume-lab', label: 'Resume Lab', icon: FileText },
  { to: '/experiences', label: 'Experiences', icon: Briefcase },
  { to: '/bq', label: 'BQ Prep', icon: MessageSquare },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/chat', label: 'AI Chat', icon: Bot },
  { to: '/profile', label: 'Profile', icon: User },
];

const STORAGE_KEY = 'layout_nav_width';
const DEFAULT_NAV_W = 240;
const MIN_NAV_W = 180;
const MAX_NAV_W = 380;

export function ResizeHandle({ onDrag, style: extraStyle }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(ev) {
      if (!dragging.current) return;
      const dx = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onDrag(dx);
    }
    function onUp() {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onDrag]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      style={{
        width: 6,
        flexShrink: 0,
        cursor: 'col-resize',
        background: 'transparent',
        position: 'relative',
        zIndex: 5,
        ...extraStyle,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 2,
        width: 2,
        borderRadius: 1,
        background: 'transparent',
        transition: 'background 0.15s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      />
    </div>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [navW, setNavW] = useState(() => {
    try { const v = parseInt(localStorage.getItem(STORAGE_KEY)); return (v >= MIN_NAV_W && v <= MAX_NAV_W) ? v : DEFAULT_NAV_W; }
    catch { return DEFAULT_NAV_W; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(navW)); } catch { /* noop */ }
  }, [navW]);

  const handleNavDrag = useCallback((dx) => {
    setNavW((w) => Math.min(MAX_NAV_W, Math.max(MIN_NAV_W, w + dx)));
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'stretch', padding: 12, background: '#f5f0e8', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', borderRadius: 12, border: '1px solid #d4caba' }}>

        {/* Sidebar */}
        <aside style={{ width: navW, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#ede8dc', borderRight: '1px solid #d4caba' }}>

          {/* Brand */}
          <div style={{ padding: '24px 20px', borderBottom: '1px solid #d4caba' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/logo.png" alt="AI4Careers" style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f0f0d', lineHeight: 1.2, margin: 0, whiteSpace: 'nowrap' }}>AI4Careers</p>
                <p style={{ fontSize: 10, color: '#9a9288', lineHeight: 1.2, marginTop: 2, whiteSpace: 'nowrap' }}>Career Toolkit</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '20px 12px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || location.pathname.startsWith(to + '/');
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 8, fontSize: 14,
                    fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s',
                    whiteSpace: 'nowrap', overflow: 'hidden',
                    ...(active
                      ? { background: 'rgba(0,0,0,0.07)', color: '#0f0f0d', border: '1px solid rgba(0,0,0,0.08)' }
                      : { color: '#7a7268', border: '1px solid transparent' }),
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = '#0f0f0d'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = '#7a7268'; e.currentTarget.style.background = 'transparent'; } }}
                >
                  <Icon size={16} style={{ color: active ? '#0f0f0d' : '#9a9288', flexShrink: 0 }} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Sign out */}
          <div style={{ padding: '12px', borderTop: '1px solid #d4caba' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 8, fontSize: 14,
                fontWeight: 500, cursor: 'pointer', border: '1px solid transparent',
                background: 'transparent', color: '#7a7268', transition: 'all 0.15s',
                whiteSpace: 'nowrap', overflow: 'hidden',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0f0f0d'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7a7268'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={16} style={{ flexShrink: 0 }} />
              Sign out
            </button>
          </div>
        </aside>

        <ResizeHandle onDrag={handleNavDrag} />

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f5f0e8' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
