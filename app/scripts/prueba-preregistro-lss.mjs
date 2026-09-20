// Comprobaciones del preregistro de «ruptura de estructura sola» y de su
// generador de sombra. Sin internet y sin créditos.
//
// ⚠️ LO QUE ESTE ARCHIVO TIENE QUE GARANTIZAR, Y ES LO ÚNICO QUE IMPORTA:
//
//   1. Que el listón MUERDA. Un preregistro que aprueba cualquier cosa es peor
//      que no tener preregistro: da la apariencia de rigor sin el rigor.
//   2. Que la regla nazca APAGADA y no pueda llegar a un celular.
//   3. Que solo se anote la señal de HOY, no cinco años de golpe.

import { PREREGISTRO, CRITERIOS, juzgar } from './lib/preregistro-lss.mjs'
import { PARAMS, setupsLSS } from './lib/lss-sombra.mjs'
import { esSombra, idDe, separarSombra } from './lib/vigia-nucleo.mjs'
import { senalesLSS, pivotesConocidos } from '../src/lib/lss.js'

let mal = 0
let n = 0
const ok = (cond, que) => {
  n++
  if (!cond) {
    mal++
    console.log(`  MAL — ${que}`)
  }
}
const titulo = (t) => console.log(`\n${t}`)

// Un resultado que pasa TODOS los criterios. Cada bloque de abajo le estropea
// UNO y exige que el veredicto se caiga.
const BUENO = Object.freeze({
  ops: 200,
  porRiesgo: 0.08,
  primeraMitad: 0.07,
  segundaMitad: 0.09,
  app: -0.04,
  conSwap05: 0.04,
  mayorPar: 0.2,
})

// ───────────────────────────────────────────────────────────────────────────
titulo('1. El preregistro dice lo que dice, y con fecha')

{
  ok(PREREGISTRO.fecha === '2026-09-20', 'lleva la fecha dentro')
  ok(
    PREREGISTRO.fuenteDelVeredicto === 'registro hacia adelante',
    'y dice EXPRESAMENTE que no se juzga con el histórico',
  )
  // ⚠️ El histórico se guarda como promesa a comprobar, NO como veredicto. Si
  // alguien lo usara para aprobar la regla, estaría aprobándola con el mismo
  // número con el que la eligió.
  ok(PREREGISTRO.historico.ops === 792, 'guarda lo que prometió el histórico')
  ok(
    PREREGISTRO.historico.segundaMitad < 0,
    'y guarda que DECAÍA, que es el dato incómodo — si se borrara, nadie sabría que arrancó cojeando',
  )
  ok(Object.isFrozen(PREREGISTRO), 'está congelado: no se puede editar sobre la marcha')
  ok(Object.isFrozen(CRITERIOS), 'y los criterios también')
}

// ───────────────────────────────────────────────────────────────────────────
titulo('2. ⚠️ EL LISTÓN MUERDE: cada criterio, roto por separado')

{
  ok(juzgar(BUENO).pasa === true, 'un resultado bueno pasa los seis')
  ok(juzgar(BUENO).detalle.length === CRITERIOS.length, 'y el detalle trae los seis')
}

// Cada caso estropea UNO solo y tiene que tumbar el veredicto entero.
const ROTOS = [
  ['muestra', { ...BUENO, ops: 149 }, 'con 149 operaciones NO basta (el mínimo es 150)'],
  ['gana', { ...BUENO, porRiesgo: 0 }, 'empatar NO es ganar: cero no pasa'],
  ['mitades', { ...BUENO, segundaMitad: -0.01 }, 'perder en la segunda mitad tumba el veredicto'],
  ['mitades', { ...BUENO, primeraMitad: 0 }, 'empatar en una mitad tampoco basta'],
  ['mejorQueLaApp', { ...BUENO, app: 0.08 }, 'empatar con la app no la supera'],
  ['aguantaSwap', { ...BUENO, conSwap05: -0.01 }, 'si no aguanta medio pip de swap, no pasa'],
  ['noEsUnPar', { ...BUENO, mayorPar: 0.41 }, 'un par que aporta el 41 % tumba el veredicto'],
]

for (const [id, r, que] of ROTOS) {
  const v = juzgar(r)
  ok(v.pasa === false, que)
  const fallado = v.detalle.find((d) => d.id === id)
  ok(fallado && fallado.pasa === false, `  …y el criterio que falla es precisamente «${id}»`)
}

