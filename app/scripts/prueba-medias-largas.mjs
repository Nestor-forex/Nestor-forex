// Prueba de las MEDIAS LARGAS (2026-11-14). Sin internet ni créditos:
//
//     node scripts/prueba-medias-largas.mjs
//
// Néstor preguntó si traer 800 velas para la EMA de 200 «cambia los cálculos de
// Swing». Con la forma en que se hizo, NO — y esto es lo que lo comprueba.
//
// Lo que no puede pasar nunca, en este orden de gravedad:
//   1. que al pedir más velas cambie el barrido (ATR, stop, señales): el
//      historial dejaría de describir una sola cosa a mitad de camino;
//   2. que la media larga salga de una serie que termina OTRO día;
//   3. que el vigía o el publicador dejen de pedirla en la misma consulta.

import { readFileSync } from 'node:fs'
import { CCY, PAIRS, cierresLargos, computarBarrido } from '../src/lib/marketCalc.js'
import { VELAS_MEDIAS, recortarUltimas } from './lib/velas.mjs'
import { VECES_EMA } from '../src/lib/medias.js'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// Un mercado inventado de `n` días hábiles, determinista: cada divisa con una
// onda propia y un paseo pequeño, para que haya divergencia y retrocesos.
function mercado(n) {
  const fechas = []
  const d = new Date(Date.UTC(2023, 0, 2))
  while (fechas.length < n) {
    const dia = d.getUTCDay()
    if (dia !== 0 && dia !== 6) fechas.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  const base = { EUR: 0.92, GBP: 0.79, JPY: 150, CHF: 0.88, AUD: 1.52, NZD: 1.64, CAD: 1.36 }
  let semilla = 7
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647 - 0.5)
  const nivel = Object.fromEntries(Object.keys(base).map((c) => [c, 0]))
  const rates = {}
  const rangosPar = {}
  fechas.forEach((f, i) => {
    const fila = {}
    for (const [k, c] of Object.keys(base).entries()) {
      nivel[c] += azar() * 0.004
      fila[c] = base[c] * (1 + 0.03 * Math.sin(i / (9 + k * 3) + k) + nivel[c])
    }
    rates[f] = fila
    const r = {}
    for (const [b, q] of PAIRS) {
      const v = (q === 'USD' ? 1 : fila[q]) / (b === 'USD' ? 1 : fila[b])
      r[`${b}/${q}`] = { h: v * 1.003, l: v * 0.997, c: v }
    }
    rangosPar[f] = r
  })
  return { fechas, rates, rangosPar }
}

console.log('\n1. Pedir más días NO cambia los últimos 300')
{
  const m = new Map([
    ['2026-01-03', { c: 3 }],
    ['2026-01-01', { c: 1 }],
    ['2026-01-04', { c: 4 }],
    ['2026-01-02', { c: 2 }],
  ])
  const r = recortarUltimas({ 'EUR/USD': m }, 2)
  comprobar(JSON.stringify([...r['EUR/USD'].keys()]) === '["2026-01-03","2026-01-04"]', 'se queda con los N más recientes aunque lleguen desordenados')
  comprobar(r['EUR/USD'].get('2026-01-04').c === 4, 'y con sus valores intactos')
  comprobar(VELAS_MEDIAS * (5 / 7) >= 200 * VECES_EMA, `${VELAS_MEDIAS} días de calendario dan ≥ ${200 * VECES_EMA} de mercado, los que pide la EMA 200`)
}

console.log('\n2. El barrido sale IDÉNTICO con y sin la serie larga')
{
  const largo = mercado(700)
  const corto = {
    fechas: largo.fechas.slice(-215),
    rates: Object.fromEntries(largo.fechas.slice(-215).map((f) => [f, largo.rates[f]])),
    rangosPar: Object.fromEntries(largo.fechas.slice(-215).map((f) => [f, largo.rangosPar[f]])),
  }
  const sin = computarBarrido(corto.fechas, corto.rates, corto.rangosPar)
  const con = computarBarrido(corto.fechas, corto.rates, corto.rangosPar, {
    largo: { fechas: largo.fechas, rates: largo.rates },
  })
  const quitarMedias = (x) => JSON.stringify({ ...x, pares: x.pares.map(({ medias: _medias, ...resto }) => resto) })
  comprobar(quitarMedias(sin) === quitarMedias(con), 'todo lo que no son las medias es idéntico (ATR, RSI, EMA de la app, fuerza, extremos…)')
  const ema200 = (b) => b.pares[0].medias.ema.find((e) => e.p === 200)?.v
  comprobar(ema200(sin) === null, 'sin la serie larga la EMA 200 sale vacía (como hasta hoy)')
  comprobar(typeof ema200(con) === 'number', 'con la serie larga la EMA 200 sale con número')
  const sma20 = (b) => b.pares[0].medias.sma.find((e) => e.p === 20)?.v
  comprobar(Math.abs(sma20(sin) - sma20(con)) < 1e-12, 'la SMA 20 da lo mismo por los dos caminos (son los mismos 20 cierres)')
}

console.log('\n3. Una serie larga que termina OTRO día no se usa')
{
  const m = mercado(700)
  const ayer = m.fechas.slice(0, -1)
  comprobar(cierresLargos({ fechas: ayer, rates: m.rates }, 'EUR', 'USD', m.fechas.at(-1)) === null, 'si acaba un día antes → null, y se usan los cierres de siempre')
  comprobar(Array.isArray(cierresLargos({ fechas: m.fechas, rates: m.rates }, 'EUR', 'USD', m.fechas.at(-1))), 'si acaba el mismo día → la serie larga')
  comprobar(cierresLargos(null, 'EUR', 'USD', m.fechas.at(-1)) === null, 'sin serie larga → null')
  const roto = { ...m.rates, [m.fechas[5]]: { ...m.rates[m.fechas[5]], EUR: NaN } }
  comprobar(cierresLargos({ fechas: m.fechas, rates: roto }, 'EUR', 'USD', m.fechas.at(-1)) === null, 'con un dato roto dentro → null, nunca una media inventada')
  comprobar(CCY.includes('USD'), '(el dólar vale 1 y no viene en las tasas)')
}

console.log('\n4. El vigía y el publicador la piden, en la MISMA consulta')
{
  for (const g of ['vigia.mjs', 'publicar-barrido.mjs']) {
    const s = readFileSync(new URL(`./${g}`, import.meta.url), 'utf8')
    comprobar(/obtenerVelas\(leerLlave\(\), \{ velasLargas: VELAS_MEDIAS \}\)/.test(s), `${g} pide la serie larga`)
    comprobar(/computarBarrido\(fechas, rates, rangosPar, \{ largo \}\)/.test(s), `${g} se la pasa al barrido`)
  }
  const v = readFileSync(new URL('./lib/velas.mjs', import.meta.url), 'utf8')
  comprobar(/recortarUltimas\(porParTodo, velas\)/.test(v), 'velas.mjs arma el barrido de siempre con los últimos `velas` días')
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(fallos ? 1 : 0)
