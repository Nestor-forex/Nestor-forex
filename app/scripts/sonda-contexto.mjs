// SONDA DEL CONTEXTO QUE LAS APPS NO PUEDEN VER — escrita el 2026-10-06.
//
// ─────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE
// ─────────────────────────────────────────────────────────────────────────
// Al comparar las apps contra las mesas de análisis salió una lista de cuatro
// cosas que los analistas dicen y las apps no ven. Néstor pidió cerrarlas:
// «quiero darle solución a esto».
//
//   1. GEOPOLÍTICA → el PETRÓLEO. El ataque del 2026-10-06 en Arabia Saudí
//      movió los refugios y puede mover el crudo, que es la pata que decide el
//      CAD. No se puede leer la noticia; sí se puede leer el precio del crudo.
//   2. LAS EXPECTATIVAS DE LA FED → el RENDIMIENTO DEL TESORO A 2 AÑOS. Las
//      apps ven la tasa VIGENTE (3,875 %); lo que mueve el dólar es lo que el
//      mercado espera. El 2 años es el termómetro de eso.
//   3. LA PRIMA DE RIESGO FRANCESA → el diferencial OAT−Bund a 10 años. 160
//      puntos básicos es el dato que estaba moviendo el euro.
//   4. EL RIESGO DE INTERVENCIÓN del Banco de Japón → los registros de
//      intervención del Ministerio de Finanzas japonés.
//
// ⚠️ ANTES DE VER NINGÚN NÚMERO, lo que ya se sabe que NO se va a arreglar:
//
//   · La (1) y la (4) NO son el dato que el analista usa. El analista lee la
//     noticia; nosotros leeríamos un precio y un registro mensual. Son PROXIES,
//     y hay que rotularlos así o se convierten en «la app sabe de geopolítica».
//   · La (2) es un proxy explícito: el 2 años NO es «la probabilidad de subida
//     en octubre». Esa probabilidad sale de los futuros de fondos federales
//     (CME FedWatch), que no se publican gratis en forma de API. Decir «el
//     mercado da un 24 %» con el 2 años en la mano sería inventar un número.
//   · Y NINGUNA sería un FILTRO: no apagarían ni una señal. Esa distinción es
//     la que decide si hace falta medirlas antes de usarlas, y va escrita aquí
//     ANTES de que existan los datos, a propósito.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ POR QUÉ UNA SONDA Y NO EL LECTOR DIRECTAMENTE
// ─────────────────────────────────────────────────────────────────────────
// Es la costumbre de esta casa desde el calendario, y las dos veces que se
// saltó costó una tabla. La red de las sesiones donde se programa bloquea casi
// todos los hosts de datos, así que desde allí no se puede ver ni si responden
// ni qué forma tienen. Esto corre en Actions, que es donde no hay bloqueo.
//
// ⚠️⚠️ Y LA TRAMPA QUE ESTA SONDA EXISTE PARA CAZAR ES LA DEL ORO, otra vez:
// el 2026-09-29 `GOLD` y `CL` de Twelve Data respondieron **200 con cinco
// velas perfectamente válidas** y eran ACCIONES de la bolsa de Nueva York
// (42,85 y 86,52). `WTI` resultó ser «W&T Offshore Inc.». Un lector que
// aceptara «200 con números» habría publicado «petróleo: 42,85».
//
// Así que aquí NINGÚN candidato pasa por responder 200. Cada uno tiene que
// traer un número DENTRO de su rango plausible, y la sonda imprime la fila
// cruda para que se vea de dónde salió. «Contar apariciones no es leer.»
//
// ─────────────────────────────────────────────────────────────────────────
// SOLO FUENTES SIN LLAVE, Y ESO ES UNA DECISIÓN
// ─────────────────────────────────────────────────────────────────────────
// Se podrían pedir con llave (Alpha Vantage da crudo y Tesoro gratis con una).
// No se hace en esta primera vuelta por el mismo motivo que llevó a leer el
// COT del archivo oficial: una llave más es un secreto más que mantener en los
// DOS repositorios, y el día que caduque la app se rompe sin que nadie haya
// tocado nada. Si no hay fuente sin llave, la sonda lo dirá y entonces SÍ se
// discute la llave — con el dato delante, no antes.
//
// ⚠️ Y el User-Agent es HONESTO. Si una fuente contesta 403 a un programa,
// eso es una respuesta y se respeta: no se disfraza de navegador. Es la línea
// que este proyecto no cruzó con Myfxbook, Dukascopy ni AvaTrade.
//
// Correr con: Actions → «Sonda del contexto que no vemos» → Run workflow.
// No gasta créditos de Twelve Data salvo el candidato que lo dice, y no
// escribe nada en ninguna rama.

