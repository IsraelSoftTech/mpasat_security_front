import { useState, useEffect } from 'react'
import { API_BASE } from '../api'
import './SchoolTimes.css'

function hhmmTo12(hhmm) {
  if (!hhmm) return { hour: 8, minute: 0, ampm: 'AM' }
  const [h, m] = hhmm.split(':').map(Number)
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  const ampm = h < 12 ? 'AM' : 'PM'
  return { hour, minute: m || 0, ampm }
}

function to24Hour(hour, minute, ampm) {
  let h = Number(hour) || 8
  const m = Number(minute) || 0
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function SchoolTimes() {
  const [start12, setStart12] = useState({ hour: 8, minute: 0, ampm: 'AM' })
  const [end12, setEnd12] = useState({ hour: 3, minute: 0, ampm: 'PM' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/settings`)
      const data = await res.json()
      if (data.success && data.settings) {
        setStart12(hhmmTo12(data.settings.school_start_time || '08:00'))
        setEnd12(hhmmTo12(data.settings.school_end_time || '15:00'))
      }
    } catch {
      setMessage('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const st = to24Hour(start12.hour, start12.minute, start12.ampm)
    const et = to24Hour(end12.hour, end12.minute, end12.ampm)
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_start_time: st,
          school_end_time: et,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Settings saved successfully.')
      } else {
        setMessage(data.message || 'Failed to save')
      }
    } catch {
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="school-times-loading">Loading...</div>
  }

  return (
    <div className="school-times">
      <div className="school-times-header">
        <h2>School Times</h2>
        <p>Set start and end times for attendance. Students scan twice daily: arrival and departure.</p>
      </div>

      <form className="school-times-form" onSubmit={handleSubmit}>
        {message && (
          <div className={`school-times-message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="form-row">
          <div className="form-field">
            <label>School Start Time</label>
            <div className="time-picker">
              <select
                value={start12.hour}
                onChange={(e) => setStart12((s) => ({ ...s, hour: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="time-sep">:</span>
              <select
                value={start12.minute}
                onChange={(e) => setStart12((s) => ({ ...s, minute: Number(e.target.value) }))}
              >
                {Array.from({ length: 60 }, (_, n) => (
                  <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
                ))}
              </select>
              <select
                value={start12.ampm}
                onChange={(e) => setStart12((s) => ({ ...s, ampm: e.target.value }))}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            <span className="field-hint">Students arriving after this time are marked late.</span>
          </div>
          <div className="form-field">
            <label>School End Time</label>
            <div className="time-picker">
              <select
                value={end12.hour}
                onChange={(e) => setEnd12((s) => ({ ...s, hour: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="time-sep">:</span>
              <select
                value={end12.minute}
                onChange={(e) => setEnd12((s) => ({ ...s, minute: Number(e.target.value) }))}
              >
                {Array.from({ length: 60 }, (_, n) => (
                  <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
                ))}
              </select>
              <select
                value={end12.ampm}
                onChange={(e) => setEnd12((s) => ({ ...s, ampm: e.target.value }))}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            <span className="field-hint">Students scan again at departure (closing time).</span>
          </div>
        </div>

        <div className="school-times-info">
          <h4>How it works</h4>
          <ul>
            <li><strong>Arrival:</strong> First scan of the day. Before start time = Present; after = Late (minutes late recorded).</li>
            <li><strong>Departure:</strong> Second scan of the day (at closing).</li>
            <li>Each student can scan only twice per day for a clear daily report.</li>
          </ul>
        </div>

        <button type="submit" className="submit-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}

export default SchoolTimes
