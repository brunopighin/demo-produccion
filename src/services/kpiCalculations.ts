import type { Machine, MachineStatus, ProductionRecord } from '@/types'

export function availabilityOf(rec: ProductionRecord): number {
  return rec.timeProductiveMin / rec.timeAvailableMin
}

export function performanceOf(rec: ProductionRecord, machine: Machine): number {
  if (rec.timeProductiveMin === 0) return 0
  const actualRate = rec.qtyProduced / rec.timeProductiveMin
  return actualRate / machine.nominalSpeed
}

export function oeeOf(rec: ProductionRecord, machine: Machine): number {
  return availabilityOf(rec) * performanceOf(rec, machine)
}

/**
 * Estado semáforo de un valor frente a sus umbrales.
 * `lowerIsBetter` se usa para KPIs como scrap, donde un valor más bajo es mejor.
 */
export function statusFromThreshold(
  value: number,
  greenMin: number,
  yellowMin: number,
  lowerIsBetter = false,
): MachineStatus {
  if (lowerIsBetter) {
    if (value <= greenMin) return 'optimo'
    if (value <= yellowMin) return 'atencion'
    return 'critico'
  }
  if (value >= greenMin) return 'optimo'
  if (value >= yellowMin) return 'atencion'
  return 'critico'
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}
