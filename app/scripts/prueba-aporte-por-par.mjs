// Comprobaciones del reparto de la mejora por par. SIN INTERNET.
//
//     node scripts/prueba-aporte-por-par.mjs
//
// ⚠️ ESTO DECIDE UN CRITERIO DE UN LISTÓN, y por eso tiene pruebas propias en
// vez de vivir dentro del guion de medición: de aquí sale el número con el que
// se aprueba o suspende «ningún par aporta más del 40 % de la mejora». La
// lección es la del 2026-09-02 — `medir()` y el barrido de swap vivían dentro
// de `backtest.mjs`, de ellos salían todos los números con los que se decide, y
// eran lo único sin comprobar.
//
// La aritmética que se vigila aquí es la que distingue este caso del de
// `breakeven.mjs`: allí las dos columnas tienen el mismo N y la mejora es una
// resta de sumas; aquí el filtro QUITA señales, así que es una diferencia de
// MEDIAS y hay que descomponerla sobre los dos N distintos. Restar sumas daría
// un número plausible y equivocado.

import { mayorAportePorPar } from './lib/aporte-por-par.mjs'

let hechas = 0
let fallos = 0
const ok = (cond, que) => {
  hechas++
  if (cond) return true
  fallos++
  console.error(`  ✗ ${que}`)
  return false
}
const casi = (a, b, txt) => ok(a != null && Math.abs(a - b) < 1e-9, `${txt} (esperaba ${b}, salió ${a})`)

// Un `mide()` de mentira que calcula la media de verdad sobre las señales que
// pasan el filtro. Cada señal lleva su propio resultado en «veces el riesgo»,
// que es lo que `medir()` acumula en `sumaR`.
const medidor = (senales) => (filtro) => {
  const pasan = senales.filter(filtro)
  const suma = pasan.reduce((t, s) => t + s.r, 0)
  return { total: pasan.length, porRiesgo: pasan.length ? suma / pasan.length : null }
}

console.log('1. La descomposición es EXACTA: los aportes suman la mejora')
{
  // Tres pares, nueve señales. El filtro se queda con las buenas de cada par.
  const senales = [
    { par: 'EUR/USD', r: +1, pasa: true },
    { par: 'EUR/USD', r: -1, pasa: false },
    { par: 'EUR/USD', r: +1, pasa: true },
    { par: 'GBP/USD', r: +0.5, pasa: true },
    { par: 'GBP/USD', r: -1, pasa: false },
    { par: 'GBP/USD', r: -1, pasa: false },
    { par: 'USD/JPY', r: -0.2, pasa: true },
    { par: 'USD/JPY', r: -1, pasa: false },
    { par: 'USD/JPY', r: +0.3, pasa: true },
  ]
  const mide = medidor(senales)
  const filtro = (s) => s.pasa

  const base = mide(() => true)
  const filtrado = mide(filtro)
  const mejora = filtrado.porRiesgo - base.porRiesgo
  ok(mejora > 0, `el filtro mejora (de ${base.porRiesgo.toFixed(3)} a ${filtrado.porRiesgo.toFixed(3)})`)

  // La suma de TODOS los aportes tiene que dar la mejora entera. Es lo que
  // hace que «el 40 % de la mejora» signifique algo: si no sumaran, una
  // fracción del total no sería una fracción de nada.
  const pares = [...new Set(senales.map((s) => s.par))]
  let suma = 0
  for (const par of pares) {
    const a = mide((s) => s.par === par)
    const b = mide((s) => s.par === par && filtro(s))
    suma += ((b.porRiesgo ?? 0) * b.total) / filtrado.total - ((a.porRiesgo ?? 0) * a.total) / base.total
  }
  casi(suma, mejora, 'los aportes de los tres pares suman la mejora entera')

  const frac = mayorAportePorPar(mide, senales, filtro)
  ok(frac != null && frac > 0 && frac <= 1, `la fracción del mayor está entre 0 y 1: ${frac?.toFixed(3)}`)
}

