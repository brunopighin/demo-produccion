import clsx from 'clsx'
import type { ReportModel } from '@/services/reportsService'
import type { ReportChart, Tone } from '@/services/reportModel'

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-status-good',
  warn: 'text-status-warn',
  bad: 'text-status-bad',
  brand: 'text-brand-600',
}

const TONE_BG: Record<Tone, string> = {
  good: 'bg-status-good',
  warn: 'bg-status-warn',
  bad: 'bg-status-bad',
  brand: 'bg-brand-600',
}

/** Vista previa en pantalla del mismo modelo que se exporta a PDF/Excel. */
export default function ReportPreview({ model }: { model: ReportModel }) {
  return (
    <div className="rounded-lg border border-border p-4 md:p-5">
      <div className="flex items-start gap-2 border-b-2 border-brand-600 pb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-700 text-xs font-bold text-white">BJP</div>
        <div className="min-w-0">
          <p className="font-semibold text-brand-900">{model.title}</p>
          <p className="text-xs text-status-idle">{model.subtitle}</p>
        </div>
      </div>

      {model.daysWithData === 0 ? (
        <p className="mt-4 rounded-lg bg-status-warn-bg p-3 text-sm text-status-warn">
          No hay datos de producción para el período y las máquinas seleccionadas.
        </p>
      ) : (
        <>
          {model.stats.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {model.stats.map((s) => (
                <div key={s.label} className="rounded-lg bg-surface p-3 text-center">
                  <p className="text-lg font-semibold text-brand-900">{s.value}</p>
                  <p className="text-xs text-status-idle">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {model.tables.map((table) => (
            <div key={table.title} className="mt-5">
              <h4 className="mb-2 text-sm font-semibold text-brand-600">{table.title}</h4>
              {table.rows.length === 0 ? (
                <p className="text-sm text-status-idle">Sin registros.</p>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="bg-surface text-xs text-status-idle">
                        {table.head.map((h, i) => (
                          <th key={h} className={clsx('px-2 py-1.5 font-semibold', i < table.textColumns ? 'text-left' : 'text-right')}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {table.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, i) => (
                            <td
                              key={i}
                              className={clsx(
                                'px-2 py-1.5',
                                i < table.textColumns ? 'text-left' : 'text-right tabular-nums',
                                cell.tone && ['font-semibold', TONE_TEXT[cell.tone]],
                              )}
                            >
                              {cell.text}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {model.charts.map((chart) => (
            <PreviewChart key={chart.title} chart={chart} />
          ))}
        </>
      )}
    </div>
  )
}

function PreviewChart({ chart }: { chart: ReportChart }) {
  const max = Math.max(...chart.items.map((i) => i.value), 0.0001)
  const dense = chart.items.length > 12
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-sm font-semibold text-brand-900">{chart.title}</h4>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className={clsx('flex h-40 items-end gap-1 border-b border-border', dense && 'min-w-[600px]')}>
          {chart.items.map((item) => (
            <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${item.label}: ${item.valueLabel}`}>
              {!dense && <span className="mb-0.5 text-[10px] font-semibold text-brand-900">{item.valueLabel}</span>}
              <div className={clsx('w-full max-w-12 rounded-t', TONE_BG[item.tone])} style={{ height: `${Math.max((item.value / max) * 85, 1)}%` }} />
            </div>
          ))}
        </div>
        <div className={clsx('flex gap-1', dense && 'min-w-[600px]')}>
          {chart.items.map((item) => (
            <span key={item.label} className={clsx('min-w-0 flex-1 truncate pt-1 text-center text-status-idle', dense ? 'text-[8px]' : 'text-[10px]')}>
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
