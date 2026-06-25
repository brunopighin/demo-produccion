export type ScrapReason = 'rotura' | 'ajuste' | 'calidad' | 'arranque'
export type DowntimeType = 'setup' | 'no_programada' | 'mantenimiento'

export interface DowntimeEntry {
  type: DowntimeType
  reason: string
  minutes: number
}

export interface ScrapEntry {
  reason: ScrapReason
  kg: number
}

export interface ProductionRecord {
  id: string
  date: string // ISO yyyy-mm-dd
  machineId: string
  operatorId: string
  shiftId: string
  qtyProduced: number // unidad según machine.unit (m2 o golpes)
  qtyGood: number
  qtyScrap: number
  timeAvailableMin: number // tiempo planificado del turno
  timeProductiveMin: number
  timeSetupMin: number
  timeDowntimeMin: number
  downtimes: DowntimeEntry[]
  scrapBreakdown: ScrapEntry[]
  sourceImportId: string
}
