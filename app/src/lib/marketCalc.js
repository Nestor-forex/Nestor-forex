// Cálculos del barrido, portados tal cual de los prototipos
// (Nestor Forex.dc.html / Barrido Forex Diario.dc.html).

export const CCY = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD']

export const PAIRS = [
  ['EUR', 'USD'],
  ['GBP', 'USD'],
  ['USD', 'JPY'],
  ['USD', 'CHF'],
  ['USD', 'CAD'],
  ['AUD', 'USD'],
  ['NZD', 'USD'],
  ['EUR', 'CHF'],
  ['EUR', 'CAD'],
  ['EUR', 'NZD'],
  ['GBP', 'CAD'],
  ['GBP', 'JPY'],
  ['NZD', 'CHF'],
  ['NZD', 'CAD'],
]

const emaLast = (c, p) => {
  const k = 2 / (p + 1)
  let e = c.slice(0, p).reduce((a, b) => a + b) / p
  for (let i = p; i < c.length; i++) e = c[i] * k + e * (1 - k)
  return e
}

const rsi = (c, p = 14) => {
  let g = 0
  let l = 0
  for (let i = 1; i <= p; i++) {
    const d = c[i] - c[i - 1]
    if (d > 0) g += d
    else l -= d
  }
  g /= p
  l /= p
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1]
    g = (g * (p - 1) + Math.max(d, 0)) / p
    l = (l * (p - 1) + Math.max(-d, 0)) / p
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l)
}

// fechas: array de strings YYYY-MM-DD ordenadas asc. rates: { [fecha]: { EUR, GBP, ... } } (base USD, sin USD).
export function computarBarrido(fechas, rates) {
  const serie = {}
  CCY.forEach((c) => (serie[c] = fechas.map((d) => (c === 'USD' ? 1 : rates[d][c]))))
  const L = fechas.length - 1
  const px = (b, q, i) => serie[q][i] / serie[b][i]
  const chg = (b, q, k) => (px(b, q, L) / px(b, q, Math.max(0, L - k)) - 1) * 100

  const raw = {}
  CCY.forEach((b) => {
    let s = 0
    CCY.forEach((q) => {
      if (q !== b) s += 0.2 * chg(b, q, 1) + 0.4 * chg(b, q, 5) + 0.4 * chg(b, q, 20)
    })
    raw[b] = s / 7
  })
  const vals = Object.values(raw)
  const mn = Math.min(...vals)
  const mx = Math.max(...vals)
  const esc = {}
  CCY.forEach((c) => (esc[c] = ((raw[c] - mn) / (mx - mn)) * 10))

  const pares = PAIRS.map(([b, q]) => {
    const closes = fechas.map((_, i) => px(b, q, i))
    const c = closes[L]
    const e20 = emaLast(closes, 20)
    const e50 = emaLast(closes, 50)
    let sum = 0
    for (let i = L - 13; i <= L; i++) sum += Math.abs(closes[i] - closes[i - 1]) / closes[i - 1]
    const atrPct = (sum / 14) * 100
    const atrAbs = (c * atrPct) / 100
    const tend = c > e20 && e20 > e50 ? 'Alcista' : c < e20 && e20 < e50 ? 'Bajista' : 'Rango'
    const last20 = closes.slice(-20)
    const last10 = closes.slice(-10)
    return {
      name: b + '/' + q,
      b,
      q,
      c,
      e20,
      e50,
      rsiV: rsi(closes.slice(-60)),
      atrPct,
      atrAbs,
      tend,
      dif: raw[b] - raw[q],
      hi20: Math.max(...last20),
      lo20: Math.min(...last20),
      hi10: Math.max(...last10),
      lo10: Math.min(...last10),
      dec: b === 'JPY' || q === 'JPY' ? 2 : 4,
      serie20: last20,
    }
  })

  const ratesUSD = { USD: 1 }
  CCY.slice(1).forEach((c) => (ratesUSD[c] = rates[fechas[L]][c]))

  return { fechas, ultima: fechas[L], raw, esc, pares, ratesUSD }
}

const clasificar = (p, thr) => {
  if (p.dif > thr && p.tend === 'Alcista') return 'COMPRA'
  if (p.dif < -thr && p.tend === 'Bajista') return 'VENTA'
  if (Math.abs(p.dif) > thr) return 'VIGILAR'
  return '—'
}

const razon = (p, esc) => {
  const ext =
    p.rsiV > 70 || p.rsiV < 30
      ? ' — RSI extendido, no perseguir, esperar retroceso'
      : p.rsiV >= 40 && p.rsiV <= 60
        ? ' — RSI en zona de continuación'
        : ''
  return `${p.b} (${esc[p.b].toFixed(1)}) vs ${p.q} (${esc[p.q].toFixed(1)}), EMAs alineadas, RSI ${p.rsiV.toFixed(0)}${ext}`
}

