import React from 'react';

// Maps category direction + strength to a color
function biasColor(direction, score) {
  if (score < 0.5) return 'var(--text-3)';
  if (direction === 'against') return 'var(--red)';
  if (direction === 'for') return 'var(--blue)';
  return 'var(--amber)';
}

function confidenceDot(confidence) {
  const colors = { high: 'var(--green)', medium: 'var(--amber)', low: 'var(--text-3)' };
  return colors[confidence] || colors.low;
}

export default function BiasBar({ bias, animate = true, delay = 0 }) {
  const color = biasColor(bias.direction, bias.score);
  const pct   = Math.round(bias.score * 100);

  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
      animation: animate ? `fadeUp 0.4s ease ${delay}s both` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Confidence dot */}
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: confidenceDot(bias.confidence),
          }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{bias.label}</span>
          {bias.vote_count && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              color: 'var(--text-3)', marginLeft: 2,
            }}>
              {bias.vote_count} votes
            </span>
          )}
        </div>
        <span style={{
          fontSize: 13, fontFamily: 'var(--font-mono)',
          fontWeight: 500, color,
        }}>
          {pct}%
        </span>
      </div>

      {/* Track */}
      <div style={{
        height: 3, background: 'var(--bg-4)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 2,
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>

      {bias.summary && (
        <p style={{
          marginTop: 6, fontSize: 12,
          color: 'var(--text-3)', lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {bias.summary}
        </p>
      )}
    </div>
  );
}
