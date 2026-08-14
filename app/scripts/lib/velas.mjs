// Descarga de velas DIARIAS desde Twelve Data, compartida por los scripts de
// Node (reporte diario, vigía y la comparación de fuentes).
//
// Se piden los 14 pares DIRECTAMENTE, no solo las 7 divisas contra el dólar.
// Es la diferencia importante con la app hermana de intradía, y la razón está
// medida: derivar un cruce como EUR/CHF a partir del euro y del franco contra
// el dólar obliga a combinar el máximo de uno con el mínimo del otro, o sea a
// dar por hecho que ambos extremos ocurrieron en el mismo instante. En velas
// de una hora ese error es pequeño; en velas de un DÍA entero se dispara —al
// medirlo daba ATR un 400% mayor del real en los cruces, que habría puesto
// stops disparatados—. Pidiéndolos directos, el máximo y el mínimo son los de
// verdad en los 14.
//
// Devuelve { fechas, rates, rangosPar }:
//   · rates[fecha][divisa]        → unidades de esa divisa por 1 USD (lo que
//                                    espera marketCalc para la fuerza relativa)
//   · rangosPar[fecha][par]       → { h, l } reales de ese par ese día

import { readFileSync } from 'node:fs'

// Los 14 que muestra la app, en el formato que usa Twelve Data.
export const PARES = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD',
  'EUR/CHF', 'EUR/CAD', 'EUR/NZD', 'GBP/CAD', 'GBP/JPY', 'NZD/CHF', 'NZD/CAD',
]

// De qué par sale la cotización de cada divisa contra el dólar, y si hay que
// darle la vuelta. `rates` guarda cuántas unidades de la divisa vale 1 USD:
// para USD/JPY eso es el precio tal cual; para EUR/USD es su inverso.
const DE_PAR = {
  EUR: { par: 'EUR/USD', invertir: true },
  GBP: { par: 'GBP/USD', invertir: true },
  JPY: { par: 'USD/JPY', invertir: false },
  CHF: { par: 'USD/CHF', invertir: false },
  CAD: { par: 'USD/CAD', invertir: false },
  AUD: { par: 'AUD/USD', invertir: true },
  NZD: { par: 'NZD/USD', invertir: true },
}

export function leerLlave(base = import.meta.url) {
  const env = readFileSync(new URL('../../.env.production', base), 'utf8')
  const m = env.match(/^VITE_TWELVEDATA_KEY=(.+)$/m)
  if (!m || !m[1].trim()) throw new Error('VITE_TWELVEDATA_KEY no está configurada en .env.production')
  return m[1].trim()
}

const esperar = (ms) => new Promise((res) => setTimeout(res, ms))

// El plan gratuito da 8 créditos por minuto y cada símbolo cuesta 1. Por eso
// los 14 pares van en dos tandas de 7 con una pausa en medio: pedirlos todos
// de golpe daría 429 siempre. El reintento queda igual por si algo más está
// consumiendo cuota en ese momento.
const POR_TANDA = 7
const PAUSA_MS = 65_000

async function pedir(url, reintentos = 2) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (r.status === 429 && reintentos > 0) {
    await esperar(PAUSA_MS)
    return pedir(url, reintentos - 1)
  }
  if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 429 ? ' (límite de consultas por minuto)' : ''))
  return r
}

async function bajarTanda(simbolos, apiKey, velas) {
  const r = await pedir(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(simbolos.join(','))}` +
      `&interval=1day&outputsize=${velas}&timezone=UTC&apikey=${apiKey}`
  )
  const j = await r.json()

  const salida = {}
  for (const sym of simbolos) {
    // Con un solo símbolo, Twelve Data responde el objeto pelado en vez de
    // envolverlo con el nombre del símbolo.
    const bloque = simbolos.length === 1 ? j : j[sym]
    if (!bloque || bloque.status === 'error' || !Array.isArray(bloque.values)) {
      throw new Error(`sin datos de ${sym}${bloque?.message ? ' — ' + bloque.message : ''}`)
    }
    const mapa = new Map()
    for (const v of bloque.values) {
      mapa.set(v.datetime, {
        c: parseFloat(v.close),
        h: parseFloat(v.high),
        l: parseFloat(v.low),
      })
    }
    salida[sym] = mapa
  }
  return salida
}

/**
 * @param velas cuántos DÍAS se piden. 300 es lo que usan el vigía y el reporte
 *              diario, y es lo que ve la app en producción (unos 14 meses de
 *              mercado). El banco de pruebas pide muchos más.
 *
 *              No cuesta un crédito extra: Twelve Data cobra por CONSULTA, no
 *              por vela, así que pedir 1500 días vale lo mismo que pedir 300.
 *              El tope de la API son 5000, que en velas diarias son casi 20
 *              años. (En la app hermana, con velas de una hora, esos mismos
 *              5000 son solo 7 meses — por eso allí hace falta pedir por
 *              tramos de fechas y aquí no.)
 */
export async function obtenerVelas(apiKey, { minBarras = 60, velas = 300 } = {}) {
  const porPar = {}
  for (let i = 0; i < PARES.length; i += POR_TANDA) {
    if (i > 0) await esperar(PAUSA_MS)
    Object.assign(porPar, await bajarTanda(PARES.slice(i, i + POR_TANDA), apiKey, velas))
  }

  // Solo los días que trajeron dato en LOS 14, para no dejar huecos si alguno
  // no cotizó por feriado local.
  const primero = porPar[PARES[0]]
  const fechas = [...primero.keys()].filter((d) => PARES.every((p) => porPar[p].has(d))).sort()
  if (fechas.length < minBarras) throw new Error('no hay suficientes días recientes para calcular los indicadores')

  const rates = {}
  const rangosPar = {}
  for (const d of fechas) {
    const fila = {}
    for (const [ccy, { par, invertir }] of Object.entries(DE_PAR)) {
      const v = porPar[par].get(d).c
      fila[ccy] = invertir ? 1 / v : v
    }
    rates[d] = fila

    const filaRangos = {}
    for (const p of PARES) {
      const v = porPar[p].get(d)
      // Si un día llegara sin máximo/mínimo, se usa el cierre para ese día en
      // vez de romper todo el barrido.
      filaRangos[p] = {
        h: Number.isFinite(v.h) ? v.h : v.c,
        l: Number.isFinite(v.l) ? v.l : v.c,
        c: v.c,
      }
    }
    rangosPar[d] = filaRangos
  }

  return { fechas, rates, rangosPar }
}
