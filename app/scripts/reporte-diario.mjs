// Genera el reporte diario del barrido (Nestor Forex Swing) y lo deja en DOS
// sitios: impreso entre marcadores en el log, y —si se le da la rama `datos`—
// publicado en `estado/reporte.json`.
//
// Corre en GitHub Actions (con internet completo) porque el entorno normal de
// la sesión de Claude tiene bloqueado Twelve Data.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ POR QUÉ SE PUBLICA A UN ARCHIVO Y NO BASTA CON EL LOG
// ─────────────────────────────────────────────────────────────────────────
// El reporte tarda ~65 segundos en generarse. Pero **la API de GitHub Actions
// va con retraso**, y no un poco: está medido en este proyecto el 2026-09-03
// (13 minutos) y otra vez el 2026-09-14, donde el trabajo terminó a los 65
// segundos y los logs siguieron devolviendo 404 durante **40 minutos**. Con el
// estado pasa igual, así que ni el `status` ni el 404 distinguen «sigue
// corriendo» de «todavía no está publicado».
//
// El reporte se genera a la hora; lo que llegaba tarde era LEERLO.
//
// `raw.githubusercontent.com` no pasa por esa API: sirve el archivo en cuanto
// el commit está en la rama. Es el mismo camino por el que la app lee
// `barrido.json`, `calendario.json`, `tasas.json` y `cot.json`.
//
// ⚠️ ESTO NO AFECTA NI HA AFECTADO A LA APP. La app nunca ha leído logs de
// Actions: lee los archivos de la rama `datos`. El retraso solo estorbaba para
// mandarle el reporte a Néstor por el chat.
//
// ⚠️ `generadoEl` VA DENTRO DEL ARCHIVO, y no es decoración: un archivo que se
// sobrescribe cada día se lee igual de bien estando viejo. Sin esa marca, leer
// el reporte de ayer y presentarlo como el de hoy sería indistinguible de que
// todo fue bien — y eso ya pasó una vez. Quien lo lea tiene que comprobar que
// `generadoEl` empieza por la fecha de hoy en UTC.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { computarBarrido, derivarVista } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { limitaciones } from '../src/lib/fakeData.js'
import { APP } from '../src/lib/identidad.js'
// ⚠️ ESTAS DOS LÍNEAS VIVEN FUERA, Y NO ES ORGANIZACIÓN: dentro de este guion
// no se podían probar, porque aquí se piden velas en cuanto se importa. Eso
// costó un fallo real el 2026-10-20 — la frase «por eso no hay señales» salió
// publicada en un reporte que traía dos señales. El porqué entero está en la
// cabecera de `lib/lineas-reporte.mjs`.
import { lineaBloqueados, lineaUmbral } from './lib/lineas-reporte.mjs'

// LA REVERSIÓN, QUE LA APP YA ENSEÑA Y EL REPORTE CALLABA.
//
// ⚠️⚠️ ÉSTE ES EL ARREGLO DE FONDO DEL 2026-10-19, y el fallo era mío.
//
// `useMarketData.js` llama a `derivarVista` con `incluirReversion: true` desde
// el 2026-09-05, a petición de Néstor. Este guion la llamaba SIN eso. O sea
// que la app y el reporte, con los mismos datos del mismo día, decían cosas
// distintas: la app enseñaba «EUR/CAD COMPRA · EUR/NZD COMPRA · EUR/CHF
// COMPRA» y el reporte decía «sin setups limpios hoy».
//
// Y no era un detalle de presentación: yo leí el reporte, le dije a Néstor que
// los pares que destacaban eran para VENDER, y él abrió la app y vio COMPRA en
// todos. Las dos cosas eran ciertas de reglas distintas —la de la app vende lo
// débil, la reversión COMPRA lo débil— y nadie lo decía. Su reacción fue la
// correcta: «que tú digas una cosa y la app diga otra, eso no puede pasar».
//
// ⚠️ NO se mezclan con los setups de arriba, en su propio bloque y con su
// aviso. Son reglas OPUESTAS y promediarlas o listarlas juntas sería el peor
// error posible aquí — es la misma decisión que `unir()` toma en el Historial.
const bloqueReversion = (setupsReversion) => {
  // Sin reversiones no se escribe el bloque. Un marco vacío cada día enseña a
  // saltárselo, y el día que traiga algo ya nadie lo lee.
  if (!Array.isArray(setupsReversion) || !setupsReversion.length) return ''
  const filas = setupsReversion
    .map(
      (s) =>
        `• *${s.name} ${s.lado}* — entrada ${s.entrada.split(' · ')[0]}, SL ${s.sl.split(' (')[0]}, TP ${s.tp} (R/B ${s.rr})`,
    )
    .join('\n')
  return `\n*Regla en pruebas — reversión (esto es lo que ves en la app):*
${filas}

_⚠️ La reversión es un EXPERIMENTO y hace lo contrario que la app: compra la divisa débil. No son propuestas de la app, y su registro real todavía no alcanza para creerle (hacen falta 150 operaciones). Está aquí porque es lo que la app enseña, y el reporte tiene que decir lo mismo que la app._
`
}

