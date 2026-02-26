import { useState, useEffect } from 'react'
import { useAcademicYear } from '../context/AcademicYearContext'
import Dashboard from './Dashboard'
import RegisterStudents from './RegisterStudents'
import RegisterTeachers from './RegisterTeachers'
import ManageClasses from './ManageClasses'
import AcademicYears from './AcademicYears'
import SchoolTimes from './SchoolTimes'
import QrScanner from './QrScanner'
import DailyAttendance from './DailyAttendance'
import Reports from './Reports'
import logo from '../assets/logo.png'
import {
  IconDashboard,
  IconUserAdd,
  IconAcademicCap,
  IconClipboard,
  IconChartBar,
  IconQrCode,
  IconCog,
} from './Icons'
import './Layout.css'

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { id: 'students', label: 'Register Students', Icon: IconUserAdd },
  { id: 'teachers', label: 'Teacher Registration', Icon: IconAcademicCap },
  { id: 'attendance', label: 'Daily Attendance', Icon: IconClipboard },
  { id: 'reports', label: 'Reports', Icon: IconChartBar },
  { id: 'scanner', label: 'Scan QR', Icon: IconQrCode },
  {
    id: 'manage',
    label: 'Manage System',
    Icon: IconCog,
    submenu: [
      { id: 'manage-year', label: 'Academic Year' },
      { id: 'manage-class', label: 'Class' },
      { id: 'manage-times', label: 'School Times' },
    ],
  },
]

function Layout({ onLogout }) {
  const { academicYears, selectedYearId, selectedYear, setSelectedYearId, fetchYears } = useAcademicYear()
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [manageExpanded, setManageExpanded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isManageActive = activeMenu === 'manage' || activeMenu?.startsWith('manage-')

  useEffect(() => {
    if (activeMenu?.startsWith('manage-')) setManageExpanded(true)
  }, [activeMenu])

  const closeSidebar = () => setSidebarOpen(false)
  const selectMenu = (id) => {
    setActiveMenu(id)
    setSidebarOpen(false)
  }

  return (
    <div className="layout">
      <header className="topbar">
        <button type="button" className="topbar-menu-btn" aria-label="Menu" onClick={() => setSidebarOpen(true)}>
          <span className="topbar-menu-icon" />
          <span className="topbar-menu-icon" />
          <span className="topbar-menu-icon" />
        </button>
        <div className="topbar-brand">
          <img src={logo} alt="" className="topbar-logo" />
          <span className="topbar-name">MPASAT SSSAS</span>
        </div>
        <div className="topbar-right">
          <div className="topbar-year-select">
            <label htmlFor="academic-year-select">Academic Year</label>
            <select
              id="academic-year-select"
              value={selectedYearId ?? ''}
              onChange={(e) => setSelectedYearId(e.target.value ? Number(e.target.value) : null)}
              className="topbar-year-dropdown"
            >
              <option value="">All years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === 'active' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="topbar-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button type="button" className="sidebar-close" aria-label="Close menu" onClick={closeSidebar}>×</button>
        <div className="sidebar-brand">
          <img src={logo} alt="" className="sidebar-logo" />
          <span className="sidebar-name">MPASAT SSSAS</span>
        </div>
        <nav className="sidebar-nav">
          {MENU_ITEMS.map((item) => {
            const IconComponent = item.Icon
            if (item.submenu) {
              return (
                <div key={item.id} className="sidebar-group">
                  <button
                    className={`sidebar-item ${isManageActive ? 'active' : ''}`}
                    onClick={() => setManageExpanded((e) => !e)}
                  >
                    <IconComponent className="sidebar-icon" />
                    <span className="sidebar-label">{item.label}</span>
                    <span className={`sidebar-chevron ${manageExpanded ? 'expanded' : ''}`}>▼</span>
                  </button>
                  {manageExpanded && (
                    <div className="sidebar-submenu">
                      {item.submenu.map((sub) => (
                        <button
                          key={sub.id}
                          className={`sidebar-item ${activeMenu === sub.id ? 'active' : ''}`}
                          onClick={() => { selectMenu(sub.id); setManageExpanded(true) }}
                        >
                          <span className="sidebar-label">{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <button
                key={item.id}
                className={`sidebar-item ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => selectMenu(item.id)}
              >
                <IconComponent className="sidebar-icon" />
                <span className="sidebar-label">{item.label}</span>
              </button>
            )
          })}
          <div className="sidebar-logout-wrap">
            <button type="button" className="sidebar-logout" onClick={() => { onLogout(); closeSidebar(); }}>
              Logout
            </button>
          </div>
        </nav>
      </aside>

      <main className="layout-main">
        {activeMenu === 'dashboard' && <Dashboard />}
        {activeMenu === 'students' && <RegisterStudents />}
        {activeMenu === 'teachers' && <RegisterTeachers />}
        {activeMenu === 'attendance' && <DailyAttendance />}
        {activeMenu === 'reports' && <Reports />}
        {activeMenu === 'scanner' && <QrScanner />}
        {activeMenu === 'manage-year' && <AcademicYears />}
        {activeMenu === 'manage-class' && <ManageClasses />}
        {activeMenu === 'manage-times' && <SchoolTimes />}
        {activeMenu === 'manage' && (
          <div className="placeholder-page">
            <h2>Manage System</h2>
            <p>Select a submenu below to manage classes and settings.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Layout
