// EL LISTÓN DEL CORTE DÓLAR / CRUCES.
//
// Escrito el 2026-10-22, ANTES de medir nada. Ese orden es lo único que
// distingue esto de buscarle una explicación a un número que ya se vio.
//
// ═════════════════════════════════════════════════════════════════════════
// ⚠️⚠️ DE DÓNDE SALE, Y POR QUÉ ESO LO VUELVE SOSPECHOSO
// ═════════════════════════════════════════════════════════════════════════
//
// El 2026-10-21, al desglosar Bollinger por divisa, se partieron las 14 filas
// en pares con dólar y cruces y salió esto (vara neutra 1:1, spread por par):
//
//                        sola    +RSI   +fuerza      M2    la app
//   con dólar (7)      −0,040  −0,036   −0,039   +0,020   +0,066   gana 5/7
//   cruces    (7)      +0,087  +0,100   +0,083   +0,077   −0,140   gana 1/7
//   diferencia         −0,127  −0,136   −0,121   −0,057   +0,206
//
// O sea: la app gana en los pares con dólar y pierde fuerte en los cruces, y
// Bollinger y la reversión hacen LO CONTRARIO.
//
// ⚠️ **Ese corte se miró DESPUÉS de ver el desglose.** Es el troceo a
// posteriori que este proyecto rechazó con el control de la confluencia
// (2026-09-04) y con el del barrido de liquidez. Que el número sea grande no
// cambia de qué clase de número es: con 14 pares hay miles de formas de
// partirlos en dos montones, y alguna da una diferencia grande por puro azar.
//
// Dos cosas lo hacen algo menos arbitrario, y NINGUNA lo exime:
//
//   · el corte ya existía en el proyecto antes de esa tabla —
//     `src/lib/diagnostico.js` parte el Diario de Néstor en «cruce o par con
//     dólar» desde el 2026-09-14— así que no es una partición inventada para
//     que cuadrara;
//   · los márgenes de GRUPO son ±6 puntos de acierto (313 y 238 operaciones) y
//     la diferencia de la app es 0,206, por encima de eso.
//
// Por eso existe este archivo: para que el veredicto salga de criterios
// escritos antes y lo CALCULE `juzgar()`, en vez de argumentarlo yo mirando la
// tabla que ya conozco.
//
// ═════════════════════════════════════════════════════════════════════════
// ⚠️⚠️ LA TRAMPA QUE HACE QUE ESTO NO SEA UNA RESTA
// ═════════════════════════════════════════════════════════════════════════
//
// Néstor preguntó el 2026-10-22: «eso que dices de quitar los cruces no quita
// señales — las cambia por otras, ¿a qué te refieres?». Es la pieza central y
// va aquí porque decide cómo se mide.
//
// La app NO propone todos los pares que pasan el filtro: ordena los 14 por
// divergencia de fuerza y se queda con los **N mejores de compra y N de
// venta** (`topN`). Si se quitan los 7 cruces, los huecos SIGUEN SIENDO LOS
// MISMOS: el que estaba cuarto sube al hueco, y entra en otra fecha, a otro
// precio, con su propio resultado.
//
// Comprobado sobre el barrido real del 2026-10-22: la reversión proponía
// EUR/CAD, EUR/CHF y EUR/NZD — **los tres cruces**. Sin cruces no daría cero
// señales: daría tres pares con dólar que hoy no se ven.
//
// ⚠️ **Por tanto «la app sin cruces» NO es «la app menos lo malo»: es OTRA app
// con otras operaciones.** El +0,066 de arriba se midió sobre las señales que
// la app da HOY, con los cruces compitiendo por los huecos. No es el número que
// daría la app sin cruces, y citarlo como tal sería el fallo de siempre — un
// número bien calculado describiendo otra cosa.
//
// De ahí sale el criterio 1: hay que medir **la app entera sin cruces**, no
// sumar el montón de los pares con dólar.
//
// ═════════════════════════════════════════════════════════════════════════
// QUÉ SE MIDE, EXACTAMENTE
// ═════════════════════════════════════════════════════════════════════════
//
// Tres variantes, cada una contra su propia línea de base (la misma regla con
// los 14 pares), todas con la vara neutra 1:1 y el spread por par:
//
//   A. la app SOLO con los 7 pares con dólar      (su mejor montón)
//   B. la reversión SOLO con los 7 cruces         (su mejor montón)
//   C. Bollinger SOLO con los 7 cruces            (su mejor montón)
//
// ⚠️ Y el CONTROL, que es lo que separa un hallazgo de una coincidencia:
//
//   D. cada regla con el montón CONTRARIO al que le fue bien.
//
// Si el corte dice algo real, D tiene que salir peor que su base. Si D sale
// igual o mejor, lo que se midió es ruido de partir una muestra en dos.
export const FECHA_DEL_LISTON = '2026-10-22'

