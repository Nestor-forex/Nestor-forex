// Comprobaciones del solape entre filtros y de los descartes del candidato.
// SIN INTERNET.
//
//     node scripts/prueba-solape.mjs
//
// ⚠️ DE AQUÍ SALE EL DESCARTE MÁS IMPORTANTE de la segunda vuelta del COT: si
// ir contra los pequeños deja casi las mismas señales que ir contra los fondos,
// lo medido es el filtro que ya suspendió DOS VECES con otro rótulo. Un número
// mal calculado ahí no da ningún error: da un porcentaje plausible que absuelve
// o condena una regla.
//
// 📌 Y hay una razón concreta por la que esto no lo puede cubrir el humo: el
// doble de la CFTC genera a los pequeños con el signo EXACTAMENTE opuesto a los
// fondos, así que allí los dos filtros son disjuntos por construcción y el
// solape sale 0 % siempre. Una comprobación que solo puede ver un valor no
// comprueba nada.

import {
  CANDIDATO_PEQUENOS,
  DESCARTES_PEQUENOS,
  FUENTE_DEL_VEREDICTO_PEQUENOS_2,
  QUE_SIGNIFICA_SOBREVIVIR_PEQUENOS,
  juzgarDescartesPequenos,
} from './lib/preregistro-cot-pequenos-2.mjs'
import {
  CUADRANTES,
  claveDeSenal,
  cuadranteDe,
  filtrosPorCuadrante,
  repartoPorGrupo,
  solapeDeFiltros,
} from './lib/solape.mjs'

let hechas = 0
let fallos = 0
const ok = (cond, que) => {
  hechas++
  if (cond) return true
  fallos++
  console.error(`  ✗ ${que}`)
  return false
}
const casi = (a, b, txt) => ok(a != null && Math.abs(a - b) < 1e-9, `${txt} (esperaba ${b}, salió ${a})`)

// Señales con la forma real: lo que las identifica es `id@vistoEl`.
const s = (id, vistoEl, extra = {}) => ({ id, vistoEl, ...extra })

console.log('1. La clave de una señal es `id@vistoEl`, no el objeto')
{
  ok(claveDeSenal(s('EUR/USD|COMPRA', '2026-10-01')) === 'EUR/USD|COMPRA@2026-10-01', 'la clave se arma así')
  // ⚠️ La misma combinación par/lado reaparece, y cada aparición es una
  // operación distinta. Identificarlas solo por `id` las fundiría en una.
  const a = s('EUR/USD|COMPRA', '2026-10-01')
  const b = s('EUR/USD|COMPRA', '2026-11-01')
  ok(claveDeSenal(a) !== claveDeSenal(b), 'dos apariciones del mismo par y lado son dos señales')
  ok(claveDeSenal({ id: 'x' }) === null, 'sin fecha no hay clave')
  ok(claveDeSenal({ vistoEl: '2026-10-01' }) === null, 'sin id no hay clave')
  ok(claveDeSenal(null) === null, 'sin señal no hay clave')
}

console.log('2. El solape cuenta sobre el CANDIDATO, y NO es simétrico')
{
  // A deja 4, B deja 2, y comparten 2.
  const senales = [
    s('a', '1', { enA: true, enB: true }),
    s('b', '1', { enA: true, enB: true }),
    s('c', '1', { enA: true, enB: false }),
    s('d', '1', { enA: true, enB: false }),
    s('e', '1', { enA: false, enB: false }),
  ]
  const A = (x) => x.enA
  const B = (x) => x.enB

  const r = solapeDeFiltros(senales, A, B)
  ok(r.candidato === 4, `el candidato deja 4: ${r.candidato}`)
  ok(r.referencia === 2, `la referencia deja 2: ${r.referencia}`)
  ok(r.comunes === 2, `comparten 2: ${r.comunes}`)
  casi(r.fraccion, 0.5, 'la fracción es 2/4 = 0,5')

  // ⚠️ Al revés da OTRO número, y eso es correcto: la pregunta es «cuánto del
  // candidato ya lo cubre la referencia», no «cuánto se parecen». Un Jaccard
  // daría 2/4 = 0,5 aquí y 2/4 allá, o sea escondería la asimetría.
  const inv = solapeDeFiltros(senales, B, A)
  casi(inv.fraccion, 1, 'del lado contrario es 2/2 = 1: NO es simétrico')
  ok(r.fraccion !== inv.fraccion, 'y por eso los dos números son distintos')
}

console.log('3. Los dos extremos: idénticos y disjuntos')
{
  const senales = [s('a', '1', { v: 1 }), s('b', '1', { v: 2 }), s('c', '1', { v: 3 })]
  const pares = (x) => x.v % 2 === 0
  const impares = (x) => x.v % 2 === 1

  casi(solapeDeFiltros(senales, impares, impares).fraccion, 1, 'el mismo filtro consigo mismo solapa 100 %')
  casi(solapeDeFiltros(senales, impares, pares).fraccion, 0, 'dos filtros disjuntos solapan 0 %')
}

