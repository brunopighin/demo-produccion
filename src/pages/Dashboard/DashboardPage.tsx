import { useDashboardData } from '@/hooks/useDashboardData'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { machines, operators, getMachineById } from '@/services/productionService'
import { objectives } from '@/services/productionService'
import { simpleLines, getSimpleLineDailyTotals, getLastAvailableSimpleDate } from '@/services/simpleLineService'
import { statusFromThreshold, sum } from '@/services/kpiCalculations'
import KpiCard from '@/components/ui/KpiCard'
import Card from '@/components/ui/Card'
import AlertList from '@/components/ui/AlertList'
import MachineProductionBar from '@/components/charts/MachineProductionBar'
import ShiftEfficiencyChart from '@/components/charts/ShiftEfficiencyChart'
import WeeklyTrendChart from '@/components/charts/WeeklyTrendChart'
import { formatDateLong, formatGolpes, formatM2, formatMinutesAsHours, formatPct, formatQty } from '@/utils/format'

export default function DashboardPage() {
  const { date, summary, machineKpis, alerts, weeklyTrend, shiftSummary } = useDashboardData()
  const monthly = useMonthlySummary()
  const simpleLineDate = getLastAvailableSimpleDate()
  const simpleLineTotals = simpleLines.map((l) => ({ line: l, totals: getSimpleLineDailyTotals(l.id, simpleLineDate) }))

  const corrugadoraTarget = sum(
    machines
      .filter((m) => m.unit === 'm2')
      .map((m) => objectives.find((o) => o.machineId === m.id && o.kpiType === 'production' && o.periodType === 'daily')?.targetValue ?? 0),
  )
  const golpesTarget = sum(
    machines
      .filter((m) => m.unit === 'golpes')
      .map((m) => objectives.find((o) => o.machineId === m.id && o.kpiType === 'production' && o.periodType === 'daily')?.targetValue ?? 0),
  )
  const productionM2Status = statusFromThreshold(summary.productionM2 / Math.max(corrugadoraTarget, 1), 0.95, 0.8)
  const productionGolpesStatus = statusFromThreshold(summary.productionGolpes / Math.max(golpesTarget, 1), 0.95, 0.8)
  const oeeStatus = statusFromThreshold(summary.oeeAvg, 0.78, 0.65)
  const complianceStatus = statusFromThreshold(summary.compliancePct, 0.9, 0.75)
  const machinesRatio = summary.activeMachines / machines.length
  const machinesStatus = statusFromThreshold(machinesRatio, 1, 0.85)
  const activeOperatorsTotal = operators.filter((o) => o.active).length
  const operatorsRatio = summary.activeOperators / Math.max(activeOperatorsTotal, 1)
  const operatorsStatus = statusFromThreshold(operatorsRatio, 0.9, 0.7)

  const yesterday = weeklyTrend[weeklyTrend.length - 2]
  const productionM2Delta = yesterday
    ? ((summary.productionM2 - yesterday.productionM2) / Math.max(yesterday.productionM2, 1)) * 100
    : 0
  const productionGolpesDelta = yesterday
    ? ((summary.productionGolpes - yesterday.productionGolpes) / Math.max(yesterday.productionGolpes, 1)) * 100
    : 0

  const machineBarData = machineKpis.map((k) => ({
    name: getMachineById(k.machineId)!.name,
    value: k.production,
    unit: k.unit,
    status: k.status,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Resumen del día</h1>
        <p className="text-sm text-status-idle capitalize">{formatDateLong(date)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Producción del día (Corrugadora)"
          value={formatM2(summary.productionM2)}
          status={productionM2Status}
          delta={`${productionM2Delta >= 0 ? '▲' : '▼'} ${Math.abs(productionM2Delta).toFixed(1)}% vs ayer`}
          deltaPositive={productionM2Delta >= 0}
          sparkline={weeklyTrend.map((d) => d.productionM2)}
        />
        <KpiCard
          label="Producción del día (resto de máquinas)"
          value={formatGolpes(summary.productionGolpes)}
          status={productionGolpesStatus}
          delta={`${productionGolpesDelta >= 0 ? '▲' : '▼'} ${Math.abs(productionGolpesDelta).toFixed(1)}% vs ayer`}
          deltaPositive={productionGolpesDelta >= 0}
          sparkline={weeklyTrend.map((d) => d.productionGolpes)}
        />
        <KpiCard
          label="Rendimiento promedio (OEE)"
          value={formatPct(summary.oeeAvg, 1)}
          status={oeeStatus}
          sparkline={weeklyTrend.map((d) => d.oeeAvg)}
        />
        <KpiCard label="Setup" value={formatMinutesAsHours(summary.setupMinutes)} status="sin_datos" />
        <KpiCard
          label="Cumplimiento de objetivos"
          value={formatPct(summary.compliancePct, 0)}
          status={complianceStatus}
        />
        <KpiCard
          label="Máquinas activas"
          value={`${summary.activeMachines} / ${machines.length}`}
          status={machinesStatus}
        />
        <KpiCard
          label="Operadores activos"
          value={`${summary.activeOperators} / ${activeOperatorsTotal}`}
          status={operatorsStatus}
        />
        <KpiCard label="Producción mensual (Corrugadora)" value={formatM2(monthly.productionM2)} status="sin_datos" />
        <KpiCard label="Producción mensual (resto de máquinas)" value={formatGolpes(monthly.productionGolpes)} status="sin_datos" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Producción por máquina (hoy)">
          <MachineProductionBar data={machineBarData} />
        </Card>
        <Card title="Eficiencia por turno">
          <ShiftEfficiencyChart data={shiftSummary} />
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-status-idle">
            {shiftSummary.map((s) => (
              <div key={s.shiftId}>
                {s.shiftName} · Cumplimiento <span className="font-semibold text-brand-900">{formatPct(s.compliancePct, 0)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Tendencia semanal (producción)" className="lg:col-span-2">
          <WeeklyTrendChart data={weeklyTrend} />
        </Card>
        <Card title="Alertas recientes">
          <AlertList alerts={alerts} limit={6} />
        </Card>
      </div>

      <Card title="Picadero y Flejadora (hoy)" subtitle={simpleLineDate}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {simpleLineTotals.map(({ line, totals }) =>
            line.metrics.map((metric) => (
              <KpiCard
                key={metric.key}
                label={`${line.name} · ${metric.label}`}
                value={formatQty(totals.totals[metric.key] ?? 0, metric.unit)}
                status="sin_datos"
              />
            )),
          )}
        </div>
      </Card>
    </div>
  )
}
