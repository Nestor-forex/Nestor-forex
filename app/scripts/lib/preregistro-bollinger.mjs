// EL LISTÓN DE LAS BANDAS DE BOLLINGER — escrito el 2026-10-13, ANTES de medir.
//
// ⚠️ ESTE ARCHIVO SE ESCRIBE Y SE COMMITEA ANTES DE CORRER LA MEDICIÓN. El
// historial de commits es lo que lo prueba. Si algún resultado queda a un
// pelo de un criterio, la respuesta NO es mover el criterio: es justo el
// momento para el que se escribió esto antes.

export const FECHA_DEL_LISTON = '2026-10-13'

// ─────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE LA PREGUNTA
// ─────────────────────────────────────────────────────────────────────────
//
// Coakley, Marzano y Nankervis (2016) midieron 113.148 reglas sobre 22
// divisas y concluyeron que «prácticamente ninguna regla tradicional es
// significativa» en 2006-2015 — pero separan dos familias que SÍ aguantan de
// forma robusta: **banda de Bollinger y RSI**.
//
// Aquí el RSI ya está dentro de la única regla que ha medido positivo (la
// reversión M2). Bollinger no se ha tocado nunca. Esta es esa mitad.

// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE SE DECIDE AQUÍ, Y ES LO QUE HACE QUE ESTO NO SEA A POSTERIORI
// ─────────────────────────────────────────────────────────────────────────
//
// Una banda de Bollinger se puede operar de las DOS maneras opuestas con el
// mismo disparo (ver `bollinger.mjs`). Medir las dos y quedarse con la que
// gane sería elegir después de ver la tabla — exactamente lo que se rechazó
// con el control de la confluencia (2026-09-04) y con el de «comprar la
// caída» (2026-09-04).
//
// Así que queda decidido ANTES:

/** La candidata. El precio sale por abajo de la banda → COMPRAR. */
export const LECTURA_CANDIDATA = 'reversion'

/** El control. El MISMO disparo, operado al revés. */
export const LECTURA_CONTROL = 'momento'

/**
 * ⚠️ Y CUÁL DE LAS VARIANTES ES LA QUE SE JUZGA, que es una segunda decisión
 * igual de peligrosa: se van a medir Bollinger solo, Bollinger + RSI y
 * Bollinger + fuerza. Si el veredicto se diera «a la que mejor salga», habría
 * tres intentos y se cogería el mejor — que es ajustar una curva con tres
 * puntos en vez de con diez, pero ajustar al fin.
 *
 * Se juzga **Bollinger + RSI estirado**, y el motivo va escrito:
 *   · es la combinación que la literatura empareja (Coakley et al. salvan las
 *     DOS familias, no una),
 *   · es la que pidió Néstor expresamente el 2026-10-13,
 *   · y es la forma de la única regla que ha sobrevivido aquí: de las cuatro
 *     variantes de reversión medidas el 2026-09-03, **la única que aguanta el
 *     swap es justo la que lleva el RSI** (1 pip contra 0 y 0,25 de las otras).
 *
 * Las otras dos se miden y se imprimen como INFORMACIÓN. Que una salga mejor
 * no la asciende: tendría su propio preregistro.
 */
export const VARIANTE_JUZGADA = 'con RSI estirado'

/** El umbral de RSI de la variante juzgada. El mismo 35 de la reversión M2. */
export const RSI_ESTIRADO = 35

// EL MOTIVO, que es lo que hay que poder leer dentro de seis meses:
//
//   1. Todo lo que ha medido positivo en este proyecto compra debilidad: la
//      reversión M2 (+0,085 con spread), «comprar la caída» (+0,041 con la
//      rejilla limpia), y el CONTROL de la confluencia (ir EN CONTRA de los
//      marcos largos, +0,01).
//   2. Todo lo que persigue fuerza ha perdido: la app tal cual (−0,04), y las
//      ocho familias de filtros, que son todas formas de confirmar un
//      movimiento antes de subirse a él.
//   3. La literatura que motiva esta medición trata Bollinger dentro de la
//      familia de reversión a la media.
//
// Si el CONTROL ganara y la candidata no, eso NO lo asciende a regla: sería
// una pista, y tendría que medirse con un preregistro propio. Es la misma
// regla que ya se aplicó dos veces.

// ─────────────────────────────────────────────────────────────────────────
// LOS CRITERIOS. Todos obligatorios.
// ─────────────────────────────────────────────────────────────────────────

/** Cuánto hay que ganar por unidad de riesgo, con costes y vara neutra 1:1. */
export const UMBRAL = 0.02

/** Señales al mes por debajo de las cuales la regla no sirve de producto. */
export const MIN_SENALES_MES = 8

/** Cuánto swap por noche tiene que aguantar y seguir ganando. */
export const SWAP_EXIGIDO = 0.5

/** Ningún par puede aportar más que esto del total de operaciones. */
export const MAX_POR_PAR = 0.4

/**
 * Cuánto tiene que GANARLE a la reversión M2.
 *
 * ⚠️ ESTE ES EL CRITERIO PROPIO DE ESTA MEDICIÓN, y sustituye al de «solapa
 * poco» que llevaban los preregistros anteriores. El motivo es que aquí la
 * pregunta es distinta.
 *
 * Bollinger-abajo y «RSI ≤ 35» son dos formas de decir «el precio se cayó
 * mucho», así que es de esperar que seleccionen señales parecidas. Con un
 * criterio de independencia, un solape alto tumbaría la regla sin contestar lo
 * que importa; y lo que importa es: **¿aporta algo sobre la regla que YA
 * tenemos?** Si no le gana a M2, no hay ningún motivo para cambiar, se parezca
 * mucho o poco.
 *
 * El solape se mide igual y se IMPRIME, como información: un solape alto dice
 * «esto es M2 con otro sombrero» y eso hay que poder leerlo. Pero no decide.
 *
 * 📌 Y va escrito que el 2026-09-07 le dije a Néstor que «comprar la caída»
 * solapaba un 3 % con la reversión y el número real era 18 %. Por eso el
 * solape se calcula y se enseña, en vez de recordarse.
 */
