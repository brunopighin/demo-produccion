import type { ImportLogEntry, ProductionRecord } from '@/types'

/**
 * Datos subidos desde la pantalla de Importaciones. La demo no tiene servidor: se guardan en el
 * navegador (localStorage), así que solo se ven en el equipo y navegador donde se importaron.
 */
const STORAGE_KEY = 'bjp.imports.v1'

interface StoredImports {
  records: ProductionRecord[]
  logs: ImportLogEntry[]
}

const EMPTY: StoredImports = { records: [], logs: [] }

export function loadImported(): StoredImports {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<StoredImports>
    return { records: parsed.records ?? [], logs: parsed.logs ?? [] }
  } catch {
    return EMPTY
  }
}

/** Devuelve false si el navegador no dejó guardar (storage lleno o bloqueado). */
export function saveImported(data: StoredImports): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearImported(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage bloqueado: no hay nada guardado que borrar.
  }
}

/** Clave de un registro: un mismo día, máquina y turno se reemplaza al volver a importarlo. */
export function recordKey(r: Pick<ProductionRecord, 'date' | 'machineId' | 'shiftId'>): string {
  return `${r.date}|${r.machineId}|${r.shiftId}`
}
