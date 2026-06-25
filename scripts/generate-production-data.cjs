// Genera src/data/productionRecords.json e import-logs.json con datos ficticios
// pero coherentes para alimentar todos los dashboards de la demo.
const fs = require('fs')
const path = require('path')

const machines = require('../src/data/machines.json')
const operators = require('../src/data/operators.json')
const shifts = require('../src/data/shifts.json')
const simpleLines = require('../src/data/simpleLines.json')

const DATA_DIR = path.join(__dirname, '..', 'src', 'data')
const DAYS = 60
const SHIFT_MINUTES = 460 // 8h de turno - 20min de pausas pagas

// Perfiles por operador para las líneas simples (Picadero, Flejadora) - sin OEE
const SIMPLE_LINE_PROFILES = {
  l1: {
    operators: {
      Diaz: { fardos: [35, 50], rotulos: [0, 5] },
      Zeppa: { fardos: [25, 38], rotulos: [10, 25] },
      Rasente: { fardos: [18, 30], rotulos: [50, 75] },
    },
  },
  l2: {
    operators: {
      Caceres: { bultos: [260, 320] },
      'Martini/Reinado': { bultos: [300, 360] },
      Perez: { bultos: [360, 410] },
    },
  },
}

// Perfiles por máquina: availability/performance/scrap base (0-1) y volatilidad
const PROFILES = {
  m1: { availability: 0.88, performance: 0.91, scrap: 0.025, scrapSpikeChance: 0.05, setupRange: [25, 45] },
  m2: { availability: 0.82, performance: 0.85, scrap: 0.04, scrapSpikeChance: 0.07, setupRange: [20, 40] },
  m3: { availability: 0.8, performance: 0.83, scrap: 0.045, scrapSpikeChance: 0.08, setupRange: [30, 55] },
  m4: { availability: 0.74, performance: 0.77, scrap: 0.05, scrapSpikeChance: 0.1, setupRange: [20, 35] },
  m5: { availability: 0.77, performance: 0.79, scrap: 0.05, scrapSpikeChance: 0.09, setupRange: [20, 35] },
  m6: { availability: 0.87, performance: 0.9, scrap: 0.03, scrapSpikeChance: 0.05, setupRange: [15, 30] },
  m7: { availability: 0.71, performance: 0.74, scrap: 0.055, scrapSpikeChance: 0.13, setupRange: [30, 60] },
}

const DOWNTIME_REASONS = {
  setup: ['Cambio de formato', 'Cambio de orden de trabajo', 'Ajuste de registro'],
  no_programada: ['Rotura de papel', 'Falla eléctrica', 'Falta de materia prima', 'Atasco de máquina'],
  mantenimiento: ['Mantenimiento preventivo', 'Mantenimiento correctivo'],
}

const SCRAP_REASONS = ['rotura', 'ajuste', 'calidad', 'arranque']

// PRNG determinístico (mulberry32) para que la demo sea reproducible
function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260101)

function randRange(min, max) {
  return min + rand() * (max - min)
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)]
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function operatorsForMachine(machineId) {
  return operators.filter((o) => o.primaryMachineId === machineId && o.active)
}

function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

const records = []
const importLogs = []
const simpleRecords = []
let recordCounter = 1
let simpleRecordCounter = 1

const today = new Date()
today.setHours(0, 0, 0, 0)

