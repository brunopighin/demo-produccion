import type { Machine, MachineKpis, DailySummary } from '@/types'
import { formatDateLong, formatM2, formatGolpes, formatNumber, formatPct, formatQty } from '@/utils/format'

export type ReportType =
  | 'produccion_diaria'
  | 'produccion_mensual'
  | 'por_maquina'
  | 'por_operador'
  | 'scrap'
  | 'cumplimiento'
  | 'indicadores_gestion'

export type ReportFormat = 'pdf' | 'excel'

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'produccion_diaria', label: 'Producción Diaria' },
  { value: 'produccion_mensual', label: 'Producción Mensual' },
  { value: 'por_maquina', label: 'Por Máquina' },
  { value: 'por_operador', label: 'Por Operador' },
  { value: 'scrap', label: 'Scrap' },
  { value: 'cumplimiento', label: 'Cumplimiento de Objetivos' },
  { value: 'indicadores_gestion', label: 'Indicadores de Gestión' },
]

export interface ScheduledReport {
  id: string
  reportType: ReportType
  frequency: string
  recipients: string
  nextRun: string
}

export const scheduledReports: ScheduledReport[] = [
  { id: 'sch-1', reportType: 'produccion_diaria', frequency: 'Diaria 07:00', recipients: '3 destinatarios', nextRun: 'Mañana' },
  { id: 'sch-2', reportType: 'indicadores_gestion', frequency: 'Mensual', recipients: 'Gerencia (2)', nextRun: '01/07/2026' },
]

export function buildFilename(reportType: ReportType, format: ReportFormat, dateLabel: string): string {
  const ext = format === 'pdf' ? 'pdf' : 'csv'
  return `reporte_${reportType}_${dateLabel}.${ext}`
}

