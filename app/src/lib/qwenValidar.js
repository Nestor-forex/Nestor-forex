// COMPROBAR LO QUE CONTESTA QWEN — sin React ni red (2026-11-14).
//
// Lo usan la sonda (`scripts/sonda-qwen.mjs`) y, más adelante, la app antes de
// enseñar una respuesta. Vive en `src/lib` para que las dos lo importen del
// mismo sitio: si la sonda midiera con una regla y la app enseñara con otra, el
// número de la sonda no describiría lo que ve el suscriptor.
//
// ⚠️ Cada comprobación devuelve CÓDIGOS, no frases: los traduce quien pinta.
//
// ⚠️ LO QUE MÁS IMPORTA DE AQUÍ: que Qwen no cambie los números de la app. Lo
// decidió Néstor el 2026-11-14 («Qwen no cambia ningún dato de las apps»), y
// es lo único que no se puede ver leyendo la respuesta por encima: un Stop-loss
// con un dígito cambiado se lee igual de convincente que el bueno.

import { tamanoPip } from './analizador.js'

export const VEREDICTOS = Object.freeze(['APROBADO', 'APROBADO CON AJUSTES', 'RECHAZADO'])
export const SI_NO_DUDOSO = Object.freeze(['si', 'no', 'dudoso'])
export const FLUJOS = Object.freeze(['confirma', 'contradice', 'neutral', 'sin dato'])
export const TRAMPAS = Object.freeze(['si', 'no', 'sin dato'])

export const MAX_PALABRAS_EXPLICA = 140

// Las palabras que dicen hacia dónde va el precio. Es la misma regla de
// «¿Qué significa?» (`prueba-explicacion.mjs`): alto o bajo, nunca compra o
// venta. Se comprueba sobre el texto SIN el aviso final, que nombra «comprar o
// vender» justo para negarlo.
// ⚠️ Sin `\b` detrás de «subirá»: la «á» no cuenta como letra para `\b` y la
// frontera nunca se cumpliría. La prueba lo comprueba con «subirá» y «bajarán».
export const DIRECCION = /\bcompr|\bvend|alcista|bajista|fortalec|debilit|subir[áa]|bajar[áa]|se aprecia|se deprecia|apreciar[áa]|depreciar[áa]/i

const num = (x) => typeof x === 'number' && Number.isFinite(x)

/**
 * Saca el objeto JSON de una respuesta. `envoltorio` dice si venía dentro de
 * ``` o con texto alrededor: se puede leer, pero no cumple «SOLO JSON», y la
 * sonda lo cuenta aparte.
 */
export function leerJson(texto) {
  if (typeof texto !== 'string') return { obj: null, envoltorio: false }
  const limpio = texto.trim()
  try {
    const obj = JSON.parse(limpio)
    return { obj: obj && typeof obj === 'object' ? obj : null, envoltorio: false }
  } catch {
    // sigue abajo
  }
  const ini = limpio.indexOf('{')
  const fin = limpio.lastIndexOf('}')
  if (ini < 0 || fin <= ini) return { obj: null, envoltorio: true }
  try {
    const obj = JSON.parse(limpio.slice(ini, fin + 1))
    return { obj: obj && typeof obj === 'object' ? obj : null, envoltorio: true }
  } catch {
    return { obj: null, envoltorio: true }
  }
}

function contarPalabras(s) {
  return String(s).trim().split(/\s+/).filter(Boolean).length
}

/**
 * Una explicación: corta, sin dirección, terminada con el aviso, y con los
 * números del dato tal cual si los había.
 *
 * @param texto  lo que contestó Qwen
 * @param datos  lo que se le mandó (para comprobar previsto y anterior)
 * @param aviso  la frase final exacta
 */
