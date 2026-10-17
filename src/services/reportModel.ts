import type { Machine, MachineKpis, ProductionRecord } from '@/types'
import { formatDateLong, formatDateShort, formatM2, formatGolpes, formatNumber, formatPct, formatQty } from '@/utils/format'
import {
  aggregateMachineKpis,
  filterRecords,
  getDetailedSheetMonthly,
  getDetailedSheetRows,
  getMachineById,
  getObjective,
  getOperatorById,
  machines as allMachines,
  shifts,
} from './productionService'
import { average, otChangesOf, sum } from './kpiCalculations'

export type ReportType =
  | 'produccion_diaria'
  | 'produccion_mensual'
  | 'por_maquina'
  | 'por_operador'
  | 'cumplimiento'
  | 'indicadores_gestion'
  | 'planilla_detallada'

export const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'produccion_diaria', label: 'Producción Diaria', description: 'Totales del período, detalle por máquina y por turno.' },
  { value: 'produccion_mensual', label: 'Producción Mensual', description: 'Evolución día por día del período y acumulado por máquina.' },
  { value: 'por_maquina', label: 'Por Máquina', description: 'Producción, tiempos y OEE de cada máquina contra su objetivo.' },
  { value: 'por_operador', label: 'Por Operador', description: 'Ranking de maquinistas por eficiencia en el período.' },
  { value: 'cumplimiento', label: 'Cumplimiento de Objetivos', description: 'Producción y OEE reales contra los objetivos cargados.' },
  { value: 'indicadores_gestion', label: 'Indicadores de Gestión', description: 'Disponibilidad, rendimiento, OEE, scrap y paradas por causa.' },
  { value: 'planilla_detallada', label: 'Planilla Detallada (estilo Excel)', description: 'Detalle por máquina y maquinista, con acumulado y promedios.' },
]

export interface ReportParams {
  reportType: ReportType
  from: string
  to: string
  machineIds: string[]
  includeCharts: boolean
}

/** Semáforo de cada celda/barra: el PDF y la vista previa lo traducen a su propio color. */
export type Tone = 'good' | 'warn' | 'bad' | 'brand'

export interface ReportCell {
  text: string
  tone?: Tone
}

export interface ReportTable {
  title: string
  head: string[]
  rows: ReportCell[][]
  /** Columnas de texto (alineadas a la izquierda); el resto son números. */
  textColumns: number
}

export interface ReportChartItem {
  label: string
  value: number
  valueLabel: string
  tone: Tone
}

export interface ReportChart {
  title: string
  items: ReportChartItem[]
}

export interface ReportModel {
  title: string
  periodLabel: string
  subtitle: string
  stats: { value: string; label: string }[]
  tables: ReportTable[]
  charts: ReportChart[]
  /** Cantidad de días con datos dentro del período (0 = sin datos). */
  daysWithData: number
  layout: 'portrait' | 'landscape'
}

const OEE_GOOD = 0.7
const OEE_WARN = 0.5

function oeeTone(oee: number): Tone {
  return oee >= OEE_GOOD ? 'good' : oee >= OEE_WARN ? 'warn' : 'bad'
}

function ratioTone(ratio: number): Tone {
  return ratio >= 1 ? 'good' : ratio >= 0.85 ? 'warn' : 'bad'
}

function lossTone(pct: number): Tone {
  return pct <= 0.15 ? 'good' : pct <= 0.3 ? 'warn' : 'bad'
}

const STATUS_LABEL: Record<Tone, string> = { good: 'Óptimo', warn: 'Atención', bad: 'Crítico', brand: '' }

const c = (text: string, tone?: Tone): ReportCell => ({ text, tone })
const dash = '—'

/** dd/mm/aaaa armado a mano: con es-AR, toLocaleDateString ignora el "2-digit" del mes. */
function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatPeriod(from: string, to: string): string {
  return from === to ? formatDateLong(from) : `${ddmmyyyy(from)} al ${ddmmyyyy(to)}`
}

