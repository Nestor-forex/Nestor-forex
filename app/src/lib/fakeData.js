// Datos de ejemplo (no son precios reales) para poder ver y probar toda la
// app sin depender todavía de internet. La forma de estos objetos ya
// coincide con lo que va a devolver el cálculo real (fase 2), para que ese
// cambio no toque las pantallas.

export const corteFake = 'Datos al cierre del 2026-07-21 · tasas de referencia BCE'

export const limitaciones =
  'Tasas de referencia diarias (un fix por día): ATR y RSI se calculan sobre cierres, sin máximos/mínimos intradía. Sin datos de MT5 no hay tick volume ni spread real del bróker — la liquidez se estima cualitativamente.'

export const monedas = [
  { cod: 'USD', score: 8.2 },
  { cod: 'GBP', score: 7.1 },
  { cod: 'AUD', score: 6.8 },
  { cod: 'EUR', score: 5.4 },
  { cod: 'CAD', score: 4.9 },
  { cod: 'NZD', score: 4.1 },
  { cod: 'CHF', score: 2.6 },
  { cod: 'JPY', score: 1.3 },
]

// Orden fijo (igual al tablero completo). dif = fuerza base - fuerza cotizada.
export const pares = [
  { name: 'EUR/USD', b: 'EUR', q: 'USD', dif: -2.8, sesgo: 'VENTA', tend: 'Bajista', rsi: 38, atr: 0.54 },
  { name: 'GBP/USD', b: 'GBP', q: 'USD', dif: -1.1, sesgo: 'VENTA', tend: 'Bajista', rsi: 41, atr: 0.61 },
  { name: 'USD/JPY', b: 'USD', q: 'JPY', dif: 6.9, sesgo: 'COMPRA', tend: 'Alcista', rsi: 74, atr: 0.78 },
  { name: 'USD/CHF', b: 'USD', q: 'CHF', dif: 5.6, sesgo: 'COMPRA', tend: 'Alcista', rsi: 63, atr: 0.49 },
  { name: 'USD/CAD', b: 'USD', q: 'CAD', dif: 3.3, sesgo: 'COMPRA', tend: 'Alcista', rsi: 58, atr: 0.45 },
  { name: 'AUD/USD', b: 'AUD', q: 'USD', dif: -1.4, sesgo: 'VIGILAR', tend: 'Rango', rsi: 47, atr: 0.66 },
  { name: 'NZD/USD', b: 'NZD', q: 'USD', dif: -4.1, sesgo: 'VENTA', tend: 'Bajista', rsi: 29, atr: 0.71 },
  { name: 'EUR/CHF', b: 'EUR', q: 'CHF', dif: 2.8, sesgo: 'VIGILAR', tend: 'Rango', rsi: 52, atr: 0.31 },
  { name: 'EUR/CAD', b: 'EUR', q: 'CAD', dif: 0.6, sesgo: 'VIGILAR', tend: 'Rango', rsi: 55, atr: 0.4 },
  { name: 'EUR/NZD', b: 'EUR', q: 'NZD', dif: 1.3, sesgo: 'COMPRA', tend: 'Alcista', rsi: 61, atr: 0.58 },
  { name: 'GBP/CAD', b: 'GBP', q: 'CAD', dif: 2.2, sesgo: 'COMPRA', tend: 'Alcista', rsi: 66, atr: 0.53 },
  { name: 'GBP/JPY', b: 'GBP', q: 'JPY', dif: 5.8, sesgo: 'COMPRA', tend: 'Alcista', rsi: 71, atr: 0.82 },
  { name: 'NZD/CHF', b: 'NZD', q: 'CHF', dif: 1.5, sesgo: 'VIGILAR', tend: 'Rango', rsi: 49, atr: 0.36 },
  { name: 'NZD/CAD', b: 'NZD', q: 'CAD', dif: -0.8, sesgo: 'VENTA', tend: 'Bajista', rsi: 39, atr: 0.42 },
]

const scoreOf = (cod) => monedas.find((m) => m.cod === cod).score

const razon = (p) => {
  const ext =
    p.rsi > 70 || p.rsi < 30
      ? ' — RSI extendido, no perseguir, esperar retroceso'
      : p.rsi >= 40 && p.rsi <= 60
        ? ' — RSI en zona de continuación'
        : ''
  return `${p.b} (${scoreOf(p.b).toFixed(1)}) vs ${p.q} (${scoreOf(p.q).toFixed(1)}), EMAs alineadas, RSI ${p.rsi}${ext}`
}

const porDifAbs = (a, b) => Math.abs(b.dif) - Math.abs(a.dif)

export const compras = pares
  .filter((p) => p.sesgo === 'COMPRA')
  .sort(porDifAbs)
  .slice(0, 5)
  .map((p) => ({ name: p.name, razon: razon(p) }))

