// SONDA DE LOS TRES HUECOS QUE SE PUEDEN CERRAR — escrita el 2026-09-29.
//
// ─────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE
// ─────────────────────────────────────────────────────────────────────────
// El 2026-09-29 se comparó lo que las apps calculan contra lo que publicaban
// ese día las mesas de análisis (MUFG, ING, NAB, Wells Fargo…). Coincidió en
// siete puntos de siete, dos al segundo decimal. Pero de paso salió una lista
// de cosas que los analistas dicen y las apps NO pueden ver, y Néstor pidió
// cerrarlas: «¿por qué no hacemos algo para que ya no estén ciegas?».
//
// De esa lista, dos son texto y no números —el riesgo de intervención de un
// banco central y la geopolítica— y ésas no se pueden cerrar sin meter un
// intérprete que se equivoca en silencio. Las otras TRES son números, y son
// las que esta sonda mira:
//
//   1. LA TENDENCIA DE LAS TASAS, no solo el nivel. Hoy la app enseña
//      «USD 3,875 %» y no dice que venía de 3,625 % el 2026-09-09. Subiendo o
//      bajando no es lo mismo, y es la mitad de lo que dicen los análisis.
//      → ¿Da el BIS la SERIE, o solo el último valor?
//
//   2. EL COT EN PERCENTIL. «+19,2 % en AUD» no dice nada; «la posición más
//      comprada de los últimos dos años» sí. Hace falta el histórico.
//      → ¿Cuántas semanas devuelve la CFTC de una sola vez?
//
//   3. ORO Y PETRÓLEO. Los análisis de CAD hablan del crudo y los de refugio
//      hablan del oro. La app no los ve.
//      → ¿Los da Twelve Data en el plan que tenemos, y con qué símbolo?
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ POR QUÉ UNA SONDA Y NO EL LECTOR DIRECTAMENTE
// ─────────────────────────────────────────────────────────────────────────
// Es la costumbre de esta casa desde el calendario: la red de las sesiones
// donde se programa bloquea los tres hosts —comprobado con `curl` el
// 2026-09-29, `CONNECT tunnel failed, response 403` en los tres—, así que
// desde allí no se puede ver ni si responden.
//
// Las tres preguntas parecen fáciles y NINGUNA lo es:
//
//   · en el BIS, `lastNObservations` puede tener un tope que no está
//     documentado, y la serie es DIARIA con el valor repetido cada día — o sea
//     que «400 observaciones» pueden ser 18 meses o 13, según si incluye fines
//     de semana. Eso decide cuánto historial cabe en una consulta;
//   · en la CFTC, `$limit` alto puede devolver menos filas sin avisar, y ya
//     está documentado en este proyecto que esa API contesta **200 con un
//     error dentro**;
//   · y el oro y el petróleo de Twelve Data pueden ser de PAGO. Un símbolo que
//     no está en el plan no da 403: da 200 con `status: "error"` y un mensaje.
//
// ⚠️ ESTA SONDA NO INTERPRETA NADA. Pide, cuenta y enseña, incluido el cuerpo
// crudo cuando algo sale raro. Con la forma real delante se escribe el lector;
// nunca al revés.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LO ÚNICO QUE CUESTA CRÉDITOS
// ─────────────────────────────────────────────────────────────────────────
// La pregunta 3. Cada símbolo de Twelve Data cuesta 1 crédito de los 800 del
// día, y se prueban hasta 8 nombres distintos de oro y petróleo (no se sabe
// cuál es el bueno). O sea **hasta 8 créditos**, una sola vez, a mano.
//
// Las preguntas 1 y 2 son de organismos públicos: cero créditos, ningún
// secreto. Por eso la sonda sigue adelante con ellas aunque no haya llave.
//
//     node scripts/sonda-huecos.mjs

