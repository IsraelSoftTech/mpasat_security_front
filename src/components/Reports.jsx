import { useState, useEffect } from 'react'
import { useAcademicYear } from '../context/AcademicYearContext'
import { API_BASE } from '../api'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import './Reports.css'

function Reports() {
  const { selectedYearId } = useAcademicYear()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReport()
  }, [date, selectedYearId])

  async function fetchReport() {
    setLoading(true)
    setError('')
    const yearParam = selectedYearId ? `&academic_year_id=${selectedYearId}` : ''
    try {
      const res = await fetch(`${API_BASE}/api/attendance/report?date=${date}${yearParam}`)
      const data = await res.json()
      if (data.success) setReport(data)
      else setError(data.message || 'Failed to load')
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  function exportPDF() {
    if (!report) return

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Attendance Report', 14, 20)
    doc.setFontSize(11)
    doc.text(`Date: ${report.date}`, 14, 28)

    doc.setFontSize(10)
    doc.text(`Present: ${report.present} | Late: ${report.late} | Absent: ${report.absent} | Total: ${report.total}`, 14, 36)

    doc.setFontSize(12)
    doc.text('Check-ins', 14, 46)
    doc.setFontSize(9)

    const headers = ['Student ID', 'Name', 'Class', 'Arrival', 'Departure', 'Status', 'Min Late']
    const rows = report.entries.map((e) => [
      e.student_id,
      e.name,
      e.class,
      String(e.arrival || '').slice(0, 5),
      String(e.departure || '').slice(0, 5),
      e.status,
      e.minutes_late != null ? String(e.minutes_late) : '—',
    ])

    doc.autoTable({
      startY: 50,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8 },
    })

    let finalY = doc.lastAutoTable.finalY || 50
    if (report.absentStudents?.length > 0) {
      finalY += 10
      doc.setFontSize(12)
      doc.text('Absent', 14, finalY)
      finalY += 6
      doc.setFontSize(9)
      report.absentStudents.slice(0, 40).forEach((s, i) => {
        doc.text(`${s.student_id} - ${s.name} (${s.class})`, 14, finalY + i * 5)
      })
    }

    doc.save(`attendance-report-${report.date}.pdf`)
  }

  function exportExcel() {
    if (!report) return

    const wsData = [
      ['Attendance Report', report.date],
      [],
      ['Present', report.present, 'Late', report.late, 'Absent', report.absent, 'Total', report.total],
      [],
      ['Student ID', 'Name', 'Class', 'Arrival', 'Departure', 'Status', 'Min Late'],
      ...report.entries.map((e) => [
        e.student_id,
        e.name,
        e.class,
        String(e.arrival || '').slice(0, 5),
        String(e.departure || '').slice(0, 5),
        e.status,
        e.minutes_late != null ? String(e.minutes_late) : '—',
      ]),
    ]

    if (report.absentStudents?.length > 0) {
      wsData.push([])
      wsData.push(['Absent Students'])
      wsData.push(['Student ID', 'Name', 'Class'])
      report.absentStudents.forEach((s) => {
        wsData.push([s.student_id, s.name, s.class])
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `attendance-report-${report.date}.xlsx`)
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2>Attendance Reports</h2>
        <p>Generate and export daily attendance reports</p>
      </div>

      <div className="reports-toolbar">
        <div className="report-date">
          <label htmlFor="report-date">Date</label>
          <input
            id="report-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="report-actions">
          <button
            type="button"
            className="btn-export btn-pdf"
            onClick={exportPDF}
            disabled={!report || loading}
          >
            Export PDF
          </button>
          <button
            type="button"
            className="btn-export btn-excel"
            onClick={exportExcel}
            disabled={!report || loading}
          >
            Export Excel
          </button>
        </div>
      </div>

      {error && <div className="reports-error">{error}</div>}

      {loading ? (
        <div className="reports-loading">Loading...</div>
      ) : report ? (
        <div className="report-summary">
          <div className="summary-cards">
            <div className="summary-card present">
              <span className="value">{report.present}</span>
              <span className="label">Present</span>
            </div>
            <div className="summary-card late">
              <span className="value">{report.late}</span>
              <span className="label">Late</span>
            </div>
            <div className="summary-card absent">
              <span className="value">{report.absent}</span>
              <span className="label">Absent</span>
            </div>
            <div className="summary-card total">
              <span className="value">{report.total}</span>
              <span className="label">Total</span>
            </div>
          </div>

          <div className="report-tables">
            <div className="report-section">
              <h3>Check-ins ({report.entries.length})</h3>
              {report.entries.length === 0 ? (
                <p className="empty">No check-ins for this date.</p>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Arrival</th>
                      <th>Departure</th>
                      <th>Status</th>
                      <th>Min Late</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.entries.map((e) => (
                      <tr key={e.student_id}>
                        <td>{e.student_id}</td>
                        <td>{e.name}</td>
                        <td>{e.class}</td>
                        <td>{String(e.arrival || '').slice(0, 5)}</td>
                        <td>{String(e.departure || '').slice(0, 5)}</td>
                        <td>
                          <span className={`status-badge ${e.status}`}>
                            {e.status === 'late' ? 'Late' : 'Present'}
                          </span>
                        </td>
                        <td>{e.minutes_late != null ? e.minutes_late : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {report.absentStudents?.length > 0 && (
              <div className="report-section">
                <h3>Absent ({report.absentStudents.length})</h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.absentStudents.map((s) => (
                      <tr key={s.student_id}>
                        <td>{s.student_id}</td>
                        <td>{s.name}</td>
                        <td>{s.class}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Reports