{
  // Los BORDES exactos, que es donde se cuela el autoengaño.
  ok(juzgar({ ...BUENO, ops: 150 }).pasa === true, 'exactamente 150 operaciones SÍ pasa')
  ok(juzgar({ ...BUENO, mayorPar: 0.4 }).pasa === true, 'exactamente el 40 % en un par SÍ pasa')
  ok(juzgar({ ...BUENO, porRiesgo: 0.001 }).pasa === true, 'ganar poquísimo sigue siendo ganar')
}

{
  // ⚠️ Ante la duda, NO se asciende. Es la misma asimetría de `esSombra`:
  // equivocarse hacia «no pasa» retrasa una decisión; hacia «pasa» enciende
  // una regla sin probar.
  ok(juzgar({}).pasa === false, 'un resultado vacío NO pasa')
  ok(juzgar(null).pasa === false, 'un resultado nulo tampoco')
  ok(juzgar(undefined).pasa === false, 'ni uno sin definir')
  ok(juzgar({ ...BUENO, app: null }).pasa === false, 'si falta el número de la app, no se aprueba a ciegas')
  ok(juzgar({ ...BUENO, conSwap05: undefined }).pasa === false, 'ni si falta el del swap')
}

// ───────────────────────────────────────────────────────────────────────────
titulo('3. ⚠️ LA REGLA NACE APAGADA Y NO PUEDE AVISAR A NADIE')

{
  const s = { name: 'EUR/USD', lado: 'COMPRA', tipo: 'lss' }
  ok(esSombra(s) === true, 'una señal `lss` es SOMBRA')
  ok(idDe(s) === 'EUR/USD|COMPRA|lss', 'y su identificador lleva el tipo dentro (si no, chocaría con la de la app)')

  // La que de verdad importa: que NO salga por el canal que despierta el
  // celular de Néstor. Es el fallo que ya estuvo a punto de publicarse con
  // «comprar la caída» el 2026-09-07.
  const { visibles, sombra } = separarSombra([
    { id: 'a', s: { name: 'EUR/USD', lado: 'COMPRA', tipo: 'lss' } },
    { id: 'b', s: { name: 'GBP/USD', lado: 'COMPRA' } },
  ])
  ok(sombra.length === 1 && sombra[0].id === 'a', 'la señal `lss` cae en la lista de sombra')
  ok(
    visibles.every((x) => x.s.tipo !== 'lss'),
    'y NINGUNA señal `lss` llega a la lista que puede mandar avisos',
  )
}

// ───────────────────────────────────────────────────────────────────────────
titulo('4. Los parámetros son los que se preregistraron')

{
  ok(PARAMS.exigirSweep === false, 'sin exigir el barrido — es el cambio que decide')
  ok(PARAMS.slBufferAtr === 0, 'sin colchón de ATR en el stop')
  ok(PARAMS.rr === 1, 'objetivo fijo a 1 vez el riesgo')
  ok(PARAMS.swingLen === PREREGISTRO.swingLen, 'y la sensibilidad del pivote coincide con la preregistrada')
  ok(Object.isFrozen(PARAMS), 'están congelados')
}

{
  // ⚠️ Con el barrido apagado, `sweepWindow` NO puede cambiar ni una señal —
  // solo la etiqueta informativa. Si algún día la cambiara, el registro
  // estaría midiendo una regla distinta de la preregistrada sin que nadie lo
  // note.
  const V = (h, l, c) => ({ h, l, c })
  const velas = []
  let precio = 100
  let semilla = 31337
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < 500; i++) {
    precio += (azar() - 0.5) * 8
    velas.push(V(precio + azar() * 4, precio - azar() * 4, precio))
  }
  const clave = (ss) => JSON.stringify(ss.map((x) => [x.i, x.lado, x.entrada, x.sl, x.tp]))
  const a = senalesLSS(velas, { ...PARAMS, sweepWindow: 1 })
  const b = senalesLSS(velas, { ...PARAMS, sweepWindow: 200 })
  ok(a.length > 5, `el mercado de prueba da señales (${a.length})`)
  ok(clave(a) === clave(b), 'con el barrido apagado, la ventana NO cambia ni una señal ni un nivel')
}

// ───────────────────────────────────────────────────────────────────────────
titulo('5. El generador de sombra: solo lo de HOY, y revienta si faltan datos')

