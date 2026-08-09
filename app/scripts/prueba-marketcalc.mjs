// Prueba del cambio de fuente en el motor de cálculo. Sin internet:
//
//     node scripts/prueba-marketcalc.mjs
//
// Lo que más importa aquí es la primera comprobación: SIN velas reales, el
// resultado tiene que ser exactamente el de antes. Si eso se rompe, el
// cambio dejó de ser aditivo y estaría alterando la app en casos donde no
// debía.

import { computarBarrido } from '../src/lib/marketCalc.js'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}
const casi = (a, b, tol = 1e-9) => Math.abs(a - b) < tol

// 80 días de precios inventados pero con forma realista: una tendencia suave
// con vaivén. Hacen falta al menos 60 para el RSI y las EMAs.
const N = 80
const fechas = Array.from({ length: N }, (_, i) => `2026-01-${String(i + 1).padStart(3, '0')}`)

const rates = {}
const rangosPar = {}
fechas.forEach((d, i) => {
  const t = i / N
  rates[d] = {
    EUR: 0.92 - t * 0.02 + Math.sin(i / 3) * 0.002,
    GBP: 0.78 - t * 0.01 + Math.sin(i / 4) * 0.002,
    JPY: 150 + t * 5 + Math.sin(i / 5) * 0.8,
    CHF: 0.88 + Math.sin(i / 6) * 0.003,
    CAD: 1.36 + Math.sin(i / 7) * 0.004,
    AUD: 1.52 + Math.sin(i / 5) * 0.005,
    NZD: 1.66 + Math.sin(i / 8) * 0.005,
  }
})

// Los rangos se arman a partir de los cierres que salen del propio barrido,
// abriéndolos un 0.4% arriba y abajo: así el ATR real tiene que salir mayor
// que el de cierre a cierre, sí o sí.
const base = computarBarrido(fechas, rates)
const NOMBRES = base.pares.map((p) => p.name)
{
  // (sin usar: se dejó la reconstrucción explícita más abajo)
  
  
  fechas.forEach((d) => {
    const fila = {}
    for (const nombre of NOMBRES) {
      // Se reconstruye el cierre de ese día con la misma fórmula del motor.
      const [b, q] = nombre.split('/')
      const px = (b === 'USD' ? 1 : rates[d][b])
      const pq = (q === 'USD' ? 1 : rates[d][q])
      const c = pq / px
      fila[nombre] = { c, h: c * 1.004, l: c * 0.996 }
    }
    rangosPar[d] = fila
  })
}

console.log('\n1. Sin velas reales: idéntico a como estaba')
{
  const a = computarBarrido(fechas, rates)
  const p = a.pares[0]

  // La fórmula vieja, escrita aquí a mano para comparar contra ella.
  const closes = p.serie20
  void closes
  const cierresPar = fechas.map((d) => {
    const [b, q] = p.name.split('/')
    return (q === 'USD' ? 1 : rates[d][q]) / (b === 'USD' ? 1 : rates[d][b])
  })
  const L = cierresPar.length - 1
  let sum = 0
  for (let i = L - 13; i <= L; i++) sum += Math.abs(cierresPar[i] - cierresPar[i - 1]) / cierresPar[i - 1]
  const atrPctViejo = (sum / 14) * 100

  comprobar(casi(p.atrPct, atrPctViejo, 1e-8), `el ATR es el de siempre (${p.atrPct.toFixed(4)}%)`)
  comprobar(
    casi(p.hi20, Math.max(...cierresPar.slice(-20))),
    'los soportes salen de los cierres, como antes'
  )
}

console.log('\n2. Con velas reales: el ATR sube y los niveles se ensanchan')
{
  const viejo = computarBarrido(fechas, rates).pares[0]
  const nuevo = computarBarrido(fechas, rates, rangosPar).pares[0]

  comprobar(nuevo.atrPct > viejo.atrPct, `el ATR real es mayor (${viejo.atrPct.toFixed(3)}% → ${nuevo.atrPct.toFixed(3)}%)`)
  comprobar(nuevo.hi20 > viejo.hi20, 'la resistencia sube al usar los máximos reales')
  comprobar(nuevo.lo20 < viejo.lo20, 'el soporte baja al usar los mínimos reales')
  comprobar(nuevo.hi10 > viejo.hi10 && nuevo.lo10 < viejo.lo10, 'lo mismo en la ventana de 10')
}

console.log('\n3. El gráfico sigue dibujando cierres, no máximos')
{
  const nuevo = computarBarrido(fechas, rates, rangosPar).pares[0]
  const [b, q] = nuevo.name.split('/')
  const cierres = fechas.map((d) => (q === 'USD' ? 1 : rates[d][q]) / (b === 'USD' ? 1 : rates[d][b]))

  comprobar(nuevo.serie20.length === 20, 'son 20 puntos')
  comprobar(
    casi(nuevo.serie20.at(-1), cierres.at(-1)),
    'el último punto es el CIERRE, no el máximo del día'
  )
  comprobar(nuevo.serie20.at(-1) < nuevo.hi20, 'y por tanto queda por debajo de la resistencia')
}

console.log('\n4. Lo demás no se movió')
{
  const viejo = computarBarrido(fechas, rates)
  const nuevo = computarBarrido(fechas, rates, rangosPar)

  comprobar(casi(nuevo.pares[0].c, viejo.pares[0].c), 'el precio actual es el mismo')
  comprobar(casi(nuevo.pares[0].e20, viejo.pares[0].e20), 'la EMA20 es la misma (va sobre cierres)')
  comprobar(casi(nuevo.pares[0].rsiV, viejo.pares[0].rsiV), 'el RSI es el mismo (va sobre cierres)')
  comprobar(
    JSON.stringify(nuevo.esc) === JSON.stringify(viejo.esc),
    'la fuerza relativa de las divisas no cambia'
  )
  comprobar(nuevo.pares.length === 14, 'siguen siendo los 14 pares')
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(fallos ? 1 : 0)
