import type { ProductionUnit } from './machine'

export interface SimpleLineMetric {
  key: string
  unit: ProductionUnit
  label: string
}

export interface SimpleLine {
  id: string
  code: string
  name: string
  metrics: SimpleLineMetric[]
}

export interface SimpleProductionRecord {
  id: string
  date: string // ISO yyyy-mm-dd
  lineId: string
  shiftId: string
  operatorName: string
  values: Record<string, number> // valores por metric.key
}

export interface SimpleLineObjective {
  id: string
  lineId: string
  metricKey: string
  periodType: 'daily' | 'shift'
  shiftId?: string
  targetValue: number
}
