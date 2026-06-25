export type ImportSource = 'kiwi_plant' | 'kiwi_map'
export type ImportStatus = 'ok' | 'warning' | 'error'

export interface ImportLogEntry {
  id: string
  source: ImportSource
  filename: string
  importedAt: string // ISO datetime
  status: ImportStatus
  rowsTotal: number
  rowsError: number
}
