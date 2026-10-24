// Las cuentas del historial de señales.
//
// Vive en src/lib (y no en scripts/) porque lo usan los dos lados: el vigía
// para imprimir el resumen en sus registros, y la app para pintarlo en la
// pantalla de Historial. Si estuviera duplicado, un día darían números
// distintos y no sabríamos cuál creer.
//
// Sin React ni nada del navegador, para que Node lo pueda importar igual.

/**
 * Cuenta cuántas señales acertaron y cuántos pips netos dejaron.
 *
 * En swing no hace falta separar cuentas fiables de aproximadas como en la
 * app hermana: aquí los 14 pares se piden directamente, así que el máximo y
 * el mínimo de cada día son los reales en todos.
 *
 * ⚠️ Lo que va aparte son DOS cosas distintas, y no una:
 *
 *   · `ventasPausadas` — señales de la app que se anotan pero no se proponen
 *     mientras la pausa dure.
 *   · `reversion` — la regla CONTRARIA a la de la app. No es una señal de la
 *     app apagada: es otra idea corriendo en paralelo.
 *
 * Ninguna de las dos puede entrar en `todas`: el porcentaje que mira Néstor
 * estaría contando operaciones que la app no le propuso, y dejaría de
 * responder la pregunta que la pantalla dice responder. Y tampoco pueden ir
 * juntas entre sí — el promedio de dos experimentos distintos no responde
 * ninguna de las dos preguntas.
 */
/**
 * ¿Esta señal se anotó con una geometría que NO es la que aprobó su regla?
 *
 * ⚠️ SOLO «COMPRAR LA CAÍDA», y la precisión importa. El fallo del 2026-10-12
 * fue que `mkSetup` elegía la vara POR DESCARTE, así que la regla que cayó
 * dentro fue la que se añadió después: `caida`. La REVERSIÓN siempre se anotó
 * bien (su R/B real es 1:1, comprobado en el historial), y Bollinger nació ya
 * con el campo puesto.
 *
 * Marcar por «no trae el campo `vara`» a secas diría que las reversiones de
 * antes de ayer llevan geometría vieja, y es FALSO: ese campo se empezó a
 * escribir el 2026-10-13 para TODAS, así que su ausencia no distingue una
 * regla mal anotada de una bien anotada antes de esa fecha. Lo único que la
 * ausencia marca es la caída, porque es la única que estuvo mal.
 *
 * Vive aquí y se exporta para que la PANTALLA que lista las señales y el
 * RESUMEN que las cuenta no puedan separarse: si una marcara distinto de la
 * otra, la misma señal saldría de dos maneras en la misma pestaña.
 */
export function esVaraVieja(r) {
  return r?.tipo === 'caida' && r?.vara !== 'simetrica'
}

/**
 * Las cuentas de una lista de resultados (o de filas ya unidas, que traen los
 * mismos campos `resultado` y `pips`).
 *
 * ⚠️ Se EXPORTA desde el 2026-10-23 para que el desglose por RSI de la
 * reversión use exactamente las mismas cuentas que los cubos de `resumir`. Dos
 * implementaciones del mismo porcentaje en la misma pantalla se separan sin que
 * falle nada, y entonces dos números que deberían sumar no suman.
 */
export function cuentaDe(lista) {
  const l = Array.isArray(lista) ? lista : []
  const ganadas = l.filter((r) => r.resultado === 'ganada').length
  const perdidas = l.filter((r) => r.resultado === 'perdida').length
  const total = ganadas + perdidas
  return {
    ganadas,
    perdidas,
    total,
    // null y no 0 cuando no hay nada: "todavía no se sabe" y "0% de acierto"
    // son cosas muy distintas y la pantalla las muestra distinto.
    acierto: total ? Math.round((ganadas / total) * 100) : null,
    pips: Math.round(l.reduce((a, r) => a + (r.pips || 0), 0)),
  }
}

/**
 * ¿Esta señal también pasaría un umbral de RSI MÁS EXIGENTE que el que la
 * generó?
 *
 * Una compra entra cuando el RSI está bajo, así que «más estirada» es RSI ≤ u;
 * una venta entra cuando está alto, así que es RSI ≥ 100 − u. Es exactamente la
 * condición de `clasificarReversion`, con otro umbral.
 *
 * ⚠️ Devuelve `null` —no `false`— si la señal no trae RSI. Una línea sin el
 * dato cayendo en el grupo «no estirada» convertiría un hueco de datos en un
 * hecho sobre el mercado, que es el fallo que este archivo lleva meses
 * evitando (`pearson`, `difMax`, `edadEnMinutos`).
 */
