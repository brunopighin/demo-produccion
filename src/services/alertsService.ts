import type { AlertItem, AlertSeverity } from '@/types'
import { getAllMachinesKpisForDate, getMachineById } from './productionService'

function severityFromStatus(status: 'optimo' | 'atencion' | 'critico' | 'sin_datos'): AlertSeverity | null {
  if (status === 'critico') return 'critica'
  if (status === 'atencion') return 'atencion'
  return null
}

export function getAlertsForDate(date: string): AlertItem[] {
  const alerts: AlertItem[] = []
  const machineKpis = getAllMachinesKpisForDate(date)
  let counter = 1

  for (const kpis of machineKpis) {
    const machine = getMachineById(kpis.machineId)!

    const oeeSeverity = severityFromStatus(kpis.status)
    if (oeeSeverity) {
      alerts.push({
        id: `alert-${date}-${machine.id}-oee-${counter++}`,
        severity: oeeSeverity,
        machineId: machine.id,
        message: `${machine.name} — Rendimiento OEE en ${(kpis.oee * 100).toFixed(0)}%`,
        createdAt: `${date}T18:00:00`,
        read: false,
      })
    }

  }

  const best = [...machineKpis].sort((a, b) => b.oee - a.oee)[0]
  if (best && best.status === 'optimo') {
    const machine = getMachineById(best.machineId)!
    alerts.push({
      id: `alert-${date}-${machine.id}-best-${counter++}`,
      severity: 'info',
      machineId: machine.id,
      message: `${machine.name} — Mejor OEE del día (${(best.oee * 100).toFixed(0)}%)`,
      createdAt: `${date}T18:10:00`,
      read: false,
    })
  }

  const severityOrder: Record<AlertSeverity, number> = { critica: 0, atencion: 1, info: 2 }
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