import { DIVISA_ZONA } from '../src/lib/tasas.js'
import { COLUMNAS, CONJUNTO, CONTRATOS, TIPO_INFORME } from '../src/lib/cot.js'
import { APP } from '../src/lib/identidad.js'
import { leerLlave } from './lib/velas.mjs'

const LIMITE_MS = 45_000
const UA = `NestorForex-${APP}/1.0 (+https://github.com/Nestor-forex)`

// ⚠️ Ni una sola petición se disfraza de navegador. Si un sitio responde 403 a
// un User-Agent honesto, eso ES la respuesta: no está publicando un dato.
async function pedir(url, extra = {}) {
  const t0 = Date.now()
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, ...extra },
      signal: AbortSignal.timeout(LIMITE_MS),
    })
    const cuerpo = await r.text()
    return { ok: r.ok, estado: r.status, cuerpo, ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, estado: null, cuerpo: '', ms: Date.now() - t0, error: String(e?.message || e) }
  }
}

const KB = (s) => `${(s.length / 1024).toFixed(1)} KB`
const raya = (q) => console.log('─'.repeat(78) + (q ? `\n${q}` : ''))

console.log('SONDA DE LOS TRES HUECOS')
console.log(`fecha: ${new Date().toISOString()}`)
console.log('')

// Lo que se aprenda se guarda aquí para el resumen final. ⚠️ Cada respuesta
// tiene TRES estados, no dos: sí, no, y «no se pudo mirar». Confundir los dos
// últimos es el error que ya se cometió con la sonda del sentimiento —imprimir
// «no lo publican» habiendo leído cero páginas— y por eso van separados.
const hallado = { tasas: null, cot: null, activos: null }

// ═════════════════════════════════════════════════════════════════════════
// 1. ¿DA EL BIS LA SERIE DE CADA TASA, O SOLO EL ÚLTIMO VALOR?
// ═════════════════════════════════════════════════════════════════════════
//
// El publicador de hoy pide `lastNObservations=1`. Si ese mismo parámetro
// acepta un número grande, la tendencia sale GRATIS y sin fuente nueva: basta
// mirar cuándo cambió el valor por última vez.
raya('1) LAS TASAS: ¿viene la serie o solo el último valor?')

const ZONAS = Object.values(DIVISA_ZONA).join('+')
const urlBis = (n) =>
  `https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/D.${ZONAS}` +
  `?lastNObservations=${n}&format=csv`

