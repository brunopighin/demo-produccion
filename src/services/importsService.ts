import importLogsJson from '@/data/importLogs.json'
import type { DowntimeEntry, ImportLogEntry, ProductionRecord } from '@/types'
import { clearImported, loadImported, recordKey, saveImported } from './importedDataStore'
import { machines, mergeRecords, operators, productionRecords, shifts } from './productionService'
import type { Cell, Rows } from './spreadsheetReader'

const sampleLogs = importLogsJson as ImportLogEntry[]

/** Historial: primero lo importado en este navegador, después el de ejemplo. */
export function getRecentImportLogs(limit = 15): ImportLogEntry[] {
  return [...loadImported().logs, ...sampleLogs].slice(0, limit)
}

export function getImportedRecordCount(): number {
  return loadImported().records.length
}

export function clearImportedData(): void {
  clearImported()
}

// ── Plantilla ────────────────────────────────────────────────────────────────

type ColumnKey = 'fecha' | 'maquina' | 'turno' | 'operario' | 'producido' | 'scrap' | 'disponibles' | 'setup' | 'cambiosOt' | 'noProgramada' | 'mantenimiento'

interface ColumnDef {
  key: ColumnKey
  header: string
  required: boolean
  help: string
}

export const TEMPLATE_COLUMNS: ColumnDef[] = [
  { key: 'fecha', header: 'Fecha', required: true, help: 'dd/mm/aaaa' },
  { key: 'maquina', header: 'Máquina', required: true, help: `Código o nombre: ${machines.map((m) => m.code).join(', ')}` },
  { key: 'turno', header: 'Turno', required: true, help: 'Mañana, Tarde o Noche (o 1, 2, 3)' },
  { key: 'operario', header: 'Operario', required: true, help: 'Código (OP01…) o nombre' },
  { key: 'producido', header: 'Producido', required: true, help: 'm² en Corrugadora, HBL y DRO; golpes en el resto' },
  { key: 'scrap', header: 'Scrap', required: false, help: 'Misma unidad que Producido. Vacío = 0' },
  { key: 'disponibles', header: 'Minutos disponibles', required: false, help: 'Tiempo planificado del turno. Vacío = 480' },
  { key: 'setup', header: 'Minutos setup', required: false, help: 'Cambios de OT, formato y ajustes. Vacío = 0' },
  { key: 'cambiosOt', header: 'Cambios de OT', required: false, help: 'Cantidad. Vacío = 0' },
  { key: 'noProgramada', header: 'Minutos parada no programada', required: false, help: 'Roturas, fallas, falta de material. Vacío = 0' },
  { key: 'mantenimiento', header: 'Minutos mantenimiento', required: false, help: 'Vacío = 0' },
]

const DEFAULT_AVAILABLE_MIN = 480

const csvField = (v: string) => `"${v.replace(/"/g, '""')}"`

/** Plantilla CSV (";" para Excel es-AR) con encabezados y dos filas de ejemplo. */
export function buildTemplateCsv(): string {
  const header = TEMPLATE_COLUMNS.map((c) => csvField(c.header)).join(';')
  const examples = [
    ['25/06/2026', 'CORR', 'Mañana', 'OP02', '173823', '5200', '460', '38', '1', '0', '0'],
    ['25/06/2026', 'MINI1', 'Tarde', 'OP13', '42314', '1300', '460', '45', '2', '34', '0'],
  ]
  return [header, ...examples.map((r) => r.map(csvField).join(';'))].join('\r\n')
}

// ── Validación ───────────────────────────────────────────────────────────────

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

const cellText = (c: Cell | undefined): string => (c === null || c === undefined ? '' : String(c).trim())

/** Fecha en dd/mm/aaaa, d/m/aa, aaaa-mm-dd o número de serie de Excel. Devuelve ISO o null. */
export function parseDate(c: Cell | undefined): string | null {
  if (typeof c === 'number') {
    if (c < 20000 || c > 80000) return null
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(c) * 86400000)
    return d.toISOString().slice(0, 10)
  }
  const s = cellText(c)
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) {
    ;[d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
    if (y < 100) y += 2000
  } else return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return date.toISOString().slice(0, 10)
}

