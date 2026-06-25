import Card from '@/components/ui/Card'
import KpiCard from '@/components/ui/KpiCard'
import {
  getSimpleLineById,
  getSimpleLineDailyTotals,
  getSimpleLineShiftBreakdown,
  getLastAvailableSimpleDate,
} from '@/services/simpleLineService'
import { formatPct, formatQty } from '@/utils/format'
import { statusFromThreshold } from '@/services/kpiCalculations'

export default function SimpleLineDetail({ lineId }: { lineId: string }) {
  const line = getSimpleLineById(lineId)
  if (!line) return null

  const date = getLastAvailableSimpleDate()
  const totals = getSimpleLineDailyTotals(lineId, date)
  const shiftRows = getSimpleLineShiftBreakdown(lineId, date)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {line.metrics.map((metric) => (
          <KpiCard
            key={metric.key}
            label={metric.label}
            value={formatQty(totals.totals[metric.key] ?? 0, metric.unit)}
            status="sin_datos"
          />
        ))}
        <KpiCard
          label="Cumplimiento de objetivos"
          value={formatPct(totals.compliancePct, 0)}
          status={statusFromThreshold(totals.compliancePct, 0.9, 0.75)}
        />
      </div>

      <Card title="Detalle por turno" subtitle={date}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-status-idle">
              <th className="pb-2">Turno</th>
              <th className="pb-2">Operador</th>
              {line.metrics.map((metric) => (
                <th key={metric.key} className="pb-2">
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shiftRows.map((row) => (
              <tr key={row.shiftId}>
                <td className="py-2 font-medium text-brand-900">{row.shiftName}</td>
                <td className="py-2">{row.operatorName}</td>
                {line.metrics.map((metric) => (
                  <td key={metric.key} className="py-2">
                    {formatQty(row.values[metric.key] ?? 0, metric.unit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