export const ventas = pares
  .filter((p) => p.sesgo === 'VENTA')
  .sort(porDifAbs)
  .slice(0, 5)
  .map((p) => ({ name: p.name, razon: razon(p) }))

export const vigilancia = pares
  .filter((p) => p.sesgo === 'VIGILAR')
  .sort(porDifAbs)
  .slice(0, 4)
  .map((p) => ({
    name: p.name,
    razon: `Diferencial ${p.dif >= 0 ? '+' : ''}${p.dif.toFixed(1)} a favor de ${p.dif > 0 ? p.b : p.q}, pero el par sigue en ${p.tend.toLowerCase()} — fuerza sin confirmación técnica todavía.`,
  }))

export const setups = [
  {
    name: 'USD/JPY',
    lado: 'COMPRA',
    sup: '154.80',
    res: '158.10',
    entrada: '157.20 actual · mejor en retroceso a EMA20 (156.40)',
    sl: '153.95 (bajo el mínimo de 10 días − ½ ATR)',
    tp: '158.10',
    rr: '1:2.3',
    rrOk: true,
    inval: 'cierre diario por debajo de 153.95, o pérdida de fuerza de USD en el ranking.',
  },
  {
    name: 'GBP/JPY',
    lado: 'COMPRA',
    sup: '195.60',
    res: '201.20',
    entrada: '199.35 actual · mejor en retroceso a EMA20 (197.80)',
    sl: '194.10 (bajo el mínimo de 10 días − ½ ATR)',
    tp: '201.20',
    rr: '1:1.4 ⚠ por debajo de 1:1.5',
    rrOk: false,
    inval: 'cierre diario por debajo de 194.10, o pérdida de fuerza de GBP en el ranking.',
  },
  {
    name: 'USD/CHF',
    lado: 'COMPRA',
    sup: '0.9020',
    res: '0.9210',
    entrada: '0.9120 actual · mejor en retroceso a EMA20 (0.9080)',
    sl: '0.8985 (bajo el mínimo de 10 días − ½ ATR)',
    tp: '0.9210',
    rr: '1:1.9',
    rrOk: true,
    inval: 'cierre diario por debajo de 0.8985, o pérdida de fuerza de USD en el ranking.',
  },
  {
    name: 'NZD/USD',
    lado: 'VENTA',
    sup: '0.5890',
    res: '0.6080',
    entrada: '0.5980 actual · mejor en retroceso a EMA20 (0.6015)',
    sl: '0.6065 (sobre el máximo de 10 días + ½ ATR)',
    tp: '0.5890',
    rr: '1:1.7',
    rrOk: true,
    inval: 'cierre diario por encima de 0.6065, o recuperación de fuerza de USD.',
  },
  {
    name: 'EUR/USD',
    lado: 'VENTA',
    sup: '1.0790',
    res: '1.0940',
    entrada: '1.0850 actual · mejor en retroceso a EMA20 (1.0880)',
    sl: '1.0925 (sobre el máximo de 10 días + ½ ATR)',
    tp: '1.0790',
    rr: '1:1.2 ⚠ por debajo de 1:1.5',
    rrOk: false,
    inval: 'cierre diario por encima de 1.0925, o recuperación de fuerza de USD.',
  },
  {
    name: 'GBP/USD',
    lado: 'VENTA',
    sup: '1.2590',
    res: '1.2760',
    entrada: '1.2680 actual · mejor en retroceso a EMA20 (1.2715)',
    sl: '1.2745 (sobre el máximo de 10 días + ½ ATR)',
    tp: '1.2590',
    rr: '1:1.6',
    rrOk: true,
    inval: 'cierre diario por encima de 1.2745, o recuperación de fuerza de USD.',
  },
]

// Operaciones de ejemplo para que el Diario no se vea vacío al probar la app.
export const tradesFake = [
  { par: 'EUR/USD', dir: 'Compra', lote: 0.1, pl: 32.5, nota: 'Retroceso a EMA20, RSI saliendo de sobreventa.', fecha: '2026-07-18' },
  { par: 'USD/JPY', dir: 'Venta', lote: 0.05, pl: -12.8, nota: 'Salté la entrada antes de confirmar tendencia.', fecha: '2026-07-20' },
]

// Tasas de ejemplo (base USD) para la calculadora de riesgo.
export const tasasFake = {
  EUR: 0.9217,
  GBP: 0.7886,
  JPY: 157.2,
  CHF: 0.912,
  AUD: 1.5337,
  NZD: 1.6722,
  CAD: 1.375,
}

// Miembros de ejemplo para la pestaña de administración.
export const usuariosFake = [
  { nombre: 'Camila Restrepo', email: 'camila.restrepo@example.com', clave: 'demo1234', estado: 'aprobado' },
  { nombre: 'Julián Torres', email: 'julian.torres@example.com', clave: 'demo1234', estado: 'pendiente' },
]
