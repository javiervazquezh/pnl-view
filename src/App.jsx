import { useEffect, useMemo, useRef, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { FiTrendingUp, FiActivity, FiBarChart2 } from 'react-icons/fi'

// Simulated historical daily PnL per equity desk
function makeHistorical() {
  const desks = ['US Equities', 'EMEA Equities', 'APAC Equities']
  const days = 60
  const start = new Date()
  start.setDate(start.getDate() - days)
  const series = []
  const phi = 0.85 // mean reversion factor
  const bounds = { min: -2500, max: 2500 }
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const date = d.toISOString().slice(0, 10)
    const row = { date }
    for (const desk of desks) {
      const prev = i ? series[i - 1][desk] : (Math.random() * 1000 - 500)
      const noise = (Math.random() * 800 - 400) // zero-mean noise
      let val = phi * prev + noise
      if (val < bounds.min) val = bounds.min + Math.random() * 200
      if (val > bounds.max) val = bounds.max - Math.random() * 200
      row[desk] = Math.round(val * 100) / 100
    }
    series.push(row)
  }
  return { desks, series }
}

export default function App() {
  const { desks, series } = useMemo(() => {
    const res = makeHistorical()
    // ensure chronological order and stable date keys
    const sorted = [...res.series].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    return { desks: res.desks, series: sorted }
  }, [])
  const [rows, setRows] = useState(() =>
    Array.from({ length: 10 }).map((_, i) => {
      const symbol = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'BAC', 'GS', 'HSBC', 'BABA'][i % 12]
      const trade = Math.round((50 + Math.random() * 150) * 100) / 100
      const market = Math.round((trade * (0.985 + Math.random() * 0.03)) * 100) / 100 // +/- ~1.5%
      const qty = Math.floor(50 + Math.random() * 950)
      const pnl = Math.round(((market - trade) * qty) * 100) / 100
      return {
        id: `sym-${i + 1}`,
        symbol,
        trade_price: trade,
        market_price: market,
        quantity: qty,
        profit_or_loss: pnl,
      }
    })
  )
  // Track transient flash states per row when PnL updates
  const [flashes, setFlashes] = useState({}) // { [rowId]: 'pos' | 'neg' }
  const flashTimersRef = useRef({})

  // Simulate realtime price updates and recompute PnL
  useEffect(() => {
    const iv = setInterval(() => {
      setRows((prev) => {
        const changes = []
        const next = prev.map((r) => {
          const pct = 1 + (Math.random() * 0.006 - 0.003) // +/- 0.3%
          const newMarket = Math.max(0.01, Math.round((r.market_price * pct) * 100) / 100)
          const newPnl = Math.round(((newMarket - r.trade_price) * r.quantity) * 100) / 100
          if (newPnl !== r.profit_or_loss) {
            changes.push({ id: r.id, dir: newPnl >= 0 ? 'pos' : 'neg' })
          }
          return { ...r, market_price: newMarket, profit_or_loss: newPnl }
        })

        if (changes.length) {
          setFlashes((prevFlashes) => {
            const updated = { ...prevFlashes }
            for (const c of changes) {
              updated[c.id] = c.dir
              if (flashTimersRef.current[c.id]) clearTimeout(flashTimersRef.current[c.id])
              flashTimersRef.current[c.id] = setTimeout(() => {
                setFlashes((curr) => {
                  const copy = { ...curr }
                  delete copy[c.id]
                  return copy
                })
              }, 600)
            }
            return updated
          })
        }

        return next
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="page">
      <header className="app-header">
        <div className="row" style={{ alignItems: 'center' }}>
          <div className="logo-circle"><FiTrendingUp /></div>
          <div>
            <div className="title">PnL Dashboard</div>
            <div className="subtitle">Equity desks performance overview</div>
          </div>
        </div>
      </header>
      <main className="content">
        <section className="card" style={{ flex: 1, minHeight: 320 }}>
          <div className="card-title"><FiBarChart2 /> Historical Daily PnL</div>
          <div className="card-body" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tdGreen1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10a14b" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10a14b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="tdGreen2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0b8f3a" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#0b8f3a" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="tdGreen3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#374151' }} minTickGap={20} tickLine={{ stroke: '#9ca3af' }} />
                <YAxis domain={[-3000, 3000]} tick={{ fontSize: 12, fill: '#374151' }} tickLine={{ stroke: '#9ca3af' }} axisLine={{ stroke: '#9ca3af' }} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb' }} labelStyle={{ color: '#111827' }} />
                <Legend />
                <Area type="monotone" dataKey={desks[0]} stroke="#10a14b" fill="url(#tdGreen1)" strokeWidth={2} />
                <Area type="monotone" dataKey={desks[1]} stroke="#0b8f3a" fill="url(#tdGreen2)" strokeWidth={2} />
                <Area type="monotone" dataKey={desks[2]} stroke="#2e7d32" fill="url(#tdGreen3)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <div className="card-title"><FiActivity /> Realtime PnL</div>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  {['Symbol', 'Trade Price', 'Market Price', 'Quantity', 'Profit/Loss'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td>{r.symbol}</td>
                    <td>{r.trade_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{r.market_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{r.quantity.toLocaleString()}</td>
                    <td className={`${r.profit_or_loss >= 0 ? 'pos' : 'neg'} ${flashes[r.id] ? (flashes[r.id] === 'pos' ? 'flash-pos' : 'flash-neg') : ''}`}>
                      {r.profit_or_loss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
