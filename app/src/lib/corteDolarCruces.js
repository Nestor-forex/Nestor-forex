// EL CORTE PARES CON DÓLAR / CRUCES: LO MEDIDO, Y QUÉ SEÑALES DE HOY CAEN EN
// EL MONTÓN QUE MIDE POSITIVO.
//
// ─────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE
// ─────────────────────────────────────────────────────────────────────────
// Néstor lo pidió el 2026-10-23 con estas palabras: «quiero ver como señales
// aparte las señales que dan positivo como la que da +0,073 y las otras
// reglas o mediciones que también dan positivo». Y sobre quitarle los cruces
// a la app: «yo preferiría que no quites nada y agregues esa otra tabla bien
// definida e identificada».
//
// Las dos cosas van juntas en el mismo sitio a propósito: enseñar las señales
// del montón bueno SIN la tabla al lado sería enseñar una recomendación sin su
// letra pequeña, y enseñar la tabla sin las señales sería un número que no se
// puede usar para nada.
//
// ⚠️⚠️ ESTO NO ES UNA SEÑAL NUEVA Y NO CAMBIA NINGUNA.
//
// La app sigue proponiendo sus 14 pares y midiendo −0,040 por unidad de
// riesgo. Lo único que hace este archivo es AGRUPAR las señales que ya están
// en pantalla por el montón en que caen. Son las mismas de arriba, repetidas
// aquí juntas — no hay ni una señal que exista solo en esta tarjeta.
//
// ⚠️⚠️ Y LA HONESTIDAD QUE VA ANTES DE LOS NÚMEROS, porque es lo que decide
// cuánto valen:
//
//   1. EL CORTE SE ENCONTRÓ A POSTERIORI. Salió mirando el desglose por
//      divisa del 2026-10-21, o sea DESPUÉS de ver los resultados. Por eso el
//      listón de `preregistro-cruces.mjs` añade un criterio que ningún otro
//      preregistro de este proyecto tiene —el CONTROL (el montón contrario)
//      tiene que EMPEORAR—, que es la única forma de distinguir «el corte dice
//      algo» de «partir 14 pares en dos da uno mejor por azar». Pero eso no
//      borra el origen: son los MISMOS días con los que se encontró.
//   2. LOS 7 PARES CON DÓLAR ESTÁN MUY CORRELACIONADOS ENTRE SÍ. Medido el
//      2026-09-30: cinco señales con dólar eran **una sola apuesta dicha cinco
//      veces**. Más rentable por operación y menos repartido no es
//      automáticamente mejor, y el listón no mide eso.
//   3. SOLO UNA DE LAS TRES PASÓ EL LISTÓN. La app con pares con dólar, sí.
//      La reversión con cruces falla señales/mes (13,0 contra el piso de 15) y
//      Bollinger con cruces falla señales/mes y concentración. Si las tres se
//      pintaran igual, las tres se leerían igual — y dos no han pasado.
//
// ⚠️ LOS NÚMEROS SE ESCRIBEN A MANO Y LLEVAN FECHA DENTRO, igual que en
// `medicion.js` y por el mismo motivo: salen de descargar 1.341 días de velas
// y recalcular el barrido día a día, que es imposible en el navegador. Al
// llevar la fecha dentro, un número viejo se delata solo en la pantalla en vez
// de envejecer en silencio — y en este repositorio hay DOS casos escritos de
// un número a mano que envejeció enseñando una pérdida como ganancia.
//
// CÓMO SE ACTUALIZAN: Actions → «¿Sirven las bandas de Bollinger?» → Run
// workflow, y se copian de la sección «¿SIRVE PARTIR EN PARES CON DÓLAR Y
// CRUCES?».

import { esConDolar, esCruce, esPar } from './diagnostico.js'

/**
 * Lo medido el 2026-10-23, vara neutra 1:1, spread por par descontado.
 *
 * `base` es la misma regla con los 14 pares; `control` es el montón CONTRARIO,
 * que es el que tiene que empeorar para que el corte signifique algo.
 */
