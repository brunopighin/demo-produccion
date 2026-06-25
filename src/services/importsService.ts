import importLogsJson from '@/data/importLogs.json'
import type { ImportLogEntry } from '@/types'

export const importLogs = importLogsJson as ImportLogEntry[]

export function getRecentImportLogs(limit = 15): ImportLogEntry[] {
  return importLogs.slice(0, limit)
}

/** Simula el procesamiento de un archivo subido: delay + resultado siempre exitoso para la demo. */
export function simulateImportUpload(durationMs = 1800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs))
}
