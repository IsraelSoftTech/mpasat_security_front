import { useState, useEffect, useRef } from 'react'
import { IconEdit, IconTrash, IconDownload } from './Icons'
import IdCard, { downloadCardAsImage, downloadCardsAsPdf } from './IdCard'
import { useAcademicYear } from '../context/AcademicYearContext'
import { API_BASE } from '../api'
import './RegisterStudents.css'

const PHONE_REGEX = /^\d{9,15}$/

function IdCardsSection({ students, classes }) {
  const cardRefs = useRef({})
  const [filterClass, setFilterClass] = useState('')
  const [downloading, setDownloading] = useState(false)

  const filtered = filterClass
    ? students.filter((s) => s.class === filterClass)
    : students

  async function handleDownloadOne(student) {
    const el = cardRefs.current[student.id]
    if (el) await downloadCardAsImage(el, student.student_id)
  }

  async function handleDownloadClass() {
    if (!filterClass) return
    const toDownload = students.filter((s) => s.class === filterClass)
    await handleDownloadAll(toDownload)
  }

  async function handleDownloadAll(studentsToUse = students) {
    setDownloading(true)
    try {
      const refs = studentsToUse
        .map((s) => cardRefs.current[s.id])
        .filter(Boolean)
      if (refs.length) await downloadCardsAsPdf(refs)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="id-cards-section">
      <div className="id-cards-toolbar">
        <div className="id-cards-filter">
          <label htmlFor="id-card-class">Filter by class</label>
          <select
            id="id-card-class"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
        <div className="id-cards-actions">
          <button
            type="button"
            className="btn-download-class"
            onClick={handleDownloadClass}
            disabled={!filterClass || downloading}
          >
            {downloading ? 'Preparing...' : `Download ${filterClass || 'Class'} (PDF)`}
          </button>
          <button
            type="button"
            className="btn-download-all"
            onClick={() => handleDownloadAll(filtered)}
            disabled={filtered.length === 0 || downloading}
          >
            {downloading ? 'Preparing...' : `Download All (${filtered.length}) PDF`}
          </button>
        </div>
      </div>
      {students.length === 0 ? (
        <p className="list-empty">No students registered. Add students first.</p>
      ) : (
        <div className="id-cards-grid">
          {filtered.map((s) => (
            <div key={s.id} className="id-card-wrapper">
              <div className="id-card-scaled">
                <IdCard student={s} cardRef={(el) => { cardRefs.current[s.id] = el }} />
              </div>
              <div className="id-card-actions">
                <button
                  type="button"
                  className="btn-download-one"
                  onClick={() => handleDownloadOne(s)}
                >
                  <IconDownload /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RegisterStudents() {
  const { selectedYearId, selectedYear } = useAcademicYear()
  const [form, setForm] = useState({
    name: '',
    formClass: '',
    parent_phone: '',
    photo: null,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [successStudent, setSuccessStudent] = useState(null)
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [fetchError, setFetchError] = useState('')
  const [editingStudent, setEditingStudent] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeTab, setActiveTab] = useState('register')

  useEffect(() => {
    fetchStudents()
    fetchClasses()
  }, [selectedYearId])

  async function fetchStudents() {
    try {
      const url = selectedYearId
        ? `${API_BASE}/api/students?academic_year_id=${selectedYearId}`
        : `${API_BASE}/api/students`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) setStudents(data.students)
    } catch {
      setFetchError('Failed to load students')
    }
  }

  async function fetchClasses() {
    try {
      const res = await fetch(`${API_BASE}/api/classes`)
      const data = await res.json()
      if (data.success) setClasses(data.classes)
    } catch {
      // ignore
    }
  }

  function handleChange(e) {
    const { name, value, type, files } = e.target
    if (type === 'file') {
      const file = files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => setForm((f) => ({ ...f, photo: reader.result }))
        reader.readAsDataURL(file)
      } else {
        setForm((f) => ({ ...f, photo: null }))
      }
    } else {
      const key = name === 'class' ? 'formClass' : name
      let val = value
      if (name === 'parent_phone') val = value.replace(/\D/g, '')
      setForm((f) => ({ ...f, [key]: val }))
    }
    setErrors((e) => ({ ...e, [name]: '' }))
  }

  function validate() {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.formClass.trim()) newErrors.class = 'Class is required'
    if (!form.parent_phone.trim()) {
      newErrors.parent_phone = 'Parent phone is required'
    } else if (!PHONE_REGEX.test(form.parent_phone)) {
      newErrors.parent_phone = 'Phone must be 9–15 digits (e.g. 675644383)'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setSuccessStudent(null)

    try {
      const res = await fetch(`${API_BASE}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          class: form.formClass.trim(),
          parent_phone: form.parent_phone,
          photo: form.photo,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccessStudent(data.student)
        setStudents((s) => [data.student, ...s])
        setForm({ name: '', formClass: '', parent_phone: '', photo: null })
      } else {
        setErrors({ submit: data.message })
      }
    } catch {
      setErrors({ submit: 'Connection failed. Is the server running?' })
    } finally {
      setLoading(false)
    }
  }

  function handleAddAnother() {
    setSuccessStudent(null)
  }

  function handleEdit(student) {
    setEditingStudent(student)
    setEditForm({
      name: student.name,
      formClass: student.class,
      parent_phone: student.parent_phone,
      photo: student.photo,
    })
  }

  function handleEditChange(e) {
    const { name, value, type, files } = e.target
    if (type === 'file') {
      const file = files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => setEditForm((f) => ({ ...f, photo: reader.result }))
        reader.readAsDataURL(file)
      } else {
        setEditForm((f) => ({ ...f, photo: editingStudent?.photo ?? null }))
      }
      return
    }
    const key = name === 'class' ? 'formClass' : name
    let val = value
    if (name === 'parent_phone') val = value.replace(/\D/g, '')
    setEditForm((f) => ({ ...f, [key]: val }))
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingStudent || !editForm) return
    const phoneDigits = editForm.parent_phone.replace(/\D/g, '')
    if (phoneDigits.length < 9 || phoneDigits.length > 15) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          class: editForm.formClass.trim(),
          parent_phone: editForm.parent_phone,
          photo: editForm.photo,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStudents((s) => s.map((st) => (st.id === editingStudent.id ? data.student : st)))
        setEditingStudent(null)
        setEditForm(null)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteClick(student) {
    setDeleteConfirm(student)
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/students/${deleteConfirm.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setStudents((s) => s.filter((st) => st.id !== deleteConfirm.id))
        setDeleteConfirm(null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-students">
      <div className="register-header">
        <h2>Register Students</h2>
        <p>Add new students and generate unique QR codes for attendance</p>
      </div>

      <div className="register-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          Register
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          List ({students.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'idcard' ? 'active' : ''}`}
          onClick={() => setActiveTab('idcard')}
        >
          ID Card
        </button>
      </div>

      {activeTab === 'register' && (
      <div className="register-content">
        <form className="register-form" onSubmit={handleSubmit}>
          {errors.submit && <div className="form-error">{errors.submit}</div>}

          <p className="field-hint" style={{ marginBottom: '1rem' }}>
            Student ID is auto-generated (e.g. MPASAT2601) based on the active academic year.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className={errors.name ? 'invalid' : ''}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="class">Class *</label>
              <select
                id="class"
                name="class"
                value={form.formClass}
                onChange={handleChange}
                className={errors.class ? 'invalid' : ''}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.code})
                  </option>
                ))}
                {form.formClass && !classes.some((c) => c.name === form.formClass) && (
                  <option value={form.formClass}>{form.formClass}</option>
                )}
              </select>
              {errors.class && <span className="field-error">{errors.class}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="parent_phone">Parent Phone *</label>
              <input
                id="parent_phone"
                name="parent_phone"
                type="tel"
                value={form.parent_phone}
                onChange={handleChange}
                placeholder="e.g. 675644383"
                maxLength={15}
                className={errors.parent_phone ? 'invalid' : ''}
              />
              {errors.parent_phone && <span className="field-error">{errors.parent_phone}</span>}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="photo">Photo (optional)</label>
            <div className="photo-upload">
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="photo-input"
              />
              <div className="photo-preview">
                {form.photo ? (
                  <>
                    <img src={form.photo} alt="Preview" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, photo: null }))}>
                      Remove
                    </button>
                  </>
                ) : (
                  <span>No photo selected</span>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Register Student'}
          </button>
        </form>

        {successStudent && (
          <div className="success-card">
            <div className="success-header">
              <span className="success-badge">Registered</span>
              <h3>{successStudent.name}</h3>
              <p>Student ID: {successStudent.student_id} · {successStudent.class}</p>
            </div>
            <div className="qr-display">
              <img src={successStudent.qr_code} alt={`QR for ${successStudent.student_id}`} />
              <p>Unique QR Code</p>
            </div>
            <div className="success-actions">
              <button
                type="button"
                className="btn-download"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = successStudent.qr_code
                  link.download = `qr-${successStudent.student_id}.png`
                  link.click()
                }}
              >
                Download QR
              </button>
              <button type="button" className="btn-another" onClick={handleAddAnother}>
                Add Another Student
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {activeTab === 'idcard' && (
      <IdCardsSection
        students={students}
        classes={classes}
      />
      )}

      {activeTab === 'list' && (
      <div className="students-list-section">
        <h3>Registered Students ({students.length})</h3>
        {fetchError && <p className="list-error">{fetchError}</p>}
        {classes.length === 0 && (
          <p className="list-hint">Create classes in Manage System → Class first.</p>
        )}
        {students.length === 0 && !fetchError && (
          <p className="list-empty">No students registered yet.</p>
        )}
        {students.length > 0 && (
          <div className="students-table-wrap">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Picture</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Parent Phone</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="td-picture">
                      {s.photo ? (
                        <img src={s.photo} alt={s.name} className="student-photo" />
                      ) : (
                        <div className="student-photo-placeholder">—</div>
                      )}
                    </td>
                    <td>{s.student_id}</td>
                    <td>{s.name}</td>
                    <td>{s.class}</td>
                    <td>{s.parent_phone}</td>
                    <td className="td-actions">
                      <button
                        type="button"
                        className="btn-icon btn-download-qr"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = s.qr_code
                          link.download = `qr-${s.student_id}.png`
                          link.click()
                        }}
                        title="Download QR Code"
                      >
                        <IconDownload />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-edit"
                        onClick={() => handleEdit(s)}
                        title="Edit"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-delete"
                        onClick={() => handleDeleteClick(s)}
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

      {editingStudent && editForm && (
        <div className="modal-overlay" onClick={() => setEditingStudent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Student</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-field">
                <label>Student ID</label>
                <p className="readonly-value">{editingStudent.student_id}</p>
              </div>
              <div className="form-field">
                <label>Name</label>
                <input
                  value={editForm.name}
                  onChange={handleEditChange}
                  name="name"
                  required
                />
              </div>
              <div className="form-field">
                <label>Class</label>
                <select
                  value={editForm.formClass}
                  onChange={handleEditChange}
                  name="class"
                  required
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                  {editForm.formClass && !classes.some((c) => c.name === editForm.formClass) && (
                    <option value={editForm.formClass}>{editForm.formClass}</option>
                  )}
                </select>
              </div>
              <div className="form-field">
                <label>Parent Phone</label>
                <input
                  value={editForm.parent_phone}
                  onChange={handleEditChange}
                  name="parent_phone"
                  placeholder="675644383"
                  maxLength={15}
                  required
                />
              </div>
              <div className="form-field">
                <label>Photo</label>
                <div className="photo-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditChange}
                    name="photo"
                    className="photo-input"
                  />
                  <div className="photo-preview">
                    {editForm.photo ? (
                      <>
                        <img src={editForm.photo} alt="Preview" />
                        <button
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, photo: null }))}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span>No photo</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingStudent(null)}>
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
            <h3>Delete Student?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> (ID:{' '}
              {deleteConfirm.student_id})? This action cannot be undone.
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

export default RegisterStudents
