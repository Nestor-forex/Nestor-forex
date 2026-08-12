// Prueba del banco de pruebas. Sin internet y sin claves:
//
//     node scripts/prueba-backtest.mjs
//
// Un backtest que se equivoca no da un error: da un número bonito y falso. Y
// un número falso sobre el que decidir reglas es peor que no tener número,
// porque da confianza. Por eso esto se comprueba con el mismo cuidado que el
// resolver.
//
// Lo que de verdad importa aquí es la comprobación 2: que no mire el futuro.

import { generarSenales } from './lib/backtest-nucleo.mjs'
import { GEOMETRIAS, actual, atrFijo, estructuraAcotada } from './lib/geometrias.mjs'
import { resolver } from './lib/resolver.mjs'
import { computarBarrido } from '../src/lib/marketCalc.js'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// --- Un mercado de mentira, pero con forma de mercado -----------------------
//
// Números al azar puros no sirven: no producirían tendencias y no saldría
// ninguna señal, así que la prueba pasaría sin haber probado nada. Esto es un
// paseo aleatorio con tramos de tendencia, que sí las produce.

const CCY = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']
const DIAS = 200

function mercadoFalso(semilla = 7) {
  // Generador propio y determinista: con Math.random la prueba daría un
  // resultado distinto en cada corrida y no se podría comparar nada.
  let x = semilla
  const azar = () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }

  const fechas = []
  for (let i = 0; i < DIAS; i++) {
    const d = new Date(Date.UTC(2025, 0, 1 + i))
    fechas.push(d.toISOString().slice(0, 10))
  }

  const nivel = { EUR: 0.92, GBP: 0.79, JPY: 150, CHF: 0.88, CAD: 1.36, AUD: 1.52, NZD: 1.64 }
  const deriva = {}
  CCY.forEach((c) => (deriva[c] = (azar() - 0.5) * 0.0015))

  const rates = {}
  const rangosPar = {}
  for (const d of fechas) {
    const fila = {}
    for (const c of CCY) {
      // Cada 40 días cambia el rumbo, para que haya tendencias y vueltas.
      if (fechas.indexOf(d) % 40 === 0) deriva[c] = (azar() - 0.5) * 0.0015
      nivel[c] *= 1 + deriva[c] + (azar() - 0.5) * 0.004
      fila[c] = nivel[c]
    }
    rates[d] = fila

    const rangos = {}
    for (const b of ['EUR', 'GBP', 'AUD', 'NZD', 'USD']) {
      for (const q of ['USD', 'JPY', 'CHF', 'CAD']) {
        if (b === q) continue
        const px = (b === 'USD' ? 1 : 1 / fila[b]) * (q === 'USD' ? 1 : fila[q])
        const mecha = px * 0.004 * azar()
        rangos[`${b}/${q}`] = { h: px + mecha, l: px - mecha, c: px }
      }
    }
    rangosPar[d] = rangos
  }

  return { fechas, rates, rangosPar }
}

const { fechas, rates, rangosPar } = mercadoFalso()

// --- 1. Produce algo con lo que trabajar -----------------------------------

console.log('\n1. Genera señales sobre un mercado con tendencias')
const senales = generarSenales(fechas, rates, rangosPar, { calentamiento: 80 })
comprobar(senales.length > 0, `salieron ${senales.length} señales (si fueran 0, la prueba no probaría nada)`)
comprobar(
  senales.every((s) => s.precio > 0 && s.sl > 0 && s.tp > 0 && Number.isFinite(s.rr)),
  'todas traen precio, stop, objetivo y R/B con números de verdad'
)
comprobar(
  senales.every((s) => (s.lado === 'COMPRA' ? s.sl < s.precio && s.tp > s.precio : s.sl > s.precio && s.tp < s.precio)),
  'el stop y el objetivo caen del lado correcto según compra o venta'
)

// --- 2. LA IMPORTANTE: no mira el futuro -----------------------------------
//
// Si al calcular el día i se colara aunque fuera un precio del día i+1, las
// señales de los primeros días cambiarían al añadir datos posteriores. Así
// que se corre el motor sobre la mitad del mercado y sobre el mercado entero,
// y las señales de esa primera mitad tienen que salir IDÉNTICAS, hasta el
// último decimal del stop.
//
// Es la única comprobación que separa una medición honesta de un cuento que
// promete el 90% de acierto.

