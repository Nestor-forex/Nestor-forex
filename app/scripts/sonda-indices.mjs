// SONDA: ¿se puede tener el índice del dólar y un par de índices de bolsa?
//
//     node scripts/sonda-indices.mjs
//
// Lo pidió Néstor el 2026-10-30: «calculas la fuerza del dólar y no enseñas el
// índice del dólar». Va por el mismo camino que el calendario, las tasas, el
// COT, el sentimiento y el oro: **SONDA PRIMERO, LECTOR DESPUÉS.** Pide,
// cuenta y enseña. No interpreta, no publica nada y no toca un archivo de la
// app.
//
// ⚠️⚠️ CONTESTA DOS PREGUNTAS, Y LA SEGUNDA ES LA QUE DECIDE
//
//   (1) ¿EXISTE el dato en el plan gratuito, y es de verdad lo que dice ser?
//   (2) ¿APORTA algo sobre lo que la app YA enseña?
//
// La (2) está escrita en `lib/indices.mjs` ANTES de ver un número, y la
// hipótesis va EN CONTRA de construir la tarjeta: el DXY es una media
// ponderada de seis pares y cinco ya están en esta app (EUR 57,6 % · JPY
// 13,6 % · GBP 11,9 % · CAD 9,1 % · CHF 3,6 %), así que lo más probable es que
// sea la fuerza del dólar de la app con otro nombre. Si la correlación sale por
// encima de 0,9, la respuesta honesta a Néstor es «ya lo estás viendo».
//
// ⚠️ LA TRAMPA DEL ORO: `GOLD`, `CL`, `WTI` y `BZ` contestaron 200 con cinco
// velas válidas y eran ACCIONES de Nueva York. No se caza por el código de
// respuesta: se caza mirando `type`. Aquí se mira.
//
// ⚠️ NO SE ADIVINAN SÍMBOLOS A PELO. Primero se le PREGUNTA a la fuente cómo
// se llaman (`symbol_search`), que es la lección de la sonda del sentimiento:
// tres direcciones inventadas dieron 404 y no enseñaron nada.
//
// CUESTA CRÉDITOS: una consulta por símbolo candidato más los 14 pares para
// poder contestar la (2). Unos 25 de los 800, una sola vez y a mano.

import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { computarBarrido } from '../src/lib/marketCalc.js'
import { cambiosDiarios, pearson } from '../src/lib/correlacion.js'
import {
  esIndiceDeVerdad,
  precioPlausible,
  anosDeHistoria,
  fechasComunes,
  veredicto,
  aportaAlgo,
} from './lib/indices.mjs'

const LLAVE = leerLlave()
const BASE = 'https://api.twelvedata.com'
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// ⚠️⚠️ EL FRENO, Y EXISTE POR UN FALLO MÍO DE LA PRIMERA CORRIDA
//
// La primera versión daba `symbol_search` por GRATIS y no la contaba. **Sí
// consume crédito**: el propio 429 lo dijo («9 API credits were used» cuando mi
// contador iba por 1). Resultado: cinco de los seis candidatos salieron 429 y
// la sonda no pudo mirar nada.
//
// Y la otra mitad del fallo fue mía también: lancé este workflow 17 segundos
// después del de la compresión, que acababa de gastar 14 créditos. Es el mismo
// choque documentado el 2026-10-07, provocado otra vez.
//
// Así que ahora: TODO cuenta, se respeta una ventana deslizante de verdad, y
// si llega un 429 **se le cree a la API y no a mi contador** — el cuerpo dice
// cuántos créditos se usaron, y con eso se resincroniza y se reintenta.
const LIMITE_POR_MINUTO = 6 // el techo son 8; se deja margen a propósito
const marcas = []
let gastados = 0

