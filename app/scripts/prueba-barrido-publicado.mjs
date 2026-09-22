// Prueba del archivo que lee la app. Sin internet y sin gastar créditos:
//
//     node scripts/prueba-barrido-publicado.mjs
//
// 📌 POR QUÉ APARECE TAN TARDE, QUE ES LA PARTE QUE HAY QUE LEER.
//
// La app hermana tiene esta prueba desde el 2026-09-02. Swing publicaba desde
// el 2026-08-09 **sin una sola comprobación**, porque la lógica vivía en línea
// dentro de `vigia.mjs` y no había forma de importarla sin arrancar el vigía
// entero, que necesita red y créditos.
//
// Salió el 2026-09-22 al publicar campos nuevos: se fue a buscar el guardia que
// la memoria decía que existía **y en Swing no estaba**. Es «a los PRIMOS no
// los vigila nadie» con una vuelta más: el detector de duplicados sin
// clasificar solo mira lo que está en las DOS apps, así que **un archivo que
// falta entero en una de ellas es invisible para él**.
//
// ─────────────────────────────────────────────────────────────────────────
// Vigila DOS fallos que no se ven, y los dos aparecen como «la app se ve rara»
// en el celular de Néstor, nunca como un error en ningún registro:
//
//   1. QUE FALTE UN CAMPO. Si `armarBarrido` deja fuera algo que la app
//      necesita, la pantalla sale con huecos o vacía. El vigía no se entera:
//      escribió su archivo tan tranquilo.
//
//   2. QUE SE CUELE UNA SERIE LARGA. Son 300 números por par y 14 pares. Un
//      descuido aquí multiplica lo que se baja cada vez que alguien abre la
//      app, y tampoco avisa nadie: simplemente tarda más, sobre todo con datos
//      móviles.
//
// Corre el barrido de verdad sobre un mercado inventado, lo publica, lo vuelve
// a leer como lo leería el navegador (pasando por JSON, que es donde se pierden
// los `undefined` y los `NaN`) y exige que `derivarVista` saque lo mismo que
// sacaría con los datos completos.

import { computarBarrido, derivarVista } from '../src/lib/marketCalc.js'
import { armarBarrido, SERIES_LARGAS } from './lib/barrido-publicado.mjs'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// --- Un mercado de mentira, pero con la forma del de verdad ---------------
//
// ⚠️ EL MERCADO INVENTADO ES LA PARTE QUE MÁS FÁCIL SALE MAL, y ya está
// documentado en la app hermana: el primer intento de allá era una tendencia
// limpia, daba ADX 100 y CERO setups, así que la prueba pasaba comparando dos
// listas vacías. Una tendencia sin retrocesos deja el RSI clavado y los filtros
// la rechazan entera.
//
// Por eso cada divisa lleva una onda de periodo medio Y SU PROPIA FASE: suben,
// se devuelven, y no todas a la vez. Si se toca este mercado, mirar que la
// comprobación de «más de cero setups» siga pasando.
//
// Aquí son VELAS DIARIAS, no de una hora: 400 días, una vela por día.
const CCY = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD']
const BASE = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150, CHF: 0.88, AUD: 1.52, NZD: 1.64, CAD: 1.36 }
const DERIVA = { USD: 0, EUR: -0.00008, GBP: 0.00006, JPY: 0.024, CHF: 0.00004, AUD: -0.00012, NZD: 0.0001, CAD: -0.00006 }
const FASE = { USD: 0, EUR: 0.7, GBP: 1.9, JPY: 3.1, CHF: 4.4, AUD: 5.2, NZD: 2.5, CAD: 6.0 }

const fechas = []
const rates = {}
const rangosPar = {}
const arranque = new Date('2025-08-01T00:00:00Z')
for (let i = 0; i < 400; i++) {
  const d = new Date(arranque.getTime() + i * 86400000)
  const t = d.toISOString().slice(0, 10)
  fechas.push(t)
  const fila = {}
  const filaRangos = {}
  for (const c of CCY) {
    const v =
      BASE[c] *
      (1 + DERIVA[c] * i + 0.008 * Math.sin(i / 19 + FASE[c]) + 0.0015 * Math.sin(i / 2.7 + FASE[c]))
    fila[c] = v
    filaRangos[c] = { h: v * 1.0012, l: v * 0.9988 }
  }
  rates[t] = fila
  rangosPar[t] = filaRangos
}

