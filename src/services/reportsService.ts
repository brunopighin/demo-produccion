import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Machine, MachineKpis, DailySummary } from '@/types'
import { formatDateLong, formatM2, formatGolpes, formatNumber, formatPct, formatQty } from '@/utils/format'
import { getDetailedSheetMonthly, getDetailedSheetRows, getMachineById, getOperatorById } from './productionService'

export type ReportType =
  | 'produccion_diaria'
  | 'produccion_mensual'
  | 'por_maquina'
  | 'por_operador'
  | 'cumplimiento'
  | 'indicadores_gestion'
  | 'planilla_detallada'

export type ReportFormat = 'pdf' | 'excel'

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'produccion_diaria', label: 'Producción Diaria' },
  { value: 'produccion_mensual', label: 'Producción Mensual' },
  { value: 'por_maquina', label: 'Por Máquina' },
  { value: 'por_operador', label: 'Por Operador' },
  { value: 'cumplimiento', label: 'Cumplimiento de Objetivos' },
  { value: 'indicadores_gestion', label: 'Indicadores de Gestión' },
  { value: 'planilla_detallada', label: 'Planilla Detallada (estilo Excel)' },
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

const dash = '—'
function fmtOrDash(value: number | null, fmt: (v: number) => string): string {
  return value === null ? dash : fmt(value)
}

type RgbColor = [number, number, number]
const COLOR_GREEN: RgbColor = [30, 158, 90]
const COLOR_AMBER: RgbColor = [201, 138, 0]
const COLOR_RED: RgbColor = [210, 60, 60]
const COLOR_INK: RgbColor = [31, 41, 55]
const COLOR_BRAND: RgbColor = [30, 68, 128]

function pctColor(value: number, greenMax: number, yellowMax: number): RgbColor {
  if (value <= greenMax) return COLOR_GREEN
  if (value <= yellowMax) return COLOR_AMBER
  return COLOR_RED
}

function rateColor(ratio: number): RgbColor {
  if (ratio >= 1) return COLOR_GREEN
  if (ratio >= 0.85) return COLOR_AMBER
  return COLOR_RED
}