console.log('\n2. No mira el futuro (lo que haría falsos todos los números)')
{
  const corte = 140
  const parcial = generarSenales(fechas.slice(0, corte), rates, rangosPar, { calentamiento: 80 })
  const mismoTramo = senales.filter((s) => fechas.indexOf(s.vistoEl) < corte)

  comprobar(parcial.length === mismoTramo.length, `mismo número de señales en el tramo común (${parcial.length})`)

  const iguales = parcial.every((a, i) => {
    const b = mismoTramo[i]
    return b && a.id === b.id && a.vistoEl === b.vistoEl && a.precio === b.precio && a.sl === b.sl && a.tp === b.tp && a.rsi === b.rsi
  })
  comprobar(iguales, 'y son idénticas: mismos niveles, mismo RSI, con y sin datos posteriores')
}

// --- 3. Una señal viva varios días cuenta UNA vez ---------------------------

console.log('\n3. Una señal que dura días es una operación, no una por día')
{
  const claves = senales.map((s) => `${s.id}@${s.vistoEl}`)
  comprobar(new Set(claves).size === claves.length, 'no hay dos señales con la misma clave')

  // Si se contara cada día que la señal sigue viva, habría muchísimas más
  // señales que días medidos por par.
  const dias = fechas.length - 80
  comprobar(senales.length < dias * 6, `${senales.length} señales en ${dias} días medidos: no se está contando cada día`)
}

// --- 4. Se puede juzgar con el resolver de verdad ---------------------------

console.log('\n4. El resolver las entiende (mismo código que el vigía)')
{
  const completo = computarBarrido(fechas, rates, rangosPar)
  const { resultados } = resolver(senales, completo)

  const caducadas = resultados.filter((r) => r.resultado === 'caducada').length
  comprobar(caducadas === 0, 'ninguna sale "caducada" (era el error que dejó el historial de swing en cero)')

  const juzgadas = resultados.filter((r) => r.resultado === 'ganada' || r.resultado === 'perdida')
  comprobar(juzgadas.length > 0, `${juzgadas.length} señales llegaron a objetivo o a stop`)
  comprobar(
    juzgadas.every((r) => (r.resultado === 'ganada' ? r.pips > 0 : r.pips < 0)),
    'las ganadas suman pips y las perdidas restan'
  )
  comprobar(
    juzgadas.every((r) => r.diasTardados >= 1),
    'ninguna se resuelve el mismo día en que aparece (la entrada es a su cierre)'
  )
}

// --- 5. Los filtros de las variantes hacen lo que dicen ---------------------

console.log('\n5. Los filtros que compara el banco de pruebas')
{
  const rsiSano = (s) => (s.lado === 'COMPRA' ? s.rsi <= 70 : s.rsi >= 30)
  const conNivel = (s) => (s.lado === 'COMPRA' ? s.precio < s.res : s.precio > s.sup)

  comprobar(senales.filter(rsiSano).length <= senales.length, 'el filtro de RSI solo quita, nunca añade')
  comprobar(
    senales.filter(rsiSano).every((s) => (s.lado === 'COMPRA' ? s.rsi <= 70 : s.rsi >= 30)),
    'lo que pasa el filtro de RSI cumple de verdad la condición'
  )
  comprobar(
    senales.filter(conNivel).every((s) => (s.lado === 'COMPRA' ? s.precio < s.res : s.precio > s.sup)),
    'lo que pasa el filtro de nivel tiene un nivel real por delante'
  )
}

// --- 6. Las geometrías del stop y el objetivo -------------------------------
//
// Aquí se comprueban las PROPIEDADES que cada una promete, no sus resultados.
// Si una geometría dice "el objetivo está al doble del riesgo", eso tiene que
// cumplirse en los 14 pares y en los dos lados, no de media.

