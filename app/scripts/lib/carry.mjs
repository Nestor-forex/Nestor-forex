// ¿Las señales que van A FAVOR del diferencial de tasas miden distinto de las
// que van EN CONTRA?
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ ESTO EXISTE
// ─────────────────────────────────────────────────────────────────────────
// `estado/tasas.json` publica las ocho tasas de referencia desde el
// 2026-09-09, y el banco de pruebas NUNCA ha mirado si la dirección del
// diferencial separa a las ganadoras de las perdedoras. El swap entra siempre
// como COSTE —barrido a cinco niveles— y nunca como información sobre el lado.
//
// Néstor lo pidió de frente el 2026-10-13, y es de las pocas preguntas de este
// proyecto que NO cuesta ni una fuente nueva: las tasas se bajan del BIS, que
// es gratis y sin llave.
//
// ⚠️⚠️ ESTO ES UN DIAGNÓSTICO, NO UNA REGLA NI UN FILTRO.
//
// Parte en dos las señales que la app (o la reversión) ya produce y compara
// los dos montones. Si saliera que las de un lado miden mejor, eso NO
// autoriza encender nada: sería un FILTRO, y los filtros van al banco de
// pruebas con su listón escrito antes — van ocho familias medidas y ocho
// fallando. Aquí solo se contesta si hay algo que mirar.
//
// ⚠️ Y LA ADVERTENCIA DE SIEMPRE, escrita en `sonda-tasas.mjs` desde antes de
// ver ningún dato: **la diferencia de tasas NO es el swap.** El banco central
// pone la referencia; el bróker le suma un margen que no publica nadie y que
// además es asimétrico. Esto da el SIGNO, no el número.

import { UMBRAL_NEUTRO } from '../../src/lib/tasas.js'

export { UMBRAL_NEUTRO }

/**
 * Días de margen antes de dar una tasa por conocida.
 *
 * ⚠️ NO es el retraso de publicación del BIS (7-12 días, medido el
 * 2026-09-29). Una tasa de referencia la anuncia el banco central EL MISMO
 * DÍA que la decide, así que el número es público al instante aunque el BIS
 * tarde en republicarlo. El retraso del BIS es de la fuente, no del hecho.
 *
 * Aun así se deja un margen de dos días, y el motivo es que equivocarse hacia
 * los dos lados no cuesta lo mismo:
 *   · usar una tasa UN DÍA ANTES de que exista sería mirar el futuro, que es
 *     lo único que convierte una medición en un cuento;
 *   · usarla dos días tarde no cambia nada, porque estas tasas se mueven una
 *     vez cada varias semanas.
 * Con esa asimetría, el margen va al lado barato.
 */
export const DIAS_MARGEN = 2

const restarDias = (fecha, n) => {
  const d = new Date(`${fecha}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/**
 * La tasa VIGENTE en una fecha: el último valor con fecha ≤ (fecha − margen).
 *
 * @returns null —NUNCA 0— si no se sabe. Un 0 diría «esa divisa paga cero»,
 *          que es una afirmación sobre un banco central. Misma decisión que
 *          `pearson`, `edadEnMinutos` y `difMax`.
 */
export function tasaEn(serie, fecha, { diasMargen = DIAS_MARGEN } = {}) {
  if (!Array.isArray(serie) || !serie.length) return null
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const tope = restarDias(fecha, diasMargen)
  if (!tope) return null

  // La serie viene de más vieja a más nueva (lo garantiza `leerSerieCSV`), así
  // que se recorre hacia atrás y se para en la primera que ya existía.
  for (let i = serie.length - 1; i >= 0; i--) {
    const r = serie[i]
    if (typeof r?.f === 'string' && r.f <= tope && Number.isFinite(r?.v)) return r.v
  }
  // La señal es anterior a todo lo que tenemos. No se inventa.
  return null
}

/**
 * El diferencial de un par en una fecha: tasa(base) − tasa(cotizada).
 *
 * Positivo = la divisa de delante paga más, o sea que COMPRAR el par cobra
 * carry y venderlo lo paga.
 *
 * @returns null si falta cualquiera de las dos. **No se rellena con cero la
 *          que falte**: media resta no es una resta.
 */
export function difDeTasas(par, fecha, series, monedasDe) {
  // ⚠️ `monedasDe` devuelve un ARRAY ['EUR','USD'], no un objeto. La primera
  // versión leía `.base` y `.cotizada`, que no existen: habría devuelto `null`
  // en TODAS las señales y el informe habría dicho «no hay tasas para ninguna»
  // sin que fallara nada. Se vio abriendo `pairs.js`, no deduciéndolo.
  if (typeof par !== 'string' || typeof monedasDe !== 'function') return null
  const [base, cotizada] = monedasDe(par) || []
  if (!base || !cotizada) return null
  const a = tasaEn(series?.[base], fecha)
  const b = tasaEn(series?.[cotizada], fecha)
  if (a === null || b === null) return null
  return a - b
}

/**
 * ¿La señal va a favor del carry, en contra, o es indiferente?
 *
 * ⚠️ LA BANDA NEUTRA NO ES UN ADORNO. Se reutiliza `UMBRAL_NEUTRO` (0,25) de
 * `tasas.js`, donde ya está justificado: el margen del bróker está
 * típicamente entre 0,5 y 1,5 puntos anuales, así que una diferencia de dos
 * décimas se la come entera y el signo deja de significar nada. Meter esas
 * señales en uno de los dos montones sería repartirlas por ruido.
 *
 * @returns 'aFavor' | 'enContra' | 'neutro' | null (no se sabe)
 */
export function clasificarCarry(senal, series, monedasDe, { umbral = UMBRAL_NEUTRO } = {}) {
  if (!senal?.par || !senal?.lado || !senal?.vistoEl) return null
  const dif = difDeTasas(senal.par, senal.vistoEl, series, monedasDe)
  if (dif === null) return null
  if (Math.abs(dif) < umbral) return 'neutro'
  // Comprar el par = quedarse largo de la base. El carry juega a favor si la
  // base paga más.
  const favoreceComprar = dif > 0
  return (senal.lado === 'COMPRA') === favoreceComprar ? 'aFavor' : 'enContra'
}

/**
 * Reparte una lista de señales en los tres montones.
 *
 * ⚠️ Las que no se pueden clasificar van a `sinDato` y **se cuentan aparte**,
 * nunca dentro de «en contra». Si se mezclaran, un periodo sin tasas
 * publicadas se leería como un periodo con el carry en contra — un dato
 * correcto describiendo otra cosa, que es el error que este proyecto lleva
 * meses coleccionando.
 */
export function repartir(senales, series, monedasDe, opciones = {}) {
  const cubos = { aFavor: [], enContra: [], neutro: [], sinDato: [] }
  for (const s of senales || []) {
    const c = clasificarCarry(s, series, monedasDe, opciones)
    cubos[c === null ? 'sinDato' : c].push(s)
  }
  return cubos
}
