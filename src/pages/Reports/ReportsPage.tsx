import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { useReportsScreen } from '@/hooks/useReportsScreen'
import { REPORT_TYPES, buildReportModel, buildReportPdfUrl, type ReportFormat, type ReportParams, type ReportType } from '@/services/reportsService'
import { machines, getFirstAvailableDate, getLastAvailableDate } from '@/services/productionService'
import Card from '@/components/ui/Card'
import ReportPreview from './ReportPreview'
import ScheduledReportsCard from './ScheduledReportsCard'

const inputClass = 'w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-brand-500'

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const maxDate = (a: string, b: string) => (a > b ? a : b)

export default function ReportsPage() {
  const { generating, lastFile, error, generate } = useReportsScreen()
  const firstDate = getFirstAvailableDate()
  const lastDate = getLastAvailableDate()

  const [reportType, setReportType] = useState<ReportType>('produccion_diaria')
  const [from, setFrom] = useState(lastDate)
  const [to, setTo] = useState(lastDate)
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [selectedMachines, setSelectedMachines] = useState<string[]>(machines.map((m) => m.id))
  const [showPreview, setShowPreview] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const presets = [
    { label: 'Último día', from: lastDate, to: lastDate },
    { label: 'Últimos 7 días', from: maxDate(shiftDate(lastDate, -6), firstDate), to: lastDate },
    { label: 'Mes actual', from: maxDate(`${lastDate.slice(0, 7)}-01`, firstDate), to: lastDate },
    { label: 'Todo', from: firstDate, to: lastDate },
  ]

  const validationError =
    !from || !to
      ? 'Elegí las fechas del período.'
      : from > to
        ? 'La fecha "desde" no puede ser posterior a "hasta".'
        : selectedMachines.length === 0
          ? 'Elegí al menos una máquina.'
          : null

  const params: ReportParams = useMemo(
    () => ({ reportType, from, to, machineIds: selectedMachines, includeCharts: format === 'pdf' && includeCharts }),
    [reportType, from, to, selectedMachines, includeCharts, format],
  )
  // La vista previa se recalcula sola con cada cambio de opciones.
  const model = useMemo(() => (showPreview && !validationError ? buildReportModel(params) : null), [showPreview, validationError, params])

  useEffect(() => {
    if (showPreview) previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showPreview])

  function changeReportType(type: ReportType) {
    setReportType(type)
    // El mensual arranca mostrando el mes del último día con datos.
    if (type === 'produccion_mensual' && from === to) setFrom(presets[2].from)
  }

  function toggleMachine(id: string) {
    setSelectedMachines((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  function toggleAllMachines() {
    setSelectedMachines((prev) => (prev.length === machines.length ? [] : machines.map((m) => m.id)))
  }

  function openPdf() {
    const url = buildReportPdfUrl(params)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const description = REPORT_TYPES.find((r) => r.value === reportType)?.description

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Generar reporte</h1>
        <p className="text-sm text-status-idle">Exportá los indicadores ya calculados en PDF o Excel.</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="report-type" className="mb-1 block text-xs font-medium text-brand-900">Tipo de reporte</label>
            <select id="report-type" value={reportType} onChange={(e) => changeReportType(e.target.value as ReportType)} className={inputClass}>
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {description && <p className="mt-1 text-xs text-status-idle">{description}</p>}
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-brand-900">Período</span>
            <div className="flex items-center gap-2 text-sm text-status-idle">
              <input type="date" aria-label="Desde" value={from} min={firstDate} max={lastDate} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
              <span>→</span>
              <input type="date" aria-label="Hasta" value={to} min={firstDate} max={lastDate} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setFrom(p.from); setTo(p.to) }}
                  className={clsx(
                    'rounded-full border px-2.5 py-0.5 text-xs',
                    from === p.from && to === p.to ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-border text-status-idle hover:bg-surface',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <span className="mb-1 block text-xs font-medium text-brand-900">Máquinas</span>
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
            <span className="mb-1 block text-xs font-medium text-brand-900">Formato</span>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="format" checked={format === 'pdf'} onChange={() => setFormat('pdf')} /> PDF
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="format" checked={format === 'excel'} onChange={() => setFormat('excel')} /> Excel
              </label>
            </div>
          </div>
          <label className={clsx('flex items-center gap-1.5 text-sm', format === 'pdf' ? 'text-status-idle' : 'text-status-idle/50')}>
            <input type="checkbox" checked={format === 'pdf' && includeCharts} disabled={format !== 'pdf'} onChange={(e) => setIncludeCharts(e.target.checked)} />
            Incluir gráficos {format !== 'pdf' && '(solo PDF)'}
          </label>
        </div>

        {validationError && <p className="mt-4 text-sm font-medium text-status-bad">{validationError}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowPreview((v) => !v)}
            disabled={!showPreview && !!validationError}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-brand-900 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showPreview ? 'Ocultar vista previa' : 'Vista previa'}
          </button>
          <button
            onClick={() => generate(params, format)}
            disabled={generating || !!validationError}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed',
              generating || validationError ? 'bg-brand-300' : 'bg-brand-600 hover:bg-brand-700',
            )}
          >
            {generating ? 'Generando...' : 'Generar y descargar ⬇'}
          </button>
          {lastFile && !generating && !error && (
            <span className="text-sm font-medium text-status-good">✓ {lastFile} generado correctamente.</span>
          )}
          {error && !generating && <span className="text-sm font-medium text-status-bad">{error}</span>}
        </div>
      </Card>

      {showPreview && (
        <div ref={previewRef} className="scroll-mt-4">
          <Card
            title="Vista previa"
            subtitle={format === 'pdf' ? 'Mismo contenido que el PDF descargado.' : 'Mismo contenido que el Excel descargado.'}
            action={
              format === 'pdf' && model && model.daysWithData > 0 ? (
                <button onClick={openPdf} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-surface">
                  Abrir PDF en otra pestaña ↗
                </button>
              ) : undefined
            }
          >
            {model ? <ReportPreview model={model} /> : <p className="text-sm text-status-idle">{validationError}</p>}
          </Card>
        </div>
      )}

      <ScheduledReportsCard />
    </div>
  )
}