/** Número en formato es-AR ("1.234,5") o con punto decimal ("1234.5"). Vacío → null. NaN si no es número. */
export function parseNumber(c: Cell | undefined): number | null {
  if (typeof c === 'number') return c
  let s = cellText(c).replace(/\s/g, '')
  if (s === '') return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

const MACHINE_LOOKUP = new Map(machines.flatMap((m) => [[normalize(m.code), m], [normalize(m.name), m]]))
const OPERATOR_LOOKUP = new Map(operators.flatMap((o) => [[normalize(o.code), o], [normalize(o.name), o]]))
const SHIFT_LOOKUP = new Map<string, string>([
  ...shifts.flatMap((s, i) => [[normalize(s.name), s.id], [normalize(s.id), s.id], [String(i + 1), s.id], [normalize(s.name).slice(0, 1), s.id]] as [string, string][]),
  ['turnomanana', 's1'], ['turnotarde', 's2'], ['turnonoche', 's3'],
])

export interface RowError {
  row: number
  message: string
}

export interface ImportPreview {
  filename: string
  records: ProductionRecord[]
  errors: RowError[]
  rowsTotal: number
  /** Cuántos registros ya existentes (ejemplo o importados antes) se van a reemplazar. */
  replaced: number
  dateFrom: string | null
  dateTo: string | null
  /** Error que impide leer el archivo entero (p. ej. faltan columnas). */
  fatal: string | null
}

/** Valida las filas leídas del archivo y arma los registros, sin guardar nada todavía. */
export function buildImportPreview(filename: string, rows: Rows, todayIso: string): ImportPreview {
  const preview: ImportPreview = { filename, records: [], errors: [], rowsTotal: 0, replaced: 0, dateFrom: null, dateTo: null, fatal: null }

  // La fila de encabezados es la primera que tiene "Fecha" (puede haber títulos arriba).
  const headerIndex = rows.findIndex((r) => r.some((c) => normalize(cellText(c)) === 'fecha'))
  if (headerIndex < 0) {
    preview.fatal = 'No se encontró la fila de encabezados (con la columna "Fecha"). Usá la plantilla descargable.'
    return preview
  }
  const headers = rows[headerIndex].map((c) => normalize(cellText(c)))
  const colIndex = {} as Record<ColumnKey, number>
  const missing: string[] = []
  for (const col of TEMPLATE_COLUMNS) {
    colIndex[col.key] = headers.indexOf(normalize(col.header))
    if (colIndex[col.key] < 0 && col.required) missing.push(col.header)
  }
  if (missing.length) {
    preview.fatal = `Faltan columnas obligatorias: ${missing.join(', ')}. Usá la plantilla descargable.`
    return preview
  }

  const existingKeys = new Set(productionRecords.map(recordKey))
  const seen = new Map<string, number>()
  const stamp = Date.now()

  rows.slice(headerIndex + 1).forEach((row, i) => {
    const rowNumber = headerIndex + i + 2 // número de fila como se ve en Excel
    const get = (key: ColumnKey) => (colIndex[key] >= 0 ? row[colIndex[key]] : null)
    if (TEMPLATE_COLUMNS.every((col) => cellText(get(col.key)) === '')) return // fila vacía
    preview.rowsTotal++

    const problems: string[] = []
    const date = parseDate(get('fecha'))
    if (!date) problems.push(`fecha inválida "${cellText(get('fecha'))}" (usá dd/mm/aaaa)`)
    else if (date > todayIso) problems.push(`la fecha ${date.split('-').reverse().join('/')} es futura`)

    const machine = MACHINE_LOOKUP.get(normalize(cellText(get('maquina'))))
    if (!machine) problems.push(`máquina desconocida "${cellText(get('maquina'))}"`)
    const shiftId = SHIFT_LOOKUP.get(normalize(cellText(get('turno'))))
    if (!shiftId) problems.push(`turno desconocido "${cellText(get('turno'))}"`)
    const operator = OPERATOR_LOOKUP.get(normalize(cellText(get('operario'))))
    if (!operator) problems.push(`operario desconocido "${cellText(get('operario'))}"`)

    const num = (key: ColumnKey, label: string, fallback: number | null, integer = false): number => {
      const v = parseNumber(get(key))
      if (v === null) {
        if (fallback === null) problems.push(`falta ${label}`)
        return fallback ?? 0
      }
      if (Number.isNaN(v)) problems.push(`${label} no es un número ("${cellText(get(key))}")`)
      else if (v < 0) problems.push(`${label} no puede ser negativo`)
      else if (integer && !Number.isInteger(v)) problems.push(`${label} debe ser un número entero`)
      return v
    }
    const produced = num('producido', 'Producido', null)
    const scrap = num('scrap', 'Scrap', 0)
    const available = num('disponibles', 'Minutos disponibles', DEFAULT_AVAILABLE_MIN)
    const setup = num('setup', 'Minutos setup', 0)
    const otChanges = num('cambiosOt', 'Cambios de OT', 0, true)
    const unplanned = num('noProgramada', 'Minutos parada no programada', 0)
    const maintenance = num('mantenimiento', 'Minutos mantenimiento', 0)

    if (!problems.length) {
      if (available === 0) problems.push('Minutos disponibles no puede ser 0')
      if (available > 1440) problems.push('Minutos disponibles no puede superar 1440 (24 h)')
      if (setup + unplanned + maintenance > available) problems.push(`las paradas suman ${setup + unplanned + maintenance} min y superan los ${available} min disponibles`)
      if (scrap > produced) problems.push('el Scrap no puede superar a lo Producido')
      if (otChanges > 0 && setup === 0) problems.push('hay Cambios de OT pero 0 minutos de setup')
    }

    if (!problems.length && date && machine && shiftId) {
      const key = recordKey({ date, machineId: machine.id, shiftId })
      const firstRow = seen.get(key)
      if (firstRow !== undefined) problems.push(`repite máquina, fecha y turno de la fila ${firstRow}`)
      else seen.set(key, rowNumber)
    }

    if (problems.length) {
      preview.errors.push({ row: rowNumber, message: problems.join('; ') })
      return
    }

    const downtimes: DowntimeEntry[] = []
    // Cada cambio de OT es una entrada propia: así los cuenta otChangesOf().
    if (otChanges > 0) {
      const each = Math.floor(setup / otChanges)
      for (let k = 0; k < otChanges; k++) {
        downtimes.push({ type: 'setup', reason: 'Cambio de orden de trabajo', minutes: k === otChanges - 1 ? setup - each * (otChanges - 1) : each })
      }
    } else if (setup > 0) downtimes.push({ type: 'setup', reason: 'Ajuste de registro', minutes: setup })
    if (unplanned > 0) downtimes.push({ type: 'no_programada', reason: 'Parada no programada', minutes: unplanned })
    if (maintenance > 0) downtimes.push({ type: 'mantenimiento', reason: 'Mantenimiento', minutes: maintenance })

    preview.records.push({
      id: `imp-${stamp}-${preview.records.length + 1}`,
      date: date!,
      machineId: machine!.id,
      operatorId: operator!.id,
      shiftId: shiftId!,
      qtyProduced: produced,
      qtyGood: produced - scrap,
      qtyScrap: scrap,
      timeAvailableMin: available,
      timeProductiveMin: available - setup - unplanned - maintenance,
      timeSetupMin: setup,
      timeDowntimeMin: unplanned + maintenance,
      downtimes,
      scrapBreakdown: [],
      sourceImportId: `imp-${stamp}`,
    })
  })

  preview.replaced = preview.records.filter((r) => existingKeys.has(recordKey(r))).length
  const dates = preview.records.map((r) => r.date).sort()
  preview.dateFrom = dates[0] ?? null
  preview.dateTo = dates[dates.length - 1] ?? null
  if (preview.rowsTotal === 0 && !preview.fatal) preview.fatal = 'El archivo no tiene filas con datos debajo de los encabezados.'
  return preview
}

/** Guarda lo válido de la vista previa y lo suma a los datos de la app. Devuelve el registro del historial. */
export function commitImport(preview: ImportPreview, importedAtIso: string): { log: ImportLogEntry; saved: boolean } {
  const stored = loadImported()
  const keys = new Set(preview.records.map(recordKey))
  const log: ImportLogEntry = {
    id: preview.records[0]?.sourceImportId ?? `imp-${Date.now()}`,
    source: 'planilla',
    filename: preview.filename,
    importedAt: importedAtIso,
    status: preview.records.length === 0 ? 'error' : preview.errors.length ? 'warning' : 'ok',
    rowsTotal: preview.rowsTotal,
    rowsError: preview.errors.length,
  }
  const saved = saveImported({
    records: [...stored.records.filter((r) => !keys.has(recordKey(r))), ...preview.records],
    logs: [log, ...stored.logs],
  })
  if (saved) mergeRecords(preview.records)
  return { log, saved }
}
