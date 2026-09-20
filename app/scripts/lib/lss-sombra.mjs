// LA RUPTURA DE ESTRUCTURA SOLA, EN LA SOMBRA.
//
// Convierte las señales del NFX-LSS al formato de setup que usa el vigía, para
// que se anoten en el historial como la reversión y «comprar la caída».
//
// ═════════════════════════════════════════════════════════════════════════
// ⚠️ QUÉ REGLA ES ÉSTA EXACTAMENTE, Y POR QUÉ NO ES «EL NFX-LSS»
// ═════════════════════════════════════════════════════════════════════════
//
// Es el indicador de Néstor CON SUS TRES SEÑAS DE IDENTIDAD QUITADAS:
//
//   · sin exigir el barrido de liquidez (`exigirSweep: false`);
//   · sin colchón de ATR en el stop (`slBufferAtr: 0`);
//   · con objetivo fijo a 1 vez el riesgo, no la salida por estructura.
//
// O sea: una ruptura de estructura a secas. Lo que queda no es el NFX-LSS, y
// llamarlo así en el historial sería una etiqueta equivocada — que en este
// proyecto está escrito que es un error de medición.
//
// Se llama `lss` en el historial igual porque de ahí viene y porque el nombre
// tiene que ser estable para siempre, pero quien lea esto tiene que saber qué
// hay debajo.
//
// ─────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE, Y POR QUÉ NO SE ENCIENDE
// ─────────────────────────────────────────────────────────────────────────
// Sobre 2021-07-14 a 2026-09-19, 14 pares y con el spread descontado, midió
// +0,02 por unidad de riesgo en 792 operaciones, contra −0,04 de la app. Es el
// único nivel de toda la prueba que superó a la app.
//
// ⚠️ Y AUN ASÍ NO BASTA, por dos razones que hay que tener juntas:
//
//   1. Ese +0,02 es el número CON EL QUE SE ELIGIÓ la regla. Salió de mirar una
//      tabla y quedarse con la fila que ganaba. Volver a correrlo sobre los
//      mismos días devuelve lo mismo por construcción: no es una segunda
//      muestra, es la misma.
//   2. Decae: +0,06 en la primera mitad del periodo y −0,02 en la segunda. Por
//      el listón de esta casa —ganar en las DOS mitades— hoy no pasa.
//
// Por eso lo único que se hace es ANOTARLA hacia adelante, sobre días que
// nadie ha mirado todavía. El listón está en `preregistro-lss.mjs`, escrito
// antes de que se anotara ni una sola operación.
//
// ⚠️ NO SE ENSEÑA EN NINGUNA PANTALLA, tampoco «solo para mirar». Lo pidió
// Néstor expresamente el 2026-09-19 y es lo correcto: su estado real es «en
// observación», y una regla sin validar puesta en una pantalla se lee como
// validada por el solo hecho de estar ahí.
//
// Sí sale en el LOG del vigía, junto a las otras dos de sombra. Eso no es
// contradictorio: es la lección del 2026-09-07 —un experimento que nadie puede
// ver se pasa meses anotándose sin que nadie lo note— resuelta por el lado que
// no engaña a ningún usuario.

import { senalesLSS } from '../../src/lib/lss.js'
// ⚠️ Las velas se leen POR EL MISMO SITIO que el banco de pruebas, a
// propósito. Si la sombra las armara por su cuenta, lo que se anota y lo que
// se midió podrían separarse sin que nada falle, y el registro dejaría de
// hablar de la regla que se preregistró.
import { velasDe } from './lss-banco.mjs'

// ⚠️ LOS PARÁMETROS QUE SE PREREGISTRAN. No se tocan sin invalidar el registro.
//
// `swingLen: 8` es el valor que Néstor propuso y el ÚNICO con el que se midió
// la versión sin barrido. Los vecinos (5, 6, 10, 12) se midieron CON barrido, y
// sus números no valen aquí. Elegir ahora el que mejor salió de aquella tabla
// sería el mismo troceo a posteriori con otro disfraz.
export const PARAMS = Object.freeze({
  swingLen: 8,
  rr: 1,
  exigirSweep: false,
  slBufferAtr: 0,
  // Solo decide si la señal lleva la etiqueta `huboSweep`. Con `exigirSweep`
  // apagado NO cambia ni una señal, y hay una comprobación que lo exige.
  sweepWindow: 15,
})

