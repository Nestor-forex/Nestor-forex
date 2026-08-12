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
 * ⚠️ Lo que sí va aparte es `sombra`: las ventas, que están pausadas. El vigía
 * las sigue anotando para acumular operaciones reales, pero la app no las
 * propone y nadie recibe aviso de ellas. Por eso NO pueden entrar en `todas`:
 * el porcentaje que mira Néstor estaría contando operaciones que la app dejó
 * de proponerle, y dejaría de responder la pregunta que la pantalla dice
 * responder.
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
  // Las de sombra salen de aquí y no vuelven a entrar. Su sitio es `sombra`,
  // y solo lo lee el vigía.
  const juzgadas = todasJuzgadas.filter((r) => !r.sombra)

  return {
    todas: cuenta(juzgadas),
    sombra: cuenta(todasJuzgadas.filter((r) => r.sombra)),
  }
}
