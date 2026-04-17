import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import ScatterPlotRecharts from './ScatterPlotRecharts.jsx'
import InfoPopover from './InfoPopover.jsx'
import ResponseExplorer from './ResponseExplorer.jsx'
import { logoUrl } from '../utils/providers.js'

function ProviderLogo({ model }) {
  const url = logoUrl(model)
  if (!url) return null
  return (
    <img
      src={url}
      alt={model.split('/')[0]}
      className="provider-logo"
    />
  )
}

function ScoreBar({ value, max, format }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="score-cell">
      <div className="score-bar-wrap">
        <div className="score-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="score-value">{format(value)}</span>
    </div>
  )
}

const TABS = [
  {
    key: 'slop',
    label: 'Slop',
    heading: 'Slop Rate',
    subheading: 'Percentage of outputs containing classic AI slop. Lower is better.',
    getValue: r => r.pure_slop_rate,
    format: v => `${v.toFixed(1)}%`,
  },
  {
    key: 'speed',
    label: 'Speed',
    heading: 'Response Latency',
    subheading: 'Average response latency. Lower is better.',
    getValue: r => r.avg_latency_ms,
    format: v => `${v.toLocaleString()}ms`,
  },
  {
    key: 'cost',
    label: 'Cost',
    heading: 'Cost per Run',
    subheading: 'Total cost to run SlopBench. Lower is better.',
    getValue: r => r.total_cost_usd,
    format: v => `$${v.toFixed(2)}`,
  },
  {
    key: 'bullets',
    label: 'Bullets',
    heading: 'Bullet Point Rate',
    subheading: 'Percentage of responses containing bullet points or numbered lists. Lower is better.',
    getValue: r => r.bullet_rate !== undefined ? r.bullet_rate * 100 : undefined,
    format: v => `${v.toFixed(0)}%`,
  },
  {
    key: 'emdash',
    label: 'Em Dash',
    heading: 'Em Dash Rate',
    subheading: 'Percentage of responses containing excessive em dashes. Lower is better.',
    getValue: r => r.em_dash_rate,
    format: v => `${v.toFixed(0)}%`,
  },
  {
    key: 'matrix',
    label: 'Matrix',
    heading: 'Value Matrix',
    subheading: 'Top-left is best: low slop, low cost',
  },
]

export default function Leaderboard() {
  const runs = useQuery(api.runs.getLeaderboard)
  const [activeTab, setActiveTab] = useState('slop')
  const [asc, setAsc] = useState(true)
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [hoveredRunId, setHoveredRunId] = useState(null)

  // Prefetch on hover
  useQuery(api.runs.getResponsesByRunId, hoveredRunId ? { runId: hoveredRunId } : 'skip')

  if (runs === undefined) return <p className="status">Loading leaderboard...</p>
  if (runs.length === 0) return <p className="status">No completed runs yet.</p>

  const tab = TABS.find(t => t.key === activeTab)
  const isMatrix = activeTab === 'matrix'

  const sorted = isMatrix ? [] : [...runs]
    .filter(r => tab.getValue(r) !== undefined)
    .sort((a, b) => {
      const diff = (tab.getValue(a) ?? Infinity) - (tab.getValue(b) ?? Infinity)
      return asc ? diff : -diff
    })
  const max = isMatrix ? 0 : Math.max(...sorted.map(r => tab.getValue(r) ?? 0))

  return (
    <div>
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-heading">
        <div className="tab-heading-row">
          <h2>{tab.heading}</h2>
          {activeTab === 'slop' && <InfoPopover />}
        </div>
        <p className="tab-subheading">{tab.subheading}</p>
      </div>

      {isMatrix ? (
        <ScatterPlotRecharts runs={runs} />
      ) : (
        <div className="leaderboard">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th className="col-model">Model</th>
                <th className="col-sortable" onClick={() => setAsc(v => !v)}>
                  {tab.label} {asc ? '↑' : '↓'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((run, i) => {
                const value = tab.getValue(run)
                const isSelected = run._id === selectedRunId
                return (
                  <React.Fragment key={run._id}>
                    <tr
                      onClick={() => {
                        setSelectedRunId(isSelected ? null : run._id)
                        if (!isSelected) {
                          window.convalytics?.track('model_clicked', { model: run.model, tab: activeTab })
                        }
                      }}
                      onMouseEnter={() => setHoveredRunId(run._id)}
                      onMouseLeave={() => setHoveredRunId(null)}
                      className={isSelected ? 'selected' : ''}
                    >
                      <td className="col-rank">{i + 1}</td>
                      <td className="col-model">
                        <div className="col-model-inner">
                          <ProviderLogo model={run.model} />
                          <code>{run.model}</code>
                        </div>
                      </td>
                      <td>
                        {value !== undefined ? <ScoreBar value={value} max={max} format={tab.format} /> : '—'}
                      </td>
                    </tr>
                    {isSelected && (
                      <tr className="explorer-row">
                        <td colSpan={3} className="explorer-cell">
                          <ResponseExplorer runId={run._id} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
