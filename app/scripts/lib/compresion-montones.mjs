// PARTIR LAS SEÑALES EN COMPRIMIDAS Y EXPANDIDAS. Puro, sin red.
//
// Vive aquí y no dentro de `medir-compresion.mjs` por el mismo motivo que
// `medir()` salió de `backtest.mjs` el 2026-09-02: de esto sale el número con
// el que se decide, y mientras estuviera dentro del guion no se podía probar
// sin bajar miles de velas. La cuenta que más pesa no puede ser la única sin
// comprobar.

import { CORTE_COMPRIMIDO, CORTE_EXPANDIDO } from './preregistro-compresion.mjs'

/**
 * Reparte una lista de señales en tres montones por su compresión.
 *
 * ⚠️ CADA MONTÓN SE DEFINE POR LO QUE **ES**, nunca por descarte. Ese fallo ya
 * ha mordido siete veces en este proyecto (`esSombra`, `ventasPausadas`,
 * `esDeLaApp`, `filasOtras`, la regla de Firestore, la geometría de «comprar la
 * caída» y la etiqueta de las tarjetas de Bollinger): una condición escrita
 * como «todo lo que no sea X» se traga en silencio lo que venga después.
 *
 * ⚠️ Y LO QUE NO SE PUEDE MEDIR VA A `sinDato`, NUNCA A UN MONTÓN. Una señal
 * sin compresión metida en «comprimido» convertiría un hueco de datos en un
 * hecho sobre el mercado. Misma decisión que el cubo `sinDato` del carry.
 *
 * Entre los dos cortes hay una BANDA MUERTA a propósito: pegar los montones
 * por un borde común mete en «comprimido» señales que están a una milésima de
 * ser normales, y entonces la comparación no compara dos cosas distintas.
 */
export function repartirPorCompresion(senales, { comprimido = CORTE_COMPRIMIDO, expandido = CORTE_EXPANDIDO } = {}) {
  const cubos = { comprimido: [], expandido: [], medio: [], sinDato: [] }

  for (const s of senales || []) {
    const k = s?.compresion
    if (typeof k !== 'number' || !Number.isFinite(k)) {
      cubos.sinDato.push(s)
      continue
    }
    if (k < comprimido) cubos.comprimido.push(s)
    else if (k > expandido) cubos.expandido.push(s)
    else cubos.medio.push(s)
  }

  return cubos
}

/**
 * Parte una lista de señales en dos mitades por FECHA, no por posición.
 *
 * Por posición dos listas de distinto tamaño se partirían en fechas distintas
 * y las mitades dejarían de ser comparables entre sí — que es justo lo que el
 * criterio de las mitades existe para comprobar.
 *
 * @param corte fecha 'YYYY-MM-DD'; lo anterior va a la 1ª mitad
 */
export function partirPorFecha(senales, corte) {
  if (typeof corte !== 'string' || !corte) return null
  const a = []
  const b = []
  for (const s of senales || []) {
    const f = s?.vistoEl
    if (typeof f !== 'string') continue
    ;(f < corte ? a : b).push(s)
  }
  return [a, b]
}

/**
 * La fecha que parte el periodo en dos mitades con el mismo número de DÍAS.
 *
 * ⚠️ Se calcula una sola vez para TODOS los montones. Si cada montón eligiera
 * su propia fecha mediana, «la primera mitad» significaría un periodo distinto
 * en cada fila de la tabla y las columnas no se podrían comparar.
 */
export function fechaDeCorte(fechas) {
  if (!Array.isArray(fechas) || fechas.length < 2) return null
  const f = fechas.filter((x) => typeof x === 'string' && x)
  if (f.length < 2) return null
  return f[Math.floor(f.length / 2)]
}
