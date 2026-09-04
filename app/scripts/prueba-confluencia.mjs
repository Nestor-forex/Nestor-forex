// Prueba del filtro de confluencia multi-temporal. Sin internet:
//
//     node scripts/prueba-confluencia.mjs
//
// POR QUÉ ESTE ARCHIVO ES APARTE DE prueba-marketcalc.mjs
// ------------------------------------------------------
// El mercado de mentira de aquel usa fechas con forma de fecha pero
// imposibles ("2026-01-045"). Para todo lo que se comprobaba allí daba igual:
// las fechas eran solo etiquetas. Aquí NO da igual, porque reagrupar en
// semanas y en meses LEE la fecha. Con aquellas fechas los 80 días caerían
// todos en el mismo mes y la serie mensual tendría un solo punto: la prueba
// pasaría sin haber ejercitado nada.
//
// Es el mismo error que ya mordió en la app hermana, donde un mercado
// sintético demasiado limpio dejaba cero setups y la prueba comparaba dos
// listas vacías. Por eso aquí hay una comprobación explícita de que el filtro
// MUERDE: que rechaza señales de verdad. Sin ella, todo lo demás pasaría en
// verde midiendo la nada.

import {
  computarBarrido,
  derivarVista,
  reagrupar,
  tendenciaDe,
  CCY,
} from '../src/lib/marketCalc.js'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// ------------------------------------------------------------------ mercado
//
// Fechas REALES y consecutivas, saltándose los fines de semana como hace el
// mercado de divisas. 400 días naturales dan unos 285 días hábiles ≈ 57
// semanas ≈ 13 meses: suficiente para la EMA20 semanal (20 semanas) y para la
// EMA6 mensual (6 meses), que es lo que hay que poder ejercitar.
const fechas = []
for (let i = 0; i < 400; i++) {
  const d = new Date(Date.UTC(2025, 0, 1) + i * 86400000)
  const dia = d.getUTCDay()
  if (dia === 0 || dia === 6) continue
  fechas.push(d.toISOString().slice(0, 10))
}

// Cada divisa lleva una onda LENTA (periodo ~200 días, que es lo que ven el
// mensual y el semanal) y otra RÁPIDA (periodo ~13 días, que solo ve el
// diario), cada una con su propia fase. Así los tres marcos discrepan de
// verdad en vez de decir siempre lo mismo, que es justo lo que este filtro
// tiene que poder distinguir.
const rates = {}
const rangosPar = {}
fechas.forEach((d, i) => {
  rates[d] = {}
  CCY.slice(1).forEach((c, k) => {
    const base = { EUR: 0.92, GBP: 0.78, JPY: 150, CHF: 0.88, AUD: 1.52, NZD: 1.65, CAD: 1.35 }[c]
    const lenta = Math.sin(i / 32 + k * 0.9) * 0.035
    const rapida = Math.sin(i / 2.1 + k * 1.7) * 0.006
    rates[d][c] = base * (1 + lenta + rapida)
  })
})
// Máximos y mínimos alrededor del cierre, para que el ATR de Wilder tenga algo
// que morder. No hace falta que sean realistas: no es lo que se mide aquí.
fechas.forEach((d) => {
  rangosPar[d] = {}
})

const data = computarBarrido(fechas, rates, rangosPar)

// ------------------------------------------------------- reagrupar y tendencia