const mkSetup = (p, lado, esc = {}) => {
  const d = p.dec
  const compra = lado === 'COMPRA'
  const sl = compra ? p.lo10 - 0.5 * p.atrAbs : p.hi10 + 0.5 * p.atrAbs
  const tp = compra ? Math.max(p.hi20, p.c + 2 * p.atrAbs) : Math.min(p.lo20, p.c - 2 * p.atrAbs)
  const rr = Math.abs(tp - p.c) / Math.abs(p.c - sl)
  return {
    name: p.name,
    lado,
    // Los campos de abajo son texto ya armado, que es lo que consumen el
    // tablero y el reporte .md. `crudo` lleva los mismos datos sin formatear,
    // para la pantalla de detalle, que necesita dibujarlos y no solo leerlos.
    crudo: {
      b: p.b,
      q: p.q,
      dec: d,
      compra,
      precio: p.c,
      sl,
      tp,
      ema: p.e20,
      rr,
      // Distancias al stop y al objetivo, en pips (los pares con yen cotizan a
      // 2 decimales, así que ahí un pip es 0.01 y no 0.0001).
      pipRiesgo: Math.abs(p.c - sl) / (d === 2 ? 0.01 : 0.0001),
      pipBeneficio: Math.abs(tp - p.c) / (d === 2 ? 0.01 : 0.0001),
      sup: p.lo20,
      res: p.hi20,
      serie20: p.serie20,
      rsi: Math.round(p.rsiV),
      atrPct: p.atrPct,
      tend: p.tend,
      fuerzaB: esc[p.b],
      fuerzaQ: esc[p.q],
    },
    sup: p.lo20.toFixed(d),
    res: p.hi20.toFixed(d),
    entrada: `${p.c.toFixed(d)} actual · mejor en retroceso a EMA20 (${p.e20.toFixed(d)})`,
    sl: sl.toFixed(d) + (compra ? ' (bajo el mínimo de 10 días − ½ ATR)' : ' (sobre el máximo de 10 días + ½ ATR)'),
    tp: tp.toFixed(d),
    rr: '1:' + rr.toFixed(1) + (rr < 1.5 ? ' ⚠ por debajo de 1:1.5' : ''),
    rrOk: rr >= 1.5,
    inval: compra
      ? `cierre diario por debajo de ${sl.toFixed(d)}, o pérdida de fuerza de ${p.b} en el ranking.`
      : `cierre diario por encima de ${sl.toFixed(d)}, o recuperación de fuerza de ${p.q}.`,
  }
}

const porDifAbs = (a, b) => Math.abs(b.dif) - Math.abs(a.dif)

// data: salida de computarBarrido(). Devuelve todo ya formateado para las pantallas.
export function derivarVista(data, { thr = 0.5, topN = 3 } = {}) {
  const { esc, pares: paresRaw } = data

  const monedas = Object.keys(esc)
    .sort((a, b) => esc[b] - esc[a])
    .map((cod) => ({ cod, score: esc[cod] }))

  const pares = paresRaw.map((p) => ({
    name: p.name,
    b: p.b,
    q: p.q,
    dif: p.dif,
    sesgo: clasificar(p, thr),
    tend: p.tend,
    rsi: Math.round(p.rsiV),
    atr: p.atrPct,
    precio: p.c,
    dec: p.dec,
    serie20: p.serie20,
    cambio20: ((p.serie20.at(-1) - p.serie20[0]) / p.serie20[0]) * 100,
  }))

  const cands = [...paresRaw].sort(porDifAbs)
  const comprasRaw = cands.filter((p) => clasificar(p, thr) === 'COMPRA').slice(0, 5)
  const ventasRaw = cands.filter((p) => clasificar(p, thr) === 'VENTA').slice(0, 5)
  const vigilanciaRaw = cands.filter((p) => clasificar(p, thr) === 'VIGILAR').slice(0, 4)

  const compras = comprasRaw.map((p) => ({ name: p.name, razon: razon(p, esc) }))
  const ventas = ventasRaw.map((p) => ({ name: p.name, razon: razon(p, esc) }))
  const vigilancia = vigilanciaRaw.map((p) => ({
    name: p.name,
    razon: `Diferencial ${p.dif >= 0 ? '+' : ''}${p.dif.toFixed(1)} a favor de ${p.dif > 0 ? p.b : p.q}, pero el par sigue en ${p.tend.toLowerCase()} — fuerza sin confirmación técnica todavía.`,
  }))

  const setups = [...comprasRaw.slice(0, topN).map((p) => mkSetup(p, 'COMPRA', esc)), ...ventasRaw.slice(0, topN).map((p) => mkSetup(p, 'VENTA', esc))]

  const corte = `Datos al cierre del ${data.ultima} · tasas de referencia BCE`

  return { monedas, pares, compras, ventas, vigilancia, setups, corte }
}
