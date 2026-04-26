import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Nav() {
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(245,243,238,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      height: 54,
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', width: '100%',
        padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{
            width: 9, height: 9, borderRadius: '50%',
            background: 'var(--red)', display: 'inline-block',
          }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 900,
            letterSpacing: '-.02em', color: 'var(--text)',
          }}>VoteMap</span>
        </Link>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--amber)', border: '1px solid var(--amber-dim)',
            borderRadius: 20, padding: '3px 10px', letterSpacing: '.08em',
            background: 'var(--amber-dim)',
          }}>Demo</span>
          {pathname !== '/' && (
            <Link to="/" style={{
              fontSize: 12, color: 'var(--text-2)',
              padding: '5px 12px',
              border: '1px solid var(--border-med)',
              borderRadius: 20,
              fontFamily: 'var(--font-mono)',
              transition: 'all var(--transition)',
            }}>
              ← Change ZIP
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
