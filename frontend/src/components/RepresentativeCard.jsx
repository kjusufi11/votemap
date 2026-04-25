import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BiasBar from './BiasBar';
import { triggerAnalysis } from '../services/api';

function partyColor(party) {
  if (party === 'D') return 'var(--party-d)';
  if (party === 'R') return 'var(--party-r)';
  return 'var(--party-i)';
}
function partyDim(party) {
  if (party === 'D') return 'var(--party-d-dim)';
  if (party === 'R') return 'var(--party-r-dim)';
  return 'var(--party-i-dim)';
}
function partyLabel(party) {
  if (party === 'D') return 'Democrat';
  if (party === 'R') return 'Republican';
  if (party === 'I') return 'Independent';
  return party || '—';
}

export default function RepresentativeCard({ rep, index }) {
  const [analyzing, setAnalyzing]   = useState(false);
  const [analysis,  setAnalysis]    = useState(rep.profile?.aiAnalysis || null);
  const [biases,    setBiases]      = useState(rep.profile?.biasScores || []);
  const [analyzeErr, setAnalyzeErr] = useState('');
  const [expanded,  setExpanded]    = useState(false);

  const profile = rep.profile;
  const party   = rep.party || profile?.party;
  const hasData = !!profile;
  const hasBias = biases.length > 0;

  async function runAnalysis() {
    if (!profile?.id) return;
    setAnalyzing(true);
    setAnalyzeErr('');
    try {
      const result = await triggerAnalysis(profile.id);
      if (result.analysis) {
        setAnalysis(result.analysis);
        setBiases(result.analysis.biases || []);
      }
    } catch (err) {
      setAnalyzeErr(err?.response?.data?.error || 'Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <article style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      animation: `fadeUp 0.5s ease ${index * 0.08}s both`,
      transition: 'border-color var(--transition)',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-med)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Card header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: '1rem',
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          {/* Party badge / avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: partyDim(party),
            border: `1px solid ${partyColor(party)}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: 14, fontWeight: 700,
            color: partyColor(party),
            fontFamily: 'var(--font-mono)',
          }}>
            {rep.name?.split(' ').filter((_, i, a) => i === 0 || i === a.length - 1).map(n => n[0]).join('').slice(0,2)}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 19, fontWeight: 700,
                letterSpacing: '-0.01em',
              }}>
                {profile ? (
                  <Link
                    to={`/politician/${profile.id}`}
                    style={{ transition: 'color var(--transition)' }}
                    onMouseEnter={e => e.target.style.color = 'var(--text-2)'}
                    onMouseLeave={e => e.target.style.color = 'var(--text)'}
                  >
                    {rep.name}
                  </Link>
                ) : rep.name}
              </h2>
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                color: partyColor(party),
                background: partyDim(party),
                padding: '2px 8px', borderRadius: 3,
              }}>
                {partyLabel(party)}
              </span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
              {rep.office}
            </p>

            {profile && (
              <div style={{
                display: 'flex', gap: '1rem', marginTop: 8, flexWrap: 'wrap',
              }}>
                {[
                  profile.totalVotes && `${profile.totalVotes.toLocaleString()} votes cast`,
                  profile.partyLoyaltyPct && `${profile.partyLoyaltyPct}% party loyalty`,
                  profile.missedVotesPct && `${profile.missedVotesPct}% missed`,
                ].filter(Boolean).map((stat, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-3)',
                  }}>
                    {stat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: links */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {rep.url && (
            <a href={rep.url} target="_blank" rel="noreferrer" style={{
              fontSize: 11, fontFamily: 'var(--font-mono)',
              color: 'var(--text-3)', padding: '5px 10px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              transition: 'all var(--transition)',
            }}
              onMouseEnter={e => { e.target.style.color = 'var(--text-2)'; e.target.style.borderColor = 'var(--border-med)'; }}
              onMouseLeave={e => { e.target.style.color = 'var(--text-3)'; e.target.style.borderColor = 'var(--border)'; }}
            >
              Official site ↗
            </a>
          )}
          {profile?.id && (
            <Link to={`/politician/${profile.id}`} style={{
              fontSize: 11, fontFamily: 'var(--font-mono)',
              color: 'var(--text-3)', padding: '5px 10px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              transition: 'all var(--transition)',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-med)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              Full profile →
            </Link>
          )}
        </div>
      </div>

      {/* Bias section */}
      <div style={{ padding: '1.25rem 1.5rem' }}>

        {/* Has bias data */}
        {hasBias && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '0.75rem',
            }}>
              <h3 style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                color: 'var(--text-3)', letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Detected voting patterns
              </h3>
              <button
                onClick={() => setExpanded(x => !x)}
                style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-3)',
                  transition: 'color var(--transition)',
                }}
                onMouseEnter={e => e.target.style.color = 'var(--text-2)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-3)'}
              >
                {expanded ? 'Show less ↑' : `Show all ${biases.length} ↓`}
              </button>
            </div>

            {/* Summary blurb */}
            {analysis?.overall_summary && (
              <p style={{
                fontSize: 13, color: 'var(--text-2)',
                lineHeight: 1.6, marginBottom: '1rem',
                paddingBottom: '1rem', borderBottom: '1px solid var(--border)',
              }}>
                {analysis.overall_summary}
              </p>
            )}

            {/* Bias bars */}
            <div>
              {(expanded ? biases : biases.slice(0, 4)).map((bias, i) => (
                <BiasBar key={bias.category} bias={bias} delay={i * 0.04} />
              ))}
            </div>

            {/* Anomalies */}
            {expanded && analysis?.anomalies?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-3)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Notable exceptions
                </p>
                {analysis.anomalies.map((a, i) => (
                  <p key={i} style={{
                    fontSize: 12, color: 'var(--text-2)',
                    lineHeight: 1.55, paddingLeft: '1rem',
                    borderLeft: '2px solid var(--border-med)',
                    marginBottom: 6,
                  }}>
                    {a}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {/* No bias data yet — offer to run analysis */}
        {!hasBias && hasData && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1rem' }}>
              {profile.totalVotes > 0
                ? `${profile.totalVotes.toLocaleString()} votes on record — analysis not yet run.`
                : 'Vote data is syncing in the background…'}
            </p>
            {profile.totalVotes > 0 && (
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                style={{
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                  color: analyzing ? 'var(--text-3)' : 'var(--text)',
                  border: '1px solid var(--border-med)',
                  borderRadius: 'var(--radius)', padding: '8px 18px',
                  transition: 'all var(--transition)',
                }}
                onMouseEnter={e => { if (!analyzing) e.target.style.borderColor = 'var(--border-hi)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border-med)'; }}
              >
                {analyzing ? '◌ Analyzing with Claude…' : '◎ Run bias analysis'}
              </button>
            )}
            {analyzeErr && (
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                {analyzeErr}
              </p>
            )}
          </div>
        )}

        {/* No DB profile at all — Civic data only */}
        {!hasData && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '0.75rem 0' }}>
            Vote data is loading — refresh in a moment to see their record.
          </p>
        )}
      </div>
    </article>
  );
}