function formatoChat({
  fecha,
  monedas,
  pares,
  compras,
  ventas,
  vigilancia,
  setups,
  setupsReversion,
  corte,
  difMax,
  umbral,
  bloqueados,
}) {
  const li = (xs) => (xs.length ? xs.map((x) => `• *${x.name}* — ${x.razon}`).join('\n') : '_Ninguno hoy._')
  const fuerza = monedas.map((m) => `${m.cod} ${m.score.toFixed(1)}`).join(' · ')
  const niveles = (s) =>
    `• *${s.name} ${s.lado}* — entrada ${s.entrada.split(' · ')[0]}, SL ${s.sl.split(' (')[0]}, TP ${s.tp} (R/B ${s.rr})`

  // ⚠️ LO QUE LAS DOS LÍNEAS DE ABAJO NECESITAN SABER, y que antes no sabían.
  //
  // Son las señales que la APP propone — `setups`, no las de la reversión, que
  // van en su propio bloque marcadas como experimento. Sin esto, la frase
  // «por eso no hay señales» se publicó el 2026-10-20 encima de dos setups
  // reales. Ver la cabecera de `lib/lineas-reporte.mjs`.
  const haySenales = setups.length > 0

  return `📊 *Nestor Forex Swing* — ${fecha}
${corte}

*Fuerza relativa:* ${fuerza}

*Mejores para comprar:*
${li(compras)}

*Mejores para vender:*
${li(ventas)}

*En vigilancia:*
${li(vigilancia)}

*Setups del top:*
${setups.length ? setups.map(niveles).join('\n') : '_Sin setups limpios hoy._'}${lineaUmbral({ difMax, umbral, haySenales })}${lineaBloqueados({ bloqueados, haySenales })}
${bloqueReversion(setupsReversion)}
_Riesgo: 1-2% del capital por operación. ${limitaciones}_`
}

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave())
const data = computarBarrido(fechas, rates, rangosPar)
// ⚠️ El umbral NO se escribe aquí: se deja el que trae `derivarVista`. Hasta
// el 2026-10-12 este guion pasaba su propio `0.5`, así que cambiar el de la app
// habría dejado el reporte midiendo con otro número sin que nada fallara.
// ⚠️⚠️ `incluirReversion: true` PORQUE LA APP LO PASA (`useMarketData.js`).
// Sin esta línea el reporte describe una app distinta de la que Néstor abre:
// el 2026-10-19 la app enseñaba tres compras de reversión y el reporte decía
// «sin setups limpios hoy», con los mismos datos. `prueba-umbral.mjs` lo
// vigila comparando las dos llamadas, para que no puedan volver a separarse.
const vista = derivarVista(data, { topN: 3, incluirReversion: true })
const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const texto = formatoChat({ fecha, ...vista })

// El log se mantiene tal cual: si un día falla el guardado en la rama `datos`,
// el reporte sigue estando en algún sitio. Los dos caminos son a propósito.
console.log('---REPORTE-INICIO---')
console.log(texto)
console.log('---REPORTE-FIN---')

// Solo cuando alguien pasa la rama `datos`. Sin eso el guion se comporta
// exactamente como antes, que es lo que hace falta para poder lanzarlo a mano
// sin montar nada.
const raizDatos = process.env.VIGIA_DATOS
if (raizDatos) {
  const destino = join(raizDatos, 'estado', 'reporte.json')
  mkdirSync(dirname(destino), { recursive: true })
  writeFileSync(
    destino,
    JSON.stringify(
      {
        app: APP,
        // La fecha tal como sale en el encabezado, para poder comprobar sin
        // volver a formatear nada.
        fecha,
        // ⚠️ Ver la cabecera. Esto es lo que delata un archivo viejo.
        generadoEl: new Date().toISOString(),
        // El corte de los datos (qué vela se usó), que NO es lo mismo que
        // cuándo se generó el reporte.
        corte: vista.corte,
        texto,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`Publicado en ${destino}`)
}
