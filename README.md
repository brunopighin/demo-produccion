# BJP Industrial Analytics

Demo web de indicadores de producción para una planta de cartón corrugado: dashboard, KPIs por máquina y por operador, objetivos, alertas y reportes descargables en PDF y Excel.

> **Datos simulados + importados.** No hay backend: la información de ejemplo sale de archivos JSON en `src/data/`, generados con un script. Lo que se sube desde Importaciones se suma a esos datos y se guarda en el navegador (ver "Importación de datos"). El login es de demostración (usuario y contraseña definidos en `src/pages/Login/LoginPage.tsx`).

## Tecnologías

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Recharts (gráficos en pantalla)
- jsPDF + jspdf-autotable (PDF generados en el navegador, sin diálogo de impresión)
- Deploy en Railway, automático desde GitHub

## Uso local

```bash
npm install
npm run dev            # servidor de desarrollo
npm run build          # chequeo de tipos + build de producción en dist/
npm run lint           # oxlint
npm run generate:data  # regenera los JSON de producción simulada
```

## Pantallas

| Ruta | Pantalla | Qué muestra |
|---|---|---|
| `/login` | Login | Acceso de demostración. La sesión queda guardada en el navegador. |
| `/dashboard` | Dashboard | Resumen del último día: producción, OEE, cumplimiento, alertas, tendencias. |
| `/produccion` | Producción | Detalle de producción por turno y máquina. |
| `/maquinas` | Máquinas | KPIs por máquina y líneas simples (Picadero, Flejadora). |
| `/operadores` | Operadores | Ranking y evolución por maquinista. |
| `/importaciones` | Importaciones | Subida de la planilla de producción (.xlsx o .csv) e historial de importaciones. |
| `/reportes` | Reportes | Generación de reportes PDF/Excel con vista previa, y envíos programados. |
| `/configuracion` | Configuración | Objetivos y umbrales. |

## Estructura

```
src/
  data/          JSON con máquinas, operarios, turnos, objetivos y registros de producción
  types/         Tipos de dominio (máquina, registro, KPI, objetivo…)
  services/      Lógica de negocio, sin React
    productionService.ts       Filtros y cálculo de KPIs (OEE, disponibilidad, rendimiento, cumplimiento)
    kpiCalculations.ts         Fórmulas base
    simpleLineService.ts       Líneas simples (Picadero: fardos/rótulos, Flejadora: bultos)
    importsService.ts          Plantilla, validación y guardado de la planilla importada
    spreadsheetReader.ts       Lectura de .xlsx y .csv sin librerías externas
    importedDataStore.ts       Datos importados en localStorage
    reportModel.ts             Contenido de cada tipo de reporte (ver "Reportes")
    reportsService.ts          Dibuja el PDF y arma el Excel a partir del modelo
    scheduledReportsService.ts Envíos programados (guardados en el navegador)
  hooks/         Hooks por pantalla
  pages/         Una carpeta por pantalla
  components/    UI compartida (tarjetas, gráficos, layout)
  utils/format.ts  Formato de números, fechas y horas (es-AR)
scripts/generate-production-data.cjs   Generador de datos simulados
```

## Importación de datos

Desde **Importaciones** se sube una planilla con **una fila por máquina, fecha y turno**. El botón "Descargar plantilla" baja un CSV con los encabezados y dos filas de ejemplo; se completa en Excel y se puede subir como `.xlsx` o `.csv`.

| Columna | Obligatoria | Detalle |
|---|---|---|
| Fecha | sí | dd/mm/aaaa (también acepta aaaa-mm-dd y fechas de Excel). No puede ser futura. |
| Máquina | sí | Código (CORR, HBL, DRO, MINI1, MINI2, PACIFIC, WARD11500) o nombre. |
| Turno | sí | Mañana, Tarde o Noche (también 1/2/3 o M/T/N). |
| Operario | sí | Código (OP01…) o nombre. |
| Producido | sí | m² en Corrugadora, HBL y DRO; golpes en el resto. |
| Scrap | no (0) | Misma unidad que Producido. |
| Minutos disponibles | no (480) | Tiempo planificado del turno. |
| Minutos setup | no (0) | Cambios de OT, formato y ajustes. |
| Cambios de OT | no (0) | Cantidad. |
| Minutos parada no programada | no (0) | |
| Minutos mantenimiento | no (0) | |

Cómo funciona:

