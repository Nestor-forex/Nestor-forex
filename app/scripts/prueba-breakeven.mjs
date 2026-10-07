// Prueba de la simulación de breakeven y de su listón. Sin internet.
//
// Correr con: node scripts/prueba-breakeven.mjs
//
// Los casos van con mercados INVENTADOS a propósito, uno por cada cosa que hay
// que comprobar, porque con velas reales no se puede fabricar el caso exacto
// que distingue una regla de otra.

import {
  resolverUna,
  medirConBreakeven,
  concentracionDeLaMejora,
  clavesComunes,
  GANADA,
  PERDIDA,
  BREAKEVEN,
} from './lib/breakeven.mjs'
import { juzgar, NIVELES_ARMADO, MEJORA_MINIMA, CONCENTRACION_MAXIMA } from './lib/preregistro-breakeven.mjs'

let fallos = 0
const comprobar = (que, cond) => {
  console.log(`${cond ? '  OK  ' : '  MAL '} ${que}`)
  if (!cond) fallos++
}

// Un mercado de juguete: un par, fechas seguidas, y los máximos/mínimos que
// haga falta. La señal entra a 100, con stop en 90 (riesgo 10) y objetivo 110.
const FECHAS = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05']
const mercado = (highs, lows) => ({
  fechas: FECHAS,
  pares: [{ name: 'EUR/USD', highs, lows }],
})
const senal = (extra = {}) => ({
  id: 'EUR/USD|COMPRA|tendencia',
  vistoEl: '2026-01-01T00:00:00.000Z',
  cierre: '2026-01-01',
  par: 'EUR/USD',
  lado: 'COMPRA',
  precio: 100,
  sl: 90,
  tp: 110,
  pipRiesgo: 100,
  pipBeneficio: 100,
  ...extra,
})

console.log('\n1. Sin breakeven se comporta exactamente como el resolver')
// El día 2 toca el stop. El breakeven apagado tiene que dar PERDIDA.
comprobar(
  'toca el stop → perdida',
  resolverUna(senal(), mercado([100, 101, 101, 101, 101], [100, 89, 89, 89, 89]))?.resultado === PERDIDA
)
comprobar(
  'toca el objetivo → ganada',
  resolverUna(senal(), mercado([100, 111, 111, 111, 111], [100, 99, 99, 99, 99]))?.resultado === GANADA
)
comprobar(
  'empate en la misma vela → perdida (el stop manda)',
  resolverUna(senal(), mercado([100, 111, 111, 111, 111], [100, 89, 89, 89, 89]))?.resultado === PERDIDA
)

console.log('\n2. ⚠️ El día de la señal NO cuenta: la entrada es a su cierre')
// Si el día 1 ya tocara el stop, no puede contar: cuando la señal nació, ese
// precio ya había pasado.
comprobar(
  'un stop tocado el día de la señal se ignora',
  resolverUna(senal(), mercado([100, 101, 101, 101, 101], [80, 99, 99, 99, 99])) === null
)

console.log('\n3. Breakeven salva una operación que se habría perdido')
// Día 2: sube a 106 (arma a 0,5 del riesgo = 105) y no toca nada. Día 3: cae a
// la entrada. Sin breakeven seguiría hasta el stop el día 4.
{
  const m = mercado([100, 106, 101, 101, 101], [100, 100, 99, 89, 89])
  comprobar('sin breakeven → perdida', resolverUna(senal(), m, { armarEn: null })?.resultado === PERDIDA)
  comprobar(
    'con breakeven a 0,5 → breakeven',
    resolverUna(senal(), m, { armarEn: 0.5 })?.resultado === BREAKEVEN
  )
}

console.log('\n4. ⚠️⚠️ Y QUITA UNA QUE SE HABRÍA GANADO. Es la mitad que nadie cuenta')
// Día 2 arma a 106. Día 3 vuelve a la entrada. Día 4 se va al objetivo. Sin
// breakeven es GANADA; con breakeven te saca justo antes de lo bueno.
{
  const m = mercado([100, 106, 101, 115, 115], [100, 100, 99, 99, 99])
  comprobar('sin breakeven → ganada', resolverUna(senal(), m, { armarEn: null })?.resultado === GANADA)
  comprobar(
    'con breakeven a 0,5 → breakeven (objetivo perdido)',
    resolverUna(senal(), m, { armarEn: 0.5 })?.resultado === BREAKEVEN
  )
}

console.log('\n5. ⚠️⚠️ EL ARMADO NO CUENTA HASTA LA VELA SIGUIENTE (peor caso)')
// Una sola vela que sube a 106 (armaría) y se derrumba a 89 (stop). Con máximo
// y mínimo no se sabe el orden, así que NO se salva.
{
  const m = mercado([100, 106, 101, 101, 101], [100, 89, 99, 99, 99])
  comprobar(
    'arma y se derrumba en la MISMA vela → perdida, no breakeven',
    resolverUna(senal(), m, { armarEn: 0.5 })?.resultado === PERDIDA
  )
}
// Y la contraria, para que la regla no sea «nunca salva nada»: si arma un día y
// se derrumba al SIGUIENTE, sí salva.
{
  const m = mercado([100, 106, 101, 101, 101], [100, 100, 89, 89, 89])
  comprobar(
    'arma un día y se derrumba al siguiente → breakeven',
    resolverUna(senal(), m, { armarEn: 0.5 })?.resultado === BREAKEVEN
  )
}

