// Prueba del chequeo del carry. Sin internet:
//
//     node scripts/prueba-carry.mjs
//
// Las formas en que esto puede MENTIR sin fallar:
//
//   1. usar una tasa ANTES de que existiera, que es mirar el futuro — lo único
//      que convierte una medición en un cuento;
//   2. rellenar con 0 la tasa que falta, con lo que media resta se presenta
//      como una resta;
//   3. meter las señales sin dato en «en contra», con lo que un periodo sin
//      tasas publicadas se leería como un periodo con el carry en contra;
//   4. repartir por ruido las que tienen un diferencial tan pequeño que se lo
//      come el margen del bróker;
//   5. y devolver un veredicto, que convertiría un diagnóstico en un filtro
//      sin que nadie lo hubiera decidido.

import { readFileSync } from 'node:fs'
import { monedasDe } from '../src/lib/pairs.js'
import {
  DIAS_MARGEN,
  UMBRAL_NEUTRO,
  clasificarCarry,
  difDeTasas,
  repartir,
  tasaEn,
} from './lib/carry.mjs'

let fallos = 0
const comprobar = (que, bien) => {
  console.log(`${bien ? '  OK  ' : '  MAL '} ${que}`)
  if (!bien) fallos++
}

// Una serie de mentira con dos escalones conocidos.
const SERIE_USD = [
  { f: '2025-01-15', v: 4.5 },
  { f: '2025-06-10', v: 4.0 },
  { f: '2026-02-01', v: 3.625 },
]
const SERIE_JPY = [
  { f: '2025-01-15', v: 0.25 },
  { f: '2025-09-20', v: 0.5 },
  { f: '2026-03-19', v: 1.0 },
]
const SERIES = { USD: SERIE_USD, JPY: SERIE_JPY }

console.log('\n1. La tasa vigente en una fecha')
{
  comprobar('después del primer escalón → ese valor', tasaEn(SERIE_USD, '2025-03-01') === 4.5)
  comprobar('después del segundo → el segundo', tasaEn(SERIE_USD, '2025-07-01') === 4.0)
  comprobar('mucho después → el último', tasaEn(SERIE_USD, '2026-10-01') === 3.625)
  comprobar('el mismo día del escalón (+margen) → el nuevo', tasaEn(SERIE_USD, '2025-06-12') === 4.0)
}

console.log('\n2. ⚠️ NO mira el futuro')
{
  // La señal es del 1 de enero y el primer dato es del 15. No hay tasa.
  comprobar('antes del primer dato → null, no el primero', tasaEn(SERIE_USD, '2025-01-01') === null)
  // El día exacto del cambio, con el margen de 2 días, todavía NO se usa el
  // valor nuevo: se usa el anterior. Es el lado prudente.
  comprobar(
    `el día del escalón todavía da el valor VIEJO (margen de ${DIAS_MARGEN} días)`,
    tasaEn(SERIE_USD, '2025-06-10') === 4.5
  )
  comprobar('un día después del escalón, aún el viejo', tasaEn(SERIE_USD, '2025-06-11') === 4.5)
  // Y la comprobación que de verdad importa: con margen 0 sí se vería el
  // mismo día. Si alguien quitara el margen, esto lo cantaría.
  comprobar('con margen 0 el mismo día ya daría el nuevo', tasaEn(SERIE_USD, '2025-06-10', { diasMargen: 0 }) === 4.0)
}

console.log('\n3. ⚠️ Ante la duda null, NUNCA 0')
{
  comprobar('serie vacía → null', tasaEn([], '2025-06-01') === null)
  comprobar('sin serie → null', tasaEn(undefined, '2025-06-01') === null)
  comprobar('fecha con basura → null', tasaEn(SERIE_USD, 'ayer') === null)
  comprobar('fecha vacía → null', tasaEn(SERIE_USD, '') === null)
  comprobar('un valor que no es número se salta', tasaEn([{ f: '2025-01-01', v: 'cuatro' }], '2025-06-01') === null)
}

console.log('\n4. El diferencial del par')
{
  // USD/JPY el 2025-07-01: USD 4,0 − JPY 0,25 = 3,75
  comprobar('USD/JPY = tasa(USD) − tasa(JPY)', difDeTasas('USD/JPY', '2025-07-01', SERIES, monedasDe) === 3.75)
  // Y al revés cambia de signo.
  comprobar('JPY/USD es el mismo número al revés', difDeTasas('JPY/USD', '2025-07-01', SERIES, monedasDe) === -3.75)

  // ⚠️ El fallo que se cazó abriendo `pairs.js`: `monedasDe` devuelve un
  // ARRAY, no un objeto con `.base`. Si alguien lo cambiara a objeto sin
  // tocar esto, TODAS las señales saldrían sin dato en silencio.
  comprobar('media resta no es una resta: falta una divisa → null', difDeTasas('USD/CHF', '2025-07-01', SERIES, monedasDe) === null)
  comprobar('par que no existe → null', difDeTasas('XXX/YYY', '2025-07-01', SERIES, monedasDe) === null)
  comprobar('par con basura → null', difDeTasas(null, '2025-07-01', SERIES, monedasDe) === null)
  comprobar('sin fecha → null', difDeTasas('USD/JPY', undefined, SERIES, monedasDe) === null)
}

