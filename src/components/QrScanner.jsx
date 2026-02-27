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
  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (html5QrRef.current?.isScanning) {
        html5QrRef.current.stop().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (!scanning) return
    const el = document.getElementById('qr-reader')
    if (!el) return

    let cancelled = false
    const config = { fps: 10, qrbox: { width: 250, height: 250 } }
    const onSuccess = (decodedText) => {
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
      handleScan(id).finally(() => { processingRef.current = false })
    }

    async function init() {
      try {
        const scanner = new Html5Qrcode('qr-reader')
        if (cancelled) return
        html5QrRef.current = scanner

        let cameraIdOrConfig = { facingMode: 'environment' }
        try {
          const cameras = await Html5Qrcode.getCameras()
          if (cameras?.length > 0) {
            const back = cameras.find((c) => /back|rear|environment/i.test(c.label || ''))
            cameraIdOrConfig = back?.id || cameras[0].id
          }
        } catch {
          /* fallback to facingMode */
        }

        await scanner.start(cameraIdOrConfig, config, onSuccess, () => {})
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not access camera. Check permissions and try HTTPS.')
          setScanning(false)
        }
      }
    }
    init()
    return () => {
      cancelled = true
      if (html5QrRef.current?.isScanning) {
        html5QrRef.current.stop().catch(() => {})
        html5QrRef.current = null
      }
    }
  }, [scanning])

  function startScanner() {
    setError('')
    setLastResult(null)
    setScanning(true)
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

  async function handleScanFromFile(e) {
    const file = e?.target?.files?.[0]
    if (!file) return
    setError('')
    setLastResult(null)
    setLoading(true)
    try {
      const scanner = new Html5Qrcode('qr-file-reader')
      const result = await scanner.scanFileV2(file, false)
      const qrData = result?.decodedText?.trim()
      if (qrData) {
        await handleScan(qrData)
      } else {
        setLastResult({ success: false, message: 'No QR code found in image' })
      }
    } catch (err) {
      setLastResult({ success: false, message: err.message || 'Could not read QR code' })
    } finally {
      setLoading(false)
      e.target.value = ''
    }
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
      let data
      try {
        data = await res.json()
      } catch {
        throw new Error(res.ok ? 'Invalid response' : `Server error ${res.status}`)
      }

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
    } catch (err) {
      const msg = err?.message?.toLowerCase?.() || ''
      const isNetwork = /failed|network|load|cors|timeout/i.test(msg) || err?.name === 'TypeError'
      setLastResult({
        success: false,
        message: isNetwork
          ? 'Connection failed. If the backend is sleeping, wait a moment and try again.'
          : 'Connection failed',
      })
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
          <>
            <button type="button" className="btn-scan" onClick={startScanner}>
              Start Camera
            </button>
            <label className="btn-scan-file">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScanFromFile}
                style={{ display: 'none' }}
              />
              Choose Image
            </label>
            <label className="btn-scan-file">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleScanFromFile}
                style={{ display: 'none' }}
              />
              Take Photo
            </label>
          </>
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
      <div id="qr-file-reader" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true" />

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
