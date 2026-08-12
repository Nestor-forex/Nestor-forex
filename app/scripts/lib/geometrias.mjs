// Dónde poner el stop y el objetivo. Varias formas de hacerlo, para medirlas.
//
// EL PROBLEMA QUE INTENTAN ARREGLAR
// ---------------------------------
// La fórmula de hoy pone el stop en el mínimo de los últimos 10 días y el
// objetivo en el máximo de los últimos 20. Suena sensato, y está al revés.
//
// En una tendencia alcista —que es justo cuando la app compra— el precio lleva
// días subiendo. Entonces:
//   · el mínimo de 10 días se queda cada vez MÁS LEJOS por debajo, y
//   · el máximo de 20 días queda cada vez MÁS CERCA por arriba, porque el
//     precio está haciendo máximos nuevos.
//
// O sea que el stop se aleja y el objetivo se acerca **cuanto más fuerte es la
// tendencia**. Por eso salían cosas como EUR/USD arriesgando 125 pips para
// buscar 85. Con eso, acertar la mitad de las veces no basta: se pierde por
// aritmética, no por mala suerte.
//
// Medido sobre 219 días reales: 234 operaciones, 49% de acierto, −8.563 pips.
//
// Y el otro extremo es igual de malo. Cuando el mínimo de 10 días queda pegado
// al precio, el stop sale a menos de un ATR y lo tumba el movimiento normal de
// un día cualquiera. Esas son justo las que pasaban el filtro de R/B ≥ 1.5, y
// acertaron el 15%.
//
// LA IDEA
// -------
// Separar las dos decisiones, que hoy están enredadas:
//
//   1. El STOP responde a "¿dónde deja de tener sentido esta idea?", pero
//      acotado: nunca tan cerca que lo tumbe el ruido de un día, nunca tan
//      lejos que una operación normal se coma el presupuesto de riesgo.
//   2. El OBJETIVO se mide EN VECES EL RIESGO, no en niveles sueltos. Así la
//      relación riesgo/beneficio deja de ser algo que sale por accidente y
//      pasa a ser algo que se decide.
//
// Cuánto valen esas cotas y cuántas veces el riesgo conviene apuntar no lo sé,
// y no pienso adivinarlo: por eso hay varias y las compara `backtest.mjs`.
//
// Cada geometría recibe los datos crudos del par y devuelve { sl, tp }.

// Cuánto se mueve un día normal. Todas las cotas se miden en esto y no en
// pips: 20 pips son mucho en EUR/CHF y poco en GBP/JPY, y una cota en pips
// trataría igual a los dos.
const atrDe = (c) => c.atrAbs

// Deja un número dentro de un mínimo y un máximo.
const acotar = (x, min, max) => Math.min(Math.max(x, min), max)

// --------------------------------------------------------------------------

// La de hoy, tal cual, para tener con qué comparar. Si una propuesta no le
// gana a esto, no entra.
export function actual(c, compra) {
  const sl = compra ? c.lo10 - 0.5 * c.atrAbs : c.hi10 + 0.5 * c.atrAbs
  const tp = compra ? Math.max(c.res, c.precio + 2 * c.atrAbs) : Math.min(c.sup, c.precio - 2 * c.atrAbs)
  return { sl, tp }
}

// Sin estructura ninguna: stop a 1,5 ATR y objetivo al doble del riesgo.
//
// Es la más tonta a propósito. Sirve de vara de medir: si las que miran la
// estructura del mercado no le ganan a esto, es que la estructura no estaba
// aportando nada y nos estábamos complicando de gratis.
export function atrFijo(c, compra, { riesgoATR = 1.5, veces = 2 } = {}) {
  const riesgo = riesgoATR * atrDe(c)
  return {
    sl: compra ? c.precio - riesgo : c.precio + riesgo,
    tp: compra ? c.precio + veces * riesgo : c.precio - veces * riesgo,
  }
}

// Stop y objetivo a la MISMA distancia, y la misma en compra que en venta.
//
// No es para usarla de verdad: es una regla de medir. Con 1 a 1, el resultado
// por unidad de riesgo depende SOLO de cuántas veces se acierta la dirección
// (2 × aciertos − 1). Nada de "el stop quedó pegado" ni "el objetivo estaba
// lejísimos": si con esto una señal gana, es porque apunta al lado correcto.
//
// Existe por una razón concreta: al comprar un par que viene cayendo, el
// mínimo reciente queda pegado al precio y el máximo de 20 días lejísimos, así
// que la geometría de la app infla sola el resultado. Medir la inversión de
// las ventas con esa geometría era comparar dos cosas distintas.
export function simetrica(c, compra, { riesgoATR = 1.5 } = {}) {
  const d = riesgoATR * atrDe(c)
  return {
    sl: compra ? c.precio - d : c.precio + d,
    tp: compra ? c.precio + d : c.precio - d,
  }
}

// La propuesta: estructura, pero acotada, y objetivo en veces el riesgo.
//
// El stop sigue saliendo del mínimo (o máximo) de 10 días como hoy, porque ahí
// es donde de verdad se rompe la idea. Lo nuevo es que se le ponen topes:
//   · nunca a menos de MIN_ATR, para que no lo tumbe el ruido de un día;
//   · nunca a más de MAX_ATR, para que una sola operación no se coma el
//     presupuesto de riesgo entero.
//
// Y el objetivo pasa a ser un múltiplo del riesgo REAL de esa operación. Con
// eso la relación riesgo/beneficio deja de ser una lotería y vale siempre lo
// que decidamos.
export function estructuraAcotada(c, compra, { minATR = 1, maxATR = 2.5, veces = 2 } = {}) {
  const atr = atrDe(c)
  const bruto = compra ? c.precio - (c.lo10 - 0.5 * atr) : c.hi10 + 0.5 * atr - c.precio
  const riesgo = acotar(bruto, minATR * atr, maxATR * atr)
  return {
    sl: compra ? c.precio - riesgo : c.precio + riesgo,
    tp: compra ? c.precio + veces * riesgo : c.precio - veces * riesgo,
  }
}

// Las que compara el banco de pruebas.
//
// El "cuántas veces el riesgo" es la decisión de fondo y por eso hay tres: un
// objetivo más ambicioso paga más cuando acierta pero acierta menos veces, y
// dónde está el punto dulce se mide, no se opina. Como referencia: apuntando
// al doble del riesgo hace falta acertar más del 33% para no perder; al triple
// basta con el 25%.
export const GEOMETRIAS = [
  ['A. La de hoy (mín. 10 días / máx. 20 días)', actual],
  ['B. ATR fijo 1,5 → objetivo 2× el riesgo', (c, compra) => atrFijo(c, compra)],
  ['C. Estructura acotada 1-2,5 ATR → 1,5×', (c, compra) => estructuraAcotada(c, compra, { veces: 1.5 })],
  ['D. Estructura acotada 1-2,5 ATR → 2×', (c, compra) => estructuraAcotada(c, compra)],
  ['E. Estructura acotada 1-2,5 ATR → 3×', (c, compra) => estructuraAcotada(c, compra, { veces: 3 })],
]
