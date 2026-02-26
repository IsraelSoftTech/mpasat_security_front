import { useState, useEffect } from 'react'
import './CountdownLoader.css'

function CountdownLoader({ onComplete }) {
  const [count, setCount] = useState(3)

  useEffect(() => {
    if (count <= 0) {
      onComplete?.()
      return
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [count, onComplete])

  return (
    <div className="countdown-loader">
      <div className="countdown-circle">
        <span className="countdown-number">{count}</span>
      </div>
      <p className="countdown-text">Loading MPASAT SSSAS</p>
    </div>
  )
}

export default CountdownLoader
