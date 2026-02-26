import { useState, useEffect } from 'react'
import { IconEdit, IconTrash } from './Icons'
import { API_BASE } from '../api'
import './ManageClasses.css'

function ManageClasses() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingClass, setEditingClass] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', code: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeTab, setActiveTab] = useState('create')

  useEffect(() => {
    fetchClasses()
  }, [])

  async function fetchClasses() {
    try {
      const res = await fetch(`${API_BASE}/api/classes`)
      const data = await res.json()
      if (data.success) setClasses(data.classes)
    } catch {
      setError('Failed to load classes')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API_BASE}/api/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess('Class created successfully')
        setName('')
        setCode('')
        setClasses((c) => [...c, data.class])
      } else {
        setError(data.message || 'Failed to create class')
      }
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(cls) {
    setEditingClass(cls)
    setEditForm({ name: cls.name, code: cls.code })
    setError('')
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingClass) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          code: editForm.code.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setClasses((c) => c.map((cls) => (cls.id === editingClass.id ? data.class : cls)))
        setEditingClass(null)
        setEditForm({ name: '', code: '' })
      } else {
        setError(data.message || 'Failed to update')
      }
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteClick(cls) {
    setDeleteConfirm(cls)
    setError('')
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/classes/${deleteConfirm.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setClasses((c) => c.filter((cls) => cls.id !== deleteConfirm.id))
        setDeleteConfirm(null)
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
        <h2>Manage Classes</h2>
        <p>Create classes by entering class name and code</p>
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
          Created Classes ({classes.length})
        </button>
      </div>

      {activeTab === 'create' && (
      <form className="class-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="class-name">Class Name</label>
            <input
              id="class-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 10A"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="class-code">Class Code</label>
            <input
              id="class-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. G10A"
              required
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Creating...' : 'Create Class'}
        </button>
      </form>
      )}

      {activeTab === 'created' && (
      <div className="classes-table-section">
        <h3>Classes ({classes.length})</h3>
        {classes.length === 0 ? (
          <p className="list-empty">No classes yet. Create one above.</p>
        ) : (
          <div className="classes-table-wrap">
            <table className="classes-table">
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Class Code</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td><span className="class-name-cell">{c.name}</span></td>
                    <td><span className="class-code-cell">{c.code}</span></td>
                    <td className="td-actions">
                      <button
                        type="button"
                        className="btn-icon btn-edit"
                        onClick={() => handleEdit(c)}
                        title="Edit class"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-delete"
                        onClick={() => handleDeleteClick(c)}
                        title="Delete class"
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

      {editingClass && (
        <div className="modal-overlay" onClick={() => setEditingClass(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Class</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-field">
                <label>Class Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Grade 10A"
                  required
                />
              </div>
              <div className="form-field">
                <label>Class Code</label>
                <input
                  value={editForm.code}
                  onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. G10A"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingClass(null)}>
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
            <h3>Delete Class?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> (Code:{' '}
              {deleteConfirm.code})? This action cannot be undone.
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

export default ManageClasses
