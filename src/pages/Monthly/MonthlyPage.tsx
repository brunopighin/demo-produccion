import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { getMachineById, getOperatorById } from '@/services/productionService'
import Card from '@/components/ui/Card'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import ProductionCalendarHeatmap from '@/components/charts/ProductionCalendarHeatmap'
import MachineProductionBar from '@/components/charts/MachineProductionBar'
import MonthlyComparisonChart from '@/components/charts/MonthlyComparisonChart'
import { statusFromThreshold } from '@/services/kpiCalculations'
import { formatGolpes, formatM2, formatMinutesAsHours, formatPct, formatQty } from '@/utils/format'

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function deltaPct(current: number, previous?: number): number | null {
  if (previous === undefined || previous === 0) return null
  return ((current - previous) / previous) * 100
}

export default function MonthlyPage() {
  const monthly = useMonthlySummary()
  const { year, month, productionM2, productionGolpes, oeeAvg, scrapPct, compliancePct, dailyBreakdown, machineKpis, previous, trend, operatorRanking } = monthly

  const prodM2Delta = deltaPct(productionM2, previous?.productionM2)
  const prodGolpesDelta = deltaPct(productionGolpes, previous?.productionGolpes)
  const oeeDelta = deltaPct(oeeAvg, previous?.oeeAvg)
  const scrapDelta = deltaPct(scrapPct, previous?.scrapPct)
  const complianceDelta = deltaPct(compliancePct, previous?.compliancePct)

  const machineBarData = machineKpis.map((k) => ({
    name: getMachineById(k.machineId)!.name,
    value: k.production,
    unit: k.unit,
    status: k.status,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Producción mensual</h1>
        <p className="text-sm text-status-idle">{MONTH_LABELS[month - 1]} {year}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Producción Corrugadora"
          value={formatM2(productionM2)}
          status={statusFromThreshold(compliancePct, 0.95, 0.8)}
          delta={prodM2Delta !== null ? `${prodM2Delta >= 0 ? '▲' : '▼'} ${Math.abs(prodM2Delta).toFixed(1)}% vs mes anterior` : undefined}
          deltaPositive={prodM2Delta !== null && prodM2Delta >= 0}
        />
        <KpiCard
          label="Producción resto de máquinas"
          value={formatGolpes(productionGolpes)}
          status={statusFromThreshold(compliancePct, 0.95, 0.8)}
          delta={prodGolpesDelta !== null ? `${prodGolpesDelta >= 0 ? '▲' : '▼'} ${Math.abs(prodGolpesDelta).toFixed(1)}% vs mes anterior` : undefined}
          deltaPositive={prodGolpesDelta !== null && prodGolpesDelta >= 0}
        />
        <KpiCard
          label="OEE promedio"
          value={formatPct(oeeAvg, 1)}
          status={statusFromThreshold(oeeAvg, 0.78, 0.65)}
          delta={oeeDelta !== null ? `${oeeDelta >= 0 ? '▲' : '▼'} ${Math.abs(oeeDelta).toFixed(1)}pp vs mes anterior` : undefined}
          deltaPositive={oeeDelta !== null && oeeDelta >= 0}
        />
        <KpiCard
          label="Scrap promedio"
          value={formatPct(scrapPct, 1)}
          status={statusFromThreshold(scrapPct, 0.04, 0.06, true)}
          delta={scrapDelta !== null ? `${scrapDelta >= 0 ? '▲' : '▼'} ${Math.abs(scrapDelta).toFixed(1)}% vs mes anterior` : undefined}
          deltaPositive={scrapDelta !== null && scrapDelta < 0}
        />
        <KpiCard
          label="Cumplimiento de objetivos"
          value={formatPct(compliancePct, 0)}
          status={statusFromThreshold(compliancePct, 0.9, 0.75)}
          delta={complianceDelta !== null ? `${complianceDelta >= 0 ? '▲' : '▼'} ${Math.abs(complianceDelta).toFixed(1)}% vs mes anterior` : undefined}
          deltaPositive={complianceDelta !== null && complianceDelta >= 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Producción diaria del mes" subtitle="Verde: dentro de meta · Amarillo: desvío leve · Rojo: crítico">
          <ProductionCalendarHeatmap year={year} month={month} dailyBreakdown={dailyBreakdown} />
        </Card>
        <Card title="Producción por máquina (acumulado mes)">
          <MachineProductionBar data={machineBarData} />
        </Card>
      </div>

      <Card title="Comparativo mes a mes">
        <MonthlyComparisonChart data={trend} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Resumen mensual por máquina">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-status-idle">
                <th className="pb-2">Máquina</th>
                <th className="pb-2">Producción</th>
                <th className="pb-2">OEE</th>
                <th className="pb-2">Scrap</th>
                <th className="pb-2">Setup</th>
                <th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {machineKpis.map((k) => (
                <tr key={k.machineId}>
                  <td className="py-2 font-medium text-brand-900">{getMachineById(k.machineId)?.name}</td>
                  <td className="py-2">{formatQty(k.production, k.unit)}</td>
                  <td className="py-2">{formatPct(k.oee, 1)}</td>
                  <td className="py-2">{formatPct(k.scrapPct, 1)}</td>
                  <td className="py-2">{formatMinutesAsHours(k.setupMinutes)}</td>
                  <td className="py-2">
                    <StatusBadge status={k.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Ranking mensual de operadores">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-status-idle">
                <th className="pb-2">#</th>
                <th className="pb-2">Operador</th>
                <th className="pb-2">Producción</th>
                <th className="pb-2">Eficiencia</th>
                <th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {operatorRanking.slice(0, 8).map((r, idx) => (
                <tr key={r.operatorId}>
                  <td className="py-2">{idx + 1}</td>
                  <td className="py-2 font-medium text-brand-900">{getOperatorById(r.operatorId)?.name}</td>
                  <td className="py-2">{formatQty(r.production, r.unit)}</td>
                  <td className="py-2">{formatPct(r.efficiencyPct, 0)}</td>
                  <td className="py-2">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
