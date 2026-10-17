# Historial de cambios

## 2026-10-17 — Importación de planillas real

**Por qué:** la pantalla de Importaciones era una simulación. El botón "Subir Reporte" no abría ningún archivo: esperaba 2 segundos y mostraba "procesado correctamente". El historial también era de ejemplo.

**Cambios:**
- Subida real de archivos `.xlsx` y `.csv`, con botón o arrastrando el archivo (`src/pages/Imports/ImportsPage.tsx`).
- Plantilla propia descargable: una fila por máquina, fecha y turno. Se eligió plantilla propia porque no hay exportaciones reales de Kiwi Plant/Kiwi Map para copiar su formato.
- Lector de planillas sin dependencias (`src/services/spreadsheetReader.ts`): lee `.xlsx` (zip + XML con `DecompressionStream`/`DOMParser`) y CSV (`;`/`,`/tab, UTF-8 o Windows-1252).
- Validación fila por fila, con revisión antes de confirmar (`src/services/importsService.ts`). Ver el README.
- Lo importado se suma a los datos de ejemplo, reemplazando los registros de la misma fecha, máquina y turno, y aparece en todas las pantallas (`mergeRecords` en `productionService.ts`).
- Guardado en el navegador (`src/services/importedDataStore.ts`), con el historial real de importaciones y la opción "Borrar datos importados".
- El historial muestra la fecha como dd/mm/aaaa hh:mm, y las importaciones de ejemplo aparecen como "(ejemplo)".

**Cómo se probó:** con Chrome en modo automático, subiendo archivos reales (38 verificaciones, sin errores en consola):
- Plantilla descargada y vuelta a subir.
- `.xlsx` generado con openpyxl (título arriba de los encabezados y fechas de Excel): 21 filas.
- `.xlsx` con 9 tipos de error, cada uno detectado con su fila y motivo.
- CSV guardado como Excel en español (Windows-1252, `180.500`, `38,5`).
- Archivo sin columnas obligatorias y archivo que no es planilla.
- Los datos importados llegan al Dashboard y a Reportes (Corrugadora del 26/06 = 511.500 m², la suma importada).
- Persisten al recargar y "Borrar datos importados" vuelve a los datos de ejemplo.
- Vista en celular.

También se repitieron las 40 verificaciones de Reportes. `tsc -b`, `oxlint` y `vite build` sin errores.

## 2026-10-17 — Fuera de Netlify, solo Railway

- La demo se publica únicamente en Railway (https://bjp-industrial-analytics-production.up.railway.app), conectada a GitHub: cada push a `main` se publica solo. Ya estaba así desde el 09/10; Netlify había quedado como una copia vieja que se actualizaba a mano.
- Se eliminó el sitio de Netlify (bjpindustrial.netlify.app) y el archivo `netlify.toml`.
- Antes de eliminar Netlify se corrieron las 40 verificaciones de la pantalla de Reportes contra la URL de Railway, y pasaron todas.

## 2026-10-17 — Publicado en Netlify

- El sitio no se actualizaba desde el 26/06: Netlify no está conectado a GitHub y los deploys se hacen a mano. Ahora se publicó todo lo de octubre: login, versión para celular, hora de los PDF y la pantalla de Reportes completa.
- Se repitieron las 40 verificaciones de la pantalla de Reportes contra https://bjpindustrial.netlify.app y pasaron todas.
- El README explica cómo publicar.

## 2026-10-17 — Pantalla de Reportes completa

**Por qué:** la vista previa era un recuadro de relleno. Además, el período elegido se ignoraba, 6 de los 7 tipos de reporte generaban el mismo PDF y los botones de reportes programados no hacían nada.

**Cambios:**
- Nuevo `src/services/reportModel.ts`: arma el contenido de cada tipo de reporte. PDF, Excel y vista previa salen de este mismo modelo.
- Cada tipo tiene su propio contenido: Producción Diaria, Producción Mensual, Por Máquina, Por Operador, Cumplimiento de Objetivos, Indicadores de Gestión y Planilla Detallada. Ver el README.
- **Vista previa real** (`src/pages/Reports/ReportPreview.tsx`): las mismas tablas, colores y gráficos del archivo. Se actualiza al cambiar cualquier opción y tiene un botón para abrir el PDF en otra pestaña.
- **Período:** ahora se usa. Agregué atajos (Último día, Últimos 7 días, Mes actual, Todo) y validación de "desde" posterior a "hasta".
- **Máquinas:** el filtro afecta todo el reporte, incluidos los totales. Con ninguna máquina elegida no deja generar.
- **PDF:** paginación automática, con "Página X de Y" en el pie.
- **Excel:** incluye resumen y todas las tablas. "Incluir gráficos" se deshabilita porque solo aplica al PDF.
- El nombre del archivo incluye el período (`reporte_<tipo>_<desde>_a_<hasta>`).
- **Reportes programados** (`src/pages/Reports/ScheduledReportsCard.tsx` y `src/services/scheduledReportsService.ts`): alta, edición y baja, con frecuencia diaria, semanal o mensual, validación de mails y próximo envío en hora de Argentina. Se guardan en el navegador; el envío real por mail necesita un backend.

**Errores corregidos:**
- Planilla Detallada: la columna m²/hora (y Gp/hora) salía siempre en verde. Comparaba la velocidad por hora con la nominal por minuto.
- Por Operador: "Cambios OT" repetía la cantidad de turnos con setup. Ahora cuenta los cambios de OT reales.
- Los mensajes de error de la pantalla usaban una clase de color inexistente (`text-status-critical`) y salían sin color.
- Las fechas de un rango salían como "19/6/2026" (el idioma es-AR ignora el "2 dígitos" del mes). Ahora salen como "19/06/2026".

**Cómo se probó:**
- Se generaron 140 reportes: los 7 tipos, 5 combinaciones de período y máquinas (incluido un período sin datos), con y sin gráficos, en PDF y Excel. Ninguno tuvo excepciones ni valores `NaN`/`undefined`, y las columnas quedaron alineadas. Se revisaron varios PDF a la vista.
- Se manejó la pantalla con Chrome en modo automático (40 verificaciones, sin errores en consola): vista previa de cada tipo, período y atajos, validaciones, filtro de máquinas, descargas de PDF y Excel, abrir PDF en otra pestaña, alta/edición/baja de envíos programados (persisten al recargar) y vista en celular sin scroll horizontal.
- `tsc -b`, `oxlint` y `vite build` sin errores.

## 2026-10-16 — Hora de generación de los PDF en hora de Argentina

- "Generado el…" en los PDF usaba la zona horaria y el formato de 12 h del equipo, a veces sin "a. m./p. m.". Ahora usa `formatNowAR()` (`src/utils/format.ts`): hora de Argentina en formato 24 h.

## 2026-10-09 — App adaptada a celular

## 2026-10-08 — Login con usuario y contraseña de demostración

- Se exige usuario y contraseña. Se corrigió que la sesión se perdía al recargar la página.

## 2026-06-25 — Primera versión

- Dashboard, producción, máquinas, operadores, importaciones, reportes y configuración con datos simulados.
- Reportes descargables: PDF real (jsPDF) y CSV para Excel con `;` como separador.
- Planilla Detallada estilo Excel.
- Deploy en Netlify.
