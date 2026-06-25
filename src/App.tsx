import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/Login/LoginPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import ProductionPage from '@/pages/Production/ProductionPage'
import MachinesPage from '@/pages/Machines/MachinesPage'
import OperatorsPage from '@/pages/Operators/OperatorsPage'
import ImportsPage from '@/pages/Imports/ImportsPage'
import ReportsPage from '@/pages/Reports/ReportsPage'
import SettingsPage from '@/pages/Settings/SettingsPage'
import AppLayout from '@/components/layout/AppLayout'
import { AuthProvider } from '@/context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/produccion" element={<ProductionPage />} />
            <Route path="/maquinas" element={<MachinesPage />} />
            <Route path="/operadores" element={<OperatorsPage />} />
            <Route path="/importaciones" element={<ImportsPage />} />
            <Route path="/reportes" element={<ReportsPage />} />
            <Route path="/configuracion" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
