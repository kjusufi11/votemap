import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RepresentativeCard from '../components/RepresentativeCard';
import { getAlignment, getSurvey } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function MyReps() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [alignment, setAlignment] = useState({});
  const [surveyImportance, setSurveyImportance] = useState(undefined);

  useEffect(() => {
    const raw = sessionStorage.getItem('votemap_lookup') || localStorage.getItem('votemap_lookup');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.zip) {
          sessionStorage.setItem('votemap_lookup', raw); // warm sessionStorage for other pages
          setData(parsed);
          return;
        }
      } catch {}
    }
    navigate('/');
  }, []);

  // Fetch alignment scores when data and user are available
  useEffect(() => {
    if (!data || !user) return;
    const ids = data.representatives
      ?.filter(r => r.bioguideId)
      .map(r => r.bioguideId) || [];
    if (ids.length === 0) return;
    getAlignment(user.id, ids).then(setAlignment).catch(() => {});
  }, [data, user]);

  // Load user survey importance for personalized rep cards
  useEffect(() => {
    if (!user) { setSurveyImportance(null); return; }
    getSurvey(user.id)
      .then(d => setSurveyImportance(d?.importance || {}))
      .catch(() => setSurveyImportance({}));
  }, [user]);

  if (!data) return <LoadingState />;

  const { zip, city, state, representatives = [] } = data;
  const federal = representatives.filter(r => r.level === 'federal');
  const stateReps = representatives.filter(r => r.level === 'state');

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

      <header className="animate-fade-up" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '.07em' }}>ZIP {zip}</span>
          {city && state && <>
            <span style={{ color: 'var(--border-med)', fontSize: 11 }}>·</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{city}, {state}</span>
          </>}
          <button
            onClick={() => {
              sessionStorage.removeItem('votemap_lookup');
              navigate('/');
            }}
            style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
              background: 'none', border: '1px solid var(--border)', borderRadius: 3,
              padding: '2px 7px', cursor: 'pointer', letterSpacing: '.05em',
            }}
          >
            Change ZIP
          </button>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.9rem, 4vw, 2.9rem)',
          fontWeight: 900, letterSpacing: '-.022em', lineHeight: 1.06, marginBottom: '.625rem',
        }}>Your Representatives</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {representatives.length} elected officials represent you.
        </p>

        {/* Legend */}
        <div style={{
          display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '.75rem 1.125rem',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)',
        }}>
          {[
            { type: 'dot', color: 'var(--green)', label: 'High confidence' },
            { type: 'dot', color: 'var(--amber)', label: 'Medium confidence' },
            { type: 'dot', color: 'var(--text-3)', label: 'Low confidence' },
            { type: 'bar', color: 'var(--blue)', label: 'Votes for issue' },
            { type: 'bar', color: 'var(--red)', label: 'Votes against' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {l.type === 'dot'
                ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                : <span style={{ width: 16, height: 3, borderRadius: 2, background: l.color, flexShrink: 0 }} />
              }
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </header>

      {federal.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionLabel>Federal — U.S. Congress</SectionLabel>
          {federal.map((rep, i) => <RepresentativeCard key={rep.bioguideId || rep.name} rep={rep} index={i} alignment={alignment[rep.bioguideId]} surveyImportance={surveyImportance} />)}
        </section>
      )}

      {stateReps.length > 0 && (
        <section>
          <SectionLabel>State Legislature</SectionLabel>
          {stateReps.map((rep, i) => <RepresentativeCard key={rep.name} rep={rep} index={federal.length + i} surveyImportance={surveyImportance} />)}
        </section>
      )}

      {representatives.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          No representatives found for this ZIP.
        </div>
      )}

      {/* Social share — shown when alignment scores are loaded */}
      {Object.values(alignment).some(s => s?.score != null) && (
        <ShareMatchButton alignment={alignment} representatives={federal} />
      )}

      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Vote data: ProPublica · Reps: Google Civic · Analysis: Claude AI</p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Federal votes only · Updates nightly</p>
      </footer>
    </main>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function ShareMatchButton({ alignment, representatives }) {
  const [open, setOpen]       = useState(false);
  const [copied, setCopied]   = useState(false);
  const menuRef               = useRef(null);

  const scores = representatives
    .filter(r => alignment[r.bioguideId]?.score != null)
    .map(r => ({ name: r.name?.split(', ').reverse().join(' ') || r.name, score: alignment[r.bioguideId].score, id: r.bioguideId }))
    .sort((a, b) => b.score - a.score);

  if (!scores.length) return null;

  const best  = scores[0];
  const worst = scores[scores.length - 1];

  const shareText = scores.length === 1
    ? `I just found out ${best.name} is ${best.score}% aligned with my values on VoteMatch. How does your rep stack up?`
    : `My reps: ${best.name} is ${best.score}% aligned with my values, ${worst.name} is ${worst.score}%. See how yours vote → votematch.app`;

  const appUrl    = 'https://votematch.app';
  const encoded   = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(appUrl);

  const platforms = [
    {
      id: 'x',
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?text=${encoded}&url=${encodedUrl}&via=votematch`,
      icon: (
        <svg width="14" height="12" viewBox="0 0 15 13" fill="currentColor"><path d="M14.2 0h-2.7L8.5 4.6 5.4 0H0l5.5 7.6L0 13h2.7l3.4-4.9L9.6 13H15l-5.7-7.7L14.2 0zm-3.7 12L1.8 1h2l8.7 11h-2z"/></svg>
      ),
    },
    {
      id: 'facebook',
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encoded}`,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
      ),
    },
    {
      id: 'linkedin',
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encoded}`,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      ),
    },
    {
      id: 'whatsapp',
      label: 'Share on WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + appUrl)}`,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      ),
    },
    {
      id: 'copy',
      label: copied ? 'Copied!' : 'Copy link',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(`${shareText}\n${appUrl}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      },
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
      ),
    },
  ];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div style={{
      marginTop: '2rem', padding: '1.25rem 1.5rem',
      background: 'var(--bg-2)', border: '1px solid var(--border-med)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
    }}>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Share your match scores</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
          Let people know how your representatives are voting
        </p>
      </div>

      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            height: 38, padding: '0 1.25rem', display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--text)', color: 'var(--bg-2)',
            borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
            border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Share scores
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 7L1 3h8z"/>
          </svg>
        </button>

        {open && (
          <div style={{
            position: 'absolute', right: 0, bottom: 'calc(100% + 8px)',
            background: 'var(--bg-2)', border: '1px solid var(--border-med)',
            borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            minWidth: 200, zIndex: 50, overflow: 'hidden',
          }}>
            {platforms.map(p => {
              const style = {
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', fontSize: 13, color: 'var(--text)',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                textDecoration: 'none', transition: 'background var(--transition)',
              };
              const hoverStyle = { background: 'var(--bg-3)' };
              const inner = (
                <>
                  <span style={{ color: 'var(--text-2)', flexShrink: 0 }}>{p.icon}</span>
                  {p.label}
                </>
              );
              return p.href ? (
                <a key={p.id} href={p.href} target="_blank" rel="noopener noreferrer"
                  style={style}
                  onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  onClick={() => setOpen(false)}
                >{inner}</a>
              ) : (
                <button key={p.id} style={style}
                  onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  onClick={() => { p.onClick(); }}
                >{inner}</button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '5rem 1.5rem', textAlign: 'center' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-3)', margin: '0 auto 1.5rem', animation: 'pulse 1.2s ease infinite' }} />
      <p style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Finding your representatives…</p>
    </div>
  );
}