import { decidirConRobots } from './lib/robots.mjs'

const UA = 'NestorForexSwing/1.0 (sonda de contexto; https://github.com/Nestor-forex/Nestor-forex)'

// Rangos plausibles. Si el número cae fuera, NO es lo que creemos que es —
// aunque la respuesta haya sido 200. Es la lección del `GOLD` a 42,85.
const PLAUSIBLE = {
  crudo: { min: 20, max: 200, que: 'un barril de WTI en dólares' },
  tesoro2a: { min: 0, max: 12, que: 'el rendimiento del Tesoro a 2 años en %' },
  bono10a: { min: -1, max: 12, que: 'un rendimiento soberano a 10 años en %' },
}

async function pedir(url, { timeoutMs = 20000 } = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: ctl.signal })
    const cuerpo = await r.text()
    return { ok: r.ok, estado: r.status, tipo: r.headers.get('content-type') || '?', cuerpo }
  } catch (e) {
    return { ok: false, estado: 0, tipo: '-', cuerpo: '', error: String(e?.message || e) }
  } finally {
    clearTimeout(t)
  }
}

// Saca el primer número de una respuesta y dice si es plausible. Devuelve
// `null` cuando no encuentra ninguno: «no lo sé» y «no sirve» no son lo mismo,
// que es la misma decisión que `pearson` devolviendo null en vez de 0.
function numeroPlausible(texto, rango, extraer) {
  const n = extraer(texto)
  if (n === null || n === undefined || !Number.isFinite(n)) return { n: null, veredicto: 'noSePudoLeer' }
  const dentro = n >= rango.min && n <= rango.max
  return { n, veredicto: dentro ? 'plausible' : 'FUERA_DE_RANGO' }
}

// Última columna numérica de la última línea con datos de un CSV.
const ultimoNumCsv = (texto, col) => {
  const lineas = texto.trim().split(/\r?\n/).filter((l) => l.trim())
  for (let i = lineas.length - 1; i >= 1; i--) {
    const c = lineas[i].split(',')
    const v = Number(c[col])
    if (Number.isFinite(v) && v !== 0) return v
  }
  return null
}

const recorte = (s, n = 320) => s.replace(/\s+/g, ' ').trim().slice(0, n)

function cabecera(t) {
  console.log(`\n${'═'.repeat(74)}\n  ${t}\n${'═'.repeat(74)}`)
}

const RESULTADOS = []
function anotar(bloque, nombre, r) {
  RESULTADOS.push({ bloque, nombre, ...r })
}

// ────────────────────────────────────────────────────── permiso, primero

cabecera('0. ¿Nos dejan? (robots.txt de los sitios comerciales)')
console.log(`
  ⚠️ robots.txt NO son las condiciones de uso. Uno permisivo no autoriza nada;
     uno que lo prohíbe sí es un «no» explícito. Sirve para DESCARTAR, nunca
     para aprobar. Lo que aprueba es leerse las condiciones, y eso lo hace una
     persona. Los organismos públicos (Tesoro de EE. UU., BCE, Ministerio de
     Finanzas de Japón) publican para que se lea; el que hay que mirar es el
     sitio comercial.
`)
for (const prueba of ['https://stooq.com/q/l/?s=cl.f&e=csv', 'https://stooq.com/q/d/l/?s=cl.f&i=d']) {
  const { origin } = new URL(prueba)
  const r = await pedir(`${origin}/robots.txt`)
  const d = r.ok ? decidirConRobots(r.cuerpo, prueba) : { veredicto: 'no se sabe', porque: `no se pudo leer robots.txt (${r.estado})` }
  console.log(`  ${prueba}`)
  console.log(`    → ${d.veredicto}  (${d.porque})`)
  anotar('robots', prueba, { estado: r.estado, veredicto: d.veredicto })
}