// ⚠️ El veredicto se decide con la VARA NEUTRA 1:1, no con la geometría de la
// app. El motivo está medido: el 2026-09-14 el COT salió positivo en las dos
// mitades con la geometría real y negativo en las dos con la vara neutra, con
// las MISMAS operaciones. Un filtro puede seleccionar operaciones con buena
// proporción objetivo/riesgo sin acertar ni una dirección de más.
export const VARA_QUE_DECIDE = 'neutra 1:1'

// ─────────────────────────────────────────────────────────────────────────
// LOS CRITERIOS. Todos obligatorios.
// ─────────────────────────────────────────────────────────────────────────

// 1. MEJORA DE VERDAD, medida sobre la app entera sin cruces (no sumando el
//    montón). El umbral no es de gusto: con resultados por operación de −1 a
//    +1 y ~2.500 operaciones, el error típico de cada media ronda 0,02, así
//    que una mejora menor que eso no se distingue del ruido.
export const UMBRAL = 0.02

// 2. GANA EN LAS DOS MITADES del periodo. Es el criterio que de verdad separa
//    una mejora de un reparto afortunado: el ruido no se repite en las dos
//    mitades. Y es el que tumbó al COT (+0,002 en la primera y −0,065 en la
//    segunda) y a Bollinger+RSI (+0,071 y −0,026).
export const EXIGE_DOS_MITADES = true

// 3. ⚠️ EL CONTROL TIENE QUE FALLAR. Cada regla con el montón contrario debe
//    salir PEOR que su línea de base. Sin esto no hay forma de distinguir «el
//    corte dice algo» de «partir 14 pares en dos da uno mejor por azar».
//
//    Es el criterio que este archivo añade y que no tiene ningún otro
//    preregistro del proyecto, porque ningún otro nació de un troceo.
export const EXIGE_CONTROL_PEOR = true

// 4. LA APP SIGUE HABLANDO LO SUFICIENTE, medido en señales AL MES.
//
// ⚠️⚠️ CORREGIDO EL MISMO DÍA, ANTES DE MEDIR NADA REAL, y queda escrito
// porque el error es mío y de los de este proyecto.
//
// La primera versión de este criterio pedía «≥ 70 % de las señales de la app
// con 14 pares», razonando que con `topN` fijo los huecos se siguen llenando y
// el número no debería caer mucho. **Ese razonamiento era falso**, y lo
// desmintió el humo con un mercado inventado: la app con 7 pares da el **49 %**
// de las señales, no el 70 %.
//
// Y no es mala suerte, es aritmética: `topN` acota el máximo por día, pero
// quien decide cuántas señales hay de verdad es **cuántos pares pasan el
// umbral de fuerza ese día**, y con la mitad de pares eso es aproximadamente
// la mitad. O sea que el criterio viejo **no podía cumplirse por
// construcción**, y un criterio imposible no mide nada: habría tumbado el
// corte sin mirar el mercado — el gemelo exacto de una comprobación que no
// puede fallar, que en este repositorio ya mordió dos veces el 2026-10-22.
//
// ⚠️ **La diferencia entre esto y aflojar un umbral**, que es la línea que no
// hay que cruzar: aflojar es mover un número al ver que el RESULTADO no pasa.
// Esto es cambiar un criterio que medía otra cosa de la que decía medir, antes
// de tener un solo resultado real. Es lo mismo que se hizo ese día con la
// etiqueta del RSI, y por el mismo motivo.
//
// El número sale de la ESTRUCTURA y no de ningún resultado: la app da ~36
// señales al mes con sus 14 pares, así que con 7 se espera algo más de la
// mitad. Por debajo de 15 al mes deja de ser el mismo producto — y eso importa
// aparte del rendimiento, porque la queja de Néstor del 2026-09-21 era justo
// que el celular suena poco. Los listones de este proyecto piden entre 8 y 10
// al mes a una regla de sombra; a la app, que es el producto, se le pide más.
export const MIN_SENALES_MES = 15

// 5. AGUANTA 0,5 PIPS DE SWAP POR NOCHE. Una regla que solo gana con swap cero
//    no gana en una cuenta real. Es el criterio que «comprar la caída» pasó en
//    septiembre y dejó de pasar en octubre al contar las noches de calendario.
export const SWAP_EXIGIDO = 0.5

// 6. ⚠️ NINGÚN PAR APORTA MÁS DEL 40 % DE LA MEJORA. Con solo 7 pares por
//    montón, uno que se lleve casi todo no es una regla: es ese par en ese
//    periodo. Más estricto de lo que parece, porque 40 % de 7 pares es mucho
//    menos holgura que 40 % de 14.
export const MAX_POR_PAR = 0.4

