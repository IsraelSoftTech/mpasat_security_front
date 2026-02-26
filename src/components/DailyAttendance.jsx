import { useState, useEffect } from 'react'
import { useAcademicYear } from '../context/AcademicYearContext'
import './DailyAttendance.css'

function DailyAttendance() {
  const { selectedYearId } = useAcademicYear()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [date, selectedYearId])

  async function fetchData() {
    setLoading(true)
    setError('')
    const yearParam = selectedYearId ? `&academic_year_id=${selectedYearId}` : ''
    try {
      const [statsRes, entriesRes] = await Promise.all([
        fetch(`/api/attendance/stats?date=${date}${yearParam}`),
        fetch(`/api/attendance/entries?date=${date}${yearParam}`),
      ])
      const statsData = await statsRes.json()
      const entriesData = await entriesRes.json()

      if (statsData.success) {
        setStats({
          present: statsData.present,
          late: statsData.late,
          absent: statsData.absent,
          total: statsData.total,
        })
      }
      if (entriesData.success) {
        setEntries(entriesData.entries)
      }
    } catch {
      setError('Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  function formatTime(t) {
    if (!t) return '—'
    return typeof t === 'string' ? t.slice(0, 5) : t
  }

  async function handleDeleteAll() {
    setDeleting(true)
    try {
      const url = selectedYearId
        ? `/api/attendance/all?academic_year_id=${selectedYearId}`
        : '/api/attendance/all'
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeleteAllConfirm(false)
        fetchData()
      } else {
        setError(data.message || 'Failed to delete')
      }
    } catch {
      setError('Failed to delete attendance')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="daily-attendance">
      <div className="attendance-header">
        <h2>Daily Attendance</h2>
        <p>View and manage attendance records</p>
      </div>

      <div className="attendance-toolbar">
        <div className="attendance-date">
        <label htmlFor="att-date">Date</label>
        <input
          id="att-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        </div>
        <button
          type="button"
          className="btn-delete-all"
          onClick={() => setDeleteAllConfirm(true)}
          title="Delete all attendance records"
        >
          Delete All Records
        </button>
      </div>

      {error && <div className="attendance-error">{error}</div>}

      {loading ? (
        <div className="attendance-loading">Loading...</div>
      ) : (
        <>
          <div className="attendance-stats">
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
            <div className="stat-card stat-total">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>

          <div className="attendance-table-section">
            <h3>Entry Log ({entries.length})</h3>
            {entries.length === 0 ? (
              <p className="list-empty">No check-ins for this date.</p>
            ) : (
              <div className="attendance-table-wrap">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Type</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td>{e.person_id || e.student_id}</td>
                        <td>{e.name}</td>
                        <td>{e.class || '—'}</td>
                        <td>{e.check_in_type === 'departure' ? 'Departure' : 'Arrival'}</td>
                        <td>{formatTime(e.check_in_time)}</td>
                        <td>
                          {e.check_in_type === 'arrival' && e.status != null ? (
                            <span className={`status-badge ${e.status}`}>
                              {e.status === 'late' ? `Late (${e.minutes_late || 0} min)` : 'Present'}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {deleteAllConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteAllConfirm(false)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3>Delete All Attendance?</h3>
            <p>
              This will permanently delete <strong>all</strong> attendance records. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setDeleteAllConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteAll}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyAttendance
