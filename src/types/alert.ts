export type AlertSeverity = 'critica' | 'atencion' | 'info'

export interface AlertItem {
  id: string
  severity: AlertSeverity
  machineId: string
  message: string
  createdAt: string // ISO datetime
  read: boolean
}
