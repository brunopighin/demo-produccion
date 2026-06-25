import clsx from 'clsx'
import type { MachineStatus } from '@/types'

const STYLES: Record<MachineStatus, string> = {
  optimo: 'bg-status-good-bg text-status-good',
  atencion: 'bg-status-warn-bg text-status-warn',
  critico: 'bg-status-bad-bg text-status-bad',
  sin_datos: 'bg-status-idle-bg text-status-idle',
}

const LABELS: Record<MachineStatus, string> = {
  optimo: 'Óptimo',
  atencion: 'Atención',
  critico: 'Crítico',
  sin_datos: 'Sin datos',
}

export default function StatusBadge({ status, className }: { status: MachineStatus; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        STYLES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  )
}
