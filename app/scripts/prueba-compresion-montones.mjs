// Prueba del reparto en montones y del listón de la compresión. Sin internet
// y sin gastar un crédito.
//
// Correr con: node scripts/prueba-compresion-montones.mjs
//
// De aquí sale el veredicto con el que se decide qué significa la compresión,
// así que es justo lo que no puede quedarse sin comprobar. Es la lección de
// `medir()` el 2026-09-02: mientras vivía dentro del script, la cuenta que más
// pesaba era la única sin prueba.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  fechaDeCorte,
  partirPorFecha,
  repartirPorCompresion,
} from './lib/compresion-montones.mjs'
import {
  CORTE_COMPRIMIDO,
  CORTE_EXPANDIDO,
  FECHA_LISTON,
  MIN_OPS_POR_MONTON,
  MONTON_PREDICHO_PEOR,
  UMBRAL_SIN_COSTES,
  juzgar,
} from './lib/preregistro-compresion.mjs'

let fallos = 0
const comprobar = (que, cond) => {
  console.log(`${cond ? '  OK  ' : '  MAL '} ${que}`)
  if (!cond) fallos++
}

const s = (compresion, vistoEl = '2024-01-01') => ({ compresion, vistoEl, pipRiesgo: 100 })

console.log('\n1. El reparto en montones')
const r = repartirPorCompresion([s(0.5), s(0.75), s(0.9), s(1.2), s(2.0)])
comprobar('0,5 y 0,75 van a comprimido', r.comprimido.length === 2)
comprobar('1,2 y 2,0 van a expandido', r.expandido.length === 2)
comprobar('0,9 cae en la banda muerta', r.medio.length === 1)
comprobar('nadie en «sin dato»', r.sinDato.length === 0)
comprobar('no se pierde ninguna señal', r.comprimido.length + r.expandido.length + r.medio.length + r.sinDato.length === 5)

console.log('\n1b. Los bordes exactos')
const b = repartirPorCompresion([s(CORTE_COMPRIMIDO), s(CORTE_EXPANDIDO)])
comprobar('justo en el corte de comprimido → banda muerta, no comprimido', b.comprimido.length === 0 && b.medio.length === 2)
comprobar('justo en el corte de expandido → banda muerta, no expandido', b.expandido.length === 0)

console.log('\n2. ⚠️ Lo que no se puede medir va a «sin dato», NUNCA a un montón')
// Una señal sin compresión metida en «comprimido» convertiría un hueco de
// datos en un hecho sobre el mercado. Es la decisión del cubo `sinDato` del
// carry, y el fallo que evita ya mordió en la etiqueta de las ventas pausadas.
const sd = repartirPorCompresion([
  s(null),
  s(undefined),
  s(NaN),
  { vistoEl: '2024-01-01' },
  s('0.5'),
])
comprobar('null → sin dato', sd.sinDato.length === 5)
comprobar('y NINGUNA cae en comprimido', sd.comprimido.length === 0)
comprobar('ni en expandido', sd.expandido.length === 0)
comprobar('ni en la banda muerta', sd.medio.length === 0)
comprobar('lista vacía → cuatro cubos vacíos', repartirPorCompresion([]).comprimido.length === 0)
comprobar('lista ausente no revienta', repartirPorCompresion(undefined).sinDato.length === 0)

console.log('\n2b. ⚠️ Y los montones se definen por lo que SON, no por descarte')
// Séptimo caso de esta familia en el proyecto. Si «expandido» fuera «todo lo
// que no sea comprimido», las señales sin dato y las de la banda muerta
// caerían ahí dentro en silencio. Se comprueba con lo que nadie ha inventado
// todavía: un valor fuera de todo rango razonable.
const raro = repartirPorCompresion([s(-5), s(Infinity)])
comprobar('un valor negativo cae en comprimido (es menor que el corte), no se pierde', raro.comprimido.length === 1)
comprobar('Infinity NO es finito → sin dato', raro.sinDato.length === 1)

