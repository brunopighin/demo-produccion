import { useState } from 'react'
import { buildFilename, generateReport, type ReportData, type ReportFormat, type ReportType } from '@/services/reportsService'
import { getLastAvailableDate } from '@/services/productionService'

export function useReportsScreen() {
  const [generating, setGenerating] = useState(false)
  const [lastFile, setLastFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(reportType: ReportType, format: ReportFormat, data: Omit<ReportData, 'reportType'>) {
    setGenerating(true)
    setLastFile(null)
    setError(null)
    const filename = buildFilename(reportType, format, getLastAvailableDate())
    try {
      generateReport(format, filename, { reportType, ...data })
      setLastFile(filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el reporte.')
    } finally {
      setGenerating(false)
    }
  }

  return { generating, lastFile, error, generate }
}
