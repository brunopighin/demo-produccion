import clsx from 'clsx'
import { statusFromThreshold } from '@/services/kpiCalculations'
import type { DailySummary } from '@/types'
import { formatPct } from '@/utils/format'

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const CELL_COLOR = {
  optimo: 'bg-status-good text-white',
  atencion: 'bg-status-warn text-white',
  critico: 'bg-status-bad text-white',
  sin_datos: 'bg-status-idle-bg text-status-idle',
} as const

export default function ProductionCalendarHeatmap({
  year,
  month,
  dailyBreakdown,
}: {
  year: number
  month: number
  dailyBreakdown: DailySummary[]
}) {
  const byDate = new Map(dailyBreakdown.map((d) => [d.date, d]))
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7 // lunes=0

  const cells: ({ day: number; summary?: DailySummary } | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, summary: byDate.get(iso) })
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-status-idle">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} />
          const status = cell.summary ? statusFromThreshold(cell.summary.compliancePct, 0.95, 0.8) : 'sin_datos'
          return (
            <div
              key={idx}
              title={cell.summary ? `Cumplimiento: ${formatPct(cell.summary.compliancePct, 0)}` : 'Sin datos'}
              className={clsx(
                'flex aspect-square flex-col items-center justify-center rounded-md text-xs font-medium',
                CELL_COLOR[status],
              )}
            >
              {cell.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
