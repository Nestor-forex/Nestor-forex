// LA REJILLA LIMPIA DE SWING: quitar el sábado, fundir el domingo.
//
// Las cuentas puras, sin red. Convierte la rejilla que Twelve Data entrega
// —con velas «diarias» de fin de semana dentro— en la que tendría una app que
// solo contara días con mercado.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ ESTE ARREGLO Y NO OTRO — está MEDIDO, no elegido
// ─────────────────────────────────────────────────────────────────────────
// El diagnóstico del 2026-09-30 (`medir-rejilla-diaria.mjs`, 14 créditos)
// trajo las fechas y el reparto no dejó lugar a dudas, sobre 300 velas:
//
//     domingo    9 / 38        lunes   0 / 44  ← CERO
//     martes     2 / 44      miércoles 1 / 44
//     jueves     4 / 44       viernes  0 / 43  ← CERO
//     sábado    35 / 43       ← el 81 % de los sábados
//
// 44 de las 51 velas estrechas (86 %) caen en fin de semana y CERO en lunes y
// viernes. El mercado cierra el viernes a las 22:00 UTC y abre el domingo a
// las 22:00, así que:
//
//   · el SÁBADO no tiene mercado NINGUNO      → se QUITA
//   · el DOMINGO tiene ~2 horas (22:00-24:00) → se FUNDE con el lunes
//
// ⚠️ Los dos arreglos se nombraron en el preregistro ANTES de ver las fechas
// (`preregistro-rejilla-diaria.mjs`), con la regla escrita de cuál sería el
// fiel: «si es un día con algunas horas de mercado, FUNDIR; si es un día sin
// mercado ninguno, QUITAR». Lo que las fechas añadieron fue que hacían falta
// LOS DOS, uno por día — un mix que no era ninguna de las dos opciones
// sueltas. Eso queda dicho porque es una limitación de cómo escribí el
// listón, no un acierto.
//
// ✅ Y lo que salva la medición: los dos arreglos medían casi igual por
// separado (EUR/USD +23,5 % contra +24,9 %), así que la elección no puede
// cambiar el veredicto. Suerte, no diseño.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE ESTO NO ES
// ─────────────────────────────────────────────────────────────────────────
// NO es un filtro. Un filtro va ENCIMA de la entrada y decide si una señal
// pasa; esto cambia el DATO con el que se calcula la entrada, así que cambia
// EMA20, EMA50, EMA100, RSI, ATR, los soportes y las resistencias A LA VEZ.
//
// Consecuencia que hay que tener clarísima al leer cualquier tabla:
// **las señales NO son las mismas.** Salen en otras fechas, en otros pares y
// con otros niveles. La comparación no es «la app con mejores números» sino
// «la app contra OTRA app». Es la misma trampa que ya está escrita del filtro
// de RSI el 2026-08-25 («no quita señales: las cambia por otras»), pero más
// fuerte, porque aquí no cambia el filtro: cambia el suelo.
//
// Por eso el veredicto exige mejorar en las DOS mitades del periodo y no solo
// en el total: dos conjuntos de señales distintos pueden dar un total mejor
// por azar de reparto, pero no las dos mitades a la vez.

import { diaDe } from './rejilla-diaria.mjs'

// Los dos días de fin de semana, por su número en UTC.
export const SABADO = 6
export const DOMINGO = 0

/**
 * ⚠️ QUÉ SE HACE CON CADA DÍA, escrito una sola vez y en un sitio.
 *
 * `'quitar'` — el día desaparece de la serie.
 * `'fundir'` — el día se junta con el SIGUIENTE que se queda: máximo de los
 *              dos, mínimo de los dos, y el cierre del que se queda.
 * `null`     — el día se queda tal cual.
 *
 * Un día que no se entiende (`diaDe` devuelve `null`) **se QUEDA**. Es la
 * asimetría de siempre: quitar una vela de mercado por no entender su fecha
 * sería inventarse un hueco en el precio; dejar una de más solo mantiene lo
 * que la app ya usa hoy.
 */
export function queHacerCon(fecha) {
  const d = diaDe(fecha)
  if (d === SABADO) return 'quitar'
  if (d === DOMINGO) return 'fundir'
  return null
}

