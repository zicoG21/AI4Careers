import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const sectionTitle = {
  fontSize: 15,
  fontWeight: 700,
  color: '#0f0f0d',
  margin: '18px 0 8px',
};

const paragraph = {
  fontSize: 14,
  lineHeight: 1.7,
  color: '#5c574f',
  margin: '0 0 12px',
};

function EulaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signupDraft = location.state?.signupDraft || null;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', padding: '40px 16px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', background: '#ede8dc', border: '1px solid #d4caba', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ padding: '28px 28px 0' }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9288', fontWeight: 700 }}>
            Legal
          </p>
          <h1 style={{ margin: '8px 0 4px', fontSize: 30, fontWeight: 700, color: '#0f0f0d' }}>
            End User License Agreement (EULA)
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#7a7268' }}>
            Last Updated: April 13, 2026
          </p>
        </div>

        <div style={{ padding: '24px 28px 32px' }}>
          <p style={{ ...paragraph, fontWeight: 600, color: '#1a1a18' }}>
            PLEASE READ THIS AGREEMENT CAREFULLY BEFORE USING THIS SOFTWARE.
          </p>
          <p style={paragraph}>
            By accessing or using this software ("the Service"), you agree to be bound by the terms of this End User License Agreement. If you do not agree, do not use the Service.
          </p>

          <h2 style={sectionTitle}>Educational Context</h2>
          <p style={paragraph}>
            This software was developed by students as part of an academic course at the University of Michigan. It is provided for demonstration and educational purposes only and may not meet the standards of commercially released software.
          </p>

          <h2 style={sectionTitle}>Use at Your Own Risk</h2>
          <p style={paragraph}>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, RELIABILITY, OR NON-INFRINGEMENT. YOUR USE OF THE SERVICE IS SOLELY AT YOUR OWN RISK.
          </p>

          <h2 style={sectionTitle}>Limitation of Liability</h2>
          <p style={paragraph}>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, NEITHER THE STUDENT DEVELOPERS, THE UNIVERSITY OF MICHIGAN, ITS FACULTY, INSTRUCTORS, REGENTS, EMPLOYEES, NOR ANY AFFILIATED PARTIES SHALL BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF — OR INABILITY TO USE — THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p style={paragraph}>
            THIS INCLUDES, WITHOUT LIMITATION, LOSS OF DATA, REVENUE, PROFITS, OR BUSINESS.
          </p>

          <h2 style={sectionTitle}>No Guarantees of Availability</h2>
          <p style={paragraph}>
            The Service may be discontinued, modified, or taken offline at any time without notice. No guarantee of uptime, continued access, or future development is made.
          </p>

          <h2 style={sectionTitle}>Data</h2>
          <p style={paragraph}>
            Do not submit sensitive, confidential, or personal data to this Service. The student developers make no guarantees regarding data security, storage, or privacy.
          </p>

          <h2 style={sectionTitle}>Indemnification</h2>
          <p style={paragraph}>
            You agree to indemnify and hold harmless the student developers, the University of Michigan, its faculty, instructors, and Regents from any claims, damages, or expenses arising from your use of the Service or your violation of this Agreement.
          </p>

          <h2 style={sectionTitle}>Governing Law</h2>
          <p style={paragraph}>
            This Agreement shall be governed by the laws of the State of Michigan, without regard to conflict of law principles. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Washtenaw County, Michigan.
          </p>

          <h2 style={sectionTitle}>Acceptance</h2>
          <p style={paragraph}>
            By using the Service, you acknowledge that you have read, understood, and agree to be bound by this Agreement.
          </p>

          <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid #d4caba', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ ...paragraph, margin: 0 }}>
              You can return to sign up once you are ready to consent.
            </p>
            <button
              type="button"
              onClick={() => navigate('/signup', { state: { signupDraft } })}
              style={{ padding: '10px 16px', borderRadius: 10, background: '#1a1a18', color: '#f5f0e8', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}
            >
              Back to Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EulaPage;
