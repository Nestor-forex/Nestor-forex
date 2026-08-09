// Mide qué cambia al pasar de los cierres del BCE a las velas diarias reales.
//
// NO cambia nada: solo descarga los datos y calcula el barrido de las dos
// maneras, para poder decidir con números en vez de con intuición. Corre en
// GitHub Actions porque el entorno de la sesión de Claude tiene bloqueado
// api.twelvedata.com.
//
// Qué se compara y por qué importa:
//
//   · ATR. Hoy sale del movimiento de CIERRE A CIERRE, así que ignora todo lo
//     que el precio se movió dentro del día. El real es mayor. Y como el stop
//     se calcula a partir del ATR, un ATR pequeño de más significa stops
//     demasiado ajustados: la operación era buena y el stop la sacó por ruido
//     que los datos ni siquiera veían.
//
//   · Soportes y resistencias. Hoy son el mayor y el menor de los CIERRES.
//     Pero los niveles que importan están donde el precio llegó y se
//     devolvió, y eso son los extremos, no los cierres.
//
//   · Y lo que de verdad decide: CUÁNTAS SEÑALES pasan el filtro de R/B 1:1.5
//     con cada método. Si el número cambia mucho, hay que revisar el umbral
//     antes de adoptar el cambio.
//
// ⚠️ La primera versión de esta medición derivaba los cruces (EUR/CHF…) a
// partir de las divisas contra el dólar, y daba ATR un 400% mayor del real en
// ellos: al combinar el máximo de una divisa con el mínimo de la otra se
// inventa un rango que nunca existió. Ahora `velas.mjs` pide los 14 pares
// directamente, así que estos números son los de verdad en todos.

import { PAIRS } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'

const RB_MINIMO = 1.5

// La de hoy: promedio de |cierre − cierre anterior| de los últimos 14 días.
function atrCierres(closes) {
  const L = closes.length - 1
  let sum = 0
  for (let i = L - 13; i <= L; i++) sum += Math.abs(closes[i] - closes[i - 1]) / closes[i - 1]
  return ((sum / 14) * 100 * closes[L]) / 100
}

// La de verdad (Wilder): el mayor de —rango del día, distancia del máximo al
// cierre anterior, distancia del mínimo al cierre anterior—. Cuenta el hueco
// entre días, que el método de arriba se pierde entero.
function atrWilder(highs, lows, closes, p = 14) {
  const tr = []
  for (let i = 1; i < closes.length; i++) {
    tr.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
    )
  }
  if (tr.length < p) return 0
  let a = tr.slice(0, p).reduce((x, y) => x + y, 0) / p
  for (let i = p; i < tr.length; i++) a = (a * (p - 1) + tr[i]) / p
  return a
}

// Las mismas fórmulas de stop y objetivo que usa la app.
function niveles({ c, atrAbs, hi20, lo20, hi10, lo10 }, compra) {
  const sl = compra ? lo10 - 0.5 * atrAbs : hi10 + 0.5 * atrAbs
  const tp = compra ? Math.max(hi20, c + 2 * atrAbs) : Math.min(lo20, c - 2 * atrAbs)
  return { sl, tp, rr: Math.abs(tp - c) / Math.abs(c - sl) }
}

// --------------------------------------------------------------------------

const { fechas, rangosPar } = await obtenerVelas(leerLlave())
const L = fechas.length - 1

console.log('---COMPARACION-INICIO---')
console.log(`Días descargados: ${fechas.length} · último: ${fechas[L]}`)
console.log('(los 14 pares pedidos directamente: máximos y mínimos reales)')
console.log('')
console.log('par        ATR% viejo  ATR% nuevo   cambio   R/B viejo  R/B nuevo   pips riesgo v→n')
console.log('─'.repeat(88))

let pasanViejo = 0
let pasanNuevo = 0
const cambiosAtr = []

for (const [b, q] of PAIRS) {
  const nombre = `${b}/${q}`
  const closes = fechas.map((d) => rangosPar[d][nombre].c)
  const highs = fechas.map((d) => rangosPar[d][nombre].h)
  const lows = fechas.map((d) => rangosPar[d][nombre].l)
  const c = closes[L]
  const dec = b === 'JPY' || q === 'JPY' ? 2 : 4
  const pip = dec === 2 ? 0.01 : 0.0001

  const atrV = atrCierres(closes)
  const atrN = atrWilder(highs, lows, closes)

  // Viejo: extremos de los cierres. Nuevo: extremos reales.
  const viejo = {
    c,
    atrAbs: atrV,
    hi20: Math.max(...closes.slice(-20)),
    lo20: Math.min(...closes.slice(-20)),
    hi10: Math.max(...closes.slice(-10)),
    lo10: Math.min(...closes.slice(-10)),
  }
  const nuevo = {
    c,
    atrAbs: atrN,
    hi20: Math.max(...highs.slice(-20)),
    lo20: Math.min(...lows.slice(-20)),
    hi10: Math.max(...highs.slice(-10)),
    lo10: Math.min(...lows.slice(-10)),
  }

  // Se compara del lado de la compra; el de la venta es simétrico.
  const nv = niveles(viejo, true)
  const nn = niveles(nuevo, true)

  if (nv.rr >= RB_MINIMO) pasanViejo++
  if (nn.rr >= RB_MINIMO) pasanNuevo++

  const atrPctV = (atrV / c) * 100
  const atrPctN = (atrN / c) * 100
  const cambio = Math.round((atrPctN / atrPctV - 1) * 100)
  cambiosAtr.push(cambio)

  console.log(
    `${nombre.padEnd(9)} ` +
      `${atrPctV.toFixed(3).padStart(10)} ${atrPctN.toFixed(3).padStart(11)} ` +
      `${(cambio > 0 ? '+' : '') + cambio + '%'}`.padStart(9) +
      `${nv.rr.toFixed(2).padStart(11)} ${nn.rr.toFixed(2).padStart(10)}   ` +
      `${Math.round(Math.abs(c - nv.sl) / pip)} → ${Math.round(Math.abs(c - nn.sl) / pip)}`
  )
}

const ordenados = [...cambiosAtr].sort((a, b) => a - b)
const mediana = ordenados[Math.floor(ordenados.length / 2)]

console.log('─'.repeat(88))
console.log('')
// Se usa la mediana y no el promedio: un solo par raro desplaza el promedio y
// haría parecer general lo que es una excepción.
console.log(`El ATR real es un ${mediana}% mayor que el de cierre a cierre (mediana).`)
console.log(`Rango del cambio: de ${ordenados[0]}% a ${ordenados.at(-1)}%.`)
console.log('')
console.log(`Señales que pasan el filtro R/B ${RB_MINIMO} (lado compra):`)
console.log(`   con el método de hoy : ${pasanViejo} de ${PAIRS.length}`)
console.log(`   con velas reales     : ${pasanNuevo} de ${PAIRS.length}`)
console.log('')
console.log('Cómo leerlo: si "pips riesgo" sube de forma pareja en todos los pares,')
console.log('los stops de hoy estaban demasiado ajustados. Si algún par se dispara')
console.log('muy por encima del resto, sospechar de los datos antes que del mercado.')
console.log('---COMPARACION-FIN---')
