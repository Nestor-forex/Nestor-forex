// Comprobaciones del oro y su correlación con los pares. SIN INTERNET.
//
//     node scripts/prueba-oro.mjs
//
// El bloque que de verdad importa es el 3: las fechas del oro y las de los
// pares vienen de DOS consultas distintas y no tienen por qué coincidir. Si se
// comparan por posición, la correlación sale plausible y calculada sobre días
// distintos — sin dar ningún error.

import {
  SIMBOLO_ORO,
  TIPOS_DE_ORO,
  VELAS_ORO,
  cambio,
  correlConPares,
  correlOrdenada,
  diasDelOro,
  esOroDeVerdad,
  prepararOro,
} from '../src/lib/oro.js'
import { VENTANA_CORREL } from '../src/lib/correlacion.js'

let hechas = 0
let fallos = 0
const ok = (cond, que) => {
  hechas++
  if (cond) return true
  fallos++
  console.error(`  ✗ ${que}`)
  return false
}

// Un calendario de días hábiles inventado, para no depender de fechas reales.
const dias = (n, desde = 0) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 0, 5) + (i + desde) * 86_400_000)
    return d.toISOString().slice(0, 10)
  })

const serie = (fechas, fn) => new Map(fechas.map((f, i) => [f, fn(i)]))

console.log('1. El tipo: solo materia prima, nunca una acción que se llame igual')
{
  // ⚠️ Los cuatro casos son REALES, del log de la sonda del 2026-09-29.
  ok(esOroDeVerdad({ type: 'Precious Metal' }) === true, 'XAU/USD es «Precious Metal» → sirve')
  ok(esOroDeVerdad({ type: 'Commodity' }) === true, 'una materia prima también')

  // Éstas respondieron 200 con cinco velas válidas y NO son oro ni petróleo.
  ok(esOroDeVerdad({ type: 'Common Stock' }) === false, '«GOLD» de la NYSE es una ACCIÓN → NO sirve')
  ok(esOroDeVerdad({ type: 'American Depositary Receipt' }) === false, '«BZ» es un ADR → NO sirve')
  ok(esOroDeVerdad({ type: 'ETF' }) === false, 'un ETF SIGUE al activo, no ES el activo → NO sirve')

  ok(esOroDeVerdad({}) === false, 'sin `type` no se da por bueno')
  ok(esOroDeVerdad(null) === false, 'con null no revienta y dice que no')
  ok(TIPOS_DE_ORO.length >= 1 && SIMBOLO_ORO === 'XAU/USD', 'el símbolo es el que la sonda dejó comprobado')
}

console.log('2. El cambio: «no lo sé» en vez de cero')
{
  const c = [100, 110, 121]
  ok(Math.abs(cambio(c, 1) - 0.1) < 1e-9, `un día: +10 % y salió ${cambio(c, 1)}`)
  ok(Math.abs(cambio(c, 2) - 0.21) < 1e-9, `dos días: +21 % y salió ${cambio(c, 2)}`)

  // ⚠️ `null`, NUNCA 0: un 0 diría «no se movió», que es una afirmación.
  ok(cambio(c, 5) === null, 'sin suficientes días devuelve null, no 0')
  ok(cambio([], 1) === null, 'con lista vacía devuelve null')
  ok(cambio(null, 1) === null, 'con null devuelve null sin reventar')
  ok(cambio([0, 50], 1) === null, 'un divisor de cero devuelve null, no Infinity')
  ok(cambio([NaN, 50], 1) === null, 'un valor roto devuelve null')
  ok(cambio([100, 100], 1) === 0, 'y un cambio de CERO de verdad sí es 0')
}

console.log('3. ⚠️ LAS FECHAS SE INTERSECAN: el oro y los pares no comparten calendario')
{
  // 80 días para los dos, pero al oro se le quitan tres de en medio — que es
  // justo lo que pasa con un festivo del metal que el Forex no tiene.
  const todas = dias(80)
  const faltan = new Set([todas[20], todas[21], todas[40]])

  // El par sube un poquito cada día; el oro BAJA un poquito cada día. Sobre
  // los MISMOS días eso es correlación −1 exacta.
  const oroTodo = serie(todas, (i) => 2000 - i)
  const oro = new Map([...oroTodo].filter(([f]) => !faltan.has(f)))
  const par = { name: 'EUR/USD', porFecha: serie(todas, (i) => 1 + i / 1000) }

  const r = correlConPares(oro, [par])
  ok(r['EUR/USD'] != null, 'sale correlación aunque al oro le falten días')
  ok(r['EUR/USD'].r === -1, `con series opuestas tiene que dar −1 exacto, y dio ${r['EUR/USD']?.r}`)

  // ⚠️ LA COMPROBACIÓN CENTRAL. Si se compararan por posición, el oro ya va
  // tres días corrido respecto al par a partir del día 40, y el −1 se
  // rompería. Que siga siendo −1 exacto es la prueba de que se alinean por
  // FECHA y no por índice.
  ok(
    r['EUR/USD'].n === Math.min(VENTANA_CORREL, oro.size - 1),
    `el número de días usados sale de los COMUNES (${r['EUR/USD']?.n})`,
  )

  // Y con calendarios que apenas se tocan, mejor nada que un número inventado.
  const otroMundo = { name: 'GBP/USD', porFecha: serie(dias(80, 500), (i) => 1 + i / 1000) }
  ok(!('GBP/USD' in correlConPares(oro, [otroMundo])), 'sin días en común NO se publica correlación')

  // Pocos días comunes tampoco: una correlación sobre cuatro días se ve en
  // pantalla igual que una sobre sesenta.
  const corto = { name: 'USD/JPY', porFecha: serie(todas.slice(0, 10), (i) => 150 + i) }
  ok(!('USD/JPY' in correlConPares(oro, [corto])), 'con menos días que el mínimo tampoco sale')
}

