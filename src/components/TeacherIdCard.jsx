import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import idBg from '../assets/id.png'
import './IdCard.css'

const SCHOOL_NAME = 'MBAKWA PHOSPHATE ACADEMY OF SCIENCE, ARTS AND TECHNOLOGY - ST.LOUIS JUNIOR ACADEMY'

function TeacherIdCard({ teacher, cardRef }) {
  return (
    <div
      ref={cardRef}
      className="id-card teacher-id-card"
      data-teacher-id={teacher?.teacher_id}
      style={{ width: 1000, height: 641, '--id-bg': `url(${idBg})` }}
    >
      <div className="id-card-inner">
        <div className="id-card-top">
          <div className="id-card-photo-wrap">
            {teacher?.photo ? (
              <img src={teacher.photo} alt={teacher.name} className="id-card-photo" />
            ) : (
              <div className="id-card-photo-placeholder">
                <span>No Photo</span>
              </div>
            )}
          </div>
          <div className="id-card-logo">{SCHOOL_NAME}</div>
        </div>
        <div className="id-card-bottom">
          <div className="id-card-info">
            <div className="id-card-name">{teacher?.name || '—'}</div>
            <div className="id-card-position">Teacher</div>
            <div className="id-card-row">
              <span className="id-card-label">ID No:</span>
              <span className="id-card-value">{teacher?.teacher_id || '—'}</span>
            </div>
            <div className="id-card-row">
              <span className="id-card-label">ID Card No:</span>
              <span className="id-card-value">{teacher?.id_card_number || '—'}</span>
            </div>
            <div className="id-card-row">
              <span className="id-card-label">Phone:</span>
              <span className="id-card-value">{teacher?.phone || '—'}</span>
            </div>
            <div className="id-card-row">
              <span className="id-card-label">Sex:</span>
              <span className="id-card-value">{teacher?.sex || '—'}</span>
            </div>
          </div>
          {teacher?.qr_code && (
            <div className="id-card-qr-wrap">
              <img src={teacher.qr_code} alt={`QR for ${teacher.teacher_id}`} className="id-card-qr" />
            </div>
          )}
        </div>
        <div className="id-card-footer">
          <span className="id-card-signature">Authorize Signature</span>
        </div>
      </div>
    </div>
  )
}

export async function captureTeacherCardAsImage(cardElement) {
  if (!cardElement) return null
  const clone = cardElement.cloneNode(true)
  clone.style.position = 'absolute'
  clone.style.left = '-9999px'
  clone.style.top = '0'
  clone.style.width = '1000px'
  clone.style.height = '641px'
  clone.style.transform = 'none'
  document.body.appendChild(clone)
  try {
    const canvas = await html2canvas(clone, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1000,
      height: 641,
    })
    return canvas.toDataURL('image/png')
  } finally {
    document.body.removeChild(clone)
  }
}

export async function downloadTeacherCardAsImage(cardElement, teacherId) {
  const dataUrl = await captureTeacherCardAsImage(cardElement)
  if (!dataUrl) return
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `id-card-teacher-${teacherId}.png`
  link.click()
}

export async function downloadTeacherCardsAsPdf(cardElements) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const margin = 3
  const pageW = 210 - margin * 2
  const pageH = 297 - margin * 2
  const cardsPerPage = 8
  const cols = 2
  const rows = 4
  const cardW = pageW / cols
  const cardH = pageH / rows
  const pxToMm = 25.4 / 96
  const cardMmW = 1000 * pxToMm
  const cardMmH = 641 * pxToMm
  const scale = Math.min(cardW / cardMmW, cardH / cardMmH)
  const imgW = cardMmW * scale
  const imgH = cardMmH * scale

  for (let i = 0; i < cardElements.length; i++) {
    if (i > 0 && i % cardsPerPage === 0) doc.addPage()
    const col = i % cols
    const row = Math.floor((i % cardsPerPage) / cols)
    const x = margin + col * cardW
    const y = margin + row * cardH

    const dataUrl = await captureTeacherCardAsImage(cardElements[i])
    doc.addImage(dataUrl, 'PNG', x, y, imgW, imgH)
  }

  doc.save('teacher-id-cards.pdf')
}

export default TeacherIdCard
