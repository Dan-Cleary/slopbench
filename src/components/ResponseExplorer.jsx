import { useState, useRef, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function ResponseExplorer({ runId }) {
  const responses = useQuery(api.runs.getResponsesByRunId, { runId })
  const [expanded, setExpanded] = useState(null)
  const containerRef = useRef(null)

  // Scroll into view once data loads
  useEffect(() => {
    if (responses && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [responses])

  if (responses === undefined) return <div className="explorer explorer--loading" />
  if (responses.length === 0) return <div className="explorer" ref={containerRef}><p className="status">No responses found.</p></div>

  const sorted = [...responses].sort((a, b) => b.slop_hits.length - a.slop_hits.length).slice(0, 5)

  const allHits = responses.flatMap(r => r.slop_hits)
  const total = allHits.length
  const breakdown = allHits.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] ?? 0) + 1
    return acc
  }, {})
  const categories = [
    'structural_slop', 'word_level_slop', 'em_dash_slop',
    'phrase_level_slop', 'opener_slop', 'validation_slop', 'reframe_slop', 'ending_slop'
  ].filter(c => breakdown[c])

  return (
    <div className="explorer explorer--loaded" ref={containerRef}>
      <div className="explorer-header">
        <h2>Sloppiest Responses <span className="count">top 5</span></h2>
        <p className="hint">Click a row to expand the full response.</p>
      </div>

      {categories.length > 0 && (
        <div className="breakdown">
          {categories.map(cat => {
            const count = breakdown[cat]
            const pct = ((count / total) * 100).toFixed(0)
            const label = cat.replace('_slop', '').replace('_', ' ')
            return (
              <div key={cat} className="breakdown-row">
                <span className="breakdown-label">{label}</span>
                <div className="breakdown-bar-wrap">
                  <div className="breakdown-bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="breakdown-count">{count} <span className="breakdown-pct">({pct}%)</span></span>
              </div>
            )
          })}
        </div>
      )}
      <div className="response-list">
        {sorted.map((r, i) => (
          <div
            key={r._id}
            className={`response-row ${expanded === r._id ? 'open' : ''} ${r.slop_hits.length > 0 ? 'has-slop' : ''}`}
            onClick={() => setExpanded(expanded === r._id ? null : r._id)}
          >
            <div className="response-summary">
              <span className="response-num">#{i + 1}</span>
              <span className="response-prompt">{r.prompt}</span>
              <div className="response-meta">
                {r.slop_hits.length > 0
                  ? <span className="slop-count">{r.slop_hits.length} slop</span>
                  : <span className="clean">clean</span>
                }
                {r.cost_usd !== undefined && <span className="meta-item">${r.cost_usd.toFixed(5)}</span>}
                <span className="meta-item">{r.latency_ms}ms</span>
                <span className="meta-item">{r.word_count}w</span>
              </div>
            </div>

            {expanded === r._id && (
              <div className="response-detail" onClick={e => e.stopPropagation()}>
                {r.slop_hits.length > 0 && (
                  <div className="slop-hits">
                    {r.slop_hits.map((hit, j) => (
                      <span key={j} className={`hit hit-${hit.type.replace('_slop', '')}`}>
                        {hit.match}
                      </span>
                    ))}
                  </div>
                )}
                <pre className="response-text">{r.response}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