console.log('\n5. A favor, en contra, o indiferente')
{
  const s = (par, lado, vistoEl = '2025-07-01') => ({ par, lado, vistoEl })
  // USD paga 4,0 y JPY 0,25 → comprar USD/JPY cobra carry.
  comprobar('comprar el que paga más → a favor', clasificarCarry(s('USD/JPY', 'COMPRA'), SERIES, monedasDe) === 'aFavor')
  comprobar('venderlo → en contra', clasificarCarry(s('USD/JPY', 'VENTA'), SERIES, monedasDe) === 'enContra')
  comprobar('y al revés con el par dado la vuelta', clasificarCarry(s('JPY/USD', 'COMPRA'), SERIES, monedasDe) === 'enContra')
}

console.log('\n6. ⚠️ La banda neutra, para no repartir por ruido')
{
  // Dos divisas casi iguales: la diferencia se la come el margen del bróker.
  const casi = { AAA: [{ f: '2025-01-01', v: 3.0 }], BBB: [{ f: '2025-01-01', v: 3.1 }] }
  const monedasFalsas = (p) => p.split('/')
  const señal = { par: 'AAA/BBB', lado: 'COMPRA', vistoEl: '2025-07-01' }
  comprobar(`una diferencia de 0,1 (< ${UMBRAL_NEUTRO}) es neutra`, clasificarCarry(señal, casi, monedasFalsas) === 'neutro')

  const claro = { AAA: [{ f: '2025-01-01', v: 3.0 }], BBB: [{ f: '2025-01-01', v: 1.0 }] }
  comprobar('una de 2 puntos sí se reparte', clasificarCarry(señal, claro, monedasFalsas) === 'aFavor')

  // El borde exacto.
  const borde = { AAA: [{ f: '2025-01-01', v: 3.0 }], BBB: [{ f: '2025-01-01', v: 3 - UMBRAL_NEUTRO }] }
  comprobar('justo en el umbral ya NO es neutra', clasificarCarry(señal, borde, monedasFalsas) === 'aFavor')
}

console.log('\n7. ⚠️⚠️ Lo que no se sabe se cuenta APARTE, no como «en contra»')
{
  const senales = [
    { par: 'USD/JPY', lado: 'COMPRA', vistoEl: '2025-07-01' }, // a favor
    { par: 'USD/JPY', lado: 'VENTA', vistoEl: '2025-07-01' }, // en contra
    { par: 'USD/CHF', lado: 'COMPRA', vistoEl: '2025-07-01' }, // sin CHF en las series
    { par: 'USD/JPY', lado: 'COMPRA', vistoEl: '2025-01-01' }, // antes del primer dato
  ]
  const c = repartir(senales, SERIES, monedasDe)
  comprobar('una a favor', c.aFavor.length === 1)
  comprobar('una en contra', c.enContra.length === 1)
  comprobar('DOS sin dato, y en su propio cubo', c.sinDato.length === 2)
  comprobar('y ninguna de ésas se coló en «en contra»', c.enContra.every((s) => s.par === 'USD/JPY' && s.lado === 'VENTA'))
  comprobar('los cubos suman el total', c.aFavor.length + c.enContra.length + c.neutro.length + c.sinDato.length === senales.length)
  comprobar('sin señales no revienta', repartir(undefined, SERIES, monedasDe).aFavor.length === 0)
  // Una señal a medio escribir no puede caer en un montón bueno.
  comprobar('una señal sin lado va a sinDato', repartir([{ par: 'USD/JPY', vistoEl: '2025-07-01' }], SERIES, monedasDe).sinDato.length === 1)
}

console.log('\n8. ⚠️ ES UN DIAGNÓSTICO: no devuelve ningún veredicto')
{
  // Añadir un veredicto aquí convertiría un diagnóstico en un filtro sin que
  // nadie lo hubiera decidido. Es la misma comprobación que vigila `cot.js`.
  const fuente = readFileSync(new URL('./lib/carry.mjs', import.meta.url), 'utf8')
  const prohibidas = ['sugiere', 'recomend', 'conviene operar', 'mejor lado', 'veredicto']
  const coladas = prohibidas.filter((p) => new RegExp(p, 'i').test(fuente.replace(/^\s*\/\/.*$/gm, '')))
  comprobar(`no asoma ningún veredicto en el código (${coladas.join(', ') || 'ninguna'})`, coladas.length === 0)
  comprobar(
    'y está escrito que es un diagnóstico y no un filtro',
    /DIAGN[ÓO]STICO, NO UNA REGLA NI UN FILTRO/i.test(fuente)
  )
  comprobar(
    'y que la diferencia de tasas NO es el swap',
    /diferencia de tasas \*\*NO es el swap\*\*|diferencia de tasas NO es el swap/i.test(fuente)
  )
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'El chequeo del carry mide lo que dice medir.')
process.exit(fallos ? 1 : 0)
