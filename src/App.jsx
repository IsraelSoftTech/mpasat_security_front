import { useState } from 'react'
import CountdownLoader from './components/CountdownLoader'
import Login from './components/Login'
import LoginSuccess from './components/LoginSuccess'
import Layout from './components/Layout'
import { AcademicYearProvider } from './context/AcademicYearContext'

function App() {
  const [phase, setPhase] = useState('countdown') // countdown | login | success | dashboard

  return (
    <>
      {phase === 'countdown' && (
        <CountdownLoader onComplete={() => setPhase('login')} />
      )}
      {phase === 'login' && (
        <Login onLoginSuccess={() => setPhase('success')} />
      )}
      {phase === 'success' && (
        <LoginSuccess onComplete={() => setPhase('dashboard')} />
      )}
      {phase === 'dashboard' && (
        <AcademicYearProvider>
          <Layout onLogout={() => setPhase('login')} />
        </AcademicYearProvider>
      )}
    </>
  )
}

export default App