console.log('4. ⚠️ `null` cuando no se puede calcular, que NO absuelve')
{
  const senales = [s('a', '1'), s('b', '1')]
  // El candidato no deja nada: no hay nada que comparar. Un 0 ahí se leería
  // como «completamente independiente», la afirmación más favorable posible
  // justo donde no se midió nada.
  const r = solapeDeFiltros(senales, () => false, () => true)
  ok(r.fraccion === null, 'candidato vacío devuelve null, NO 0')
  ok(r.candidato === 0, 'y lo dice: 0 señales de candidato')
  ok(solapeDeFiltros([], () => true, () => true).fraccion === null, 'sin señales devuelve null')
  ok(solapeDeFiltros(null, () => true, () => true).fraccion === null, 'sin lista devuelve null')

  // ⚠️ Y el caso que distingue «no solapan» de «no se pudo mirar»: si la
  // REFERENCIA está vacía el solape también sale 0, y los dos casos se leen
  // igual en una tabla. Por eso se devuelven los dos conteos y no solo la
  // fracción.
  const sinRef = solapeDeFiltros(senales, () => true, () => false)
  casi(sinRef.fraccion, 0, 'referencia vacía da fracción 0')
  ok(sinRef.referencia === 0, 'y el conteo de referencia lo delata: 0')
}

console.log('5. Señales sin clave se saltan en vez de fundirse en una')
{
  // Dos señales sin `id`: si la clave fuera `undefined` para las dos, el Set
  // las contaría como UNA y el solape saldría mal.
  const senales = [{ pasa: true }, { pasa: true }, s('a', '1', { pasa: true })]
  const r = solapeDeFiltros(senales, (x) => x.pasa, (x) => x.pasa)
  ok(r.candidato === 1, `solo la que tiene clave cuenta: ${r.candidato}`)
}

console.log('6. El reparto crudo por grupo')
{
  const senales = [
    s('a', '1', { g: 'x', pasa: true }),
    s('b', '1', { g: 'x', pasa: true }),
    s('c', '1', { g: 'y', pasa: true }),
    s('d', '1', { g: 'y', pasa: false }),
    s('e', '1', { g: null, pasa: true }),
  ]
  const rep = repartoPorGrupo(senales, (x) => x.pasa, (x) => x.g)
  ok(rep.get('x') === 2, `el grupo x tiene 2: ${rep.get('x')}`)
  ok(rep.get('y') === 1, `el grupo y tiene 1 (la otra no pasa): ${rep.get('y')}`)
  ok(!rep.has(null) && rep.size === 2, 'la señal sin grupo no crea un montón nulo')
}

console.log('7. El candidato va FIJADO, no se busca')
{
  ok(CANDIDATO_PEQUENOS.dir === 'contra', 'la dirección es «contra»')
  ok(CANDIDATO_PEQUENOS.umbral === 0, 'el umbral es 0 — la fila con más operaciones')
  ok(DESCARTES_PEQUENOS.length === 6, `son seis descartes: ${DESCARTES_PEQUENOS.length}`)
  ok(
    new Set(DESCARTES_PEQUENOS.map((d) => d.id)).size === DESCARTES_PEQUENOS.length,
    'sin ids repetidos',
  )
  ok(
    DESCARTES_PEQUENOS.every((d) => d.que && d.porque),
    'cada descarte dice QUÉ exige y POR QUÉ',
  )
}

console.log('8. ⚠️ El veredicto se llama SOBREVIVE y no APROBADO')
{
  const bueno = {
    candidatoSenalesMes: 17.5,
    vecinosMejoran: true,
    baseSinCostes: -0.02,
    candidatoSinCostes: +0.07,
    mayorAporteDeUnPar: 0.12,
    solapeConFondos: 0.2,
    mayorAporteDeUnLadoDelDolar: 0.3,
  }
  const v = juzgarDescartesPequenos(bueno)
  ok(v.sobrevive === true, 'con todo bien, sobrevive')
  // ⚠️ Esto es lo que impide que el informe diga «aprobado»: el campo no existe.
  // «No se ha encontrado la razón por la que no vale» y «vale» se leen igual en
  // una tabla si no se separan, y el candidato se eligió a posteriori.
  ok(v.aprobado === undefined, 'y NO existe ningún campo `aprobado`')
  ok(
    Object.keys(v.criterios).length === DESCARTES_PEQUENOS.length,
    'hay un criterio juzgado por cada descarte escrito',
  )
  for (const d of DESCARTES_PEQUENOS) {
    ok(d.id in v.criterios, `el descarte «${d.id}» se juzga`)
  }
}

