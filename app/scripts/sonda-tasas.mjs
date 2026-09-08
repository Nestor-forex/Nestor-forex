// SONDA: ¿de dónde se sacan las tasas de interés de los bancos centrales?
//
//     node scripts/sonda-tasas.mjs
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ UNA SONDA Y NO EL LECTOR DIRECTAMENTE
// ─────────────────────────────────────────────────────────────────────────
// Igual que con el calendario el 2026-09-08: la política de red de las
// sesiones donde se programa esta app **bloquea** los tres candidatos.
// Comprobado hoy, no supuesto — `stats.bis.org`, `data-api.ecb.europa.eu` y
// `api.frankfurter.app` dan `connect_rejected` del proxy. Desde ahí no se ve
// ni si responden ni qué forma tienen los datos.
//
// Escribir el lector a ciegas y descubrir la verdad cuando ya esté en la app
// es exactamente al revés de como trabaja este proyecto. Esta sonda **no
// interpreta nada**: pide, cuenta y enseña un ejemplo crudo. Con eso delante
// se escribe el lector de verdad.
//
// ⚠️ NO GASTA CRÉDITOS DE TWELVE DATA. No toca esa API.
//
// ⚠️ Y NO ELIGE POR SÍ SOLA. Imprime lo que encuentra; la decisión se toma
// leyendo esto. Una sonda que decide sola acabaría eligiendo la que respondió
// más rápido ese día.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO MÁS IMPORTANTE DE ESTE ARCHIVO NO ES TÉCNICO
// ─────────────────────────────────────────────────────────────────────────
// **La diferencia de tasas NO ES EL SWAP.** Es de dónde SALE el swap, que no
// es lo mismo:
//
//   · el banco central pone la tasa de referencia;
//   · el bróker le añade su margen, y ese margen no lo publica nadie;
//   · y el margen es ASIMÉTRICO: en una dirección pagas y en la otra a veces
//     cobras, pero casi nunca cobras tanto como pagarías al revés.
//
// O sea que esto da **el signo y el orden de magnitud**, no el número. El
// banco de pruebas seguirá barriendo varios niveles de swap; lo que cambia es
// que dejará de barrerlos a ciegas — sabremos cuáles son plausibles y cuáles
// no, y en qué pares el swap juega a favor.
//
// Prometer «ya sabemos el swap» sería justo la clase de exageración que este
// proyecto lleva meses quitando de en medio.

// Las ocho divisas del barrido y su código de país en el BIS.
//
// `XM` es el área del euro: el BIS no tiene «EUR» como país porque la tasa la
// pone el BCE para los veinte, no un país suelto.
const DIVISAS = {
  USD: 'US',
  EUR: 'XM',
  GBP: 'GB',
  JPY: 'JP',
  CHF: 'CH',
  CAD: 'CA',
  AUD: 'AU',
  NZD: 'NZ',
}

const PAISES = Object.values(DIVISAS).join('+')

// Las candidatas, en el orden en que se prefieren si todas funcionaran.
//
// El orden NO es casual:
//
//   1. **BIS** publica «Central bank policy rates» (dataflow WS_CBPOL) para
//      unos cuarenta bancos centrales, en una sola serie y con la misma
//      definición para todos. Es la fuente que republican los demás (FRED
//      incluido), así que ir al BIS es ir al original. Sin llave.
//   2. **BCE** solo sirve para el euro, pero es el emisor mismo. Vale como
//      contraste: si el BIS dice una cosa y el BCE otra, algo se entendió mal.
//   3. **FRED** lo tiene todo y es fiable, pero **pide llave**. Se sondea sin
//      llave a propósito, para dejar comprobado que la pide en vez de
//      suponerlo — y así decidir con el dato delante si vale la pena otro
//      secreto más que mantener.
//
// De cada candidata se prueban varias FORMAS de la dirección, porque la API
// del BIS cambió de la v1 a la v2 y desde aquí no se puede comprobar cuál
// está viva. Que respondan varias no es un problema: se elige leyendo.
const FUENTES = [
  {
    id: 'bis-v2-json-una',
    nota: 'BIS v2, JSON, SOLO Estados Unidos. La prueba más pequeña que enseña la forma.',
    url:
      'https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/D.US' +
      '?lastNObservations=1&format=jsondata',
  },
  {
    id: 'bis-v2-csv-todas',
    nota: `BIS v2, CSV, las ocho de un golpe (${PAISES}). Si funciona, ESTA es la buena: una sola petición.`,
    url:
      `https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/D.${PAISES}` +
      '?lastNObservations=1&format=csv',
  },
  {
    id: 'bis-v2-json-todas',
    nota: 'Lo mismo en JSON, por si el CSV viene con separadores raros.',
    url:
      `https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBPOL/1.0/D.${PAISES}` +
      '?lastNObservations=1&format=jsondata',
  },
  {
    id: 'bis-v1-csv',
    nota: 'BIS v1 (la dirección antigua). Solo por si la v2 no existe todavía o ya no.',
    url: `https://stats.bis.org/api/v1/data/WS_CBPOL/D.${PAISES}/all?lastNObservations=1&format=csv`,
  },
  {
    id: 'bce-euro',
    nota: 'BCE, tipo de las operaciones principales de financiación. Solo el euro, pero del emisor.',
    url:
      'https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.MRR_FR.LEV' +
      '?lastNObservations=1&format=jsondata',
  },
  {
    id: 'fred-sin-llave',
    nota: '⚠️ Se espera que RECHACE por falta de llave. Se sondea para comprobarlo, no para usarlo.',
    url: 'https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&file_type=json',
  },
]

