import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import idBg from '../assets/id.png'
import './IdCard.css'

const SCHOOL_NAME = 'MBAKWA PHOSPHATE ACADEMY OF SCIENCE, ARTS AND TECHNOLOGY - ST.LOUIS JUNIOR ACADEMY'

function IdCard({ student, cardRef }) {
  return (
    <div
      ref={cardRef}
      className="id-card"
      data-student-id={student?.student_id}
      style={{ width: 1000, height: 641, '--id-bg': `url(${idBg})` }}
    >
      <div className="id-card-inner">
        <div className="id-card-top">
          <div className="id-card-photo-wrap">
            {student?.photo ? (
              <img src={student.photo} alt={student.name} className="id-card-photo" />
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
            <div className="id-card-name">{student?.name || '—'}</div>
            <div className="id-card-position">Student</div>
            <div className="id-card-row">
              <span className="id-card-label">ID No:</span>
              <span className="id-card-value">{student?.student_id || '—'}</span>
            </div>
            <div className="id-card-row">
              <span className="id-card-label">Class:</span>
              <span className="id-card-value">{student?.class || '—'}</span>
            </div>
            <div className="id-card-row">
              <span className="id-card-label">Parent Phone:</span>
              <span className="id-card-value">{student?.parent_phone || '—'}</span>
            </div>
          </div>
          {student?.qr_code && (
            <div className="id-card-qr-wrap">
              <img src={student.qr_code} alt={`QR for ${student.student_id}`} className="id-card-qr" />
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

export function IdCardPreview({ student }) {
  const cardRef = useRef(null)
  return <IdCard student={student} cardRef={cardRef} />
}

export async function captureCardAsImage(cardElement) {
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

export async function downloadCardAsImage(cardElement, studentId) {
  const dataUrl = await captureCardAsImage(cardElement)
  if (!dataUrl) return
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `id-card-${studentId}.png`
  link.click()
}

export async function downloadCardsAsPdf(cardElements) {
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

    const dataUrl = await captureCardAsImage(cardElements[i])
    doc.addImage(dataUrl, 'PNG', x, y, imgW, imgH)
  }

  doc.save('student-id-cards.pdf')
}

export default IdCard
