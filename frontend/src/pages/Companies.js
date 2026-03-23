import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { listCompanies, getCompany, saveCompany, unsaveCompany, listSavedCompanies, generateElevatorPitch, savePitch } from '../services/api';

const EVENT_ID = 'evt_umich_fall_2025';

function sponsorSummary(sponsorship) {
  if (!sponsorship || sponsorship.length === 0) return { label: 'Unknown', color: '#a0aec0' };
  const text = sponsorship.join(' ').toLowerCase();
  if (text.includes('will not require')) return { label: 'No Sponsorship', color: '#e53e3e' };
  if (text.includes('immediate') || text.includes('opt') || text.includes('cpt')) return { label: 'Sponsors Visas', color: '#38a169' };
  return { label: 'Check Details', color: '#dd6b20' };
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: '999px', fontSize: '0.82rem', cursor: 'pointer',
        border: active ? '2px solid #667eea' : '2px solid #e2e8f0',
        background: active ? '#667eea' : '#fff',
        color: active ? '#fff' : '#4a5568',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s',
      }}
    >{label}</button>
  );
}

function CompanyCard({ company, isSaved, onSaveToggle, onClick }) {
  const sponsor = sponsorSummary(company.sponsorship);
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
        padding: '16px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s',
        display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <button
        onClick={e => { e.stopPropagation(); onSaveToggle(company); }}
        title={isSaved ? 'Unsave' : 'Save'}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'none', border: 'none', cursor: 'pointer',
          width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', lineHeight: 1, padding: 0,
          color: isSaved ? '#e53e3e' : '#cbd5e0',
        }}
      >♥</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '28px' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', color: '#1a202c' }}>{company.name}</h4>
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
          background: sponsor.color + '18', color: sponsor.color, border: `1px solid ${sponsor.color}44`,
          whiteSpace: 'nowrap', marginLeft: '8px',
        }}>{sponsor.label}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {company.positions?.map(p => (
          <span key={p} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8' }}>{p}</span>
        ))}
        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: '#f0fff4', color: '#276749', border: '1px solid #c6f6d5' }}>{company.is_multi_day ? 'Mon & Tue' : company.fair_day}</span>
      </div>

      {company.regions?.length > 0 && (
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#718096' }}>{company.regions.join(' · ')}</p>
      )}

      <p style={{
        margin: 0, fontSize: '0.78rem', color: '#4a5568',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{company.description}</p>
    </div>
  );
}

