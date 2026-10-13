// Prueba del listón de «el toque de banda solo». Sin internet:
//
//     node scripts/prueba-preregistro-bollinger-sombra.mjs
//
// Las formas en que un listón puede MENTIR sin fallar, y que esto vigila:
//
//   1. **no morder**: decir «pasa» a un resultado que incumple un criterio.
//      Un listón que aprueba cualquier cosa es peor que no tener listón,
//      porque da la apariencia de rigor;
//   2. **juzgar sin datos**: devolver «no pasa» cuando falta un número, que se
//      lee como «se midió y falló» en vez de «no se pudo medir». Es el falso
//      verde del 2026-10-12 por el otro lado;
//   3. **perder la honestidad escrita**: que alguien borre la nota de que esta
//      variante se eligió DESPUÉS de ver la tabla, o los dos números del
//      histórico que la condenan. Sin eso, dentro de un año nadie sabría que
//      arrancó sabiéndose frágil;
//   4. **decidir por coma flotante**: que un resultado justo en el umbral se
//      vaya al lado cómodo por el último bit de un decimal.

import { readFileSync } from 'node:fs'
import {
  EXIGE_DOS_MITADES,
  FECHA_DEL_LISTON,
  FUENTE_DEL_VEREDICTO,
  HISTORICO,
  MAX_POR_PAR,
  MIN_OPS,
  QUE_HACER,
  SWAP_EXIGIDO,
  UMBRAL,
  VENTAJA_SOBRE_M2,
  juzgar,
} from './lib/preregistro-bollinger-sombra.mjs'
import { PARAMS_SOMBRA } from '../src/lib/bollinger.js'
import { CRITERIOS as CRITERIOS_LSS } from './lib/preregistro-lss.mjs'

let fallos = 0
const ok = (bien, que) => {
  console.log(`  ${bien ? 'OK  ' : 'MAL '} ${que}`)
  if (!bien) fallos++
}

// Un resultado que pasa los seis, para ir rompiéndolo de uno en uno.
const BUENO = Object.freeze({
  ops: 160,
  porRiesgo: 0.06,
  primeraMitad: 0.05,
  segundaMitad: 0.07,
  conSwap: 0.03,
  m2PorRiesgo: 0.03,
  maxPorPar: 0.2,
})
const con = (cambios) => juzgar({ ...BUENO, ...cambios })

console.log('\n1. El listón está escrito y fechado ANTES del registro')
{
  ok(FECHA_DEL_LISTON === '2026-10-13', `lleva la fecha dentro (${FECHA_DEL_LISTON})`)
  ok(
    FUENTE_DEL_VEREDICTO === 'registro hacia adelante',
    '⚠️ el veredicto NO sale del histórico: esos días se usaron para elegir la fila'
  )
}

console.log('\n2. ⚠️⚠️ La variante que corre es «la banda SOLA», no otra')
{
  ok(PARAMS_SOMBRA.lectura === 'reversion', 'lectura de reversión (el toque se compra, no se persigue)')
  // Los dos que la definen: sin RSI y sin fuerza. Si alguien los enciende, la
  // regla que se anota deja de ser la que el listón juzga.
  ok(PARAMS_SOMBRA.rsiEstirado === null, '⚠️ SIN filtro de RSI — es la seña de identidad de esta variante')
  ok(PARAMS_SOMBRA.exigirFuerza === false, '⚠️ SIN exigir fuerza relativa, por lo mismo')
  ok(Object.isFrozen(PARAMS_SOMBRA), 'y están congelados: no se tocan sin invalidar el registro')
}

console.log('\n3. ⚠️⚠️ La honestidad escrita, que es lo que no se puede perder')
{
  const fuente = readFileSync(new URL('./lib/preregistro-bollinger-sombra.mjs', import.meta.url), 'utf8')
  ok(
    /DESPU[ÉE]S de ver/i.test(fuente),
    'dice que la variante se eligió DESPUÉS de ver los resultados'
  )
  ok(
    /no se enciende nada/i.test(fuente),
    '…y que lo que lo hace legítimo es que no se encienda nada'
  )
  // Los dos números del histórico que la condenan. Si alguien guardara solo el
  // +0,027, dentro de un año un resultado negativo parecería una sorpresa.
  ok(HISTORICO.conSwap05 < 0, `⚠️ guarda que el histórico YA perdía con swap (${HISTORICO.conSwap05})`)
  ok(
    HISTORICO.ventajaSobreM2 < 0,
    `⚠️ y que no le ganaba a la reversión M2 (${HISTORICO.ventajaSobreM2})`
  )
  ok(HISTORICO.porRiesgo > 0, `…y el número bueno también está (${HISTORICO.porRiesgo})`)
  ok(Object.isFrozen(HISTORICO), 'el histórico está congelado: es una promesa, no una variable')
  ok(/no se propone/i.test(QUE_HACER.siempre), 'y queda escrito que pasar el listón no enciende nada')
}

