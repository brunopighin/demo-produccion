import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatNowAR } from '@/utils/format'
import { buildReportModel, type ReportChart, type ReportModel, type ReportParams, type Tone } from './reportModel'

export { REPORT_TYPES, buildReportModel, type ReportParams, type ReportType, type ReportModel } from './reportModel'

export type ReportFormat = 'pdf' | 'excel'

export function buildFilename(params: Pick<ReportParams, 'reportType' | 'from' | 'to'>, format: ReportFormat): string {
  const ext = format === 'pdf' ? 'pdf' : 'csv'
  const period = params.from === params.to ? params.from : `${params.from}_a_${params.to}`
  return `reporte_${params.reportType}_${period}.${ext}`
}

type RgbColor = [number, number, number]
const COLOR_INK: RgbColor = [31, 41, 55]
const COLOR_MUTED: RgbColor = [107, 114, 128]
const COLOR_BRAND: RgbColor = [30, 68, 128]
const TONE_RGB: Record<Tone, RgbColor> = {
  good: [30, 158, 90],
  warn: [201, 138, 0],
  bad: [210, 60, 60],
  brand: COLOR_BRAND,
}

const MARGIN = 12

function addPdfHeader(doc: jsPDF, title: string, subtitle: string): number {
  doc.setFillColor(...COLOR_BRAND)
  doc.rect(MARGIN, 10, 9, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('BJP', 16.5, 15.2, { align: 'center' })

  doc.setTextColor(...COLOR_INK)
  doc.setFontSize(13)
  doc.text(title, 25, 14)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLOR_MUTED)
  doc.text(subtitle, 25, 18.5)

  doc.setDrawColor(...COLOR_BRAND)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, 22, doc.internal.pageSize.getWidth() - MARGIN, 22)
  return 28
}

function addPdfFooters(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)
    doc.text('BJP Industrial Analytics · Reporte generado automáticamente', pageWidth / 2, pageHeight - 8, { align: 'center' })
    doc.text(`Página ${i} de ${pages}`, pageWidth - MARGIN, pageHeight - 8, { align: 'right' })
  }
}

/** Si lo que sigue no entra en la página actual, agrega una nueva y devuelve el Y de arranque. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= doc.internal.pageSize.getHeight() - 16) return y
  doc.addPage()
  return 16
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR_BRAND)
  doc.text(text, MARGIN, y)
  return y + 3
}

const CHART_HEIGHT = 40

/** Gráfico de barras verticales dibujado con jsPDF; devuelve el Y donde termina. */
function drawBarChart(doc: jsPDF, startY: number, chart: ReportChart): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const chartWidth = pageWidth - MARGIN * 2
  const gap = chart.items.length > 20 ? 1 : 3
  const barWidth = (chartWidth - gap * (chart.items.length + 1)) / chart.items.length
  const baseY = startY + CHART_HEIGHT
  const maxValue = Math.max(...chart.items.map((i) => i.value), 0.0001)
  const compact = barWidth < 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR_INK)
  doc.text(chart.title, MARGIN, startY - 2)

  doc.setDrawColor(229, 231, 235)
  doc.line(MARGIN, baseY, MARGIN + chartWidth, baseY)

  chart.items.forEach((item, i) => {
    const x = MARGIN + gap + i * (barWidth + gap)
    const barHeight = Math.max((item.value / maxValue) * (CHART_HEIGHT - 8), 1)
    const y = baseY - barHeight
    doc.setFillColor(...TONE_RGB[item.tone])
    doc.rect(x, y, barWidth, barHeight, 'F')
    doc.setFontSize(compact ? 4.5 : 6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_INK)
    doc.text(item.valueLabel, x + barWidth / 2, y - 1.5, { align: 'center' })
    doc.setFontSize(compact ? 4.5 : 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR_MUTED)
    doc.text(item.label, x + barWidth / 2, baseY + 4, { align: 'center', maxWidth: barWidth + gap })
  })

  return baseY + 10
}

