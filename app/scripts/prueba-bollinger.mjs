// Prueba de las bandas de Bollinger y de su listón. Sin internet:
//
//     node scripts/prueba-bollinger.mjs
//
// Lo que se comprueba no es «que dé un número», sino las formas en que esto
// puede MENTIR sin fallar:
//
//   1. usar media exponencial en vez de simple — da unas bandas parecidas que
//      NO son las de Bollinger, así que el resultado no se podría comparar con
//      la literatura que motiva toda la medición;
//   2. devolver ceros cuando no se puede calcular, que afirma que las bandas
//      están pegadas al precio;
//   3. que la candidata y el control dejen de ser el mismo disparo con lados
//      opuestos y nadie lo note;
//   4. que el corte de los N mejores use el criterio de OTRA regla, con lo que
//      la fila diría «Bollinger» y mediría «Bollinger desempatado por fuerza»;
//   5. y que el listón dé un verde sobre un grupo vacío.

import { readFileSync } from 'node:fs'
import {
  DESVIACIONES,
  PERIODO,
  bandas,
  donde,
  ordenPorBollinger,
  posicionDe,
  reglaBollinger,
} from './lib/bollinger.mjs'
import {
  FECHA_DEL_LISTON,
  LECTURA_CANDIDATA,
  LECTURA_CONTROL,
  MIN_OPS,
  MIN_SENALES_MES,
  QUE_HACER,
  UMBRAL,
  VENTAJA_SOBRE_M2,
  juzgar,
} from './lib/preregistro-bollinger.mjs'

let fallos = 0
const comprobar = (que, bien) => {
  console.log(`${bien ? '  OK  ' : '  MAL '} ${que}`)
  if (!bien) fallos++
}
const cerca = (a, b, tol = 1e-9) => a != null && Math.abs(a - b) <= tol

// Una serie de 20 cierres con media y desviación conocidas a mano.
// 10 valores a 100 y 10 a 110: media 105, desviación de población 5.
const SERIE = [...Array(10).fill(100), ...Array(10).fill(110)]

console.log('\n1. La matemática, contra números calculados a mano')
{
  const b = bandas(SERIE)
  comprobar('la media simple de 10×100 y 10×110 es 105', cerca(b.media, 105))
  comprobar('la desviación de POBLACIÓN es 5', cerca(b.sd, 5))
  comprobar('la banda de arriba es 105 + 2×5 = 115', cerca(b.arriba, 115))
  comprobar('la banda de abajo es 105 − 2×5 = 95', cerca(b.abajo, 95))
  comprobar('el periodo por defecto es 20', PERIODO === 20)
  comprobar('las desviaciones por defecto son 2', DESVIACIONES === 2)
}

console.log('\n2. ⚠️ Media SIMPLE, no exponencial — y se nota')
{
  // Con esta serie las dos medias se separan mucho: la exponencial pesa el
  // tramo reciente (los 110) y la simple no.
  const b = bandas(SERIE)
  // La exponencial de 20 sobre esta serie queda muy por encima de 105.
  const k = 2 / 21
  let ema = SERIE[0]
  for (const x of SERIE.slice(1)) ema = x * k + ema * (1 - k)
  comprobar('la exponencial de esta serie NO es 105', Math.abs(ema - 105) > 1)
  comprobar('y la que usa Bollinger sí lo es', cerca(b.media, 105))
  // Si alguien cambiara a exponencial, la banda de abajo se movería; esta
  // comprobación es la que lo cantaría.
  comprobar('la banda de abajo sale de la media simple', cerca(b.abajo, 105 - 2 * b.sd))
}

console.log('\n3. Desviación de POBLACIÓN, no muestral')
{
  const b = bandas(SERIE)
  // La muestral (entre n−1) daría 5 × raíz(20/19) ≈ 5,13.
  const muestral = 5 * Math.sqrt(20 / 19)
  comprobar('la de población es 5, no la muestral 5,13', cerca(b.sd, 5) && !cerca(b.sd, muestral, 0.05))
}

