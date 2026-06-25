import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getAlertsForDate } from '@/services/alertsService'
import { getLastAvailableDate } from '@/services/productionService'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const date = getLastAvailableDate()
  const alerts = getAlertsForDate(date)
  const criticalCount = alerts.filter((a) => a.severity !== 'info').length

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface-alt px-6">
      <div>
        <p className="text-sm font-semibold text-brand-900">Planta Central</p>
        <p className="text-xs text-status-idle capitalize">{formattedDate}</p>
      </div>

      <div className="flex items-center gap-5">
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-brand-700 hover:bg-surface"
          title="Alertas"
        >
          🔔
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-status-bad text-[10px] font-semibold text-white">
              {criticalCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-brand-900">{user?.name ?? 'Usuario'}</p>
            <p className="text-xs text-status-idle">{user?.role ?? ''}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {(user?.name ?? 'U').charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-status-idle hover:text-status-bad"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