console.log('2. ⚠️ RESTAR SUMAS en vez de medias da OTRO número')
{
  // El caso que demuestra por qué no se puede reusar `concentracionDeLaMejora`:
  // un par con MUCHAS señales malas que el filtro quita entero. Restando
  // sumas, ese par «aporta» todo lo que dejó de perder; con medias, su aporte
  // es otro porque el N cambió debajo.
  const senales = [
    { par: 'EUR/USD', r: +1, pasa: true },
    { par: 'EUR/USD', r: +1, pasa: true },
    { par: 'NZD/CHF', r: -1, pasa: false },
    { par: 'NZD/CHF', r: -1, pasa: false },
    { par: 'NZD/CHF', r: -1, pasa: false },
    { par: 'NZD/CHF', r: -1, pasa: false },
  ]
  const mide = medidor(senales)
  const filtro = (s) => s.pasa

  const base = mide(() => true) // (2 − 4) / 6 = −0.333…
  const filtrado = mide(filtro) //  2 / 2     = +1
  casi(base.porRiesgo, -1 / 3, 'la base mide −1/3')
  casi(filtrado.porRiesgo, 1, 'el filtro mide +1')

  const frac = mayorAportePorPar(mide, senales, filtro)
  // EUR/USD: 2/2 − 2/6 = +0.666…   NZD/CHF: 0/2 − (−4/6) = +0.666…
  // Los dos aportan lo mismo, así que el mayor es 0.666… sobre una mejora de
  // 1.333… = exactamente la mitad.
  casi(frac, 0.5, 'el mayor aporta justo la mitad de la mejora')
  // Y el número que daría restar sumas a secas (4/6 contra 2/6) sería otro:
  // esto es lo que fija que NO se está haciendo eso.
  ok(Math.abs(frac - 2 / 3) > 1e-6, 'y NO es el número que daría restar sumas')
}

console.log('3. Un solo par que se lleva TODA la mejora se detecta')
{
  const senales = [
    { par: 'USD/JPY', r: -1, pasa: false },
    { par: 'USD/JPY', r: +1, pasa: true },
    // Los otros dos pares no cambian: el filtro los deja enteros.
    { par: 'EUR/USD', r: +0.1, pasa: true },
    { par: 'GBP/USD', r: +0.1, pasa: true },
  ]
  const mide = medidor(senales)
  const frac = mayorAportePorPar(mide, senales, (s) => s.pasa)
  ok(frac != null && frac > 0.4, `un par dominante pasa del 40 %: ${frac?.toFixed(3)}`)
}

console.log('4. ⚠️ Cuándo devuelve `null`, que NO es un aprobado')
{
  const senales = [
    { par: 'EUR/USD', r: +1, pasa: true },
    { par: 'EUR/USD', r: +1, pasa: false },
  ]
  const mide = medidor(senales)
  // Sin mejora: el filtro deja la media igual.
  ok(mayorAportePorPar(mide, senales, () => true) === null, 'sin mejora (el filtro no filtra) es null')
  // Mejora negativa.
  const peor = [
    { par: 'EUR/USD', r: +1, pasa: false },
    { par: 'EUR/USD', r: -1, pasa: true },
  ]
  ok(mayorAportePorPar(medidor(peor), peor, (s) => s.pasa) === null, 'si el filtro EMPEORA es null')
  // Filtro que no deja nada.
  ok(mayorAportePorPar(mide, senales, () => false) === null, 'un filtro que no deja nada es null')
  // Sin señales.
  ok(mayorAportePorPar(medidor([]), [], () => true) === null, 'sin señales es null')
  // Señales sin `par`: es el fallo de nombre que ya mordió con `name` en
  // Bollinger — el reparto imprimía «undefined con el 100 %».
  const sinPar = [
    { r: +1, pasa: true },
    { r: -1, pasa: false },
  ]
  ok(
    mayorAportePorPar(medidor(sinPar), sinPar, (s) => s.pasa) === null,
    'señales sin `par` dan null en vez de un montón «undefined»',
  )
  ok(mayorAportePorPar(mide, null, (s) => s.pasa) === null, 'sin lista de señales es null')
}

console.log('')
if (fallos) {
  console.error(`✗ ${fallos} de ${hechas} comprobaciones fallaron.`)
  process.exit(1)
}
console.log(`✓ todo bien (${hechas} comprobaciones).`)
