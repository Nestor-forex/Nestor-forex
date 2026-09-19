// El NFX-LSS, en el formato que el banco de pruebas sabe medir.
//
// `src/lib/lss.js` solo sabe de velas: le das una serie y te dice en qué barra
// habría señal y con qué niveles. Esto lo traduce a la forma de señal que usan
// `resolver` y `medir`, que es la única manera de que su número salga con la
// MISMA vara que todo lo demás de este proyecto — mismos spreads por par,
// mismo barrido de swap, mismo corte en dos mitades.
//
// ⚠️ NO decide nada ni filtra nada. Solo convierte.

import { PARES } from './velas.mjs'
import { senalesLSS } from '../../src/lib/lss.js'

/**
 * Las velas de un par, en orden, listas para `senalesLSS`.
 *
 * `rangosPar[fecha][par]` trae `{ h, l, c }` — el máximo, el mínimo y el
 * cierre REALES de ese par ese día, porque en swing los 14 pares se piden
 * directos. Eso importa aquí más que en ninguna otra regla: el barrido se
 * define por la MECHA, y una mecha derivada de otros dos pares saldría más
 * ancha de lo real y fabricaría barridos que nunca ocurrieron.
 */
export function velasDe(fechas, rangosPar, par) {
  return fechas.map((f) => rangosPar[f][par])
}

/**
 * Señales NFX-LSS de todos los pares, en formato de banco de pruebas.
 *
 * @param calentamiento  barras iniciales que NO producen señal. Existe para
 *                       que la comparación con la app sea justa: la app
 *                       necesita 80 días para calcular sus medias, y si el LSS
 *                       empezara a señalar en la barra 10 estaría midiendo un
 *                       tramo de mercado que la otra no vio.
 */
export function senalesLSSBanco(
  fechas,
  rangosPar,
  { swingLen = 8, sweepWindow = 15, rr = 3, exigirSweep = true, calentamiento = 80, pares = PARES } = {}
) {
  const fuera = []

  for (const par of pares) {
    const velas = velasDe(fechas, rangosPar, par)
    const [b, q] = par.split('/')
    // Los pares con yen cotizan con dos decimales; el resto, con cuatro. Es la
    // misma cuenta que hace `marketCalc`, y de ella sale el tamaño del pip.
    const dec = b === 'JPY' || q === 'JPY' ? 2 : 4
    const pip = dec === 2 ? 0.01 : 0.0001

    for (const s of senalesLSS(velas, { swingLen, sweepWindow, rr, exigirSweep })) {
      if (s.i < calentamiento) continue

      const pipRiesgo = Math.round(Math.abs(s.entrada - s.sl) / pip)
      // Un riesgo que redondea a cero pip no es una operación: sería dividir
      // entre cero al calcular el resultado en veces el riesgo. Pasa en pares
      // con mechas minúsculas y se descarta en vez de inventarle tamaño.
      if (pipRiesgo < 1) continue

      fuera.push({
        // ⚠️ El identificador lleva el TIPO dentro. Sin eso, una señal del LSS
        // y una de la app en el mismo par, lado y día tendrían la misma clave
        // y el resolver se comería una de las dos.
        id: `${par}|${s.lado}|lss`,
        vistoEl: fechas[s.i],
        cierre: fechas[s.i],
        par,
        lado: s.lado,
        ladoOriginal: s.lado,
        base: b,
        cotizada: q,
        tipo: 'lss',
        // El evento de estructura, para poder separar BOS de CHoCH al medir.
        // La guía de Néstor dice que un CHoCH «es más significativo»; esto es
        // lo que permite comprobar si eso es verdad o solo se repite.
        evento: s.evento,
        precio: s.entrada,
        sl: s.sl,
        tp: s.tp,
        rr: Math.abs(s.tp - s.entrada) / Math.abs(s.entrada - s.sl),
        pipRiesgo,
        pipBeneficio: Math.round(Math.abs(s.tp - s.entrada) / pip),
        // Cuántas velas pasaron entre el barrido y la ruptura. Sirve para ver
        // si las señales buenas son las que rompen rápido.
        velasTrasBarrido: s.iSweep >= 0 ? s.i - s.iSweep : null,
      })
    }
  }

  // En orden de fecha, como las de la app: el resolver y el corte en dos
  // mitades cuentan con ello.
  return fuera.sort((a, b2) => (a.vistoEl < b2.vistoEl ? -1 : a.vistoEl > b2.vistoEl ? 1 : 0))
}