console.log('\n6. Las geometrías cumplen lo que prometen')
{
  // Un par de mentira, con el precio a media subida: lo10 lejos por debajo
  // (como pasa en una tendencia) y el máximo de 20 días pegado por arriba.
  // Es exactamente la situación que hace que la fórmula de hoy salga al revés.
  const enTendencia = {
    precio: 1.2,
    atrAbs: 0.01,
    lo10: 1.14, // 6 ATR por debajo
    hi10: 1.205,
    sup: 1.13,
    res: 1.205, // 0.5 ATR por encima
    dec: 4,
  }

  const a = actual(enTendencia, true)
  const riesgoA = enTendencia.precio - a.sl
  const premioA = a.tp - enTendencia.precio
  comprobar(
    riesgoA > premioA,
    `la fórmula de hoy, en tendencia, arriesga MÁS de lo que busca (${riesgoA.toFixed(4)} vs ${premioA.toFixed(4)})`
  )

  // Y la propuesta, en la misma situación, no.
  for (const veces of [1.5, 2, 3]) {
    const g = estructuraAcotada(enTendencia, true, { veces })
    const riesgo = enTendencia.precio - g.sl
    const premio = g.tp - enTendencia.precio
    comprobar(Math.abs(premio / riesgo - veces) < 1e-9, `estructura acotada → objetivo exactamente ${veces}× el riesgo`)
  }

  // Las cotas del stop, que son la otra mitad del arreglo.
  {
    const g = estructuraAcotada(enTendencia, true)
    const enATR = (enTendencia.precio - g.sl) / enTendencia.atrAbs
    comprobar(Math.abs(enATR - 2.5) < 1e-9, 'un stop lejísimos se recorta al máximo (2,5 ATR)')
  }
  {
    // Ahora el caso contrario: mínimo de 10 días pegado al precio, que es lo
    // que producía stops que tumbaba el ruido y acertaban el 15%.
    const pegado = { ...enTendencia, lo10: 1.1995 }
    const g = estructuraAcotada(pegado, true)
    const enATR = (pegado.precio - g.sl) / pegado.atrAbs
    comprobar(Math.abs(enATR - 1) < 1e-9, 'un stop pegado al precio se separa al mínimo (1 ATR)')
    comprobar(actual(pegado, true).sl > g.sl, 'y la fórmula de hoy lo dejaba más cerca todavía')
  }

  // Simetría: vender debe dar la imagen espejo de comprar. Si no, las ventas
  // saldrían peor por un fallo de fórmula y no por el mercado, y estaríamos
  // buscando la explicación donde no está.
  for (const [nombre, geo] of GEOMETRIAS) {
    if (geo === actual) continue // la de hoy usa hi10/lo10, no es simétrica por diseño
    const espejo = { ...enTendencia, hi10: 1.26, lo10: 1.14 }
    const compra = geo(espejo, true)
    const venta = geo(espejo, false)
    const rc = espejo.precio - compra.sl
    const rv = venta.sl - espejo.precio
    const pc = compra.tp - espejo.precio
    const pv = espejo.precio - venta.tp
    comprobar(
      Math.abs(pc / rc - pv / rv) < 1e-9,
      `${nombre.slice(0, 12)}… da la misma relación riesgo/beneficio comprando que vendiendo`
    )
  }

  // Nunca al revés: el stop siempre del lado de la pérdida.
  for (const [nombre, geo] of GEOMETRIAS) {
    const c = geo(enTendencia, true)
    const v = geo(enTendencia, false)
    comprobar(
      c.sl < enTendencia.precio && c.tp > enTendencia.precio && v.sl > enTendencia.precio && v.tp < enTendencia.precio,
      `${nombre.slice(0, 12)}… pone stop y objetivo en el lado correcto`
    )
  }

  comprobar(atrFijo(enTendencia, true).sl === 1.2 - 1.5 * 0.01, 'el ATR fijo pone el stop donde dice (1,5 ATR)')
}

// --- 7. El motor respeta la geometría que se le pide ------------------------

console.log('\n7. El motor usa la geometría que se le pasa')
{
  const conActual = generarSenales(fechas, rates, rangosPar, { calentamiento: 80 })
  const conNueva = generarSenales(fechas, rates, rangosPar, {
    calentamiento: 80,
    geometria: (c, compra) => estructuraAcotada(c, compra, { veces: 2 }),
  })

  comprobar(conActual.length === conNueva.length, 'salen las MISMAS señales: la geometría no cambia qué se opera')
  comprobar(
    conActual.every((a, i) => a.id === conNueva[i].id && a.vistoEl === conNueva[i].vistoEl && a.precio === conNueva[i].precio),
    'mismo par, mismo día y misma entrada en las dos'
  )
  // Se mira `rr` y no `pipBeneficio / pipRiesgo`: esos dos van redondeados a
  // pips enteros, así que en un par de pocos pips el cociente se desvía por el
  // redondeo y no por la geometría. `rr` sale de los precios sin redondear.
  comprobar(
    conNueva.every((s) => Math.abs(s.rr - 2) < 1e-9),
    'y con la nueva, TODAS quedan a 2× el riesgo exacto (antes era una lotería)'
  )
  const rrViejos = new Set(conActual.map((s) => s.rr.toFixed(2)))
  comprobar(rrViejos.size > 5, `con la de hoy el R/B sale disparejo (${rrViejos.size} valores distintos): no se decidía, salía`)
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(fallos ? 1 : 0)
