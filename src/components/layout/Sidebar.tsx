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

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-brand-900 text-white">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 font-bold text-sm">
          BJP
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">BJP Industrial</p>
          <p className="text-[11px] text-brand-200 leading-tight">Analytics</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
  )
}