// ⚠️⚠️ SEGUNDA RONDA (2026-09-29, el mismo día). La primera contestó «sí, la
// serie viene» y de paso destapó algo que HABRÍA ROTO LA PANTALLA:
//
//     CA  400 obs · 99 cambios  · últimos: 2026-09-07:2.25 2026-09-12:NaN 2026-09-14:2.25
//     NZ  400 obs · 116 cambios · últimos: 2026-09-07:2.75 2026-09-12:NaN 2026-09-14:2.75
//
// **El BIS publica filas con `OBS_VALUE` VACÍO** (días sin dato), y contar los
// escalones sin quitarlas convierte cada hueco en DOS cambios falsos. De ahí
// los 99 de Canadá y los 116 de Nueva Zelanda, cuando un banco central mueve su
// tasa unas pocas veces en 19 meses (Australia 6, Suiza 3, Japón 3).
//
// Y el daño no sería una cifra rara en un log: la pantalla habría dicho
// «el Banco de Canadá cambió su tasa el 14 de septiembre» cuando ese día solo
// hubo un hueco en la serie. Un dato correcto sobre algo distinto de lo que uno
// cree estar midiendo — la misma familia que el ATR de cierre a cierre.
//
// 📌 `leerTasasCSV` en `src/lib/tasas.js` YA las salta (comprueba que el texto
// no esté vacío antes de mirar el número). O sea que el fallo era de la sonda,
// no del lector — pero solo se vio porque la sonda enseñaba los escalones.
//
// Ahora se cuentan las dos cosas, con y sin huecos, para que la diferencia esté
// a la vista y nadie la vuelva a confundir.
//
// Los tamaños: 400 observaciones cubren entre 13 y 19 meses según la zona (la
// densidad NO es la misma: `US` trae ~30 al mes y `AU` ~21, así que la misma N
// llega más atrás en unas que en otras). Se prueba 1000 para ver hasta dónde
// llega y cuánto pesa, porque el publicador tiene que alcanzar el último cambio
// REAL de las ocho, incluidas las que llevan años quietas.
for (const n of [400, 1000]) {
  const r = await pedir(urlBis(n))
  console.log('')
  console.log(`  lastNObservations=${n} → ${r.estado ?? 'sin respuesta'} en ${r.ms} ms${r.error ? ` (${r.error})` : ''}`)
  if (!r.ok) {
    console.log(`    cuerpo: ${r.cuerpo.slice(0, 300) || '(vacío)'}`)
    continue
  }
  console.log(`    tamaño: ${KB(r.cuerpo)}`)

  const lineas = r.cuerpo.split('\n').filter((l) => l.trim())
  console.log(`    líneas: ${lineas.length} (1 es la cabecera)`)
  console.log(`    cabecera: ${lineas[0]?.slice(0, 220)}`)
  console.log(`    1ª fila:  ${lineas[1]?.slice(0, 220)}`)

  // Cuántas observaciones distintas trae cada zona, y en qué rango de fechas.
  // Se parte con un lector que respeta las comillas, porque dos de las quince
  // columnas del BIS llevan comas DENTRO (ya mordió el 2026-09-09).
  const cols = partirCsv(lineas[0] ?? '')
  const iRef = cols.findIndex((c) => /REF_AREA/i.test(c))
  const iFecha = cols.findIndex((c) => /^TIME_PERIOD$/i.test(c))
  const iValor = cols.findIndex((c) => /^OBS_VALUE$/i.test(c))
  console.log(`    columnas encontradas: REF_AREA=${iRef} TIME_PERIOD=${iFecha} OBS_VALUE=${iValor}`)

  if (iRef < 0 || iFecha < 0 || iValor < 0) {
    console.log('    ⚠️ No se reconocen las columnas. Las 15 de la cabecera, una por línea:')
    cols.forEach((c, i) => console.log(`        [${i}] ${c}`))
    continue
  }

  const porZona = new Map()
  for (const l of lineas.slice(1)) {
    const f = partirCsv(l)
    const z = f[iRef]
    if (!z) continue
    if (!porZona.has(z)) porZona.set(z, [])
    porZona.get(z).push({ f: f[iFecha], v: f[iValor] })
  }

  console.log(`    zonas: ${porZona.size} de ${Object.keys(DIVISA_ZONA).length}`)
  console.log('      zona   obs  huecos   rango                     cambios  últimos escalones REALES')
  const sinCambio = []
  for (const [z, obs] of [...porZona].sort()) {
    obs.sort((a, b) => (a.f < b.f ? -1 : 1))

    // ⚠️ LOS HUECOS SE QUITAN ANTES DE CONTAR NADA. Ver el bloque de arriba:
    // el BIS publica filas con `OBS_VALUE` vacío, y sin quitarlas cada hueco
    // se lee como dos cambios de tasa que nunca ocurrieron.
    const buenas = obs.filter((o) => o.v !== '' && Number.isFinite(Number(o.v)))
    const huecos = obs.length - buenas.length

    // Los ESCALONES: cada vez que el valor cambia de verdad. Es lo que hace
    // falta para decir «subió» o «bajó», y lo que decide si N alcanza.
    const pasos = []
    for (const o of buenas) if (!pasos.length || pasos[pasos.length - 1].v !== o.v) pasos.push(o)
    const ult = pasos.slice(-3).map((p) => `${p.f}:${p.v}`).join('  ')

    // Y los que se contarían SIN quitar los huecos, para que la diferencia
    // quede impresa en vez de explicada.
    const falsos = []
    for (const o of obs) if (!falsos.length || falsos[falsos.length - 1].v !== o.v) falsos.push(o)

    console.log(
      `      ${String(z).padEnd(3)} ${String(buenas.length).padStart(5)} ${String(huecos).padStart(7)}   ` +
        `${buenas[0]?.f} → ${buenas[buenas.length - 1]?.f}  ${String(pasos.length).padStart(7)}` +
        `${falsos.length !== pasos.length ? ` (sin quitar huecos saldrían ${falsos.length})` : ''}  ${ult}`
    )
    if (pasos.length < 2) sinCambio.push(z)
  }

  // ⚠️ La pregunta que decide: ¿alcanzan estas N observaciones para ver al
  // menos UN cambio en TODAS las zonas? Con una zona sin cambios dentro de la
  // ventana no se puede decir de dónde viene, y eso hay que saberlo ANTES de
  // escribir el lector, no después.
  if (porZona.size >= Object.keys(DIVISA_ZONA).length) {
    if (sinCambio.length) {
      console.log(`    ⚠️ Estas zonas NO cambian dentro de la ventana: ${sinCambio.join(', ')}`)
      console.log('       Con N tan corto, de ésas no se puede decir «subió» ni «bajó».')
    } else {
      console.log('    ✓ Las ocho zonas tienen al menos un cambio dentro de la ventana.')
    }
    hallado.tasas = { n, kb: KB(r.cuerpo), zonas: porZona.size, sinCambio }
  }
}

