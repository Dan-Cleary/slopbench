import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ResponsiveContainer
} from 'recharts'
import { logoUrl } from '../utils/providers.js'

function CustomDot({ cx, cy, payload }) {
  const url = logoUrl(payload.model)
  const R = 16
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill="var(--accent-bg)" stroke="var(--accent-border)" strokeWidth={1.5} />
      {url && <image href={url} x={cx - R / 1.5} y={cy - R / 1.5} width={R * 1.33} height={R * 1.33} />}
    </g>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="scatter-tooltip" style={{ position: 'relative', left: 0, top: 0 }}>
      <code>{d.model}</code>
      <span>Slop: {d.slop.toFixed(1)}%</span>
      <span>Cost: ${d.cost.toFixed(4)}</span>
    </div>
  )
}

export default function ScatterPlotRecharts({ runs }) {
  const data = runs
    .filter(r => r.total_cost_usd != null && r.pure_slop_rate != null)
    .map(r => ({
      model: r.model,
      cost: r.total_cost_usd,
      slop: r.pure_slop_rate,
    }))

  if (data.length < 2) return <p className="status">Not enough data to plot.</p>

  const costs = data.map(d => d.cost)
  const slops = data.map(d => d.slop)

  const minCost = Math.min(...costs)
  const maxCost = Math.max(...costs)
  const minSlop = Math.min(...slops)
  const maxSlop = Math.max(...slops)

  // Padded domain for log scale
  const xMin = Math.exp(Math.log(minCost) - 0.6)
  const xMax = Math.exp(Math.log(maxCost) + 0.6)

  // Generate clean log-scale ticks within range
  const allTicks = [0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20]
  const xTicks = allTicks.filter(v => v >= xMin && v <= xMax)

  // Padded Y domain
  const slopPad = (maxSlop - minSlop) * 0.3 || 5
  const yMin = Math.max(0, minSlop - slopPad)
  const yMax = maxSlop + slopPad

  const midCost = Math.exp((Math.log(xMin) + Math.log(xMax)) / 2)
  const midSlop = (yMin + yMax) / 2

  return (
    <div className="scatter-wrap" style={{ height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 40, bottom: 40, left: 20 }}>
          <ReferenceArea
            x1={xMin} x2={midCost}
            y1={yMin} y2={midSlop}
            fill="rgba(34, 197, 94, 0.07)"
          />
          <CartesianGrid stroke="var(--border)" strokeDasharray="" vertical={true} horizontal={true} />
          <XAxis
            dataKey="cost"
            type="number"
            scale="log"
            domain={[xMin, xMax]}
            ticks={xTicks}
            tickFormatter={v => `$${v < 0.1 ? v.toFixed(2) : v.toFixed(1)}`}
            label={{ value: 'COST (LOG SCALE)', position: 'insideBottom', offset: -20, fontSize: 11, fill: 'var(--text)', letterSpacing: '0.05em' }}
            tick={{ fontSize: 11, fill: 'var(--text)' }}
            stroke="var(--border)"
          />
          <YAxis
            dataKey="slop"
            type="number"
            domain={[yMin, yMax]}
            reversed
            tickFormatter={v => `${v.toFixed(1)}%`}
            label={{ value: 'SLOP RATE', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--text)', letterSpacing: '0.05em' }}
            tick={{ fontSize: 11, fill: 'var(--text)' }}
            stroke="var(--border)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