console.log('\n3. Partir por FECHA y no por posición')
const lista = [s(0.5, '2023-01-01'), s(0.5, '2023-06-01'), s(0.5, '2024-06-01')]
const [m1, m2] = partirPorFecha(lista, '2024-01-01')
comprobar('dos antes del corte', m1.length === 2)
comprobar('una después', m2.length === 1)
comprobar('la fecha igual al corte va a la SEGUNDA mitad', partirPorFecha([s(0.5, '2024-01-01')], '2024-01-01')[1].length === 1)
comprobar('sin corte → null', partirPorFecha(lista, null) === null)
comprobar('corte vacío → null', partirPorFecha(lista, '') === null)
comprobar('una señal sin fecha se salta en vez de caer en una mitad al azar', partirPorFecha([{ compresion: 0.5 }], '2024-01-01').flat().length === 0)

console.log('\n3b. ⚠️ La fecha de corte es UNA para todos los montones')
// Si cada montón eligiera su propia mediana, «la primera mitad» sería un
// periodo distinto en cada fila y las columnas no se podrían comparar.
const FECHAS = ['2021-01-01', '2022-01-01', '2023-01-01', '2024-01-01']
comprobar('la del medio de la serie de días', fechaDeCorte(FECHAS) === '2023-01-01')
comprobar('con una sola fecha → null', fechaDeCorte(['2021-01-01']) === null)
comprobar('sin fechas → null', fechaDeCorte([]) === null)
comprobar('no es lista → null', fechaDeCorte('2021') === null)
comprobar('con basura dentro, la ignora', fechaDeCorte([null, '2021-01-01', '2022-01-01', undefined]) === '2022-01-01')

console.log('\n4. El listón: qué pasa y qué no')
// Un caso que pasa los cuatro criterios: comprimido mide peor, los márgenes no
// se solapan, y lo hace en las dos mitades.
const PASA = {
  acComprimido: 0.4,
  acExpandido: 0.55,
  opsComprimido: 600,
  opsExpandido: 600,
  r1Comprimido: -0.15,
  r1Expandido: 0.02,
  mitadesComprimido: [-0.16, -0.14],
  mitadesExpandido: [0.01, 0.03],
  sinCostesComprimido: -0.12,
  sinCostesExpandido: 0.05,
}
const vp = juzgar(PASA)
comprobar('el caso bueno PASA', vp?.pasa === true)
comprobar('y no deja criterios pendientes', vp?.falta.length === 0)

console.log('\n4b. Cada criterio tumba por separado')
const sin = (cambios) => juzgar({ ...PASA, ...cambios })
comprobar(
  'pocas operaciones en comprimido → no pasa',
  sin({ opsComprimido: MIN_OPS_POR_MONTON - 1 })?.pasa === false,
)
comprobar(
  'pocas en expandido → no pasa',
  sin({ opsExpandido: MIN_OPS_POR_MONTON - 1 })?.pasa === false,
)
comprobar(
  'márgenes solapados (diferencia pequeña) → no pasa',
  sin({ acComprimido: 0.54, acExpandido: 0.55 })?.pasa === false,
)
comprobar(
  'el montón peor NO es el predicho → no pasa',
  sin({ acComprimido: 0.6, acExpandido: 0.4 })?.pasa === false,
)
comprobar(
  'comprimido mide MEJOR en una mitad → no pasa',
  sin({ mitadesComprimido: [0.05, -0.14] })?.pasa === false,
)
comprobar(
  'y la queja nombra la mitad',
  sin({ mitadesComprimido: [0.05, -0.14] })?.falta.some((f) => f.includes('1ª')),
)

console.log('\n5. ⚠️ Un dato que falta devuelve null: NO SE PUDO JUZGAR ≠ no pasa')
// La asimetría de `veredictoBusqueda`: sin datos leídos no hay veredicto.
comprobar('sin acierto → null', juzgar({ ...PASA, acComprimido: undefined }) === null)
comprobar('con NaN → null', juzgar({ ...PASA, r1Expandido: NaN }) === null)
comprobar('sin mitades → null', juzgar({ ...PASA, mitadesComprimido: null }) === null)
comprobar('con una sola mitad → null', juzgar({ ...PASA, mitadesComprimido: [0.1] }) === null)
comprobar('con una mitad no numérica → null', juzgar({ ...PASA, mitadesExpandido: [0.1, 'x'] }) === null)
comprobar('sin nada → null', juzgar(undefined) === null)
comprobar('objeto vacío → null', juzgar({}) === null)