const recorta = (v, n = 220) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > n ? s.slice(0, n) + '…' : s
}

async function sondear(f) {
  console.log('')
  console.log('─'.repeat(72))
  console.log(`FUENTE: ${f.id}`)
  console.log(`  ${f.nota}`)
  console.log(`  ${f.url}`)

  const t0 = Date.now()
  let res
  try {
    res = await fetch(f.url, {
      // Sin User-Agent algunos servidores devuelven 403 aunque el dato sea
      // público. Se pone uno honesto: no se disfraza de navegador.
      headers: { 'User-Agent': 'NestorForex/1.0 (+https://github.com/Nestor-forex)' },
      signal: AbortSignal.timeout(30000),
    })
  } catch (e) {
    console.log(`  ✗ NO RESPONDE — ${e.name}: ${e.message}`)
    return
  }

  const ms = Date.now() - t0
  const tipo = res.headers.get('content-type') || '(sin content-type)'
  console.log(`  estado ${res.status} · ${tipo} · ${ms} ms`)

  const texto = await res.text()
  console.log(`  tamaño: ${texto.length} caracteres`)

  if (!res.ok) {
    console.log(`  ✗ RECHAZADA. Primeros caracteres: ${recorta(texto, 250)}`)
    return
  }

  // ── CSV ────────────────────────────────────────────────────────────────
  // Se mira ANTES que el JSON porque un CSV también es texto y `JSON.parse`
  // fallaría dejando un mensaje confuso.
  if (texto.trimStart().startsWith('DATAFLOW') || /^[A-Z_]+(,[A-Z_]+){3,}/m.test(texto.slice(0, 400))) {
    const lineas = texto.trim().split(/\r?\n/)
    console.log(`  ✓ RESPONDE EN CSV — ${lineas.length - 1} filas de datos`)
    console.log(`  CABECERA: ${recorta(lineas[0], 400)}`)
    for (const l of lineas.slice(1, 10)) console.log(`    ${recorta(l, 300)}`)
    return
  }

  // ── JSON ───────────────────────────────────────────────────────────────
  let datos
  try {
    datos = JSON.parse(texto)
  } catch {
    console.log(`  ✗ RESPONDE PERO NO ES JSON NI CSV RECONOCIBLE.`)
    console.log(`  Primeros caracteres: ${recorta(texto, 400)}`)
    return
  }

  console.log(`  ✓ RESPONDE EN JSON — claves de primer nivel: ${Object.keys(datos).join(' · ')}`)

  // SDMX (que es lo que hablan el BIS y el BCE) mete los números en
  // `dataSets` y los NOMBRES en `structure`, separados. Hay que enseñar los
  // dos: sin la estructura, los valores son una lista de números sin dueño.
  const ds = datos.dataSets?.[0]
  const estructura = datos.structure || datos.data?.structures?.[0]
  if (ds || estructura) {
    console.log('  Parece SDMX (es lo esperado en BIS y BCE).')

    const dims =
      estructura?.dimensions?.series ||
      estructura?.dimensions?.observation ||
      estructura?.dimensions ||
      []
    if (Array.isArray(dims)) {
      for (const d of dims) {
        const vals = (d.values || []).map((v) => v.id ?? v.name).slice(0, 12)
        console.log(`    dimensión "${d.id}": ${vals.join(', ')}${(d.values || []).length > 12 ? '…' : ''}`)
      }
    }

    const series = ds?.series || {}
    const claves = Object.keys(series)
    console.log(`    series devueltas: ${claves.length}`)
    for (const k of claves.slice(0, 10)) {
      console.log(`      "${k}" → ${recorta(series[k]?.observations, 160)}`)
    }
    if (ds?.observations) {
      console.log(`    observaciones sueltas: ${recorta(ds.observations, 200)}`)
    }
    return
  }

  console.log(`  ⚠ JSON pero no se reconoce la forma. Crudo: ${recorta(datos, 800)}`)
}

console.log('---SONDA-INICIO---')
console.log(`Fecha (UTC): ${new Date().toISOString()}`)
console.log('Esta sonda solo PIDE y ENSEÑA. No interpreta, no elige y no guarda nada.')
console.log(`Divisas del barrido y su país en el BIS: ${JSON.stringify(DIVISAS)}`)

for (const f of FUENTES) await sondear(f)

console.log('')
console.log('─'.repeat(72))
console.log('Leer de arriba abajo y elegir a mano la primera que:')
console.log('  1. responda,')
console.log('  2. traiga las OCHO divisas (o al menos diga cómo pedirlas),')
console.log('  3. y traiga la FECHA de cada dato — una tasa sin fecha no sirve:')
console.log('     hay que poder decir en pantalla de cuándo es.')
console.log('')
console.log('Y recordar al leerlo: esto da el SIGNO y el ORDEN DE MAGNITUD del')
console.log('swap, no el swap. El margen del bróker no lo publica nadie.')
console.log('---SONDA-FIN---')