export function validarExplica(texto, datos, aviso) {
  const fallos = []
  const t = typeof texto === 'string' ? texto.trim() : ''
  if (!t) return { ok: false, fallos: ['vacio'] }
  const sinComillas = t.replace(/["'«»”“\s]+$/u, '')
  const avisoLimpio = String(aviso ?? '').trim().replace(/[.\s]+$/, '')
  const termina = avisoLimpio && sinComillas.replace(/[.\s]+$/, '').endsWith(avisoLimpio)
  if (!termina) fallos.push('sinAviso')
  const cuerpo = avisoLimpio ? t.split(avisoLimpio).join(' ') : t
  if (DIRECCION.test(cuerpo)) fallos.push('direccion')
  if (contarPalabras(cuerpo) > MAX_PALABRAS_EXPLICA) fallos.push('largo')
  if (/^#|\*\*|^\s*[-*]\s/m.test(t)) fallos.push('formato')
  for (const k of ['previsto', 'anterior']) {
    const v = datos?.[k]
    if (typeof v === 'string' && v.trim() && !t.includes(v.trim())) fallos.push(`cambia_${k}`)
  }
  return { ok: fallos.length === 0, fallos }
}

/**
 * La auditoría del Prompt 4. Lo que se compara con la app:
 *   - entrada, Stop-loss y Take-profit: a medio pip;
 *   - el lote: igual a dos decimales;
 *   - el R/B del primer objetivo: con un 5 % de holgura (es un cociente y se
 *     redondea distinto según quién lo escriba).
 *
 * @param obj       el JSON que devolvió Qwen (ya leído)
 * @param analisis  el que se le mandó: el de `analisisParaQwen`, ya redondeado
 */
export function validarAudita(obj, analisis) {
  const fallos = []
  if (!obj) return { ok: false, fallos: ['sinJson'] }
  if (!VEREDICTOS.includes(obj.veredicto)) fallos.push('veredicto')
  if (!SI_NO_DUDOSO.includes(obj.stop_logico)) fallos.push('stop_logico')
  if (!SI_NO_DUDOSO.includes(obj.tp_realista)) fallos.push('tp_realista')
  if (typeof obj.cumple_perfil !== 'boolean') fallos.push('cumple_perfil')
  if (typeof obj.justificacion !== 'string' || !obj.justificacion.trim()) fallos.push('justificacion')

  const n = analisis?.niveles
  const dec = analisis?.dec
  if (n && num(dec)) {
    const medioPip = tamanoPip(dec) / 2
    const u = obj.numeros_usados ?? {}
    const cerca = (a, b) => num(a) && num(b) && Math.abs(a - b) <= medioPip + 1e-12
    if (!cerca(u.entrada, analisis.precio)) fallos.push('cambia_entrada')
    if (!cerca(u.sl, n.sl)) fallos.push('cambia_sl')
    if (!cerca(u.tp1, n.tp)) fallos.push('cambia_tp')
    if (!(num(obj.rr_tp1) && Math.abs(obj.rr_tp1 - n.rr) <= 0.05 * n.rr + 0.01)) fallos.push('cambia_rr')
  }
  const lote = analisis?.lote?.lote
  if (num(lote) && !(num(obj.lote) && Math.abs(obj.lote - lote) < 0.005 + 1e-9)) fallos.push('cambia_lote')
  return { ok: fallos.length === 0, fallos }
}

const r = (x, n) => (num(x) ? Number(x.toFixed(n)) : x)

/**
 * El análisis de la app con los números como se ven EN PANTALLA: precios con
 * los decimales del par, pips sin decimales, R/B y lote con dos.
 *
 * ⚠️ Se le manda ESTO a Qwen, no el objeto crudo. El crudo trae un Stop-loss de
 * 1.098682569512187: Qwen lo redondearía a su manera, y entonces «no cambies
 * los números» dejaría de poder comprobarse — no se sabría si cambió un número
 * o solo lo redondeó. Y la persona compara lo que dice Qwen con lo que ve en
 * pantalla, así que tiene que ser el mismo número.
 */
export function analisisParaQwen(a) {
  if (!a || typeof a !== 'object') return a
  const d = num(a.dec) ? a.dec : 4
  const n = a.niveles
  const h = a.herramientas ?? {}
  const hh = { ...h }
  if (h.niveles) hh.niveles = { sop: r(h.niveles.sop, d), res: r(h.niveles.res, d) }
  if (h.pivote && typeof h.pivote === 'object') hh.pivote = Object.fromEntries(Object.entries(h.pivote).map(([k, v]) => [k, r(v, d)]))
  if (h.tendencia) hh.tendencia = { ...h.tendencia, corta: r(h.tendencia.corta, d), larga: r(h.tendencia.larga, d) }
  if (h.rsi) hh.rsi = { v: r(h.rsi.v, 1) }
  if (h.atr) hh.atr = { abs: r(h.atr.abs, d + 1), pct: r(h.atr.pct, 2), pips: r(h.atr.pips, 0) }
  if (h.fuerza) hh.fuerza = { ...h.fuerza, vb: r(h.fuerza.vb, 1), vq: r(h.fuerza.vq, 1) }
  if (h.compresion) hh.compresion = { ...h.compresion, v: r(h.compresion.v, 2) }
  if (h.bollinger) hh.bollinger = { pctB: r(h.bollinger.pctB, 2) }
  return {
    ...a,
    precio: r(a.precio, d),
    niveles: n ? { sl: r(n.sl, d), tp: r(n.tp, d), pipRiesgo: r(n.pipRiesgo, 0), pipBeneficio: r(n.pipBeneficio, 0), rr: r(n.rr, 2) } : n,
    lote: a.lote ? { lote: r(a.lote.lote, 2), riesgoUsd: r(a.lote.riesgoUsd, 2), valorPip: r(a.lote.valorPip, 2) } : a.lote,
    herramientas: hh,
  }
}

/**
 * El Prompt 3. Se le dice que el posicionamiento minorista NO está; lo que se
 * comprueba es que no se lo invente.
 */
export function validarSentimiento(obj) {
  const fallos = []
  if (!obj) return { ok: false, fallos: ['sinJson'] }
  if (!(Number.isInteger(obj.conviccion) && obj.conviccion >= 1 && obj.conviccion <= 10)) fallos.push('conviccion')
  if (!FLUJOS.includes(obj.flujo_institucional)) fallos.push('flujo')
  if (!TRAMPAS.includes(obj.trampa_minorista)) fallos.push('trampa')
  // Si dice «sí, hay trampa minorista» sin tener el dato, se lo inventó.
  if (obj.trampa_minorista === 'si') fallos.push('inventaMinorista')
  if (!(Array.isArray(obj.datos_que_faltan) && obj.datos_que_faltan.length > 0)) fallos.push('noDiceQueFalta')
  if (typeof obj.justificacion !== 'string' || !obj.justificacion.trim()) fallos.push('justificacion')
  return { ok: fallos.length === 0, fallos }
}

/**
 * Lo que costó una consulta, en dólares, con los precios por millón de tokens.
 * Los tokens repetidos (caché) se cobran a su precio y no al normal.
 */
export function costeDe(uso, precio) {
  if (!uso || !precio) return null
  const entrada = num(uso.prompt_tokens) ? uso.prompt_tokens : 0
  const salida = num(uso.completion_tokens) ? uso.completion_tokens : 0
  const cache = num(uso.prompt_tokens_details?.cached_tokens) ? uso.prompt_tokens_details.cached_tokens : 0
  const normal = Math.max(0, entrada - cache)
  return (normal * precio.entrada + cache * precio.cache + salida * precio.salida) / 1e6
}