console.log('\n4. ⚠️ Ante la duda devuelve null, NUNCA ceros')
{
  comprobar('con menos de 20 cierres → null', bandas(SERIE.slice(0, 19)) === null)
  comprobar('sin serie → null', bandas(undefined) === null)
  comprobar('con algo que no es lista → null', bandas('hola') === null)
  comprobar('con un NaN dentro → null', bandas([...SERIE.slice(0, 19), NaN]) === null)
  comprobar('con un texto dentro → null', bandas([...SERIE.slice(0, 19), '110']) === null)
  // El caso que de verdad importa: serie plana. Las bandas colapsarían sobre
  // la media y «tocar la banda» dejaría de significar nada — pero el cálculo
  // no falla, devuelve cero. Un cero diría «están pegadas al precio».
  comprobar('serie PLANA → null, no bandas de ancho cero', bandas(Array(20).fill(100)) === null)
}

console.log('\n5. Dónde está el cierre')
{
  const par = (c) => ({ serie20: SERIE, c })
  comprobar('un cierre de 90 está ABAJO (banda en 95)', donde(par(90)) === 'ABAJO')
  comprobar('un cierre de 120 está ARRIBA (banda en 115)', donde(par(120)) === 'ARRIBA')
  comprobar('un cierre de 105 está DENTRO', donde(par(105)) === 'DENTRO')
  comprobar('justo en la banda de abajo cuenta como ABAJO', donde(par(95)) === 'ABAJO')
  comprobar('justo en la banda de arriba cuenta como ARRIBA', donde(par(115)) === 'ARRIBA')
  comprobar('sin cierre → null', donde({ serie20: SERIE }) === null)
  comprobar('con serie plana → null', donde({ serie20: Array(20).fill(100), c: 100 }) === null)
}