console.log('9. ⚠️ MUERDE: cada descarte tumba por su cuenta')
{
  const bueno = {
    candidatoSenalesMes: 17.5,
    vecinosMejoran: true,
    baseSinCostes: -0.02,
    candidatoSinCostes: +0.07,
    mayorAporteDeUnPar: 0.12,
    solapeConFondos: 0.2,
    mayorAporteDeUnLadoDelDolar: 0.3,
  }
  const rotos = {
    vecinos: { vecinosMejoran: false },
    sinCostes: { candidatoSinCostes: -0.05 },
    reparto: { mayorAporteDeUnPar: 0.55 },
    independiente: { solapeConFondos: 0.78 },
    noEsElDolar: { mayorAporteDeUnLadoDelDolar: 0.62 },
    habla: { candidatoSenalesMes: 4.1 },
  }
  for (const [id, cambio] of Object.entries(rotos)) {
    const v = juzgarDescartesPequenos({ ...bueno, ...cambio })
    ok(v.criterios[id] === false, `fallar «${id}» lo marca en rojo`)
    ok(v.sobrevive === false, `y tumba el conjunto entero`)
  }
}

console.log('10. ⚠️ Los bordes exactos, y «no se pudo medir» NO salva')
{
  const bueno = {
    candidatoSenalesMes: 17.5,
    vecinosMejoran: true,
    baseSinCostes: -0.02,
    candidatoSinCostes: +0.07,
    mayorAporteDeUnPar: 0.12,
    solapeConFondos: 0.2,
    mayorAporteDeUnLadoDelDolar: 0.3,
  }
  const con = (x) => juzgarDescartesPequenos({ ...bueno, ...x }).criterios

  ok(con({ candidatoSenalesMes: 10 }).habla === true, '10 señales al mes justas pasan')
  ok(con({ candidatoSenalesMes: 9.99 }).habla === false, 'y 9,99 no')
  ok(con({ mayorAporteDeUnPar: 0.4 }).reparto === true, 'el 40 % justo del par pasa')
  ok(con({ mayorAporteDeUnPar: 0.401 }).reparto === false, 'y el 40,1 % no')
  ok(con({ solapeConFondos: 0.599 }).independiente === true, 'el 59,9 % de solape pasa')
  ok(con({ solapeConFondos: 0.6 }).independiente === false, 'y el 60 % justo NO: es «menos del 60 %»')
  ok(con({ mayorAporteDeUnLadoDelDolar: 0.5 }).noEsElDolar === true, 'el 50 % justo del dólar pasa')
  ok(con({ mayorAporteDeUnLadoDelDolar: 0.501 }).noEsElDolar === false, 'y el 50,1 % no')

  // ⚠️ La asimetría de siempre: un `null` es «no se pudo medir» y eso no puede
  // leerse como un aprobado. Misma decisión que `pearson`.
  ok(con({ solapeConFondos: null }).independiente === false, 'solape sin medir NO salva')
  ok(con({ mayorAporteDeUnPar: null }).reparto === false, 'reparto por par sin medir NO salva')
  ok(con({ mayorAporteDeUnLadoDelDolar: null }).noEsElDolar === false, 'reparto por dólar sin medir NO salva')
  ok(con({ candidatoSinCostes: null }).sinCostes === false, 'columna sin costes ausente NO salva')
  ok(con({ baseSinCostes: null }).sinCostes === false, 'y sin la base tampoco')
  ok(con({ vecinosMejoran: null }).vecinos === false, 'vecinos sin medir NO salva')
}

console.log('11. El listón dice en voz alta de dónde saldría el veredicto limpio')
{
  ok(
    FUENTE_DEL_VEREDICTO_PEQUENOS_2 === 'registro hacia adelante',
    'la fuente del veredicto es el registro hacia adelante',
  )
  // ⚠️ Si alguien borra estas frases, el informe pasaría a leerse como un
  // aprobado normal. Es la misma guarda que vigila el aviso de «esto no es el
  // sentimiento minorista».
  ok(/NO ES UN APROBADO/.test(QUE_SIGNIFICA_SOBREVIVIR_PEQUENOS), 'dice que sobrevivir no es aprobar')
  ok(/DESPUÉS de ver la tabla/.test(QUE_SIGNIFICA_SOBREVIVIR_PEQUENOS), 'dice que el candidato se eligió a posteriori')
  ok(/FILTRO/.test(QUE_SIGNIFICA_SOBREVIVIR_PEQUENOS), 'recuerda que esto es un filtro')
  ok(/SENTIMIENTO MINORISTA/.test(QUE_SIGNIFICA_SOBREVIVIR_PEQUENOS), 'y que no dice nada de Myfxbook')
}

