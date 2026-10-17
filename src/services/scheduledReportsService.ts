import type { ReportType } from './reportModel'
import type { ReportFormat } from './reportsService'

export type ScheduleFrequency = 'diaria' | 'semanal' | 'mensual'

export interface ScheduledReport {
  id: string
  reportType: ReportType
  format: ReportFormat
  frequency: ScheduleFrequency
  /** HH:mm, hora de Argentina. */
  time: string
  /** Solo para frecuencia semanal: 1 = lunes … 7 = domingo. */
  weekday: number
  recipients: string[]
}

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  mensual: 'Mensual (día 1)',
}

export const WEEKDAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const STORAGE_KEY = 'bjp.scheduledReports'

const DEFAULTS: ScheduledReport[] = [
  { id: 'sch-1', reportType: 'produccion_diaria', format: 'pdf', frequency: 'diaria', time: '07:00', weekday: 1, recipients: ['produccion@bjp.com.ar', 'jefe.planta@bjp.com.ar', 'calidad@bjp.com.ar'] },
  { id: 'sch-2', reportType: 'indicadores_gestion', format: 'pdf', frequency: 'mensual', time: '08:00', weekday: 1, recipients: ['gerencia@bjp.com.ar', 'direccion@bjp.com.ar'] },
]

// Sin backend en la demo: los envíos programados se guardan en este navegador.
export function loadScheduledReports(): ScheduledReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ScheduledReport[]
  } catch {
    // Storage bloqueado o dato corrupto: se usan los de ejemplo.
  }
  return DEFAULTS
}

export function saveScheduledReports(list: ScheduledReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Sin storage disponible: el cambio vale solo mientras la página esté abierta.
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Separa y valida los mails escritos (por coma, punto y coma o salto de línea). */
export function parseRecipients(text: string): { valid: string[]; invalid: string[] } {
  const parts = text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
  return { valid: parts.filter((p) => EMAIL_RE.test(p)), invalid: parts.filter((p) => !EMAIL_RE.test(p)) }
}

/** Hora actual de Argentina (UTC−3, sin horario de verano) como Date "local" equivalente. */
function nowInArgentina(): Date {
  const now = new Date()
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 - 3 * 3600000)
}

/** Próximo envío según la frecuencia, en hora de Argentina. */
export function nextRunOf(s: ScheduledReport, now: Date = nowInArgentina()): Date {
  const [h, m] = s.time.split(':').map(Number)
  const next = new Date(now)
  next.setSeconds(0, 0)
  next.setHours(h, m)

  if (s.frequency === 'diaria') {
    if (next <= now) next.setDate(next.getDate() + 1)
  } else if (s.frequency === 'semanal') {
    const today = next.getDay() === 0 ? 7 : next.getDay()
    let diff = s.weekday - today
    if (diff < 0 || (diff === 0 && next <= now)) diff += 7
    next.setDate(next.getDate() + diff)
  } else {
    next.setDate(1)
    if (next <= now) next.setMonth(next.getMonth() + 1, 1)
  }
  return next
}

export function formatNextRun(date: Date, now: Date = nowInArgentina()): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86400000)
  if (days === 0) return `Hoy ${time}`
  if (days === 1) return `Mañana ${time}`
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${time}`
}