console.log('\nReagrupar la serie en semanas y meses')
{
  const closes = fechas.map((_, i) => i)
  const claveMes = (x) => x.slice(0, 7)
  const porMes = reagrupar(fechas, closes, claveMes)
  const mesesDistintos = new Set(fechas.map(claveMes)).size

  comprobar(porMes.length === mesesDistintos, `un punto por mes (${porMes.length} meses)`)
  comprobar(porMes.length >= 12, `y hay meses de sobra para la EMA6 mensual (${porMes.length})`)
  // El valor de cada mes tiene que ser el ÚLTIMO día de ese mes, no el primero
  // ni el promedio. Con `closes` = el índice, el último de cada grupo es
  // comprobable a mano.
  const ultimoDeCadaMes = []
  for (let i = 0; i < fechas.length; i++) {
    if (i === fechas.length - 1 || claveMes(fechas[i + 1]) !== claveMes(fechas[i])) {
      ultimoDeCadaMes.push(i)
    }
  }
  comprobar(
    JSON.stringify(porMes) === JSON.stringify(ultimoDeCadaMes),
    'y ese punto es el ÚLTIMO cierre del mes, no el primero ni la media'
  )

  const claveSem = (x) =>
    Math.floor(Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10)) / 604800000)
  const porSem = reagrupar(fechas, closes, claveSem)
  comprobar(porSem.length >= 50, `hay semanas de sobra para la EMA20 semanal (${porSem.length})`)
  comprobar(
    porSem.length < fechas.length / 4,
    'y reagrupar de verdad comprime la serie (no la deja igual)'
  )
}

console.log('\nSin historia suficiente, un marco dice "no sé" (Rango)')
{
  comprobar(tendenciaDe([1, 2, 3], 10, 20) === 'Rango', 'con 3 datos y una EMA20 devuelve Rango')
  comprobar(
    tendenciaDe(Array.from({ length: 40 }, (_, i) => 100 + i), 10, 20) === 'Alcista',
    'con datos suficientes y subiendo, Alcista'
  )
  comprobar(
    tendenciaDe(Array.from({ length: 40 }, (_, i) => 100 - i), 10, 20) === 'Bajista',
    'y bajando, Bajista'
  )
  // Es lo que evita que "no tengo datos" se cuele como confirmación.
  comprobar(
    tendenciaDe([], 10, 20) === 'Rango' && tendenciaDe([5], 10, 20) === 'Rango',
    'una serie vacía o de un punto también es Rango, no un error'
  )
}

console.log('\nLos tres marcos existen y NO son el mismo')
{
  const conTend = data.pares.filter((p) => p.tend !== 'Rango')
  comprobar(conTend.length > 0, `hay pares con tendencia diaria clara (${conTend.length})`)
  comprobar(
    data.pares.every((p) => ['Alcista', 'Bajista', 'Rango'].includes(p.tendSem)),
    'todos los pares traen tendencia semanal'
  )
  comprobar(
    data.pares.every((p) => ['Alcista', 'Bajista', 'Rango'].includes(p.tendMes)),
    'y tendencia mensual'
  )
  // Si los tres marcos coincidieran siempre, el filtro no podría aportar nada
  // POR CONSTRUCCIÓN y medirlo sería perder el tiempo. Este mercado tiene que
  // producir desacuerdos.
  const discrepan = data.pares.filter((p) => p.tendSem !== p.tend || p.tendMes !== p.tend)
  comprobar(discrepan.length > 0, `y discrepan entre sí en ${discrepan.length} de ${data.pares.length} pares`)
}

// ------------------------------------------------------------------- el filtro

console.log('\nApagado es idéntico a que no exista')
{
  const sinNada = derivarVista(data, { thr: 0, incluirVentas: true })
  const conNull = derivarVista(data, { thr: 0, incluirVentas: true, confluenciaMin: null })
  comprobar(
    JSON.stringify(sinNada.pares.map((p) => p.sesgo)) ===
      JSON.stringify(conNull.pares.map((p) => p.sesgo)),
    'confluenciaMin: null clasifica exactamente igual que no pasarlo'
  )
  comprobar(
    JSON.stringify(sinNada.setups.map((s) => `${s.name}|${s.lado}`)) ===
      JSON.stringify(conNull.setups.map((s) => `${s.name}|${s.lado}`)),
    'y produce los mismos setups: el cambio es aditivo'
  )
}