// Un partidor que respeta las comillas. El CSV del BIS lleva comas DENTRO de
// COMPILATION y TITLE, y partir por comas a pelo corre las columnas de sitio:
// no falla, devuelve basura. Ya está resuelto así en `src/lib/tasas.js` y aquí
// se repite a propósito, para que la sonda no dependa de esa función mientras
// justamente se está comprobando si el formato sigue siendo el mismo.
function partirCsv(linea) {
  const out = []
  let actual = ''
  let dentro = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (ch === '"') {
      if (dentro && linea[i + 1] === '"') {
        actual += '"'
        i++
      } else dentro = !dentro
    } else if (ch === ',' && !dentro) {
      out.push(actual.trim())
      actual = ''
    } else actual += ch
  }
  out.push(actual.trim())
  return out
}

// ═════════════════════════════════════════════════════════════════════════
// 2. ¿CUÁNTAS SEMANAS DE COT DEVUELVE LA CFTC DE UNA SOLA VEZ?
// ═════════════════════════════════════════════════════════════════════════
//
// El publicador de hoy pide 10 semanas (80 filas) porque solo necesita el
// último dato de cada divisa. Para un percentil hacen falta años.
console.log('')
raya('2) EL COT: ¿cuántas semanas caben en una consulta?')

const comillas = (s) => `'${String(s).replace(/'/g, "''")}'`
const urlCot = (semanas) =>
  `https://publicreporting.cftc.gov/resource/${CONJUNTO}.json` +
  `?$select=${COLUMNAS.join(',')}` +
  // ⚠️ `futonly_or_combined` FIJADO también aquí. Sin esto la CFTC devuelve una
  // de las dos versiones del informe según le apetezca — un 14 % de diferencia
  // en el mismo día, sin ningún error. Ya mordió el 2026-09-14.
  `&$where=futonly_or_combined=${comillas(TIPO_INFORME)}` +
  ` AND market_and_exchange_names IN(${Object.values(CONTRATOS).map(comillas).join(',')})` +
  `&$order=report_date_as_yyyy_mm_dd DESC` +
  `&$limit=${Object.keys(CONTRATOS).length * semanas}`

