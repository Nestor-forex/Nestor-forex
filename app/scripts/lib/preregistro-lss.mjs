// EL PREREGISTRO DE «RUPTURA DE ESTRUCTURA SOLA».
//
// ═════════════════════════════════════════════════════════════════════════
// ESCRITO EL 2026-09-20, ANTES DE QUE SE ANOTARA NI UNA SOLA OPERACIÓN.
// ═════════════════════════════════════════════════════════════════════════
//
// ⚠️ SI ESTOS NÚMEROS SE TOCAN DESPUÉS DE VER UN RESULTADO, EL PREREGISTRO NO
// VALE NADA Y ES MEJOR BORRAR EL ARCHIVO QUE DEJARLO MINTIENDO. Mover el listón
// hasta que la regla lo pase no es medir: es decidir primero y buscar el número
// después.
//
// ─────────────────────────────────────────────────────────────────────────
// QUÉ REGLA ES, Y DE DÓNDE SALE
// ─────────────────────────────────────────────────────────────────────────
// Del indicador NFX-LSS que Néstor escribió para el concurso de TradingView,
// pero CON SUS TRES SEÑAS DE IDENTIDAD QUITADAS: sin exigir el barrido de
// liquidez, sin colchón de ATR en el stop, y con objetivo fijo a 1 vez el
// riesgo en vez de la salida por estructura. Lo que queda es una ruptura de
// estructura (BOS/CHoCH) a secas.
//
// Medido sobre 2021-07-14 a 2026-09-19, 14 pares, con el spread por par
// descontado: +0,02 por unidad de riesgo en 792 operaciones, contra −0,04 de
// la app. Es el único nivel de toda la prueba que superó a la app.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ POR QUÉ ESTE PREREGISTRO ES MÁS ESTRICTO QUE EL DE «COMPRAR LA CAÍDA»
// ─────────────────────────────────────────────────────────────────────────
// Aquél juzgaba sobre el HISTÓRICO, con el listón escrito antes de correrlo.
// Aquí eso no se puede, y hay que decir por qué:
//
//   El +0,02 es el número CON EL QUE SE ELIGIÓ LA REGLA. Salió de mirar una
//   tabla de veinte filas y quedarse con la que ganaba. Volver a medirlo sobre
//   esos mismos 1.436 días devuelve +0,02 por construcción — no es una segunda
//   muestra, es exactamente la misma.
//
// Néstor lo vio igual y lo dijo primero: «ese pozo ya se agotó». Así que este
// preregistro NO se juzga con el histórico. **Se juzga SOLO con el registro
// hacia adelante**, sobre días que nadie ha mirado.
//
// Y hay un dato EN CONTRA que tampoco se esconde: en el histórico la regla
// DECAE. +0,06 en la primera mitad del periodo y −0,02 en la segunda. Por el
// listón de esta casa —ganar en las dos mitades— hoy NO pasaría. Se persigue
// igual porque 792 operaciones y una ventaja sobre la app en las dos mitades
// es lo mejor que ha salido de todo el indicador, pero quien lea esto dentro
// de un año tiene que saber que arrancó cojeando.

export const PREREGISTRO = Object.freeze({
  fecha: '2026-09-20',
  regla: 'Ruptura de estructura (BOS/CHoCH) sola: sin exigir barrido de liquidez, sin colchón de ATR en el stop, objetivo fijo a 1 vez el riesgo.',
  // Los parámetros van en `lss-sombra.mjs` (`PARAMS`) y se fijan ahí. Aquí se
  // repite el que decide, para que cambiarlo a escondidas obligue a tocar dos
  // archivos y no uno.
  swingLen: 8,
  // ⚠️ SOLO SE JUZGA CON EL REGISTRO HACIA ADELANTE. Ver arriba.
  fuenteDelVeredicto: 'registro hacia adelante',
  // Lo que el histórico dijo, guardado para poder contrastarlo después. NO es
  // el veredicto: es la promesa que hay que comprobar.
  historico: Object.freeze({
    ops: 792,
    porRiesgo: 0.02,
    primeraMitad: 0.06,
    segundaMitad: -0.02,
    app: -0.04,
    senalesMes: 12,
  }),
})