console.log('\nEl filtro MUERDE (si no, todo lo demás mide la nada)')
const vistas = {}
for (const n of [null, 1, 2, -1]) {
  vistas[n] = derivarVista(data, { thr: 0, incluirVentas: true, confluenciaMin: n })
}
{
  const sesgos = (v) => v.pares.map((p) => p.sesgo)
  const operables = (v) => sesgos(v).filter((s) => s === 'COMPRA' || s === 'VENTA').length
  const base = operables(vistas[null])
  comprobar(base > 0, `sin filtro hay ${base} pares operables`)
  comprobar(
    operables(vistas[2]) < base,
    `exigir los 2 marcos deja menos (${operables(vistas[2])} de ${base}): rechaza de verdad`
  )
}

console.log('\nEs simétrico: recorta los DOS lados')
{
  // El error del ADX en la app hermana fue gobernar dos cosas opuestas con un
  // solo número y mirar solo una. Si este filtro solo mirara "Alcista",
  // recortaría las compras y dejaría las ventas intactas, y el resultado
  // parecería una mejora cuando sería "la app opera menos compras".
  const cuenta = (v, lado) => v.pares.filter((p) => p.sesgo === lado).length
  const compras0 = cuenta(vistas[null], 'COMPRA')
  const ventas0 = cuenta(vistas[null], 'VENTA')
  comprobar(compras0 > 0 && ventas0 > 0, `sin filtro hay compras (${compras0}) y ventas (${ventas0})`)
  comprobar(
    cuenta(vistas[2], 'COMPRA') <= compras0 && cuenta(vistas[2], 'VENTA') <= ventas0,
    'con el filtro ninguno de los dos lados crece'
  )
  comprobar(
    cuenta(vistas[2], 'COMPRA') < compras0 || cuenta(vistas[2], 'VENTA') < ventas0,
    'y al menos uno se recorta'
  )
}

console.log('\nLas exigencias se anidan como deben')
{
  const conjunto = (n, lado) =>
    new Set(vistas[n].pares.filter((p) => p.sesgo === lado).map((p) => p.name))

  for (const lado of ['COMPRA', 'VENTA']) {
    const dos = conjunto(2, lado)
    const uno = conjunto(1, lado)
    const cero = conjunto(null, lado)
    comprobar(
      [...dos].every((x) => uno.has(x)),
      `${lado}: lo que pasa con 2 marcos también pasa con 1`
    )
    comprobar(
      [...uno].every((x) => cero.has(x)),
      `${lado}: y lo que pasa con 1 también pasaba sin filtro`
    )
  }
}

console.log('\nEl CONTROL es de verdad lo contrario')
{
  // Un par no puede tener a la vez "los dos marcos acompañan" y "ninguno
  // acompaña". Si se solaparan, el control no serviría para descartar que el
  // filtro esté midiendo ruido.
  for (const lado of ['COMPRA', 'VENTA']) {
    const dos = new Set(vistas[2].pares.filter((p) => p.sesgo === lado).map((p) => p.name))
    const control = vistas[-1].pares.filter((p) => p.sesgo === lado).map((p) => p.name)
    comprobar(
      control.every((x) => !dos.has(x)),
      `${lado}: el control no comparte ni un par con la confluencia total`
    )
  }
  const controlOperables = vistas[-1].pares.filter(
    (p) => p.sesgo === 'COMPRA' || p.sesgo === 'VENTA'
  ).length
  comprobar(controlOperables > 0, `y el control sí produce señales (${controlOperables}), o no se podría comparar`)
}

console.log('\nVIGILAR no se toca')
{
  // El filtro rechaza operaciones, no información. Un par que la app pondría
  // "en vigilancia" tiene que seguir apareciendo ahí: es lo que le dice a
  // Néstor que hay algo moviéndose aunque no se opere.
  const vig = (v) => v.pares.filter((p) => p.sesgo === 'VIGILAR').length
  comprobar(
    vig(vistas[2]) >= vig(vistas[null]),
    'con el filtro, los rechazados caen a VIGILAR en vez de desaparecer'
  )
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(fallos ? 1 : 0)
