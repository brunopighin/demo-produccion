import clsx from 'clsx'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import type { MachineStatus } from '@/types'

interface KpiCardProps {
  label: string
  value: string
  status?: MachineStatus
  delta?: string
  deltaPositive?: boolean
  sparkline?: number[]
}

const STATUS_BAR: Record<MachineStatus, string> = {
  optimo: 'border-l-status-good',
  atencion: 'border-l-status-warn',
  critico: 'border-l-status-bad',
  sin_datos: 'border-l-border',
}

const SPARK_COLOR: Record<MachineStatus, string> = {
  optimo: '#1e9e5a',
  atencion: '#c98a00',
  critico: '#d23c3c',
  sin_datos: '#8a97a8',
}

export default function KpiCard({ label, value, status = 'sin_datos', delta, deltaPositive, sparkline }: KpiCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border border-l-4 bg-surface-alt p-4 shadow-sm',
        STATUS_BAR[status],
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-status-idle">{label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-2xl font-semibold text-brand-900">{value}</p>
        {sparkline && sparkline.length > 1 && (
          <div className="h-8 w-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline.map((v) => ({ v }))}>
                <Line type="monotone" dataKey="v" stroke={SPARK_COLOR[status]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {delta && (
        <p className={clsx('mt-1 text-xs font-medium', deltaPositive ? 'text-status-good' : 'text-status-bad')}>
          {delta}
        </p>
      )}
    </div>
  )
}
