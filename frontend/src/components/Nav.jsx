import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Nav() {
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(10,10,11,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '0 1.5rem',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--red)', display: 'inline-block',
          }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
            letterSpacing: '-0.01em', color: 'var(--text)',
          }}>VoteMap</span>
        </Link>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {pathname !== '/' && (
            <Link to="/" style={{
              fontSize: 13, color: 'var(--text-2)',
              padding: '6px 12px', borderRadius: 'var(--radius)',
              transition: 'color var(--transition)',
            }}
              onMouseEnter={e => e.target.style.color = 'var(--text)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-2)'}
            >
              ← Change ZIP
            </Link>
          )}
          <a
            href="https://github.com/your-repo/votemap"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 12, fontFamily: 'var(--font-mono)',
              color: 'var(--text-3)', padding: '6px 12px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => { e.target.style.color = 'var(--text-2)'; e.target.style.borderColor = 'var(--border-med)'; }}
            onMouseLeave={e => { e.target.style.color = 'var(--text-3)'; e.target.style.borderColor = 'var(--border)'; }}
          >
            Open source
          </a>
        </div>
      </div>
    </nav>
  );
}
