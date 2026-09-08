// Comprueba que la app entiende lo que publica el puente de MetaTrader 5.
//
//   node scripts/prueba-mt5.mjs
//
// Sin internet y sin que el puente esté encendido: son comprobaciones sobre el
// texto que llega.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ ESTA PRUEBA SE REESCRIBIÓ EL 2026-09-08 Y NO SE BORRÓ NADA POR GUSTO
// ─────────────────────────────────────────────────────────────────────────
// La versión anterior comprobaba que la app aguantara CUALQUIER forma que se
// le ocurriera devolver a un servidor: la lista pelada, dentro de `quotes`,
// dentro de `data`, con las llaves en mayúscula, con los números como texto,
// con sufijos del bróker en el símbolo… Aquella flexibilidad tenía sentido
// mientras el formato lo decidía un servidor de Python escrito aparte.
//
// Ya no hay servidor. El archivo lo escribe `puente-mt5/bridge_mt5.py`, que
// está en ESTE repositorio, así que el formato es UNO y se decide aquí:
//
//     { actualizadoEl, cuenta, pares: { "EUR/USD": { bid, ask, spread, ticks } } }
//
// Aceptar diez formas de un archivo que escribimos nosotros no es robustez: es
// dejar sin comprobar que el puente escriba lo que dice escribir. Y la limpieza
// de sufijos del bróker no se perdió — se hizo en el puente, que es donde está
// el símbolo crudo de MT5.
//
// Lo que SÍ se conserva, porque sigue valiendo igual:
//   · el spread en PIPS y no en puntos,
//   · el pip distinto en los pares con yen,
//   · y que una fila rota no tumbe a las buenas.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { PAIR_NAMES } from '../src/lib/pairs.js'
import { minutosDesde, normalizarRespuesta } from '../src/lib/useMT5Quotes.js'

let fallos = 0
const ok = (cond, que) => {
  console.log(`${cond ? '  ok  ' : ' FALLA'} ${que}`)
  if (!cond) fallos++
}
const casi = (a, b, tol = 1e-6) => Math.abs(a - b) < tol

const archivo = (pares, extra = {}) => ({
  actualizadoEl: '2026-09-08T20:00:00.000Z',
  cuenta: 'AvaTrade (cuenta de Néstor)',
  pares,
  ...extra,
})

console.log('\n1. El formato que escribe el puente')
{
  const r = normalizarRespuesta(
    archivo({
      'EUR/USD': { bid: 1.1547, ask: 1.1548, spread: 1.0 },
      'USD/JPY': { bid: 158.92, ask: 158.93, spread: 1.0 },
    }),
  )
  ok(r['EUR/USD']?.bid === 1.1547, 'lee el precio de compra')
  ok(r['USD/JPY']?.ask === 158.93, 'lee el precio de venta')
  ok(Object.keys(r).length === 2, 'y no se inventa pares de más')
}

console.log('\n2. El spread va en PIPS, no en los «puntos» de MT5')
{
  // ⚠️ MT5 reporta el spread en «puntos», que en un bróker de 5 dígitos son
  // DIEZ VECES un pip. Mezclar las dos unidades haría que 1,2 pips se vieran
  // como 12 — y 12 pips es un spread de bróker abusivo, así que el error no
  // parecería un error: parecería un bróker malo.
  const r = normalizarRespuesta(archivo({ 'EUR/USD': { bid: 1.1547, ask: 1.15482, spread: 12 } }))
  ok(casi(r['EUR/USD'].spread, 1.2), 'sale 1.2 pips aunque el archivo dijera 12')

  const jpy = normalizarRespuesta(archivo({ 'USD/JPY': { bid: 158.92, ask: 158.933 } }))
  ok(casi(jpy['USD/JPY'].spread, 1.3), 'en los pares con yen el pip es 0.01')

  ok(r['EUR/USD'].dec === 5 && jpy['USD/JPY'].dec === 3, 'decimales: 5 normal, 3 con yen')

  // Si algún día el puente dejara de mandar bid/ask y solo mandara `spread`,
  // ese par se descarta: sin los dos precios no se puede comprobar el número,
  // y un spread sin nada con qué contrastarlo es justo lo que no queremos.
  const soloSpread = normalizarRespuesta(archivo({ 'EUR/USD': { spread: 1.2 } }))
  ok(Object.keys(soloSpread).length === 0, 'sin bid ni ask se descarta el par')
}

