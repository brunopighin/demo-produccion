import { useState } from 'react'
import { generateReport, type ReportFormat, type ReportParams } from '@/services/reportsService'

export function useReportsScreen() {
  const [generating, setGenerating] = useState(false)
  const [lastFile, setLastFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function generate(params: ReportParams, format: ReportFormat) {
    setGenerating(true)
    setLastFile(null)
    setError(null)
    try {
      setLastFile(generateReport(params, format))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el reporte.')
    } finally {
      setGenerating(false)
    }
  }

  return { generating, lastFile, error, generate }
}
