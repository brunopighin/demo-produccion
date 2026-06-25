import type { MachineStatus, ProductionUnit } from './machine'

export interface MachineKpis {
  machineId: string
  production: number
  unit: ProductionUnit
  availability: number // 0-1
  performance: number // 0-1
  oee: number // 0-1
  setupMinutes: number
  status: MachineStatus
}

export interface DailySummary {
  date: string
  productionM2: number // producción de la corrugadora
  productionGolpes: number // producción sumada del resto de máquinas
  oeeAvg: number
  setupMinutes: number
  compliancePct: number
  activeMachines: number
  activeOperators: number
}

export interface OperatorKpis {
  operatorId: string
  production: number
  unit: ProductionUnit
  efficiencyPct: number
  setups: number
  status: MachineStatus
}
