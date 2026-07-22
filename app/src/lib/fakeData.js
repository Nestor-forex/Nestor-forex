// Datos de ejemplo que aún no vienen de ningún backend: el diario de
// operaciones y los miembros se guardan solo en este dispositivo hasta la
// fase 3 (Firebase). Los datos del barrido ya NO están acá — ver
// src/lib/marketCalc.js y src/lib/useMarketData.js para los datos reales.

export const limitaciones =
  'Tasas de referencia diarias (un fix por día): ATR y RSI se calculan sobre cierres, sin máximos/mínimos intradía. Sin datos de MT5 no hay tick volume ni spread real del bróker — la liquidez se estima cualitativamente.'

// Operaciones de ejemplo para que el Diario no se vea vacío al probar la app.
export const tradesFake = [
  { par: 'EUR/USD', dir: 'Compra', lote: 0.1, pl: 32.5, nota: 'Retroceso a EMA20, RSI saliendo de sobreventa.', fecha: '2026-07-18' },
  { par: 'USD/JPY', dir: 'Venta', lote: 0.05, pl: -12.8, nota: 'Salté la entrada antes de confirmar tendencia.', fecha: '2026-07-20' },
]

// Miembros de ejemplo para la pestaña de administración.
export const usuariosFake = [
  { nombre: 'Camila Restrepo', email: 'camila.restrepo@example.com', clave: 'demo1234', estado: 'aprobado' },
  { nombre: 'Julián Torres', email: 'julian.torres@example.com', clave: 'demo1234', estado: 'pendiente' },
]