function CompanyModal({ company, onClose, isSaved, onSaveToggle, savedPitch, onPitchSaved, token }) {
  const sponsor = sponsorSummary(company.sponsorship);
  const [pitchDraft, setPitchDraft] = useState('');
  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchError, setPitchError] = useState('');
  const [pitchConfirmed, setPitchConfirmed] = useState(false);

  const handleGeneratePitch = async () => {
    setPitchLoading(true);
    setPitchError('');
    setPitchDraft('');
    setPitchConfirmed(false);
    const result = await generateElevatorPitch(token, company.company_id, EVENT_ID);
    if (result.error) {
      setPitchError(result.error === 'no_resume' ? 'Please upload a resume first.' : (result.details || 'Failed to generate pitch.'));
    } else {
      setPitchDraft(result.pitch || '');
    }
    setPitchLoading(false);
  };

  const handleConfirmPitch = async () => {
    await savePitch(token, company.company_id, EVENT_ID, pitchDraft);
    if (!isSaved) onSaveToggle(company);
    setPitchConfirmed(true);
    onPitchSaved(company.company_id, pitchDraft);
  };

  const activePitch = pitchConfirmed ? pitchDraft : (savedPitch || '');

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '14px', maxWidth: '620px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Sticky header — always visible */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{company.name}</h2>
            <button
              onClick={() => onSaveToggle(company)}
              title={isSaved ? 'Unsave' : 'Save'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: isSaved ? '#e53e3e' : '#cbd5e0', padding: 0 }}
            >♥</button>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', color: '#718096', lineHeight: 1 }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 28px', flex: 1 }}>

        <span style={{
          display: 'inline-block', fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px',
          borderRadius: '999px', background: sponsor.color + '18', color: sponsor.color,
          border: `1px solid ${sponsor.color}44`, marginBottom: '16px',
        }}>{sponsor.label}</span>

        {/* Position / Day pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {company.positions?.map(p => (
            <span key={p} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '999px', background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8' }}>{p}</span>
          ))}
          <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '999px', background: '#f0fff4', color: '#276749', border: '1px solid #c6f6d5' }}>{company.is_multi_day ? 'Mon & Tue' : company.fair_day}</span>
        </div>

        <p style={{ color: '#4a5568', lineHeight: 1.6, marginBottom: '16px' }}>{company.description}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginBottom: '20px' }}>
          {company.regions?.length > 0 && (
            <div><strong>Regions</strong><p style={{ margin: '4px 0', color: '#718096' }}>{company.regions.join(', ')}</p></div>
          )}
          {company.degree_levels?.length > 0 && (
            <div><strong>Degree Levels</strong><p style={{ margin: '4px 0', color: '#718096' }}>{company.degree_levels.join(', ')}</p></div>
          )}
          {company.sponsorship?.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Sponsorship Details</strong>
              <p style={{ margin: '4px 0', color: '#718096' }}>{company.sponsorship.join('; ')}</p>
            </div>
          )}
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 18px', borderRadius: '8px', width: 'auto' }}>Website</a>
          )}
          {company.careers_url && (
            <a href={company.careers_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ textDecoration: 'none', padding: '8px 18px', borderRadius: '8px', width: 'auto' }}>Careers Page</a>
          )}
        </div>

        {/* Elevator Pitch Section */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <strong style={{ fontSize: '0.95rem' }}>Elevator Pitch</strong>
            <button
              onClick={handleGeneratePitch}
              disabled={pitchLoading}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem', width: 'auto' }}
            >{pitchLoading ? 'Generating...' : pitchDraft ? 'Regenerate' : 'Generate Pitch'}</button>
          </div>

          {pitchError && <p style={{ color: '#e53e3e', fontSize: '0.85rem' }}>{pitchError}</p>}

          {/* Saved pitch (if no active draft) */}
          {!pitchDraft && activePitch && (
            <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px', padding: '14px' }}>
              <p style={{ fontSize: '0.75rem', color: '#276749', fontWeight: 600, marginBottom: '8px' }}>✓ Saved Pitch</p>
              <div className="chat-markdown" style={{ fontSize: '0.85rem' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activePitch}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Draft pitch */}
          {pitchDraft && (
            <div>
              <div style={{ background: '#fffbeb', border: '1px solid #fbd38d', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                <p style={{ fontSize: '0.75rem', color: '#b7791f', fontWeight: 600, marginBottom: '8px' }}>Draft — review before saving</p>
                <div className="chat-markdown" style={{ fontSize: '0.85rem' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{pitchDraft}</ReactMarkdown>
                </div>
              </div>
              {!pitchConfirmed ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleConfirmPitch} className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }}>
                    ✓ Confirm & Save Pitch
                  </button>
                  <button onClick={handleGeneratePitch} className="btn-secondary" style={{ width: 'auto', padding: '8px 18px' }}>
                    Regenerate
                  </button>
                </div>
              ) : (
                <p style={{ color: '#38a169', fontWeight: 600, fontSize: '0.88rem' }}>✓ Pitch saved to your saved companies!</p>
              )}
            </div>
          )}

          {!pitchDraft && !activePitch && !pitchLoading && (
            <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>Click "Generate Pitch" to create a personalized elevator pitch for this company based on your resume.</p>
          )}
        </div>
        </div> {/* end scrollable body */}
      </div>
    </div>
  );
}

function Companies() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [companies, setCompanies] = useState([]);
  const [savedMap, setSavedMap] = useState({}); // company_id -> { pitch }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Filters — all multi-select (empty = show all)
  const [filterDays, setFilterDays] = useState([]);
  const [filterSponsorships, setFilterSponsorships] = useState([]);
  const [filterPositions, setFilterPositions] = useState([]);
  const [filterRegions, setFilterRegions] = useState([]);

  useEffect(() => {
    listCompanies({ event_id: EVENT_ID, fair_day: '', position_type: '', sponsors: '', region: '', major_search: '' })
      .then(data => {
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => a.name.localeCompare(b.name));
        setCompanies(sorted);
      })
      .catch(() => setError('Failed to load companies.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    listSavedCompanies(token, EVENT_ID).then(data => {
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(item => { map[item.company_id] = { pitch: item.pitch }; });
        setSavedMap(map);
      }
    });
  }, [token]);

  const handleSaveToggle = useCallback(async (company) => {
    const isSaved = !!savedMap[company.company_id];
    if (isSaved) {
      await unsaveCompany(token, company.company_id, EVENT_ID);
      setSavedMap(prev => { const next = { ...prev }; delete next[company.company_id]; return next; });
    } else {
      await saveCompany(token, company.company_id, EVENT_ID);
      setSavedMap(prev => ({ ...prev, [company.company_id]: { pitch: '' } }));
    }
  }, [savedMap, token]);

  const handlePitchSaved = useCallback((company_id, pitch) => {
    setSavedMap(prev => ({ ...prev, [company_id]: { pitch } }));
  }, []);

  const handleCompanyClick = async (company) => {
    setModalLoading(true);
    setError('');
    try {
      const detail = await getCompany(EVENT_ID, company.company_id);
      if (detail.error) throw new Error(detail.error);
      setSelected(detail);
    } catch {
      setError('Failed to load company details.');
    } finally {
      setModalLoading(false);
    }
  };

  const allPositions = useMemo(() => {
    const set = new Set();
    companies.forEach(c => c.positions?.forEach(p => set.add(p)));
    return Array.from(set).sort();
  }, [companies]);

  const allRegions = useMemo(() => {
    const set = new Set();
    companies.forEach(c => c.regions?.forEach(r => set.add(r)));
    return ['All', ...Array.from(set).sort()];
  }, [companies]);

  const hasActiveFilters = filterDays.length > 0 || filterSponsorships.length > 0 || filterPositions.length > 0 || filterRegions.length > 0 || search !== '';

  const clearFilters = () => {
    setFilterDays([]);
    setFilterSponsorships([]);
    setFilterPositions([]);
    setFilterRegions([]);
    setSearch('');
  };

  const toggle = (setter) => (val) => setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const filtered = useMemo(() => {
    let result = showSaved ? companies.filter(c => !!savedMap[c.company_id]) : companies;

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.positions?.some(p => p.toLowerCase().includes(q)) ||
        c.regions?.some(r => r.toLowerCase().includes(q)) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    if (filterDays.length > 0) {
      result = result.filter(c => filterDays.includes(c.fair_day) || c.is_multi_day);
    }
    if (filterSponsorships.length > 0) {
      result = result.filter(c => {
        const s = sponsorSummary(c.sponsorship);
        return filterSponsorships.includes(s.label);
      });
    }
    if (filterPositions.length > 0) {
      result = result.filter(c => filterPositions.some(fp => c.positions?.includes(fp)));
    }
    if (filterRegions.length > 0) {
      result = result.filter(c => filterRegions.some(fr => c.regions?.includes(fr)));
    }
    return result;
  }, [companies, search, savedMap, showSaved, filterDays, filterSponsorships, filterPositions, filterRegions]);

  const savedCount = Object.keys(savedMap).length;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ marginBottom: '4px' }}>UMich Fall 2025 Career Fair</h1>
            <p style={{ color: '#718096', margin: 0 }}>{companies.length} companies · Sept 22–23, 2025</p>
          </div>
        </div>

        {/* Saved / All tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <FilterChip label="All Companies" active={!showSaved} onClick={() => setShowSaved(false)} />
          <FilterChip label={`Saved (${savedCount})`} active={showSaved} onClick={() => setShowSaved(true)} />
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by company name, position, region..."
          style={{
            width: '100%', padding: '10px 16px', fontSize: '0.95rem',
            border: '1px solid #e2e8f0', borderRadius: '8px',
            marginBottom: '12px', boxSizing: 'border-box', outline: 'none',
          }}
        />

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 600, minWidth: '90px' }}>Day:</span>
            {['Monday', 'Tuesday'].map(d => (
              <FilterChip key={d} label={d} active={filterDays.includes(d)} onClick={() => toggle(setFilterDays)(d)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 600, minWidth: '90px' }}>Sponsorship:</span>
            {['Sponsors Visas', 'No Sponsorship', 'Check Details'].map(s => (
              <FilterChip key={s} label={s} active={filterSponsorships.includes(s)} onClick={() => toggle(setFilterSponsorships)(s)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 600, minWidth: '90px' }}>Position:</span>
            {allPositions.map(p => (
              <FilterChip key={p} label={p} active={filterPositions.includes(p)} onClick={() => toggle(setFilterPositions)(p)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 600, minWidth: '90px' }}>Region:</span>
            {allRegions.filter(r => r !== 'All').map(r => (
              <FilterChip key={r} label={r} active={filterRegions.includes(r)} onClick={() => toggle(setFilterRegions)(r)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 600, minWidth: '90px' }}>Sort:</span>
            <FilterChip label="A–Z" active={true} onClick={() => {}} />
            <button disabled style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '0.82rem', border: '2px solid #e2e8f0', background: '#f7f7f7', color: '#a0aec0', cursor: 'not-allowed' }} title="Coming soon">Fit Score</button>
            {hasActiveFilters && (
              <button onClick={clearFilters} style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '0.82rem', border: '2px solid #e53e3e', background: '#fff', color: '#e53e3e', cursor: 'pointer', fontWeight: 600 }}>
                ✕ Clear Filters
              </button>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p>Loading companies...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#888' }}>{showSaved ? 'No saved companies yet.' : 'No companies match your search.'}</p>
        ) : (
          <>
            <p style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '12px' }}>
              {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}{search ? ` matching "${search}"` : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {filtered.map(c => (
                <CompanyCard
                  key={c.company_id}
                  company={c}
                  isSaved={!!savedMap[c.company_id]}
                  onSaveToggle={handleSaveToggle}
                  onClick={() => handleCompanyClick(c)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {modalLoading && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}>
          Loading company details...
        </div>
      )}

      {selected && (
        <CompanyModal
          company={selected}
          onClose={() => setSelected(null)}
          isSaved={!!savedMap[selected.company_id]}
          onSaveToggle={handleSaveToggle}
          savedPitch={savedMap[selected.company_id]?.pitch || ''}
          onPitchSaved={handlePitchSaved}
          token={token}
        />
      )}
    </div>
  );
}

export default Companies;