console.log('\n6. ⚠️ Con el breakeven armado, la salida adversa manda sobre el objetivo')
// Día 2 arma. Día 3 toca la entrada Y el objetivo en la misma vela. Peor caso:
// sale en breakeven.
{
  const m = mercado([100, 106, 115, 115, 115], [100, 100, 99, 99, 99])
  comprobar(
    'entrada y objetivo en la misma vela con BE armado → breakeven',
    resolverUna(senal(), m, { armarEn: 0.5 })?.resultado === BREAKEVEN
  )
}

console.log('\n7. El nivel de armado importa: uno más alto arma menos veces')
{
  // Sube solo a 106, o sea arma a 0,5 (105) pero NO a 1,0 (110).
  const m = mercado([100, 106, 101, 101, 101], [100, 100, 99, 89, 89])
  comprobar('a 0,5 arma → breakeven', resolverUna(senal(), m, { armarEn: 0.5 })?.resultado === BREAKEVEN)
  comprobar('a 1,0 no arma → perdida', resolverUna(senal(), m, { armarEn: 1.0 })?.resultado === PERDIDA)
}

console.log('\n8. ⚠️ Breakeven NO sale a cero de dinero: paga spread y swap')
{
  const m = mercado([100, 106, 101, 101, 101], [100, 100, 99, 89, 89])
  const r = medirConBreakeven([senal()], m, { armarEn: 0.5, swapPipsNoche: 0 })
  comprobar('un breakeven cuenta como operación', r.ops === 1)
  comprobar('y su resultado es NEGATIVO, no 0', r.porRiesgo < 0)
  const conSwap = medirConBreakeven([senal()], m, { armarEn: 0.5, swapPipsNoche: 2 })
  comprobar('con swap es más negativo todavía', conSwap.porRiesgo < r.porRiesgo)
}

console.log('\n9. ⚠️ Lo que no se puede juzgar NO entra en las cuentas')
// Una señal que sigue viva no puede contar como breakeven: inflaría el
// resultado con operaciones a las que no ha pasado nada.
{
  const m = mercado([100, 101, 101, 101, 101], [100, 99, 99, 99, 99]) // no toca nada
  const r = medirConBreakeven([senal()], m, { armarEn: 0.5 })
  comprobar('sigue viva → 0 operaciones', r.ops === 0)
  comprobar('y se cuenta como sin juzgar', r.sinJuzgar === 1)
  comprobar('porRiesgo es null, no 0', r.porRiesgo === null)
}
comprobar('un par desconocido no se juzga', resolverUna(senal({ par: 'XXX/YYY' }), mercado([100], [100])) === null)
comprobar('una señal sin día no se juzga', resolverUna(senal({ cierre: undefined }), mercado([100], [100])) === null)
comprobar(
  'un riesgo de cero no se juzga (evita dividir por cero)',
  resolverUna(senal({ sl: 100 }), mercado([100, 101], [100, 99])) === null
)

console.log('\n10. La concentración se mide sobre LA MEJORA, y dice «no sé» si no hay mejora')
{
  const sinBE = { neto: -10, porPar: new Map([['EUR/USD', -6], ['GBP/USD', -4]]) }
  const conBE = { neto: -4, porPar: new Map([['EUR/USD', -1], ['GBP/USD', -3]]) }
  // Mejora total 6; EUR/USD aporta 5 de esos 6 = 83 %.
  const c = concentracionDeLaMejora(conBE, sinBE)
  comprobar(`un par que aporta 5 de 6 sale al 83 % (es ${(100 * c).toFixed(0)} %)`, Math.abs(c - 5 / 6) < 1e-9)
  comprobar('sin mejora → null, no 0', concentracionDeLaMejora(sinBE, sinBE) === null)
  comprobar('si empeora → null', concentracionDeLaMejora(sinBE, conBE) === null)
}

