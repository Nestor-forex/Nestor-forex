// EL LISTÓN DE LA COMPRESIÓN, ESCRITO ANTES DE MEDIR
//
// Fecha de escritura: 2026-10-27. La medición no se había corrido ni una vez
// cuando esto quedó en el repositorio, y el historial de commits lo demuestra.
//
// ─────────────────────────────────────────────────────────────────────────
// LA PREGUNTA, EXACTA
// ─────────────────────────────────────────────────────────────────────────
// ¿Las señales que la app YA produce miden distinto cuando el par viene
// COMPRIMIDO (su movimiento se ha estrechado) que cuando viene EXPANDIDO?
//
// ⚠️ **ES UN DIAGNÓSTICO, NO UN FILTRO.** Parte en montones las señales que
// existen y compara. No apaga ni una, no las reordena y no las puntúa. Es
// exactamente la forma del chequeo del carry (2026-10-13).
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LA HIPÓTESIS, Y SU MECANISMO, ESCRITOS ANTES DE VER UN NÚMERO
// ─────────────────────────────────────────────────────────────────────────
// Predicción: **el montón COMPRIMIDO mide PEOR.**
//
// Y el mecanismo propuesto NO es que la compresión sepa hacia dónde va el
// precio. Es aritmético y se puede escribir entero:
//
//   el stop sale del ATR  →  ATR bajo = stop estrecho  →  el spread, que es
//   fijo en pips, pesa MÁS sobre un stop más corto
//
// Está medido en este proyecto y con números: en Swing el stop típico es de
// ~155 pips y 2 de spread pesan el 1,3 %; en Intradía el stop es de ~30 y los
// mismos 2 pips pesan el 7 %. **El mismo bróker y el mismo spread, cuatro
// veces más peso.** Un par comprimido es, dentro de una misma app, el mismo
// efecto en pequeño.
//
// ⚠️ POR ESO EL CRITERIO QUE DECIDE QUÉ SIGNIFICA EL RESULTADO ES LA COLUMNA
// **SIN COSTES**:
//
//   · si la diferencia DESAPARECE sin costes  →  era el peaje. Eso NO dice
//     nada sobre la dirección, y lo único que autoriza es una ADVERTENCIA en
//     pantalla sobre el stop (información), nunca un filtro.
//   · si la diferencia SIGUE sin costes  →  entonces la compresión está
//     diciendo algo sobre el resultado que no es el peaje, y ESO sí sería un
//     candidato a filtro — con su propio listón escrito antes, no con éste.
//
// Es el mismo criterio que salvó la lectura del H4 del NFX-LSS (2026-09-29):
// allí la app en M15 perdía el doble que en H1 **acertando exactamente igual**,
// o sea que la diferencia era el peaje y no la dirección. Sin esa columna las
// dos cosas se leen igual.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE ESTE LISTÓN NO AUTORIZA, PASE LO QUE PASE
// ─────────────────────────────────────────────────────────────────────────
// 1. **NO autoriza tocar ninguna señal de Swing.** Ni un umbral, ni el filtro
//    de R/B, ni el aviso al celular.
// 2. **NO autoriza tocar `COMPRESION_MIN` de la app hermana**, que es el único
//    sitio del proyecto donde la compresión ya decide algo (las señales de
//    rango). Ese número tiene su propia pregunta y su propia medición.
// 3. **NO se afloja un criterio al ver el resultado.** Para ese momento exacto
//    se escribe esto antes. Van nueve familias de filtros medidas y nueve que
//    no pasan; que la décima quede a un pelo no es motivo para mover el
//    umbral, es motivo para dejarla fuera.
// 4. **Un empate NO es un hallazgo.** Si los montones miden igual, lo que eso
//    dice es que la compresión sirve para describir el mercado y no para
//    decidir — que es exactamente para lo que se va a enseñar en pantalla.

// ─────────────────────────────────────────────────────────────────────────
// EL CORTE
// ─────────────────────────────────────────────────────────────────────────
// Dónde se parte. Son dos montones y una banda muerta en medio, a propósito:
// pegar los dos montones por un borde común mete en «comprimido» señales que
// están a una milésima de ser normales, y entonces la comparación no compara
// dos cosas distintas.
//
// ⚠️ El valor NO se copia de la app hermana. Allí `COMPRESION_MIN = 0.75`
// decide señales de rango sobre velas de UNA HORA; aquí son velas de un DÍA y
// esto no decide nada. Lo que se usa es el criterio de reparto: que los dos
// montones tengan bastantes señales cada uno, porque un montón de 80 no
// distingue nada (margen ±11 puntos).
export const CORTE_COMPRIMIDO = 0.8
export const CORTE_EXPANDIDO = 1.0

// ─────────────────────────────────────────────────────────────────────────
// LOS CRITERIOS. Todos obligatorios.
// ─────────────────────────────────────────────────────────────────────────

// 1. Los dos montones tienen que DISTINGUIRSE de verdad. El criterio es el
//    conservador de esta casa: los márgenes de acierto no se solapan, o sea
//    que la diferencia supera la SUMA de los dos márgenes.
//
//    ⚠️ Se mira el ACIERTO y no el «por 1R», y el motivo es aritmético: con la
//    vara neutra 1:1 el resultado por unidad de riesgo SALE del acierto
//    (2·p − 1, menos el spread), así que leer los dos como dos evidencias
//    sería contar el mismo dato dos veces. Ya pasó con el carry el
//    2026-10-13.
export const EXIGE_MARGENES_SEPARADOS = true

// 2. La DIRECCIÓN predicha. Comprimido tiene que medir PEOR que expandido.
//    Con dos montones siempre hay uno peor; si no se fija antes cuál se
//    espera, encontrarlo no mide nada.
export const MONTON_PREDICHO_PEOR = 'comprimido'

