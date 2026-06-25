import { useState } from 'react'
import { buildFilename, simulateReportGeneration, type ReportFormat, type ReportType } from '@/services/reportsService'
import { getLastAvailableDate } from '@/services/productionService'

export function useReportsScreen() {
  const [generating, setGenerating] = useState(false)
  const [lastFile, setLastFile] = useState<string | null>(null)

  async function generate(reportType: ReportType, format: ReportFormat) {
    setGenerating(true)
    setLastFile(null)
    await simulateReportGeneration()
    setGenerating(false)
    setLastFile(buildFilename(reportType, format, getLastAvailableDate()))
  }

  return { generating, lastFile, generate }
}
