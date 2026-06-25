import machinesJson from '@/data/machines.json'
import operatorsJson from '@/data/operators.json'
import shiftsJson from '@/data/shifts.json'
import objectivesJson from '@/data/objectives.json'
import alertThresholdsJson from '@/data/alertThresholds.json'
import productionRecordsJson from '@/data/productionRecords.json'
import type {
  Machine,
  Operator,
  Shift,
  Objective,
  AlertThreshold,
  ProductionRecord,
  MachineKpis,
  OperatorKpis,
  DailySummary,
  KpiType,
  PeriodType,
} from '@/types'
import { availabilityOf, oeeOf, performanceOf, statusFromThreshold, sum } from './kpiCalculations'

export const machines = machinesJson as Machine[]
export const operators = operatorsJson as Operator[]
export const shifts = shiftsJson as Shift[]
export const objectives = objectivesJson as Objective[]
export const alertThresholds = alertThresholdsJson as AlertThreshold[]
export const productionRecords = productionRecordsJson as ProductionRecord[]

export function getMachineById(id: string): Machine | undefined {
  return machines.find((m) => m.id === id)
}

export function getOperatorById(id: string): Operator | undefined {
  return operators.find((o) => o.id === id)
}

export function getLastAvailableDate(): string {
  return productionRecords[productionRecords.length - 1].date
}

interface RecordFilter {
  date?: string
  from?: string
  to?: string
  machineId?: string
  operatorId?: string
  shiftId?: string
}

export function filterRecords(filter: RecordFilter): ProductionRecord[] {
  return productionRecords.filter((r) => {
    if (filter.date && r.date !== filter.date) return false
    if (filter.from && r.date < filter.from) return false
    if (filter.to && r.date > filter.to) return false
    if (filter.machineId && r.machineId !== filter.machineId) return false
    if (filter.operatorId && r.operatorId !== filter.operatorId) return false
    if (filter.shiftId && r.shiftId !== filter.shiftId) return false
    return true
  })
}

export function getObjective(machineId: string, kpiType: KpiType, periodType: PeriodType, shiftId?: string): Objective | undefined {
  return objectives.find(
    (o) => o.machineId === machineId && o.kpiType === kpiType && o.periodType === periodType && o.shiftId === shiftId,
  )
}

export function getAlertThreshold(machineId: string, kpiType: KpiType): AlertThreshold | undefined {
  return alertThresholds.find((t) => t.machineId === machineId && t.kpiType === kpiType)
}

/** Agrega un conjunto de registros de una misma máquina en un único set de KPIs. */
export function aggregateMachineKpis(records: ProductionRecord[], machine: Machine): MachineKpis {
  const totalAvailable = sum(records.map((r) => r.timeAvailableMin))
  const totalProductive = sum(records.map((r) => r.timeProductiveMin))
  const totalSetup = sum(records.map((r) => r.timeSetupMin))
  const totalProduced = sum(records.map((r) => r.qtyProduced))

  const availability = totalAvailable > 0 ? totalProductive / totalAvailable : 0
  const performance = totalProductive > 0 ? totalProduced / totalProductive / machine.nominalSpeed : 0
  const oee = availability * performance

  const threshold = getAlertThreshold(machine.id, 'oee')
  const status = records.length === 0
    ? 'sin_datos'
    : threshold
      ? statusFromThreshold(oee, threshold.greenMin, threshold.yellowMin)
      : 'sin_datos'

  return {
    machineId: machine.id,
    production: totalProduced,
    unit: machine.unit,
    availability,
    performance,
    oee,
    setupMinutes: totalSetup,
    status,
  }
}

export function getMachineKpisForDate(machineId: string, date: string): MachineKpis {
  const machine = getMachineById(machineId)!
  const records = filterRecords({ date, machineId })
  return aggregateMachineKpis(records, machine)
}

export function getAllMachinesKpisForDate(date: string): MachineKpis[] {
  return machines.map((m) => getMachineKpisForDate(m.id, date))
}

export function getAllMachinesKpisForRange(from: string, to: string): MachineKpis[] {
  return machines.map((m) => aggregateMachineKpis(filterRecords({ from, to, machineId: m.id }), m))
}

