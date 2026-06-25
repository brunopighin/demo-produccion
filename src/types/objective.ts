export type KpiType = 'oee' | 'production' | 'compliance'
export type PeriodType = 'daily' | 'monthly' | 'shift'

export interface Objective {
  id: string
  machineId: string
  kpiType: KpiType
  periodType: PeriodType
  shiftId?: string // solo aplica cuando periodType === 'shift'
  targetValue: number
}

export interface AlertThreshold {
  machineId: string
  kpiType: KpiType
  greenMin: number
  yellowMin: number
}