export const VENTAJA_SOBRE_M2 = 0.02

// ─────────────────────────────────────────────────────────────────────────
// EL VEREDICTO LO CALCULA ESTA FUNCIÓN. No lo argumenta nadie.
// ─────────────────────────────────────────────────────────────────────────

/** Mínimo de operaciones para que un grupo pueda juzgarse siquiera. */
export const MIN_OPS = 150

/**
 * @param d  { candidata, control, m2, candidataSwap, m2Swap, meses, porPar, solape }
 *           donde cada grupo es { ops, por1R, mitad1, mitad2 }.
 *
 * ⚠️ SE NIEGA A DAR VEREDICTO si falta un número o si un grupo no llega a
 * MIN_OPS, en vez de tratar lo que falta como un cero. Esto está aquí por un
 * fallo real: el 2026-10-12, en el preregistro de los modos de Intradía, un
 * `?? 0` hizo que «+0,000» le ganara a «−1,356» y el criterio más importante
 * PASARA sobre un grupo vacío. Un falso verde es peor que un rojo.
 */
export function juzgar(d) {
  const faltan = []
  const grupo = (nombre, g) => {
    if (!g || !Number.isFinite(g.por1R) || !Number.isFinite(g.mitad1) || !Number.isFinite(g.mitad2)) {
      faltan.push(`${nombre}: sin número que juzgar`)
      return false
    }
    if (!Number.isFinite(g.ops) || g.ops < MIN_OPS) {
      faltan.push(`${nombre}: ${g?.ops ?? 0} operaciones, hacen falta ${MIN_OPS}`)
      return false
    }
    return true
  }
  grupo('la candidata', d?.candidata)
  grupo('la reversión M2', d?.m2)
  if (!Number.isFinite(d?.candidataSwap?.por1R)) faltan.push('falta la fila del swap de la candidata')
  if (!Number.isFinite(d?.meses) || d.meses <= 0) faltan.push('falta el número de meses')
  if (!Number.isFinite(d?.porPar)) faltan.push('falta el reparto por par')

  if (faltan.length) {
    return {
      pasa: false,
      pasados: 0,
      noSePudoMedir: faltan.join(' · '),
      detalle: [],
    }
  }

  const c = d.candidata
  const detalle = [
    ['gana con costes', c.por1R >= UMBRAL, `${c.por1R.toFixed(3)} (hace falta ≥ ${UMBRAL})`],
    [
      'gana en las DOS mitades',
      c.mitad1 > 0 && c.mitad2 > 0,
      `1ª ${c.mitad1.toFixed(3)} · 2ª ${c.mitad2.toFixed(3)}`,
    ],
    [
      `aguanta ${SWAP_EXIGIDO} de swap`,
      d.candidataSwap.por1R > 0,
      `${d.candidataSwap.por1R.toFixed(3)} pagando ${SWAP_EXIGIDO} pips/noche`,
    ],
    [
      `al menos ${MIN_SENALES_MES} señales/mes`,
      c.ops / d.meses >= MIN_SENALES_MES,
      `${(c.ops / d.meses).toFixed(1)} al mes`,
    ],
    [
      `le gana a la reversión M2 por ≥ ${VENTAJA_SOBRE_M2}`,
      c.por1R - d.m2.por1R >= VENTAJA_SOBRE_M2 - 1e-9,
      `${(c.por1R - d.m2.por1R).toFixed(3)} de ventaja (M2 va a ${d.m2.por1R.toFixed(3)})`,
    ],
    [
      `ningún par aporta más del ${MAX_POR_PAR * 100} %`,
      d.porPar <= MAX_POR_PAR,
      `el mayor aporta el ${(d.porPar * 100).toFixed(0)} %`,
    ],
  ]

  const pasados = detalle.filter(([, ok]) => ok).length
  return { pasa: pasados === detalle.length, pasados, total: detalle.length, detalle }
}

// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LO QUE NO AUTORIZA NINGÚN RESULTADO
// ─────────────────────────────────────────────────────────────────────────

export const QUE_HACER = {
  pasa:
    'NO se enciende nada. Pasar el listón convierte esto en CANDIDATA a correr ' +
    'en la sombra, como la reversión y «comprar la caída» — o sea a anotarse ' +
    'hacia adelante sin proponerse a nadie. Encenderla de verdad pediría otra ' +
    'vez 150 operaciones REALES, porque estos 1.343 días ya se han mirado.',
  noPasa:
    'La regla se queda fuera y no se vuelve a medir sobre este mismo periodo. ' +
    'Volver a barrer parámetros sobre 2021-2026 devuelve el mismo número por ' +
    'construcción: esos días ya se usaron para elegir.',
  control:
    'Que el CONTROL gane NO lo asciende a regla. Se diseñó como control y se ' +
    'miraría después de ver la tabla, que es el troceo a posteriori que este ' +
    'proyecto rechazó con la confluencia y con el barrido de liquidez. Si se ' +
    'persigue, es con una medición propia diseñada de antemano.',
  siempre:
    'Nada de esto cambia una sola señal de la app. Swing sigue midiendo ' +
    '−0,03/−0,04 por unidad de riesgo hasta que algo pase su propio registro ' +
    'hacia adelante.',
}
