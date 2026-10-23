// COMPROBACIONES DEL CORTE PARES CON DÓLAR / CRUCES. Sin internet, sin
// créditos y sin llave.
//
// Vigila los tres fallos que esta tarjeta puede tener y que NO dan error:
//
//   1. que los números de pantalla se separen del listón que los juzgó —
//      `CORTE.pisoSenalesMes` está escrito a mano en `src/` porque `scripts/`
//      no existe en el navegador, así que aquí se compara con el de verdad;
//   2. que un montón se defina POR DESCARTE y se trague en silencio un `name`
//      roto (séptima vez que esa familia muerde en este proyecto);
//   3. que una regla sin señales DESAPAREZCA en vez de decir «hoy nada»,
//      dejando en pantalla solo lo que parece estar pasando algo.
import { CORTE, enElMonton, hayAlgoQueEnsenar, montonesDeHoy } from '../src/lib/corteDolarCruces.js'
import { MIN_SENALES_MES, UMBRAL } from './lib/preregistro-cruces.mjs'
import { PAIR_NAMES } from '../src/lib/pairs.js'

let fallos = 0
const bien = (ok, txt) => {
  if (!ok) fallos++
  console.log(`  ${ok ? '✓' : '✗ MAL'}  ${txt}`)
}

const setup = (name, lado = 'COMPRA') => ({ name, lado, crudo: { precio: 1, sl: 0.99, tp: 1.01, rr: 1 } })

console.log('\n1. El montón se pregunta por lo que ES, nunca por descarte')
bien(enElMonton('EUR/USD', 'dolar'), 'EUR/USD es un par con dólar')
bien(enElMonton('USD/JPY', 'dolar'), 'USD/JPY también (el dólar va delante)')
bien(!enElMonton('EUR/USD', 'cruces'), 'y no es un cruce')
bien(enElMonton('EUR/CHF', 'cruces'), 'EUR/CHF es un cruce')
bien(!enElMonton('EUR/CHF', 'dolar'), 'y no es un par con dólar')
// ⚠️ LA QUE IMPORTA: basura dentro no cae en NINGUNO de los dos. Si «con
// dólar» fuera «todo lo que no es cruce», esto entraría ahí en silencio.
for (const basura of ['', 'EURUSD', 'EUR/', '???/USD', 'EUR/USD/JPY', null, undefined, 42]) {
  bien(
    !enElMonton(basura, 'dolar') && !enElMonton(basura, 'cruces'),
    `«${String(basura)}» no cae en ningún montón`
  )
}
bien(!enElMonton('EUR/USD', 'inventado'), 'un montón que no existe no acepta nada')

console.log('\n2. Los 14 pares de Swing se reparten en 7 y 7, sin sobras')
const conDolar = PAIR_NAMES.filter((p) => enElMonton(p, 'dolar'))
const cruces = PAIR_NAMES.filter((p) => enElMonton(p, 'cruces'))
bien(conDolar.length === 7, `7 pares con dólar (${conDolar.length})`)
bien(cruces.length === 7, `7 cruces (${cruces.length})`)
bien(
  conDolar.length + cruces.length === PAIR_NAMES.length,
  'y entre los dos están los 14: ninguno se queda fuera'
)

console.log('\n3. ⚠️ Los números de pantalla NO se separan del listón que los juzgó')
bien(
  CORTE.pisoSenalesMes === MIN_SENALES_MES,
  `el piso de señales/mes de la pantalla (${CORTE.pisoSenalesMes}) es el del listón (${MIN_SENALES_MES})`
)
// El sello «pasó / no pasó» de la pantalla tiene que cuadrar con los propios
// números que la pantalla enseña. Si alguien copia mal un número del informe,
// esto lo canta en vez de dejar un sello que afirma lo contrario del dato.
for (const r of CORTE.reglas) {
  const mejora = r.por1R - r.base
  const sinSenales = r.senalesMes < CORTE.pisoSenalesMes
  const deberia =
    mejora >= UMBRAL &&
    r.mitades.every((m) => m > 0) &&
    r.control < r.base &&
    r.conSwap > 0 &&
    !sinSenales &&
    !r.fallaConcentracion
  bien(
    r.pasaListon === deberia,
    `${r.tipo}: el sello «${r.pasaListon ? 'pasó' : 'no pasó'}» cuadra con sus números`
  )
}
bien(
  CORTE.reglas.filter((r) => r.pasaListon).length === 1,
  'y solo UNA de las tres pasó — si se pintaran las tres igual, se leerían igual'
)
bien(
  CORTE.reglas.every((r) => r.control < r.base),
  'en las tres el montón CONTRARIO empeora, que es lo que distingue el corte del azar'
)
bien(/^\d{4}-\d{2}-\d{2}$/.test(CORTE.fecha), 'los números llevan su fecha dentro para delatarse al envejecer')

