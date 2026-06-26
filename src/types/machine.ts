export type MachineType = 'corrugadora' | 'flexo' | 'troqueladora'
export type ProductionUnit = 'm2' | 'golpes' | 'fardos' | 'rotulos' | 'bultos'

export interface Machine {
  id: string
  code: string
  name: string
  type: MachineType
  unit: ProductionUnit // unidad de producción: m2 (corrugadora) o golpes (resto)
  nominalSpeed: number // unidades/min nominal (según `unit`), referencia para cálculo de rendimiento
  linealSpeedMph?: number // velocidad nominal en metros lineales/hora (solo corrugadora)
  formatWidth?: number // ancho de formato (m² por metro lineal) usado para derivar nominalSpeed
  m2PerUnit?: number // m² equivalentes por golpe (solo máquinas con unit === 'golpes'), usado en la planilla detallada
}

export type MachineStatus = 'optimo' | 'atencion' | 'critico' | 'sin_datos'
