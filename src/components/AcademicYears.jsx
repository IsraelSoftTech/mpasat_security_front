import { useState, useEffect } from 'react'
import { IconEdit, IconTrash } from './Icons'
import { useAcademicYear } from '../context/AcademicYearContext'
import { API_BASE } from '../api'
import './ManageClasses.css'

function AcademicYears() {
  const { fetchYears } = useAcademicYear()
  const [years, setYears] = useState([])
  const [name, setName] = useState('')
  const [startYear, setStartYear] = useState('')
  const [endYear, setEndYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingYear, setEditingYear] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', start_year: '', end_year: '', status: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeTab, setActiveTab] = useState('create')

  useEffect(() => {
    fetchYears()
  }, [])

  useEffect(() => {
    loadYears()
  }, [])

  async function loadYears() {
    try {
      const res = await fetch(`${API_BASE}/api/academic-years`)
      const data = await res.json()
      if (data.success) setYears(data.academic_years || [])
    } catch {
      setError('Failed to load academic years')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const sy = parseInt(startYear, 10)
    const ey = parseInt(endYear, 10)
    if (!name.trim() || isNaN(sy) || isNaN(ey) || sy >= ey) {
      setError('Invalid input. Name required, start year must be less than end year.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API_BASE}/api/academic-years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          start_year: sy,
          end_year: ey,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess('Academic year created successfully')
        setName('')
        setStartYear('')
        setEndYear('')
        setYears((y) => [...y, data.academic_year])
        fetchYears()
      } else {
        setError(data.message || 'Failed to create')
      }
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(year) {
    setEditingYear(year)
    setEditForm({
      name: year.name,
      start_year: String(year.start_year),
      end_year: String(year.end_year),
      status: year.status,
    })
    setError('')
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingYear) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/academic-years/${editingYear.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          start_year: parseInt(editForm.start_year, 10),
          end_year: parseInt(editForm.end_year, 10),
          status: editForm.status,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setYears((y) => y.map((yr) => (yr.id === editingYear.id ? data.academic_year : yr)))
        setEditingYear(null)
        setEditForm({ name: '', start_year: '', end_year: '', status: '' })
        fetchYears()
      } else {
        setError(data.message || 'Failed to update')
      }
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteClick(year) {
    setDeleteConfirm(year)
    setError('')
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/academic-years/${deleteConfirm.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setYears((y) => y.filter((yr) => yr.id !== deleteConfirm.id))
        setDeleteConfirm(null)
        fetchYears()
      } else {
        setError(data.message || 'Failed to delete')
      }
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="manage-classes">
      <div className="manage-classes-header">
        <h2>Academic Year</h2>
        <p>Create and manage academic years. Set one as active for new registrations.</p>
      </div>

      <div className="manage-classes-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'created' ? 'active' : ''}`}
          onClick={() => setActiveTab('created')}
        >
          Academic Years ({years.length})
        </button>
      </div>

      {activeTab === 'create' && (
        <form className="class-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="year-name">Name</label>
              <input
                id="year-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2025/2026"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="start-year">Start Year</label>
              <input
                id="start-year"
                type="number"
                min="2000"
                max="2100"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                placeholder="e.g. 2025"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="end-year">End Year</label>
              <input
                id="end-year"
                type="number"
                min="2000"
                max="2100"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                placeholder="e.g. 2026"
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create Academic Year'}
          </button>
        </form>
      )}

      {activeTab === 'created' && (
        <div className="classes-table-section">
          <h3>Academic Years ({years.length})</h3>
          {years.length === 0 ? (
            <p className="list-empty">No academic years yet. Create one above.</p>
          ) : (
            <div className="classes-table-wrap">
              <table className="classes-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Years</th>
                    <th>Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.id}>
                      <td><span className="class-name-cell">{y.name}</span></td>
                      <td>{y.start_year} – {y.end_year}</td>
                      <td>
                        <span className={`status-badge ${y.status}`}>
                          {y.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="td-actions">
                        <button
                          type="button"
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(y)}
                          title="Edit"
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteClick(y)}
                          title="Delete"
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editingYear && (
        <div className="modal-overlay" onClick={() => setEditingYear(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Academic Year</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-field">
                <label>Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="2025/2026"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Start Year</label>
                  <input
                    type="number"
                    value={editForm.start_year}
                    onChange={(e) => setEditForm((f) => ({ ...f, start_year: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>End Year</label>
                  <input
                    type="number"
                    value={editForm.end_year}
                    onChange={(e) => setEditForm((f) => ({ ...f, end_year: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="inactive">Inactive</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingYear(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3>Delete Academic Year?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteConfirm}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AcademicYears