// ────────────────────────────────────────────────────── 1. el petróleo

cabecera('1. EL PETRÓLEO (la pata que decide el CAD)')
console.log(`
  Lo que haría falta: un precio diario del crudo, con fecha, sin llave.
  ⚠️ Y que sea CRUDO y no una acción que se llama parecido. Ver la cabecera.
`)
{
  const casos = [
    { nombre: 'Stooq · WTI al momento (cl.f, CSV)', url: 'https://stooq.com/q/l/?s=cl.f&f=sd2t2ohlcv&h&e=csv', col: 6, rango: PLAUSIBLE.crudo },
    { nombre: 'Stooq · WTI histórico diario (cl.f)', url: 'https://stooq.com/q/d/l/?s=cl.f&i=d', col: 4, rango: PLAUSIBLE.crudo },
    { nombre: 'Stooq · Brent al momento (cb.f, CSV)', url: 'https://stooq.com/q/l/?s=cb.f&f=sd2t2ohlcv&h&e=csv', col: 6, rango: PLAUSIBLE.crudo },
  ]
  for (const c of casos) {
    const r = await pedir(c.url)
    const v = r.ok ? numeroPlausible(r.cuerpo, c.rango, (t) => ultimoNumCsv(t, c.col)) : { n: null, veredicto: 'noRespondio' }
    console.log(`\n  ${c.nombre}`)
    console.log(`    estado: ${r.estado}  ·  tipo: ${r.tipo}`)
    console.log(`    número leído: ${v.n ?? '—'}  →  ${v.veredicto}  (plausible sería ${c.rango.min}–${c.rango.max}: ${c.rango.que})`)
    console.log(`    crudo: ${recorte(r.cuerpo) || r.error || '(vacío)'}`)
    anotar('petroleo', c.nombre, { estado: r.estado, n: v.n, veredicto: v.veredicto })
  }
  console.log(`
  📌 Y lo que YA está medido, para no volver a gastarlo: en Twelve Data
     \`WTI/USD\` contesta «This symbol is available starting with the Grow or
     Venture plan», y los únicos que responden gratis (\`USO\`, \`BNO\`) son ETF
     —siguen al crudo pero NO son el crudo: tienen comisión, se desvían y
     cierran cuando cierra su bolsa—. Llamarlos «petróleo» sería la etiqueta
     equivocada, que en este proyecto está escrito que es un error de medición.`)
}

// ──────────────────────────────── 2. las expectativas de la Fed (proxy)

