import clsx from 'clsx'
import type { AlertItem, AlertSeverity } from '@/types'
import { getMachineById } from '@/services/productionService'

const ICON: Record<AlertSeverity, string> = { critica: '🔴', atencion: '🟡', info: '🟢' }
const TEXT_COLOR: Record<AlertSeverity, string> = {
  critica: 'text-status-bad',
  atencion: 'text-status-warn',
  info: 'text-status-good',
}

export default function AlertList({ alerts, limit }: { alerts: AlertItem[]; limit?: number }) {
  const visible = limit ? alerts.slice(0, limit) : alerts

  if (visible.length === 0) {
    return <p className="text-sm text-status-idle">Sin alertas para el período seleccionado.</p>
  }

  return (
    <ul className="space-y-3">
      {visible.map((alert) => (
        <li key={alert.id} className="flex items-start gap-2 text-sm">
          <span>{ICON[alert.severity]}</span>
          <div>
            <p className={clsx('font-medium', TEXT_COLOR[alert.severity])}>{getMachineById(alert.machineId)?.name}</p>
            <p className="text-status-idle">{alert.message}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
