export type ReportType =
  | 'produccion_diaria'
  | 'produccion_mensual'
  | 'por_maquina'
  | 'por_operador'
  | 'scrap'
  | 'cumplimiento'
  | 'indicadores_gestion'

export type ReportFormat = 'pdf' | 'excel'

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'produccion_diaria', label: 'Producción Diaria' },
  { value: 'produccion_mensual', label: 'Producción Mensual' },
  { value: 'por_maquina', label: 'Por Máquina' },
  { value: 'por_operador', label: 'Por Operador' },
  { value: 'scrap', label: 'Scrap' },
  { value: 'cumplimiento', label: 'Cumplimiento de Objetivos' },
  { value: 'indicadores_gestion', label: 'Indicadores de Gestión' },
]

export interface ScheduledReport {
  id: string
  reportType: ReportType
  frequency: string
  recipients: string
  nextRun: string
}

export const scheduledReports: ScheduledReport[] = [
  { id: 'sch-1', reportType: 'produccion_diaria', frequency: 'Diaria 07:00', recipients: '3 destinatarios', nextRun: 'Mañana' },
  { id: 'sch-2', reportType: 'indicadores_gestion', frequency: 'Mensual', recipients: 'Gerencia (2)', nextRun: '01/07/2026' },
]

export function buildFilename(reportType: ReportType, format: ReportFormat, dateLabel: string): string {
  const ext = format === 'pdf' ? 'pdf' : 'xlsx'
  return `reporte_${reportType}_${dateLabel}.${ext}`
}

/** Simula el tiempo de generación de un reporte: la demo no produce un archivo real todavía. */
export function simulateReportGeneration(durationMs = 1500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs))
}