async function esperarHueco() {
  for (;;) {
    const ahora = Date.now()
    while (marcas.length && ahora - marcas[0] > 65_000) marcas.shift()
    if (marcas.length < LIMITE_POR_MINUTO) return
    const faltan = 65_000 - (ahora - marcas[0]) + 500
    console.log(`    (pausa de ${Math.ceil(faltan / 1000)} s: el plan gratuito da 8 consultas por minuto)`)
    await esperar(faltan)
  }
}

async function pedir(ruta, params, reintento = false) {
  const u = new URL(`${BASE}/${ruta}`)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  u.searchParams.set('apikey', LLAVE)
  await esperarHueco()
  marcas.push(Date.now())
  gastados++
  try {
    const r = await fetch(u)
    const j = await r.json().catch(() => null)
    // ⚠️ Un 429 NO es una respuesta sobre el símbolo: es que no se pudo mirar.
    // Se espera el minuto entero y se reintenta UNA vez. Sin esto, un choque
    // con otro workflow convierte la sonda en un informe de «no existe».
    if ((r.status === 429 || j?.code === 429) && !reintento) {
      console.log('    (429: no se pudo mirar. Se espera el minuto entero y se reintenta una vez)')
      marcas.length = 0
      await esperar(66_000)
      return pedir(ruta, params, true)
    }
    return { http: r.status, cuerpo: j }
  } catch (e) {
    // ⚠️ Un fallo de red NO es «no existe». Se devuelve marcado.
    return { http: 0, cuerpo: null, error: String(e.message || e) }
  }
}

// La llave NUNCA se imprime. Los dos repositorios son públicos y el log de
// Actions se lee sin credencial.
const sinLlave = (s) => String(s).replaceAll(LLAVE, '«llave»')

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║  SONDA: ¿ÍNDICE DEL DÓLAR Y UN PAR DE ÍNDICES?                    ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')
console.log('⚠️  SONDA. No publica nada, no toca la app, no cambia una señal.')
console.log('')
console.log('HIPÓTESIS escrita ANTES de medir, y va EN CONTRA de la tarjeta:')
console.log('    el DXY es una media ponderada de seis pares y cinco ya están')
console.log('    en esta app, así que probablemente sea la fuerza del dólar que')
console.log('    la app ya enseña, con otro nombre. Se mide, no se argumenta.')
console.log('')

// ── 1. PREGUNTARLE a la fuente cómo se llaman las cosas ───────────────────

// ⚠️ PAUSA INICIAL, y no es prudencia de más: la primera corrida arrancó 17
// segundos después del workflow de la compresión, que acababa de gastar 14
// créditos en el mismo minuto, y cinco de los seis candidatos salieron 429.
// Esperar un minuto antes de la primera consulta cuesta un minuto; no esperarlo
// costó la corrida entera. Se puede saltar con SIN_PAUSA=1 para probar en local.
if (!process.env.SIN_PAUSA) {
  console.log('(pausa inicial de 65 s, por si otro workflow acaba de gastar créditos)')
  console.log('')
  await esperar(65_000)
}

