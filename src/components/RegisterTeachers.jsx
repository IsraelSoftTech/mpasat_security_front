import { useState, useEffect, useRef } from 'react'
import { IconEdit, IconTrash, IconDownload } from './Icons'
import TeacherIdCard, { downloadTeacherCardAsImage, downloadTeacherCardsAsPdf } from './TeacherIdCard'
import { useAcademicYear } from '../context/AcademicYearContext'
import './RegisterStudents.css'

const PHONE_REGEX = /^\d{9,15}$/

function TeacherIdCardsSection({ teachers }) {
  const cardRefs = useRef({})
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadOne(teacher) {
    const el = cardRefs.current[teacher.id]
    if (el) await downloadTeacherCardAsImage(el, teacher.teacher_id)
  }

  async function handleDownloadAll() {
    setDownloading(true)
    try {
      const refs = teachers
        .map((t) => cardRefs.current[t.id])
        .filter(Boolean)
      if (refs.length) await downloadTeacherCardsAsPdf(refs)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="id-cards-section">
      <div className="id-cards-toolbar">
        <div className="id-cards-actions">
          <button
            type="button"
            className="btn-download-all"
            onClick={() => handleDownloadAll()}
            disabled={teachers.length === 0 || downloading}
          >
            {downloading ? 'Preparing...' : `Download All (${teachers.length}) PDF`}
          </button>
        </div>
      </div>
      {teachers.length === 0 ? (
        <p className="list-empty">No teachers registered. Add teachers first.</p>
      ) : (
        <div className="id-cards-grid">
          {teachers.map((t) => (
            <div key={t.id} className="id-card-wrapper">
              <div className="id-card-scaled">
                <TeacherIdCard teacher={t} cardRef={(el) => { cardRefs.current[t.id] = el }} />
              </div>
              <div className="id-card-actions">
                <button
                  type="button"
                  className="btn-download-one"
                  onClick={() => handleDownloadOne(t)}
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

function RegisterTeachers() {
  const { selectedYearId } = useAcademicYear()
  const [form, setForm] = useState({
    name: '',
    id_card_number: '',
    phone: '',
    sex: '',
    photo: null,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [successTeacher, setSuccessTeacher] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [fetchError, setFetchError] = useState('')
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeTab, setActiveTab] = useState('register')

  useEffect(() => {
    fetchTeachers()
  }, [selectedYearId])

  async function fetchTeachers() {
    try {
      const url = selectedYearId
        ? `/api/teachers?academic_year_id=${selectedYearId}`
        : '/api/teachers'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) setTeachers(data.teachers)
    } catch {
      setFetchError('Failed to load teachers')
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
      let val = value
      if (name === 'phone') val = value.replace(/\D/g, '')
      setForm((f) => ({ ...f, [name]: val }))
    }
    setErrors((e) => ({ ...e, [name]: '' }))
  }

  function validate() {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.id_card_number.trim()) newErrors.id_card_number = 'ID card number is required'
    if (!form.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!PHONE_REGEX.test(form.phone)) {
      newErrors.phone = 'Phone must be 9–15 digits (e.g. 675644383)'
    }
    if (!form.sex.trim()) newErrors.sex = 'Sex is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setSuccessTeacher(null)

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          id_card_number: form.id_card_number.trim(),
          phone: form.phone,
          sex: form.sex.trim(),
          photo: form.photo,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccessTeacher(data.teacher)
        setTeachers((t) => [data.teacher, ...t])
        setForm({ name: '', id_card_number: '', phone: '', sex: '', photo: null })
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
    setSuccessTeacher(null)
  }

  function handleEdit(teacher) {
    setEditingTeacher(teacher)
    setEditForm({
      name: teacher.name,
      id_card_number: teacher.id_card_number,
      phone: teacher.phone,
      sex: teacher.sex,
      photo: teacher.photo,
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
        setEditForm((f) => ({ ...f, photo: editingTeacher?.photo ?? null }))
      }
      return
    }
    let val = value
    if (name === 'phone') val = value.replace(/\D/g, '')
    setEditForm((f) => ({ ...f, [name]: val }))
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editingTeacher || !editForm) return
    const phoneDigits = editForm.phone.replace(/\D/g, '')
    if (phoneDigits.length < 9 || phoneDigits.length > 15) return

    setLoading(true)
    try {
      const res = await fetch(`/api/teachers/${editingTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          id_card_number: editForm.id_card_number.trim(),
          phone: editForm.phone,
          sex: editForm.sex.trim(),
          photo: editForm.photo,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTeachers((t) => t.map((te) => (te.id === editingTeacher.id ? data.teacher : te)))
        setEditingTeacher(null)
        setEditForm(null)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteClick(teacher) {
    setDeleteConfirm(teacher)
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teachers/${deleteConfirm.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setTeachers((t) => t.filter((te) => te.id !== deleteConfirm.id))
        setDeleteConfirm(null)
      }
    } finally {
      setLoading(false)
    }
  }

  function formatDate(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString()
  }

  return (
    <div className="register-students">
      <div className="register-header">
        <h2>Register Teachers</h2>
        <p>Add teachers and generate unique ID cards with QR codes</p>
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
          List ({teachers.length})
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
              Teacher ID is auto-generated (e.g. MPATE2601) based on the active academic year.
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
                <label htmlFor="id_card_number">ID Card Number *</label>
                <input
                  id="id_card_number"
                  name="id_card_number"
                  type="text"
                  value={form.id_card_number}
                  onChange={handleChange}
                  placeholder="e.g. 123456789"
                  className={errors.id_card_number ? 'invalid' : ''}
                />
                {errors.id_card_number && <span className="field-error">{errors.id_card_number}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. 675644383"
                  maxLength={15}
                  className={errors.phone ? 'invalid' : ''}
                />
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="sex">Sex *</label>
                <select
                  id="sex"
                  name="sex"
                  value={form.sex}
                  onChange={handleChange}
                  className={errors.sex ? 'invalid' : ''}
                >
                  <option value="">Select sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.sex && <span className="field-error">{errors.sex}</span>}
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
              {loading ? 'Registering...' : 'Register Teacher'}
            </button>
          </form>

          {successTeacher && (
            <div className="success-card">
              <div className="success-header">
                <span className="success-badge">Registered</span>
                <h3>{successTeacher.name}</h3>
                <p>Teacher ID: {successTeacher.teacher_id} · Registered {formatDate(successTeacher.created_at)}</p>
              </div>
              <div className="qr-display">
                <img src={successTeacher.qr_code} alt={`QR for ${successTeacher.teacher_id}`} />
                <p>Unique QR Code</p>
              </div>
              <div className="success-actions">
                <button
                  type="button"
                  className="btn-download"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = successTeacher.qr_code
                    link.download = `qr-teacher-${successTeacher.teacher_id}.png`
                    link.click()
                  }}
                >
                  Download QR
                </button>
                <button type="button" className="btn-another" onClick={handleAddAnother}>
                  Add Another Teacher
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'idcard' && <TeacherIdCardsSection teachers={teachers} />}

      {activeTab === 'list' && (
        <div className="students-list-section">
          <h3>Registered Teachers ({teachers.length})</h3>
          {fetchError && <p className="list-error">{fetchError}</p>}
          {teachers.length === 0 && !fetchError && (
            <p className="list-empty">No teachers registered yet.</p>
          )}
          {teachers.length > 0 && (
            <div className="students-table-wrap">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Picture</th>
                    <th>Teacher ID</th>
                    <th>Name</th>
                    <th>ID Card No</th>
                    <th>Phone</th>
                    <th>Sex</th>
                    <th>Registered</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id}>
                      <td className="td-picture">
                        {t.photo ? (
                          <img src={t.photo} alt={t.name} className="student-photo" />
                        ) : (
                          <div className="student-photo-placeholder">—</div>
                        )}
                      </td>
                      <td>{t.teacher_id}</td>
                      <td>{t.name}</td>
                      <td>{t.id_card_number}</td>
                      <td>{t.phone}</td>
                      <td>{t.sex}</td>
                      <td>{formatDate(t.created_at)}</td>
                      <td className="td-actions">
                        <button
                          type="button"
                          className="btn-icon btn-download-qr"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = t.qr_code
                            link.download = `qr-teacher-${t.teacher_id}.png`
                            link.click()
                          }}
                          title="Download QR Code"
                        >
                          <IconDownload />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(t)}
                          title="Edit"
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteClick(t)}
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

      {editingTeacher && editForm && (
        <div className="modal-overlay" onClick={() => setEditingTeacher(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Teacher</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-field">
                <label>Teacher ID</label>
                <p className="readonly-value">{editingTeacher.teacher_id}</p>
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
                <label>ID Card Number</label>
                <input
                  value={editForm.id_card_number}
                  onChange={handleEditChange}
                  name="id_card_number"
                  required
                />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input
                  value={editForm.phone}
                  onChange={handleEditChange}
                  name="phone"
                  placeholder="675644383"
                  maxLength={15}
                  required
                />
              </div>
              <div className="form-field">
                <label>Sex</label>
                <select value={editForm.sex} onChange={handleEditChange} name="sex" required>
                  <option value="">Select sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
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
                <button type="button" onClick={() => setEditingTeacher(null)}>
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
            <h3>Delete Teacher?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> (ID:{' '}
              {deleteConfirm.teacher_id})? This action cannot be undone.
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

export default RegisterTeachers