console.log('\n4. El listón MUERDE: cada criterio tumbado por separado')
{
  ok(con({}).veredicto === 'pasa', 'el resultado bueno pasa los seis')
  ok(con({ ops: MIN_OPS - 1 }).veredicto === 'noPasa', `con menos de ${MIN_OPS} operaciones → no pasa`)
  ok(con({ porRiesgo: 0.01, conSwap: 0.005, m2PorRiesgo: -0.02 }).veredicto === 'noPasa', 'no gana lo suficiente → no pasa')
  ok(con({ primeraMitad: -0.01 }).veredicto === 'noPasa', 'se cae en la primera mitad → no pasa')
  ok(con({ segundaMitad: -0.01 }).veredicto === 'noPasa', 'se cae en la segunda mitad → no pasa')
  ok(con({ conSwap: -0.001 }).veredicto === 'noPasa', `⚠️ no aguanta ${SWAP_EXIGIDO} de swap → no pasa`)
  ok(con({ m2PorRiesgo: 0.05 }).veredicto === 'noPasa', '⚠️ no le gana a M2 → no pasa')
  ok(con({ maxPorPar: 0.6 }).veredicto === 'noPasa', 'un solo par aporta el 60 % → no pasa')
  ok(EXIGE_DOS_MITADES === true, 'y el criterio de las dos mitades está encendido')
}

console.log('\n5. Los bordes exactos (la coma flotante no decide veredictos)')
{
  // 0,05 − 0,03 no da 0,02 en JavaScript. Sin tolerancia, este caso se iría al
  // lado cómodo por el último bit de un decimal.
  ok(0.05 - 0.03 !== VENTAJA_SOBRE_M2, '0,05 − 0,03 NO da 0,02 exacto en JavaScript')
  ok(
    con({ porRiesgo: 0.05, m2PorRiesgo: 0.03 }).veredicto === 'pasa',
    '…y aun así ganarle a M2 por exactamente el umbral PASA'
  )
  ok(
    con({ porRiesgo: 0.05, m2PorRiesgo: 0.0301 }).veredicto === 'noPasa',
    'un milésimo por debajo NO pasa'
  )
  ok(con({ porRiesgo: UMBRAL, m2PorRiesgo: 0, conSwap: 0.001 }).veredicto === 'pasa', 'ganar exactamente el umbral con costes PASA')
  ok(con({ ops: MIN_OPS }).veredicto === 'pasa', `exactamente ${MIN_OPS} operaciones PASA`)
  ok(con({ maxPorPar: MAX_POR_PAR }).veredicto === 'pasa', `un par aportando exactamente el ${MAX_POR_PAR * 100} % PASA`)
}

console.log('\n6. ⚠️⚠️ SE NIEGA A JUZGAR SIN DATOS (y no dice «no pasa»)')
{
  for (const campo of ['ops', 'porRiesgo', 'primeraMitad', 'segundaMitad', 'conSwap', 'm2PorRiesgo', 'maxPorPar']) {
    const r = juzgar({ ...BUENO, [campo]: undefined })
    ok(
      r.veredicto === null && r.sePudoMedir === false && r.faltan.includes(campo),
      `sin \`${campo}\` no hay veredicto, y lo NOMBRA`
    )
  }
  ok(juzgar({ ...BUENO, porRiesgo: NaN }).veredicto === null, 'con un NaN dentro tampoco hay veredicto')
  ok(juzgar(undefined).veredicto === null, 'sin nada en absoluto no revienta y no pasa')
  ok(juzgar(undefined).criterios.length === 0, '…y no se inventa criterios para rellenar')
}

console.log('\n7. El 150 es el MISMO que el del LSS, y por aritmética')
{
  // ⚠️ No es copiar un número de trading entre reglas: `margen(n) = 98/√n` es
  // aritmética y no depende del mercado. Lo único que cambia entre reglas es
  // cuánto se tarda en llegar a 150.
  // El LSS lo guarda dentro de su lista de criterios, no como constante
  // suelta. Se lee de ahí a propósito en vez de escribir «150» otra vez: es
  // el mismo motivo por el que el umbral de fuerza dejó de estar en nueve
  // sitios el 2026-10-12.
  const minLss = CRITERIOS_LSS.find((c) => typeof c.minimo === 'number')?.minimo
  ok(minLss === MIN_OPS, `el mínimo coincide con el del LSS (${MIN_OPS} y ${minLss})`)
  ok(Math.round(98 / Math.sqrt(MIN_OPS)) === 8, `y con ${MIN_OPS} el margen del peor caso es ±8 puntos`)
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'El listón de Bollinger en la sombra muerde donde dice morder.')
process.exit(fallos ? 1 : 0)
