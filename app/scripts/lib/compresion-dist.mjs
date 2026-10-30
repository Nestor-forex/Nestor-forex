// LA DISTRIBUCIÓN DE LA COMPRESIÓN EN SWING: la parte que se puede comprobar
// sin red.
//
// ⚠️⚠️ POR QUÉ ESTO NO ES LO MISMO QUE YA MEDÍA `medir-compresion.mjs`
//
// Ese guion parte las SEÑALES en montones y pregunta si unas miden distinto de
// otras. Con eso se fijaron los cortes de la etiqueta el 2026-10-30
// (p10 0,87 · p25 0,92 · p90 1,17) — y una señal es una SELECCIÓN: exige
// divergencia de fuerza, tendencia y los 5 mejores por lado.
//
// Pero la tarjeta no pone etiqueta a las señales: la pone a LOS 14 PARES, en
// TODAS las lecturas. Así que la distribución que describe lo que se VE es la
// de un par y una vela, no la de las señales. Era la única pregunta que quedó
// escrita como «trabajo aparte» al medir la app hermana, y es lo que esto
// contesta.
//
// 📌 Que las dos distribuciones coincidan o no es EL resultado. Si salen
// iguales, los cortes de hoy valen y queda comprobado. Si salen distintas, los
// cortes están descritos por una población que no es la que la pantalla
// enseña — que es la familia de fallo de siempre: un número bien calculado
// describiendo otra cosa de la que dice describir.
//
// ⚠️ PRIMO, no gemelo. El de la app hermana lee `{ barras, rates, rangos }` y
// deriva los cruces desde las divisas; aquí el lector devuelve
// `{ fechas, rates, rangosPar }` y los 14 pares vienen DIRECTOS, indexados por
// nombre de par. Copiar el de allá leería nombres que aquí no existen — es
// exactamente el fallo que allí costó 7 créditos en producción.
//
// ⚠️ NINGÚN UMBRAL VIVE AQUÍ. Se pasan. Un cociente de 0,90 no significa lo
// mismo en velas de un día que en velas de una hora.

import {
  PAIRS,
  CCY,
  VELAS_ATRAS_COMPRESION,
  atrWilder,
} from '../../src/lib/marketCalc.js'
import { compresionDe } from '../../src/lib/compresion.js'

/**
 * Cuántas velas tiene de verdad el barrido que corre en producción.
 *
 * ⚠️ Esto NO se escribe a mano. `obtenerVelas` pide 300 velas de CALENDARIO y
 * después quita las de fin de semana, así que el barrido real trae unos 214
 * días de mercado — y ese número cambia solo con el calendario. Escribir 214
 * aquí sería un número que envejece sin que nada falle.
 *
 * Se cuenta cuántas de las fechas caen dentro de los últimos `diasCalendario`
 * días, que es literalmente lo que el lector entrega.
 */
export function ventanaDeProduccion(fechas, diasCalendario = 300) {
  if (!Array.isArray(fechas) || !fechas.length) return 0
  const fin = Date.parse(fechas.at(-1) + 'T00:00:00Z')
  if (!Number.isFinite(fin)) return 0
  const desde = fin - (diasCalendario - 1) * 86400000
  return fechas.filter((d) => {
    const t = Date.parse(d + 'T00:00:00Z')
    return Number.isFinite(t) && t >= desde
  }).length
}

/**
 * La compresión de un par en la vela `i`, con la MISMA ventana que el barrido
 * de producción.
 *
 * ⚠️⚠️ AQUÍ LA VENTANA IMPORTA, al revés que en la app hermana. Allí
 * `atrWilder` tiene una ventana DURA de 60 velas, así que darle la serie
 * entera o las últimas 300 devuelve el mismo número. **Aquí `atrWilder`
 * recorre todo lo que recibe**, así que la serie entera y las últimas 214
 * NO dan lo mismo. Se usa el tramo que la app tiene de verdad.
 */