console.log('\n6. ⚠️⚠️ La candidata y el control son el MISMO disparo, al revés')
{
  const rev = reglaBollinger({ lectura: 'reversion' })
  const mom = reglaBollinger({ lectura: 'momento' })
  const abajo = { serie20: SERIE, c: 90, dif: 0, rsiV: 50 }
  const arriba = { serie20: SERIE, c: 120, dif: 0, rsiV: 50 }
  const dentro = { serie20: SERIE, c: 105, dif: 0, rsiV: 50 }

  comprobar('reversión: salirse por abajo → COMPRA', rev(abajo, {}, 0.5) === 'COMPRA')
  comprobar('reversión: salirse por arriba → VENTA', rev(arriba, {}, 0.5) === 'VENTA')
  comprobar('momento: salirse por abajo → VENTA', mom(abajo, {}, 0.5) === 'VENTA')
  comprobar('momento: salirse por arriba → COMPRA', mom(arriba, {}, 0.5) === 'COMPRA')
  comprobar('dentro de las bandas no hay señal, en ninguna lectura', rev(dentro, {}, 0.5) === null && mom(dentro, {}, 0.5) === null)

  // LA QUE IMPORTA: si alguien tocara una de las dos ramas, dejarían de ser
  // opuestas y la tabla compararía dos cosas que no se pueden comparar.
  const opuestas = [abajo, arriba].every((p) => {
    const a = rev(p, {}, 0.5)
    const b = mom(p, {}, 0.5)
    return a !== null && b !== null && a !== b
  })
  comprobar('sobre el MISMO par las dos lecturas dan lados CONTRARIOS', opuestas)

  // ⚠️⚠️ REGRESIÓN DEL FALLO DE DISEÑO QUE CAZÓ EL HUMO (2026-10-13).
  //
  // La primera versión condicionaba el RSI al LADO que se opera. Con la
  // lectura de reversión funcionaba; con la de momento el lado está invertido,
  // así que pedía RSI ALTO para vender un precio que está en la banda de
  // ABAJO —donde el RSI es bajo por construcción—. **El control daba CERO
  // señales**, y la tabla lo habría enseñado como «la lectura de momento no
  // produce nada» en vez de «mi filtro se contradecía».
  //
  // Un control que no produce señales no es un control: es una fila vacía.
  const conRsiRev = reglaBollinger({ lectura: 'reversion', rsiEstirado: 35 })
  const conRsiMom = reglaBollinger({ lectura: 'momento', rsiEstirado: 35 })
  const casos = [
    { serie20: SERIE, c: 90, rsiV: 30, dif: 0 }, // abajo, RSI bajo
    { serie20: SERIE, c: 120, rsiV: 70, dif: 0 }, // arriba, RSI alto
    { serie20: SERIE, c: 90, rsiV: 60, dif: 0 }, // abajo pero RSI no estirado
    { serie20: SERIE, c: 105, rsiV: 30, dif: 0 }, // dentro
  ]
  const mismosEventos = casos.every((p) => (conRsiRev(p, {}, 0.5) === null) === (conRsiMom(p, {}, 0.5) === null))
  comprobar('con RSI, las dos lecturas seleccionan los MISMOS eventos', mismosEventos)
  comprobar(
    'y el control produce señales, no una fila vacía',
    casos.filter((p) => conRsiMom(p, {}, 0.5) !== null).length === 2
  )
  // Lo mismo con la fuerza, que tenía el mismo defecto.
  const conFzaRev = reglaBollinger({ lectura: 'reversion', exigirFuerza: true })
  const conFzaMom = reglaBollinger({ lectura: 'momento', exigirFuerza: true })
  const casosF = [
    { serie20: SERIE, c: 90, rsiV: 50, dif: -1 },
    { serie20: SERIE, c: 120, rsiV: 50, dif: 1 },
    { serie20: SERIE, c: 90, rsiV: 50, dif: 1 },
  ]
  comprobar(
    'con fuerza, las dos lecturas seleccionan los MISMOS eventos',
    casosF.every((p) => (conFzaRev(p, {}, 0.5) === null) === (conFzaMom(p, {}, 0.5) === null))
  )
  comprobar('con `dif` que no es número → null', conFzaRev({ serie20: SERIE, c: 90, rsiV: 50 }, {}, 0.5) === null)
}

console.log('\n7. El RSI estirado y la fuerza, como condiciones de más')
{
  const conRsi = reglaBollinger({ lectura: 'reversion', rsiEstirado: 35 })
  comprobar('abajo + RSI 30 → COMPRA', conRsi({ serie20: SERIE, c: 90, rsiV: 30, dif: 0 }, {}, 0.5) === 'COMPRA')
  comprobar('abajo + RSI 50 → nada', conRsi({ serie20: SERIE, c: 90, rsiV: 50, dif: 0 }, {}, 0.5) === null)
  comprobar('arriba + RSI 70 → VENTA (el espejo es 100−35=65)', conRsi({ serie20: SERIE, c: 120, rsiV: 70, dif: 0 }, {}, 0.5) === 'VENTA')
  comprobar('arriba + RSI 50 → nada', conRsi({ serie20: SERIE, c: 120, rsiV: 50, dif: 0 }, {}, 0.5) === null)
  comprobar('con RSI que no es número → null, no se cuela', conRsi({ serie20: SERIE, c: 90, rsiV: undefined, dif: 0 }, {}, 0.5) === null)

  // ⚠️ La fuerza acompaña al MOVIMIENTO, no al lado operado — ver el bloque 6.
  // Estas dos comprobaciones fijaban el comportamiento viejo y fallaron al
  // cambiarlo, que es exactamente su trabajo. Se actualizan, no se borran.
  const conFuerza = reglaBollinger({ lectura: 'reversion', exigirFuerza: true })
  comprobar(
    'abajo + divisa base DÉBIL (el par se cayó de verdad) → COMPRA',
    conFuerza({ serie20: SERIE, c: 90, rsiV: 50, dif: -1 }, {}, 0.5) === 'COMPRA'
  )
  comprobar(
    'abajo pero con la base FUERTE → nada: el movimiento no acompaña',
    conFuerza({ serie20: SERIE, c: 90, rsiV: 50, dif: 1 }, {}, 0.5) === null
  )
}

