import type { AlertItem, AlertSeverity } from '@/types'
import { getAlertThreshold, getAllMachinesKpisForDate, getMachineById } from './productionService'
import { statusFromThreshold } from './kpiCalculations'

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

    const scrapThreshold = getAlertThreshold(machine.id, 'scrap')
    if (scrapThreshold) {
      const scrapStatus = statusFromThreshold(kpis.scrapPct, scrapThreshold.greenMin, scrapThreshold.yellowMin, true)
      const scrapSeverity = severityFromStatus(scrapStatus)
      if (scrapSeverity) {
        alerts.push({
          id: `alert-${date}-${machine.id}-scrap-${counter++}`,
          severity: scrapSeverity,
          machineId: machine.id,
          message: `${machine.name} — Scrap en ${(kpis.scrapPct * 100).toFixed(1)}% (umbral: ${(scrapThreshold.yellowMin * 100).toFixed(0)}%)`,
          createdAt: `${date}T18:05:00`,
          read: false,
        })
      }
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
