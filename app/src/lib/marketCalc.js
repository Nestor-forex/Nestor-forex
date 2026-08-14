import { crearT } from './i18n/crearT.js'
import { IDIOMA_BASE } from './i18n/idiomas.js'
import { VENTAS_PAUSADAS } from './reglas.js'

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

// El ATR de siempre (Wilder), con el rango real de cada día: el mayor de
// —cuánto se movió el día, distancia del máximo al cierre anterior, distancia
// del mínimo al cierre anterior—. Los dos últimos cuentan el hueco entre
// días, que el método de abajo se pierde entero.
const atrWilder = (highs, lows, closes, p = 14) => {
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

// El que se usaba cuando la fuente solo daba cierres. Se queda como respaldo
// para que la app no se rompa si algún día llegan datos sin máximo ni mínimo,
// pero subestima el movimiento real casi a la mitad — ver el comentario de
// `computarBarrido`.
const atrCierres = (closes) => {
  const L = closes.length - 1
  let sum = 0
  for (let i = L - 13; i <= L; i++) sum += Math.abs(closes[i] - closes[i - 1]) / closes[i - 1]
  return ((sum / 14) * closes[L])
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
/**
 * @param fechas    días, ordenados
 * @param rates     rates[fecha][divisa] = unidades de esa divisa por 1 USD
 * @param rangosPar rangosPar[fecha][par] = { h, l, c } reales de ese par ese
 *                  día. Opcional: sin él se cae al método viejo, que solo
 *                  tenía cierres.
 *
 * Sobre `rangosPar`: la app usó hasta 2026-08-09 los cierres del BCE, un
 * precio por día y sin máximo ni mínimo. Con eso el ATR se calculaba de
 * cierre a cierre y los soportes salían de los extremos de los CIERRES.
 * Al medirlo contra velas reales (`scripts/comparar-fuente.mjs`) resultó que
 * el movimiento real es un 96% mayor —casi el doble—, así que los stops
 * salían demasiado estrechos: en USD/CAD la app ponía el stop a 12 pips en un
 * par que se mueve 40 en un día tranquilo. Eso además inflaba la relación
 * riesgo/beneficio hasta números que no existen (15 a 1), porque el
 * denominador era ficticio.
 */
export function computarBarrido(fechas, rates, rangosPar = null) {
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
    const nombre = b + '/' + q
    const closes = fechas.map((_, i) => px(b, q, i))
    // Con velas reales, el máximo y el mínimo de cada día. Sin ellas se usa el
    // cierre como las dos cosas, que es exactamente el comportamiento viejo.
    const highs = fechas.map((d, i) => rangosPar?.[d]?.[nombre]?.h ?? closes[i])
    const lows = fechas.map((d, i) => rangosPar?.[d]?.[nombre]?.l ?? closes[i])
    const conRangos = Boolean(rangosPar)

    const c = closes[L]
    const e20 = emaLast(closes, 20)
    const e50 = emaLast(closes, 50)
    // Tendencia de fondo. No la usa ninguna pantalla todavía: está para que el
    // banco de pruebas pueda comprobar si exigir que la operación vaya a favor
    // del movimiento largo arregla las ventas, que es donde la app pierde.
    const e100 = emaLast(closes, 100)
    const atrAbs = conRangos ? atrWilder(highs, lows, closes) : atrCierres(closes)
    const atrPct = (atrAbs / c) * 100
    const tend = c > e20 && e20 > e50 ? 'Alcista' : c < e20 && e20 < e50 ? 'Bajista' : 'Rango'
    // Los soportes y resistencias van con los extremos REALES: es donde el
    // precio llegó y se devolvió, que es lo que hace que un nivel importe.
    // Con solo cierres se quedaban cortos y estrechaban el stop.
    const last20 = highs.slice(-20)
    const bajos20 = lows.slice(-20)
    const last10 = highs.slice(-10)
    const bajos10 = lows.slice(-10)
    return {
      name: b + '/' + q,
      b,
      q,
      c,
      e20,
      e50,
      e100,
      rsiV: rsi(closes.slice(-60)),
      atrPct,
      atrAbs,
      tend,
      dif: raw[b] - raw[q],
      hi20: Math.max(...last20),
      lo20: Math.min(...bajos20),
      hi10: Math.max(...last10),
      lo10: Math.min(...bajos10),
      dec: b === 'JPY' || q === 'JPY' ? 2 : 4,
      // El gráfico dibuja CIERRES, no máximos: es la línea del precio, no el
      // rango. (Antes `last20` eran los cierres y servía para las dos cosas.)
      serie20: closes.slice(-20),
      // Series completas, alineadas con `fechas`. Las usa scripts/lib/
      // resolver.mjs para saber si una señal llegó a su objetivo o a su stop:
      // hace falta el recorrido entero, no solo el último valor. Se exponen
      // desde aquí en vez de recalcularlas fuera para que no puedan quedar
      // desalineadas con lo que ve el barrido.
      //
      // A diferencia de la app hermana de intradía, aquí son EXACTAS en los 14
      // pares: se piden todos directamente a Twelve Data en vez de derivar los
      // cruces (ver el comentario de scripts/lib/velas.mjs).
      highs,
      lows,
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

const razon = (p, esc, t) => {
  const extra =
    p.rsiV > 70 || p.rsiV < 30
      ? t('calc_barrido.rsiExtendido')
      : p.rsiV >= 40 && p.rsiV <= 60
        ? t('calc_barrido.rsiContinuacion')
        : ''
  return t('calc_barrido.razon', {
    b: p.b,
    fb: esc[p.b].toFixed(1),
    q: p.q,
    fq: esc[p.q].toFixed(1),
    rsi: p.rsiV.toFixed(0),
    extra,
  })
}

// ---------------------------------------------------------------- reversión
//
// LA REGLA CONTRARIA A LA DE LA APP, Y POR ESO ESTÁ APAGADA.
//
// La app compra lo FUERTE y vende lo DÉBIL. Medido sobre 5 años y 3 meses de
// velas diarias reales, con la vara neutra y descontando spread, eso da −0,05
// por unidad de riesgo: pierde. Hacer lo contrario —comprar el par cuya divisa
// base está débil, cuando además el precio se estiró— da +0,07.
//
// Y no es un número suelto: se barrieron los umbrales vecinos del RSI (25, 30,
// 35, 40, 45 y 50) y TODOS salen positivos, en las dos mitades del tiempo, con
// spread. Además la tabla tiene la forma correcta: cuanto más estirado se
// exige el precio, más gana cada operación y menos operaciones hay. Un número
// ajustado a mano no se ordenaría así.
//
// Se usa 40 (y su espejo 60) y no el 35 que salió mejor en el total: 40 tiene
// casi el doble de operaciones —1.568 contra 860— y aguanta mejor la segunda
// mitad del periodo (+0,08 contra +0,07). Entre dos números buenos se elige el
// que descansa sobre más datos, no el más bonito.
//
// ⚠️ ARRANCA APAGADA (`incluirReversion`). Esto no es un ajuste de la app: es
// su idea al revés. Encenderla convertiría a Swing en otro producto, y esa es
// una decisión de Néstor, no una consecuencia de una medición. Por ahora el
// vigía la anota en la sombra —sin enseñarla y sin avisar a nadie— para ver
// los dos números correr en paralelo con dinero real de por medio en ninguno.
const RSI_REVERSION = 40

const clasificarReversion = (p, thr, { rsiMax = RSI_REVERSION } = {}) => {
  if (p.dif < -thr && p.rsiV <= rsiMax) return 'COMPRA'
  if (p.dif > thr && p.rsiV >= 100 - rsiMax) return 'VENTA'
  return null
}

const razonReversion = (p, esc, t) =>
  t(clasificarReversion(p, 0) === 'COMPRA' ? 'calc_barrido.reversionCompra' : 'calc_barrido.reversionVenta', {
    b: p.b,
    fb: esc[p.b].toFixed(1),
    q: p.q,
    fq: esc[p.q].toFixed(1),
    rsi: p.rsiV.toFixed(0),
  })

// ⚠️ El stop y el objetivo van a la MISMA distancia (1,5 ATR a cada lado), y
// eso es a propósito aunque dé una relación riesgo/beneficio de 1:1, que la
// app marcaría como baja.
//
// El motivo: es EXACTAMENTE la geometría con la que se midió la regla. Todos
// los números de arriba salen de una vara 1:1. Si aquí le pusiera un objetivo
// más ambicioso, lo que el vigía anote en la sombra ya no sería comparable con
// lo medido, y la espera no serviría para nada — estaríamos midiendo otra cosa
// y creyendo que confirmamos esta.
const ATR_REVERSION = 1.5
const nivelesReversion = (p, compra) => ({
  sl: compra ? p.c - ATR_REVERSION * p.atrAbs : p.c + ATR_REVERSION * p.atrAbs,
  tp: compra ? p.c + ATR_REVERSION * p.atrAbs : p.c - ATR_REVERSION * p.atrAbs,
})

const mkSetup = (p, lado, esc = {}, t, tipo = 'tendencia') => {
  const d = p.dec
  const compra = lado === 'COMPRA'
  const esReversion = tipo === 'reversion'
  const { sl, tp } = esReversion
    ? nivelesReversion(p, compra)
    : {
        sl: compra ? p.lo10 - 0.5 * p.atrAbs : p.hi10 + 0.5 * p.atrAbs,
        tp: compra ? Math.max(p.hi20, p.c + 2 * p.atrAbs) : Math.min(p.lo20, p.c - 2 * p.atrAbs),
      }
  const rr = Math.abs(tp - p.c) / Math.abs(p.c - sl)
  return {
    name: p.name,
    lado,
    tipo,
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
      // Los extremos de 10 días y el ATR en precio (no en %). No los usa
      // ninguna pantalla: los necesita `scripts/lib/backtest-nucleo.mjs` para
      // poder calcular geometrías de stop y objetivo distintas a la de aquí y
      // compararlas con datos reales. Exponerlos evita que el banco de pruebas
      // los recalcule por su cuenta y acabe midiendo números que no son los
      // que ve la app.
      hi10: p.hi10,
      lo10: p.lo10,
      atrAbs: p.atrAbs,
      e50: p.e50,
      e100: p.e100,
      serie20: p.serie20,
      rsi: Math.round(p.rsiV),
      atrPct: p.atrPct,
      tend: p.tend,
      fuerzaB: esc[p.b],
      fuerzaQ: esc[p.q],
    },
    sup: p.lo20.toFixed(d),
    res: p.hi20.toFixed(d),
    entrada: t('calc_barrido.entrada', { precio: p.c.toFixed(d), ema: p.e20.toFixed(d) }),
    sl: sl.toFixed(d) + (compra ? t('calc_barrido.slCompra') : t('calc_barrido.slVenta')),
    tp: tp.toFixed(d),
    rr: '1:' + rr.toFixed(1) + (rr < 1.5 ? t('calc_barrido.rbBajo') : ''),
    rrOk: rr >= 1.5,
    inval: compra
      ? t('calc_barrido.invalCompra', { sl: sl.toFixed(d), b: p.b })
      : t('calc_barrido.invalVenta', { sl: sl.toFixed(d), q: p.q }),
  }
}

const porDifAbs = (a, b) => Math.abs(b.dif) - Math.abs(a.dif)

// data: salida de computarBarrido(). Devuelve todo ya formateado para las pantallas.
/**
 * @param incluirVentas  por defecto sigue a `VENTAS_PAUSADAS` (ver reglas.js).
 *                       El banco de pruebas lo pone en true a propósito: si la
 *                       medición dejara de ver las ventas, no podríamos volver
 *                       a comprobar si algún día se arreglan, y la pausa se
 *                       volvería permanente sin que nadie lo decidiera.
 * @param incluirReversion enciende la regla contraria a la de la app (ver
 *                       `clasificarReversion`). APAGADA por defecto: no es un
 *                       ajuste, es la idea de la app al revés, y encenderla es
 *                       una decisión de Néstor. Hoy solo la enciende el vigía,
 *                       para anotarla en la sombra sin enseñársela a nadie.
 */
export function derivarVista(
  data,
  {
    thr = 0.5,
    topN = 3,
    t = crearT(IDIOMA_BASE),
    locale,
    incluirVentas = !VENTAS_PAUSADAS,
    incluirReversion = false,
  } = {}
) {
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
  // Con las ventas en pausa no se proponen operaciones de venta. El barrido
  // sigue calculando qué divisas están débiles —eso es información de mercado
  // y es correcta—; lo que se deja de hacer es sugerir la operación.
  const ventasRaw = incluirVentas ? cands.filter((p) => clasificar(p, thr) === 'VENTA').slice(0, 5) : []
  const vigilanciaRaw = cands.filter((p) => clasificar(p, thr) === 'VIGILAR').slice(0, 4)

  const compras = comprasRaw.map((p) => ({ name: p.name, razon: razon(p, esc, t) }))
  const ventas = ventasRaw.map((p) => ({ name: p.name, razon: razon(p, esc, t) }))
  const vigilancia = vigilanciaRaw.map((p) => ({
    name: p.name,
    razon: t('calc_barrido.vigilancia', {
      dif: (p.dif >= 0 ? '+' : '') + p.dif.toFixed(1),
      favor: p.dif > 0 ? p.b : p.q,
      tend: t(`tend.${p.tend}`).toLowerCase(),
    }),
  }))

  // Reversión. Apagada por defecto: sin `incluirReversion` esta lista queda
  // vacía y la app se comporta exactamente como antes de que existiera.
  //
  // Una reversión no puede coincidir con una compra o una venta de la app: la
  // app compra cuando `dif` es muy POSITIVA y esta compra cuando es muy
  // NEGATIVA. Son condiciones opuestas sobre el mismo número, así que el mismo
  // par no puede estar en las dos listas con el mismo lado.
  const clsRev = (p) => (incluirReversion ? clasificarReversion(p, thr) : null)
  const reversionesRaw = incluirReversion ? cands.filter((p) => clsRev(p)).slice(0, topN) : []
  const reversiones = reversionesRaw.map((p) => ({
    name: p.name,
    lado: clsRev(p),
    razon: razonReversion(p, esc, t),
  }))

  const setups = [
    ...comprasRaw.slice(0, topN).map((p) => mkSetup(p, 'COMPRA', esc, t)),
    ...ventasRaw.slice(0, topN).map((p) => mkSetup(p, 'VENTA', esc, t)),
    ...reversionesRaw.map((p) => mkSetup(p, clsRev(p), esc, t, 'reversion')),
  ]

  const corte = t('calc_barrido.corte', { fecha: data.ultima })

  return { monedas, pares, compras, ventas, vigilancia, reversiones, setups, corte }
}
