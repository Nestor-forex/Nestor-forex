// Decide, mirando lo que hizo el precio después, si cada señal acertó.
//
// Sin esto el historial solo dice "apareció esta señal", que no sirve para
// nada: la pregunta que importa es si la app acierta. Aquí es donde se
// responde.
//
// Cómo: se toma la señal con su entrada, su stop y su objetivo, y se recorren
// las velas POSTERIORES a aquella en la que apareció. Gana si el precio llegó
// al objetivo, pierde si llegó al stop, y sigue abierta si todavía no ha
// llegado a ninguno.

// Cuando UNA MISMA vela toca el stop y el objetivo, no hay forma de saber cuál
// tocó primero: la vela solo guarda máximo y mínimo, no el orden en que
// ocurrieron. En ese caso se cuenta como PERDIDA.
//
// Es una decisión deliberada y va en la dirección incómoda a propósito: un
// historial que se equivoca a favor propio no sirve para decidir si arriesgar
// dinero. Más vale que el porcentaje de acierto salga algo peor que el real y
// no al revés.
export const EMPATE_CUENTA_COMO = 'perdida'

// La clave de una señal concreta. No basta el `id` (par|lado|tipo) porque la
// misma combinación reaparece con el tiempo: cada aparición es una operación
// distinta y hay que juzgarla por separado.
export const claveDe = (s) => `${s.id}@${s.vistoEl}`

/**
 * @param senales   líneas ya parseadas de historial/senales.jsonl
 * @param data      lo que devuelve computarBarrido (trae barras y pares)
 * @param resueltas Set con las claves que ya tienen resultado
 * @returns { resultados, abiertas, caducadas }
 */
