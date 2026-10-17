# Historial de cambios

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
