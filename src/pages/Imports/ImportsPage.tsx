import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useImportsScreen, type ImportSourceKey } from '@/hooks/useImportsScreen'
import Card from '@/components/ui/Card'
import type { ImportStatus } from '@/types'

const SOURCE_LABELS: Record<ImportSourceKey, { title: string; filename: string }> = {
  kiwiPlant: { title: 'Kiwi Plant', filename: 'kiwi_plant_2026-06-25.xlsx' },
  kiwiMap: { title: 'Kiwi Map', filename: 'kiwi_map_2026-06-25.csv' },
}

const STATUS_LABEL: Record<ImportStatus, string> = { ok: 'OK', warning: 'Avisos', error: 'Error' }
const STATUS_DOT: Record<ImportStatus, string> = {
  ok: 'bg-status-good',
  warning: 'bg-status-warn',
  error: 'bg-status-bad',
}

export default function ImportsPage() {
  const { logs, uploading, done, upload } = useImportsScreen()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Importación de datos</h1>
        <p className="text-sm text-status-idle">
          Subí los reportes exportados de Kiwi Plant y Kiwi Map para generar los indicadores del día.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UploadCard
          source="kiwiPlant"
          label={SOURCE_LABELS.kiwiPlant.title}
          filename={SOURCE_LABELS.kiwiPlant.filename}
          uploading={uploading.kiwiPlant}
          done={done.kiwiPlant}
          onUpload={() => upload('kiwiPlant')}
        />
        <UploadCard
          source="kiwiMap"
          label={SOURCE_LABELS.kiwiMap.title}
          filename={SOURCE_LABELS.kiwiMap.filename}
          uploading={uploading.kiwiMap}
          done={done.kiwiMap}
          onUpload={() => upload('kiwiMap')}
        />
      </div>

      <Card title="Historial de importaciones">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-status-idle">
              <th className="pb-2">Fecha</th>
              <th className="pb-2">Archivo</th>
              <th className="pb-2">Fuente</th>
              <th className="pb-2">Filas</th>
              <th className="pb-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-2">{log.importedAt.replace('T', ' ')}</td>
                <td className="py-2 font-medium text-brand-900">{log.filename}</td>
                <td className="py-2">{log.source === 'kiwi_plant' ? 'Kiwi Plant' : 'Kiwi Map'}</td>
                <td className="py-2">
                  {log.rowsTotal - log.rowsError} / {log.rowsTotal}
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_DOT[log.status])} />
                    {STATUS_LABEL[log.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function UploadCard({
  label,
  filename,
  uploading,
  done,
  onUpload,
}: {
  source: ImportSourceKey
  label: string
  filename: string
  uploading: boolean
  done: boolean
  onUpload: () => void
}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (uploading) {
      setProgress(0)
      const raf = requestAnimationFrame(() => setProgress(100))
      return () => cancelAnimationFrame(raf)
    }
  }, [uploading])

  function handleClick() {
    onUpload()
  }

  return (
    <Card title={`Subir reporte ${label}`} subtitle="Formatos aceptados: .csv, .xlsx">
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface px-6 py-8 text-center">
        <span className="text-3xl">⬆</span>
        <p className="mt-2 text-sm text-status-idle">Archivo simulado: {filename}</p>

        <button
          onClick={handleClick}
          disabled={uploading}
          className={clsx(
            'mt-4 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors',
            uploading ? 'bg-brand-300' : 'bg-brand-600 hover:bg-brand-700',
          )}
        >
          {uploading ? 'Procesando...' : `Subir Reporte ${label}`}
        </button>

        {uploading && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-[1800ms] ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {!uploading && done && (
          <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-status-good">
            ✓ Reportes procesados correctamente.
          </p>
        )}
      </div>
    </Card>
  )
}
