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

// ── La segunda vuelta: los descartes del candidato ────────────────────────
//
// 📌 Aquí solo se comprueba QUE SALE y que los números se pudieron calcular.
// El contenido lo vigila `prueba-solape.mjs` con casos a mano, y hay un motivo
// concreto: el doble de la CFTC genera a los pequeños con el signo EXACTAMENTE
// opuesto a los fondos, así que los dos filtros son disjuntos por construcción
// y el solape sale 0 % siempre. Una comprobación que solo puede ver un valor no
// comprueba nada.
bien(texto.includes('SEGUNDA VUELTA'), 'el informe trae la sección de los descartes')
bien(
  texto.includes('Candidato FIJADO en el listón: ir EN CONTRA de los pequeños, |sesgo| ≥ 0'),
  'y dice qué candidato juzga, con la dirección y el umbral del listón',
)
bien(
  texto.includes('es la fila que el defecto del listón de la mañana dejó sin juzgar'),
  'y por qué es ése y no el máximo de la rejilla',
)

// Los seis descartes salen todos, cada uno con su ✅ o su ❌. Si el bucle se
// rompiera, la sección saldría sin criterios y el veredicto se leería igual.
//
// 📌 Y se cuentan DENTRO de la sección, no en el informe entero. La primera
// versión buscaba las marcas en todo el texto y salían 18 —los 5 criterios del
// listón de los fondos, los 7 del de los pequeños y los 6 de aquí— así que
// `>= 6` se cumplía por construcción y habría pasado en verde aunque esta
// sección no imprimiera ni un criterio. Es «contar apariciones no es leer»,
// otra vez.
const desdeSegunda = texto.slice(texto.indexOf('SEGUNDA VUELTA'))
const marcasDescarte = (desdeSegunda.match(/\n {2}[✅❌] {2}/g) || []).length
bien(marcasDescarte === 6, `los seis descartes se juzgan uno por uno, y salieron ${marcasDescarte} marcas`)

// ⚠️ LA COMPROBACIÓN QUE DISTINGUE «NO SOLAPAN» DE «NO SE PUDO MIRAR».
//
// Si el mapa de claves del sesgo de los fondos estuviera roto, el filtro de
// referencia no dejaría pasar NADA y el solape saldría 0 % — exactamente igual
// que si los dos filtros fueran de verdad independientes. El conteo de la
// referencia es lo único que separa los dos casos, y por eso el informe lo
// imprime y aquí se exige que sea mayor que cero.
const ref = texto.match(/los fondos dejan pasar (\d+) con este mismo filtro/)
bien(ref != null, 'el informe dice cuántas señales deja pasar el filtro de referencia')
bien(ref != null && Number(ref[1]) > 0, `y son más de cero (${ref?.[1]}): el solape se pudo CALCULAR`)

// ── El resultado de cada celda, por separado ──────────────────────────────
//
// 📌 En el mercado inventado DOS de las cuatro celdas salen vacías, y no es un
// fallo: el doble de la CFTC genera a los pequeños con el signo opuesto a los
// fondos, así que los dos filtros son disjuntos por construcción. Por eso aquí
// no se exige que las cuatro tengan operaciones — lo que se exige es que la
// tabla EXISTA y que las celdas CUADREN.
bien(texto.includes('EL RESULTADO DE CADA CELDA, POR SEPARADO'), 'el informe trae la tabla por celdas')
for (const r of ['candidato Y fondos', 'SOLO el candidato', 'SOLO los fondos', 'ninguno de los dos']) {
  bien(texto.includes(r), `la tabla por celdas enseña «${r}»`)
}

// ⚠️ LA COMPROBACIÓN QUE DE VERDAD IMPORTA DE ESTA SECCIÓN. Si las celdas no
// sumaran el total, la tabla se leería exactamente igual que una buena: cuatro
// filas con números plausibles. El guion lo comprueba él y lo imprime; aquí se
// exige que esa comprobación salga bien Y que exista — un informe que dejara de
// imprimir la línea pasaría este humo si solo se mirara que no diga «MAL».
const sumanCeldas = texto.match(/(✓|✗ MAL) {2}las celdas suman (\d+) \(sin filtro: (\d+)\)/)
bien(sumanCeldas != null, 'el informe dice si las celdas suman el total')
bien(sumanCeldas?.[1] === '✓', `y cuadran (${sumanCeldas?.[2]} contra ${sumanCeldas?.[3]})`)

// El reparto por el lado del dólar, con sus tres grupos. Si `grupoDolar`
// devolviera `null` para todo, no saldría ninguna línea y el criterio se
// leería como «no hay concentración».
for (const g of ['compraUSD', 'vendeUSD', 'sinUSD']) {
  bien(texto.includes(g), `el reparto por el dólar enseña el grupo «${g}»`)
}

// Y las dos frases que impiden que esto se lea como un aprobado. Si alguien las
// borra del listón, el informe deja de decirlo y la sección pasa a parecer un
// veredicto normal.
bien(texto.includes('registro hacia adelante'), 'el informe dice de dónde saldría el veredicto limpio')
bien(
  texto.includes('SOBREVIVIR A LOS SEIS DESCARTES NO ES UN APROBADO'),
  'y que sobrevivir a los descartes no es aprobar',
)
// ⚠️ La palabra que NO puede aparecer en esta sección: el veredicto se llama
// «sobrevive» o «tumbado», nunca «aprobado».
const seccion = texto.slice(texto.indexOf('SEGUNDA VUELTA'))
bien(
  /→ (SOBREVIVE|TUMBADO)/.test(seccion),
  'el veredicto de la sección dice SOBREVIVE o TUMBADO',
)
bien(!/→ APROBADO/.test(seccion), 'y nunca dice APROBADO')

original('')
if (fallos) {
  original(`✗ ${fallos} comprobaciones del humo fallaron.`)
  process.exit(1)
}
original('✓ la plomería funciona y el informe sale entero.')
