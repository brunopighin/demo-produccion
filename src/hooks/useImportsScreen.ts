import { useState } from 'react'
import { getRecentImportLogs, simulateImportUpload } from '@/services/importsService'

export type ImportSourceKey = 'kiwiPlant' | 'kiwiMap'
type SourceState = Record<ImportSourceKey, boolean>

export function useImportsScreen() {
  const [logs] = useState(getRecentImportLogs())
  const [uploading, setUploading] = useState<SourceState>({ kiwiPlant: false, kiwiMap: false })
  const [done, setDone] = useState<SourceState>({ kiwiPlant: false, kiwiMap: false })

  async function upload(source: ImportSourceKey) {
    setUploading((s) => ({ ...s, [source]: true }))
    setDone((d) => ({ ...d, [source]: false }))
    await simulateImportUpload()
    setUploading((s) => ({ ...s, [source]: false }))
    setDone((d) => ({ ...d, [source]: true }))
  }

  return { logs, uploading, done, upload }
}
