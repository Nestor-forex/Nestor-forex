// ¿CUÁNTA DE LA MEJORA SE LLEVA UN SOLO PAR?
//
// Lo necesita el criterio de concentración de un listón: con 14 pares, si uno
// solo aporta casi toda la ventaja, lo medido es ese par y no la regla.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ POR QUÉ NO ES `concentracionDeLaMejora` DE `breakeven.mjs`
// ─────────────────────────────────────────────────────────────────────────
// Aquella función existe y hace lo mismo de nombre, pero **no se puede reusar
// aquí**, y la diferencia es de aritmética y no de estilo:
//
//   · allí las dos columnas tienen EL MISMO conjunto de operaciones (breakeven
//     no quita ninguna, solo cambia su desenlace), así que la mejora es una
//     resta de SUMAS y el aporte de un par es su resta a secas;
//   · aquí un filtro QUITA señales, así que las dos columnas tienen N
//     distintos y la mejora es una diferencia de MEDIAS. Restar sumas daría un
//     número plausible y equivocado.
//
// La descomposición que sí es exacta para medias:
//
//   mediaFiltro − mediaBase = Σ_pares [ sumaR_p(filtro)/N_filtro − sumaR_p(base)/N_base ]
//
// porque cada media es la suma de los aportes de sus pares dividida por su
// propio N. Y `sumaR_p = porRiesgo_p × total_p`, que es lo que `medir` ya da.
//
// Se deja un lib aparte en vez de dentro del guion por la lección del
// 2026-09-02 (sacar `medir()` del script): de aquí sale un criterio del
// listón, o sea un número con el que se decide encender o apagar algo, y eso
// no puede ser lo único sin comprobar.

// `mide(filtro)` tiene que devolver lo de `medir()`: al menos `{ total,
// porRiesgo }`, medido sobre las señales que pasan `filtro`.
//
// Devuelve la fracción de la mejora que se lleva el par que más aporta, o
// `null` cuando no se puede calcular.
//
// ⚠️ `null` NO es un aprobado, y los listones de este proyecto lo tratan así:
// «no se pudo medir» y «salió bien» se leen igual en una tabla si no se
// separan a mano.
export function mayorAportePorPar(mide, senales, filtro) {
  return mayorAportePorGrupo(mide, senales, filtro, (s) => s?.par)
}

// La misma descomposición, agrupando por lo que diga `claveDe(senal)`.
//
// ⚠️⚠️ LOS GRUPOS TIENEN QUE SER DISJUNTOS, y no es un detalle de estilo: la
// descomposición de arriba solo es exacta si cada señal cae en UN grupo. Si una
// señal contara en dos (por ejemplo agrupando por «divisa que compra» y
// «divisa que vende» a la vez), la suma de los aportes valdría el doble de la
// mejora y cada fracción saldría inflada **sin dar ningún error** — un número
// plausible describiendo otra cosa.
//
// Por eso `claveDe` devuelve UNA clave por señal, nunca una lista. Una señal
// cuya clave sea `null` o `undefined` se salta: no se le inventa un grupo.
export function mayorAportePorGrupo(mide, senales, filtro, claveDe) {
  const base = mide(() => true)
  const filtrado = mide(filtro)
  const mejora = (filtrado.porRiesgo ?? NaN) - (base.porRiesgo ?? NaN)

  // Sin mejora positiva la pregunta no tiene sentido: dividir por ~0 daría una
  // fracción enorme o un signo al azar, y un número daría la impresión de que
  // sí se midió algo. Mismo criterio que `concentracionDeLaMejora`.
  if (!Number.isFinite(mejora) || mejora <= 1e-9) return null
  if (!base.total || !filtrado.total) return null

  const lista = Array.isArray(senales) ? senales : []
  const grupos = [...new Set(lista.map((s) => claveDe(s)).filter((k) => k != null))]
  if (!grupos.length) return null

  let mayor = -Infinity
  for (const g of grupos) {
    const a = mide((s) => claveDe(s) === g)
    const b = mide((s) => claveDe(s) === g && filtro(s))
    // Un grupo que no aparece en ninguno de los dos no aporta nada; uno que
    // solo aparece en la base aporta NEGATIVO (se lo llevó el filtro), y eso es
    // información legítima: no se salta.
    const sumaBase = (a.porRiesgo ?? 0) * a.total
    const sumaFil = (b.porRiesgo ?? 0) * b.total
    const aporte = sumaFil / filtrado.total - sumaBase / base.total
    if (aporte > mayor) mayor = aporte
  }
  return Number.isFinite(mayor) ? mayor / mejora : null
}

// ─────────────────────────────────────────────────────────────────────────
// ¿QUÉ HACE UNA SEÑAL CON EL DÓLAR?
// ─────────────────────────────────────────────────────────────────────────
//
// Partición DISJUNTA de tres grupos, que es lo que la hace válida para la
// descomposición de arriba. Contesta una pregunta concreta: si un filtro
// «funciona» en 2021-2026 —el ciclo de subidas de la Fed— puede que no esté
// midiendo una regla sino **una apuesta direccional al dólar de ese tramo**.
//
// `EUR/USD COMPRA` compra EUR y vende USD. `USD/JPY COMPRA` compra USD.
// Un cruce sin dólar dentro no dice nada del dólar.
export function grupoDolar(s) {
  if (!s || typeof s.lado !== 'string') return null
  const compraBase = s.lado === 'COMPRA'
  if (s.base === 'USD') return compraBase ? 'compraUSD' : 'vendeUSD'
  if (s.cotizada === 'USD') return compraBase ? 'vendeUSD' : 'compraUSD'
  return 'sinUSD'
}