export function compresionEn(highs, lows, closes, i, ventana) {
  const d = Math.max(0, i - ventana + 1)
  const h = highs.slice(d, i + 1)
  const l = lows.slice(d, i + 1)
  const c = closes.slice(d, i + 1)
  if (c.length <= VELAS_ATRAS_COMPRESION + 2) return null
  const atrAhora = atrWilder(h, l, c)
  const atrAntes = atrWilder(
    h.slice(0, -VELAS_ATRAS_COMPRESION),
    l.slice(0, -VELAS_ATRAS_COMPRESION),
    c.slice(0, -VELAS_ATRAS_COMPRESION),
  )
  // ⚠️ Sin el `?? 1` de la app, y a propósito: aquí se quiere la DISTRIBUCIÓN
  // de lo que se puede calcular de verdad. Meter unos a mano crearía un pico
  // falso justo en el valor que más decide.
  return compresionDe(atrAhora, atrAntes)
}

/**
 * La distribución entera: un par, una vela.
 *
 * ⚠️ Recibe el objeto TAL CUAL lo devuelve `obtenerVelas` de ESTA app:
 * `{ fechas, rates, rangosPar }`, con `rangosPar[fecha]['EUR/USD'] = {h, l}`.
 * Ver la cabecera para saber por qué eso está escrito aquí en vez de darse
 * por sabido.
 */
export function distribucionDeCompresion({ fechas, rates, rangosPar }, { ventana } = {}) {
  if (!Array.isArray(fechas) || !fechas.length) {
    throw new Error(
      'distribucionDeCompresion: falta `fechas`. ¿Se le pasó el objeto de la app hermana ' +
        '(`barras`/`rangos`) en vez del de ésta (`fechas`/`rangosPar`)?',
    )
  }
  const v = Number.isFinite(ventana) && ventana > 0 ? ventana : ventanaDeProduccion(fechas)
  const L = fechas.length - 1

  const serie = {}
  for (const c of CCY) serie[c] = fechas.map((d) => (c === 'USD' ? 1 : rates[d][c]))

  const porPar = new Map()
  const todas = []
  let posibles = 0

  for (const [b, q] of PAIRS) {
    const nombre = `${b}/${q}`
    // ⚠️ El precio del par es `q / b`, no al revés. Es la misma línea que
    // `computarBarrido` (`px = serie[q][i] / serie[b][i]`), y ya salió al
    // revés una vez en un banco de pruebas.
    const closes = fechas.map((_, i) => serie[q][i] / serie[b][i])
    const highs = fechas.map((d, i) => rangosPar?.[d]?.[nombre]?.h ?? closes[i])
    const lows = fechas.map((d, i) => rangosPar?.[d]?.[nombre]?.l ?? closes[i])

    const vals = []
    for (let i = v - 1; i <= L; i++) {
      posibles++
      const x = compresionEn(highs, lows, closes, i, v)
      if (Number.isFinite(x)) vals.push(x)
    }
    porPar.set(nombre, vals)
    todas.push(...vals)
  }

  return { porPar, todas, posibles, ventana: v }
}

/**
 * Percentiles. Devuelve `null` —y nunca ceros— con la lista vacía: un cero
 * diría «la compresión es cero», que es una afirmación sobre el mercado.
 */
export function percentiles(xs) {
  const v = (xs ?? []).filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return null
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))]
  return {
    n: v.length,
    min: q(0),
    p10: q(0.1),
    p25: q(0.25),
    p50: q(0.5),
    p75: q(0.75),
    p90: q(0.9),
    max: q(1),
  }
}

/** Qué fracción de las observaciones cae por debajo de un umbral, en %. */
export function fraccionBajo(xs, umbral) {
  const v = (xs ?? []).filter(Number.isFinite)
  if (!v.length || !Number.isFinite(umbral)) return null
  return (v.filter((x) => x < umbral).length / v.length) * 100
}

/**
 * Cómo reparte las cuatro etiquetas de la tarjeta una distribución dada, en %.
 *
 * ⚠️ Esto es lo que de verdad decide si los cortes están en su sitio. Una
 * etiqueta que sale en uno de cada tres pares no es «rara», y una que no sale
 * nunca es decorativa — los dos defectos ya han pasado, uno en cada app.
 */
export function repartoDeEtiquetas(xs, { muy, algo, ancho }) {
  const v = (xs ?? []).filter(Number.isFinite)
  if (!v.length) return null
  const pct = (n) => (n / v.length) * 100
  return {
    n: v.length,
    muy: pct(v.filter((x) => x < muy).length),
    algo: pct(v.filter((x) => x >= muy && x < algo).length),
    normal: pct(v.filter((x) => x >= algo && x <= ancho).length),
    ancho: pct(v.filter((x) => x > ancho).length),
  }
}
