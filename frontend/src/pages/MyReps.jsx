import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RepresentativeCard from '../components/RepresentativeCard';
import { lookupZip, getErrorMessage } from '../services/api';

export default function MyReps() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    // Try session storage first (fast, set by ZipLookup page)
    const stored = sessionStorage.getItem('votemap_lookup');
    if (stored) {
      try {
        setData(JSON.parse(stored));
        setLoading(false);
        return;
      } catch {}
    }
    // Fallback: if someone navigates directly, send them to home
    navigate('/');
  }, []);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} onRetry={() => navigate('/')} />;
  if (!data)   return null;

  const { zip, city, state, representatives = [], pendingAnalysis = [] } = data;

  // Group by level
  const federal = representatives.filter(r => r.level === 'federal');
  const stateReps = representatives.filter(r => r.level === 'state');

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

      {/* Header */}
      <header className="animate-fade-up" style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
        }}>
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            ZIP {zip}
          </span>
          {city && state && (
            <>
              <span style={{ color: 'var(--border-med)', fontSize: 11 }}>·</span>
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                color: 'var(--text-3)', letterSpacing: '0.05em',
              }}>
                {city}, {state}
              </span>
            </>
          )}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
          fontWeight: 900, letterSpacing: '-0.02em',
          lineHeight: 1.1, marginBottom: '0.75rem',
        }}>
          Your Representatives
        </h1>

        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {representatives.length} elected officials represent you.
          {pendingAnalysis.length > 0 &&
            ` Bias analysis is available — click "Run bias analysis" on any card.`}
        </p>

        {/* Legend */}
        <div style={{
          display: 'flex', gap: '1.25rem', marginTop: '1rem', flexWrap: 'wrap',
        }}>
          {[
            { color: 'var(--green)', label: 'High confidence' },
            { color: 'var(--amber)', label: 'Medium confidence' },
            { color: 'var(--text-3)', label: 'Low confidence' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: l.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                {l.label}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 3, background: 'var(--blue)', borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              Votes for issue
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 3, background: 'var(--red)', borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              Votes against issue
            </span>
          </div>
        </div>
      </header>

      {/* Federal reps */}
      {federal.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionLabel>Federal — Congress</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {federal.map((rep, i) => (
              <RepresentativeCard key={rep.bioguideId || rep.name} rep={rep} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* State reps */}
      {stateReps.length > 0 && (
        <section>
          <SectionLabel>State — Legislature</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stateReps.map((rep, i) => (
              <RepresentativeCard key={rep.name} rep={rep} index={federal.length + i} />
            ))}
          </div>
        </section>
      )}

      {representatives.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '4rem 0',
          color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 13,
        }}>
          No representatives found for this ZIP. Try a different ZIP code.
        </div>
      )}

      {/* Data note */}
      <footer style={{
        marginTop: '3rem', paddingTop: '1.5rem',
        borderTop: '1px solid var(--border)',
        display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          Vote data from ProPublica Congress API · Representatives via Google Civic · Analysis by Claude AI
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          Federal votes only · Updates nightly
        </p>
      </footer>
    </main>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem',
    }}>
      <span style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        color: 'var(--text-3)', letterSpacing: '0.12em',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '4rem 1.5rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--text-3)', margin: '0 auto 1.5rem',
        animation: 'pulse 1.2s ease infinite',
      }} />
      <p style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        Finding your representatives…
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '4rem 1.5rem',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: 14, color: 'var(--red)', marginBottom: '1rem' }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          fontSize: 13, fontFamily: 'var(--font-mono)',
          color: 'var(--text-2)', border: '1px solid var(--border-med)',
          borderRadius: 'var(--radius)', padding: '8px 18px',
        }}
      >
        Try again
      </button>
    </div>
  );
}