for (const semanas of [156, 520]) {
  const r = await pedir(urlCot(semanas), { Accept: 'application/json' })
  console.log('')
  console.log(
    `  ${semanas} semanas (límite ${Object.keys(CONTRATOS).length * semanas} filas) → ` +
      `${r.estado ?? 'sin respuesta'} en ${r.ms} ms${r.error ? ` (${r.error})` : ''}`
  )
  if (!r.ok) {
    console.log(`    cuerpo: ${r.cuerpo.slice(0, 400) || '(vacío)'}`)
    continue
  }
  console.log(`    tamaño: ${KB(r.cuerpo)}`)

  let filas
  try {
    filas = JSON.parse(r.cuerpo)
  } catch (e) {
    // ⚠️ Un 200 no quiere decir que haya datos. Esa trampa ya mordió con
    // Myfxbook, que contestó 200 con `{"error":true}` dentro.
    console.log(`    ⚠️ La respuesta NO es JSON válido: ${String(e?.message).slice(0, 120)}`)
    console.log(`    crudo: ${r.cuerpo.slice(0, 300)}`)
    continue
  }
  if (!Array.isArray(filas)) {
    console.log(`    ⚠️ Respondió 200 pero NO es una lista. Crudo: ${r.cuerpo.slice(0, 300)}`)
    continue
  }

  console.log(`    filas: ${filas.length}`)
  const porContrato = new Map()
  const fechas = new Set()
  for (const f of filas) {
    const c = String(f?.market_and_exchange_names ?? '').trim()
    const d = String(f?.report_date_as_yyyy_mm_dd ?? '').slice(0, 10)
    porContrato.set(c, (porContrato.get(c) ?? 0) + 1)
    if (d) fechas.add(d)
  }
  const orden = [...fechas].sort()
  console.log(`    informes distintos: ${orden.length}  ·  de ${orden[0]} a ${orden[orden.length - 1]}`)
  console.log(`    contratos: ${porContrato.size} de ${Object.keys(CONTRATOS).length}`)
  for (const [c, n] of [...porContrato].sort()) console.log(`      ${String(n).padStart(4)} × ${c}`)

  // ⚠️ La pregunta que decide: si con 156 semanas vienen las 8 divisas con
  // ~156 informes cada una, el percentile sobre tres años sale de UNA consulta
  // gratis. Si viene menos, hay que paginar y eso ya es otra cosa.
  const completos = [...porContrato.values()].filter((n) => n >= semanas * 0.9).length
  console.log(
    `    ${completos} de ${Object.keys(CONTRATOS).length} contratos traen al menos el 90 % de las ${semanas} semanas pedidas.`
  )

  // ⚠️⚠️ Y LA TRAMPA QUE LA PRIMERA RONDA DESTAPÓ CON 520 SEMANAS, que hay que
  // dejar impresa: `$limit` es un tope GLOBAL de filas, no por contrato. Con el
  // orden por fecha descendente, los cinco contratos con historial largo se
  // comen el presupuesto y los tres que la CFTC renombró en febrero de 2022
  // (GBP, NZD y USD) se quedan cortados en 242 informes mientras los otros
  // llegan a 687.
  //
  // Eso NO da ningún error. Daría percentiles de tres divisas medidos sobre 242
  // semanas y de cinco sobre 687, puestos uno al lado del otro en la misma
  // pantalla como si fueran comparables. Es una etiqueta equivocada, y aquí eso
  // es un error de medición.
  const cuentas = [...porContrato.values()]
  const desigual = cuentas.length > 1 && Math.max(...cuentas) - Math.min(...cuentas) > semanas * 0.05
  if (desigual) {
    console.log(
      `    ⚠️ VENTANAS DESIGUALES: del contrato con más (${Math.max(...cuentas)}) al de menos ` +
        `(${Math.min(...cuentas)}) hay ${Math.max(...cuentas) - Math.min(...cuentas)} informes de diferencia.`
    )
    console.log('       Con esta ventana NO se pueden comparar las ocho entre sí.')
  } else {
    console.log('    ✓ Las ocho traen la MISMA cantidad de informes: la ventana es comparable.')
  }

  if (!hallado.cot && completos >= 1) {
    hallado.cot = {
      semanas,
      filas: filas.length,
      informes: orden.length,
      desde: orden[0],
      kb: KB(r.cuerpo),
      completos,
      desigual,
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 3. ¿DA TWELVE DATA EL ORO Y EL PETRÓLEO EN NUESTRO PLAN?
// ═════════════════════════════════════════════════════════════════════════
//
// ⚠️ Esta es la única parte que gasta créditos, y la única que necesita la
// llave. Un símbolo que no está en el plan NO da 403: da 200 con
// `status: "error"` dentro. Por eso se mira el cuerpo y no el código.
console.log('')
raya('3) ORO Y PETRÓLEO: ¿están en el plan, y con qué símbolo?')

// Los nombres son CONJETURAS. Uno que dé error solo dice que ese nombre no es,
// no que la fuente no lo tenga — la misma distinción que en la sonda del
// sentimiento. Se prueban de uno en uno para que el error de uno no tumbe al
// resto (con varios símbolos en una consulta, el fallo de uno oscurece a los
// demás), y con pausas para no chocar con los 8 créditos por minuto.
//
// ⚠️⚠️ SEGUNDA RONDA (2026-09-29): LA PRIMERA CASI COLÓ DOS ACTIVOS FALSOS, y
// esto es lo más importante de toda la sonda.
//
// Tres símbolos respondieron 200 con cinco velas perfectamente válidas:
//
//   XAU/USD  →  4134.51   type: "Precious Metal"   currency_base: "Gold Spot"
//   CL       →    86.52   type: "Common Stock"     exchange: NYSE
//   GOLD     →    42.85   type: "Common Stock"     exchange: NYSE
//
// **Solo el primero es oro.** Los otros dos son ACCIONES que cotizan en la
// bolsa de Nueva York y se llaman así por casualidad. Un lector que aceptara
// «200 con velas» habría publicado «oro: 42,85» — un número plausible, con su
// fecha, su máximo y su mínimo, y completamente falso.
//
// Es la misma familia que el `FutOnly` contra `Combined` del COT y que el ATR
// de cierre a cierre: **un dato correcto de una cosa distinta de la que uno
// cree estar midiendo.** Y no se caza mirando el código de respuesta: se caza
// mirando `type`.
//
// 📌 Y el agravante, que también vale escribirlo: el RESUMEN de mi propia sonda
// imprimió «SÍ — sirven: XAU/USD, CL, GOLD». El detalle traía el `meta` que lo
// desmentía —lo imprimí a propósito— y el resumen lo ignoró. Un resumen que no
// mira lo que el detalle ya sabe es peor que no tener resumen.
//
// Por eso ahora la sonda EXIGE que `type` sea de materia prima o divisa, y a
// cualquier cosa que venga como acción le pide el nombre a `/quote` para dejar
// impreso QUÉ es en realidad, en vez de que alguien tenga que adivinarlo.
//
// Los tres nombres inválidos de la primera ronda (BRENT/USD, USOIL, XAUUSD) se
// quitan: ya está comprobado que no existen. Entran en su lugar candidatos de
// petróleo que podrían estar en el plan gratuito, incluidos dos ETF — y si
// alguno sirve, **hay que decir que es un ETF y no el crudo**, porque llamarlo
// «petróleo» sería justo la etiqueta equivocada de la que trata este bloque.
const CANDIDATOS = ['XAU/USD', 'WTI/USD', 'USO', 'BNO', 'BZ', 'WTI']

// ⚠️ Los tipos que SÍ son lo que buscamos. Cualquier otro se rechaza aunque
// responda 200 con velas. Ante la duda, se rechaza: equivocarse hacia «no
// sirve» cuesta probar otro nombre; hacia «sirve», publicar el precio de una
// acción llamándolo oro.
const TIPOS_BUENOS = [/precious metal/i, /commodity/i, /physical currency/i, /digital currency/i]

// Un ETF no es la materia prima, pero tampoco es un error: es un fondo que la
// sigue. Se acepta APARTE y con etiqueta propia, nunca mezclado con el spot.
const TIPOS_ETF = [/\betf\b/i, /fund/i]

let llave = null
try {
  llave = leerLlave(import.meta.url)
} catch (e) {
  console.log('')
  console.log(`  ⚠️ NO HAY LLAVE DE TWELVE DATA: ${String(e?.message).slice(0, 200)}`)
  console.log('     Esta pregunta queda SIN MIRAR. Las dos de arriba no la necesitaban.')
  console.log('     En Actions: falta `env: TWELVEDATA_KEY: ${{ secrets.TWELVEDATA_KEY }}`.')
}

if (llave) {
  const vistos = []
  for (let i = 0; i < CANDIDATOS.length; i++) {
    const sym = CANDIDATOS[i]
    // 8 créditos por minuto en el plan gratuito. Se va de 7 en 7 con pausa,
    // igual que `velas.mjs`, para no comerse un 429 a media sonda.
    if (i > 0 && i % 7 === 0) {
      console.log('    (pausa de 65 s para no pasarse de los 8 créditos por minuto)')
      await new Promise((res) => setTimeout(res, 65_000))
    }
    const url =
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}` +
      `&interval=1day&outputsize=5&timezone=UTC&apikey=${llave}`
    const r = await pedir(url)
    console.log('')
    console.log(`  ${sym} → HTTP ${r.estado ?? 'sin respuesta'} en ${r.ms} ms`)

    let j = null
    try {
      j = JSON.parse(r.cuerpo)
    } catch {
      console.log(`    ⚠️ no es JSON: ${r.cuerpo.slice(0, 200)}`)
      continue
    }
    if (j?.status === 'error' || !Array.isArray(j?.values)) {
      // ⚠️ El mensaje de Twelve Data distingue «no existe ese símbolo» de «no
      // está en tu plan», y son cosas distintas: la primera se arregla con
      // otro nombre, la segunda no se arregla sin pagar. Va entero al log.
      console.log(`    ✗ sin datos. code=${j?.code ?? '—'}  status=${j?.status ?? '—'}`)
      console.log(`      mensaje: ${String(j?.message ?? '(ninguno)').slice(0, 300)}`)
      continue
    }

    const v = j.values[0] ?? {}
    const tipo = String(j.meta?.type ?? '')
    console.log(`    respondió con ${j.values.length} velas`)
    console.log(`      campos: ${Object.keys(v).join(', ')}`)
    console.log(`      1ª vela cruda: ${JSON.stringify(v)}`)
    console.log(`      meta: ${JSON.stringify(j.meta ?? {}).slice(0, 300)}`)

    // ⚠️⚠️ AQUÍ SE DECIDE, Y NO POR EL CÓDIGO DE RESPUESTA. Ver el bloque de
    // arriba: `CL` y `GOLD` dan 200 con velas válidas de una ACCIÓN de la bolsa
    // de Nueva York. Lo único que los distingue del oro de verdad es `type`.
    const esBueno = TIPOS_BUENOS.some((re) => re.test(tipo))
    const esEtf = TIPOS_ETF.some((re) => re.test(tipo))

    if (esBueno) {
      console.log(`    ✓ SIRVE — type «${tipo}», que es materia prima o divisa`)
      vistos.push({ sym, tipo, clase: 'spot', precio: v.close })
      continue
    }

    if (esEtf) {
      // Un ETF sigue a la materia prima pero NO es la materia prima: tiene
      // comisión, se desvía y cierra cuando cierra su bolsa. Entra con etiqueta
      // propia para que nadie lo enseñe como «el precio del petróleo».
      console.log(`    ~ ES UN ETF — type «${tipo}». Sigue al activo, NO es el activo.`)
      vistos.push({ sym, tipo, clase: 'etf', precio: v.close })
      continue
    }

    // Y si no es ninguna de las dos cosas, se le pregunta QUÉ es, en vez de
    // dejar que alguien lo adivine mirando un precio suelto. Cuesta un crédito
    // más y ahorra el error que este bloque existe para evitar.
    console.log(`    ✗ NO SIRVE — type «${tipo || '(sin tipo)'}» no es materia prima ni divisa.`)
    const q = await pedir(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(sym)}&apikey=${llave}`
    )
    try {
      const jq = JSON.parse(q.cuerpo)
      console.log(
        `      qué es en realidad: «${jq?.name ?? '(sin nombre)'}» · ${jq?.exchange ?? '?'} · ` +
          `${jq?.type ?? '?'} · último ${jq?.close ?? '?'}`
      )
    } catch {
      console.log(`      (no se pudo averiguar el nombre: ${q.cuerpo.slice(0, 120)})`)
    }
  }
  hallado.activos = vistos
}

// ═════════════════════════════════════════════════════════════════════════
// EL RESUMEN
// ═════════════════════════════════════════════════════════════════════════
//
// ⚠️ `null` significa «NO SE PUDO MIRAR», no «no existe». Las dos cosas se
// escriben parecido y significan lo contrario, y en este proyecto ya se
// publicó una vez un veredicto de «no lo publican» habiendo leído cero
// páginas. Así que el resumen lo dice con esas palabras.
//
// ⚠️⚠️ Y EL RESUMEN NO PUEDE AFIRMAR MÁS QUE EL DETALLE. En la primera ronda
// esta misma línea imprimió «SÍ — sirven: XAU/USD, CL, GOLD» mientras el
// detalle, tres pantallas arriba, traía el `meta` que decía que dos de los tres
// eran acciones de la bolsa de Nueva York. Un resumen que ignora lo que el
// detalle ya sabe es peor que no tener resumen: se lee como la conclusión.
console.log('')
raya('RESUMEN — lo que esta sonda dejó comprobado')
console.log('')

const di = (q, v, siNo) => console.log(`  ${q.padEnd(38)} ${v === null ? 'NO SE PUDO MIRAR' : siNo(v)}`)

di('1. La serie de las tasas (BIS)', hallado.tasas, (h) =>
  `SÍ — ${h.n} observaciones, ${h.kb}, ${h.zonas} zonas` +
  (h.sinCambio.length ? `, SIN cambio en ${h.sinCambio.join('/')}` : ', con cambio en las ocho')
)
di('2. El histórico del COT (CFTC)', hallado.cot, (h) =>
  `SÍ — ${h.informes} informes desde ${h.desde}, ${h.filas} filas, ${h.kb}` +
  (h.desigual ? ' ⚠️ VENTANAS DESIGUALES entre divisas' : ' · ventana comparable')
)
di('3. Oro y petróleo (Twelve Data)', hallado.activos, (v) => {
  const spot = v.filter((x) => x.clase === 'spot')
  const etf = v.filter((x) => x.clase === 'etf')
  if (!spot.length && !etf.length) return `NINGUNO de los ${CANDIDATOS.length} nombres probados es el activo`
  const trozos = []
  if (spot.length) trozos.push(`spot: ${spot.map((x) => `${x.sym} (${x.precio})`).join(', ')}`)
  if (etf.length) trozos.push(`solo como ETF: ${etf.map((x) => x.sym).join(', ')}`)
  return trozos.join(' · ')
})

console.log('')
console.log('  Con esto delante se escribe cada lector. Nunca al revés.')
console.log('')
console.log('  ⚠️ Un «SÍ» aquí dice que el DATO se puede conseguir, no que la app deba')
console.log('     enseñarlo ni mucho menos filtrar señales con él. Todo esto sería')
console.log('     INFORMACIÓN: no apaga ni una señal. Un filtro va al banco de pruebas con')
console.log('     su listón escrito antes — siete familias medidas, siete fallando.')
