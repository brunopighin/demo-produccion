import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◧' },
  { to: '/produccion', label: 'Producción', icon: '▣' },
  { to: '/maquinas', label: 'Máquinas', icon: '⚙' },
  { to: '/operadores', label: 'Operadores', icon: '◎' },
  { to: '/reportes', label: 'Reportes', icon: '⤓' },
  { to: '/importaciones', label: 'Importaciones', icon: '⇪' },
  { to: '/configuracion', label: 'Configuración', icon: '✦' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Fondo oscuro detrás del menú en mobile */}
      <div
        onClick={onClose}
        className={clsx(
          'fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex h-dvh w-60 shrink-0 flex-col bg-brand-900 text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 font-bold text-sm">
            BJP
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">BJP Industrial</p>
            <p className="text-[11px] text-brand-200 leading-tight">Analytics</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-brand-200 hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-200 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 text-[11px] text-brand-300">
          Datos simulados · Demo v1.0
        </div>
      </aside>
    </>
  )
}
