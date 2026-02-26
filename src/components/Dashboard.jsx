import { useState, useEffect } from 'react'
import { useAcademicYear } from '../context/AcademicYearContext'
import './Dashboard.css'

function Dashboard() {
  const { selectedYearId } = useAcademicYear()
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 })
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [selectedYearId])

  async function fetchData() {
    try {
      const url = selectedYearId
        ? `/api/attendance/stats?academic_year_id=${selectedYearId}`
        : '/api/attendance/stats'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setStats({
          present: data.present,
          late: data.late,
          absent: data.absent,
        })
        setEntries(data.entries || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function formatTime(t) {
    if (!t) return '—'
    return typeof t === 'string' ? t.slice(0, 5) : t
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p className="dashboard-subtitle">Real-time monitoring · Today</p>
      </header>

      {loading ? (
        <div className="dashboard-loading">Loading...</div>
      ) : (
        <>
          <section className="dashboard-stats">
            <div className="stat-card stat-present">
              <span className="stat-value">{stats.present}</span>
              <span className="stat-label">Present</span>
            </div>
            <div className="stat-card stat-late">
              <span className="stat-value">{stats.late}</span>
              <span className="stat-label">Late</span>
            </div>
            <div className="stat-card stat-absent">
              <span className="stat-value">{stats.absent}</span>
              <span className="stat-label">Absent</span>
            </div>
          </section>

          <section className="dashboard-section">
            <h2>Entry Log</h2>
            <div className="entry-log">
              {entries.length === 0 ? (
                <p className="entry-log-empty">No entries yet today.</p>
              ) : (
                <div className="entry-log-list">
                  {entries.map((e) => (
                    <div key={e.id} className="entry-log-item">
                      <span className="entry-time">{formatTime(e.check_in_time)}</span>
                      <span className="entry-name">{e.name}</span>
                      <span className="entry-class">{e.class}</span>
                      <span className="entry-type">{e.check_in_type === 'departure' ? 'Departure' : 'Arrival'}</span>
                      <span className={`entry-status ${e.status}`}>
                        {e.check_in_type === 'arrival'
                          ? (e.status === 'late' ? `Late (${e.minutes_late || 0} min)` : 'Present')
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default Dashboard