/** Promedio de cumplimiento (producido/objetivo) por máquina, ya que cada una usa su propia unidad. */
function compliancePctOf(records: ProductionRecord[]): number {
  const ratios = machines
    .map((m) => {
      const target = getObjective(m.id, 'production', 'daily')?.targetValue ?? 0
      if (target <= 0) return null
      const produced = sum(records.filter((r) => r.machineId === m.id).map((r) => r.qtyProduced))
      return produced / target
    })
    .filter((v): v is number => v !== null)
  return ratios.length ? sum(ratios) / ratios.length : 0
}

export function getDailySummary(date: string): DailySummary {
  const dayRecords = filterRecords({ date })
  const machineKpis = getAllMachinesKpisForDate(date)

  const productionM2 = sum(dayRecords.filter((r) => getMachineById(r.machineId)?.unit === 'm2').map((r) => r.qtyProduced))
  const productionGolpes = sum(dayRecords.filter((r) => getMachineById(r.machineId)?.unit === 'golpes').map((r) => r.qtyProduced))
  const setupMinutes = sum(dayRecords.map((r) => r.timeSetupMin))
  const oeeAvg = machineKpis.length ? sum(machineKpis.map((k) => k.oee)) / machineKpis.length : 0
  const compliancePct = compliancePctOf(dayRecords)

  const activeMachines = new Set(dayRecords.map((r) => r.machineId)).size
  const activeOperators = new Set(dayRecords.map((r) => r.operatorId)).size

  return { date, productionM2, productionGolpes, oeeAvg, setupMinutes, compliancePct, activeMachines, activeOperators }
}

export interface ShiftSummary {
  shiftId: string
  shiftName: string
  productionM2: number
  productionGolpes: number
  oeeAvg: number
  compliancePct: number
}

/** Cumplimiento (producido/objetivo) promediado por máquina para un turno puntual. */
function shiftCompliancePctOf(records: ProductionRecord[], shiftId: string): number {
  const ratios = machines
    .map((m) => {
      const target = getObjective(m.id, 'production', 'shift', shiftId)?.targetValue ?? 0
      if (target <= 0) return null
      const produced = sum(records.filter((r) => r.machineId === m.id).map((r) => r.qtyProduced))
      return produced / target
    })
    .filter((v): v is number => v !== null)
  return ratios.length ? sum(ratios) / ratios.length : 0
}

export function getShiftSummaryForDate(date: string): ShiftSummary[] {
  return shifts.map((shift) => {
    const records = filterRecords({ date, shiftId: shift.id })
    const machineKpis = machines.map((m) => aggregateMachineKpis(records.filter((r) => r.machineId === m.id), m))
    const productionM2 = sum(records.filter((r) => getMachineById(r.machineId)?.unit === 'm2').map((r) => r.qtyProduced))
    const productionGolpes = sum(records.filter((r) => getMachineById(r.machineId)?.unit === 'golpes').map((r) => r.qtyProduced))
    const oeeAvg = machineKpis.length ? sum(machineKpis.map((k) => k.oee)) / machineKpis.length : 0
    const compliancePct = shiftCompliancePctOf(records, shift.id)
    return { shiftId: shift.id, shiftName: shift.name, productionM2, productionGolpes, oeeAvg, compliancePct }
  })
}

export function getAvailableDates(daysBack: number): string[] {
  const allDates = Array.from(new Set(productionRecords.map((r) => r.date))).sort()
  return allDates.slice(-daysBack)
}

export function getDailySummaries(daysBack: number): DailySummary[] {
  return getAvailableDates(daysBack).map((date) => getDailySummary(date))
}

export function getMonthlySummary(year: number, month: number) {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  const monthRecords = productionRecords.filter((r) => r.date.startsWith(monthPrefix))
  const dates = Array.from(new Set(monthRecords.map((r) => r.date))).sort()
  const dailyBreakdown = dates.map((date) => getDailySummary(date))
  const machineKpis = machines.map((m) => aggregateMachineKpis(monthRecords.filter((r) => r.machineId === m.id), m))

  const productionM2 = sum(dailyBreakdown.map((d) => d.productionM2))
  const productionGolpes = sum(dailyBreakdown.map((d) => d.productionGolpes))
  const oeeAvg = dailyBreakdown.length ? sum(dailyBreakdown.map((d) => d.oeeAvg)) / dailyBreakdown.length : 0
  const compliancePct = dailyBreakdown.length
    ? sum(dailyBreakdown.map((d) => d.compliancePct)) / dailyBreakdown.length
    : 0

  return { year, month, productionM2, productionGolpes, oeeAvg, compliancePct, dailyBreakdown, machineKpis }
}

