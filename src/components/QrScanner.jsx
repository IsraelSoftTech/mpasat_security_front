import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { API_BASE } from '../api'
import './QrScanner.css'

function QrScanner() {
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const processingRef = useRef(false)
  const lastScannedRef = useRef({ id: null, time: 0, successBlock: false })
  const html5QrRef = useRef(null)
  const [successToast, setSuccessToast] = useState(null)

  useEffect(() => {
    return () => {
      if (html5QrRef.current?.isScanning) {
        html5QrRef.current.stop().catch(() => {})
      }
    }
  }, [])

  async function startScanner() {
    setError('')
    setLastResult(null)
    setScanning(true)

    await new Promise((r) => setTimeout(r, 100))

    try {
      const scanner = new Html5Qrcode('qr-reader')
      html5QrRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const id = decodedText.trim()
          const now = Date.now()
          if (processingRef.current) return
          const { id: lastId, time: lastTime, successBlock } = lastScannedRef.current
          if (lastId === id) {
            if (successBlock && now - lastTime < 60 * 60 * 1000) return
            if (!successBlock && now - lastTime < 1500) return
          }
          processingRef.current = true
          lastScannedRef.current = { id, time: now, successBlock: false }
          handleScan(id).finally(() => {
            processingRef.current = false
          })
        },
        () => {}
      )
    } catch (err) {
      setError(err.message || 'Could not access camera. Check permissions.')
      setScanning(false)
    }
  }

  async function stopScanner() {
    try {
      if (html5QrRef.current?.isScanning) {
        await html5QrRef.current.stop()
      }
      html5QrRef.current = null
    } catch {
      // ignore
    }
    setScanning(false)
  }

  async function handleScan(qrData) {
    setLoading(true)
    setError('')
    setLastResult(null)

    try {
      const deviceTime = new Date()
      const clientDate = deviceTime.toLocaleDateString('en-CA')
      const clientTime = deviceTime.toTimeString().slice(0, 8)
      const res = await fetch(`${API_BASE}/api/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_data: qrData,
          client_date: clientDate,
          client_time: clientTime,
        }),
      })
      const data = await res.json()

      if (data.success) {
        lastScannedRef.current = { id: qrData, time: Date.now(), successBlock: true }
        const isTeacher = data.person_type === 'teacher'
        const last = isTeacher
          ? { name: data.name, class: data.class, check_in_type: data.check_in_type, check_in_time: data.check_in_time, status: data.status, minutes_late: data.minutes_late }
          : (Array.isArray(data.attendance) ? data.attendance[data.attendance.length - 1] : data.attendance)
        const typeLabel = last?.check_in_type === 'departure' ? 'Departure' : 'Arrival'
        const lateInfo = last?.minutes_late ? ` (${last.minutes_late} min)` : ''
        const toastData = {
          name: last?.name,
          class: last?.class || 'Teacher',
          type: typeLabel,
          time: String(last?.check_in_time || '').slice(0, 5),
          lateInfo: isTeacher ? '' : lateInfo,
          status: last?.status,
        }
        setLastResult({
          success: true,
          name: last?.name,
          class: last?.class || 'Teacher',
          time: last?.check_in_time,
          status: last?.status,
          type: typeLabel,
          lateInfo: isTeacher ? '' : lateInfo,
        })
        setSuccessToast(toastData)
        setTimeout(() => setSuccessToast((t) => (t ? { ...t, exiting: true } : null)), 2000)
        setTimeout(() => setSuccessToast(null), 2600)
        stopScanner()
      } else {
        setLastResult({ success: false, message: data.message })
      }
    } catch {
      setLastResult({ success: false, message: 'Connection failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qr-scanner-page">
      {successToast && (
        <div className={`scan-success-toast ${successToast.exiting ? 'exiting' : ''}`}>
          <span className="toast-icon">✓</span>
          <div className="toast-content">
            <strong>{successToast.name}</strong>
            <span>{successToast.class} · {successToast.type} at {successToast.time}{successToast.lateInfo}</span>
            {successToast.type === 'Arrival' && successToast.status && (
              <span className={`toast-status ${successToast.status}`}>
                {successToast.status === 'late' ? 'Late' : 'Present'}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="scanner-header">
        <h2>Scan QR Code</h2>
        <p>Use camera to scan student or teacher QR codes for check-in</p>
      </div>

      <div className="scanner-actions">
        {!scanning ? (
          <button type="button" className="btn-scan" onClick={startScanner}>
            Start Camera
          </button>
        ) : (
          <button type="button" className="btn-stop" onClick={stopScanner}>
            Stop Camera
          </button>
        )}
      </div>

      {error && <div className="scanner-error">{error}</div>}

      {scanning && (
        <div className="scanner-viewport">
          <div id="qr-reader" />
        </div>
      )}

      {lastResult && (
        <div className={`scan-result ${lastResult.success ? 'success' : 'error'}`}>
          {lastResult.success ? (
            <>
              <span className="result-icon">✓</span>
              <h3>{lastResult.name}</h3>
              <p>{lastResult.class} · {lastResult.type} at {String(lastResult.time || '').slice(0, 5)}{lastResult.lateInfo}</p>
              {lastResult.type === 'Arrival' && lastResult.status != null && (
                <span className={`result-status ${lastResult.status}`}>
                  {lastResult.status === 'late' ? `Late${lastResult.lateInfo}` : 'Present'}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="result-icon">✕</span>
              <p>{lastResult.message}</p>
            </>
          )}
        </div>
      )}

      {loading && <div className="scanner-loading">Processing...</div>}
    </div>
  )
}

export default QrScanner