/**
 * Las señales de ruptura de estructura de HOY, en formato de setup del vigía.
 *
 * @param fechas    los días del barrido, en orden
 * @param rangosPar rangosPar[fecha][par] = { h, l, c } — máximo, mínimo y
 *                  cierre REALES de ese par ese día. En Swing son exactos en
 *                  los 14 pares porque se piden todos directos.
 * @param pares     los pares del barrido, con `name` y `dec`
 *
 * ⚠️ REVIENTA SI LE FALTAN LOS DATOS en vez de devolver cero señales, igual
 * que `setupsCaida`. Una lista vacía se lee como «hoy no hubo señales» y es
 * indistinguible de «llevo ocho meses sin anotar nada» — y el historial es lo
 * único de este proyecto que no se puede recuperar.
 */
export function setupsLSS(fechas, rangosPar, pares) {
  if (!Array.isArray(fechas) || fechas.length === 0) {
    throw new Error('setupsLSS necesita las fechas del barrido y no recibió ninguna.')
  }
  if (!Array.isArray(pares) || pares.length === 0) {
    throw new Error('setupsLSS necesita los pares del barrido y no recibió ninguno.')
  }
  const primera = rangosPar?.[fechas[0]]
  if (!primera || typeof primera !== 'object') {
    throw new Error(
      'setupsLSS necesita `rangosPar` con los máximos, mínimos y cierres de cada día. ' +
        '¿Viene de `barrido.json`? Ahí no están: esta regla solo se puede calcular donde se calculó el barrido.'
    )
  }

  const fuera = []

  for (const p of pares) {
    if (primera[p.name] === undefined) {
      throw new Error(`setupsLSS: no hay velas de ${p.name} en \`rangosPar\`.`)
    }
    const velas = velasDe(fechas, rangosPar, p.name)
    const senales = senalesLSS(velas, PARAMS)
    if (senales.length === 0) continue

    // ⚠️ SOLO LA DE LA ÚLTIMA VELA. El vigía pregunta «¿qué señala HOY?», no
    // «¿qué señaló alguna vez?». Sin esto se anotarían de golpe cinco años de
    // señales viejas como si fueran de hoy, y el historial —que vale
    // precisamente porque registra lo que la app dijo ESE día— quedaría
    // envenenado sin dar ningún error.
    const ultima = senales[senales.length - 1]
    if (ultima.i !== velas.length - 1) continue

    const pip = p.dec === 2 ? 0.01 : 0.0001
    const pipRiesgo = Math.abs(ultima.entrada - ultima.sl) / pip
    // Un riesgo que redondea a cero pip no es una operación: sería dividir
    // entre cero al medirla. Se descarta en vez de inventarle tamaño.
    if (!(pipRiesgo >= 1)) continue

    fuera.push({
      name: p.name,
      lado: ultima.lado,
      tipo: 'lss',
      crudo: {
        precio: ultima.entrada,
        sl: ultima.sl,
        tp: ultima.tp,
        rr: Math.abs(ultima.tp - ultima.entrada) / Math.abs(ultima.entrada - ultima.sl),
        pipRiesgo,
        pipBeneficio: Math.abs(ultima.tp - ultima.entrada) / pip,
        dec: p.dec,
        // ⚠️ Esta regla NO mira el RSI, ni el ATR, ni la tendencia de las
        // medias. Van en null a propósito: rellenarlos con los de la app
        // dejaría en el historial unos números que esta regla no usó para
        // nada, y alguien los leería algún día como si fueran parte de ella.
        rsi: null,
        atrPct: null,
        tend: null,
        // Informativo, no decide nada: si hubo barrido reciente antes de la
        // ruptura. Se guarda porque es justo lo que midió PEOR en el histórico
        // (−0,08 con barrido contra +0,05 sin él), y tener el dato anotado
        // desde el primer día permite volver a mirarlo con datos limpios.
        huboSweep: ultima.huboSweep,
        evento: ultima.evento,
      },
    })
  }

  return fuera
}
