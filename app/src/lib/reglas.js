// Reglas que la app aplica al decidir qué operar, y por qué.
//
// Vive aparte de `marketCalc.js` porque lo necesitan los dos lados —el barrido
// que las aplica y las pantallas que las explican— y porque el motivo de cada
// una es tan importante como la regla. Una regla sin su porqué es una decisión
// que nadie se atreve a tocar dentro de seis meses.

// ────────────────────────────────────────────────────────────────────────
// LAS VENTAS ESTÁN PAUSADAS DESDE EL 2026-08-12. Decisión de Néstor, medida.
//
// El banco de pruebas (`scripts/backtest.mjs`) corrió las reglas sobre 219
// días reales. Separando por lado:
//
//     Compras   114 operaciones   58% de acierto   −0,00 por unidad de riesgo
//     Ventas    120 operaciones   40% de acierto   −0,30 por unidad de riesgo
//
// Las ventas se llevaban el 87% de todo lo perdido. Quitarlas lleva la app de
// −0,15 a empate, y es el único cambio con una mejora medida detrás.
//
// No fue por falta de intentarlo antes. Se probaron y se descartaron:
//   · Cinco geometrías distintas de stop y objetivo → las ventas pierden con
//     TODAS (de −0,30 a −0,71). No es dónde va el stop.
//   · Solo vender cuando la debilidad ya venía de antes → −0,30. Igual.
//   · Solo vender a favor del movimiento de fondo (media de 100) → −0,31.
//   · Trimestre a trimestre → pierden en los tres. No fue un mercado malo.
//
// Y con una regla de medir neutra (stop y objetivo a la misma distancia), las
// ventas aciertan el 42%: por debajo del 50%, o sea que la señal apunta al
// lado contrario. Comprar justo lo que manda vender daba 58% — pero con un
// margen de error de ±9 puntos y un trimestre plano, así que NO se invierte:
// no hay suficiente para apostar dinero de nadie.
//
// El barrido SIGUE calculando y mostrando qué divisas están débiles: eso es
// información de mercado y es correcta. Lo que se deja de hacer es proponer
// una operación de venta con sus niveles.
//
// Para volver a activarlas: poner esto en false, y solo DESPUÉS de que el
// banco de pruebas dé positivo en el lado de las ventas.
// ────────────────────────────────────────────────────────────────────────
export const VENTAS_PAUSADAS = true
