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
export function resumir(resultados) {
  const cuenta = (lista) => {
    const ganadas = lista.filter((r) => r.resultado === 'ganada').length
    const perdidas = lista.filter((r) => r.resultado === 'perdida').length
    const total = ganadas + perdidas
    return {
      ganadas,
      perdidas,
      total,
      // null y no 0 cuando no hay nada: "todavía no se sabe" y "0% de acierto"
      // son cosas muy distintas y la pantalla las muestra distinto.
      acierto: total ? Math.round((ganadas / total) * 100) : null,
      pips: Math.round(lista.reduce((a, r) => a + (r.pips || 0), 0)),
    }
  }

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
  const deReversion = todasJuzgadas.filter((r) => r.tipo === 'reversion')
  const deCaida = todasJuzgadas.filter((r) => r.tipo === 'caida')
  const esDeLaApp = (r) => !r.tipo || r.tipo === 'tendencia'
  const ventasPausadas = todasJuzgadas.filter((r) => r.sombra && esDeLaApp(r))

  return {
    todas: cuenta(juzgadas),
    reversion: cuenta(deReversion),
    caida: cuenta(deCaida),
    ventasPausadas: cuenta(ventasPausadas),
    // Se mantiene el cubo junto para no romper a quien ya lo lee, pero lo
    // que hay que enseñar son los dos de arriba.
    sombra: cuenta(todasJuzgadas.filter((r) => r.sombra)),
  }
}
