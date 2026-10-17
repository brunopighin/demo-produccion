# BJP Industrial Analytics

Demo web de indicadores de producción para una planta de cartón corrugado: dashboard, KPIs por máquina y por operador, objetivos, alertas y reportes descargables en PDF y Excel.

> **Datos simulados.** No hay backend: toda la información sale de archivos JSON en `src/data/`, generados con un script. El login es de demostración (usuario y contraseña definidos en `src/pages/Login/LoginPage.tsx`).

## Tecnologías

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Recharts (gráficos en pantalla)
- jsPDF + jspdf-autotable (PDF generados en el navegador, sin diálogo de impresión)
- Deploy estático en Netlify (`netlify.toml`, con redirect para que funcionen las rutas de la SPA)

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
| `/importaciones` | Importaciones | Historial de archivos importados. |
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
    reportModel.ts             Contenido de cada tipo de reporte (ver "Reportes")
    reportsService.ts          Dibuja el PDF y arma el Excel a partir del modelo
    scheduledReportsService.ts Envíos programados (guardados en el navegador)
  hooks/         Hooks por pantalla
  pages/         Una carpeta por pantalla
  components/    UI compartida (tarjetas, gráficos, layout)
  utils/format.ts  Formato de números, fechas y horas (es-AR)
scripts/generate-production-data.cjs   Generador de datos simulados
```

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

## Historial de cambios

Ver [CHANGELOG.md](CHANGELOG.md).
