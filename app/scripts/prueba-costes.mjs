// Prueba del modelo de costes. Sin internet:
//
//     node scripts/prueba-costes.mjs
//
// Un error aquí no se ve: el banco de pruebas seguiría imprimiendo una tabla
// con buena pinta, solo que los números estarían mal. Y esos números son los
// que deciden si una regla se enciende o se apaga — o sea, si Néstor le pone
// dinero.
//
// El error más peligroso sería el de SIGNO: que un coste sumara en vez de
// restar. La tabla saldría mejor cuantos más costes se descuentan, que es
// exactamente el autoengaño que este archivo intenta impedir.

import { spreadDe, costeEnPips, SPREAD_PIPS, SPREAD_POR_DEFECTO, NIVELES_SWAP } from './lib/costes.mjs'
import { PAIRS } from '../src/lib/marketCalc.js'
import { medir } from './lib/backtest-nucleo.mjs'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}
const cerca = (a, b, tol, que) => comprobar(Math.abs(a - b) <= tol, que)

// --- 1. Todos los pares que la app opera tienen su precio -----------------
//
// Si faltara uno, se mediría con el valor por defecto sin que nadie lo note.

console.log('\n1. Los 14 pares de la app tienen su spread')
{
  const nombres = PAIRS.map(([b, q]) => `${b}/${q}`)
  const faltan = nombres.filter((n) => !(n in SPREAD_PIPS))
  comprobar(faltan.length === 0, faltan.length ? `FALTAN: ${faltan.join(', ')}` : `los ${nombres.length} están en la tabla`)

  const sobran = Object.keys(SPREAD_PIPS).filter((n) => !nombres.includes(n))
  comprobar(sobran.length === 0, sobran.length ? `sobran (ya no se operan): ${sobran.join(', ')}` : 'y no sobra ninguno')
}

// --- 2. Los cruces cuestan más que los mayores ----------------------------
//
// No es un adorno: es la razón de que la tabla exista. Con un spread único los
// cruces salían BARATOS y por tanto mejores de lo que son, y son la mitad de
// la lista.

console.log('\n2. Los cruces cuestan más que los pares con dólar')
{
  const conDolar = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD']
  const cruces = ['EUR/CHF', 'EUR/CAD', 'EUR/NZD', 'GBP/CAD', 'GBP/JPY', 'NZD/CHF', 'NZD/CAD']
  const peorMayor = Math.max(...conDolar.map(spreadDe))
  const mejorCruce = Math.min(...cruces.map(spreadDe))
  comprobar(mejorCruce > peorMayor, `el cruce más barato (${mejorCruce}) cuesta más que el mayor más caro (${peorMayor})`)
  comprobar(spreadDe('EUR/USD') === Math.min(...conDolar.map(spreadDe)), 'EUR/USD es el más barato, como en el mercado real')
}

// --- 3. Un par desconocido se mide CARO, no barato ------------------------

console.log('\n3. Un par que no está en la tabla se mide caro')
{
  const desconocido = spreadDe('XXX/YYY')
  comprobar(desconocido === SPREAD_POR_DEFECTO, `usa el valor por defecto (${SPREAD_POR_DEFECTO})`)
  comprobar(
    desconocido >= Math.max(...Object.values(SPREAD_PIPS)) * 0.8,
    'y ese valor es alto, para que un par nuevo no parezca barato por descuido'
  )
}

// --- 4. El swap se paga POR NOCHE ----------------------------------------

console.log('\n4. El swap se cobra por cada noche abierta')
{
  const par = 'EUR/USD'
  const base = spreadDe(par)
  cerca(costeEnPips(par, 0, 0.5), base, 1e-12, 'sin noches, solo se paga el spread')
  cerca(costeEnPips(par, 1, 0.5), base + 0.5, 1e-12, 'una noche añade un swap')
  cerca(costeEnPips(par, 12, 0.5), base + 6, 1e-12, '12 noches (la mediana real) añaden 6 pips')
  cerca(costeEnPips(par, 12, 2.0), base + 24, 1e-12, 'y a 2 pips por noche, 24')

  // La diferencia entre las dos filas de arriba es el motivo de que esto exista:
  // 18 pips de diferencia por operación según el bróker que se use.
  comprobar(
    costeEnPips(par, 12, 2.0) - costeEnPips(par, 12, 0.5) === 18,
    'entre el bróker barato y el caro hay 18 pips por operación'
  )
}

// --- 5. EL ERROR DE SIGNO, que es el que arruinaría todo ------------------
//
// Si un coste restara en vez de sumar, la tabla saldría MEJOR cuantos más
// costes se descuentan. Nadie lo notaría leyendo, porque los números seguirían
// teniendo buena pinta — solo que dirían lo contrario de la verdad.

console.log('\n5. Más costes SIEMPRE es peor, nunca mejor')
{
  const par = 'GBP/JPY'
  let creciente = true
  let anterior = -Infinity
  for (const nivel of NIVELES_SWAP) {
    const c = costeEnPips(par, 10, nivel)
    if (c < anterior) creciente = false
    anterior = c
  }
  comprobar(creciente, `el coste sube en cada nivel de swap: ${NIVELES_SWAP.join(', ')}`)

  let masNoches = true
  anterior = -Infinity
  for (const noches of [0, 1, 5, 20, 60]) {
    const c = costeEnPips(par, noches, 1.0)
    if (c < anterior) masNoches = false
    anterior = c
  }
  comprobar(masNoches, 'y sube también cuantas más noches se aguante la operación')

  comprobar(costeEnPips(par, 0, 0) > 0, 'incluso sin swap se paga algo: el spread nunca es cero')
}

