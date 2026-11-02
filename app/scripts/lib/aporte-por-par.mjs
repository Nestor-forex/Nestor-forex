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
  const base = mide(() => true)
  const filtrado = mide(filtro)
  const mejora = (filtrado.porRiesgo ?? NaN) - (base.porRiesgo ?? NaN)

  // Sin mejora positiva la pregunta no tiene sentido: dividir por ~0 daría una
  // fracción enorme o un signo al azar, y un número daría la impresión de que
  // sí se midió algo. Mismo criterio que `concentracionDeLaMejora`.
  if (!Number.isFinite(mejora) || mejora <= 1e-9) return null
  if (!base.total || !filtrado.total) return null

  const pares = [...new Set((Array.isArray(senales) ? senales : []).map((s) => s?.par).filter(Boolean))]
  if (!pares.length) return null

  let mayor = -Infinity
  for (const par of pares) {
    const a = mide((s) => s.par === par)
    const b = mide((s) => s.par === par && filtro(s))
    // Un par que no aparece en ninguno de los dos no aporta nada; uno que solo
    // aparece en la base aporta NEGATIVO (se lo llevó el filtro), y eso es
    // información legítima: no se salta.
    const sumaBase = (a.porRiesgo ?? 0) * a.total
    const sumaFil = (b.porRiesgo ?? 0) * b.total
    const aporte = sumaFil / filtrado.total - sumaBase / base.total
    if (aporte > mayor) mayor = aporte
  }
  return Number.isFinite(mayor) ? mayor / mejora : null
}