// ─────────────────────────────────────────────────────────────────────────
// EL LISTÓN. TIENEN QUE PASAR **TODOS**.
// ─────────────────────────────────────────────────────────────────────────
//
// ⚠️ El mínimo de operaciones va PRIMERO y no es negociable. Con pocas
// operaciones cualquier porcentaje es ruido: el margen del peor caso es
// 98/√n, así que con 40 operaciones es ±15 puntos y con 150 es ±8. Este
// proyecto ya tiene el precedente escrito — el 89 % de Néstor sobre 9
// operaciones, que era compatible con no tener ninguna ventaja.
export const CRITERIOS = Object.freeze([
  Object.freeze({
    id: 'muestra',
    que: 'Al menos 150 operaciones REALES ya resueltas en el registro hacia adelante',
    // Con 150 el margen del peor caso es ±8 puntos. Por debajo de eso, un
    // resultado bueno y uno malo no se distinguen y mirar la tabla solo sirve
    // para engañarse.
    minimo: 150,
    juzga: (r) => (r.ops ?? 0) >= 150,
  }),
  Object.freeze({
    id: 'gana',
    que: 'Gana dinero con los costes descontados (por 1R > 0)',
    juzga: (r) => (r.porRiesgo ?? 0) > 0,
  }),
  Object.freeze({
    id: 'mitades',
    que: 'Gana en las DOS mitades del registro, no solo en el total',
    // Es el criterio que el histórico NO pasa (+0,06 y −0,02). Se mantiene a
    // propósito: si volviera a fallar aquí, sería la segunda vez que dice lo
    // mismo, y eso ya no es mala suerte.
    juzga: (r) => (r.primeraMitad ?? 0) > 0 && (r.segundaMitad ?? 0) > 0,
  }),
  Object.freeze({
    id: 'mejorQueLaApp',
    que: 'Supera a la app tal cual en el MISMO periodo del registro',
    // ⚠️ Contra la app medida sobre los mismos días, no contra el −0,04 del
    // histórico. Comparar con un número de otro periodo sería comparar con
    // dos mercados distintos.
    juzga: (r) => r.app !== null && r.app !== undefined && (r.porRiesgo ?? 0) > r.app,
  }),
  Object.freeze({
    id: 'aguantaSwap',
    que: 'Sigue ganando pagando 0,5 pips de swap por noche',
    // El swap típico de un par mayor está entre 0,2 y 1 pip por noche. Si la
    // ventaja no sobrevive a medio pip, no sobrevive a una cuenta real.
    juzga: (r) => (r.conSwap05 ?? -1) > 0,
  }),
  Object.freeze({
    id: 'noEsUnPar',
    que: 'Ningún par aporta más del 40 % de la ganancia',
    // Una regla que gana solo en un par no es una regla: es ese par.
    juzga: (r) => (r.mayorPar ?? 1) <= 0.4,
  }),
])

/**
 * El veredicto. Lo CALCULA esta función, no lo argumenta nadie.
 *
 * @param r resultado del registro hacia adelante:
 *   { ops, porRiesgo, primeraMitad, segundaMitad, app, conSwap05, mayorPar }
 * @returns { pasa, detalle: [{ id, que, pasa }] }
 */
export function juzgar(r) {
  const detalle = CRITERIOS.map((c) => ({
    id: c.id,
    que: c.que,
    // Un criterio que revienta cuenta como NO pasado. Ante la duda, no se
    // asciende nada: es la misma asimetría que `esSombra` y `yaCorrioHoy`.
    // Equivocarse hacia «no pasa» retrasa una decisión; hacia «pasa»
    // enciende una regla sin probar.
    pasa: (() => {
      try {
        return c.juzga(r ?? {}) === true
      } catch {
        return false
      }
    })(),
  }))
  return { pasa: detalle.every((d) => d.pasa), detalle }
}