console.log('\n8. ⚠️ El orden es el de Bollinger, no el de la fuerza')
{
  const orden = ordenPorBollinger()
  // Dos pares igual de lejos de la media en fuerza, pero uno mucho más
  // estirado que el otro respecto de SU banda.
  const muyFuera = { serie20: SERIE, c: 80, dif: 0.1 }
  const pocoFuera = { serie20: SERIE, c: 94, dif: 9.9 }
  comprobar('el más salido de la banda ordena más alto', orden(muyFuera) > orden(pocoFuera))
  comprobar('…aunque su divergencia de fuerza sea MUCHO menor', muyFuera.dif < pocoFuera.dif)
  comprobar('un par sin bandas calculables ordena 0 y no revienta', orden({ serie20: [1, 2, 3] }) === 0)
  comprobar('en la media la posición es 0', cerca(orden({ serie20: SERIE, c: 105 }), 0))
  comprobar('justo en la banda de abajo la posición es 1 en valor absoluto', cerca(orden({ serie20: SERIE, c: 95 }), 1))

  // ⚠️ REGRESIÓN. La primera versión sacaba la posición del último valor de
  // `serie20` en vez de `p.c`. En producción los dos coinciden, así que el
  // fallo no habría dado NINGÚN error: habría ordenado bien por casualidad.
  // Esta comprobación los separa a propósito.
  comprobar(
    'la posición la manda `c`, NO el último valor de la serie',
    cerca(posicionDe({ serie20: SERIE, c: 95 }), -1) && !cerca(posicionDe({ serie20: SERIE, c: 95 }), posicionDe({ serie20: SERIE, c: SERIE.at(-1) }))
  )
  comprobar('…y `donde` lee lo mismo que la posición', donde({ serie20: SERIE, c: 95 }) === 'ABAJO' && posicionDe({ serie20: SERIE, c: 95 }) <= -1)
  comprobar('sin cierre la posición es null, no 0', posicionDe({ serie20: SERIE }) === null)
}

console.log('\n9. El listón: que esté escrito y con fecha')
{
  comprobar('lleva la fecha dentro', FECHA_DEL_LISTON === '2026-10-13')
  comprobar('la CANDIDATA es la reversión, decidido antes', LECTURA_CANDIDATA === 'reversion')
  comprobar('el CONTROL es el momento', LECTURA_CONTROL === 'momento')
  comprobar('candidata y control son lecturas distintas', LECTURA_CANDIDATA !== LECTURA_CONTROL)
  comprobar('está escrito que el control no asciende a regla', /no lo asciende/i.test(QUE_HACER.control))
  comprobar('está escrito que pasar el listón NO enciende nada', /NO se enciende/i.test(QUE_HACER.pasa))
  comprobar('está escrito que esto no cambia ninguna señal', /una sola señal/i.test(QUE_HACER.siempre))
}

// Un resultado que pasa los seis criterios, para romperlo de a uno.
const BUENO = {
  candidata: { ops: 900, por1R: 0.09, mitad1: 0.08, mitad2: 0.1 },
  candidataSwap: { por1R: 0.05 },
  m2: { ops: 870, por1R: 0.05, mitad1: 0.06, mitad2: 0.04 },
  meses: 44,
  porPar: 0.2,
}