// 3. Tiene que aparecer en las DOS MITADES del periodo. Es lo único que
//    distingue un efecto de un reparto afortunado, y el error típico de una
//    media sobre ~1.000 operaciones ronda 0,03 por unidad de riesgo — más que
//    muchas de las diferencias que este proyecto ha medido.
export const EXIGE_DOS_MITADES = true

// 4. Cada montón necesita un mínimo de operaciones. Con 150 el margen del
//    peor caso es ±8 puntos; con 80, ±11. Por debajo de esto la comparación no
//    puede distinguir nada y el veredicto sería ruido con formato de tabla.
export const MIN_OPS_POR_MONTON = 150

// 5. Y el que decide QUÉ SIGNIFICA: ¿sobrevive la diferencia sin costes?
//    No es un criterio de aprobado/suspenso — es el que elige entre las dos
//    lecturas de arriba. Se calcula siempre y se imprime siempre.
export const UMBRAL_SIN_COSTES = 0.02

export const FECHA_LISTON = '2026-10-27'

/**
 * El veredicto. Lo CALCULA esto, no lo argumenta nadie.
 *
 * @param d.acComprimido   acierto del montón comprimido (0-1)
 * @param d.acExpandido    acierto del montón expandido (0-1)
 * @param d.opsComprimido  operaciones del montón comprimido
 * @param d.opsExpandido   operaciones del montón expandido
 * @param d.r1Comprimido   por 1R con costes, comprimido
 * @param d.r1Expandido    por 1R con costes, expandido
 * @param d.mitadesComprimido  [1ª, 2ª] por 1R con costes
 * @param d.mitadesExpandido   [1ª, 2ª] por 1R con costes
 * @param d.sinCostesComprimido  por 1R SIN costes, comprimido
 * @param d.sinCostesExpandido   por 1R SIN costes, expandido
 * @returns {{pasa: boolean, falta: string[], lectura: string}|null}
 *          `null` = NO SE PUDO JUZGAR, que no es «no pasa».
 */
export function juzgar(d) {
  const num = (x) => typeof x === 'number' && Number.isFinite(x)
  const necesarios = [
    d?.acComprimido,
    d?.acExpandido,
    d?.opsComprimido,
    d?.opsExpandido,
    d?.r1Comprimido,
    d?.r1Expandido,
    d?.sinCostesComprimido,
    d?.sinCostesExpandido,
  ]
  if (!necesarios.every(num)) return null
  if (!Array.isArray(d.mitadesComprimido) || !Array.isArray(d.mitadesExpandido)) return null
  if (!d.mitadesComprimido.every(num) || !d.mitadesExpandido.every(num)) return null
  if (d.mitadesComprimido.length !== 2 || d.mitadesExpandido.length !== 2) return null

  const EPS = 1e-9
  const falta = []

  if (!(d.opsComprimido >= MIN_OPS_POR_MONTON)) {
    falta.push(`el montón comprimido tiene ${d.opsComprimido} ops y hacen falta ${MIN_OPS_POR_MONTON}`)
  }
  if (!(d.opsExpandido >= MIN_OPS_POR_MONTON)) {
    falta.push(`el montón expandido tiene ${d.opsExpandido} ops y hacen falta ${MIN_OPS_POR_MONTON}`)
  }

  // El margen del peor caso, en puntos porcentuales. Es el mismo `98/√n` del
  // Diario: el del PEOR caso a propósito, porque un margen afinado a favor
  // propio sirve para presumir, no para decidir sobre dinero.
  const margen = (n) => (n > 0 ? 98 / Math.sqrt(n) : Infinity)
  const difPuntos = (d.acExpandido - d.acComprimido) * 100
  const sumaMargenes = margen(d.opsComprimido) + margen(d.opsExpandido)

  if (EXIGE_MARGENES_SEPARADOS && !(Math.abs(difPuntos) > sumaMargenes + EPS)) {
    falta.push(
      `los márgenes SE SOLAPAN: ${Math.abs(difPuntos).toFixed(1)} puntos de diferencia ` +
        `contra ±${sumaMargenes.toFixed(1)} sumados — no distingue nada`,
    )
  }

  // La dirección predicha. `difPuntos > 0` significa que expandido acierta
  // más, o sea que comprimido es el peor: lo predicho.
  if (MONTON_PREDICHO_PEOR === 'comprimido' && !(difPuntos > 0)) {
    falta.push(
      `el montón peor NO es el predicho: se predijo «comprimido» y el que mide peor es «expandido»`,
    )
  }

  if (EXIGE_DOS_MITADES) {
    const malas = d.mitadesComprimido
      .map((m, i) => (m <= d.mitadesExpandido[i] + EPS ? null : i === 0 ? '1ª' : '2ª'))
      .filter(Boolean)
    if (malas.length) {
      falta.push(`comprimido no mide peor en la mitad ${malas.join(' ni la ')}`)
    }
  }

  // La LECTURA: qué significa el resultado. No es aprobado/suspenso.
  const brecha = d.sinCostesExpandido - d.sinCostesComprimido
  const lectura =
    brecha >= UMBRAL_SIN_COSTES - EPS
      ? 'la diferencia SOBREVIVE sin costes: no es solo el peaje. ' +
        'Sería candidato a FILTRO, con su propio listón escrito antes.'
      : 'la diferencia NO sobrevive sin costes: era el peaje. ' +
        'Solo autoriza una ADVERTENCIA en pantalla sobre el stop, nunca un filtro.'

  return { pasa: falta.length === 0, falta, lectura, brechaSinCostes: brecha, difPuntos, sumaMargenes }
}
