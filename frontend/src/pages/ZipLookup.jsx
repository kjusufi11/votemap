import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lookupZip, getErrorMessage } from '../services/api';

const EXAMPLES = ['10001', '90210', '60601', '77001', '02101'];

export default function ZipLookup() {
  const [zip, setZip]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const navigate            = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const clean = zip.trim().replace(/\D/g, '').slice(0, 5);
    if (clean.length !== 5) {
      setError('Enter a valid 5-digit ZIP code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await lookupZip(clean);
      // Store result in sessionStorage so MyReps page can use it immediately
      sessionStorage.setItem('votemap_lookup', JSON.stringify({ zip: clean, ...data }));
      navigate('/reps');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleExample(z) {
    setZip(z);
    setError('');
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column' }}>

      {/* Hero */}
      <section style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '4rem 1.5rem',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Background grid texture */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%',
          transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: 'radial-gradient(ellipse, rgba(229,72,58,0.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, width: '100%', textAlign: 'center' }}>

          <div className="animate-fade-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase',
            border: '1px solid var(--border)', borderRadius: 20,
            padding: '5px 14px', marginBottom: '2rem',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)', animation: 'pulse 2s ease infinite',
            }} />
            Powered by ProPublica · Claude AI
          </div>

          <h1 className="animate-fade-up delay-1" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: '1.25rem',
          }}>
            Who really represents you?
          </h1>

          <p className="animate-fade-up delay-2" style={{
            fontSize: 18, color: 'var(--text-2)',
            lineHeight: 1.65, maxWidth: 500, margin: '0 auto 3rem',
            fontWeight: 300,
          }}>
            Enter your ZIP code to see your elected officials — federal and state —
            and how AI analyzes their real voting patterns.
          </p>

          {/* ZIP Form */}
          <form
            onSubmit={handleSubmit}
            className="animate-fade-up delay-3"
            style={{
              display: 'flex', gap: 10, maxWidth: 420, margin: '0 auto',
              flexWrap: 'wrap', justifyContent: 'center',
            }}
          >
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                placeholder="Enter ZIP code"
                value={zip}
                onChange={e => { setZip(e.target.value.replace(/\D/g, '')); setError(''); }}
                autoFocus
                style={{
                  width: '100%',
                  background: 'var(--bg-3)',
                  border: `1px solid ${error ? 'var(--red)' : 'var(--border-med)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '0 1.25rem',
                  height: 52,
                  fontSize: 20,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em',
                  outline: 'none',
                  transition: 'border-color var(--transition)',
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = 'var(--border-hi)'; }}
                onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border-med)'; }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || zip.length < 5}
              style={{
                height: 52, padding: '0 1.75rem',
                background: loading ? 'var(--bg-4)' : 'var(--text)',
                color: 'var(--bg)',
                borderRadius: 'var(--radius)',
                fontSize: 14, fontWeight: 500,
                transition: 'all var(--transition)',
                opacity: (loading || zip.length < 5) ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Looking up…' : 'See my reps →'}
            </button>
          </form>

          {error && (
            <p style={{
              marginTop: '1rem', fontSize: 13,
              color: 'var(--red)', fontFamily: 'var(--font-mono)',
            }}>
              {error}
            </p>
          )}

          {/* Example ZIPs */}
          <div className="animate-fade-up delay-4" style={{
            marginTop: '2.5rem',
            display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              Try:
            </span>
            {EXAMPLES.map(z => (
              <button
                key={z}
                onClick={() => handleExample(z)}
                style={{
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 4, padding: '3px 10px',
                  transition: 'all var(--transition)',
                }}
                onMouseEnter={e => {
                  e.target.style.color = 'var(--text-2)';
                  e.target.style.borderColor = 'var(--border-med)';
                }}
                onMouseLeave={e => {
                  e.target.style.color = 'var(--text-3)';
                  e.target.style.borderColor = 'var(--border)';
                }}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-2)',
        padding: '3rem 1.5rem',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2rem',
        }}>
          {[
            {
              icon: '◎',
              title: 'Your exact representatives',
              desc: 'Federal and state officials tied to your specific address — not just your state.',
            },
            {
              icon: '↗',
              title: 'Real vote records',
              desc: 'Every roll call vote from the current Congress, pulled live from ProPublica.',
            },
            {
              icon: '◈',
              title: 'AI bias analysis',
              desc: 'Claude reads 200+ votes and surfaces ideological patterns the data reveals.',
            },
            {
              icon: '◉',
              title: 'Plain language',
              desc: '"Votes against gun control 91% of the time" — not political jargon.',
            },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span style={{
                fontSize: 20, color: 'var(--text-3)',
                lineHeight: 1, marginTop: 2, flexShrink: 0,
              }}>
                {f.icon}
              </span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{f.title}</p>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