console.log('\n10. El listón MUERDE: cada criterio tumbado por separado')
{
  comprobar('el resultado bueno pasa los seis', juzgar(BUENO).pasa === true && juzgar(BUENO).pasados === 6)

  const romper = (cambio) => juzgar({ ...BUENO, ...cambio })
  comprobar('no gana lo suficiente → no pasa', romper({ candidata: { ...BUENO.candidata, por1R: 0.01 } }).pasa === false)
  comprobar(
    'gana pero se cae en la segunda mitad → no pasa',
    romper({ candidata: { ...BUENO.candidata, mitad2: -0.01 } }).pasa === false
  )
  comprobar(
    'gana pero se cae en la primera mitad → no pasa',
    romper({ candidata: { ...BUENO.candidata, mitad1: -0.01 } }).pasa === false
  )
  comprobar('no aguanta el swap → no pasa', romper({ candidataSwap: { por1R: -0.01 } }).pasa === false)
  comprobar('pocas señales al mes → no pasa', romper({ meses: 200 }).pasa === false)
  comprobar('no le gana a M2 → no pasa', romper({ m2: { ...BUENO.m2, por1R: 0.085 } }).pasa === false)
  comprobar('un solo par aporta el 60 % → no pasa', romper({ porPar: 0.6 }).pasa === false)
}

console.log('\n11. Los bordes exactos')
{
  const justo = juzgar({ ...BUENO, candidata: { ...BUENO.candidata, por1R: BUENO.m2.por1R + VENTAJA_SOBRE_M2 } })
  comprobar('ganarle a M2 por exactamente el umbral PASA', justo.pasa === true)
  const porDebajo = juzgar({
    ...BUENO,
    candidata: { ...BUENO.candidata, por1R: BUENO.m2.por1R + VENTAJA_SOBRE_M2 - 0.001 },
  })
  comprobar('un milésimo por debajo NO pasa', porDebajo.pasa === false)
  // Coma flotante: 0,07 − 0,05 en JavaScript no da 0,02 exacto. Sin la
  // tolerancia del listón, un resultado que cae justo en el umbral se iría al
  // lado cómodo por el último bit de un decimal. Ya mordió el 2026-10-01.
  comprobar('0,07 − 0,05 no da 0,02 exacto en JavaScript', 0.07 - 0.05 !== 0.02)
  comprobar('…y aun así el borde exacto pasa', juzgar({ ...BUENO, candidata: { ...BUENO.candidata, por1R: 0.07 }, m2: { ...BUENO.m2, por1R: 0.05 } }).pasa === true)

  const mesJusto = juzgar({ ...BUENO, meses: BUENO.candidata.ops / MIN_SENALES_MES })
  comprobar('exactamente 8 señales/mes PASA', mesJusto.pasa === true)
  const umbralJusto = juzgar({
    ...BUENO,
    candidata: { ...BUENO.candidata, por1R: UMBRAL },
    m2: { ...BUENO.m2, por1R: 0 },
  })
  comprobar('ganar exactamente el umbral con costes PASA', umbralJusto.pasa === true)
}

console.log('\n12. ⚠️⚠️ SE NIEGA A JUZGAR SIN DATOS (el falso verde del 2026-10-12)')
{
  const sinOps = juzgar({ ...BUENO, candidata: { ops: 0, por1R: 0, mitad1: 0, mitad2: 0 } })
  comprobar('un grupo VACÍO no pasa', sinOps.pasa === false)
  comprobar('…y lo dice en vez de callárselo', typeof sinOps.noSePudoMedir === 'string' && sinOps.noSePudoMedir.length > 0)
  comprobar('…y nombra cuántas operaciones faltan', sinOps.noSePudoMedir.includes(String(MIN_OPS)))

  comprobar('sin candidata no hay veredicto', juzgar({ ...BUENO, candidata: null }).pasa === false)
  comprobar('sin M2 no hay veredicto', juzgar({ ...BUENO, m2: null }).pasa === false)
  comprobar('sin la fila del swap no hay veredicto', juzgar({ ...BUENO, candidataSwap: null }).pasa === false)
  comprobar('sin meses no hay veredicto', juzgar({ ...BUENO, meses: 0 }).pasa === false)
  comprobar('sin reparto por par no hay veredicto', juzgar({ ...BUENO, porPar: null }).pasa === false)
  comprobar('con un NaN dentro no hay veredicto', juzgar({ ...BUENO, candidata: { ...BUENO.candidata, por1R: NaN } }).pasa === false)
  comprobar('sin nada en absoluto no revienta y no pasa', juzgar(undefined).pasa === false)
  // Un grupo con pocas operaciones NO es un grupo que pierde: es un grupo que
  // no se puede juzgar. Si se tratara como pérdida, un resultado prometedor
  // con muestra corta se descartaría por el motivo equivocado.
  const pocas = juzgar({ ...BUENO, candidata: { ...BUENO.candidata, ops: MIN_OPS - 1 } })
  comprobar('con menos de MIN_OPS dice que no se pudo medir', pocas.pasa === false && !!pocas.noSePudoMedir)
}