// `computarBarrido` de Swing quiere los rangos POR PAR, no por divisa: aquí se
// piden los 14 pares directos a Twelve Data, así que los extremos son exactos y
// no se derivan. Se arman igual que en producción.
//
// ⚠️⚠️ LAS DOS TRAMPAS DE ESTE TROZO, y las dos me mordieron al estrenar la
// prueba. Las dos veces el bloque 5 gritó «máx/mín cruzados con el cierre» y
// las dos veces **el fallo era del banco de pruebas, no de la app**:
//
//   1. El precio del par es `q / b`, NO `b / q`. Así lo arma `marketCalc`
//      (`px = serie[q] / serie[b]`), porque las tasas vienen en unidades por
//      dólar.
//   2. **El dólar vale 1 y punto.** `computarBarrido` hace
//      `c === 'USD' ? 1 : rates[d][c]`, o sea que IGNORA lo que traiga
//      `rates[d].USD`. Un mercado inventado que haga oscilar el dólar produce
//      unos cierres y unos extremos que no se corresponden — y el desajuste es
//      pequeño (menos del 1 %), o sea perfectamente creíble.
//
// Por eso los extremos se derivan del MISMO precio que verá el barrido, con la
// función de abajo, en vez de recalcularlo a mano. Es la lección que este
// proyecto lleva escrita media docena de veces: **antes de creer que la app
// está rota, comprobar que el banco de pruebas mide lo que dice medir.**
const comoLoVeElBarrido = (t, c) => (c === 'USD' ? 1 : rates[t][c])
const paresDelBarrido = computarBarrido(fechas, rates).pares.map((p) => p.name)
const rangosPorPar = {}
for (const t of fechas) {
  const fila = {}
  for (const nombre of paresDelBarrido) {
    const [b, q] = nombre.split('/')
    const v = comoLoVeElBarrido(t, q) / comoLoVeElBarrido(t, b)
    fila[nombre] = { h: v * 1.0012, l: v * 0.9988, c: v }
  }
  rangosPorPar[t] = fila
}

const data = computarBarrido(fechas, rates, rangosPorPar)

console.log('\n1. El barrido de mentira sirve para probar algo')
{
  comprobar(data.pares.length === 14, `salen los 14 pares de la app (${data.pares.length})`)
  const tendencias = new Set(data.pares.map((p) => p.tend))
  comprobar(tendencias.size >= 2, `y no todos hacen lo mismo (${[...tendencias].join(', ')})`)
  const rsis = data.pares.map((p) => p.rsiV)
  comprobar(
    Math.max(...rsis) - Math.min(...rsis) > 20,
    `el RSI está repartido y no clavado (de ${Math.min(...rsis).toFixed(0)} a ${Math.max(...rsis).toFixed(0)})`
  )
  comprobar(
    data.pares.every((p) => Number.isFinite(p.rsiV) && Number.isFinite(p.atrAbs)),
    'todos traen RSI y ATR con números de verdad'
  )
}

console.log('\n2. Lo publicado pesa poco')
const publicado = armarBarrido(data, new Date('2026-09-22T16:00:00Z'))
const texto = JSON.stringify(publicado)
{
  const kb = texto.length / 1024
  console.log(`  · tamaño: ${kb.toFixed(1)} KB`)
  // El tope está holgado a propósito: no es para afinar bytes, es para que un
  // descuido grande no pase inadvertido.
  comprobar(kb < 200, `cabe de sobra por debajo de 200 KB (${kb.toFixed(1)})`)

  const conSeries = JSON.stringify({ ...publicado, pares: data.pares }).length / 1024
  comprobar(conSeries > kb * 2, `y con las series dentro pesaría ${(conSeries / kb).toFixed(0)} veces más (${conSeries.toFixed(0)} KB)`)
}

console.log('\n3. Ninguna serie larga se coló')
{
  for (const serie of SERIES_LARGAS) {
    comprobar(
      !data.pares.some((p) => p[serie] === undefined),
      `\`${serie}\` sí existe en el barrido completo (si no, esta prueba no probaría nada)`
    )
    comprobar(publicado.pares.every((p) => p[serie] === undefined), `y \`${serie}\` NO se publica`)
  }

  // La red de verdad: cualquier campo con muchos números, se llame como se
  // llame. `serie20`, `altos20` y `bajos20` son 20 cada una y las tres dibujan
  // el gráfico, así que el tope va en 30 — pasa lo legítimo y no pasa una
  // serie de 300.
  const gordos = []
  for (const p of publicado.pares) {
    for (const [campo, valor] of Object.entries(p)) {
      if (Array.isArray(valor) && valor.length > 30) gordos.push(`${p.name}.${campo} (${valor.length})`)
    }
  }
  comprobar(
    gordos.length === 0,
    gordos.length ? `SE COLARON series largas: ${gordos.slice(0, 5).join(', ')}` : 'ningún campo publicado trae más de 30 números'
  )
}

// --- 4. LA COMPROBACIÓN QUE IMPORTA --------------------------------------
//
// Que la app, leyendo SOLO el archivo publicado, saque exactamente la misma
// pantalla que sacaría con los datos completos. Se pasa por JSON a propósito:
// es el viaje real, y es donde se pierden los `undefined` y los `NaN`.