console.log('\n4. El reparto de las señales de hoy')
const listas = {
  tendencia: [setup('EUR/USD'), setup('AUD/USD'), setup('EUR/CHF'), setup('GBP/JPY')],
  reversion: [setup('EUR/NZD'), setup('USD/CAD', 'VENTA')],
  bollinger: [],
}
const g = montonesDeHoy(listas)
bien(g.length === 3, 'devuelve SIEMPRE las tres reglas')
const porTipo = Object.fromEntries(g.map((x) => [x.tipo, x]))
bien(
  porTipo.tendencia.dentro.map((s) => s.name).join(',') === 'EUR/USD,AUD/USD',
  'la app se queda con sus pares con dólar'
)
bien(porTipo.tendencia.fuera === 2, 'y dice cuántas quedan en el montón malo (2)')
bien(
  porTipo.reversion.dentro.map((s) => s.name).join(',') === 'EUR/NZD',
  'la reversión se queda con sus cruces'
)
bien(porTipo.reversion.fuera === 1, 'y cuenta el par con dólar que se queda fuera')
// ⚠️ Una regla sin señales SIGUE SALIENDO.
bien(
  porTipo.bollinger && porTipo.bollinger.dentro.length === 0 && porTipo.bollinger.fuera === 0,
  'Bollinger sin señales hoy sigue en la lista, con cero'
)

console.log('\n5. Lo que no es un par no desaparece: se cuenta aparte')
const roto = montonesDeHoy({ tendencia: [setup('EUR/USD'), setup('BASURA')], reversion: [], bollinger: [] })
const t = roto.find((x) => x.tipo === 'tendencia')
bien(t.dentro.length === 1 && t.fuera === 0, 'el par bueno entra y el roto no')
bien(t.sinClasificar === 1, 'y el roto queda contado en `sinClasificar`, no evaporado')

console.log('\n6. La tarjeta entera desaparece solo si no hay NADA')
bien(!hayAlgoQueEnsenar(montonesDeHoy({})), 'sin ninguna señal no se pinta nada')
bien(!hayAlgoQueEnsenar(montonesDeHoy({ tendencia: [], reversion: [], bollinger: [] })), 'con listas vacías tampoco')
bien(
  hayAlgoQueEnsenar(montonesDeHoy({ tendencia: [setup('EUR/CHF')], reversion: [], bollinger: [] })),
  'pero con una señal SOLO en el montón malo SÍ se pinta — esconderla sería esconder la mitad del dato'
)
bien(
  hayAlgoQueEnsenar(montonesDeHoy({ tendencia: [setup('EUR/USD')], reversion: [], bollinger: [] })),
  'y con una en el bueno, también'
)

console.log('\n7. Entradas raras no revientan')
bien(montonesDeHoy(null).length === 3, '`null` da las tres reglas vacías en vez de explotar')
bien(montonesDeHoy({ tendencia: 'no soy una lista' })[0].dentro.length === 0, 'una lista que no es lista se trata como vacía')
bien(montonesDeHoy({ tendencia: [{ lado: 'COMPRA' }] })[0].sinClasificar === 1, 'un setup sin `name` cuenta como sin clasificar')

console.log(`\n${fallos === 0 ? '✅ TODO BIEN' : `❌ ${fallos} MAL`}\n`)
process.exit(fallos ? 1 : 0)
