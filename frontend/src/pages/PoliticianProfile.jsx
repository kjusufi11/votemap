import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import BiasBar from '../components/BiasBar';
import { getPolitician, getPoliticianVotes, triggerAnalysis, getErrorMessage } from '../services/api';

const PARTY_COLOR = { D: 'var(--party-d)', R: 'var(--party-r)', I: 'var(--party-i)' };
const PARTY_DIM   = { D: 'var(--party-d-dim)', R: 'var(--party-r-dim)', I: 'var(--party-i-dim)' };
const PARTY_LABEL = { D: 'Democrat', R: 'Republican', I: 'Independent' };

const VOTE_COLOR = {
  'Yes': 'var(--green)', 'Yea': 'var(--green)',
  'No': 'var(--red)', 'Nay': 'var(--red)',
  'Not Voting': 'var(--text-3)', 'Present': 'var(--amber)',
};
const VOTE_SHORT = {
  'Yes': 'YEA', 'Yea': 'YEA',
  'No': 'NAY', 'Nay': 'NAY',
  'Not Voting': 'ABS', 'Present': 'PRE',
};

export default function PoliticianProfile() {
  const { id } = useParams();

  const [pol,       setPol]       = useState(null);
  const [votes,     setVotes]     = useState([]);
  const [votePage,  setVotePage]  = useState(0);
  const [voteTotal, setVoteTotal] = useState(0);
  const [votePages, setVotePages] = useState(0);
  const [biases,    setBiases]    = useState([]);
  const [analysis,  setAnalysis]  = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [voteLoad,  setVoteLoad]  = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    loadProfile();
  }, [id]);

  useEffect(() => {
    if (pol) loadVotes(votePage);
  }, [votePage, pol]);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await getPolitician(id);
      setPol(data);
      setBiases(data.bias_scores || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadVotes(page) {
    setVoteLoad(true);
    try {
      const result = await getPoliticianVotes(id, page);
      setVotes(result.votes || []);
      setVoteTotal(result.total || 0);
      setVotePages(result.pages || 0);
    } catch {}
    setVoteLoad(false);
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const result = await triggerAnalysis(id);
      if (result.analysis) {
        setAnalysis(result.analysis);
        setBiases(result.analysis.biases || []);
      }
    } catch {}
    setAnalyzing(false);
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-3)', margin: '0 auto 1rem', animation: 'pulse 1.2s ease infinite' }} />
      Loading profile…
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--red)', fontSize: 14 }}>
      {error} — <Link to="/" style={{ color: 'var(--text-2)' }}>Go home</Link>
    </div>
  );

  if (!pol) return null;

  const party = pol.party;
  const initials = `${pol.first_name?.[0] || ''}${pol.last_name?.[0] || ''}`;

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

      {/* Back */}
      <Link to="/reps" style={{
        fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
        display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '2rem',
        transition: 'color var(--transition)',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
      >
        ← Back to my representatives
      </Link>

      {/* Profile header */}
      <header className="animate-fade-up" style={{
        display: 'flex', gap: '1.5rem', alignItems: 'flex-start',
        marginBottom: '2.5rem', flexWrap: 'wrap',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: PARTY_DIM[party] || 'var(--bg-4)',
          border: `1px solid ${PARTY_COLOR[party] || 'var(--border-med)'}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
          color: PARTY_COLOR[party] || 'var(--text-2)',
        }}>
          {initials}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1,
            marginBottom: 8,
          }}>
            {pol.full_name}
          </h1>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              fontSize: 12, fontFamily: 'var(--font-mono)',
              color: PARTY_COLOR[party] || 'var(--text-2)',
              background: PARTY_DIM[party] || 'var(--bg-4)',
              padding: '3px 10px', borderRadius: 4,
            }}>
              {PARTY_LABEL[party] || party}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {pol.title} · {pol.state}{pol.district ? `-${pol.district}` : ''} · {pol.chamber === 'senate' ? 'U.S. Senate' : 'U.S. House'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[
              pol.total_votes && `${pol.total_votes.toLocaleString()} total votes`,
              pol.party_loyalty_pct && `${pol.party_loyalty_pct}% party loyalty`,
              pol.missed_votes_pct && `${pol.missed_votes_pct}% missed votes`,
              pol.next_election && `Next election: ${pol.next_election}`,
            ].filter(Boolean).map((s, i) => (
              <span key={i} style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {pol.url && (
            <a href={pol.url} target="_blank" rel="noreferrer" style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '7px 14px', transition: 'all var(--transition)',
            }}
              onMouseEnter={e => { e.target.style.color='var(--text-2)'; e.target.style.borderColor='var(--border-med)'; }}
              onMouseLeave={e => { e.target.style.color='var(--text-3)'; e.target.style.borderColor='var(--border)'; }}
            >
              Official site ↗
            </a>
          )}
          {pol.twitter_handle && (
            <a href={`https://twitter.com/${pol.twitter_handle}`} target="_blank" rel="noreferrer" style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '7px 14px', transition: 'all var(--transition)',
            }}
              onMouseEnter={e => { e.target.style.color='var(--text-2)'; e.target.style.borderColor='var(--border-med)'; }}
              onMouseLeave={e => { e.target.style.color='var(--text-3)'; e.target.style.borderColor='var(--border)'; }}
            >
              @{pol.twitter_handle} ↗
            </a>
          )}
        </div>
      </header>

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
        gap: '1.5rem',
        alignItems: 'start',
      }}>

        {/* Left: Vote history */}
        <section>
          <SectionLabel>Vote history · {voteTotal.toLocaleString()} total</SectionLabel>

          {voteLoad ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              Loading votes…
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            }}>
              {votes.map((vote, i) => (
                <VoteRow key={vote.id} vote={vote} index={i} />
              ))}

              {votes.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No votes found.
                </div>
              )}

              {/* Pagination */}
              {votePages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderTop: '1px solid var(--border)',
                }}>
                  <button
                    disabled={votePage === 0}
                    onClick={() => setVotePage(p => Math.max(0, p - 1))}
                    style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      color: votePage === 0 ? 'var(--text-3)' : 'var(--text-2)',
                      opacity: votePage === 0 ? 0.4 : 1,
                      padding: '5px 10px', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                    Page {votePage + 1} of {votePages}
                  </span>
                  <button
                    disabled={votePage >= votePages - 1}
                    onClick={() => setVotePage(p => Math.min(votePages - 1, p + 1))}
                    style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      color: votePage >= votePages - 1 ? 'var(--text-3)' : 'var(--text-2)',
                      opacity: votePage >= votePages - 1 ? 0.4 : 1,
                      padding: '5px 10px', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right: Bias analysis */}
        <section>
          <SectionLabel>Bias analysis</SectionLabel>

          <div style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            {biases.length > 0 ? (
              <div style={{ padding: '1.25rem 1.5rem' }}>
                {(analysis?.overall_summary || pol.ai_analysis?.overall_summary) && (
                  <p style={{
                    fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65,
                    marginBottom: '1.25rem', paddingBottom: '1.25rem',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {analysis?.overall_summary || pol.ai_analysis?.overall_summary}
                  </p>
                )}
                {biases.map((bias, i) => (
                  <BiasBar key={bias.category} bias={bias} delay={i * 0.05} />
                ))}
                <button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  style={{
                    marginTop: '1rem', fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-3)', padding: '6px 12px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    transition: 'all var(--transition)',
                    opacity: analyzing ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!analyzing) { e.target.style.color='var(--text-2)'; e.target.style.borderColor='var(--border-med)'; }}}
                  onMouseLeave={e => { e.target.style.color='var(--text-3)'; e.target.style.borderColor='var(--border)'; }}
                >
                  {analyzing ? '◌ Re-analyzing…' : '↺ Refresh analysis'}
                </button>
              </div>
            ) : (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  {pol.total_votes > 0
                    ? `${pol.total_votes.toLocaleString()} votes on record — ready for analysis.`
                    : 'Vote data syncing…'}
                </p>
                {pol.total_votes > 0 && (
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    style={{
                      fontSize: 13, fontFamily: 'var(--font-mono)',
                      color: analyzing ? 'var(--text-3)' : 'var(--text)',
                      border: '1px solid var(--border-med)', borderRadius: 'var(--radius)',
                      padding: '10px 20px', transition: 'all var(--transition)',
                      opacity: analyzing ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!analyzing) { e.target.style.borderColor='var(--border-hi)'; }}}
                    onMouseLeave={e => { e.target.style.borderColor='var(--border-med)'; }}
                  >
                    {analyzing ? '◌ Analyzing with Claude…' : '◎ Run bias analysis'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* DW-NOMINATE score card */}
          {pol.dw_nominate != null && (
            <div style={{
              marginTop: '1rem',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
            }}>
              <p style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                color: 'var(--text-3)', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 12,
              }}>
                DW-NOMINATE ideology score
              </p>
              <IdeologyMeter score={pol.dw_nominate} />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
                Political science metric: −1.0 = most liberal, +1.0 = most conservative. Based on lifetime voting record.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function VoteRow({ vote, index }) {
  const position = vote.position || 'Not Voting';
  const color = VOTE_COLOR[position] || 'var(--text-3)';
  const short = VOTE_SHORT[position] || '—';
  const title = vote.short_title || vote.title || vote.description || vote.question || 'Unknown bill';
  const dateStr = vote.vote_date ? new Date(vote.vote_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      animation: `fadeUp 0.3s ease ${index * 0.03}s both`,
    }}>
      <span style={{
        fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 500,
        color, background: `${color}18`,
        padding: '3px 8px', borderRadius: 3,
        flexShrink: 0, marginTop: 1, minWidth: 36, textAlign: 'center',
      }}>
        {short}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, color: 'var(--text)', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {title}
        </p>
        {vote.primary_subject && (
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)', marginTop: 3, display: 'block',
          }}>
            {vote.primary_subject}
          </span>
        )}
      </div>
      {dateStr && (
        <span style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {dateStr}
        </span>
      )}
    </div>
  );
}

function IdeologyMeter({ score }) {
  // score is -1.0 to +1.0; map to 0-100%
  const pct = ((score + 1) / 2) * 100;
  const isLiberal = score < -0.1;
  const isConservative = score > 0.1;
  const color = isLiberal ? 'var(--party-d)' : isConservative ? 'var(--party-r)' : 'var(--amber)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--party-d)' }}>Liberal</span>
        <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500, color }}>
          {score > 0 ? '+' : ''}{score.toFixed(2)}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--party-r)' }}>Conservative</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-4)', borderRadius: 2, position: 'relative' }}>
        {/* Center line */}
        <div style={{
          position: 'absolute', left: '50%', top: -2, width: 1, height: 8,
          background: 'var(--border-med)',
        }} />
        {/* Score dot */}
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: color, border: '2px solid var(--bg-2)',
        }} />
        {/* Left fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${Math.min(pct, 50)}%`,
          background: pct < 50 ? 'var(--party-d)' : 'transparent',
          opacity: 0.4, borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0,
          width: `${Math.max(pct - 50, 0)}%`,
          background: pct > 50 ? 'var(--party-r)' : 'transparent',
          opacity: 0.4, borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem',
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