export type MonthlySummary = ReturnType<typeof getMonthlySummary>

export function getAvailableMonths(): { year: number; month: number }[] {
  const months = Array.from(new Set(productionRecords.map((r) => r.date.slice(0, 7)))).sort()
  return months.map((s) => {
    const [year, month] = s.split('-').map(Number)
    return { year, month }
  })
}

export function getMonthlyTrend(): MonthlySummary[] {
  return getAvailableMonths().map(({ year, month }) => getMonthlySummary(year, month))
}

const OPERATOR_EFFICIENCY_GREEN = 0.85
const OPERATOR_EFFICIENCY_YELLOW = 0.7

export function getOperatorRanking(from: string, to: string): OperatorKpis[] {
  const records = filterRecords({ from, to })
  const byOperator = new Map<string, ProductionRecord[]>()
  for (const r of records) {
    byOperator.set(r.operatorId, [...(byOperator.get(r.operatorId) ?? []), r])
  }

  const ranking: OperatorKpis[] = []
  for (const [operatorId, recs] of byOperator) {
    const production = sum(recs.map((r) => r.qtyProduced))
    const efficiencies = recs.map((r) => performanceOf(r, getMachineById(r.machineId)!))
    const efficiencyPct = efficiencies.length ? sum(efficiencies) / efficiencies.length : 0
    const setups = recs.filter((r) => r.timeSetupMin > 0).length
    const unit = getMachineById(recs[0].machineId)?.unit ?? 'golpes'

    ranking.push({
      operatorId,
      production,
      unit,
      efficiencyPct,
      setups,
      status: statusFromThreshold(efficiencyPct, OPERATOR_EFFICIENCY_GREEN, OPERATOR_EFFICIENCY_YELLOW),
    })
  }

  return ranking.sort((a, b) => b.efficiencyPct - a.efficiencyPct)
}

export interface MachineTrendPoint {
  date: string
  oee: number
  production: number
}

export function getMachineTrend(machineId: string, daysBack: number): MachineTrendPoint[] {
  const machine = getMachineById(machineId)!
  return getAvailableDates(daysBack).map((date) => {
    const records = filterRecords({ date, machineId })
    const kpis = aggregateMachineKpis(records, machine)
    return { date, oee: kpis.oee, production: kpis.production }
  })
}

export interface OperatorTrendPoint {
  date: string
  efficiencyPct: number
  production: number
}

export function getOperatorTrend(operatorId: string, daysBack: number): OperatorTrendPoint[] {
  return getAvailableDates(daysBack).map((date) => {
    const records = filterRecords({ date, operatorId })
    if (records.length === 0) return { date, efficiencyPct: 0, production: 0 }
    const efficiencies = records.map((r) => performanceOf(r, getMachineById(r.machineId)!))
    return {
      date,
      efficiencyPct: sum(efficiencies) / efficiencies.length,
      production: sum(records.map((r) => r.qtyProduced)),
    }
  })
}

export interface TimeBreakdown {
  productiveMin: number
  setupMin: number
  noProgramadaMin: number
  mantenimientoMin: number
}

export function getTimeBreakdown(records: ProductionRecord[]): TimeBreakdown {
  let setupMin = 0
  let noProgramadaMin = 0
  let mantenimientoMin = 0
  for (const r of records) {
    for (const d of r.downtimes) {
      if (d.type === 'setup') setupMin += d.minutes
      else if (d.type === 'no_programada') noProgramadaMin += d.minutes
      else mantenimientoMin += d.minutes
    }
  }
  return { productiveMin: sum(records.map((r) => r.timeProductiveMin)), setupMin, noProgramadaMin, mantenimientoMin }
}

export interface DowntimeLogRow {
  date: string
  shiftName: string
  type: ProductionRecord['downtimes'][number]['type']
  reason: string
  minutes: number
}

export function getDowntimeLog(machineId: string, from: string, to: string, limit = 10): DowntimeLogRow[] {
  const records = filterRecords({ machineId, from, to })
  const rows: DowntimeLogRow[] = []
  for (const r of records) {
    const shift = shifts.find((s) => s.id === r.shiftId)
    for (const d of r.downtimes) {
      rows.push({ date: r.date, shiftName: shift?.name ?? '', type: d.type, reason: d.reason, minutes: d.minutes })
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}

export { availabilityOf, oeeOf, performanceOf }