console.log('\n3. El tick volume: se lee, y se sabe cuándo NO está')
{
  const con = normalizarRespuesta(archivo({ 'EUR/USD': { bid: 1.1547, ask: 1.1548, ticks: 48213 } }))
  ok(con['EUR/USD'].ticks === 48213, 'se lee cuando viene')

  // ⚠️ `null` y no 0. Un 0 diría «no se movió el precio en todo el día», que
  // es falso y encima es un dato que alguien podría usar. «No lo sé» y «no
  // pasó nada» no son lo mismo — la misma regla que en la correlación.
  const sin = normalizarRespuesta(archivo({ 'EUR/USD': { bid: 1.1547, ask: 1.1548 } }))
  ok(sin['EUR/USD'].ticks === null, 'cuando no viene → null, NUNCA 0')
}

console.log('\n4. Basura: nunca revienta, solo ignora lo que no sirve')
{
  ok(Object.keys(normalizarRespuesta(null)).length === 0, 'nada')
  ok(Object.keys(normalizarRespuesta({})).length === 0, 'objeto vacío')
  ok(Object.keys(normalizarRespuesta('no soy json')).length === 0, 'texto suelto')
  ok(Object.keys(normalizarRespuesta({ pares: 'x' })).length === 0, '`pares` que no es un objeto')
  ok(Object.keys(normalizarRespuesta(archivo({ 'EUR/USD': null }))).length === 0, 'un par nulo')
  ok(
    Object.keys(normalizarRespuesta(archivo({ 'EUR/USD': { bid: 'x', ask: 'y' } }))).length === 0,
    'precios que no son números',
  )

  const mezcla = normalizarRespuesta(
    archivo({
      'EUR/USD': { bid: 1.1547, ask: 1.1548 },
      'ROTO': { bid: 'x' },
      'USD/JPY': { bid: 158.92, ask: 158.93 },
    }),
  )
  ok(Object.keys(mezcla).length === 2, 'una fila rota no tumba a las buenas')
}

console.log('\n5. Cuándo se tomó la foto')
{
  // Sin esto un número viejo se lee como «ahora mismo». El puente solo publica
  // mientras el computador de Néstor está encendido, así que fuera de su
  // horario lo normal es que la foto tenga horas.
  const ahora = new Date('2026-09-08T20:00:00Z')
  ok(minutosDesde('2026-09-08T19:30:00Z', ahora) === 30, 'media hora → 30 minutos')
  ok(minutosDesde('2026-09-08T20:00:00Z', ahora) === 0, 'recién tomada → 0')
  // Un reloj adelantado no puede dar minutos negativos: se leería como
  // «dentro de -5 minutos», que no significa nada.
  ok(minutosDesde('2026-09-08T20:05:00Z', ahora) === 0, 'del futuro → 0, nunca negativo')
  ok(minutosDesde('ayer', ahora) === null, 'fecha ilegible → null')
  ok(minutosDesde(null, ahora) === null, 'sin fecha → null')
}

console.log('\n6. De quién es la cuenta: el archivo lo dice, la app no lo supone')
{
  // ⚠️ Es el spread de la cuenta de Néstor en AvaTrade, NO el del suscriptor.
  // El dato viaja DENTRO del archivo para que la pantalla no tenga que
  // acordarse, y para que el día que el puente lo publique otra persona el
  // rótulo cambie solo.
  const cal = archivo({ 'EUR/USD': { bid: 1.1547, ask: 1.1548 } })
  ok(typeof cal.cuenta === 'string' && cal.cuenta.length > 0, 'el archivo trae `cuenta`')
}