console.log('\n10b. ⚠️⚠️ Las dos columnas tienen que medir LAS MISMAS operaciones')
// El caso real que destapó esto: breakeven RESUELVE una operación que sin él
// seguiría viva al final de la serie, porque el stop en la entrada se toca
// antes que el stop original. Sin intersecar, la columna de breakeven tendría
// una operación que la de comparación no tiene.
{
  // El precio sube a 106 (arma), vuelve a la entrada el día 3, y NUNCA toca el
  // stop original ni el objetivo: sin breakeven sigue viva para siempre.
  const m = mercado([100, 106, 101, 101, 101], [100, 100, 99, 99, 99])
  const sin = medirConBreakeven([senal()], m, { armarEn: null })
  const con = medirConBreakeven([senal()], m, { armarEn: 0.5 })
  comprobar('sin breakeven sigue viva (0 ops)', sin.ops === 0)
  comprobar('con breakeven sí se resuelve (1 op)', con.ops === 1)

  const comunes = clavesComunes([sin, con])
  comprobar('la intersección está vacía: ninguna la saben juzgar las dos', comunes.size === 0)
  comprobar(
    'y midiendo sobre la intersección, las dos columnas dan 0 ops',
    medirConBreakeven([senal()], m, { armarEn: 0.5, soloClaves: comunes }).ops === 0
  )
}
{
  // Y la contraria, para que `clavesComunes` no sea «siempre vacío»: una que
  // las dos saben juzgar sí se queda.
  const m = mercado([100, 106, 101, 101, 101], [100, 100, 99, 89, 89])
  const sin = medirConBreakeven([senal()], m, { armarEn: null })
  const con = medirConBreakeven([senal()], m, { armarEn: 0.5 })
  const comunes = clavesComunes([sin, con])
  comprobar('una que las dos juzgan sí entra en la intersección', comunes.size === 1)
  comprobar(
    'y las dos columnas la miden',
    medirConBreakeven([senal()], m, { armarEn: null, soloClaves: comunes }).ops === 1 &&
      medirConBreakeven([senal()], m, { armarEn: 0.5, soloClaves: comunes }).ops === 1
  )
}
comprobar('sin medidas que cruzar, la intersección está vacía', clavesComunes([]).size === 0)

console.log('\n11. ⚠️ EL LISTÓN MUERDE: ocho resultados que fallan un criterio cada uno')
const bueno = () => ({
  sinBE: { porRiesgo: -0.05, porRiesgo1aMitad: -0.06, porRiesgo2aMitad: -0.04, ops: 1000, porRiesgoConSwap: -0.09 },
  niveles: [
    { armarEn: 0.25, porRiesgo: -0.02, porRiesgo1aMitad: -0.03, porRiesgo2aMitad: -0.01, ops: 1000, porRiesgoConSwap: -0.06 },
    { armarEn: 0.5, porRiesgo: -0.01, porRiesgo1aMitad: -0.02, porRiesgo2aMitad: -0.005, ops: 1000, porRiesgoConSwap: -0.05 },
    { armarEn: 0.75, porRiesgo: -0.02, porRiesgo1aMitad: -0.03, porRiesgo2aMitad: -0.01, ops: 1000, porRiesgoConSwap: -0.06 },
    { armarEn: 1.0, porRiesgo: -0.04, porRiesgo1aMitad: -0.05, porRiesgo2aMitad: -0.03, ops: 1000, porRiesgoConSwap: -0.08 },
    { armarEn: 1.5, porRiesgo: -0.05, porRiesgo1aMitad: -0.06, porRiesgo2aMitad: -0.04, ops: 1000, porRiesgoConSwap: -0.09 },
  ],
  concentracion: 0.2,
})
comprobar('el caso bueno PASA', juzgar(bueno()).pasa === true)

const roto = (f) => {
  const r = bueno()
  f(r)
  return juzgar(r)
}
comprobar('mejora por debajo del umbral → falla', roto((r) => r.niveles.forEach((n) => (n.porRiesgo = -0.045))).pasa === false)
comprobar(
  'empeora en la 2ª mitad → falla',
  roto((r) => (r.niveles[1].porRiesgo2aMitad = -0.05)).pasa === false
)
comprobar(
  'cambia el número de operaciones → falla',
  roto((r) => (r.niveles[1].ops = 900)).pasa === false
)
comprobar(
  'solo un nivel mejora → falla',
  roto((r) => {
    r.niveles[0].porRiesgo = -0.05
    r.niveles[2].porRiesgo = -0.05
  }).pasa === false
)
comprobar(
  'la mejora se cae pagando swap → falla',
  roto((r) => (r.niveles[1].porRiesgoConSwap = -0.085)).pasa === false
)
comprobar(
  'un solo par aporta la mejora → falla',
  roto((r) => (r.concentracion = 0.9)).pasa === false
)
comprobar('sin concentración medida → falla', roto((r) => (r.concentracion = null)).pasa === false)
comprobar('sin línea de comparación → falla', juzgar({ niveles: [] }).pasa === false)
comprobar('sin niveles medidos → falla', juzgar({ sinBE: { porRiesgo: -0.05 } }).pasa === false)

console.log('\n12. El listón sigue teniendo sus números, y son los que dice el informe')
comprobar(`se barren ${NIVELES_ARMADO.length} niveles de armado`, NIVELES_ARMADO.length >= 4)
comprobar('la mejora mínima es 0.02', MEJORA_MINIMA === 0.02)
comprobar('la concentración máxima es el 40 %', CONCENTRACION_MAXIMA === 0.4)

console.log(fallos === 0 ? '\n✓ todo bien.\n' : `\n✗ ${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