/** Arma el PDF real (sin diálogo de impresión) a partir del modelo del reporte. */
export function buildReportPdf(model: ReportModel): jsPDF {
  const landscape = model.layout === 'landscape'
  const doc = new jsPDF({ unit: 'mm', format: landscape ? 'a3' : 'a4', orientation: landscape ? 'landscape' : 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = addPdfHeader(doc, model.title, `${model.subtitle} · Generado el ${formatNowAR()}`)

  if (model.daysWithData === 0) {
    doc.setFontSize(11)
    doc.setTextColor(...COLOR_MUTED)
    doc.text('No hay datos de producción para el período y las máquinas seleccionadas.', MARGIN, y + 6)
    addPdfFooters(doc)
    return doc
  }

  if (model.stats.length) {
    const statWidth = (pageWidth - MARGIN * 2) / model.stats.length
    model.stats.forEach((stat, i) => {
      const x = MARGIN + i * statWidth
      doc.setDrawColor(229, 231, 235)
      doc.roundedRect(x, y, statWidth - 4, 16, 1.5, 1.5)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_INK)
      doc.text(stat.value, x + (statWidth - 4) / 2, y + 7, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLOR_MUTED)
      doc.text(stat.label, x + (statWidth - 4) / 2, y + 12, { align: 'center' })
    })
    y += 24
  }

  for (const table of model.tables) {
    y = ensureSpace(doc, y, 25)
    y = sectionTitle(doc, table.title, y)
    const columnStyles: Record<number, { halign: 'left' }> = {}
    for (let i = 0; i < table.textColumns; i++) columnStyles[i] = { halign: 'left' }
    autoTable(doc, {
      startY: y,
      head: [table.head],
      body: table.rows.map((row) => row.map((cell) => cell.text)),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: landscape ? 7.5 : 8.5, halign: 'right' },
      columnStyles,
      headStyles: { fillColor: [243, 244, 246], textColor: COLOR_MUTED, fontStyle: 'bold', halign: 'center', fontSize: landscape ? 6.5 : 7.5 },
      didParseCell: (hookData) => {
        if (hookData.section !== 'body') return
        const tone = table.rows[hookData.row.index]?.[hookData.column.index]?.tone
        if (tone) {
          hookData.cell.styles.textColor = TONE_RGB[tone]
          hookData.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  for (const chart of model.charts) {
    y = ensureSpace(doc, y + 4, CHART_HEIGHT + 14)
    y = drawBarChart(doc, y + 4, chart)
  }

  addPdfFooters(doc)
  return doc
}

/** Excel con configuración regional es-AR usa "," como separador decimal, por lo que espera ";" entre columnas. */
const CSV_DELIMITER = ';'

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function buildReportCsv(model: ReportModel): string {
  const lines: string[] = [csvField(model.title), csvField(`${model.subtitle} · Generado el ${formatNowAR()}`), '']
  if (model.daysWithData === 0) {
    lines.push(csvField('No hay datos de producción para el período y las máquinas seleccionadas.'))
    return lines.join('\r\n')
  }
  if (model.stats.length) {
    lines.push(csvField('Resumen'))
    for (const s of model.stats) lines.push([csvField(s.label), csvField(s.value)].join(CSV_DELIMITER))
    lines.push('')
  }
  for (const table of model.tables) {
    lines.push(csvField(table.title))
    lines.push(table.head.map(csvField).join(CSV_DELIMITER))
    for (const row of table.rows) lines.push(row.map((cell) => csvField(cell.text)).join(CSV_DELIMITER))
    lines.push('')
  }
  return lines.join('\r\n')
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Genera y descarga el reporte real: PDF descarga un .pdf, Excel descarga un .csv (se abre directo en Excel). */
export function generateReport(params: ReportParams, format: ReportFormat): string {
  const model = buildReportModel(params)
  const filename = buildFilename(params, format)
  if (format === 'pdf') {
    buildReportPdf(model).save(filename)
  } else {
    downloadBlob(filename, new Blob([`﻿${buildReportCsv(model)}`], { type: 'text/csv;charset=utf-8;' }))
  }
  return filename
}

/** URL temporal del PDF para mostrarlo en la vista previa; quien la pide debe liberarla con URL.revokeObjectURL. */
export function buildReportPdfUrl(params: ReportParams): string {
  const blob = buildReportPdf(buildReportModel(params)).output('blob')
  return URL.createObjectURL(blob)
}