interface Context {
  params: ReportParams
  machines: Machine[]
  records: ProductionRecord[]
  dates: string[]
}

function buildContext(params: ReportParams): Context {
  const machines = allMachines.filter((m) => params.machineIds.includes(m.id))
  const records = filterRecords({ from: params.from, to: params.to }).filter((r) => params.machineIds.includes(r.machineId))
  const dates = Array.from(new Set(records.map((r) => r.date))).sort()
  return { params, machines, records, dates }
}

function machineKpis(ctx: Context): { m: Machine; k: MachineKpis; recs: ProductionRecord[] }[] {
  return ctx.machines.map((m) => {
    const recs = ctx.records.filter((r) => r.machineId === m.id)
    return { m, k: aggregateMachineKpis(recs, m), recs }
  })
}

/** Objetivo de producción del período = objetivo diario × días con datos de esa máquina. */
function productionTarget(machineId: string, recs: ProductionRecord[]): number | null {
  const daily = getObjective(machineId, 'production', 'daily')?.targetValue
  if (!daily) return null
  const days = new Set(recs.map((r) => r.date)).size
  return days > 0 ? daily * days : null
}

function summaryStats(ctx: Context): ReportModel['stats'] {
  const rows = machineKpis(ctx)
  const m2 = sum(ctx.records.filter((r) => getMachineById(r.machineId)?.unit === 'm2').map((r) => r.qtyProduced))
  const golpes = sum(ctx.records.filter((r) => getMachineById(r.machineId)?.unit === 'golpes').map((r) => r.qtyProduced))
  const withData = rows.filter((x) => x.recs.length > 0)
  const ratios = withData
    .map(({ m, recs }) => {
      const target = productionTarget(m.id, recs)
      return target ? sum(recs.map((r) => r.qtyProduced)) / target : null
    })
    .filter((v): v is number => v !== null)
  return [
    { value: formatM2(m2), label: 'Producción Corrugadora' },
    { value: formatGolpes(golpes), label: 'Resto de máquinas' },
    { value: formatPct(average(withData.map((x) => x.k.oee)), 1), label: 'OEE promedio' },
    { value: formatPct(average(ratios), 0), label: 'Cumplimiento' },
  ]
}

function machineTable(ctx: Context, title = 'Detalle por máquina'): ReportTable {
  return {
    title,
    head: ['Máquina', 'Producción', 'Disponibilidad', 'Rendimiento', 'OEE'],
    textColumns: 1,
    rows: machineKpis(ctx).map(({ m, k, recs }) =>
      recs.length === 0
        ? [c(m.name), c('Sin datos'), c(dash), c(dash), c(dash)]
        : [c(m.name), c(formatQty(k.production, k.unit)), c(formatPct(k.availability, 1)), c(formatPct(k.performance, 1)), c(formatPct(k.oee, 1), oeeTone(k.oee))],
    ),
  }
}

function productionAndOeeCharts(ctx: Context): ReportChart[] {
  const rows = machineKpis(ctx).filter((x) => x.recs.length > 0)
  return [
    {
      title: 'Producción por máquina',
      items: rows.map(({ m, k }) => ({ label: m.name, value: k.production, valueLabel: formatNumber(k.production, 0), tone: 'brand' as Tone })),
    },
    {
      title: 'OEE por máquina',
      items: rows.map(({ m, k }) => ({ label: m.name, value: k.oee, valueLabel: formatPct(k.oee, 0), tone: oeeTone(k.oee) })),
    },
  ]
}

