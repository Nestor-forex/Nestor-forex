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
import { costeEnPips, SPREAD_PIPS } from './costes.mjs'

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
  {
    swingLen = 8,
    sweepWindow = 15,
    rr = 3,
    exigirSweep = true,
    calentamiento = 80,
    pares = PARES,
    // v1.1 — ver la cabecera de `src/lib/lss.js`. Por defecto en 0 para que
    // sin pedirlo el resultado sea idéntico al de antes.
    slBufferAtr = 0,
    atrLen = 14,
  } = {}
) {
  const fuera = []

  for (const par of pares) {
    const velas = velasDe(fechas, rangosPar, par)
    const [b, q] = par.split('/')
    // Los pares con yen cotizan con dos decimales; el resto, con cuatro. Es la
    // misma cuenta que hace `marketCalc`, y de ella sale el tamaño del pip.
    const dec = b === 'JPY' || q === 'JPY' ? 2 : 4
    const pip = dec === 2 ? 0.01 : 0.0001

    for (const s of senalesLSS(velas, { swingLen, sweepWindow, rr, exigirSweep, slBufferAtr, atrLen })) {
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
        // v1.1: si hubo barrido reciente (el «⚡» del Pine). Con el modo
        // informativo salen TODAS las señales y esto permite separarlas
        // después sin volver a correr el generador.
        huboSweep: s.huboSweep,
        // v1.1: el día en que el mercado rompe estructura EN CONTRA, que es la
        // salida alternativa al objetivo fijo. `null` si no llegó a romper
        // dentro de la serie — y eso NO es «no se cerró»: es que no se sabe.
        salida: s.iSalida >= 0 ? fechas[s.iSalida] : null,
      })
    }
  }

  // En orden de fecha, como las de la app: el resolver y el corte en dos
  // mitades cuentan con ello.
  return fuera.sort((a, b2) => (a.vistoEl < b2.vistoEl ? -1 : a.vistoEl > b2.vistoEl ? 1 : 0))
}

// ═══════════════════════════════════════════════════════════════════════════
// LA SALIDA POR ESTRUCTURA CONTRARIA (v1.1)
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠️⚠️ POR QUÉ ESTO NO PUEDE USAR `resolver` NI `medir`, Y QUÉ SIGNIFICA ESO
//
// Todo el banco de pruebas asume una operación con DOS finales posibles: toca
// el stop (pierde exactamente 1 riesgo) o toca el objetivo (gana exactamente
// `rr` riesgos). Sobre eso están construidos `resolver`, `medir` y la columna
// de «hace falta para empatar».
//
// Una salida por estructura no tiene ese segundo final: se sale AL CIERRE de
// la vela que rompe en contra, a un precio que no se sabía de antemano. Puede
// salir con +0,4 riesgos, con +2,7 o con −0,3 sin haber tocado el stop.
//
// Por eso hay que medirla aparte, y por eso HAY QUE DECIRLO AL LEER LA TABLA:
//
//   · «por 1R» SÍ se puede comparar con el resto del banco. Es la misma
//     pregunta —cuánto se gana por cada unidad de riesgo— y aquí se calcula
//     operación por operación con los MISMOS costes por par.
//   · «acierto» significa otra cosa: aquí es «salió en positivo», no «tocó el
//     objetivo». Sigue siendo informativo pero no es el mismo número.
//   · «hace falta para empatar» NO EXISTE. Esa cuenta necesita una proporción
//     objetivo/riesgo fija, y aquí cada operación tiene la suya. Ponerle un
//     número sería inventarlo.
//
// 📌 Escrito ANTES de ver ningún resultado, a propósito: si la tabla sale
// buena, la tentación de comparar su «acierto» con el de las otras filas va a
// ser grande, y sería comparar con dos varas — el error que este proyecto ya
// pagó el 2026-08-25.

/**
 * Mide las señales del NFX-LSS saliendo por ruptura de estructura contraria.
 *
 * Reglas, todas iguales a las del resolver de siempre para que sea comparable:
 *   · se empieza a mirar en la vela SIGUIENTE a la señal (la entrada es a su
 *     cierre, así que ese día ya pasó);
 *   · el stop se comprueba PRIMERO dentro de cada vela: si el mismo día cabe
 *     el stop y la salida, manda el peor caso;
 *   · una señal cuya salida no llegó a ocurrir dentro de la serie queda SIN
 *     JUZGAR, nunca contada como ganada.
 */
export function medirEstructura(
  senales,
  fechas,
  rangosPar,
  { conSpread = false, swapPipsNoche = 0, tablaSpread = SPREAD_PIPS } = {}
) {
  const posicion = new Map(fechas.map((f, i) => [f, i]))

  let ganadas = 0
  let perdidas = 0
  let sinJuzgar = 0
  let sumaR = 0
  let pips = 0
  let sumaDias = 0

  for (const s of senales) {
    const iEntrada = posicion.get(s.cierre)
    const iSalida = s.salida === null || s.salida === undefined ? undefined : posicion.get(s.salida)
    // Sin salida conocida no se juzga. ⚠️ Contarla como ganada porque «no
    // llegó al stop» sería exactamente el autoengaño que este banco evita:
    // las que siguen abiertas al final de la serie no son victorias.
    if (iEntrada === undefined || iSalida === undefined) {
      sinJuzgar++
      continue
    }

    const compra = s.lado === 'COMPRA'
    const pip = s.par.includes('JPY') ? 0.01 : 0.0001
    const riesgo = Math.abs(s.precio - s.sl)

    let rBruto = null
    let iFin = null
    for (let i = iEntrada + 1; i <= iSalida; i++) {
      const v = rangosPar[fechas[i]][s.par]
      // El stop, primero y siempre.
      if (compra ? v.l <= s.sl : v.h >= s.sl) {
        rBruto = -1
        iFin = i
        break
      }
      if (i === iSalida) {
        // Se sale al cierre de la vela que rompe en contra.
        rBruto = (compra ? v.c - s.precio : s.precio - v.c) / riesgo
        iFin = i
        break
      }
    }

    if (rBruto === null) {
      sinJuzgar++
      continue
    }

    const dias = iFin - iEntrada
    sumaDias += dias
    const costePips = conSpread ? costeEnPips(s.par, dias, swapPipsNoche, tablaSpread) : 0
    sumaR += rBruto - costePips / s.pipRiesgo
    pips += rBruto * riesgo / pip - costePips
    // «Ganada» aquí es «salió en positivo ANTES de costes», para que el
    // porcentaje no cambie de significado al mover el swap. Que el número sea
    // distinto del «acierto» de las demás filas está dicho arriba.
    if (rBruto > 0) ganadas++
    else perdidas++
  }

  const total = ganadas + perdidas
  return {
    total,
    ganadas,
    sinJuzgar,
    pips: Math.round(pips),
    acierto: total ? (ganadas / total) * 100 : null,
    porRiesgo: total ? sumaR / total : null,
    diasMedios: total ? sumaDias / total : null,
    // A propósito NO se devuelve `equilibrio`: ver la nota de arriba.
  }
}