console.log('4. La correlación se calcula sobre CAMBIOS, no sobre precios')
{
  // ⚠️ El caso que ya está documentado en `correlacion.js`: dos series que
  // suben durante el periodo «se parecen» si se correlacionan los precios,
  // aunque su día a día no tenga nada que ver.
  //
  // 📌 La primera versión de este mercado NO producía el contraste que la
  // comprobación afirma: el zigzag era tan grande como la tendencia, así que
  // sobre precios salía −0,18 en vez de muy positivo y la comprobación
  // fallaba. El mercado inventado tiene que producir el caso que se dice
  // medir — es la misma lección que en `prueba-barrido-publicado.mjs`, donde
  // una tendencia demasiado limpia dejaba CERO setups.
  //
  // Ahora la TENDENCIA manda en el precio (el oro sube 800 sobre 2000, el par
  // 0,4 sobre 1) y el ZIGZAG manda en el cambio diario, con las dos fases
  // opuestas. Así los precios van casi a +1 y los cambios casi a −1.
  const todas = dias(80)
  const oro = serie(todas, (i) => 2000 + 10 * i + (i % 2 ? 5 : -5))
  const par = { name: 'EUR/USD', porFecha: serie(todas, (i) => 1 + 0.005 * i + (i % 2 ? -0.0025 : 0.0025)) }

  const r = correlConPares(oro, [par])['EUR/USD'].r
  ok(r < -0.8, `el día a día va al revés: tenía que salir muy negativo y salió ${r}`)

  // Si se hubiera hecho sobre precios, las dos suben y saldría muy positivo.
  // Se comprueba a mano para dejar el contraste escrito, como en correlacion.js.
  const px = (m) => [...m.keys()].sort().map((f) => m.get(f))
  const a = px(oro)
  const b = px(par.porFecha)
  const media = (x) => x.reduce((s, v) => s + v, 0) / x.length
  const ma = media(a)
  const mb = media(b)
  let num = 0
  let va = 0
  let vb = 0
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    va += (a[i] - ma) ** 2
    vb += (b[i] - mb) ** 2
  }
  const malo = num / Math.sqrt(va * vb)
  ok(malo > 0.9, `sobre PRECIOS el método malo daría ${malo.toFixed(2)} — lo contrario`)
}

console.log('5. Lo que se publica')
{
  const todas = dias(80)
  const oro = serie(todas, (i) => 4000 + i)
  const pares = ['EUR/USD', 'USD/CHF'].map((name) => ({
    name,
    porFecha: serie(todas, (i) => 1 + i / 1000),
  }))

  const d = prepararOro(oro, pares, new Date('2026-09-29T06:30:00Z'))
  ok(d.actualizadoEl === '2026-09-29T06:30:00.000Z', 'lleva cuándo se publicó')
  ok(d.simbolo === 'XAU/USD', 'y qué símbolo es')
  ok(d.fecha === todas[todas.length - 1], `la fecha del ÚLTIMO dato, no la de hoy (${d.fecha})`)
  ok(d.precio === 4079, `el último cierre (${d.precio})`)
  ok(Object.keys(d.correl).length === 2, 'las dos correlaciones')

  // ⚠️ NO SE PUBLICA NINGUNA SERIE DE CIERRES, y esto lo vigila a propósito.
  //
  // Hubo un `serie20` de 20 cierres para un gráfico que no existe, y se quitó
  // antes de llegar a producción: publicar un dato que nadie pinta es el mismo
  // descuido que el tick volume, y el `Sparkline` de esta app pinta verde o
  // rojo, que aquí afirmaría que el oro subiendo es bueno. El motivo entero
  // está en `src/lib/oro.js`.
  //
  // Si alguien devuelve la serie sin leerse aquello, esta línea lo para.
  const listas = Object.entries(d).filter(([, v]) => Array.isArray(v))
  ok(listas.length === 0, `ninguna lista de cierres en el archivo (hay ${listas.map(([k]) => k).join(', ') || 'ninguna'})`)

  // Sobrevive el viaje por JSON, que es como llega al navegador.
  const re = JSON.parse(JSON.stringify(d))
  ok(re.correl['EUR/USD'].r === d.correl['EUR/USD'].r, 'la correlación sobrevive el viaje por JSON')

  // ⚠️ EL ARCHIVO LO BAJA CADA MIEMBRO AL ABRIR LA APP. Si alguien mete aquí
  // los 120 cierres o las series de los 14 pares, esto lo canta.
  const kb = JSON.stringify(d).length / 1024
  ok(kb < 2, `el archivo publicado debe pesar menos de 2 KB y pesa ${kb.toFixed(2)} KB`)

  // Entradas imposibles no revientan.
  ok(prepararOro(null, null).precio === null, 'sin oro, precio null y no revienta')
  ok(Object.keys(prepararOro(null, null).correl).length === 0, 'y sin correlaciones')
}