function buildProduccionDiaria(ctx: Context): Partial<ReportModel> {
  const shiftTable: ReportTable = {
    title: 'Detalle por turno',
    head: ['Turno', 'Corrugadora (m²)', 'Resto (golpes)', 'OEE promedio'],
    textColumns: 1,
    rows: shifts.map((s) => {
      const recs = ctx.records.filter((r) => r.shiftId === s.id)
      const kpis = ctx.machines
        .map((m) => ({ recs: recs.filter((r) => r.machineId === m.id), m }))
        .filter((x) => x.recs.length > 0)
        .map((x) => aggregateMachineKpis(x.recs, x.m))
      const oee = average(kpis.map((k) => k.oee))
      const m2 = sum(recs.filter((r) => getMachineById(r.machineId)?.unit === 'm2').map((r) => r.qtyProduced))
      const golpes = sum(recs.filter((r) => getMachineById(r.machineId)?.unit === 'golpes').map((r) => r.qtyProduced))
      return [c(s.name), c(formatNumber(m2)), c(formatNumber(golpes)), kpis.length ? c(formatPct(oee, 1), oeeTone(oee)) : c(dash)]
    }),
  }
  return { tables: [machineTable(ctx), shiftTable], charts: productionAndOeeCharts(ctx) }
}

function buildProduccionMensual(ctx: Context): Partial<ReportModel> {
  const daily = ctx.dates.map((date) => {
    const recs = ctx.records.filter((r) => r.date === date)
    const kpis = ctx.machines
      .map((m) => ({ m, recs: recs.filter((r) => r.machineId === m.id) }))
      .filter((x) => x.recs.length > 0)
      .map((x) => aggregateMachineKpis(x.recs, x.m))
    return {
      date,
      m2: sum(recs.filter((r) => getMachineById(r.machineId)?.unit === 'm2').map((r) => r.qtyProduced)),
      golpes: sum(recs.filter((r) => getMachineById(r.machineId)?.unit === 'golpes').map((r) => r.qtyProduced)),
      oee: average(kpis.map((k) => k.oee)),
    }
  })
  const dailyTable: ReportTable = {
    title: 'Evolución diaria',
    head: ['Fecha', 'Corrugadora (m²)', 'Resto (golpes)', 'OEE promedio'],
    textColumns: 1,
    rows: daily.map((d) => [c(formatDateShort(d.date)), c(formatNumber(d.m2)), c(formatNumber(d.golpes)), c(formatPct(d.oee, 1), oeeTone(d.oee))]),
  }
  return {
    tables: [dailyTable, machineTable(ctx, 'Acumulado por máquina')],
    charts: [
      { title: 'OEE promedio por día', items: daily.map((d) => ({ label: formatDateShort(d.date), value: d.oee, valueLabel: formatPct(d.oee, 0), tone: oeeTone(d.oee) })) },
    ],
  }
}

function buildPorMaquina(ctx: Context): Partial<ReportModel> {
  const rows = machineKpis(ctx)
  const table: ReportTable = {
    title: 'Indicadores por máquina',
    head: ['Máquina', 'Producción', 'Objetivo', 'Cumpl.', 'Setup', 'Paradas', 'Disp.', 'Rend.', 'OEE'],
    textColumns: 1,
    rows: rows.map(({ m, k, recs }) => {
      if (recs.length === 0) return [c(m.name), c('Sin datos'), c(dash), c(dash), c(dash), c(dash), c(dash), c(dash), c(dash)]
      const target = productionTarget(m.id, recs)
      const ratio = target ? k.production / target : null
      const downtime = sum(recs.map((r) => r.timeDowntimeMin))
      return [
        c(m.name),
        c(formatQty(k.production, k.unit)),
        c(target ? formatNumber(target) : dash),
        ratio === null ? c(dash) : c(formatPct(ratio, 0), ratioTone(ratio)),
        c(`${formatNumber(k.setupMinutes)} min`),
        c(`${formatNumber(downtime)} min`),
        c(formatPct(k.availability, 1)),
        c(formatPct(k.performance, 1)),
        c(formatPct(k.oee, 1), oeeTone(k.oee)),
      ]
    }),
  }
  return { tables: [table], charts: productionAndOeeCharts(ctx) }
}