// ⚠️⚠️ LO QUE ESTE LISTÓN NO AUTORIZA, Y HAY QUE TENERLO ESCRITO ANTES:
//
// Pasarlo **no enciende nada por sí solo**. Quitar 7 pares de la app cambia
// qué señales propone, así que sería un cambio de la app y no un experimento de
// sombra: decisión de Néstor, con su propio PR, su prueba y su verificación.
//
// Y hay una pregunta honesta que el listón NO contesta y que va dicha: si la
// app solo operara pares con dólar, **la correlación entre ellos es altísima**
// — el 2026-09-30 quedó medido que cinco señales con dólar eran una sola
// apuesta dicha cinco veces. Más rentable por operación y menos diversificado
// no es automáticamente mejor.
export const QUE_NO_AUTORIZA = Object.freeze({
  encender: false,
  porque:
    'quitar pares cambia las señales de la app, no es un experimento de sombra; ' +
    'y 7 pares con dólar están muy correlacionados entre sí (medido el 2026-09-30)',
})

// ⚠️ Si algún resultado queda A UN PELO de un criterio, la respuesta NO es
// aflojarlo. Éste es el momento exacto para el que se escribe el listón antes.

/**
 * El veredicto se CALCULA. No se argumenta.
 *
 * @param d.porRiesgo        la variante (regla con su mejor montón), vara neutra
 * @param d.base             la misma regla con los 14 pares
 * @param d.mitades          [1ª, 2ª] de la variante
 * @param d.mitadesBase      [1ª, 2ª] de la base
 * @param d.control          la misma regla con el montón CONTRARIO
 * @param d.senales          operaciones de la variante
 * @param d.meses            meses de mercado medidos, para las señales al mes
 * @param d.conSwap          la variante pagando SWAP_EXIGIDO
 * @param d.aporteMaxPar     fracción de la mejora que aporta el par que más
 */
export function juzgar(d) {
  const falta = []
  const num = (x) => typeof x === 'number' && Number.isFinite(x)

  // ⚠️ Un dato que falta NO es un criterio cumplido. Devuelve `null` —«no se
  // pudo juzgar»— y nunca «no pasa», que son cosas distintas. Misma asimetría
  // que `pearson` y `difMax`.
  const necesarios = [d?.porRiesgo, d?.base, d?.control, d?.senales, d?.meses, d?.conSwap]
  if (!necesarios.every(num)) return null
  if (!Array.isArray(d.mitades) || !Array.isArray(d.mitadesBase)) return null
  if (!d.mitades.every(num) || !d.mitadesBase.every(num)) return null

  // ⚠️ La tolerancia de coma flotante no es paranoia: `−0,06 − (−0,04)` en
  // JavaScript da −0,019999999999999997, así que un resultado que cae
  // exactamente en el umbral se iría al lado cómodo por el último bit de un
  // decimal. Lo cazó la comprobación del borde exacto en el listón de la
  // rejilla (2026-10-01).
  const EPS = 1e-9
  const mejora = d.porRiesgo - d.base
  if (!(mejora >= UMBRAL - EPS)) falta.push(`mejora de ${mejora.toFixed(3)} y hace falta ${UMBRAL}`)

  if (EXIGE_DOS_MITADES) {
    const peores = d.mitades
      .map((m, i) => (m >= d.mitadesBase[i] - EPS ? null : i === 0 ? '1ª' : '2ª'))
      .filter(Boolean)
    if (peores.length) falta.push(`no mejora en la mitad ${peores.join(' ni la ')}`)
  }

  if (EXIGE_CONTROL_PEOR && !(d.control <= d.base + EPS)) {
    falta.push(`el CONTROL (montón contrario) no empeora: ${d.control.toFixed(3)} contra ${d.base.toFixed(3)}`)
  }

  const porMes = d.meses > 0 ? d.senales / d.meses : 0
  if (!(porMes >= MIN_SENALES_MES - EPS)) {
    falta.push(`deja ${porMes.toFixed(1)} señales al mes y hacen falta ${MIN_SENALES_MES}`)
  }

  if (!(d.conSwap >= UMBRAL - EPS + d.base)) {
    falta.push(`pagando ${SWAP_EXIGIDO} de swap la mejora cae a ${(d.conSwap - d.base).toFixed(3)}`)
  }

  if (num(d.aporteMaxPar) && !(d.aporteMaxPar <= MAX_POR_PAR + EPS)) {
    falta.push(`un solo par aporta el ${(100 * d.aporteMaxPar).toFixed(0)} % de la mejora`)
  }

  return { pasa: falta.length === 0, falta }
}

export const QUE_SIGNIFICA = Object.freeze({
  pasa:
    'el corte sobrevive a su propio control y a las dos mitades. NO se enciende: ' +
    'se le PROPONE a Néstor, con la nota de que 7 pares con dólar están muy correlacionados',
  noPasa:
    'el corte era ruido de partir una muestra en dos, o no aguanta los costes. ' +
    'La app se queda con los 14 pares y la tabla de pantalla lo dice',
})
