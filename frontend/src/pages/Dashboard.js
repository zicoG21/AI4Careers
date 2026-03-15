import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-brand">
          <h2>AI4Careers</h2>
        </div>
        <div className="nav-links">
          <span className="user-name">Hello, {user.name}</span>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Welcome back, {user.name}!</h1>
          <p>Your career fair assistant is ready to help you succeed.</p>
        </div>

        <div className="dashboard-grid">
          <div className="card">
            <h3>Profile</h3>
            <p><strong>Email:</strong> {user.email || 'Not set'}</p>
            <p><strong>User ID:</strong> {user.user_id}</p>
            {user.preferences && (
              <>
                <h4>Preferences</h4>
                <p><strong>Needs Sponsorship:</strong> {user.preferences.needs_sponsorship ? 'Yes' : 'No'}</p>
                <p><strong>Work Authorization:</strong> {user.preferences.work_authorization || 'Not set'}</p>
                <p><strong>Preferred Locations:</strong> {user.preferences.preferred_locations?.join(', ') || 'Not set'}</p>
                <p><strong>Work Modes:</strong> {user.preferences.work_modes?.join(', ') || 'Not set'}</p>
                <p><strong>Role Types:</strong> {user.preferences.role_types?.join(', ') || 'Not set'}</p>
              </>
            )}
          </div>

          <div className="card">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button className="btn-action" onClick={() => navigate('/resume-upload')}> Upload Resume</button>
              <button className="btn-action">Browse Companies</button>
              <button className="btn-action">View Career Fairs</button>
              <button className="btn-action">Update Preferences</button>
            </div>
          </div>

          <div className="card">
            <h3>Getting Started</h3>
            <ul className="checklist">
              <li>✓ Create your account</li>
              <li>⃝ Upload your resume</li>
              <li>⃝ Set your preferences</li>
              <li>⃝ Browse career fair companies</li>
              <li>⃝ Get your fit scores</li>
            </ul>
          </div>
        </div>
      </div>
    </div >
  );
}

export default Dashboard;