console.log('12. El cruce de dos filtros: cuatro celdas disjuntas y exhaustivas')
{
  // Un conjunto con las cuatro combinaciones representadas.
  const lista = [
    s('a', 'd1', { en: ['cand', 'ref'] }),
    s('b', 'd1', { en: ['cand', 'ref'] }),
    s('c', 'd1', { en: ['cand'] }),
    s('d', 'd1', { en: ['cand'] }),
    s('e', 'd1', { en: ['cand'] }),
    s('f', 'd1', { en: ['ref'] }),
    s('g', 'd1', { en: [] }),
  ]
  const cand = (x) => x.en.includes('cand')
  const ref = (x) => x.en.includes('ref')

  for (const [id, esperado] of [
    ['a', 'ambos'],
    ['c', 'soloCandidato'],
    ['f', 'soloReferencia'],
    ['g', 'ninguno'],
  ]) {
    const sx = lista.find((x) => x.id === id)
    ok(cuadranteDe(sx, cand, ref) === esperado, `«${id}» cae en «${esperado}»`)
  }

  const fs = filtrosPorCuadrante(cand, ref)
  ok(CUADRANTES.length === 4, 'hay cuatro celdas')
  const cuenta = {}
  for (const c of CUADRANTES) cuenta[c] = lista.filter(fs[c]).length
  casi(cuenta.ambos, 2, 'la celda «ambos» tiene 2')
  casi(cuenta.soloCandidato, 3, 'la de «solo el candidato» tiene 3')
  casi(cuenta.soloReferencia, 1, 'la de «solo la referencia» tiene 1')
  casi(cuenta.ninguno, 1, 'la de «ninguno» tiene 1')

  // ⚠️⚠️ LA PROPIEDAD QUE HACE QUE LA TABLA SIGNIFIQUE ALGO. Si las celdas no
  // suman el total, alguna señal se está contando dos veces o en ninguna
  // parte — y el informe se lee exactamente igual que si estuviera bien.
  const suma = CUADRANTES.reduce((a, c) => a + cuenta[c], 0)
  casi(suma, lista.length, 'las cuatro celdas suman TODAS las señales')
  casi(cuenta.ambos + cuenta.soloCandidato, lista.filter(cand).length, 'y las dos del candidato suman el candidato')
  casi(cuenta.ambos + cuenta.soloReferencia, lista.filter(ref).length, 'y las dos de la referencia, la referencia')

  // Y que de verdad son disjuntas: ninguna señal en dos celdas a la vez.
  const dobles = lista.filter((x) => CUADRANTES.filter((c) => fs[c](x)).length !== 1)
  ok(dobles.length === 0, `ninguna señal cae en dos celdas (${dobles.length} lo hacen)`)

  // ⚠️ LA TRUTHINESS, QUE NO ES ESTILO. Quien mide es `Array.filter`, que
  // decide por truthiness. Un filtro que devuelva un número o una cadena tiene
  // que caer en la MISMA celda que `filter` le daría; si no, las celdas dejan
  // de sumar lo que `medir` cuenta, en silencio.
  const raro = (x) => (x.en.includes('cand') ? 1 : 0)
  const refRara = (x) => (x.en.includes('ref') ? 'sí' : '')
  const fsRaros = filtrosPorCuadrante(raro, refRara)
  const sumaRara = CUADRANTES.reduce((a, c) => a + lista.filter(fsRaros[c]).length, 0)
  casi(sumaRara, lista.length, 'con filtros que devuelven valores truthy las celdas siguen sumando')
  casi(
    lista.filter(fsRaros.ambos).length + lista.filter(fsRaros.soloCandidato).length,
    lista.filter(raro).length,
    'y el candidato truthy cuadra con lo que `filter` le daría',
  )

  // Caso degenerado: dos filtros idénticos dejan «solo uno» vacíos.
  const fsIg = filtrosPorCuadrante(cand, cand)
  ok(lista.filter(fsIg.soloCandidato).length === 0, 'con filtros idénticos no hay «solo el candidato»')
  ok(lista.filter(fsIg.soloReferencia).length === 0, 'ni «solo la referencia»')
  casi(lista.filter(fsIg.ambos).length, lista.filter(cand).length, 'y «ambos» es el filtro entero')

  // Y la lista vacía: cuatro celdas vacías, no un reventón.
  const vacio = CUADRANTES.map((c) => [].filter(fs[c]).length)
  ok(
    vacio.every((x) => x === 0),
    'con la lista vacía las cuatro celdas salen vacías',
  )
}

console.log('')
if (fallos) {
  console.error(`✗ ${fallos} de ${hechas} comprobaciones fallaron.`)
  process.exit(1)
}
console.log(`✓ todo bien (${hechas} comprobaciones).`)