- El orden de las columnas no importa: se reconocen por el encabezado. Puede haber filas de título arriba de los encabezados; las filas vacías se ignoran. Los nombres se comparan sin importar mayúsculas ni acentos.
- Los números aceptan formato argentino (`180.500`, `38,5`) o con punto decimal. El CSV puede venir con `;`, `,` o tabulación, en UTF-8 o en Windows-1252 (como lo guarda Excel en español).
- Antes de guardar se muestra una **revisión**: filas válidas, período, cuántos registros existentes se reemplazan y el detalle de cada fila con error (número de fila como en Excel y motivo). Se valida: fecha inexistente o futura, máquina/turno/operario desconocidos, números inválidos o negativos, paradas que superan los minutos disponibles, scrap mayor a lo producido, cambios de OT sin minutos de setup y filas repetidas dentro del archivo.
- Al confirmar se importan solo las filas válidas. Un registro con la misma fecha, máquina y turno que uno existente lo **reemplaza**.
- Lo importado se ve enseguida en todas las pantallas (Dashboard, Producción, Máquinas, Operadores, Reportes), y el último día pasa a ser el más reciente con datos.
- **Se guarda en el navegador (`localStorage`)**: solo se ve en ese equipo y navegador, y se pierde si se borran los datos del sitio o en modo incógnito. "Borrar datos importados" vuelve a los datos de ejemplo. Para compartir los datos entre usuarios haría falta un backend con base de datos.
- `.xls` (Excel 97-2003) no se puede leer: hay que guardarlo como `.xlsx` o CSV. Límite: 10 MB.

## Reportes

Todos los reportes salen de un único **modelo** (`buildReportModel` en `src/services/reportModel.ts`). A partir de ese modelo se generan el PDF, el Excel y la vista previa en pantalla, así que lo que se ve es exactamente lo que se descarga.

Opciones:

- **Período:** desde/hasta, con atajos (Último día, Últimos 7 días, Mes actual, Todo). Las fechas están limitadas al rango con datos.
- **Máquinas:** filtran todo el contenido del reporte, incluidos los totales.
- **Formato:** PDF, o Excel (archivo `.csv` con `;` como separador, que Excel en es-AR abre directo). Los gráficos solo van en el PDF.

| Tipo | Contenido |
|---|---|
| Producción Diaria | Totales, detalle por máquina y por turno, gráficos de producción y OEE. |
| Producción Mensual | Evolución día por día y acumulado por máquina. |
| Por Máquina | Producción contra objetivo, setup, paradas, disponibilidad, rendimiento y OEE. |
| Por Operador | Ranking de maquinistas por eficiencia, con turnos y cambios de OT. |
| Cumplimiento de Objetivos | Objetivo de producción y de OEE contra el real, con estado (Óptimo / Atención / Crítico). |
| Indicadores de Gestión | Disponibilidad, rendimiento, OEE, indisponibilidad, scrap y tiempo perdido por causa. |
| Planilla Detallada | Formato estilo Excel (A3 apaisado): detalle por máquina y maquinista, y acumulado con promedios. Para un día, el acumulado es del mes hasta esa fecha; para un rango, es del rango. |

El objetivo de producción de un período es el objetivo diario por la cantidad de días con datos de esa máquina.

Semáforos usados: OEE verde ≥ 70 %, amarillo ≥ 50 %. Cumplimiento y velocidad contra nominal: verde ≥ 100 %, amarillo ≥ 85 %. Indisponibilidad: verde ≤ 15 %, amarillo ≤ 30 %.

La hora de "Generado el…" siempre está en hora de Argentina (24 h), sin importar la zona horaria del equipo.

### Envíos programados

Se pueden crear, editar y eliminar envíos diarios, semanales o mensuales, con destinatarios validados y cálculo del próximo envío. **Como la demo no tiene servidor, se guardan en el navegador (`localStorage`) y no se envían mails.** Para enviarlos de verdad hace falta un backend con un servidor de correo que genere el reporte con `buildReportModel` y lo mande a la hora programada.

## Publicación (Railway)

Sitio: https://bjp-industrial-analytics-production.up.railway.app

Railway, proyecto `bjp-industrial-analytics`, servicio `bjp-industrial-analytics`, conectado al repo de GitHub `brunopighin/demo-produccion` (rama `main`). **Cada push a `main` se publica solo**: Railway hace `npm run build` y sirve `dist/` como sitio estático, con las rutas de la SPA (`/reportes`, `/dashboard`…) resueltas a `index.html`.

Para ver el estado del último deploy:

```bash
railway deployment list --project bjp-industrial-analytics --service bjp-industrial-analytics
```

## Historial de cambios

Ver [CHANGELOG.md](CHANGELOG.md).