console.log('\n13. ⚠️ EL DESGLOSE POR DIVISA DICE LO QUE DICE DECIR')
{
  // Lo pidió Néstor el 2026-10-20 («rentable en forma robusta en todas las
  // divisas»). Se lee el guion COMO TEXTO porque importarlo pide velas en
  // cuanto arranca: tendría que gastar 14 créditos y llave para comprobar una
  // tabla. Es el mismo camino que `prueba-umbral.mjs` con el reporte.
  const src = readFileSync(new URL('./medir-bollinger.mjs', import.meta.url), 'utf8')

  // Guarda: si el guion se renombra o se parte, esto no puede quedarse en
  // verde sin haber mirado nada. «Una prueba que se adapta a lo que encuentra
  // no comprueba nada.»
  comprobar('se encontró el guion de la medición', src.length > 2000)
  comprobar('…y trae el desglose por divisa', src.includes('DESGLOSE POR DIVISA'))

  // ⚠️ LOS 14 PARES, no solo los que dieron señal. Recorrer únicamente los
  // pares con señal dejaría en pantalla solo lo que parece significar algo,
  // que es cómo se fabrica un espejismo.
  comprobar('recorre los 14 pares y no solo los que tienen señal', /for \(const par of PAIR_NAMES\)/.test(src))
  comprobar('…y PAIR_NAMES se importa, no se escribe a mano', /import \{ PAIR_NAMES \} from '\.\.\/src\/lib\/pairs\.js'/.test(src))

  // ⚠️ EL MARGEN. Sin él la tabla engaña sola: ~39 operaciones por par dan
  // ±16 puntos de acierto, así que un par con +0,20 y otro con −0,20 pueden
  // ser el mismo par. Es la misma pieza que el ± del Diario (2026-09-14).
  comprobar('cada fila lleva su margen de error', /98 \/ Math\.sqrt/.test(src))

  // ⚠️ EL RECUENTO es lo único que la tabla dice con fuerza, y es justo la
  // respuesta a «robusta en todas las divisas».
  comprobar('imprime el recuento de pares en que gana', src.includes('GANA EN'))

  // ⚠️⚠️ LA ADVERTENCIA. La tentación obvia al ver la tabla es quedarse con
  // los pares que ganan, y eso es elegir DESPUÉS de ver los datos. Que esta
  // comprobación exista obliga a venir aquí a borrarla — o sea, a propósito y
  // no de pasada. Misma idea que la que prohíbe un veredicto en `cot.js`.
  comprobar(
    'avisa de que el desglose NO decide nada',
    /ESTO NO DECIDE NADA/.test(src) && /posteriori/.test(src) && /preregistro/.test(src)
  )

  // Y que el resultado de un par se mida con `par`, no con `name`: el humo ya
  // cazó una vez el «undefined con el 100 %» por confundirlos.
  comprobar('agrupa por el campo `par`', /s\.par === par/.test(src))
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'Bollinger y su listón miden lo que dicen medir.')
process.exit(fallos ? 1 : 0)