export function resolver(senales, data, resueltas = new Set()) {
  const porNombre = new Map(data.pares.map((p) => [p.name, p]))
  const resultados = []
  let abiertas = 0
  let caducadas = 0

  for (const s of senales) {
    const clave = claveDe(s)
    if (resueltas.has(clave)) continue

    const par = porNombre.get(s.par)
    // El día con el que se calculó la señal. El vigía de swing lo guarda como
    // `cierre` y el de intradía como `vela`: se aceptan los dos nombres.
    //
    // ⚠️ Esto NO es flexibilidad de adorno, es el arreglo de un error real.
    // Antes aquí decía solo `s.vela`, que en swing no existe, así que
    // `indexOf(undefined)` daba -1 y TODAS las señales de swing se marcaban
    // "caducada" nada más nacer: el historial no podía juzgar ni una. Si
    // algún día se renombra el campo, hay que tocar los dos vigías y esta
    // línea a la vez, o vuelve a pasar en silencio.
    const dia = s.vela ?? s.cierre

    // DESDE QUÉ VELA SE EMPIEZA A JUZGAR.
    //
    // Lo natural sería buscar la vela exacta con la que se calculó la señal y
    // empezar por la siguiente. Y eso se hace primero. Pero exigir la fecha
    // EXACTA resultó ser frágil, y costó 8 señales reales:
    //
    // El vigía anota como `cierre` la última fecha que traía la descarga de
    // ese momento. El 9 de agosto de 2026 —domingo— esa fecha fue
    // '2026-08-09', porque la fuente entrega una vela de domingo cuando el
    // mercado abre el domingo por la tarde. Días después esa vela ya no
    // estaba en la serie (las fuentes la consolidan o la descartan), así que
    // `indexOf` devolvía -1 y las 6 señales de ese día quedaron marcadas
    // "caducada" para siempre, junto a otras 2 de días vecinos.
    //
    // O sea: la operación existió, el mercado la resolvió, y el historial la
    // tiró a la basura por un detalle del calendario de la fuente de datos.
    // Sobre 18 señales visibles, perder 8 no es un detalle: es la diferencia
    // entre un porcentaje de acierto que significa algo y uno que no.
    //
    // Ahora, si la fecha exacta no está, se busca LA PRIMERA VELA POSTERIOR.
    // Es lo mismo que se hacía antes (`desde + 1`), solo que sin depender de
    // que la vela de la señal siga existiendo.
    //
    // ⚠️ Estrictamente POSTERIOR, nunca la del día ni una anterior. Empezar
    // antes significaría juzgar con precios que ya habían pasado cuando la
    // señal nació: inventaría ganancias que nadie pudo tomar. Por eso la
    // comparación es `>` y no `>=`.
    const exacta = data.fechas.indexOf(dia)
    const hallada = exacta !== -1 ? exacta + 1 : data.fechas.findIndex((f) => f > dia)
    // `findIndex` devuelve -1 en dos situaciones OPUESTAS, y confundirlas
    // rompería el historial en la dirección contraria:
    //
    //   · la señal es MÁS VIEJA que la primera vela descargada → caducada de
    //     verdad, nunca vamos a saber qué pasó;
    //   · la señal es MÁS NUEVA que la última vela → simplemente todavía no
    //     ha pasado nada. Está ABIERTA, y marcarla caducada la mataría el
    //     mismo día en que nace, que es justo el error que este arreglo viene
    //     a reparar.
    //
    // Se distinguen mirando si la señal cae antes del principio de la serie.
    const masViejaQueLaSerie = data.fechas.length > 0 && dia < data.fechas[0]
    const primeraPosterior = hallada === -1 ? data.fechas.length : hallada

    // Y una tercera: una señal SIN día. No debería existir —el vigía siempre
    // escribe `cierre`— pero si un día se renombra el campo o una línea llega
    // a medias, `dia` sería `undefined` y todas las comparaciones de arriba
    // darían false: la señal se quedaría abierta para siempre, sin juzgar y
    // sin avisar. Ese silencio es peor que caducarla, porque nadie lo nota.
    const sinDia = !dia

    // Caduca solo si de verdad no hay nada que mirar ni nunca lo habrá: o el
    // par ya no se sigue, o la señal quedó fuera de los 300 días que se
    // descargan, o no dice de qué día es.
    if (!par || masViejaQueLaSerie || sinDia) {
      caducadas++
      resultados.push({
        clave,
        id: s.id,
        par: s.par,
        lado: s.lado,
        ...(s.sombra ? { sombra: true } : {}),
        vistoEl: s.vistoEl,
        resultado: 'caducada',
        resueltoEl: new Date().toISOString(),
      })
      continue
    }

    const compra = s.lado === 'COMPRA'
    let veredicto = null
    let velaFinal = null

    for (let i = primeraPosterior; i < data.fechas.length; i++) {
      const alto = par.highs[i]
      const bajo = par.lows[i]

      // El stop se comprueba PRIMERO: si ambos caben en la misma vela, manda
      // el peor caso (ver EMPATE_CUENTA_COMO arriba).
      const tocaStop = compra ? bajo <= s.sl : alto >= s.sl
      const tocaObjetivo = compra ? alto >= s.tp : bajo <= s.tp

      if (tocaStop) {
        veredicto = 'perdida'
      } else if (tocaObjetivo) {
        veredicto = 'ganada'
      }

      if (veredicto) {
        velaFinal = data.fechas[i]
        break
      }
    }

    // Todavía no ha llegado ni al objetivo ni al stop: sigue viva, se vuelve a
    // mirar en la próxima revisión.
    if (!veredicto) {
      abiertas++
      continue
    }

    resultados.push({
      clave,
      id: s.id,
      par: s.par,
      lado: s.lado,
      tipo: s.tipo,
      // Se arrastra desde la señal para que el resultado se pueda leer solo,
      // sin cruzarlo otra vez con `senales.jsonl` para saber si contaba o no.
      // Solo aparece cuando es verdad, igual que en la señal.
      ...(s.sombra ? { sombra: true } : {}),
      vistoEl: s.vistoEl,
      velaEntrada: dia,
      velaFinal,
      resultado: veredicto,
      // Cuántas velas tardó en resolverse. Sirve para saber si los objetivos
      // son realistas o si se quedan colgados días.
      //
      // Se cuenta desde la primera vela que se miró, no desde la de la señal:
      // resolverse en la vela siguiente es 1 día, y así sale igual tanto si la
      // vela de la señal seguía en la serie como si desapareció.
      diasTardados: data.fechas.indexOf(velaFinal) - primeraPosterior + 1,
      // Lo que se habría ganado o perdido, en pips, según los niveles que la
      // app dio en su momento.
      pips: veredicto === 'ganada' ? s.pipBeneficio : -s.pipRiesgo,
      rr: s.rr,
      // Aquí siempre es exacto: swing pide los 14 pares directamente, así
      // que el máximo y el mínimo son los reales en todos. (En la app hermana
      // de intradía los cruces se derivan y este campo puede ser false.)
      exacto: true,
      resueltoEl: new Date().toISOString(),
    })
  }

  return { resultados, abiertas, caducadas }
}

// Las cuentas viven en src/lib/historialCalc.js porque la app las necesita
// igual para pintar la pantalla de Historial. Se reexporta desde aquí para
// que quien use el resolver no tenga que saber dónde están.
export { resumir } from '../../src/lib/historialCalc.js'
