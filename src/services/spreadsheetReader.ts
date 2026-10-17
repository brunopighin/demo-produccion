/**
 * Lee la primera hoja de un .xlsx o un .csv y la devuelve como filas de texto.
 * Sin dependencias: el .xlsx es un zip de XML, que se descomprime con DecompressionStream
 * (disponible en todos los navegadores actuales) y se parsea con DOMParser.
 */

export type Cell = string | number | null
export type Rows = Cell[][]

export async function readSpreadsheet(file: File): Promise<Rows> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) return readXlsx(await file.arrayBuffer())
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(await readText(file))
  if (name.endsWith('.xls')) throw new Error('El formato .xls (Excel 97-2003) no se puede leer. En Excel, usá "Guardar como" → "Libro de Excel (.xlsx)" o "CSV".')
  throw new Error('Formato no soportado. Subí un archivo .xlsx o .csv.')
}

/** UTF-8 con o sin BOM; si no es UTF-8 válido, cae a Windows-1252 (CSV guardado por Excel en español). */
async function readText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

/** CSV con separador detectado (";" de Excel es-AR, "," o tabulación) y comillas dobles. */
export function parseCsv(text: string): Rows {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = [';', ',', '\t'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ';')

  const rows: Rows = []
  let row: Cell[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

interface ZipEntry {
  method: number
  compressedSize: number
  localOffset: number
}

function readZipDirectory(buf: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buf)
  // Fin del directorio central: firma 0x06054b50, buscada desde el final (puede haber comentario).
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('El archivo .xlsx está dañado o no es un archivo de Excel.')
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const entries = new Map<string, ZipEntry>()
  const decoder = new TextDecoder()
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break
    const method = view.getUint16(p + 10, true)
    const compressedSize = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const localOffset = view.getUint32(p + 42, true)
    const name = decoder.decode(new Uint8Array(buf, p + 46, nameLen))
    entries.set(name, { method, compressedSize, localOffset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

async function readZipText(buf: ArrayBuffer, entries: Map<string, ZipEntry>, name: string): Promise<string | null> {
  const entry = entries.get(name)
  if (!entry) return null
  const view = new DataView(buf)
  const nameLen = view.getUint16(entry.localOffset + 26, true)
  const extraLen = view.getUint16(entry.localOffset + 28, true)
  const start = entry.localOffset + 30 + nameLen + extraLen
  const data = new Uint8Array(buf, start, entry.compressedSize)
  if (entry.method === 0) return new TextDecoder().decode(data)
  if (entry.method !== 8) throw new Error('El archivo .xlsx usa una compresión no soportada.')
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

const parseXml = (text: string) => new DOMParser().parseFromString(text, 'application/xml')

function columnIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, '')
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

async function readXlsx(buf: ArrayBuffer): Promise<Rows> {
  const entries = readZipDirectory(buf)

  // Primera hoja según el libro (no siempre se llama sheet1.xml).
  let sheetPath = 'xl/worksheets/sheet1.xml'
  const workbook = await readZipText(buf, entries, 'xl/workbook.xml')
  const rels = await readZipText(buf, entries, 'xl/_rels/workbook.xml.rels')
  if (workbook && rels) {
    const firstSheet = parseXml(workbook).getElementsByTagName('sheet')[0]
    const relId = firstSheet?.getAttribute('r:id') ?? firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const rel = [...parseXml(rels).getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === relId)
    const target = rel?.getAttribute('Target')
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
  }

  const sharedXml = await readZipText(buf, entries, 'xl/sharedStrings.xml')
  const shared = sharedXml
    ? [...parseXml(sharedXml).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent ?? '').join(''))
    : []

  const sheetXml = await readZipText(buf, entries, sheetPath)
  if (!sheetXml) throw new Error('No se encontró ninguna hoja en el archivo .xlsx.')

  const rows: Rows = []
  for (const rowEl of parseXml(sheetXml).getElementsByTagName('row')) {
    const rowIndex = Number(rowEl.getAttribute('r') ?? rows.length + 1) - 1
    const row: Cell[] = []
    for (const c of rowEl.getElementsByTagName('c')) {
      const ref = c.getAttribute('r')
      const col = ref ? columnIndex(ref) : row.length
      const type = c.getAttribute('t')
      const v = c.getElementsByTagName('v')[0]?.textContent ?? null
      let value: Cell = null
      if (type === 's') value = v === null ? null : shared[Number(v)] ?? ''
      else if (type === 'inlineStr') value = [...c.getElementsByTagName('t')].map((t) => t.textContent ?? '').join('')
      else if (type === 'str' || type === 'e') value = v
      else if (type === 'b') value = v === '1' ? 'VERDADERO' : 'FALSO'
      else value = v === null ? null : Number(v)
      row[col] = value
    }
    rows[rowIndex] = Array.from(row, (x) => x ?? null)
  }
  return Array.from(rows, (r) => r ?? [])
}