function buildPorOperador(ctx: Context): Partial<ReportModel> {
  // El ranking se calcula solo sobre los registros de las máquinas elegidas.
  const operatorIds = Array.from(new Set(ctx.records.map((r) => r.operatorId)))
  const ranking = operatorIds
    .map((operatorId) => {
      const recs = ctx.records.filter((r) => r.operatorId === operatorId)
      const o = { operatorId }
      const machine = getMachineById(recs[0].machineId)!
      const production = sum(recs.map((r) => r.qtyProduced))
      const efficiency = average(recs.map((r) => {
        const m = getMachineById(r.machineId)!
        return r.timeProductiveMin > 0 ? r.qtyProduced / r.timeProductiveMin / m.nominalSpeed : 0
      }))
      return { o, machine, production, efficiency, shifts: recs.length, otChanges: sum(recs.map(otChangesOf)) }
    })
    .sort((a, b) => b.efficiency - a.efficiency)

  const tone = (e: number): Tone => (e >= 0.85 ? 'good' : e >= 0.7 ? 'warn' : 'bad')
  const table: ReportTable = {
    title: 'Ranking de maquinistas por eficiencia',
    head: ['#', 'Maquinista', 'Máquina', 'Turnos', 'Producción', 'Cambios OT', 'Eficiencia', 'Estado'],
    textColumns: 3,
    rows: ranking.map((x, i) => [
      c(String(i + 1)),
      c(getOperatorById(x.o.operatorId)?.name ?? x.o.operatorId),
      c(x.machine.name),
      c(String(x.shifts)),
      c(formatQty(x.production, x.machine.unit)),
      c(String(x.otChanges)),
      c(formatPct(x.efficiency, 1), tone(x.efficiency)),
      c(STATUS_LABEL[tone(x.efficiency)], tone(x.efficiency)),
    ]),
  }
  return {
    tables: [table],
    charts: [
      {
        title: 'Eficiencia por maquinista',
        items: ranking.map((x) => ({
          label: getOperatorById(x.o.operatorId)?.name ?? x.o.operatorId,
          value: x.efficiency,
          valueLabel: formatPct(x.efficiency, 0),
          tone: tone(x.efficiency),
        })),
      },
    ],
  }
}

function buildCumplimiento(ctx: Context): Partial<ReportModel> {
  const rows = machineKpis(ctx).map(({ m, k, recs }) => {
    const target = productionTarget(m.id, recs)
    const ratio = target ? k.production / target : null
    const oeeTarget = getObjective(m.id, 'oee', 'daily')?.targetValue ?? null
    return { m, k, recs, target, ratio, oeeTarget }
  })
  const table: ReportTable = {
    title: 'Objetivos vs. real por máquina',
    head: ['Máquina', 'Objetivo prod.', 'Producido', 'Cumplimiento', 'Objetivo OEE', 'OEE real', 'Estado'],
    textColumns: 1,
    rows: rows.map(({ m, k, recs, target, ratio, oeeTarget }) => {
      if (recs.length === 0) return [c(m.name), c(dash), c('Sin datos'), c(dash), c(dash), c(dash), c(dash)]
      const status = ratio === null ? undefined : ratioTone(ratio)
      return [
        c(m.name),
        c(target ? formatQty(target, m.unit) : dash),
        c(formatQty(k.production, m.unit)),
        ratio === null ? c(dash) : c(formatPct(ratio, 0), status),
        c(oeeTarget === null ? dash : formatPct(oeeTarget, 0)),
        c(formatPct(k.oee, 1), oeeTarget === null ? oeeTone(k.oee) : k.oee >= oeeTarget ? 'good' : k.oee >= oeeTarget * 0.85 ? 'warn' : 'bad'),
        status ? c(STATUS_LABEL[status], status) : c(dash),
      ]
    }),
  }
  return {
    tables: [table],
    charts: [
      {
        title: 'Cumplimiento de producción por máquina',
        items: rows
          .filter((x) => x.ratio !== null)
          .map((x) => ({ label: x.m.name, value: x.ratio!, valueLabel: formatPct(x.ratio!, 0), tone: ratioTone(x.ratio!) })),
      },
    ],
  }
}