// Mercado inventado de dos pares, con la forma que tiene el barrido real.
//
// ⚠️ LA PRIMERA VERSIÓN DE ESTE MERCADO NO SERVÍA, y el motivo está ya
// documentado en este repo (`prueba-barrido-publicado.mjs`): era una onda
// demasiado limpia, con `swingLen: 8` casi no formaba pivotes que se
// rompieran, y daba CERO señales. La prueba habría pasado comparando dos
// listas vacías — que es la peor forma de pasar.
//
// Ahora lleva paseo aleatorio + una onda con su propia fase por par, así que
// forma pivotes de verdad y los rompe. Si alguien toca estos números, mirar
// que la comprobación de «hay señales a lo largo del tiempo» siga pasando.
function mercado(nDias, semillaInicial = 99) {
  const fechas = []
  const rangosPar = {}
  const pares = [
    { name: 'EUR/USD', dec: 4 },
    { name: 'USD/JPY', dec: 2 },
  ]
  let semilla = semillaInicial
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const base = { 'EUR/USD': 1.1, 'USD/JPY': 150 }
  const nivel = { 'EUR/USD': 0, 'USD/JPY': 0 }
  for (let i = 0; i < nDias; i++) {
    const f = `2024-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
    fechas.push(f)
    rangosPar[f] = {}
    for (const [k, p] of pares.entries()) {
      const esc = p.name.includes('JPY') ? 1 : 0.007
      nivel[p.name] += (azar() - 0.5) * 3
      const c = base[p.name] + (nivel[p.name] + Math.sin(i / 5 + k * 2) * 4) * esc
      rangosPar[f][p.name] = { h: c + azar() * 2.5 * esc, l: c - azar() * 2.5 * esc, c }
    }
  }
  return { fechas, rangosPar, pares }
}

// Añade al final una vela que ROMPE hacia arriba el último pivote conocido, de
// modo que haya señal EXACTAMENTE en la última vela. Sin esto, que la señal
// caiga justo hoy es cuestión de suerte y la comprobación que más importa
// —«solo se anota la de hoy»— se quedaría sin caso que mirar.
function conRupturaAlFinal(m) {
  const fechas = [...m.fechas]
  const rangosPar = { ...m.rangosPar }
  const f = '2024-12-27'
  fechas.push(f)
  rangosPar[f] = {}
  for (const p of m.pares) {
    const velas = m.fechas.map((d) => m.rangosPar[d][p.name])
    const { altos } = pivotesConocidos(velas, PARAMS.swingLen)
    const nivel = altos[altos.length - 1]
    const esc = p.name.includes('JPY') ? 1 : 0.007
    // Cierra por encima del nivel, con margen para que el riesgo no redondee
    // a cero pips.
    const c = (nivel ?? velas[velas.length - 1].c) + 3 * esc
    rangosPar[f][p.name] = { h: c + esc, l: c - 6 * esc, c }
  }
  return { fechas, rangosPar, pares: m.pares }
}

{
  const { fechas, rangosPar, pares } = mercado(400)

  // ⚠️ Antes de nada: que el mercado de prueba PRODUZCA señales. Si no, todo
  // lo de abajo pasaría comparando listas vacías.
  let conSenal = 0
  let totalSenales = 0
  for (const p of pares) {
    const velas = fechas.map((d) => rangosPar[d][p.name])
    const todas = senalesLSS(velas, PARAMS)
    if (todas.length > 0) conSenal++
    totalSenales += todas.length
  }
  ok(conSenal === pares.length, `el mercado de prueba da señales en los ${pares.length} pares (dio en ${conSenal})`)
  ok(totalSenales > 10, `y bastantes a lo largo del tiempo (${totalSenales}) — si no, esto no comprobaría nada`)
}

{
  const { fechas, rangosPar, pares } = conRupturaAlFinal(mercado(400))
  const setups = setupsLSS(fechas, rangosPar, pares)

  ok(setups.length > 0, `con una ruptura en la última vela SÍ salen setups (${setups.length})`)
  ok(setups.every((s) => s.tipo === 'lss'), 'todas llevan `tipo: lss`')
  ok(setups.every((s) => esSombra(s)), 'y TODAS son sombra')
  ok(setups.every((s) => s.name && s.lado && s.crudo), 'tienen la forma de setup que el vigía escribe')
  ok(
    setups.every((s) => typeof s.crudo.dec === 'number'),
    '`crudo.dec` es número — el log del vigía hace `precio.toFixed(dec)` y sin esto reventaría',
  )
  ok(
    setups.every((s) => s.crudo.rsi === null && s.crudo.atrPct === null && s.crudo.tend === null),
    'RSI, ATR y tendencia van en NULL: esta regla no los usa y rellenarlos sería mentir en el historial',
  )
  ok(
    setups.every((s) => s.crudo.pipRiesgo >= 1 && s.crudo.pipBeneficio >= 0),
    'ninguna con riesgo de cero pips',
  )
  ok(
    setups.every((s) =>
      s.lado === 'COMPRA'
        ? s.crudo.sl < s.crudo.precio && s.crudo.tp > s.crudo.precio
        : s.crudo.sl > s.crudo.precio && s.crudo.tp < s.crudo.precio,
    ),
    'stop y objetivo en los lados correctos',
  )
  ok(
    setups.every((s) => Math.abs(s.crudo.rr - 1) < 1e-9),
    'el objetivo está exactamente a 1 vez el riesgo, como se preregistró',
  )
  ok(
    new Set(setups.map((s) => idDe(s))).size === setups.length,
    'no hay dos setups con el mismo identificador',
  )
}

{
  // ⚠️⚠️ LA COMPROBACIÓN MÁS IMPORTANTE DE ESTE ARCHIVO.
  //
  // Solo se anota la señal de la ÚLTIMA vela. Sin esto, la primera corrida
  // metería de golpe años de señales viejas fechadas como si fueran de hoy, y
  // el historial —que vale precisamente porque registra lo que la app dijo ESE
  // día— quedaría envenenado SIN DAR NINGÚN ERROR.
  const { fechas, rangosPar, pares } = conRupturaAlFinal(mercado(400))
  const setups = setupsLSS(fechas, rangosPar, pares)

  ok(
    setups.length <= pares.length,
    `nunca salen más setups que pares: una señal por par como mucho (salieron ${setups.length})`,
  )

  for (const s of setups) {
    const velas = fechas.map((d) => rangosPar[d][s.name])
    const todas = senalesLSS(velas, PARAMS)
    const ultima = todas[todas.length - 1]
    ok(ultima.i === velas.length - 1, `${s.name}: la señal anotada es la de la ÚLTIMA vela`)
    ok(Math.abs(ultima.entrada - s.crudo.precio) < 1e-12, `${s.name}: y sus niveles son los de esa vela`)
    // Y lo que hace que la comprobación de arriba NO sea vacía: la serie
    // tiene señales VIEJAS. Si solo hubiera una, «se anotó la última» y «se
    // anotó la primera» serían lo mismo y esto no probaría nada.
    ok(todas.length > 1, `${s.name}: la serie tiene ${todas.length} señales, no solo la de hoy`)
    ok(
      todas[0].i < velas.length - 1,
      `${s.name}: y la primera es MUY anterior — si el código anotara ésa, la comprobación de arriba se cae`,
    )
    // 📌 Aquí había antes una comprobación que exigía que el precio anotado no
    // coincidiera con el de ninguna señal vieja. Fallaba, y no por un fallo
    // del código: la vela que esta prueba fuerza al final dio por casualidad
    // el MISMO cierre que una vela anterior. Comparar PRECIOS para saber si
    // dos señales son la misma es un sustituto flojo; lo que identifica una
    // señal es su índice, y eso es lo que se mira ahora.
  }
}

{
  // Y al revés: si la última vela NO rompe nada, NO se anota nada, aunque la
  // serie esté llena de señales viejas.
  const { fechas, rangosPar, pares } = mercado(400)
  const setups = setupsLSS(fechas, rangosPar, pares)
  for (const s of setups) {
    const velas = fechas.map((d) => rangosPar[d][s.name])
    const todas = senalesLSS(velas, PARAMS)
    ok(todas[todas.length - 1].i === velas.length - 1, `${s.name}: si se anota, es porque rompió HOY`)
  }
}

{
  // Revienta en vez de devolver cero señales. Una lista vacía se lee como «hoy
  // no hubo señales» y es indistinguible de «llevo ocho meses sin anotar
  // nada» — y el historial no se puede recuperar.
  const { fechas, rangosPar, pares } = mercado(120)
  const revienta = (fn, que) => {
    let salto = false
    try {
      fn()
    } catch {
      salto = true
    }
    ok(salto, que)
  }
  revienta(() => setupsLSS([], rangosPar, pares), 'sin fechas REVIENTA')
  revienta(() => setupsLSS(fechas, rangosPar, []), 'sin pares REVIENTA')
  revienta(() => setupsLSS(fechas, {}, pares), 'sin velas REVIENTA (es el caso de `barrido.json`)')
  revienta(
    () => setupsLSS(fechas, rangosPar, [...pares, { name: 'XXX/YYY', dec: 4 }]),
    'con un par que no está en las velas REVIENTA, en vez de saltárselo en silencio',
  )
}

console.log(`\n${mal ? `✗ ${mal} de ${n} MAL` : `✓ las ${n} comprobaciones pasan`}\n`)
process.exit(mal ? 1 : 0)
