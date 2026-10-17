import { useState } from 'react'
import Card from '@/components/ui/Card'
import { REPORT_TYPES, type ReportFormat } from '@/services/reportsService'
import type { ReportType } from '@/services/reportModel'
import {
  FREQUENCY_LABELS,
  WEEKDAY_LABELS,
  formatNextRun,
  loadScheduledReports,
  nextRunOf,
  parseRecipients,
  saveScheduledReports,
  type ScheduleFrequency,
  type ScheduledReport,
} from '@/services/scheduledReportsService'

const inputClass = 'w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-brand-500'

interface Draft {
  reportType: ReportType
  format: ReportFormat
  frequency: ScheduleFrequency
  time: string
  weekday: number
  recipientsText: string
}

const EMPTY_DRAFT: Draft = { reportType: 'produccion_diaria', format: 'pdf', frequency: 'diaria', time: '07:00', weekday: 1, recipientsText: '' }

function frequencyText(s: ScheduledReport): string {
  if (s.frequency === 'semanal') return `Semanal, ${WEEKDAY_LABELS[s.weekday].toLowerCase()} ${s.time}`
  if (s.frequency === 'mensual') return `Mensual, día 1 ${s.time}`
  return `Diaria ${s.time}`
}

export default function ScheduledReportsCard() {
  const [list, setList] = useState<ScheduledReport[]>(loadScheduledReports)
  // null = formulario cerrado, 'new' = alta, id = edición
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [formError, setFormError] = useState<string | null>(null)

  function update(next: ScheduledReport[]) {
    setList(next)
    saveScheduledReports(next)
  }

  function openNew() {
    setDraft(EMPTY_DRAFT)
    setFormError(null)
    setEditing('new')
  }

  function openEdit(s: ScheduledReport) {
    setDraft({ reportType: s.reportType, format: s.format, frequency: s.frequency, time: s.time, weekday: s.weekday, recipientsText: s.recipients.join(', ') })
    setFormError(null)
    setEditing(s.id)
  }

  function save() {
    const { valid, invalid } = parseRecipients(draft.recipientsText)
    if (invalid.length) return setFormError(`Mail inválido: ${invalid.join(', ')}`)
    if (!valid.length) return setFormError('Ingresá al menos un destinatario.')
    if (!/^\d{2}:\d{2}$/.test(draft.time)) return setFormError('Ingresá la hora de envío.')

    const item: ScheduledReport = {
      id: editing === 'new' || !editing ? `sch-${Date.now()}` : editing,
      reportType: draft.reportType,
      format: draft.format,
      frequency: draft.frequency,
      time: draft.time,
      weekday: draft.weekday,
      recipients: valid,
    }
    update(editing === 'new' ? [...list, item] : list.map((s) => (s.id === item.id ? item : s)))
    setEditing(null)
  }

  function remove(id: string) {
    update(list.filter((s) => s.id !== id))
    if (editing === id) setEditing(null)
  }

  return (
    <Card title="Reportes programados" subtitle="Se guardan en este navegador. El envío automático por mail requiere conectar un servidor de correo.">
      {list.length === 0 ? (
        <p className="text-sm text-status-idle">No hay envíos programados.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-max text-sm [&_td:not(:last-child)]:pr-4 [&_th:not(:last-child)]:pr-4">
            <thead>
              <tr className="text-left text-xs uppercase text-status-idle">
                <th className="pb-2">Reporte</th>
                <th className="pb-2">Frecuencia</th>
                <th className="pb-2">Destinatarios</th>
                <th className="pb-2">Próximo envío</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 font-medium text-brand-900">
                    {REPORT_TYPES.find((r) => r.value === s.reportType)?.label}
                    <span className="ml-1 text-xs font-normal text-status-idle">({s.format === 'pdf' ? 'PDF' : 'Excel'})</span>
                  </td>
                  <td className="py-2">{frequencyText(s)}</td>
                  <td className="py-2" title={s.recipients.join('\n')}>
                    {s.recipients.length === 1 ? s.recipients[0] : `${s.recipients.length} destinatarios`}
                  </td>
                  <td className="py-2">{formatNextRun(nextRunOf(s))}</td>
                  <td className="space-x-3 py-2 text-right">
                    <button onClick={() => openEdit(s)} className="font-medium text-brand-700 hover:underline">Editar</button>
                    <button onClick={() => remove(s.id)} className="font-medium text-status-bad hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-brand-900">{editing === 'new' ? 'Nuevo envío programado' : 'Editar envío programado'}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-900">Reporte</span>
              <select value={draft.reportType} onChange={(e) => setDraft({ ...draft, reportType: e.target.value as ReportType })} className={inputClass}>
                {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-900">Formato</span>
              <select value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value as ReportFormat })} className={inputClass}>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-900">Frecuencia</span>
              <select value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as ScheduleFrequency })} className={inputClass}>
                {(Object.keys(FREQUENCY_LABELS) as ScheduleFrequency[]).map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
              </select>
            </label>
            <div className="flex gap-3">
              {draft.frequency === 'semanal' && (
                <label className="block flex-1">
                  <span className="mb-1 block text-xs font-medium text-brand-900">Día</span>
                  <select value={draft.weekday} onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })} className={inputClass}>
                    {WEEKDAY_LABELS.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                  </select>
                </label>
              )}
              <label className="block flex-1">
                <span className="mb-1 block text-xs font-medium text-brand-900">Hora</span>
                <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className={inputClass} />
              </label>
            </div>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-brand-900">Destinatarios (separados por coma)</span>
              <textarea
                rows={2}
                value={draft.recipientsText}
                onChange={(e) => setDraft({ ...draft, recipientsText: e.target.value })}
                placeholder="produccion@empresa.com, gerencia@empresa.com"
                className={inputClass}
              />
            </label>
          </div>
          {formError && <p className="mt-2 text-sm font-medium text-status-bad">{formError}</p>}
          <div className="mt-3 flex gap-3">
            <button onClick={save} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Guardar</button>
            <button onClick={() => setEditing(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-brand-900 hover:bg-surface-alt">Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={openNew} className="mt-3 text-sm font-medium text-brand-700 hover:underline">+ Programar nuevo envío</button>
      )}
    </Card>
  )
}
