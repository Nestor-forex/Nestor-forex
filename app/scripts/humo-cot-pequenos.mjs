// HUMO de la medición del COT, ANTES de gastar un crédito.
//
//     node scripts/humo-cot-pequenos.mjs
//
// Corre **el guion de verdad** (`scripts/medir-cot.mjs`) de punta a punta,
// sustituyendo solo las dos puertas que salen a la red: el lector de velas y
// las dos funciones que llaman a la CFTC. Todo lo demás —el indexado, la
// disciplina de fechas, el sesgo del par, las señales, el resolver, `medir`,
// el reparto por par y los dos veredictos— es el código de producción.
//
// ⚠️ POR QUÉ SE CORRE EL GUION Y NO SOLO LAS PIEZAS. Un humo que encadenara
// las funciones a mano probaría que encajan y dejaría sin cubrir justo lo que
// más falla: un error EN el guion. Está medido — el 2026-10-07 el humo del
// breakeven cazó `data.pares?.[s.par]` leyendo un array como si fuera un
// objeto indexado por nombre, lo que habría devuelto la tabla entera vacía
// después de gastar los créditos.
//
// ⚠️ NO SIRVE PARA SACAR CONCLUSIONES SOBRE LA APP. El mercado es inventado;
// lo único que dice es que la plomería funciona y que el informe sale entero.

import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

// Los hooks redirigen por SUFIJO de ruta, no por nombre de módulo: el guion
// importa `./lib/velas.mjs` y hay que cazar esa importación venga de donde
// venga.
const hooks = new URL('./lib/dobles/hooks.mjs', import.meta.url)
register(hooks, pathToFileURL('./'))

console.log('═'.repeat(96))
console.log('HUMO — se corre scripts/medir-cot.mjs con dobles de la red')
console.log('═'.repeat(96))

const salida = []
const original = console.log
console.log = (...a) => {
  salida.push(a.map(String).join(' '))
  original(...a)
}

await import('./medir-cot.mjs')
console.log = original

// ── Lo que el informe TIENE que traer ────────────────────────────────────
const texto = salida.join('\n')
let fallos = 0
const bien = (ok, txt) => {
  if (!ok) fallos++
  original(`  ${ok ? '✓' : '✗ MAL'}  ${txt}`)
}

original('')
original('═'.repeat(96))
original('COMPROBACIONES DEL INFORME')
original('═'.repeat(96))

// ⚠️⚠️ LO PRIMERO: ¿SE REDIRIGIERON LAS DOS PUERTAS? Si los hooks dejaran de
// cazarlas —por un renombre del módulo, por ejemplo— el humo saldría a la red
// de verdad o fallaría por falta de llave, y lo segundo al menos es ruidoso.
// Lo primero no: gastaría créditos creyendo que no gasta ninguno.
//
// Los dobles se anuncian al cargarse. Esto se comprueba ANTES que nada porque
// sin ello todas las demás comprobaciones podrían estar pasando sobre una
// corrida real.
bien(
  globalThis.__DOBLES_DE_HUMO === 2,
  `se cargaron los 2 dobles (velas y CFTC), y se cargaron ${globalThis.__DOBLES_DE_HUMO ?? 0}`,
)

bien(texto.includes('---MEDICION-COT-INICIO---'), 'el informe abre su marcador')
bien(texto.includes('---MEDICION-COT-FIN---'), 'y lo cierra: el guion llegó al final')

bien(texto.includes('EL LISTÓN DE LOS FONDOS'), 'imprime el listón de los fondos')
bien(texto.includes('EL LISTÓN DE LOS PEQUEÑOS'), 'imprime el listón de los pequeños')
bien(texto.includes('2026-09-14'), 'con la fecha del listón viejo')
bien(texto.includes('2026-11-02'), 'y con la del nuevo')

bien(texto.includes('EL VEREDICTO — los fondos'), 'hay veredicto de los fondos')
bien(texto.includes('EL VEREDICTO — los pequeños'), 'y de los pequeños')

// ⚠️ Las etiquetas de las filas tienen que nombrar al grupo CORRECTO. Una
// tabla de pequeños que dijera «los fondos» es la etiqueta equivocada, que en
// este proyecto cuenta como error de medición.
bien(texto.includes('seguir a los fondos, |sesgo| ≥'), 'las filas de fondos dicen «los fondos»')
bien(texto.includes('seguir a los pequeños, |sesgo| ≥'), 'las de pequeños dicen «los pequeños»')
bien(texto.includes('ir EN CONTRA de los pequeños, |sesgo| ≥'), 'y la dirección contraria también')

// Los dos criterios que solo tiene el listón nuevo.
bien(/SIN costes: [-+0-9.]+\s+contra/.test(texto), 'imprime la columna SIN costes del mejor filtro')
bien(/el par que más aporta a la mejora: (\d+ %|—)/.test(texto), 'imprime el reparto por par')

// ⚠️ Y que el informe NO los imprima para los fondos: su listón del 2026-09-14
// no los pide, y `mayorAportePorPar` recorre los 14 pares por separado. Sacar
// un número que ningún criterio usa invita a citarlo como si decidiera algo.
const trozoFondos = texto.slice(
  texto.indexOf('EL VEREDICTO — los fondos'),
  texto.indexOf('EL VEREDICTO — los pequeños'),
)
bien(!trozoFondos.includes('SIN costes'), 'y NO los imprime en el veredicto de los fondos')

// La comprobación de que las dos familias son dos cosas distintas, que el
// propio guion hace antes de medir.
bien(texto.includes('Comprobación de que son dos cosas distintas'), 'comprueba que las familias difieren')
bien(/fondos:\s+neto -?\d+/.test(texto), 'y enseña el neto de los fondos')
bien(/pequeños:\s+neto -?\d+/.test(texto), 'y el de los pequeños')

// Las ocho divisas, en las dos familias.
const divisas = (texto.match(/^ {4}(EUR|JPY|GBP|CHF|CAD|AUD|NZD|USD): \d+ informes/gm) || []).length
bien(divisas === 16, `las 8 divisas en las 2 familias = 16 líneas, y salieron ${divisas}`)

// Que de verdad midió algo: si las tablas salieran vacías, el veredicto se
// calcularía sobre la nada y el guion igual terminaría en verde.
const conOps = texto.match(/SIN FILTRO \(la app tal cual\)\s+(\d+)/g) || []
bien(conOps.length === 4, `cuatro filas de referencia (2 familias × 2 geometrías), y salieron ${conOps.length}`)
bien(
  conOps.every((l) => Number(l.match(/(\d+)$/)[1]) > 50),
  `y todas con más de 50 operaciones: ${conOps.map((l) => l.match(/(\d+)$/)[1]).join(', ')}`,
)

// Y el aviso que no se puede perder: un aprobado aquí no dice nada sobre
// Myfxbook. Si alguien lo borra del listón, el informe deja de decirlo.
bien(
  texto.includes('NO DICE NADA SOBRE EL SENTIMIENTO'),
  'el informe avisa de que esto no es el sentimiento minorista',
)

original('')
if (fallos) {
  original(`✗ ${fallos} comprobaciones del humo fallaron.`)
  process.exit(1)
}
original('✓ la plomería funciona y el informe sale entero.')