for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
  const date = new Date(today)
  date.setDate(date.getDate() - dayOffset)
  const iso = dateStr(date)
  const dayOfWeek = date.getDay() // 0=domingo
  const weekendPenalty = dayOfWeek === 0 ? 0.08 : dayOfWeek === 6 ? 0.04 : 0
  // leve tendencia de mejora a medida que se acerca a hoy (simula maduración del proceso)
  const progressBoost = ((DAYS - dayOffset) / DAYS) * 0.04

  const importIdPlant = `imp-${iso}-plant`
  const importIdMap = `imp-${iso}-map`
  importLogs.push({
    id: importIdPlant,
    source: 'kiwi_plant',
    filename: `kiwi_plant_${iso}.xlsx`,
    importedAt: `${iso}T06:05:00`,
    status: 'ok',
    rowsTotal: machines.length * shifts.length,
    rowsError: 0,
  })
  importLogs.push({
    id: importIdMap,
    source: 'kiwi_map',
    filename: `kiwi_map_${iso}.csv`,
    importedAt: `${iso}T06:07:00`,
    status: rand() < 0.08 ? 'warning' : 'ok',
    rowsTotal: machines.length * shifts.length,
    rowsError: rand() < 0.08 ? Math.floor(randRange(1, 4)) : 0,
  })

  for (const machine of machines) {
    const profile = PROFILES[machine.id]
    const candidates = operatorsForMachine(machine.id)

    shifts.forEach((shift, shiftIdx) => {
      const operator = candidates.length
        ? candidates[(dayOffset + shiftIdx) % candidates.length]
        : pick(operators)

      const noise = randRange(-0.06, 0.06)
      const shiftPenalty = shiftIdx === 2 ? 0.05 : 0 // turno noche algo más bajo

      const availabilityPct = clamp(profile.availability + noise - weekendPenalty - shiftPenalty + progressBoost, 0.4, 0.97)
      const performancePct = clamp(profile.performance + randRange(-0.05, 0.05) - shiftPenalty + progressBoost, 0.4, 0.98)

      let scrapPct = clamp(profile.scrap + randRange(-0.01, 0.015), 0.005, 0.15)
      const hasSpike = rand() < profile.scrapSpikeChance
      if (hasSpike) scrapPct = clamp(scrapPct + randRange(0.025, 0.06), 0.005, 0.2)

      const setupMin = Math.round(randRange(...profile.setupRange))
      const nonProductiveMin = Math.round(SHIFT_MINUTES * (1 - availabilityPct))
      const downtimeMin = Math.max(0, nonProductiveMin - setupMin)
      const productiveMin = SHIFT_MINUTES - setupMin - downtimeMin

      const qtyProduced = Math.round(productiveMin * machine.nominalSpeed * performancePct)
      const qtyScrap = Math.round(qtyProduced * scrapPct)
      const qtyGood = qtyProduced - qtyScrap

      const downtimes = []
      if (setupMin > 0) {
        downtimes.push({ type: 'setup', reason: pick(DOWNTIME_REASONS.setup), minutes: setupMin })
      }
      if (downtimeMin > 0) {
        const isMaintenance = rand() < 0.2
        const type = isMaintenance ? 'mantenimiento' : 'no_programada'
        downtimes.push({ type, reason: pick(DOWNTIME_REASONS[type]), minutes: downtimeMin })
      }

      const scrapBreakdown = SCRAP_REASONS.map((reason) => ({ reason, kg: 0 }))
      let remainingScrap = qtyScrap
      scrapBreakdown.forEach((entry, idx) => {
        if (idx === scrapBreakdown.length - 1) {
          entry.kg = remainingScrap
        } else {
          const portion = Math.round(remainingScrap * randRange(0.1, 0.4))
          entry.kg = portion
          remainingScrap -= portion
        }
      })

      records.push({
        id: `pr-${recordCounter++}`,
        date: iso,
        machineId: machine.id,
        operatorId: operator.id,
        shiftId: shift.id,
        qtyProduced,
        qtyGood,
        qtyScrap,
        timeAvailableMin: SHIFT_MINUTES,
        timeProductiveMin: productiveMin,
        timeSetupMin: setupMin,
        timeDowntimeMin: downtimeMin,
        downtimes,
        scrapBreakdown: scrapBreakdown.filter((e) => e.kg > 0),
        sourceImportId: importIdPlant,
      })
    })
  }

  for (const line of simpleLines) {
    const profile = SIMPLE_LINE_PROFILES[line.id]
    const operatorNames = Object.keys(profile.operators)

    shifts.forEach((shift, shiftIdx) => {
      const operatorName = operatorNames[(dayOffset + shiftIdx) % operatorNames.length]
      const ranges = profile.operators[operatorName]

      const values = {}
      for (const metric of line.metrics) {
        const [min, max] = ranges[metric.key] ?? [0, 0]
        values[metric.key] = Math.round(randRange(min, max))
      }

      simpleRecords.push({
        id: `sr-${simpleRecordCounter++}`,
        date: iso,
        lineId: line.id,
        shiftId: shift.id,
        operatorName,
        values,
      })
    })
  }
}

fs.writeFileSync(path.join(DATA_DIR, 'productionRecords.json'), JSON.stringify(records, null, 2))
fs.writeFileSync(path.join(DATA_DIR, 'importLogs.json'), JSON.stringify(importLogs.reverse(), null, 2))
fs.writeFileSync(path.join(DATA_DIR, 'simpleProductionRecords.json'), JSON.stringify(simpleRecords, null, 2))

console.log(`Generados ${records.length} registros de producción (${DAYS} días x ${machines.length} máquinas x ${shifts.length} turnos)`)
console.log(`Generados ${importLogs.length} registros de importación`)
console.log(`Generados ${simpleRecords.length} registros de líneas simples (${DAYS} días x ${simpleLines.length} líneas x ${shifts.length} turnos)`)