console.log('1. ¿CÓMO SE LLAMAN? (`symbol_search`, sin adivinar)')
console.log('')
// ⚠️ La primera corrida (2026-10-30) ya contestó esto, y el resultado importa:
// de las cuatro búsquedas NO salió ni UN instrumento de tipo `Index`. «dollar
// index» devolvió solo `UUP` y `UDN`, los dos ETF de Invesco; «S&P 500», ocho
// ETF; «volatility index», ETF y fondos que no son el VIX; «DAX», ETF. O sea
// el mismo patrón que con el petróleo: lo único gratis son los ETF que SIGUEN
// al índice, que no son el índice. Se repite la búsqueda para dejarlo
// comprobado y no de memoria.
let tiposVistos = new Set()
for (const texto of ['dollar index', 'S&P 500', 'volatility index', 'DAX']) {
  const { http, cuerpo, error } = await pedir('symbol_search', { symbol: texto, outputsize: 12 })
  console.log(`  «${texto}» → HTTP ${http}${error ? ` (${sinLlave(error)})` : ''}`)
  const datos = cuerpo?.data
  if (!Array.isArray(datos) || !datos.length) {
    console.log('    (sin resultados; eso NO dice que no exista: dice que esta búsqueda no lo encontró)')
    continue
  }
  for (const d of datos.slice(0, 8)) {
    tiposVistos.add(String(d.instrument_type ?? '—'))
    console.log(
      `    ${String(d.symbol ?? '—').padEnd(12)} ${String(d.instrument_type ?? '—').padEnd(16)} ` +
        `${String(d.exchange ?? '—').padEnd(10)} ${String(d.instrument_name ?? '—').slice(0, 40)}`,
    )
  }
}
console.log('')
console.log(`  Tipos que devolvió la búsqueda: ${[...tiposVistos].join(', ') || '—'}`)
if (tiposVistos.size && ![...tiposVistos].some((t) => /index/i.test(t))) {
  console.log('  ⚠️ NI UNO es de tipo `Index`: solo ETF y fondos que SIGUEN al índice.')
  console.log('     Un ETF no es el índice —tiene comisión, se desvía y cierra cuando')
  console.log('     cierra su bolsa—, así que llamarlo «el índice del dólar» sería')
  console.log('     justo la etiqueta equivocada. Es lo mismo que pasó con el petróleo.')
}
console.log('')

// ── 2. Los candidatos, uno por uno, mirando `type` ────────────────────────
//
// ⚠️ La lista mezcla a propósito los nombres que se usan por ahí (`DXY`, `DX`,
// `USDX`) con los de bolsa. Que uno dé 404 solo dice que esa grafía no es,
// no que el dato no exista.

const CANDIDATOS = [
  ['DXY', 'dolar', 'el índice del dólar, la grafía más usada'],
  ['DX', 'dolar', 'la grafía del futuro'],
  ['USDX', 'dolar', 'otra grafía que se ve por ahí'],
  ['SPX', 'sp500', 'S&P 500'],
  ['IXIC', 'nasdaq', 'Nasdaq Composite'],
  ['VIX', 'vix', 'el índice del miedo'],
]

console.log('2. LOS CANDIDATOS, uno por uno (⚠️ mirando `type`, no el HTTP)')
console.log('')

const fichas = []
for (const [simbolo, clave, queEs] of CANDIDATOS) {
  const { http, cuerpo, error } = await pedir('quote', { symbol: simbolo })
  const ficha = { simbolo, clave, queEs, http, respondio: false, esIndice: false, velas: 0 }

  if (error) {
    console.log(`  ${simbolo.padEnd(6)} ⚠️ no se pudo mirar: ${sinLlave(error)}`)
    fichas.push(ficha)
    continue
  }
  // Twelve Data devuelve 200 con `{status:'error'}` dentro. Un 200 NO quiere
  // decir que haya datos — es la trampa que ya mordió con `TFF_All`.
  const esError = cuerpo?.status === 'error' || cuerpo?.code >= 400
  if (http !== 200 || esError) {
    console.log(
      `  ${simbolo.padEnd(6)} HTTP ${http} · ${sinLlave(cuerpo?.message ?? 'sin cuerpo').slice(0, 90)}`,
    )
    fichas.push(ficha)
    continue
  }

  ficha.respondio = true
  const juicio = esIndiceDeVerdad(cuerpo)
  ficha.esIndice = juicio.ok
  const precio = Number(cuerpo.close ?? cuerpo.previous_close)
  ficha.precio = precio
  ficha.precioOk = precioPlausible(precio, clave)

  console.log(`  ${simbolo.padEnd(6)} HTTP 200 · ${queEs}`)
  console.log(
    `         nombre: ${String(cuerpo.name ?? '—').slice(0, 50)}  ·  type: ${String(cuerpo.type ?? '—')}` +
      `  ·  bolsa: ${String(cuerpo.exchange ?? '—')}`,
  )
  console.log(
    `         precio: ${Number.isFinite(precio) ? precio : '—'}  ·  ` +
      `¿índice de verdad? ${juicio.ok ? '✅' : `❌ ${juicio.porque}`}  ·  ` +
      `¿precio plausible? ${ficha.precioOk === null ? '— (sin rango)' : ficha.precioOk ? '✅' : '❌'}`,
  )

  // Solo se le piden velas a lo que ya pasó el filtro de tipo. Pedirlas a una
  // acción sería gastar un crédito en confirmar lo que ya se sabe.
  if (juicio.ok) {
    const serie = await pedir('time_series', { symbol: simbolo, interval: '1day', outputsize: 5000 })
    const vals = serie.cuerpo?.values
    if (Array.isArray(vals) && vals.length) {
      ficha.velas = vals.length
      ficha.fechas = vals.map((v) => v.datetime)
      ficha.cierres = vals.map((v) => Number(v.close))
      const anos = anosDeHistoria(ficha.fechas)
      console.log(
        `         velas diarias: ${vals.length}  ·  historia: ${anos === null ? '—' : `${anos.toFixed(1)} años`}  ·  ` +
          `de ${ficha.fechas.at(-1)} a ${ficha.fechas[0]}`,
      )
    } else {
      console.log(
        `         ⚠️ sin velas: ${sinLlave(serie.cuerpo?.message ?? `HTTP ${serie.http}`).slice(0, 90)}`,
      )
    }
  }
  fichas.push(ficha)
  console.log('')
}