console.log('\n6. ⚠️⚠️ LA LECTURA: la columna SIN COSTES es la que decide qué significa')
// Es el criterio que salvó la lectura del H4 del NFX-LSS: allí la app en M15
// perdía el doble que en H1 acertando exactamente igual, o sea que la
// diferencia era el peaje y no la dirección.
const conBrecha = juzgar({ ...PASA, sinCostesComprimido: -0.12, sinCostesExpandido: 0.05 })
comprobar('brecha grande sin costes → «SOBREVIVE»', /SOBREVIVE/.test(conBrecha.lectura))
comprobar('y dice que sería candidato a FILTRO con su propio listón', /FILTRO/.test(conBrecha.lectura))
const sinBrecha = juzgar({ ...PASA, sinCostesComprimido: 0.0, sinCostesExpandido: 0.005 })
comprobar('brecha pequeña sin costes → «era el peaje»', /peaje/.test(sinBrecha.lectura))
comprobar('y entonces solo autoriza una ADVERTENCIA, nunca un filtro', /ADVERTENCIA/.test(sinBrecha.lectura) && /nunca un filtro/.test(sinBrecha.lectura))
comprobar(
  'el borde exacto del umbral cuenta como que sobrevive',
  /SOBREVIVE/.test(juzgar({ ...PASA, sinCostesComprimido: 0, sinCostesExpandido: UMBRAL_SIN_COSTES }).lectura),
)
// ⚠️ La lectura NO es aprobado/suspenso: un caso puede pasar los criterios y
// aun así ser «es el peaje». Son dos preguntas distintas y se contestan
// aparte, que es justo lo que este listón hace distinto de los demás.
comprobar(
  'un caso que PASA puede leerse como «era el peaje» (son dos preguntas)',
  sinBrecha.pasa === true && /peaje/.test(sinBrecha.lectura),
)

console.log('\n7. ⚠️ El listón está escrito ANTES, y lo dice por escrito')
const aqui = dirname(fileURLToPath(import.meta.url))
const liston = readFileSync(join(aqui, 'lib', 'preregistro-compresion.mjs'), 'utf8')
comprobar('lleva su fecha dentro', FECHA_LISTON === '2026-10-27' && liston.includes(FECHA_LISTON))
comprobar('la hipótesis va escrita, con su mecanismo', /HIP[ÓO]TESIS/.test(liston) && /el stop sale del ATR/.test(liston))
comprobar('predice que el peor es «comprimido»', MONTON_PREDICHO_PEOR === 'comprimido')
comprobar('los cortes dejan una banda muerta', CORTE_EXPANDIDO > CORTE_COMPRIMIDO)

console.log('\n7b. ⚠️ Y dice lo que NO autoriza, pase lo que pase')
// Sin esto, el día que un resultado quede a un pelo nadie recordaría que el
// listón se escribió justo para ese momento. Si alguien borra estas frases,
// esta comprobación lo canta.
comprobar('dice que no autoriza tocar ninguna señal', /NO autoriza tocar ninguna se[ñn]al/i.test(liston))
comprobar('nombra `COMPRESION_MIN` de la app hermana como intocable', /COMPRESION_MIN/.test(liston))
comprobar('dice que no se afloja un criterio al ver el resultado', /NO se afloja un criterio/i.test(liston))
comprobar('y que un empate no es un hallazgo', /empate NO es un hallazgo/i.test(liston))

console.log('\n8. ⚠️ El guion de medición no decide nada: solo mira')
const guion = readFileSync(join(aqui, 'medir-compresion.mjs'), 'utf8')
comprobar('se llama a sí mismo DIAGNÓSTICO, no filtro', /DIAGN[ÓO]STICO, no una regla/i.test(guion))
comprobar('mide con la vara NEUTRA', /simetrica/.test(guion))
comprobar('el veredicto lo calcula `juzgar()`', /juzgar\(/.test(guion))
comprobar('no importa nada de `src/components`', !/src\/components/.test(guion))
comprobar('imprime el cubo «sin dato» siempre, también vacío', /Cero se[ñn]ales sin compresi[óo]n/.test(guion))
comprobar('y enseña el stop mediano, que es el mecanismo a la vista', /stop mediano/i.test(guion))

console.log(fallos === 0 ? '\n✓ todo bien.\n' : `\n✗ ${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