export interface ReportData {
  reportType: ReportType
  date: string
  summary: DailySummary
  machines: Machine[]
  machineKpis: MachineKpis[]
  includeCharts: boolean
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

interface BarChartItem {
  label: string
  value: number
  valueLabel: string
  color: string
}

/** Gráfico de barras verticales en SVG puro: se imprime/exporta a PDF tal cual, sin depender de canvas ni de la ventana abierta. */
function buildBarChartSvg(items: BarChartItem[], title: string): string {
  const width = 760
  const height = 200
  const barGap = 14
  const barWidth = (width - barGap * (items.length + 1)) / items.length
  const chartTop = 24
  const chartBottom = height - 28
  const usableHeight = chartBottom - chartTop
  const maxValue = Math.max(...items.map((i) => i.value), 0.0001)

  const bars = items
    .map((item, i) => {
      const x = barGap + i * (barWidth + barGap)
      const barHeight = Math.max((item.value / maxValue) * usableHeight, 1)
      const y = chartBottom - barHeight
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${item.color}" rx="2" />
        <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="10" font-weight="bold" fill="#1f2937">${escapeHtml(item.valueLabel)}</text>
        <text x="${x + barWidth / 2}" y="${chartBottom + 14}" text-anchor="middle" font-size="9" fill="#6b7280">${escapeHtml(item.label)}</text>
      `
    })
    .join('')

  return `<div style="margin-bottom:16px;">
    <p style="font-size:11px;font-weight:bold;color:#1f2937;margin:0 0 4px;">${escapeHtml(title)}</p>
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="${chartBottom}" x2="${width}" y2="${chartBottom}" stroke="#e5e7eb" stroke-width="1" />
      ${bars}
    </svg>
  </div>`
}

function buildChartsSection(machines: Machine[], machineKpis: MachineKpis[]): string {
  const items = machines
    .map((m) => ({ m, k: machineKpis.find((x) => x.machineId === m.id) }))
    .filter((x): x is { m: Machine; k: MachineKpis } => !!x.k)

  if (items.length === 0) return ''

  const productionChart = buildBarChartSvg(
    items.map(({ m, k }) => ({ label: m.name, value: k.production, valueLabel: formatNumber(k.production, 0), color: '#1e4480' })),
    'Producción por máquina',
  )
  const oeeChart = buildBarChartSvg(
    items.map(({ m, k }) => ({
      label: m.name,
      value: k.oee,
      valueLabel: formatPct(k.oee, 0),
      color: k.oee >= 0.7 ? '#1e9e5a' : k.oee >= 0.5 ? '#c98a00' : '#d23c3c',
    })),
    'OEE por máquina',
  )

  return `<div style="margin-top:16px;">${productionChart}${oeeChart}</div>`
}

function buildReportHtml(data: ReportData): string {
  const { reportType, date, summary, machines, machineKpis, includeCharts } = data
  const label = REPORT_TYPES.find((r) => r.value === reportType)?.label ?? ''
  const rows = machines
    .map((m) => {
      const k = machineKpis.find((x) => x.machineId === m.id)
      if (!k) return ''
      return `<tr>
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(formatQty(k.production, k.unit))}</td>
        <td>${escapeHtml(formatPct(k.availability, 1))}</td>
        <td>${escapeHtml(formatPct(k.performance, 1))}</td>
        <td>${escapeHtml(formatPct(k.quality, 1))}</td>
        <td><strong>${escapeHtml(formatPct(k.oee, 1))}</strong></td>
        <td>${escapeHtml(formatPct(k.scrapPct, 1))}</td>
      </tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(label)} — ${escapeHtml(date)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; }
  header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 16px; }
  .logo { width: 36px; height: 36px; border-radius: 6px; background: #1e3a8a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; }
  h1 { font-size: 18px; margin: 0; }
  .subtitle { font-size: 12px; color: #6b7280; margin: 2px 0 0; }
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
  .stat .value { font-size: 15px; font-weight: bold; }
  .stat .label { font-size: 10px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; text-transform: uppercase; font-size: 9px; color: #6b7280; }
  footer { margin-top: 24px; font-size: 9px; color: #9ca3af; text-align: center; }
  @media print { footer { position: fixed; bottom: 0; left: 0; right: 0; } }
</style>
</head>
<body>
  <header>
    <div class="logo">BJP</div>
    <div>
      <h1>${escapeHtml(label.toUpperCase())} — ${escapeHtml(formatDateLong(date))}</h1>
      <p class="subtitle">Máquinas incluidas: ${machines.length} · Generado el ${escapeHtml(new Date().toLocaleString('es-AR'))}</p>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><div class="value">${escapeHtml(formatM2(summary.productionM2))}</div><div class="label">Producción Corrugadora</div></div>
    <div class="stat"><div class="value">${escapeHtml(formatGolpes(summary.productionGolpes))}</div><div class="label">Resto de máquinas</div></div>
    <div class="stat"><div class="value">${escapeHtml(formatPct(summary.oeeAvg, 1))}</div><div class="label">OEE promedio</div></div>
    <div class="stat"><div class="value">${escapeHtml(formatPct(summary.scrapPct, 1))}</div><div class="label">Scrap</div></div>
    <div class="stat"><div class="value">${escapeHtml(formatPct(summary.compliancePct, 0))}</div><div class="label">Cumplimiento</div></div>
  </div>

  <table>
    <thead>
      <tr><th>Máquina</th><th>Producción</th><th>Disponibilidad</th><th>Rendimiento</th><th>Calidad</th><th>OEE</th><th>Scrap</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${includeCharts ? buildChartsSection(machines, machineKpis) : ''}

  <footer>BJP Industrial Analytics · Reporte generado automáticamente</footer>
</body>
</html>`
}

/** Abre una ventana con el reporte formateado y dispara el diálogo de impresión del navegador (permite imprimir o guardar como PDF). */
function openPrintableReport(data: ReportData): void {
  const win = window.open('', '_blank', 'width=900,height=1200')
  if (!win) {
    throw new Error('El navegador bloqueó la ventana del reporte. Habilitá los pop-ups para este sitio.')
  }
  win.document.open()
  win.document.write(buildReportHtml(data))
  win.document.close()
  win.focus()
  win.onload = () => {
    win.print()
  }
}

/** Excel con configuración regional es-AR usa "," como separador decimal, por lo que espera ";" entre columnas. */
const CSV_DELIMITER = ';'

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function buildReportCsv(data: ReportData): string {
  const header = ['Máquina', 'Producción', 'Unidad', 'Disponibilidad', 'Rendimiento', 'Calidad', 'OEE', 'Scrap']
    .map(csvField)
    .join(CSV_DELIMITER)
  const rows = data.machines.map((m) => {
    const k = data.machineKpis.find((x) => x.machineId === m.id)
    if (!k) return ''
    return [
      csvField(m.name),
      formatNumber(k.production, 0),
      csvField(k.unit),
      formatPct(k.availability, 1),
      formatPct(k.performance, 1),
      formatPct(k.quality, 1),
      formatPct(k.oee, 1),
      formatPct(k.scrapPct, 1),
    ].join(CSV_DELIMITER)
  })
  return [header, ...rows].join('\r\n')
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Genera el reporte real: PDF abre el diálogo de impresión del navegador, Excel descarga un CSV. */
export function generateReport(format: ReportFormat, filename: string, data: ReportData): void {
  if (format === 'pdf') {
    openPrintableReport(data)
  } else {
    downloadCsv(filename, buildReportCsv(data))
  }
}