// ── 3. EL VEREDICTO de existencia, que lo calcula `veredicto()` ───────────

const v = veredicto(fichas)
console.log('3. ¿EXISTE Y ES LO QUE DICE SER?')
console.log('')
console.log(`  ${v.estado === 'hayCandidatos' ? '✅' : '⚠️'} ${v.texto}`)
console.log('')

// ── 4. ⚠️⚠️ LA PREGUNTA QUE DECIDE: ¿aporta algo? ────────────────────────

const dolar = fichas.find((f) => f.clave === 'dolar' && f.esIndice && f.velas > 0)
if (!dolar) {
  console.log('4. ¿APORTA ALGO SOBRE LA APP?')
  console.log('')
  console.log('  ⚠️ NO SE PUDO MIRAR: ningún índice del dólar llegó a traer velas.')
  console.log('     Eso NO contesta la pregunta — la deja abierta.')
  console.log('')
} else {
  console.log('4. ⚠️⚠️ ¿APORTA ALGO SOBRE LO QUE LA APP YA ENSEÑA?')
  console.log('')
  console.log(`  Se usa ${dolar.simbolo}. Hacen falta los 14 pares para reconstruir la`)
  console.log('  fuerza del dólar que la app calcula. Son 14 créditos más.')
  console.log('')

  const { fechas, rates, rangosPar } = await obtenerVelas(LLAVE, { velas: 1500 })
  gastados += 14
  console.log(`  Días de mercado: ${fechas.length} · de ${fechas[0]} a ${fechas.at(-1)}`)

  // ⚠️ La fuerza del dólar NO se reimplementa aquí: se le pide a
  // `computarBarrido`, que es la que la app usa. Dos definiciones del mismo
  // número con el mismo nombre es el fallo que este repositorio lleva meses
  // cerrando (el umbral de fuerza estaba en nueve sitios).
  //
  // Se usa la ventana de producción y se avanza día a día, igual que la app
  // haría cada mañana.
  const VENTANA = 214
  const DIAS = Math.min(400, fechas.length - VENTANA)
  const serieFuerza = []
  const fechasFuerza = []
  for (let i = fechas.length - DIAS; i < fechas.length; i++) {
    const trozo = fechas.slice(i - VENTANA + 1, i + 1)
    const b = computarBarrido(trozo, rates, rangosPar)
    serieFuerza.push(b.raw.USD)
    fechasFuerza.push(fechas[i])
  }
  console.log(`  Fuerza del dólar reconstruida en ${serieFuerza.length} días.`)
  console.log('')

  // ⚠️ LAS FECHAS SE INTERSECAN, SIEMPRE. El índice viene de una consulta y los
  // pares de otra; comparar por posición bastaría un día de diferencia para
  // comparar días distintos, y no daría ningún error.
  const cruce = fechasComunes(fechasFuerza, dolar.fechas)
  console.log(
    `  Fechas comunes: ${cruce.n} de ${Math.min(fechasFuerza.length, dolar.fechas.length)} ` +
      `(${cruce.fraccion === null ? '—' : `${(cruce.fraccion * 100).toFixed(0)} %`})`,
  )

  const porFechaIndice = new Map(dolar.fechas.map((d, k) => [String(d).slice(0, 10), dolar.cierres[k]]))
  const porFechaFuerza = new Map(fechasFuerza.map((d, k) => [d, serieFuerza[k]]))
  const a = cruce.comunes.map((d) => porFechaIndice.get(d))
  const b = cruce.comunes.map((d) => porFechaFuerza.get(d))

  // ⚠️ SOBRE LOS CAMBIOS DIARIOS, nunca sobre el nivel. Correlacionar niveles a
  // pelo da números altísimos y falsos: dos series que suben durante el año «se
  // parecen» aunque su día a día no tenga nada que ver. Está medido en este
  // repositorio que el método malo da +0,99 donde el bueno da −1,00.
  const r = pearson(cambiosDiarios(a), cambiosDiarios(b))
  const rNivel = pearson(a, b)

  console.log(
    `  Correlación sobre CAMBIOS DIARIOS: ${r === null ? '—' : r.toFixed(3)}  (n=${cruce.n})`,
  )
  console.log(
    `  (sobre el nivel, que es el método MALO y va solo de contraste: ` +
      `${rNivel === null ? '—' : rNivel.toFixed(3)})`,
  )
  console.log('')

  const ap = aportaAlgo(r)
  console.log(
    `  ${ap.aporta === null ? '⚠️' : ap.aporta ? '✅' : '❌'} ${ap.texto}`,
  )
  console.log('')
  if (ap.aporta === false) {
    console.log('  📌 LA RESPUESTA HONESTA A NÉSTOR sería entonces: el índice del dólar')
    console.log('     ya lo está viendo, con otro rótulo. Enseñarlo aparte no añadiría')
    console.log('     información — sería la primera tarjeta decorativa de la app, que')
    console.log('     es exactamente lo que se evitó con el oro.')
    console.log('')
    console.log('     Lo que SÍ podría añadir algo es un índice de BOLSA (S&P 500, VIX):')
    console.log('     no se construye con divisas, así que no cae en esta trampa.')
  }
}

// ── 5. Lo que esta sonda NO puede contestar, dicho por ella ───────────────

console.log('')
console.log('5. ⚠️ LO QUE ESTA SONDA NO CONTESTA')
console.log('')
console.log('  · Si un índice de bolsa AYUDA a decidir. Eso sería un FILTRO y va al')
console.log('    banco de pruebas con su listón escrito antes. Van DIEZ familias de')
console.log('    filtros medidas y diez que no aportan nada.')
console.log('  · Qué pintaría la tarjeta. El precedente del oro es claro: un precio')
console.log('    suelto no dice nada de ningún par, así que la tarjeta tiene que MEDIR')
console.log('    (la correlación con cada par) o es un adorno.')
console.log('  · Cuánto costaría al día. Un índice son 1 ó 2 créditos por corrida;')
console.log('    la correlación con los 14 pares son 14 más, como en el oro.')
console.log('')
console.log(`Consultas de Twelve Data gastadas: ${gastados}.`)
console.log('')
if (v.estado === 'noSePudoMirar') process.exit(1)
