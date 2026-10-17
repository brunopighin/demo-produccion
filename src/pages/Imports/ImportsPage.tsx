import { useRef, useState, type DragEvent } from 'react'
import clsx from 'clsx'
import { useImportsScreen } from '@/hooks/useImportsScreen'
import { TEMPLATE_COLUMNS } from '@/services/importsService'
import Card from '@/components/ui/Card'
import type { ImportSource, ImportStatus } from '@/types'

const STATUS_LABEL: Record<ImportStatus, string> = { ok: 'OK', warning: 'Con errores', error: 'Error' }
const STATUS_DOT: Record<ImportStatus, string> = {
  ok: 'bg-status-good',
  warning: 'bg-status-warn',
  error: 'bg-status-bad',
}
const SOURCE_LABEL: Record<ImportSource, string> = { kiwi_plant: 'Kiwi Plant (ejemplo)', kiwi_map: 'Kiwi Map (ejemplo)', planilla: 'Planilla' }

const ddmmyyyy = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
const MAX_ERRORS_SHOWN = 50

export default function ImportsPage() {
  const { logs, importedCount, reading, preview, error, success, selectFile, confirm, cancel, downloadTemplate, clearImported } = useImportsScreen()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) selectFile(file)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Importación de datos</h1>
        <p className="text-sm text-status-idle">Subí la planilla de producción por turno para actualizar los indicadores.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Subir planilla de producción" subtitle="Formatos aceptados: .xlsx y .csv" className="lg:col-span-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={clsx(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
              dragging ? 'border-brand-500 bg-brand-50' : 'border-border bg-surface',
            )}
          >
            <span className="text-3xl">⬆</span>
            <p className="mt-2 text-sm text-status-idle">Arrastrá el archivo acá o elegilo desde la computadora.</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              aria-label="Archivo a importar"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) selectFile(file)
                e.target.value = '' // permite volver a elegir el mismo archivo
              }}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={reading}
              className={clsx('mt-4 rounded-lg px-5 py-2 text-sm font-semibold text-white', reading ? 'bg-brand-300' : 'bg-brand-600 hover:bg-brand-700')}
            >
              {reading ? 'Leyendo archivo...' : 'Elegir archivo'}
            </button>
          </div>

          {error && <p className="mt-3 rounded-lg bg-status-bad-bg p-3 text-sm font-medium text-status-bad">{error}</p>}
          {success && <p className="mt-3 rounded-lg bg-status-good-bg p-3 text-sm font-medium text-status-good">✓ {success} Los indicadores ya están actualizados.</p>}

          {preview && (
            <div className="mt-4 rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-brand-900">Revisión de {preview.filename}</p>
              {preview.fatal ? (
                <p className="mt-2 text-sm font-medium text-status-bad">{preview.fatal}</p>
              ) : (
                <>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li className="text-status-good">✓ {preview.records.length} de {preview.rowsTotal} filas válidas</li>
                    {preview.errors.length > 0 && <li className="text-status-bad">✗ {preview.errors.length} filas con errores (no se importan)</li>}
                    {preview.dateFrom && (
                      <li className="text-brand-900">
                        Período: {ddmmyyyy(preview.dateFrom)}
                        {preview.dateTo !== preview.dateFrom && ` al ${ddmmyyyy(preview.dateTo!)}`}
                      </li>
                    )}
                    {preview.replaced > 0 && (
                      <li className="text-status-warn">⚠ {preview.replaced} registros reemplazan datos ya cargados (misma fecha, máquina y turno)</li>
                    )}
                  </ul>

                  {preview.errors.length > 0 && (
                    <div className="mt-3 max-h-56 overflow-y-auto rounded-lg bg-status-bad-bg p-3 text-xs text-status-bad">
                      {preview.errors.slice(0, MAX_ERRORS_SHOWN).map((e) => (
                        <p key={e.row}><span className="font-semibold">Fila {e.row}:</span> {e.message}</p>
                      ))}
                      {preview.errors.length > MAX_ERRORS_SHOWN && <p className="mt-1 font-semibold">… y {preview.errors.length - MAX_ERRORS_SHOWN} filas más con errores.</p>}
                    </div>
                  )}
                </>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {!preview.fatal && preview.records.length > 0 && (
                  <button onClick={confirm} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                    Importar {preview.records.length} registros
                  </button>
                )}
                <button onClick={cancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-brand-900 hover:bg-surface">
                  {preview.fatal || preview.records.length === 0 ? 'Cerrar' : 'Cancelar'}
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Plantilla" subtitle="Una fila por máquina, fecha y turno.">
          <button onClick={downloadTemplate} className="w-full rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            Descargar plantilla ⬇
          </button>
          <ul className="mt-3 space-y-1.5 text-xs text-status-idle">
            {TEMPLATE_COLUMNS.map((c) => (
              <li key={c.key}>
                <span className="font-semibold text-brand-900">{c.header}</span>
                {c.required && <span className="text-status-bad"> *</span>}: {c.help}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-status-idle">
            Se abre con Excel. Completala y guardala como .xlsx o .csv. Si un registro ya existe (misma fecha, máquina y turno), se reemplaza.
          </p>
        </Card>
      </div>

      <Card
        title="Historial de importaciones"
        subtitle="Los datos importados se guardan en este navegador: no se ven desde otros equipos."
        action={
          importedCount > 0 ? (
            confirmClear ? (
              <span className="flex items-center gap-2 text-xs">
                ¿Borrar {importedCount} registros importados?
                <button onClick={clearImported} className="font-semibold text-status-bad hover:underline">Sí, borrar</button>
                <button onClick={() => setConfirmClear(false)} className="font-medium text-brand-700 hover:underline">No</button>
              </span>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="text-xs font-medium text-status-bad hover:underline">
                Borrar datos importados ({importedCount})
              </button>
            )
          ) : undefined
        }
      >
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-max text-sm [&_td:not(:last-child)]:pr-4 [&_th:not(:last-child)]:pr-4">
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
                  <td className="py-2">{`${ddmmyyyy(log.importedAt)} ${log.importedAt.slice(11, 16)}`}</td>
                  <td className="py-2 font-medium text-brand-900">{log.filename}</td>
                  <td className="py-2">{SOURCE_LABEL[log.source]}</td>
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
        </div>
      </Card>
    </div>
  )
}