const DOWNTIME_LABEL: Record<string, string> = { setup: 'Setup / cambio de OT', no_programada: 'Parada no programada', mantenimiento: 'Mantenimiento' }

function buildIndicadoresGestion(ctx: Context): Partial<ReportModel> {
  const machineRows = machineKpis(ctx).map(({ m, k, recs }) => {
    if (recs.length === 0) return [c(m.name), c('Sin datos'), c(dash), c(dash), c(dash), c(dash)]
    const available = sum(recs.map((r) => r.timeAvailableMin))
    const lost = sum(recs.map((r) => r.timeSetupMin + r.timeDowntimeMin))
    const loss = available > 0 ? lost / available : 0
    const scrap = sum(recs.map((r) => r.qtyProduced)) > 0 ? sum(recs.map((r) => r.qtyScrap)) / sum(recs.map((r) => r.qtyProduced)) : 0
    return [
      c(m.name),
      c(formatPct(k.availability, 1)),
      c(formatPct(k.performance, 1)),
      c(formatPct(k.oee, 1), oeeTone(k.oee)),
      c(formatPct(loss, 1), lossTone(loss)),
      c(formatPct(scrap, 1), scrap <= 0.03 ? 'good' : scrap <= 0.06 ? 'warn' : 'bad'),
    ]
  })

  const byType = new Map<string, number>()
  for (const r of ctx.records) for (const d of r.downtimes) byType.set(d.type, (byType.get(d.type) ?? 0) + d.minutes)
  const totalDown = sum([...byType.values()])
  const downtimeRows = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, min]) => [c(DOWNTIME_LABEL[type] ?? type), c(`${formatNumber(min)} min`), c(formatNumber(min / 60, 1)), c(formatPct(totalDown ? min / totalDown : 0, 1))])

  return {
    tables: [
      { title: 'Indicadores por máquina', head: ['Máquina', 'Disponibilidad', 'Rendimiento', 'OEE', 'Indisp. %', 'Scrap %'], textColumns: 1, rows: machineRows },
      { title: 'Tiempo perdido por causa', head: ['Causa', 'Minutos', 'Horas', '% del total'], textColumns: 1, rows: downtimeRows },
    ],
    charts: [
      {
        title: 'Tiempo perdido por causa (horas)',
        items: [...byType.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, min]) => ({ label: DOWNTIME_LABEL[type] ?? type, value: min, valueLabel: formatNumber(min / 60, 1), tone: 'bad' as Tone })),
      },
    ],
  }
}

