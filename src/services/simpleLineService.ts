import simpleLinesJson from '@/data/simpleLines.json'
import simpleLineObjectivesJson from '@/data/simpleLineObjectives.json'
import simpleProductionRecordsJson from '@/data/simpleProductionRecords.json'
import type { SimpleLine, SimpleLineObjective, SimpleProductionRecord } from '@/types'
import { shifts } from './productionService'
import { sum } from './kpiCalculations'

export const simpleLines = simpleLinesJson as SimpleLine[]
export const simpleLineObjectives = simpleLineObjectivesJson as SimpleLineObjective[]
export const simpleProductionRecords = simpleProductionRecordsJson as unknown as SimpleProductionRecord[]

export function getSimpleLineById(id: string): SimpleLine | undefined {
  return simpleLines.find((l) => l.id === id)
}

export function getSimpleLineObjective(
  lineId: string,
  metricKey: string,
  periodType: 'daily' | 'shift',
  shiftId?: string,
): SimpleLineObjective | undefined {
  return simpleLineObjectives.find(
    (o) => o.lineId === lineId && o.metricKey === metricKey && o.periodType === periodType && o.shiftId === shiftId,
  )
}

interface SimpleRecordFilter {
  date?: string
  from?: string
  to?: string
  lineId?: string
  shiftId?: string
}

export function filterSimpleRecords(filter: SimpleRecordFilter): SimpleProductionRecord[] {
  return simpleProductionRecords.filter((r) => {
    if (filter.date && r.date !== filter.date) return false
    if (filter.from && r.date < filter.from) return false
    if (filter.to && r.date > filter.to) return false
    if (filter.lineId && r.lineId !== filter.lineId) return false
    if (filter.shiftId && r.shiftId !== filter.shiftId) return false
    return true
  })
}

export interface SimpleLineTotals {
  lineId: string
  totals: Record<string, number> // por metric.key
  compliancePct: number // promedio de cumplimiento entre métricas
}

function totalsAndComplianceOf(records: SimpleProductionRecord[], line: SimpleLine, periodType: 'daily' | 'shift', shiftId?: string): SimpleLineTotals {
  const totals: Record<string, number> = {}
  const ratios: number[] = []
  for (const metric of line.metrics) {
    const total = sum(records.map((r) => r.values[metric.key] ?? 0))
    totals[metric.key] = total
    const target = getSimpleLineObjective(line.id, metric.key, periodType, shiftId)?.targetValue ?? 0
    if (target > 0) ratios.push(total / target)
  }
  const compliancePct = ratios.length ? sum(ratios) / ratios.length : 0
  return { lineId: line.id, totals, compliancePct }
}

export function getSimpleLineDailyTotals(lineId: string, date: string): SimpleLineTotals {
  const line = getSimpleLineById(lineId)!
  const records = filterSimpleRecords({ date, lineId })
  return totalsAndComplianceOf(records, line, 'daily')
}

export interface SimpleLineShiftRow {
  shiftId: string
  shiftName: string
  operatorName: string
  values: Record<string, number>
}

export function getSimpleLineShiftBreakdown(lineId: string, date: string): SimpleLineShiftRow[] {
  const records = filterSimpleRecords({ date, lineId })
  return shifts.map((shift) => {
    const rec = records.find((r) => r.shiftId === shift.id)
    return {
      shiftId: shift.id,
      shiftName: shift.name,
      operatorName: rec?.operatorName ?? '—',
      values: rec?.values ?? {},
    }
  })
}

export function getAvailableSimpleDates(daysBack: number): string[] {
  const allDates = Array.from(new Set(simpleProductionRecords.map((r) => r.date))).sort()
  return allDates.slice(-daysBack)
}

export function getLastAvailableSimpleDate(): string {
  return simpleProductionRecords[simpleProductionRecords.length - 1].date
}

export function getSimpleLineMonthlyTotals(lineId: string, year: number, month: number): SimpleLineTotals {
  const line = getSimpleLineById(lineId)!
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  const records = simpleProductionRecords.filter((r) => r.lineId === lineId && r.date.startsWith(monthPrefix))
  const totals: Record<string, number> = {}
  for (const metric of line.metrics) {
    totals[metric.key] = sum(records.map((r) => r.values[metric.key] ?? 0))
  }
  return { lineId, totals, compliancePct: 0 }
}