export function masEstiradaQue(fila, umbral) {
  const rsi = fila?.rsi
  if (typeof rsi !== 'number' || !Number.isFinite(rsi)) return null
  return fila?.lado === 'COMPRA' ? rsi <= umbral : rsi >= 100 - umbral
}

/**
 * Parte unas filas en las que pasarían un umbral de RSI más exigente y las que
 * no.
 *
 * ⚠️⚠️ ESTO NO ES EL REGISTRO DE «LA REGLA CON EL UMBRAL MÁS EXIGENTE», y la
 * diferencia es la misma que hay entre el +0,066 y el +0,073 del corte
 * dólar/cruces. La app se queda con los `topN` mejores por lado: con un umbral
 * más estricto, un par que hoy queda cuarto SUBIRÍA al hueco y entraría otro
 * día, a otro precio. O sea que esto son «las señales estiradas que el umbral
 * de hoy sacó a la superficie», no «las que sacaría el umbral estricto».
 *
 * Sirve igual, y por eso existe: contesta con el registro REAL que ya hay si
 * las más estiradas van mejor, hoy y no dentro de nueve meses. Lo que no se
 * puede es presentarlo como el veredicto de esa regla — y la pantalla lo dice.
 */
export function partirPorRsi(filas, umbral) {
  const l = Array.isArray(filas) ? filas : []
  return {
    estiradas: cuentaDe(l.filter((f) => masEstiradaQue(f, umbral) === true)),
    resto: cuentaDe(l.filter((f) => masEstiradaQue(f, umbral) === false)),
    // Lo que no se pudo clasificar no desaparece: mismo cajón que `otros`.
    sinRsi: cuentaDe(l.filter((f) => masEstiradaQue(f, umbral) === null)),
  }
}

