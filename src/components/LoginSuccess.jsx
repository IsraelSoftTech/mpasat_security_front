import { useEffect } from 'react'
import './LoginSuccess.css'

function LoginSuccess({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 2000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="login-success">
      <div className="success-icon">
        <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <circle className="success-circle-bg" cx="26" cy="26" r="24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <path className="success-check" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
      </div>
      <h2>Login Successful</h2>
      <p>Redirecting to dashboard...</p>
    </div>
  )
}

export default LoginSuccess