cabecera('2. LAS EXPECTATIVAS DE LA FED (proxy: el Tesoro a 2 años)')
console.log(`
  ⚠️⚠️ ESTO NO ES «LA PROBABILIDAD DE SUBIDA». Esa sale de los futuros de
     fondos federales y no se publica gratis en forma de API. El rendimiento
     del Tesoro a 2 años es el termómetro de lo que el mercado espera: si sube,
     el mercado descuenta más Fed; si cae, menos. Es un PROXY y hay que
     rotularlo así. Queda escrito antes de ver el número, a propósito.
`)
{
  const anio = new Date().getUTCFullYear()
  const casos = [
    {
      nombre: 'Tesoro de EE. UU. · curva diaria (CSV oficial, sin llave)',
      url: `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${anio}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${anio}&page&_format=csv`,
      // La cabecera trae «Date,1 Mo,1.5 Month,2 Mo,3 Mo,4 Mo,6 Mo,1 Yr,2 Yr,…»;
      // la columna exacta se busca por NOMBRE, no por posición: es la lección
      // del informe del bróker, donde por posición fija habría funcionado en
      // una máquina y fallado en la de Néstor.
      leer: (t) => {
        const lineas = t.trim().split(/\r?\n/)
        if (lineas.length < 2) return null
        const cab = lineas[0].split(',').map((s) => s.replace(/"/g, '').trim().toLowerCase())
        const i = cab.findIndex((c) => c === '2 yr')
        if (i < 0) return null
        const v = Number(lineas[1].split(',')[i])
        return Number.isFinite(v) ? v : null
      },
      rango: PLAUSIBLE.tesoro2a,
    },
    { nombre: 'Stooq · 2 años EE. UU. (2yusy.b)', url: 'https://stooq.com/q/l/?s=2yusy.b&f=sd2t2ohlc&h&e=csv', leer: (t) => ultimoNumCsv(t, 6), rango: PLAUSIBLE.tesoro2a },
    { nombre: 'FRED SIN llave (para comprobar que la pide)', url: 'https://api.stlouisfed.org/fred/series/observations?series_id=DGS2&file_type=json', leer: () => null, rango: PLAUSIBLE.tesoro2a },
  ]
  for (const c of casos) {
    const r = await pedir(c.url)
    const v = r.ok ? numeroPlausible(r.cuerpo, c.rango, c.leer) : { n: null, veredicto: 'noRespondio' }
    console.log(`\n  ${c.nombre}`)
    console.log(`    estado: ${r.estado}  ·  tipo: ${r.tipo}  ·  tamaño: ${r.cuerpo.length} caracteres`)
    console.log(`    número leído: ${v.n ?? '—'}  →  ${v.veredicto}`)
    console.log(`    crudo: ${recorte(r.cuerpo) || r.error || '(vacío)'}`)
    anotar('fed', c.nombre, { estado: r.estado, n: v.n, veredicto: v.veredicto })
  }
}

// ──────────────────────────────── 3. la prima de riesgo francesa

cabecera('3. LA PRIMA DE RIESGO FRANCESA (OAT − Bund a 10 años)')
console.log(`
  Hacen falta DOS números del MISMO día: el 10 años francés y el alemán. La
  prima es la resta.
  ⚠️ Y de nada sirve mensual. Una prima de riesgo que se mueve en días, leída
     una vez al mes, se enseñaría siempre vieja — y en pantalla una cifra vieja
     se lee como de hoy. Por eso la sonda imprime la FRECUENCIA, no solo si
     responde.
`)
{
  const casos = [
    { nombre: 'Stooq · 10 años Francia (10yfry.b)', url: 'https://stooq.com/q/l/?s=10yfry.b&f=sd2t2ohlc&h&e=csv', leer: (t) => ultimoNumCsv(t, 6) },
    { nombre: 'Stooq · 10 años Alemania (10ydey.b)', url: 'https://stooq.com/q/l/?s=10ydey.b&f=sd2t2ohlc&h&e=csv', leer: (t) => ultimoNumCsv(t, 6) },
    {
      nombre: 'BCE · tipos largos Francia (IRS, mensual)',
      url: 'https://data-api.ecb.europa.eu/service/data/IRS/M.FR.L.L40.CI.0000.EUR.N.Z?lastNObservations=3&format=csvdata',
      leer: (t) => ultimoNumCsv(t, t.trim().split(/\r?\n/)[0].split(',').length - 1),
    },
    {
      nombre: 'BCE · tipos largos Alemania (IRS, mensual)',
      url: 'https://data-api.ecb.europa.eu/service/data/IRS/M.DE.L.L40.CI.0000.EUR.N.Z?lastNObservations=3&format=csvdata',
      leer: (t) => ultimoNumCsv(t, t.trim().split(/\r?\n/)[0].split(',').length - 1),
    },
  ]
  for (const c of casos) {
    const r = await pedir(c.url)
    const v = r.ok ? numeroPlausible(r.cuerpo, PLAUSIBLE.bono10a, c.leer) : { n: null, veredicto: 'noRespondio' }
    console.log(`\n  ${c.nombre}`)
    console.log(`    estado: ${r.estado}  ·  tipo: ${r.tipo}  ·  tamaño: ${r.cuerpo.length} caracteres`)
    console.log(`    número leído: ${v.n ?? '—'}  →  ${v.veredicto}`)
    console.log(`    crudo: ${recorte(r.cuerpo) || r.error || '(vacío)'}`)
    anotar('francia', c.nombre, { estado: r.estado, n: v.n, veredicto: v.veredicto })
  }
}

// ──────────────────────────────── 4. el riesgo de intervención

cabecera('4. EL RIESGO DE INTERVENCIÓN DEL BANCO DE JAPÓN')
console.log(`
  ⚠️⚠️ ESTE ES EL QUE SE ESPERA QUE NO SE PUEDA, y se sondea igual para que
     quede comprobado en vez de supuesto.

  Lo que el analista dice —«entre 159 y 160 sube la probabilidad de que el
  Banco de Japón actúe»— es un JUICIO, no un número publicado. Nadie publica
  una probabilidad de intervención.

  Lo que SÍ existe es el registro de las intervenciones que ya ocurrieron, que
  publica el Ministerio de Finanzas japonés. Con eso se podría enseñar un
  hecho: «el yen está a X pips del nivel donde Japón intervino la última vez»,
  con su fecha y su fuente. Eso es información; «va a intervenir» sería una
  predicción y no se hace.
`)
{
  const casos = [
    { nombre: 'MoF Japón · intervenciones mensuales (HTML)', url: 'https://www.mof.go.jp/english/policy/international_policy/reference/feint/monthly.htm' },
    { nombre: 'MoF Japón · intervenciones (conjetura de CSV)', url: 'https://www.mof.go.jp/english/policy/international_policy/reference/feint/data/fcm.csv' },
  ]
  for (const c of casos) {
    const r = await pedir(c.url)
    console.log(`\n  ${c.nombre}`)
    console.log(`    estado: ${r.estado}  ·  tipo: ${r.tipo}  ·  tamaño: ${r.cuerpo.length} caracteres`)
    console.log(`    crudo: ${recorte(r.cuerpo) || r.error || '(vacío)'}`)
    anotar('japon', c.nombre, { estado: r.estado, n: null, veredicto: r.ok ? 'respondio' : 'noRespondio' })
  }
  console.log(`
  ⚠️ Una conjetura de dirección que dé 404 solo dice que ESA dirección no es,
     NO que la fuente no sirva. Es la misma regla de la sonda del sentimiento:
     sin páginas leídas no hay veredicto.`)
}

// ────────────────────────────────────────────────────────── el veredicto

cabecera('VEREDICTO (calculado, no escrito a mano)')

const liston = {
  petroleo: 'un precio de crudo PLAUSIBLE, sin llave, con fecha',
  fed: 'el 2 años de EE. UU. PLAUSIBLE, sin llave, diario',
  francia: 'los DOS bonos a 10 años, del mismo día y con frecuencia útil',
  japon: '(no se espera que pase: nadie publica una probabilidad de intervención)',
}

let pasan = 0
for (const bloque of ['petroleo', 'fed', 'francia', 'japon']) {
  const filas = RESULTADOS.filter((r) => r.bloque === bloque)
  const buenos = filas.filter((r) => r.veredicto === 'plausible')
  // Francia necesita DOS números del mismo origen; los demás, uno.
  const falta = bloque === 'francia' ? 2 : 1
  const leidas = filas.filter((r) => r.estado >= 200 && r.estado < 400).length

  let v
  if (leidas === 0) v = 'NO SE PUDO MIRAR'
  else if (buenos.length >= falta) v = 'SÍ — hay candidata'
  else v = 'NO — ninguna candidata sirve'
  if (v.startsWith('SÍ')) pasan++

  console.log(`\n  ${bloque.toUpperCase()}  →  ${v}`)
  console.log(`    el listón era: ${liston[bloque]}`)
  console.log(`    respuestas leídas: ${leidas} de ${filas.length}  ·  con número plausible: ${buenos.length}`)
  for (const b of buenos) console.log(`      ✓ ${b.nombre}  →  ${b.n}`)
}

console.log(`
  ⚠️ «NO SE PUDO MIRAR» NO ES «NO EXISTE». Si un bloque sale así, lo que dice
     es que la sonda no leyó nada —red, bloqueo, dirección mal escrita—, y
     entonces no hay veredicto ninguno. Es la asimetría que ya mordió el
     2026-09-14, cuando mi propio informe escribió «no la publican» habiendo
     leído CERO páginas.

  ⚠️ Y PASAR ESTE LISTÓN NO AUTORIZA CONSTRUIR NADA. Dice que existe una
     fuente legible. Lo que entre después es INFORMACIÓN —no apaga ni una
     señal— y cada número tiene que ir rotulado por lo que es: un PROXY del
     juicio del analista, no el juicio. Un filtro («no operar antes de la
     Fed») va al banco de pruebas con su listón escrito antes: van siete
     familias medidas y siete fallando.

  Bloques con candidata: ${pasan} de 4.
`)