export function resumir(resultados) {
  const cuenta = cuentaDe

  // El archivo puede traer más de una línea por señal: una "caducada" de un
  // día en que no se pudo juzgar y, más adelante, su veredicto de verdad.
  // Manda la última, que es la más informada. Sin esto una señal contaría dos
  // veces, o peor: se quedaría con el "no se pudo" de la primera vez.
  const ultimaPorClave = new Map()
  for (const r of resultados || []) ultimaPorClave.set(r.clave, r)

  const todasJuzgadas = [...ultimaPorClave.values()].filter(
    (r) => r.resultado === 'ganada' || r.resultado === 'perdida'
  )
  // Las de sombra salen de aquí y no vuelven a entrar.
  const juzgadas = todasJuzgadas.filter((r) => !r.sombra)

  // ⚠️ LA SOMBRA NO ES UNA SOLA COSA, y hasta el 2026-09-05 se trataba como si
  // lo fuera. Dentro hay DOS experimentos distintos que no tienen nada que ver:
  //
  //   · las VENTAS PAUSADAS — señales de la app que se anotan pero no se
  //     proponen mientras la pausa dure;
  //   · la REVERSIÓN — la regla CONTRARIA a la app, que compra lo que se cayó.
  //
  // Juntarlas en un solo número no dice nada de ninguna: hoy son 12 reversiones
  // y 4 ventas, y el promedio de las dos no responde ninguna pregunta. Peor:
  // el vigía imprimía ese cubo mezclado con la etiqueta «Ventas en sombra»,
  // que era sencillamente falsa.
  //
  // Se separan por `tipo`, no por `sombra`.
  // ⚠️ Y DESDE EL 2026-09-07 SON TRES, no dos. «Comprar la caída» es un tercer
  // experimento, distinto de los otros dos.
  //
  // Esto no es un añadido cosmético: sin él, sus resultados caían dentro de
  // `ventasPausadas` —porque son sombra y no son reversión— y la pantalla los
  // habría enseñado con la etiqueta «ventas pausadas», que es sencillamente
  // falsa. Es EXACTAMENTE el mismo fallo que describe el comentario de arriba,
  // repetido dos días después por no haber escrito la condición por el lado
  // seguro.
  //
  // Por eso `ventasPausadas` se define ahora por lo que ES —señales de la app
  // que no se proponen— y no por descarte de las demás. Un experimento nuevo
  // no puede volver a colarse ahí.
  // ⚠️ Y DESDE EL 2026-09-20 SON CUATRO. «Ruptura de estructura sola» —lo que
  // queda del indicador del concurso cuando se le quitan sus tres señas de
  // identidad— se anota en paralelo con `tipo: 'lss'`.
  const deReversion = todasJuzgadas.filter((r) => r.tipo === 'reversion')
  const deRuptura = todasJuzgadas.filter((r) => r.tipo === 'lss')
  // ⚠️ Y DESDE EL 2026-10-13 SON CINCO. «El toque de banda solo» —Bollinger a
  // secas, sin RSI y sin fuerza— se anota con `tipo: 'bollinger'`. Lo pidió
  // Néstor al leer la tabla del banco, y su listón está en
  // `scripts/lib/preregistro-bollinger-sombra.mjs` con la honestidad escrita
  // dentro: esa variante se eligió DESPUÉS de ver los resultados, así que su
  // veredicto sale solo del registro hacia adelante.
  const deBollinger = todasJuzgadas.filter((r) => r.tipo === 'bollinger')

  // ⚠️⚠️ «COMPRAR LA CAÍDA» SE PARTE EN DOS, Y NO ES UN CAPRICHO (2026-10-12).
  //
  // Esa regla se APROBÓ midiéndola con la vara simétrica (stop y objetivo a
  // 1,5 ATR, R/B 1:1) y el vigía la ANOTÓ desde el 2026-09-07 con la geometría
  // de la app: R/B 1:6,70 de mediana, stop a medio ATR y objetivo a 237 pips.
  // `mkSetup` decidía la vara POR DESCARTE («todo lo que no sea reversión») y
  // la regla nueva cayó ahí dentro sin que nada fallara.
  //
  // Son DOS estrategias con el mismo nombre, y promediarlas es exactamente lo
  // que este archivo lleva meses prohibiendo: con 1:6,70 basta acertar el 13 %
  // para empatar y con 1:1 hace falta el 50 %, así que un porcentaje que las
  // mezcle no responde ninguna de las dos preguntas.
  //
  // Se separan por el campo `vara` que escribe el vigía, NO por una fecha: una
  // fecha dependería de cuándo se fusionó el arreglo y esto depende del dato.
  // Las líneas viejas no lo traen, y esa ausencia es justo lo que las marca.
  //
  // ⚠️ Y las viejas NO desaparecen: van en su propio cubo y la pantalla las
  // nombra. Es la lección del cajón `otros` — lo que no encaja en ningún sitio
  // se anota durante meses y nadie lo ve.
  const deCaida = todasJuzgadas.filter((r) => r.tipo === 'caida' && !esVaraVieja(r))
  const deCaidaVieja = todasJuzgadas.filter((r) => r.tipo === 'caida' && esVaraVieja(r))
  const esDeLaApp = (r) => !r.tipo || r.tipo === 'tendencia'
  const ventasPausadas = todasJuzgadas.filter((r) => r.sombra && esDeLaApp(r))

  // ⚠️⚠️ EL CUBO PARA LO QUE NADIE HA INVENTADO TODAVÍA.
  //
  // Es la pieza que faltaba las CUATRO veces que este fallo mordió antes: un
  // `tipo` nuevo no encaja en ningún cubo con nombre, así que DESAPARECE de
  // todos los desgloses sin que nada falle. Se anota durante meses y nadie lo
  // ve — pasó con «comprar la caída» y volvió a pasar con el retroceso en la
  // app hermana.
  //
  // 📌 La app hermana ya lo arregló el 2026-09-16 y aquí NO llegó, porque este
  // archivo es PRIMO: `gemelos.mjs` vigila los idénticos, y a los primos no los
  // vigila nadie. Es justo donde se acumulan estas cosas.
  //
  // Éste es el ÚNICO cubo que se define por descarte, y a propósito: su trabajo
  // es precisamente recoger lo que nadie enumeró. Todos los demás se definen
  // por lo que SON.
  const CONOCIDOS = new Set(['reversion', 'caida', 'lss', 'bollinger'])
  const otros = todasJuzgadas.filter((r) => r.tipo && !CONOCIDOS.has(r.tipo) && r.tipo !== 'tendencia')

  return {
    todas: cuenta(juzgadas),
    reversion: cuenta(deReversion),
    caida: cuenta(deCaida),
    // Las de la geometría que no era la aprobada. No suman a `caida` ni a
    // nada: existen para que se vea que existieron. Ver la nota de arriba.
    caidaVieja: cuenta(deCaidaVieja),
    ruptura: cuenta(deRuptura),
    bollinger: cuenta(deBollinger),
    otros: cuenta(otros),
    ventasPausadas: cuenta(ventasPausadas),
    // Se mantiene el cubo junto para no romper a quien ya lo lee, pero lo
    // que hay que enseñar son los dos de arriba.
    sombra: cuenta(todasJuzgadas.filter((r) => r.sombra)),
  }
}