function buildPlanillaDetallada(ctx: Context): Partial<ReportModel> {
  const multiDay = ctx.params.from !== ctx.params.to
  const ids = new Set(ctx.params.machineIds)
  const detail = ctx.dates.flatMap((date) => getDetailedSheetRows(date).filter((r) => ids.has(r.machineId)).map((r) => ({ date, r })))
  const num = (v: number | null, d: number) => (v === null ? dash : formatNumber(v, d))

  const detailTable: ReportTable = {
    title: multiDay ? 'Detalle por día, máquina y maquinista' : 'Detalle del día por máquina y maquinista',
    head: [...(multiDay ? ['Fecha'] : []), 'Máquina', 'Maquinista', 'Hs. Prod', 'Gp/turno', 'Gp/hora', 'm²/turno', 'm²/hora', 'Cambio OT', 'Gp/OT', 'm²/gp', 'Tiempo parado', 'Indisp % Tot'],
    textColumns: multiDay ? 3 : 2,
    rows: detail.map(({ date, r }) => {
      const machine = getMachineById(r.machineId)!
      const rate = machine.unit === 'golpes' ? r.golpesHora ?? 0 : r.m2Hora
      // nominalSpeed es por minuto; las tasas de la planilla son por hora.
      const rTone = ratioTone(rate / Math.max(machine.nominalSpeed * 60, 0.0001))
      return [
        ...(multiDay ? [c(formatDateShort(date))] : []),
        c(machine.name),
        c(getOperatorById(r.operatorId)?.name ?? r.operatorId),
        c(formatNumber(r.hoursProd, 1)),
        c(num(r.golpesTurno, 0)),
        c(num(r.golpesHora, 0), r.golpesHora === null ? undefined : rTone),
        c(formatNumber(r.m2Turno, 0)),
        c(formatNumber(r.m2Hora, 2), rTone),
        c(String(r.otChanges)),
        c(num(r.golpesPorOt, 0)),
        c(num(r.m2PorGolpe, 2)),
        c(`${formatNumber(r.tiempoParadoMin, 0)} min`),
        c(formatPct(r.indisponibilidadPct, 1), lossTone(r.indisponibilidadPct)),
      ]
    }),
  }

  // Un solo día: acumulado del mes hasta esa fecha (como la planilla original). Rango: acumulado del rango.
  const accFrom = multiDay ? ctx.params.from : `${ctx.params.to.slice(0, 7)}-01`
  const monthly = getDetailedSheetMonthly(accFrom, ctx.params.to).filter((m) => ids.has(m.machineId))
  const monthlyTable: ReportTable = {
    title: multiDay ? 'Acumulado del período y promedio por máquina' : 'Acumulado del mes y promedio mensual por máquina',
    head: ['Máquina', 'Hs', 'Golpes', 'm²', 'OT', 'm²/gp', 'Tiempo parado', 'Indisp % Tot', 'Indisp %', 'Gp/turno', 'm²/turno', 'm²/hora'],
    textColumns: 1,
    rows: monthly.map((m) => [
      c(getMachineById(m.machineId)!.name),
      c(formatNumber(m.hsTotal, 1)),
      c(num(m.golpesTotal, 0)),
      c(formatNumber(m.m2Total, 0)),
      c(String(m.otTotal)),
      c(num(m.m2PorGolpe, 2)),
      c(`${formatNumber(m.tiempoParadoTotal, 0)} min`),
      c(formatPct(m.indisponibilidadPct, 1), lossTone(m.indisponibilidadPct)),
      c(formatPct(m.avgIndisponibilidadPct, 1), lossTone(m.avgIndisponibilidadPct)),
      c(num(m.avgGolpesTurno, 0)),
      c(formatNumber(m.avgM2Turno, 0)),
      c(formatNumber(m.avgM2Hora, 2)),
    ]),
  }
  return { tables: [detailTable, monthlyTable], charts: [], layout: 'landscape', stats: [] }
}

const BUILDERS: Record<ReportType, (ctx: Context) => Partial<ReportModel>> = {
  produccion_diaria: buildProduccionDiaria,
  produccion_mensual: buildProduccionMensual,
  por_maquina: buildPorMaquina,
  por_operador: buildPorOperador,
  cumplimiento: buildCumplimiento,
  indicadores_gestion: buildIndicadoresGestion,
  planilla_detallada: buildPlanillaDetallada,
}

/** Arma el contenido del reporte. PDF, Excel y vista previa se generan todos a partir de este modelo. */
export function buildReportModel(params: ReportParams): ReportModel {
  const ctx = buildContext(params)
  const label = (REPORT_TYPES.find((r) => r.value === params.reportType)?.label ?? '').replace(/\s*\(.*\)$/, '')
  const built = BUILDERS[params.reportType](ctx)
  const periodLabel = formatPeriod(params.from, params.to)
  return {
    title: `${label.toUpperCase()} — ${periodLabel}`,
    periodLabel,
    subtitle: `Máquinas incluidas: ${ctx.machines.length} de ${allMachines.length} · Días con datos: ${ctx.dates.length}`,
    stats: built.stats ?? summaryStats(ctx),
    tables: built.tables ?? [],
    charts: params.includeCharts ? (built.charts ?? []).filter((ch) => ch.items.length > 0) : [],
    daysWithData: ctx.dates.length,
    layout: built.layout ?? 'portrait',
  }
}
