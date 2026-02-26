import { createContext, useContext, useState, useEffect } from 'react'
import { API_BASE } from '../api'

const AcademicYearContext = createContext(null)

export function AcademicYearProvider({ children }) {
  const [academicYears, setAcademicYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchYears()
  }, [])

  async function fetchYears() {
    try {
      const res = await fetch(`${API_BASE}/api/academic-years`)
      const data = await res.json()
      if (data.success) {
        setAcademicYears(data.academic_years || [])
        const active = (data.academic_years || []).find((y) => y.status === 'active')
        setSelectedYearId((prev) => {
          if (active && prev === null) return active.id
          if (prev !== null && data.academic_years.some((y) => y.id === prev)) return prev
          return active?.id ?? (data.academic_years?.[0]?.id ?? null)
        })
      }
    } catch {
      setAcademicYears([])
    } finally {
      setLoading(false)
    }
  }

  const selectedYear = academicYears.find((y) => y.id === selectedYearId)

  const value = {
    academicYears,
    selectedYearId,
    selectedYear,
    setSelectedYearId,
    fetchYears,
    loading,
  }

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  )
}

export function useAcademicYear() {
  const ctx = useContext(AcademicYearContext)
  if (!ctx) throw new Error('useAcademicYear must be used within AcademicYearProvider')
  return ctx
}
