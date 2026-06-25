export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits })
}

export function formatM2(value: number): string {
  return `${formatNumber(value)} m²`
}

export function formatGolpes(value: number): string {
  return `${formatNumber(value)} golpes`
}

const UNIT_LABELS = {
  m2: 'm²',
  golpes: 'golpes',
  fardos: 'fardos',
  rotulos: 'rótulos',
  bultos: 'bultos',
} as const

export function formatQty(value: number, unit: keyof typeof UNIT_LABELS): string {
  return `${formatNumber(value)} ${UNIT_LABELS[unit]}`
}

export function formatPct(value: number, fractionDigits = 0): string {
  return `${formatNumber(value * 100, fractionDigits)}%`
}

export function formatMinutesAsHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
}

export function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatDateShort(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}
