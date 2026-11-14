// EL LISTÓN DEL FVG (BRECHA DE VALOR JUSTO) — escrito el 2026-11-15, ANTES de medir.
//
// ⚠️ ESTE ARCHIVO SE ESCRIBE Y SE COMMITEA ANTES DE CORRER LA MEDICIÓN. El
// historial de commits es lo que lo prueba. Si algún resultado queda a un pelo
// de un criterio, la respuesta NO es mover el criterio: es justo el momento
// para el que se escribió esto antes.

export const FECHA_DEL_LISTON = '2026-11-15'

// ─────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE LA PREGUNTA
// ─────────────────────────────────────────────────────────────────────────
//
// Néstor preguntó por IPDA y FVG (2026-11-15). De todo ICT, el FVG es la única
// pieza calculable con máximo y mínimo que NUNCA se había medido aquí. La otra
// pieza calculable —el barrido de liquidez— se midió el 2026-09-04 y PERDIÓ en
// los cinco tamaños, en las dos apps, y en el NFX-LSS marcaba las señales PEORES.

// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE SE DECIDE AQUÍ, Y ES LO QUE HACE QUE ESTO NO SEA A POSTERIORI
// ─────────────────────────────────────────────────────────────────────────

/** La candidata: el primer regreso a un hueco alcista → COMPRAR (la lectura de ICT). */
export const LECTURA_CANDIDATA = 'continuacion'

/** El control: el MISMO disparo, operado al revés. */
export const LECTURA_CONTROL = 'contra'

/**
 * La variante que se JUZGA: la definición pura, sin tamaño mínimo, con huecos
 * de las últimas 20 velas.
 *
 * El motivo: es el FVG tal como se enseña. Un tamaño mínimo o una ventana
 * distinta son ajustes, y elegir el ajuste que mejor salga sería curva. Las
 * otras dos variantes (tamaño ≥ 0,25 ATR · ventana de 10) se miden y se
 * IMPRIMEN como información; que una salga mejor no la asciende.
 */
export const VARIANTE_JUZGADA = 'pura (ventana 20, sin tamaño mínimo)'
export const PARAMS_JUZGADA = Object.freeze({ ventana: 20, minATR: 0 })

// EL PRIOR, escrito antes y EN CONTRA, para que nadie se sorprenda:
//
//   1. La lectura de ICT es de CONTINUACIÓN: entrar a favor del movimiento que
//      dejó el hueco. Todo lo que persigue el movimiento ha perdido en Swing —
//      la app (−0,04), las diez familias de filtros, el control de la
//      confluencia salió MEJOR yendo en contra—. Lo único positivo de este
//      proyecto compra debilidad.
//   2. La otra pieza medible de ICT (el barrido de liquidez) perdió.
//   3. Hsu, Taylor y Wang (2016) y Coakley et al. (2016): en divisas
//      desarrolladas casi ninguna regla técnica sobrevive desde los noventa.
//
// Lo más probable es que NO pase. Si el CONTROL ganara, eso NO lo asciende: es
// la misma regla que ya se aplicó con la confluencia y con el barrido.

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

/** Mínimo de operaciones para que un grupo pueda juzgarse siquiera. */
export const MIN_OPS = 150

/**
 * ⚠️ EL CRITERIO PROPIO: el CONTROL tiene que salir PEOR que la candidata.
 *
 * Si el mismo disparo operado al revés mide igual o mejor, la candidata no está
 * leyendo nada del hueco: está recogiendo lo que el mercado dio ese periodo a
 * cualquier operación abierta esos días.
 */
export const EXIGE_CONTROL_PEOR = true

// ─────────────────────────────────────────────────────────────────────────
// EL VEREDICTO LO CALCULA ESTA FUNCIÓN. No lo argumenta nadie.
// ─────────────────────────────────────────────────────────────────────────

/**
 * @param d  { candidata, control, candidataSwap, meses, porPar }
 *           donde cada grupo es { ops, por1R, mitad1, mitad2 }.
 *
 * ⚠️ SE NIEGA A DAR VEREDICTO si falta un número o si un grupo no llega a
 * MIN_OPS, en vez de tratar lo que falta como un cero. Un `?? 0` ya hizo PASAR
 * un criterio sobre un grupo vacío el 2026-10-12. Un falso verde es peor que
 * un rojo.
 */
export function juzgar(d) {
  const faltan = []
  const grupo = (nombre, g) => {
    if (!g || !Number.isFinite(g.por1R) || !Number.isFinite(g.mitad1) || !Number.isFinite(g.mitad2)) {
      faltan.push(`${nombre}: sin número que juzgar`)
      return
    }
    if (!Number.isFinite(g.ops) || g.ops < MIN_OPS) {
      faltan.push(`${nombre}: ${g?.ops ?? 0} operaciones, hacen falta ${MIN_OPS}`)
    }
  }
  grupo('la candidata', d?.candidata)
  grupo('el control', d?.control)
  if (!Number.isFinite(d?.candidataSwap?.por1R)) faltan.push('falta la fila del swap de la candidata')
  if (!Number.isFinite(d?.meses) || d.meses <= 0) faltan.push('falta el número de meses')
  if (!Number.isFinite(d?.porPar)) faltan.push('falta el reparto por par')

  if (faltan.length) return { pasa: false, pasados: 0, noSePudoMedir: faltan.join(' · '), detalle: [] }

  const c = d.candidata
  const detalle = [
    ['gana con costes', c.por1R >= UMBRAL - 1e-9, `${c.por1R.toFixed(3)} (hace falta ≥ ${UMBRAL})`],
    ['gana en las DOS mitades', c.mitad1 > 0 && c.mitad2 > 0, `1ª ${c.mitad1.toFixed(3)} · 2ª ${c.mitad2.toFixed(3)}`],
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
      'el CONTROL sale peor',
      d.control.por1R < c.por1R,
      `control ${d.control.por1R.toFixed(3)} contra ${c.por1R.toFixed(3)}`,
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
    'en la sombra —anotarse hacia adelante sin proponerse a nadie—, y la ' +
    'decisión es de Néstor. Encenderla de verdad pediría 150 operaciones ' +
    'REALES, porque estos días ya se han mirado.',
  noPasa:
    'La regla se queda fuera y no se vuelve a medir sobre este mismo periodo: ' +
    'barrer ventanas o tamaños sobre estos días devuelve el mismo número por ' +
    'construcción. El FVG se sigue ENSEÑANDO en el Analizador como información ' +
    '(dónde están los huecos), nunca como señal.',
  control:
    'Que el CONTROL gane NO lo asciende a regla: se miraría después de ver la ' +
    'tabla, que es el troceo a posteriori que este proyecto rechazó con la ' +
    'confluencia y con el barrido de liquidez.',
  siempre:
    'Nada de esto cambia una sola señal de la app. Swing sigue en ' +
    '−0,03/−0,04 por unidad de riesgo hasta que algo pase su propio registro ' +
    'hacia adelante.',
}
