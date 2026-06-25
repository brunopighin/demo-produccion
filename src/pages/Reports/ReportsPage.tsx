import { useState } from 'react'
import clsx from 'clsx'
import { useReportsScreen } from '@/hooks/useReportsScreen'
import { REPORT_TYPES, scheduledReports, type ReportFormat, type ReportType } from '@/services/reportsService'
import { machines, getDailySummary, getLastAvailableDate } from '@/services/productionService'
import Card from '@/components/ui/Card'
import { formatDateLong, formatGolpes, formatM2, formatPct } from '@/utils/format'

export default function ReportsPage() {
  const { generating, lastFile, generate } = useReportsScreen()
  const [reportType, setReportType] = useState<ReportType>('produccion_diaria')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [selectedMachines, setSelectedMachines] = useState<string[]>(machines.map((m) => m.id))
  const [showPreview, setShowPreview] = useState(false)

  const date = getLastAvailableDate()
  const summary = getDailySummary(date)
  const reportLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label ?? ''

  function toggleMachine(id: string) {
    setSelectedMachines((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  function toggleAllMachines() {
    setSelectedMachines((prev) => (prev.length === machines.length ? [] : machines.map((m) => m.id)))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Generar reporte</h1>
        <p className="text-sm text-status-idle">Exportá los indicadores ya calculados en PDF o Excel.</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-900">Tipo de reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-900">Período</label>
            <div className="flex items-center gap-2 text-sm text-status-idle">
              <input type="date" defaultValue={date} className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-brand-500" />
              <span>→</span>
              <input type="date" defaultValue={date} className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-brand-500" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-brand-900">Máquinas</label>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={selectedMachines.length === machines.length} onChange={toggleAllMachines} />
              Todas
            </label>
            {machines.map((m) => (
              <label key={m.id} className="flex items-center gap-1.5 text-sm text-status-idle">
                <input type="checkbox" checked={selectedMachines.includes(m.id)} onChange={() => toggleMachine(m.id)} />
                {m.name}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-900">Formato</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={format === 'pdf'} onChange={() => setFormat('pdf')} /> PDF
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={format === 'excel'} onChange={() => setFormat('excel')} /> Excel
              </label>
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-sm text-status-idle">
            <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} />
            Incluir gráficos
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-brand-900 hover:bg-surface"
          >
            Vista previa
          </button>
          <button
            onClick={() => generate(reportType, format)}
            disabled={generating}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-semibold text-white',
              generating ? 'bg-brand-300' : 'bg-brand-600 hover:bg-brand-700',
            )}
          >
            {generating ? 'Generando...' : 'Generar y descargar ⬇'}
          </button>
          {lastFile && !generating && (
            <span className="text-sm font-medium text-status-good">✓ {lastFile} generado correctamente.</span>
          )}
        </div>
      </Card>

      {showPreview && (
        <Card title="Vista previa">
          <div className="rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-700 text-xs font-bold text-white">
                BJP
              </div>
              <div>
                <p className="font-semibold text-brand-900">{reportLabel.toUpperCase()} — {formatDateLong(date)}</p>
                <p className="text-xs text-status-idle">
                  Máquinas incluidas: {selectedMachines.length} de {machines.length} · Formato: {format.toUpperCase()}
                  {includeCharts ? ' · con gráficos' : ''}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <PreviewStat label="Producción Corrugadora" value={formatM2(summary.productionM2)} />
              <PreviewStat label="Producción resto de máquinas" value={formatGolpes(summary.productionGolpes)} />
              <PreviewStat label="OEE promedio" value={formatPct(summary.oeeAvg, 1)} />
              <PreviewStat label="Scrap" value={formatPct(summary.scrapPct, 1)} />
              <PreviewStat label="Cumplimiento" value={formatPct(summary.compliancePct, 0)} />
            </div>
            {includeCharts && (
              <div className="mt-4 flex h-24 items-center justify-center rounded-lg bg-surface text-xs text-status-idle">
                [ gráficos del reporte se renderizan aquí, igual estética que los dashboards ]
              </div>
            )}
          </div>
        </Card>
      )}

      <Card title="Reportes programados">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-status-idle">
              <th className="pb-2">Reporte</th>
              <th className="pb-2">Frecuencia</th>
              <th className="pb-2">Destinatarios</th>
              <th className="pb-2">Próxima</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {scheduledReports.map((s) => (
              <tr key={s.id}>
                <td className="py-2 font-medium text-brand-900">
                  {REPORT_TYPES.find((r) => r.value === s.reportType)?.label}
                </td>
                <td className="py-2">{s.frequency}</td>
                <td className="py-2">{s.recipients}</td>
                <td className="py-2">{s.nextRun}</td>
                <td className="py-2 text-right text-brand-700">Editar</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mt-3 text-sm font-medium text-brand-700 hover:underline">+ Programar nuevo envío</button>
      </Card>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface p-3 text-center">
      <p className="text-lg font-semibold text-brand-900">{value}</p>
      <p className="text-xs text-status-idle">{label}</p>
    </div>
  )
}
