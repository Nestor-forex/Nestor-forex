// LO QUE CUESTA OPERAR DE VERDAD.
//
// Hasta ahora el banco de pruebas descontaba 1,5 pips de spread, iguales para
// los 14 pares, y NADA más. Las dos cosas están mal, y la segunda es grave.
//
// ─────────────────────────────────────────────────────────────────────────
// 1. EL SPREAD NO ES IGUAL EN TODOS LOS PARES
// ─────────────────────────────────────────────────────────────────────────
// EUR/USD es el par más operado del mundo y cuesta menos de 1 pip. NZD/CHF o
// GBP/CAD cuestan tranquilamente 3 o 4. Usar 1,5 para todos hace que los pares
// baratos parezcan peores de lo que son y —lo importante— que los caros
// parezcan MEJORES. Y los cruces caros son la mitad de la lista.
//
// ─────────────────────────────────────────────────────────────────────────
// 2. EL SWAP NO SE CONTABA. NI UN PIP.
// ─────────────────────────────────────────────────────────────────────────
// El swap es lo que el bróker cobra (o paga) por cada NOCHE que una operación
// sigue abierta. En intradía da igual, porque se cierra el mismo día. En swing
// no: las operaciones duran una MEDIANA DE 12 O 13 DÍAS.
//
// A medio pip por noche son 6 pips por operación. A dos pips por noche son 25.
// Sobre un sistema que mide −0,06 por unidad de riesgo, eso no es un detalle:
// puede ser la diferencia entre "pierde poquito" y "pierde bastante".
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ EL SWAP VA COMO BARRIDO Y NO COMO UN NÚMERO
// ─────────────────────────────────────────────────────────────────────────
// Podría inventarme una tabla de swaps por par y por dirección y presentar un
// número final. Sería más cómodo de leer y sería mentira: el swap depende del
// diferencial de tipos de interés de cada momento y del margen que le meta
// cada bróker, cambia mes a mes, y yo no tengo su histórico de cinco años.
//
// Así que no se elige un número: se MIDE A VARIOS NIVELES y se enseña a partir
// de cuál cambia la conclusión. Esa es la pregunta que importa —"¿me puede
// hundir el swap?"— y se puede contestar honestamente sin inventar datos.
//
// Cuando Néstor mire el swap real de su bróker, busca su nivel en la tabla y
// ya sabe en qué fila está.

// ─────────────────────────────────────────────────────────────────────────
// SPREADS TÍPICOS, EN PIPS
// ─────────────────────────────────────────────────────────────────────────
//
// ⚠️ SON ESTIMACIONES DE BRÓKER MINORISTA, NO LOS DE TU CUENTA. Están puestos
// en el lado alto de lo normal a propósito: si el número final sale bien con
// costes generosos, sale bien de verdad; al revés, uno se engaña solo.
//
// PARA AFINARLOS: abre tu plataforma con el mercado abierto, mira el spread de
// cada par y cámbialo aquí. Es el único sitio donde hay que tocarlo — lo usan
// el banco de pruebas y cualquier medición futura. Con los de tu bróker, los
// números dejan de ser una estimación y pasan a ser los tuyos.
export const SPREAD_PIPS = {
  // Los mayores: mucho volumen, spread pequeño.
  'EUR/USD': 0.9,
  'GBP/USD': 1.3,
  'USD/JPY': 1.0,
  'USD/CHF': 1.5,
  'USD/CAD': 1.6,
  'AUD/USD': 1.1,
  'NZD/USD': 1.7,
  // Los cruces: sin dólar de por medio, menos volumen y spread bastante mayor.
  // El bróker los arma combinando dos pares, así que se pagan los dos.
  'EUR/CHF': 2.2,
  'EUR/CAD': 2.8,
  'EUR/NZD': 3.5,
  'GBP/CAD': 3.2,
  'GBP/JPY': 2.4,
  'NZD/CHF': 3.6,
  'NZD/CAD': 3.4,
}

// Para un par que no esté en la tabla. Alto a propósito: que un par nuevo se
// mida caro hasta que alguien ponga su número real, y no barato por descuido.
export const SPREAD_POR_DEFECTO = 3.0

export function spreadDe(par) {
  return SPREAD_PIPS[par] ?? SPREAD_POR_DEFECTO
}

// ─────────────────────────────────────────────────────────────────────────
// NIVELES DE SWAP QUE SE MIDEN, EN PIPS POR NOCHE
// ─────────────────────────────────────────────────────────────────────────
//
// El 0 no es realista: sirve de referencia, para ver cuánto se mueve todo lo
// demás respecto a no contar nada (que es lo que se hacía hasta ahora).
//
// El rango 0,25–2,0 cubre lo que se ve en la práctica en pares mayores y
// cruces de un bróker minorista. Va en positivo —o sea, siempre como COSTE—
// aunque en la realidad una de las dos direcciones a veces COBRA swap. Es otra
// vez la elección incómoda a propósito: suponer que siempre se paga es el peor
// caso, y un número que aguanta el peor caso es un número en el que se puede
// confiar.
export const NIVELES_SWAP = [0, 0.25, 0.5, 1.0, 2.0]

/**
 * Lo que cuesta una operación, en pips.
 *
 * @param par            nombre del par, p. ej. 'EUR/USD'
 * @param noches         cuántas noches estuvo abierta (0 en intradía)
 * @param swapPipsNoche  a qué nivel de swap se está midiendo
 *
 * El spread se paga UNA vez (al abrir y cerrar, ya va todo junto en el
 * número de la tabla). El swap se paga por cada noche.
 */
export function costeEnPips(par, noches = 0, swapPipsNoche = 0) {
  return spreadDe(par) + Math.max(0, noches) * swapPipsNoche
}
