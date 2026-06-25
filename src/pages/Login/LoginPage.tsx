import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const ROLES = ['Jefe de Producción', 'Supervisor de Planta', 'Gerencia', 'Administrador']

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [password, setPassword] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    login({ name: name.trim() || 'Usuario Demo', role })
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 font-bold text-sm">
            BJP
          </div>
          <span className="text-sm font-semibold">BJP Industrial Analytics</span>
        </div>

        <div>
          <h1 className="text-3xl font-semibold leading-tight">
            Reportes productivos automatizados,<br /> sin planillas manuales.
          </h1>
          <p className="mt-4 max-w-md text-brand-200">
            Producción, rendimiento y cumplimiento de objetivos de la planta corrugadora,
            consolidados a partir de Kiwi Plant y Kiwi Map.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold">7</p>
              <p className="text-xs text-brand-200">Máquinas monitoreadas</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold">78%</p>
              <p className="text-xs text-brand-200">OEE promedio</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold">+90%</p>
              <p className="text-xs text-brand-200">Cumplimiento de meta</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-brand-300">© 2026 BJP Sistemas — Demo interna, datos simulados</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-surface px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 font-bold text-sm text-white">
              BJP
            </div>
            <span className="text-sm font-semibold text-brand-900">BJP Industrial Analytics</span>
          </div>

          <h2 className="text-xl font-semibold text-brand-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-status-idle">Accedé al sistema de reportes de planta.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-900">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Martín Fernández"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-brand-900">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-brand-900">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <p className="mt-1 text-[11px] text-status-idle">Demo: no se valida contraseña real.</p>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