function addPdfHeader(doc: jsPDF, title: string, subtitle: string): number {
  doc.setFillColor(...COLOR_BRAND)
  doc.rect(12, 10, 9, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('BJP', 16.5, 15.2, { align: 'center' })

  doc.setTextColor(...COLOR_INK)
  doc.setFontSize(13)
  doc.text(title, 25, 14)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text(subtitle, 25, 18.5)

  doc.setDrawColor(...COLOR_BRAND)
  doc.setLineWidth(0.6)
  doc.line(12, 22, doc.internal.pageSize.getWidth() - 12, 22)
  return 26
}

/** Reporte estándar (PDF real, sin diálogo de impresión): stats + tabla por máquina + gráficos de barra dibujados con jsPDF. */
function buildSimpleReportPdf(data: ReportData): jsPDF {
  const { reportType, date, summary, machines, machineKpis, includeCharts } = data
  const label = REPORT_TYPES.find((r) => r.value === reportType)?.label ?? ''
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = addPdfHeader(doc, `${label.toUpperCase()} — ${formatDateLong(date)}`, `Máquinas incluidas: ${machines.length} · Generado el ${new Date().toLocaleString('es-AR')}`)

  const stats: [string, string][] = [
    [formatM2(summary.productionM2), 'Producción Corrugadora'],
    [formatGolpes(summary.productionGolpes), 'Resto de máquinas'],
    [formatPct(summary.oeeAvg, 1), 'OEE promedio'],
    [formatPct(summary.compliancePct, 0), 'Cumplimiento'],
  ]
  const statWidth = (pageWidth - 24) / stats.length
  stats.forEach(([value, statLabel], i) => {
    const x = 12 + i * statWidth
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(x, y, statWidth - 4, 16, 1.5, 1.5)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_INK)
    doc.text(value, x + (statWidth - 4) / 2, y + 7, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text(statLabel, x + (statWidth - 4) / 2, y + 12, { align: 'center' })
  })
  y += 22

  const rows = machines
    .map((m) => ({ m, k: machineKpis.find((x) => x.machineId === m.id) }))
    .filter((x): x is { m: Machine; k: MachineKpis } => !!x.k)

  autoTable(doc, {
    startY: y,
    head: [['Máquina', 'Producción', 'Disponibilidad', 'Rendimiento', 'OEE']],
    body: rows.map(({ m, k }) => [
      m.name,
      formatQty(k.production, k.unit),
      formatPct(k.availability, 1),
      formatPct(k.performance, 1),
      formatPct(k.oee, 1),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [243, 244, 246], textColor: [107, 114, 128], fontStyle: 'bold' },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const k = rows[hookData.row.index].k
        hookData.cell.styles.textColor = k.oee >= 0.7 ? COLOR_GREEN : k.oee >= 0.5 ? COLOR_AMBER : COLOR_RED
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  if (includeCharts && rows.length > 0) {
    let chartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    chartY = drawBarChart(doc, chartY, 'Producción por máquina', rows.map(({ m, k }) => ({
      label: m.name,
      value: k.production,
      valueLabel: formatNumber(k.production, 0),
      color: COLOR_BRAND,
    })))
    drawBarChart(doc, chartY + 8, 'OEE por máquina', rows.map(({ m, k }) => ({
      label: m.name,
      value: k.oee,
      valueLabel: formatPct(k.oee, 0),
      color: k.oee >= 0.7 ? COLOR_GREEN : k.oee >= 0.5 ? COLOR_AMBER : COLOR_RED,
    })))
  }

  addPdfFooter(doc)
  return doc
}

interface BarChartItem {
  label: string
  value: number
  valueLabel: string
  color: RgbColor
}

/** Dibuja un gráfico de barras verticales en coordenadas mm y devuelve el Y donde termina. */
function drawBarChart(doc: jsPDF, startY: number, title: string, items: BarChartItem[]): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const chartWidth = pageWidth - 24
  const chartHeight = 40
  const gap = 3
  const barWidth = (chartWidth - gap * (items.length + 1)) / items.length
  const baseY = startY + chartHeight
  const maxValue = Math.max(...items.map((i) => i.value), 0.0001)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR_INK)
  doc.text(title, 12, startY - 2)

  doc.setDrawColor(229, 231, 235)
  doc.line(12, baseY, 12 + chartWidth, baseY)

  items.forEach((item, i) => {
    const x = 12 + gap + i * (barWidth + gap)
    const barHeight = Math.max((item.value / maxValue) * (chartHeight - 8), 1)
    const y = baseY - barHeight
    doc.setFillColor(...item.color)
    doc.rect(x, y, barWidth, barHeight, 'F')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_INK)
    doc.text(item.valueLabel, x + barWidth / 2, y - 1.5, { align: 'center' })
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text(item.label, x + barWidth / 2, baseY + 4, { align: 'center', maxWidth: barWidth + gap })
  })

  return baseY + 8
}

function addPdfFooter(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text('BJP Industrial Analytics · Reporte generado automáticamente', pageWidth / 2, pageHeight - 8, { align: 'center' })
}

/** Planilla diaria estilo Excel (PDF real): agrupada por máquina/maquinista, con acumulado del mes y promedio mensual. */
function buildDetailedSheetPdf(date: string): jsPDF {
  const rows = getDetailedSheetRows(date)
  const monthStart = `${date.slice(0, 7)}-01`
  const monthly = getDetailedSheetMonthly(monthStart, date)

  const doc = new jsPDF({ unit: 'mm', format: 'a3', orientation: 'landscape' })
  let y = addPdfHeader(doc, `PLANILLA DETALLADA — ${formatDateLong(date)}`, `Generado el ${new Date().toLocaleString('es-AR')}`)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR_BRAND)
  doc.text('Detalle del día por máquina y maquinista', 12, y)
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Máquina', 'Maquinista', 'Hs. Prod', 'Gp/turno', 'Gp/hora', 'm²/turno', 'm²/hora', 'Cambio OT', 'Gp/OT', 'm²/gp', 'Tiempo parado', 'Indisp % Tot']],
    body: rows.map((r) => {
      const machine = getMachineById(r.machineId)!
      const operator = getOperatorById(r.operatorId)
      return [
        machine.name,
        operator?.name ?? r.operatorId,
        formatNumber(r.hoursProd, 1),
        fmtOrDash(r.golpesTurno, (v) => formatNumber(v, 0)),
        fmtOrDash(r.golpesHora, (v) => formatNumber(v, 0)),
        formatNumber(r.m2Turno, 0),
        formatNumber(r.m2Hora, 2),
        String(r.otChanges),
        fmtOrDash(r.golpesPorOt, (v) => formatNumber(v, 0)),
        fmtOrDash(r.m2PorGolpe, (v) => formatNumber(v, 2)),
        `${formatNumber(r.tiempoParadoMin, 0)} min`,
        formatPct(r.indisponibilidadPct, 1),
      ]
    }),
    styles: { fontSize: 7.5, halign: 'right' },
    columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } },
    headStyles: { fillColor: [243, 244, 246], textColor: [107, 114, 128], fontStyle: 'bold', halign: 'center', fontSize: 6.5 },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return
      const r = rows[hookData.row.index]
      const machine = getMachineById(r.machineId)!
      if (hookData.column.index === 4 || hookData.column.index === 6) {
        const rate = machine.unit === 'golpes' ? r.golpesHora ?? 0 : r.m2Hora
        const ratio = rate / Math.max(machine.nominalSpeed, 0.0001)
        hookData.cell.styles.textColor = rateColor(ratio)
        hookData.cell.styles.fontStyle = 'bold'
      }
      if (hookData.column.index === 11) {
        hookData.cell.styles.textColor = pctColor(r.indisponibilidadPct, 0.15, 0.3)
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  let y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR_BRAND)
  doc.text('Acumulado del mes y promedio mensual por máquina', 12, y2)
  y2 += 3

  autoTable(doc, {
    startY: y2,
    head: [
      ['Máquina', 'Hs', 'Golpes', 'm²', 'OT', 'm²/gp', 'Tiempo parado', 'Indisp % Tot', 'Indisp %', 'Gp/turno', 'm²/turno', 'm²/hora'],
    ],
    body: monthly.map((m) => [
      getMachineById(m.machineId)!.name,
      formatNumber(m.hsTotal, 1),
      fmtOrDash(m.golpesTotal, (v) => formatNumber(v, 0)),
      formatNumber(m.m2Total, 0),
      String(m.otTotal),
      fmtOrDash(m.m2PorGolpe, (v) => formatNumber(v, 2)),
      `${formatNumber(m.tiempoParadoTotal, 0)} min`,
      formatPct(m.indisponibilidadPct, 1),
      formatPct(m.avgIndisponibilidadPct, 1),
      fmtOrDash(m.avgGolpesTurno, (v) => formatNumber(v, 0)),
      formatNumber(m.avgM2Turno, 0),
      formatNumber(m.avgM2Hora, 2),
    ]),
    styles: { fontSize: 7.5, halign: 'right' },
    columnStyles: { 0: { halign: 'left' } },
    headStyles: { fillColor: [243, 244, 246], textColor: [107, 114, 128], fontStyle: 'bold', halign: 'center', fontSize: 6.5 },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return
      const m = monthly[hookData.row.index]
      if (hookData.column.index === 7) {
        hookData.cell.styles.textColor = pctColor(m.indisponibilidadPct, 0.15, 0.3)
        hookData.cell.styles.fontStyle = 'bold'
      }
      if (hookData.column.index === 8) {
        hookData.cell.styles.textColor = pctColor(m.avgIndisponibilidadPct, 0.15, 0.3)
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  addPdfFooter(doc)
  return doc
}

function buildDetailedSheetCsv(date: string): string {
  const rows = getDetailedSheetRows(date)
  const header = ['Máquina', 'Maquinista', 'Hs. Prod', 'Gp/turno', 'Gp/hora', 'm²/turno', 'm²/hora', 'Cambio OT', 'Gp/OT', 'm²/gp', 'Tiempo parado (min)', 'Indisp % Tot']
    .map(csvField)
    .join(CSV_DELIMITER)
  const body = rows.map((r) => {
    const machine = getMachineById(r.machineId)!
    const operator = getOperatorById(r.operatorId)
    return [
      csvField(machine.name),
      csvField(operator?.name ?? r.operatorId),
      formatNumber(r.hoursProd, 1),
      r.golpesTurno === null ? dash : formatNumber(r.golpesTurno, 0),
      r.golpesHora === null ? dash : formatNumber(r.golpesHora, 0),
      formatNumber(r.m2Turno, 0),
      formatNumber(r.m2Hora, 2),
      String(r.otChanges),
      r.golpesPorOt === null ? dash : formatNumber(r.golpesPorOt, 0),
      r.m2PorGolpe === null ? dash : formatNumber(r.m2PorGolpe, 2),
      formatNumber(r.tiempoParadoMin, 0),
      formatPct(r.indisponibilidadPct, 1),
    ].join(CSV_DELIMITER)
  })
  return [header, ...body].join('\r\n')
}

/** Genera el PDF con jsPDF y lo descarga directamente (archivo real, no requiere elegir "Guardar como PDF" en un diálogo de impresión). */
function downloadPdf(filename: string, data: ReportData): void {
  const doc = data.reportType === 'planilla_detallada' ? buildDetailedSheetPdf(data.date) : buildSimpleReportPdf(data)
  doc.save(filename)
}

/** Excel con configuración regional es-AR usa "," como separador decimal, por lo que espera ";" entre columnas. */
const CSV_DELIMITER = ';'

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function buildReportCsv(data: ReportData): string {
  const header = ['Máquina', 'Producción', 'Unidad', 'Disponibilidad', 'Rendimiento', 'OEE']
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
      formatPct(k.oee, 1),
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

/** Genera el reporte real: PDF descarga un archivo .pdf, Excel descarga un .csv. */
export function generateReport(format: ReportFormat, filename: string, data: ReportData): void {
  if (format === 'pdf') {
    downloadPdf(filename, data)
  } else if (data.reportType === 'planilla_detallada') {
    downloadCsv(filename, buildDetailedSheetCsv(data.date))
  } else {
    downloadCsv(filename, buildReportCsv(data))
  }
}