export const CORTE = Object.freeze({
  fecha: '2026-10-23',
  desde: '2021-08-19',
  hasta: '2026-10-23',
  dias: 1341,
  // ⚠️ El piso de señales al mes del listón, aquí solo para poder decir por
  // qué dos reglas no pasaron. Se repite el número a mano a propósito y NO se
  // importa de `scripts/`: esto corre en el navegador y `scripts/` no existe
  // ahí. Hay una comprobación en `prueba-corte.mjs` que lo compara con el
  // listón de verdad y falla si se separan.
  pisoSenalesMes: 15,
  reglas: Object.freeze([
    Object.freeze({
      tipo: 'tendencia',
      gana: 'dolar',
      ops: 1193,
      por1R: 0.073,
      mitades: Object.freeze([0.063, 0.083]),
      conSwap: 0.033,
      base: -0.04,
      control: -0.142,
      senalesMes: 20.5,
      pasaListon: true,
      fallaConcentracion: false,
    }),
    Object.freeze({
      tipo: 'reversion',
      gana: 'cruces',
      ops: 755,
      por1R: 0.111,
      mitades: Object.freeze([0.041, 0.179]),
      conSwap: 0.068,
      base: 0.005,
      control: -0.086,
      senalesMes: 13,
      pasaListon: false,
      fallaConcentracion: false,
    }),
    Object.freeze({
      tipo: 'bollinger',
      gana: 'cruces',
      ops: 238,
      por1R: 0.074,
      mitades: Object.freeze([0.082, 0.067]),
      conSwap: 0.035,
      base: 0.013,
      control: -0.034,
      senalesMes: 4.1,
      pasaListon: false,
      // Un solo par aporta el 43 % de la mejora, y el máximo del listón es el
      // 40 %. Va como campo y no dentro de un texto para que la pantalla no
      // tenga que saberse de memoria cuál de las tres era.
      fallaConcentracion: true,
    }),
  ]),
})

/**
 * ¿Cae este par en el montón bueno de esa regla?
 *
 * ⚠️ Los dos montones se preguntan por lo que SON (`esConDolar` / `esCruce` de
 * `diagnostico.js`), nunca «lo que no es el otro». Un `name` con basura dentro
 * no cae en ninguno y se cuenta aparte — es la séptima vez que una condición
 * por descarte muerde en este proyecto y la primera que se evita antes.
 */
export function enElMonton(par, monton) {
  if (!esPar(par)) return false
  if (monton === 'dolar') return esConDolar(par)
  if (monton === 'cruces') return esCruce(par)
  return false
}

/**
 * Las señales de HOY repartidas por el montón de cada regla.
 *
 * Devuelve SIEMPRE las tres reglas, también las que hoy no tienen ni una en su
 * montón bueno (`dentro: []`).
 *
 * ⚠️ Eso último es deliberado: esconder una regla sin señales dejaría en
 * pantalla solo lo que parece estar pasando algo, que es cómo se fabrica un
 * espejismo. Es la misma decisión que los grupos con n = 0 de `Diagnostico` y
 * que `senalesDelUltimoDia`.
 *
 * ⚠️ `fuera` NO es decoración. Es cuántas señales de esa regla quedan en el
 * montón que mide NEGATIVO, y sin ese número la tarjeta diría «la app tiene 2
 * señales buenas hoy» cuando en realidad tiene 2 de 5. El que falta es tan
 * informativo como el que está.
 *
 * @param listas  { tendencia, reversion, bollinger } tal como llegan de `derivarVista`
 * @param reglas  para las pruebas; por defecto `CORTE.reglas`
 */
export function montonesDeHoy(listas, reglas = CORTE.reglas) {
  const porTipo = {
    tendencia: Array.isArray(listas?.tendencia) ? listas.tendencia : [],
    reversion: Array.isArray(listas?.reversion) ? listas.reversion : [],
    bollinger: Array.isArray(listas?.bollinger) ? listas.bollinger : [],
  }

  return reglas.map((r) => {
    const suyas = porTipo[r.tipo] || []
    const dentro = suyas.filter((s) => enElMonton(s?.name, r.gana))
    const fuera = suyas.filter((s) => enElMonton(s?.name, r.gana === 'dolar' ? 'cruces' : 'dolar'))
    // Lo que no es un par de verdad no desaparece: sale aquí para que un
    // `name` roto se vea en vez de evaporarse. Mismo cajón que `otros` en
    // `historialCalc.js`.
    const sinClasificar = suyas.length - dentro.length - fuera.length

    return { ...r, dentro, fuera: fuera.length, sinClasificar }
  })
}

/**
 * ¿Hay algo que enseñar? Si NINGUNA de las tres reglas ha dado una sola señal
 * hoy —ni dentro ni fuera de su montón— la tarjeta entera sobra: sería un
 * marco con tres «todavía nada» y una tabla que ya está en las mediciones.
 */
export function hayAlgoQueEnsenar(grupos) {
  return (grupos || []).some((g) => g?.dentro?.length > 0 || g?.fuera > 0)
}