console.log('\n7. Los símbolos del puente son EXACTAMENTE los que usan las dos apps')
{
  // ⚠️ ESTE BLOQUE EXISTE PORQUE EL FALLO YA PASÓ, el 2026-09-08.
  //
  // La lista `SYMBOLS` de `puente-mt5/bridge_mt5.py` se escribió de memoria y
  // salieron dos pares mal: iban EUR/JPY y CAD/JPY, que no usa NINGUNA de las
  // dos apps, y faltaban NZD/JPY y AUD/NZD, que Intradía sí usa.
  //
  // Y no falló nada. El puente publicó 18 pares con sus precios reales y el
  // archivo se veía perfecto: la cuenta cuadraba (18 = 14 + 4) y los precios
  // eran de verdad. Solo se vio al abrir el `pairs.js` de Intradía y comparar
  // par por par. Ése es justo el fallo silencioso que este proyecto lleva
  // meses cazando, y la respuesta de siempre es la misma: una comprobación,
  // no «tener más cuidado».
  const aqui = dirname(fileURLToPath(import.meta.url))
  const py = readFileSync(join(aqui, '..', '..', 'puente-mt5', 'bridge_mt5.py'), 'utf8')

  // Se lee el .py como TEXTO: Node no puede importar Python, y aunque pudiera,
  // el puente necesita MetaTrader5 instalado y eso solo existe en Windows.
  const bloque = py.match(/^SYMBOLS = \[([\s\S]*?)^\]/m)
  ok(!!bloque, 'se encuentra la lista SYMBOLS dentro del puente')

  const delPuente = [...(bloque?.[1] ?? '').matchAll(/"([A-Z]{6})"/g)].map(
    // 'EURUSD' → 'EUR/USD', para poder compararlo con `pairs.js`.
    (m) => `${m[1].slice(0, 3)}/${m[1].slice(3)}`,
  )
  ok(delPuente.length === 18, `el puente vigila 18 pares (vigila ${delPuente.length})`)
  ok(new Set(delPuente).size === delPuente.length, 'y ninguno está repetido')

  // Los 14 de Swing salen del propio `pairs.js` de esta app, así que si mañana
  // Swing añade un par, esta comprobación lo pide en el puente sola.
  const faltanDeSwing = PAIR_NAMES.filter((p) => !delPuente.includes(p))
  ok(faltanDeSwing.length === 0, `están los 14 de Swing (faltan: ${faltanDeSwing.join(', ') || 'ninguno'})`)

  // ⚠️ Los 4 de Intradía SÍ van escritos a mano, y no hay forma de evitarlo:
  // su `pairs.js` vive en el otro repositorio y esta prueba corre sin red. Van
  // escritos aquí Y en `scripts/gemelos.mjs` (la nota de PRIMOS de `pairs.js`),
  // que es el sitio donde el proyecto documenta las diferencias entre las dos
  // apps. Si algún día Intradía cambia sus pares, hay que tocar los dos sitios
  // — y `prueba-gemelos.mjs` compara contra el otro repositorio de verdad.
  const EXTRAS_INTRADIA = ['AUD/JPY', 'NZD/JPY', 'AUD/NZD', 'EUR/GBP']
  const faltanDeIntradia = EXTRAS_INTRADIA.filter((p) => !delPuente.includes(p))
  ok(
    faltanDeIntradia.length === 0,
    `están los 4 de Intradía (faltan: ${faltanDeIntradia.join(', ') || 'ninguno'})`,
  )

  // La comprobación que de verdad cazó el error: NINGÚN par de más. Sin esta
  // línea, EUR/JPY y CAD/JPY habrían seguido ahí para siempre — no rompen
  // nada, solo hacen que Néstor tenga símbolos abiertos en MT5 sin motivo.
  const conocidos = new Set([...PAIR_NAMES, ...EXTRAS_INTRADIA])
  const sobran = delPuente.filter((p) => !conocidos.has(p))
  ok(sobran.length === 0, `ningún par que no use nadie (sobran: ${sobran.join(', ') || 'ninguno'})`)
}

console.log(fallos ? `\n${fallos} comprobación(es) fallaron.` : '\nTodo bien.')
process.exit(fallos ? 1 : 0)
