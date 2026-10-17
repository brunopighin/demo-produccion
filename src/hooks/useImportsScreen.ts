import { useState } from 'react'
import {
  buildImportPreview,
  buildTemplateCsv,
  clearImportedData,
  commitImport,
  getImportedRecordCount,
  getRecentImportLogs,
  type ImportPreview,
} from '@/services/importsService'
import { readSpreadsheet } from '@/services/spreadsheetReader'
import { nowIsoAR } from '@/utils/format'

const MAX_FILE_BYTES = 10 * 1024 * 1024

export function useImportsScreen() {
  const [logs, setLogs] = useState(getRecentImportLogs)
  const [importedCount, setImportedCount] = useState(getImportedRecordCount)
  const [reading, setReading] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function selectFile(file: File) {
    setError(null)
    setSuccess(null)
    setPreview(null)
    if (file.size > MAX_FILE_BYTES) {
      setError('El archivo supera los 10 MB.')
      return
    }
    setReading(true)
    try {
      const rows = await readSpreadsheet(file)
      setPreview(buildImportPreview(file.name, rows, nowIsoAR().slice(0, 10)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.')
    } finally {
      setReading(false)
    }
  }

  function confirm() {
    if (!preview || preview.records.length === 0) return
    const { log, saved } = commitImport(preview, nowIsoAR())
    if (!saved) {
      setError('El navegador no dejó guardar los datos (almacenamiento lleno o bloqueado, por ejemplo en modo incógnito).')
      return
    }
    setLogs(getRecentImportLogs())
    setImportedCount(getImportedRecordCount())
    setSuccess(
      `${preview.records.length} registros importados de ${log.filename}` +
        (preview.errors.length ? ` (${preview.errors.length} filas con errores quedaron afuera).` : '.'),
    )
    setPreview(null)
  }

  function cancel() {
    setPreview(null)
  }

  function downloadTemplate() {
    const blob = new Blob([`﻿${buildTemplateCsv()}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_produccion.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /** Vuelve a los datos de ejemplo. Recarga la página para rearmar los datos en memoria. */
  function clearImported() {
    clearImportedData()
    window.location.reload()
  }

  return { logs, importedCount, reading, preview, error, success, selectFile, confirm, cancel, downloadTemplate, clearImported }
}
