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

import { CCY, PAIRS } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'

const RB_MINIMO = 1.5

// --- las dos formas de medir la volatilidad -------------------------------

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

// --- el setup, con las mismas fórmulas que la app -------------------------

function niveles({ c, atrAbs, hi20, lo20, hi10, lo10 }, compra) {
  const sl = compra ? lo10 - 0.5 * atrAbs : hi10 + 0.5 * atrAbs
  const tp = compra ? Math.max(hi20, c + 2 * atrAbs) : Math.min(lo20, c - 2 * atrAbs)
  const rr = Math.abs(tp - c) / Math.abs(c - sl)
  return { sl, tp, rr }
}

// --------------------------------------------------------------------------

const { barras, rates, rangos } = await obtenerVelas(leerLlave())
const L = barras.length - 1

const serie = {}
const serieHi = {}
const serieLo = {}
CCY.forEach((c) => {
  serie[c] = barras.map((t) => (c === 'USD' ? 1 : rates[t][c]))
  serieHi[c] = barras.map((t, i) => (c === 'USD' ? 1 : (rangos?.[t]?.[c]?.h ?? serie[c][i])))
  serieLo[c] = barras.map((t, i) => (c === 'USD' ? 1 : (rangos?.[t]?.[c]?.l ?? serie[c][i])))
})

const px = (b, q, i) => serie[q][i] / serie[b][i]
// El máximo del par se da con el máximo de la cotizada contra el mínimo de la
// base. Exacto en los 7 pares contra el dólar (una de las dos es constante);
// en los cruces es una cota algo más ancha que la real.
const pxHi = (b, q, i) => serieHi[q][i] / serieLo[b][i]
const pxLo = (b, q, i) => serieLo[q][i] / serieHi[b][i]

console.log('---COMPARACION-INICIO---')
console.log(`Días descargados: ${barras.length} · último: ${barras[L]}`)
console.log('')
console.log('par        ATR% viejo  ATR% nuevo   cambio   R/B viejo  R/B nuevo   pips riesgo v→n')
console.log('─'.repeat(88))

let pasanViejo = 0
let pasanNuevo = 0
const cambiosAtr = []

for (const [b, q] of PAIRS) {
  const closes = barras.map((_, i) => px(b, q, i))
  const highs = barras.map((_, i) => pxHi(b, q, i))
  const lows = barras.map((_, i) => pxLo(b, q, i))
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
  const cambio = ((atrPctN / atrPctV - 1) * 100).toFixed(0)
  cambiosAtr.push(Number(cambio))

  const riesgoV = Math.abs(c - nv.sl) / pip
  const riesgoN = Math.abs(c - nn.sl) / pip

  console.log(
    `${(b + '/' + q).padEnd(9)} ` +
      `${atrPctV.toFixed(3).padStart(10)} ${atrPctN.toFixed(3).padStart(11)} ` +
      `${(cambio > 0 ? '+' : '') + cambio + '%'}`.padStart(9) +
      `${nv.rr.toFixed(2).padStart(11)} ${nn.rr.toFixed(2).padStart(10)}   ` +
      `${Math.round(riesgoV)} → ${Math.round(riesgoN)}`
  )
}

const medio = Math.round(cambiosAtr.reduce((a, b) => a + b, 0) / cambiosAtr.length)

console.log('─'.repeat(88))
console.log('')
console.log(`El ATR real es un ${medio}% mayor de media que el de cierre a cierre.`)
console.log(`Señales que pasan el filtro R/B ${RB_MINIMO} (lado compra):`)
console.log(`   con el método de hoy : ${pasanViejo} de ${PAIRS.length}`)
console.log(`   con velas reales     : ${pasanNuevo} de ${PAIRS.length}`)
console.log('')
console.log('Cómo leerlo: si "pips riesgo" sube mucho, los stops de hoy estaban')
console.log('demasiado ajustados y sacaban operaciones por ruido normal del día.')
console.log('Si el número de señales que pasan cae en picado, hay que revisar el')
console.log('umbral de R/B antes de adoptar el cambio.')
console.log('---COMPARACION-FIN---')
