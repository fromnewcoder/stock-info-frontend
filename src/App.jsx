import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = 'http://43.155.133.127:8000'

function App() {
  const [activeTab, setActiveTab] = useState('summary')
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [stats, setStats] = useState([])
  const [trading, setTrading] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDates()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchDataForDate(selectedDate)
    }
  }, [selectedDate])

  const fetchDates = async () => {
    try {
      const res = await fetch(`${API_BASE}/dates`)
      const data = await res.json()
      setDates(data.dates || [])
      if (data.dates && data.dates.length > 0) {
        setSelectedDate(data.dates[0])
      }
    } catch (err) {
      setError('Cannot connect to API. Make sure the backend is running on port 8000.')
      setLoading(false)
    }
  }

  const fetchDataForDate = async (date) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/summary?date=${date}`)
      const data = await res.json()
      setStats(data.statistics || [])
      setTrading(data.trading || [])
      setError(null)
    } catch (err) {
      setError('Failed to fetch data')
    }
    setLoading(false)
  }

  const formatNum = (n) => {
    if (!n && n !== 0) return '-'
    return Number(n).toLocaleString('zh-CN')
  }

  const formatMoney = (n) => {
    if (!n && n !== 0) return '-'
    return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`
  }

  const getProductName = (code) => {
    const map = { '01': '主板', '02': 'B股', '03': '科创板', '17': '全部' }
    return map[code] || code
  }

  return (
    <div className="app">
      <header className="header">
        <h1>📈 上海证券交易所数据看板</h1>
        <p className="subtitle">Shanghai Stock Exchange Dashboard</p>
      </header>

      <div className="controls">
        <label>
          选择日期:
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {dates.map(d => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        </label>
        <button onClick={() => fetchDataForDate(selectedDate)} disabled={loading}>
          🔄 刷新
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <div className="tabs">
            <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>
              总貌
            </button>
            <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>
              统计
            </button>
            <button className={activeTab === 'trading' ? 'active' : ''} onClick={() => setActiveTab('trading')}>
              成交
            </button>
          </div>

          {activeTab === 'summary' && (
            <div className="cards">
              {stats.map(s => (
                <div key={s.product_name} className={`card ${s.product_code === '17' ? 'highlight' : ''}`}>
                  <h3>{s.product_name}</h3>
                  <div className="metric">
                    <span className="label">上市公司</span>
                    <span className="value">{formatNum(s.list_com_num)} 家</span>
                  </div>
                  <div className="metric">
                    <span className="label">上市股票</span>
                    <span className="value">{formatNum(s.security_num)} 只</span>
                  </div>
                  <div className="metric">
                    <span className="label">总市值</span>
                    <span className="value">{formatMoney(s.total_value)} 亿</span>
                  </div>
                  <div className="metric">
                    <span className="label">流通市值</span>
                    <span className="value">{formatMoney(s.nego_value)} 亿</span>
                  </div>
                  <div className="metric">
                    <span className="label">平均市盈率</span>
                    <span className="value">{s.avg_pe_ratio || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stats' && (
            <table className="table">
              <thead>
                <tr>
                  <th>市场</th>
                  <th>代码</th>
                  <th>公司数</th>
                  <th>股票数</th>
                  <th>总股本(亿)</th>
                  <th>流通股本(亿)</th>
                  <th>总市值(亿)</th>
                  <th>流通市值(亿)</th>
                  <th>市盈率</th>
                  <th>成交额(亿)</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={i} className={s.product_code === '17' ? 'highlight-row' : ''}>
                    <td>{s.product_name}</td>
                    <td>{s.product_code}</td>
                    <td>{formatNum(s.list_com_num)}</td>
                    <td>{formatNum(s.security_num)}</td>
                    <td>{formatMoney(s.total_issue_vol)}</td>
                    <td>{formatMoney(s.nego_issue_vol)}</td>
                    <td>{formatMoney(s.total_value)}</td>
                    <td>{formatMoney(s.nego_value)}</td>
                    <td>{s.avg_pe_ratio || '-'}</td>
                    <td>{formatMoney(s.total_trade_amt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'trading' && (
            <table className="table">
              <thead>
                <tr>
                  <th>市场</th>
                  <th>代码</th>
                  <th>上市数</th>
                  <th>成交量(亿股)</th>
                  <th>成交额(亿)</th>
                  <th>换手率(%)</th>
                  <th>市盈率</th>
                </tr>
              </thead>
              <tbody>
                {trading.map((t, i) => (
                  <tr key={i}>
                    <td>{getProductName(t.product_code)}</td>
                    <td>{t.product_code}</td>
                    <td>{formatNum(t.list_num)}</td>
                    <td>{formatMoney(t.trade_vol)}</td>
                    <td>{formatMoney(t.trade_amt)}</td>
                    <td>{t.total_to_rate || '-'}</td>
                    <td>{t.avg_pe_rate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

export default App