console.log('6. El orden de la pantalla: por tamaño ABSOLUTO')
{
  const datos = {
    correl: {
      'EUR/USD': { r: 0.55, n: 60 },
      'USD/CHF': { r: -0.91, n: 60 },
      'GBP/USD': { r: 0.72, n: 60 },
      'USD/JPY': { r: 0.11, n: 60 },
      'NZD/CAD': { r: null, n: 60 },
    },
  }
  const l = correlOrdenada(datos)
  ok(l[0].par === 'USD/CHF', `la más fuerte es la NEGATIVA y salió ${l[0]?.par}`)
  ok(l[1].par === 'GBP/USD', 'después la de +0,72')
  ok(l.length === 3, `las que pasan el umbral son 3 y salieron ${l.length}`)
  ok(!l.some((x) => x.par === 'USD/JPY'), 'la de +0,11 no llega al umbral')
  ok(!l.some((x) => x.par === 'NZD/CAD'), 'una correlación null no se enseña como si fuera un número')
  ok(correlOrdenada(null).length === 0, 'con null devuelve lista vacía sin reventar')
  ok(correlOrdenada({}).length === 0, 'sin `correl` tampoco revienta')
}

console.log('7. La edad del dato')
{
  const hoy = new Date('2026-09-29T12:00:00Z')
  ok(diasDelOro('2026-09-29', hoy) === 0, 'el dato de hoy tiene 0 días')
  ok(diasDelOro('2026-09-26', hoy) === 3, 'el del viernes, 3')
  ok(diasDelOro(null) === null, 'sin fecha devuelve null, no 0')
  ok(diasDelOro('mañana') === null, 'una fecha ilegible devuelve null, no 0')
}

console.log('8. Aquí NO se decide comprar ni vender')
{
  // ⚠️ Misma comprobación que en `cot.js` y en `diagnostico.js`. El oro como
  // FILTRO —«no comprar dólar si el oro sube»— cambiaría las señales y
  // tendría que pasar por el banco de pruebas con su listón escrito antes.
  // Van siete familias de filtros medidas y siete fallando.
  //
  // Existe para que, si algún día alguien añade un veredicto, tenga que venir
  // aquí a borrarla — o sea, a propósito y no de pasada.
  const todas = dias(80)
  const d = prepararOro(
    serie(todas, (i) => 4000 + i),
    [{ name: 'EUR/USD', porFecha: serie(todas, (i) => 1 + i / 1000) }],
  )
  const prohibidas = ['lado', 'senal', 'señal', 'compra', 'venta', 'direccion', 'dirección', 'refugio', 'riesgo', 'sugerencia']
  for (const k of prohibidas) {
    ok(!(k in d), `el oro no devuelve «${k}»: es información, no un filtro`)
    ok(!(k in (d.correl['EUR/USD'] ?? {})), `ni dentro de cada correlación («${k}»)`)
  }
}

console.log('9. Se piden bastantes velas para que la ventana quepa')
{
  // Hacen falta VENTANA_CORREL + 1 cierres para sacar la ventana entera, y
  // margen para los días que el oro tenga y los pares no (y al revés).
  ok(VELAS_ORO > VENTANA_CORREL + 1, `${VELAS_ORO} velas contra una ventana de ${VENTANA_CORREL}`)
  ok(VELAS_ORO >= 100, `con margen de sobra para los calendarios distintos (${VELAS_ORO})`)
}

console.log('')
if (fallos) {
  console.error(`✗ ${fallos} de ${hechas} comprobaciones fallaron.`)
  process.exit(1)
}
console.log(`✓ todo bien (${hechas} comprobaciones).`)