// --- 6. Entradas raras no rompen ni regalan dinero ------------------------

console.log('\n6. Entradas raras no rompen la cuenta')
{
  const par = 'EUR/USD'
  cerca(costeEnPips(par, -5, 1.0), spreadDe(par), 1e-12, 'noches negativas se tratan como cero, no como un descuento')
  cerca(costeEnPips(par), spreadDe(par), 1e-12, 'sin argumentos, solo el spread')
  comprobar(Number.isFinite(costeEnPips('XXX/YYY', 100, 2)), 'un par desconocido con muchas noches sigue dando un número')
}

// --- 7. Los niveles que se miden cubren lo realista ----------------------

console.log('\n7. Los niveles de swap que se barren tienen sentido')
{
  comprobar(NIVELES_SWAP.includes(0), 'incluye el 0, para comparar contra no contar nada')
  comprobar(Math.max(...NIVELES_SWAP) >= 2, 'y llega a 2 pips por noche, el lado caro de lo normal')
  comprobar(
    NIVELES_SWAP.every((n, i) => i === 0 || n > NIVELES_SWAP[i - 1]),
    'y van ordenados de menor a mayor, para que la tabla se lea de corrido'
  )
}


// --- 8. LA CUENTA QUE PRODUCE TODOS LOS NÚMEROS --------------------------
//
// `medir()` es de donde salen el acierto, los pips y el "por 1R" con los que
// se decide encender o apagar una regla. Hasta ahora vivía dentro de
// backtest.mjs y no se podía probar sin internet: la cuenta que más pesa era
// la única sin comprobar.

console.log('\n8. La cuenta del banco de pruebas aplica bien los costes')
{
  // Una operación ganada y una perdida, con riesgo y beneficio conocidos, para
  // poder calcular a mano lo que tiene que salir.
  const senales = [
    { id: 'A', vistoEl: 't1', par: 'EUR/USD', pipRiesgo: 100, pipBeneficio: 200 },
    { id: 'B', vistoEl: 't2', par: 'EUR/USD', pipRiesgo: 100, pipBeneficio: 200 },
  ]
  const porClave = new Map([
    ['A@t1', { resultado: 'ganada', pips: 200, diasTardados: 10 }],
    ['B@t2', { resultado: 'perdida', pips: -100, diasTardados: 10 }],
  ])

  const sin = medir(senales, porClave)
  comprobar(sin.total === 2 && sin.ganadas === 1, 'cuenta las dos operaciones, una ganada')
  cerca(sin.acierto, 50, 1e-9, 'el acierto es el 50%')
  // Ganada +2R, perdida −1R → media +0,5R.
  cerca(sin.porRiesgo, 0.5, 1e-9, 'sin costes da +0,5 por unidad de riesgo')
  cerca(sin.pips, 100, 1e-9, 'y +100 pips netos')

  // Con costes: spread de EUR/USD (0,9) + 10 noches × 0,5 = 5,9 pips por
  // operación. Sobre un riesgo de 100 pips eso es 0,059 de cada unidad.
  const con = medir(senales, porClave, { conSpread: true, swapPipsNoche: 0.5 })
  cerca(con.porRiesgo, 0.5 - 0.059, 1e-9, 'con spread y 10 noches de swap baja a +0,441')
  // 100 − 2×5,9 = 88,2, y `medir` devuelve los pips REDONDEADOS a entero (son
  // para leer en una tabla, no para volver a operar con ellos). Por eso se
  // compara con 88 y no con 88,2.
  comprobar(con.pips === Math.round(100 - 2 * 5.9), 'y los pips bajan en el coste de las DOS operaciones')
  comprobar(con.acierto === sin.acierto, 'el acierto NO cambia: los costes no mueven quién ganó')

  // EL ERROR DE SIGNO, otra vez, pero ya en la cuenta final.
  comprobar(con.porRiesgo < sin.porRiesgo, 'contar costes SIEMPRE empeora el resultado, nunca lo mejora')

  // Que el swap dependa de las NOCHES, no de un número plano.
  const porClaveLargo = new Map([
    ['A@t1', { resultado: 'ganada', pips: 200, diasTardados: 30 }],
    ['B@t2', { resultado: 'perdida', pips: -100, diasTardados: 30 }],
  ])
  const largo = medir(senales, porClaveLargo, { conSpread: true, swapPipsNoche: 0.5 })
  comprobar(largo.porRiesgo < con.porRiesgo, 'aguantar 30 noches cuesta más que aguantar 10')

  // Y que el par importe: el mismo trato en un cruce caro cuesta más.
  const enCruce = senales.map((x) => ({ ...x, par: 'NZD/CHF' }))
  const caro = medir(enCruce, porClave, { conSpread: true, swapPipsNoche: 0.5 })
  comprobar(caro.porRiesgo < con.porRiesgo, 'la misma operación en un cruce caro rinde menos que en EUR/USD')

  // Las que no se resolvieron no cuentan ni a favor ni en contra.
  const conAbierta = medir(
    [...senales, { id: 'C', vistoEl: 't3', par: 'EUR/USD', pipRiesgo: 100, pipBeneficio: 200 }],
    porClave
  )
  comprobar(conAbierta.total === 2 && conAbierta.sinJuzgar === 1, 'una operación sin resolver se aparta, no se cuenta como perdida')
  cerca(conAbierta.porRiesgo, sin.porRiesgo, 1e-9, 'y no mueve el resultado')
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'El modelo de costes se comporta como debe.')
process.exit(fallos ? 1 : 0)
