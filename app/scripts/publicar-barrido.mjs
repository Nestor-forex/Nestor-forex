// Publica el barrido para que lo lea la app. NADA MÁS.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ ES UN GUION APARTE Y NO «QUE EL VIGÍA CORRA DOS VECES»
// ─────────────────────────────────────────────────────────────────────────
// Néstor pidió el 2026-10-07 que el barrido se refresque dos veces al día,
// porque por la mañana la app seguía enseñando la fecha de AYER: el vigía está
// programado a las 15:50 UTC y, con el retraso medido del reloj de GitHub,
// corre de verdad hacia las 20:30 UTC (15:30 en Colombia).
//
// La primera idea era correr el vigía dos veces. ⚠️ NO SE HACE, y el motivo no
// es de gusto: el vigía hace TRES cosas que no se pueden repetir en el día.
//
//   · anota las señales nuevas en `historial/senales.jsonl`,
//   · las juzga contra lo que hizo el precio,
//   · y manda los avisos al celular.
//
// Y la grave es la primera, por una razón propia de Swing: aquí una señal se
// identifica por `id@vistoEl`, con `vistoEl` a día. Dos corridas el mismo día
// con el precio movido entre medias anotarían una señal que la primera no
// había visto, y el historial pasaría a mezclar «lo que la app dijo a las 6 de
// la mañana» con «lo que dijo a las 3 de la tarde». Eso no es más historial:
// es un historial que ya no describe una cosa sola, y **las dos mitades del
// registro dejarían de ser comparables entre sí** — exactamente el sesgo que
// el 2026-10-06 se midió en Intradía por culpa del reloj.
//
// El historial es lo ÚNICO de este proyecto que no se puede volver a fabricar.
// Así que el vigía se queda EXACTAMENTE como está: una vez al día, con sus
// tres intentos y su `yaCorrioHoy`.
//
// Este guion solo baja las velas, calcula el barrido y lo escribe. No toca el
// historial, no manda avisos y no escribe `estado/vigia.json`. Si falla, no se
// pierde nada: la app sigue leyendo el archivo anterior —ahora con su «generado
// hace N h» en pantalla— y el vigía vuelve a publicarlo en su corrida.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ DOS VECES Y A ESTAS HORAS
// ─────────────────────────────────────────────────────────────────────────
// Lo pidió así Néstor. Las horas sí son una decisión, y van razonadas:
//
//   11:20 UTC = 6:20 am en Colombia — antes de su mañana de trading, que era
//               justo la queja: el barrido del día tiene que estar puesto
//               cuando él abre la app, no a media tarde.
//   19:20 UTC = 2:20 pm en Colombia — ya con Nueva York dentro, y después del
//               vigía, así que la tarde no se queda con el dato de la mañana.
//
// Cuestan 14 créditos cada una: 28 al día. Swing gastaba 36 de los 800 (14 el
// vigía + 7 el reporte + 15 el oro), así que pasa a **64 de 800**.
//
// ⚠️ UNA ENTRADA DE CRON POR HORA FIJA, no una horaria. Está medido sobre 22
// días hábiles (2026-10-06): una entrada que dispara una vez al día acierta el
// 95-100 %, y una que dispara cada hora, el 21 %. La forma del cron decide, no
// el workflow. Y además las dos horas están en la lista del reloj de fuera
// (`reloj-externo/worker.js`), que es lo único que llega puntual.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LA VELA DE HOY VA A MEDIAS, Y ESO AQUÍ SÍ ES UNA PREGUNTA
// ─────────────────────────────────────────────────────────────────────────
// En Intradía este guion publica velas de una hora YA CERRADAS, que no se
// mueven. Aquí cada vela es un DÍA, y el día de hoy está a medias: la vela
// diaria va de 22:00 a 22:00 UTC, así que a las 11:20 lleva 13 horas de 24.
//
// Una vela que contiene medio día de mercado trae menos recorrido, y de ahí
// sale el ATR, y del ATR el stop. Es la misma familia del problema de la
// rejilla sucia que se arregló el 2026-10-06, así que había que mirarlo antes
// de construir esto y no después.
//
// LO QUE DICE LA ARITMÉTICA, con números ya medidos en este repositorio: en el
// ATR de Wilder la vela más nueva pesa 1/14 = 7,1 %, y el cojín de ATR es el
// 16,6 % del stop (mediana de 46 señales reales). Una vela que trajera solo el
// 75 % de su recorrido movería el ATR un 1,8 % y el stop un 0,3 %. Es
// despreciable, y por eso esto se construye.
//
// ⚠️ LO QUE NO ESTÁ MEDIDO, y por eso no se afirma: cuánto recorrido trae de
// verdad la vela a las 11:20 UTC. Lo único medido es a las 17:42 UTC, con el
// barrido real de producción del 2026-10-06: el rango de la vela en curso era
// el **104,5 %** de la mediana de las otras 19, o sea ya una vela entera. Un
// día y una hora no son una medición.
//
// Por eso cada corrida IMPRIME ese cociente en su log (ver abajo). En unas
// semanas la pregunta se contesta con datos en vez de con este comentario, que
// es como se hace todo lo demás aquí.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { computarBarrido } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { escribir, yaCorrioEstaHora } from './lib/vigia-nucleo.mjs'
import { armarBarrido, anchoDeLaVelaEnCurso } from './lib/barrido-publicado.mjs'

const DATOS = process.env.VIGIA_DATOS || fileURLToPath(new URL('../../datos-local', import.meta.url))
const BARRIDO = `${DATOS}/estado/barrido.json`

const ahora = new Date()

// ⚠️ EL GUARDIÁN DE LA HORA, ANTES DE PEDIR PRECIOS — o sea antes de gastar un
// solo crédito. Hay DOS relojes pulsando este botón (los crones de GitHub y el
// reloj de fuera en Cloudflare), así que sin esto cada publicación costaría 14
// créditos dos veces. El porqué y la asimetría («ante la duda, publicar») están
// en `vigia-nucleo.mjs`.
const ultimoGeneradoEl = (() => {
  try {
    return JSON.parse(readFileSync(BARRIDO, 'utf8')).generadoEl
  } catch {
    return null // no hay barrido todavía, o está roto: se publica
  }
})()
if (process.env.SOLO_SI_FALTA_LA_HORA === '1' && yaCorrioEstaHora(ultimoGeneradoEl, ahora)) {
  console.log(`Esta hora ya se publicó (${ultimoGeneradoEl}). Este intento no hace nada.`)
  process.exit(0)
}

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave())
const data = computarBarrido(fechas, rates, rangosPar)
const barrido = armarBarrido(data, ahora)
const texto = JSON.stringify(barrido) + '\n'

escribir(BARRIDO, texto)

console.log(`Barrido publicado: ${ahora.toISOString()}`)
console.log(`Vela más reciente: ${data.ultima} UTC`)
console.log(`${barrido.pares.length} pares · ${(texto.length / 1024).toFixed(1)} KB`)

// La medición que contesta la pregunta abierta de la cabecera. No decide nada
// —no apaga ni cambia ninguna señal— y por eso va al final: es un apunte para
// leer dentro de unas semanas, no una alarma.
const ancho = anchoDeLaVelaEnCurso(barrido)
if (ancho === null) {
  console.log('Ancho de la vela en curso: no se pudo medir (el barrido no trae extremos).')
} else {
  console.log(
    `Ancho de la vela en curso: ${(100 * ancho).toFixed(0)} % de la mediana de las otras ` +
      `(100 % = una vela entera; por debajo, el día va a medias).`
  )
}
