import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = 'http://43.155.133.127:8000'

function App() {
  const [activeTab, setActiveTab] = useState('summary')
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [compareDate, setCompareDate] = useState('')
  const [stats, setStats] = useState([])
  const [trading, setTrading] = useState([])
  const [prevStats, setPrevStats] = useState([])
  const [prevTrading, setPrevTrading] = useState([])
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
        setCompareDate(data.dates[1] || '')
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

  const fetchCompareData = async (date) => {
    if (!date) {
      setPrevStats([])
      setPrevTrading([])
      return
    }
    try {
      const res = await fetch(`${API_BASE}/summary?date=${date}`)
      const data = await res.json()
      setPrevStats(data.statistics || [])
      setPrevTrading(data.trading || [])
    } catch (err) {
      console.error('Failed to fetch compare data')
    }
  }

  const handleCompareDateChange = (date) => {
    setCompareDate(date)
    fetchCompareData(date)
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

  const formatChange = (current, prev) => {
    if (!current && current !== 0 || !prev && prev !== 0) return { value: '-', positive: true }
    const change = current - prev
    const percent = prev !== 0 ? ((change / prev) * 100).toFixed(2) : '-'
    return {
      value: change >= 0 ? `+${formatMoney(change)}` : formatMoney(change),
      percent: change >= 0 ? `+${percent}%` : `${percent}%`,
      positive: change >= 0
    }
  }

  const getProductName = (code) => {
    const map = { '01': '主板', '02': 'B股', '03': '科创板', '17': '全部' }
    return map[code] || code
  }

  const exportToCSV = () => {
    const headers = ['市场', '代码', '公司数', '股票数', '总股本(亿)', '流通股本(亿)', '总市值(亿)', '流通市值(亿)', '市盈率', '成交额(亿)']
    const rows = stats.map(s => [
      s.product_name,
      s.product_code,
      s.list_com_num,
      s.security_num,
      s.total_issue_vol,
      s.nego_issue_vol,
      s.total_value,
      s.nego_value,
      s.avg_pe_ratio || '-',
      s.total_trade_amt
    ])

    const tradingHeaders = ['市场', '代码', '上市数', '成交量(亿股)', '成交额(亿)', '换手率(%)', '市盈率']
    const tradingRows = trading.map(t => [
      getProductName(t.product_code),
      t.product_code,
      t.list_num,
      t.trade_vol,
      t.trade_amt,
      t.total_to_rate || '-',
      t.avg_pe_rate || '-'
    ])

    let csv = `\uFEFF${formatDate(selectedDate)} 上海证券交易所数据报告\n\n`
    csv += '=== 统计报表 ===\n'
    csv += headers.join(',') + '\n'
    rows.forEach(row => csv += row.join(',') + '\n')

    csv += '\n=== 成交报表 ===\n'
    csv += tradingHeaders.join(',') + '\n'
    tradingRows.forEach(row => csv += row.join(',') + '\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SSE_Report_${selectedDate}.csv`
    link.click()
  }

  const getMarketCapChange = () => {
    const currentTotal = stats.find(s => s.product_code === '17')?.total_value || 0
    const prevTotal = prevStats.find(s => s.product_code === '17')?.total_value || 0
    return formatChange(currentTotal, prevTotal)
  }

  const getTradeChange = () => {
    const currentTotal = stats.find(s => s.product_code === '17')?.total_trade_amt || 0
    const prevTotal = prevStats.find(s => s.product_code === '17')?.total_trade_amt || 0
    return formatChange(currentTotal, prevTotal)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>📈 上海证券交易所数据看板</h1>
        <p className="subtitle">Shanghai Stock Exchange Dashboard</p>
      </header>

      <div className="controls">
        <label>
          报告日期:
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {dates.map(d => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        </label>
        <label>
          对比日期:
          <select value={compareDate} onChange={(e) => handleCompareDateChange(e.target.value)}>
            <option value="">-- 选择对比日期 --</option>
            {dates.filter(d => d !== selectedDate).map(d => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        </label>
        <button onClick={() => fetchDataForDate(selectedDate)} disabled={loading}>
          🔄 刷新
        </button>
        <button onClick={exportToCSV} className="export-btn">
          📥 导出CSV
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
            <button className={activeTab === 'report' ? 'active' : ''} onClick={() => setActiveTab('report')}>
              📊 报告
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

          {activeTab === 'report' && (
            <div className="report">
              <div className="report-header">
                <h2>📊 {formatDate(selectedDate)} 市场报告</h2>
                {compareDate && (
                  <p className="compare-info">对比日期: {formatDate(compareDate)}</p>
                )}
              </div>

              <div className="report-summary">
                <div className="summary-card">
                  <h4>总市值</h4>
                  <div className="big-num">
                    {formatMoney(stats.find(s => s.product_code === '17')?.total_value || 0)} <span className="unit">亿</span>
                  </div>
                  {compareDate && (
                    <div className={`change ${getMarketCapChange().positive ? 'up' : 'down'}`}>
                      {getMarketCapChange().value} ({getMarketCapChange().percent})
                    </div>
                  )}
                </div>
                <div className="summary-card">
                  <h4>日成交额</h4>
                  <div className="big-num">
                    {formatMoney(stats.find(s => s.product_code === '17')?.total_trade_amt || 0)} <span className="unit">亿</span>
                  </div>
                  {compareDate && (
                    <div className={`change ${getTradeChange().positive ? 'up' : 'down'}`}>
                      {getTradeChange().value} ({getTradeChange().percent})
                    </div>
                  )}
                </div>
                <div className="summary-card">
                  <h4>上市公司</h4>
                  <div className="big-num">
                    {formatNum(stats.find(s => s.product_code === '17')?.list_com_num || 0)} <span className="unit">家</span>
                  </div>
                </div>
                <div className="summary-card">
                  <h4>平均市盈率</h4>
                  <div className="big-num">
                    {stats.find(s => s.product_code === '17')?.avg_pe_ratio || '-'}
                  </div>
                </div>
              </div>

              <div className="market-comparison">
                <h3>市场对比</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>市场</th>
                      <th>当前市值(亿)</th>
                      <th>对比市值(亿)</th>
                      <th>变化</th>
                      <th>变化率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.filter(s => s.product_code !== '17').map(s => {
                      const prev = prevStats.find(ps => ps.product_code === s.product_code)
                      const change = formatChange(s.total_value, prev?.total_value)
                      return (
                        <tr key={s.product_code}>
                          <td>{s.product_name}</td>
                          <td>{formatMoney(s.total_value)}</td>
                          <td>{prev ? formatMoney(prev.total_value) : '-'}</td>
                          <td className={change.positive ? 'up' : 'down'}>{change.value}</td>
                          <td className={change.positive ? 'up' : 'down'}>{change.percent}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="trading-summary">
                <h3>成交概览</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>市场</th>
                      <th>成交量(亿股)</th>
                      <th>成交额(亿)</th>
                      <th>换手率(%)</th>
                      {compareDate && <th>对比换手率(%)</th>}
                      <th>变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trading.filter(t => t.product_code !== '17').map(t => {
                      const prev = prevTrading.find(pt => pt.product_code === t.product_code)
                      const change = formatChange(t.trade_amt, prev?.trade_amt)
                      return (
                        <tr key={t.product_code}>
                          <td>{getProductName(t.product_code)}</td>
                          <td>{formatMoney(t.trade_vol)}</td>
                          <td>{formatMoney(t.trade_amt)}</td>
                          <td>{t.total_to_rate || '-'}</td>
                          {compareDate && <td>{prev?.total_to_rate || '-'}</td>}
                          <td className={change.positive ? 'up' : 'down'}>{change.value} ({change.percent})</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App