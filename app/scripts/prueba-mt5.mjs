// Comprueba que la app entiende lo que devuelve el puente de MetaTrader 5.
//
// No necesita internet ni que el puente esté encendido: son comprobaciones
// sobre el texto que llega. Existe porque el puente lo escribió Néstor y su
// formato exacto puede cambiar: si un día cambia y la app deja de entenderlo,
// esta prueba lo dice en un segundo en vez de aparecer como una tabla vacía en
// el celular sin ninguna explicación.
//
//   node scripts/prueba-mt5.mjs

import { normalizarRespuesta } from '../src/lib/useMT5Quotes.js'

let fallos = 0
const ok = (cond, que) => {
  console.log(`${cond ? '  ok  ' : ' FALLA'} ${que}`)
  if (!cond) fallos++
}
const casi = (a, b, tol = 1e-9) => Math.abs(a - b) < tol

// --- Las tres formas razonables de responder --------------------------------

const esperado = { 'EUR/USD': 1.1547, 'USD/JPY': 158.92 }

const lista = normalizarRespuesta([
  { symbol: 'EURUSD', bid: 1.1547, ask: 1.1548 },
  { symbol: 'USDJPY', bid: 158.92, ask: 158.93 },
])
ok(lista['EUR/USD']?.bid === esperado['EUR/USD'], 'lista pelada de objetos')

const envuelta = normalizarRespuesta({
  quotes: [
    { symbol: 'EURUSD', bid: 1.1547, ask: 1.1548 },
    { symbol: 'USDJPY', bid: 158.92, ask: 158.93 },
  ],
})
ok(envuelta['USD/JPY']?.bid === esperado['USD/JPY'], 'lista dentro de `quotes`')

const enData = normalizarRespuesta({ data: [{ symbol: 'EURUSD', bid: 1.1547, ask: 1.1548 }] })
ok(enData['EUR/USD']?.ask === 1.1548, 'lista dentro de `data`')

const mapa = normalizarRespuesta({
  EURUSD: { bid: 1.1547, ask: 1.1548 },
  USDJPY: { bid: 158.92, ask: 158.93 },
})
ok(mapa['EUR/USD']?.bid === 1.1547 && mapa['USD/JPY']?.ask === 158.93, 'objeto con el par como llave')

// --- Nombres de campo en mayúscula (FastAPI + pydantic los deja como se
// declaren, y MT5 los expone capitalizados) ---------------------------------

const mayus = normalizarRespuesta([{ Symbol: 'EURUSD', Bid: 1.1547, Ask: 1.1548 }])
ok(mayus['EUR/USD']?.bid === 1.1547, 'campos en mayúscula (Symbol/Bid/Ask)')

const enTexto = normalizarRespuesta([{ symbol: 'EURUSD', bid: '1.1547', ask: '1.1548' }])
ok(enTexto['EUR/USD']?.bid === 1.1547, 'números que llegan como texto')

// --- Sufijos del bróker -----------------------------------------------------
//
// AvaTrade y otros añaden un sufijo al símbolo según el tipo de cuenta. Si no
// se limpiara, 'EURUSD.r' no coincidiría con ningún par de la app y la tabla
// saldría vacía sin decir por qué.

for (const sim of ['EURUSD', 'EURUSD.r', 'EURUSDm', 'EURUSD_i', 'eurusd']) {
  const r = normalizarRespuesta([{ symbol: sim, bid: 1.1547, ask: 1.1548 }])
  ok(Boolean(r['EUR/USD']), `sufijo del bróker: ${sim} → EUR/USD`)
}

// --- El spread se calcula del bid y el ask, en pips -------------------------
//
// A propósito NO se usa el campo `spread` que manda MT5: viene en "puntos",
// que en un bróker de 5 dígitos son diez veces un pip. Mezclar las dos
// unidades haría que un spread de 1.2 pips se viera como 12.

const sp = normalizarRespuesta([{ symbol: 'EURUSD', bid: 1.1547, ask: 1.15482, spread: 12 }])
ok(casi(sp['EUR/USD'].spread, 1.2, 1e-6), 'spread en pips, no en puntos (1.2, no 12)')

const spJpy = normalizarRespuesta([{ symbol: 'USDJPY', bid: 158.92, ask: 158.933 }])
ok(casi(spJpy['USD/JPY'].spread, 1.3, 1e-6), 'spread en pares con JPY (pip = 0.01)')

ok(sp['EUR/USD'].dec === 5 && spJpy['USD/JPY'].dec === 3, 'decimales: 5 normal, 3 en JPY')

// --- Basura: nunca debe reventar, solo ignorar lo que no sirve --------------

ok(Object.keys(normalizarRespuesta(null)).length === 0, 'respuesta null')
ok(Object.keys(normalizarRespuesta([])).length === 0, 'lista vacía')
ok(Object.keys(normalizarRespuesta('no soy json')).length === 0, 'texto suelto')
ok(Object.keys(normalizarRespuesta([{ symbol: 'EURUSD' }])).length === 0, 'sin bid ni ask, se descarta')
ok(Object.keys(normalizarRespuesta([{ symbol: 'EUR', bid: 1, ask: 1 }])).length === 0, 'símbolo demasiado corto')
ok(
  Object.keys(normalizarRespuesta([{ symbol: 'EURUSD', bid: 'x', ask: 'y' }])).length === 0,
  'bid/ask que no son números'
)

const mezcla = normalizarRespuesta([
  { symbol: 'EURUSD', bid: 1.1547, ask: 1.1548 },
  { symbol: 'ROTO' },
  { symbol: 'USDJPY', bid: 158.92, ask: 158.93 },
])
ok(Object.keys(mezcla).length === 2, 'una fila rota no tumba a las buenas')

console.log(fallos ? `\n${fallos} comprobación(es) fallaron.` : '\nTodo bien.')
process.exit(fallos ? 1 : 0)