console.log('\n4. La app ve lo mismo con el archivo que con los datos completos')
{
  const comoLoVeElNavegador = JSON.parse(texto)

  // Dos configuraciones: la app tal cual, y con los filtros abiertos. Con los
  // umbrales de la app un mercado inventado da uno o dos setups, y con tan
  // pocos la comparación apenas toca código. Lo que se comprueba no es qué
  // señales da la app, sino que el archivo lleva los mismos datos que el
  // barrido completo — así que cuantos más haya, mejor.
  const CONFIGS = [
    ['con los umbrales de la app', { thr: 0.5, topN: 3 }],
    ['y con los filtros abiertos, que ejercitan mucho más', { thr: 0.2, topN: 5, rsiMax: null, tendenciaMin: 'ninguna', incluirVentas: true, incluirReversion: true }],
  ]

  for (const [comoSeLlama, opciones] of CONFIGS) {
    const conTodo = derivarVista(data, opciones)
    const conArchivo = derivarVista(comoLoVeElNavegador, opciones)

    comprobar(conArchivo.setups.length > 0, `${comoSeLlama}: salen ${conArchivo.setups.length} setups, más de cero`)
    // Se comparan las vistas ENTERAS, no setup por setup: así, si algún día
    // `derivarVista` devuelve algo nuevo, entra solo en la comparación en vez
    // de quedarse sin comprobar hasta que alguien se acuerde de añadirlo.
    comprobar(
      JSON.stringify(conArchivo) === JSON.stringify(conTodo),
      '  la vista entera sale idéntica, hasta el último decimal'
    )

    const huecos = []
    for (const s of conArchivo.setups) {
      for (const [campo, valor] of Object.entries(s)) {
        if (valor === undefined || (typeof valor === 'number' && !Number.isFinite(valor))) huecos.push(`${s.name}.${campo}`)
      }
    }
    comprobar(huecos.length === 0, huecos.length ? `  hay huecos: ${huecos.slice(0, 5).join(', ')}` : '  ningún setup sale con huecos ni con NaN')
  }
}

// --- 5. Los extremos de 20 días viajan, y ALINEADOS -----------------------
//
// Añadidos el 2026-09-22 para que la pantalla de detalle pueda dibujar el
// recorrido de cada día en vez de solo la línea de cierres. Son +3,1 KB
// medidos sobre el archivo real de producción.
//
// ⚠️ Lo que de verdad hay que vigilar no es que estén: es que estén ALINEADOS
// con `serie20`. Tres listas de distinto largo pintarían mechas en el día que
// no es, y eso no da ningún error — sale un gráfico perfectamente creíble y
// falso, que es la peor forma de romperse que tiene esta app.

console.log('\n5. Los extremos de 20 días viajan y cuadran con los cierres')
{
  const conArchivo = derivarVista(JSON.parse(texto), { thr: 0.2, topN: 5, rsiMax: null, tendenciaMin: 'ninguna', incluirVentas: true })
  comprobar(conArchivo.setups.length > 0, `hay setups que mirar (${conArchivo.setups.length})`)

  const malos = []
  for (const s of conArchivo.setups) {
    const c = s.crudo
    if (!Array.isArray(c.altos20) || !Array.isArray(c.bajos20)) malos.push(`${s.name}: no llegan`)
    else if (c.altos20.length !== c.serie20.length || c.bajos20.length !== c.serie20.length) malos.push(`${s.name}: largos distintos`)
    // Un máximo por debajo del cierre, o un mínimo por encima, es imposible en
    // una vela de verdad: querría decir que se cruzaron al publicarse.
    else if (c.serie20.some((cierre, i) => c.altos20[i] < cierre || c.bajos20[i] > cierre)) malos.push(`${s.name}: máx/mín cruzados con el cierre`)
  }
  comprobar(malos.length === 0, malos.length ? `MAL: ${malos.slice(0, 4).join(' · ')}` : 'los tres van juntos, del mismo largo y sin cruzarse')

  // Y que NO sean los cierres disfrazados: si alguien reutilizara la variable
  // equivocada (ya pasó con `serie20` el 2026-08-09), saldrían idénticos y el
  // gráfico dibujaría mechas de largo cero sin dar un solo error.
  const s0 = conArchivo.setups[0].crudo
  comprobar(
    JSON.stringify(s0.altos20) !== JSON.stringify(s0.serie20),
    'los máximos NO son los cierres repetidos'
  )
  comprobar(
    JSON.stringify(s0.bajos20) !== JSON.stringify(s0.serie20),
    'los mínimos NO son los cierres repetidos'
  )
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'El barrido publicado lleva todo lo que la app necesita, y nada de sobra.')
process.exit(fallos ? 1 : 0)