/**
 * ⚠️⚠️ LA FUNCIÓN QUE CONTESTA LA PREGUNTA: la rejilla de hoy → la limpia.
 *
 * Recibe y devuelve EXACTAMENTE la forma que `obtenerVelas` entrega y que
 * `computarBarrido` consume — `{ fechas, rates, rangosPar }` — para que
 * medir la app con la rejilla limpia sea pasarle otra rejilla y nada más. Sin
 * eso habría que tocar `marketCalc.js`, que es justo lo que este trabajo NO
 * puede hacer todavía.
 *
 * ⚠️ El DOMINGO se funde con el lunes en las DOS mitades del dato:
 *   · `rangosPar` (máximo y mínimo por par) → máximo de los dos, mínimo de los dos
 *   · `rates` (el cierre de cada divisa)    → el del LUNES, nunca el del domingo
 *
 * Fundirlo solo en los extremos y quedarse el cierre del domingo daría una
 * vela con máximo de lunes y cierre de domingo: una vela que no existió, y
 * encima creíble. Tiene comprobación propia.
 */
export function limpiar({ fechas, rates, rangosPar } = {}) {
  if (!Array.isArray(fechas)) return { fechas: [], rates: {}, rangosPar: undefined, quitadas: 0, fundidas: 0 }

  // 1. Qué hacer con cada fecha, y a QUIÉN se le funde cada domingo.
  //
  // ⚠️ Se busca el siguiente día que SE QUEDA, no «el de después». Dos velas
  // seguidas para fundir (un sábado que se quita en medio, o dos domingos
  // consecutivos si la fuente los repitiera) tienen que acabar las dos en la
  // misma vela buena, no una dentro de otra.
  const accion = fechas.map(queHacerCon)
  const seQueda = fechas.map((_, i) => accion[i] === null)

  const fundirEn = new Map() // índice que se queda → [índices que se le funden]
  const fuera = new Set()
  for (let i = 0; i < fechas.length; i++) {
    if (accion[i] === 'quitar') {
      fuera.add(i)
      continue
    }
    if (accion[i] !== 'fundir') continue
    let j = i + 1
    while (j < fechas.length && !seQueda[j]) j++
    if (j >= fechas.length) {
      // ⚠️ Un domingo al FINAL de la serie no tiene lunes con el que fundirse.
      // Se QUITA, y no es una excepción cómoda: es justo la vela con la que la
      // app calcularía hoy, así que dejarla sería dejar el problema entero.
      fuera.add(i)
      continue
    }
    fuera.add(i)
    fundirEn.set(j, [...(fundirEn.get(j) ?? []), i])
  }

  // 2. La serie nueva.
  const salida = { fechas: [], rates: {}, rangosPar: rangosPar ? {} : undefined }
  let fundidas = 0

  for (let i = 0; i < fechas.length; i++) {
    if (fuera.has(i)) continue
    const f = fechas[i]
    salida.fechas.push(f)

    // El cierre de cada divisa: SIEMPRE el del día que se queda.
    salida.rates[f] = rates?.[f]

    if (!rangosPar) continue
    const fundir = fundirEn.get(i) ?? []
    if (!fundir.length) {
      salida.rangosPar[f] = rangosPar[f]
      continue
    }
    fundidas += fundir.length

    // Máximo de los dos, mínimo de los dos, par por par.
    const base = rangosPar[f] ?? {}
    const nuevo = {}
    const pares = new Set(Object.keys(base))
    for (const j of fundir) for (const p of Object.keys(rangosPar[fechas[j]] ?? {})) pares.add(p)

    for (const p of pares) {
      const hs = [base[p]?.h, ...fundir.map((j) => rangosPar[fechas[j]]?.[p]?.h)].filter(Number.isFinite)
      const ls = [base[p]?.l, ...fundir.map((j) => rangosPar[fechas[j]]?.[p]?.l)].filter(Number.isFinite)
      if (!hs.length || !ls.length) continue
      nuevo[p] = { h: Math.max(...hs), l: Math.min(...ls) }
    }
    salida.rangosPar[f] = nuevo
  }

  return {
    ...salida,
    quitadas: fechas.length - salida.fechas.length,
    fundidas,
  }
}

/**
 * El reparto por día de la semana, para poder imprimir en el informe QUÉ se
 * quitó de verdad en vez de fiarse de que la función hace lo que dice.
 *
 * ⚠️ Esto no es adorno: si algún día `diaDe` cambiara de convenio (getDay en
 * vez de getUTCDay, por ejemplo), la limpieza seguiría corriendo sin error y
 * quitaría los días equivocados. El informe lo cantaría.
 */
export function reparto(fechas) {
  const cuenta = { quitar: {}, fundir: {}, queda: {} }
  for (const f of fechas ?? []) {
    const a = queHacerCon(f) ?? 'queda'
    const d = diaDe(f)
    const k = d == null ? 'sinFecha' : String(d)
    cuenta[a][k] = (cuenta[a][k] ?? 0) + 1
  }
  return cuenta
}
