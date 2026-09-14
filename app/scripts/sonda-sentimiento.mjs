// SONDA: ¿de dónde se saca el sentimiento minorista? ¿Y se PUEDE usar?
//
//     node scripts/sonda-sentimiento.mjs
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ UNA SONDA Y NO EL LECTOR DIRECTAMENTE
// ─────────────────────────────────────────────────────────────────────────
// Lo mismo que con el calendario (2026-09-08), las tasas (2026-09-09) y el COT
// (2026-09-14): la política de red de las sesiones donde se programa esta app
// bloquea buena parte de estos dominios, así que desde ahí no se ve ni si
// responden ni qué forma tienen los datos. Se sondea desde Actions.
//
// Esta sonda **no interpreta nada**: pide, cuenta y enseña un ejemplo crudo.
// Con eso delante se escribe el lector. Nunca al revés.
//
// ⚠️ NO GASTA CRÉDITOS DE TWELVE DATA y NO NECESITA NINGÚN SECRETO.
//
// ⚠️ Y NO ELIGE POR SÍ SOLA. Una sonda que decide sola acabaría eligiendo la
// que respondió más rápido ese día.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ ESTA SONDA TIENE UNA SEGUNDA MITAD QUE LAS OTRAS NO TENÍAN: EL PERMISO
// ─────────────────────────────────────────────────────────────────────────
// El calendario, las tasas y el COT venían de organismos públicos (BIS, CFTC)
// o de un feed hecho para que lo lea cualquiera. **Aquí no.** El sentimiento
// minorista es de EMPRESAS: es su dato, de sus clientes, y muchas lo publican
// como reclamo comercial, no como bien público.
//
// Por eso cada candidata se sondea DOS veces:
//
//   1. ¿responde y con qué forma?   → lo de siempre
//   2. ¿su robots.txt deja pedirlo? → lo nuevo
//
// ⚠️ Y hay que decirlo claro, porque es fácil confundirse: **robots.txt NO es
// lo mismo que las condiciones de uso.** Un robots.txt permisivo no autoriza
// nada; un robots.txt que lo prohíbe sí es un «no» explícito y ahí se acaba la
// conversación. O sea que esta comprobación solo sirve para DESCARTAR, nunca
// para aprobar. Lo que aprueba es leerse las condiciones, y eso lo hace una
// persona.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE HAY QUE TENER ESCRITO ANTES DE VER NINGÚN NÚMERO
// ─────────────────────────────────────────────────────────────────────────
// Queda aquí, con fecha anterior a los datos, a propósito — igual que la
// advertencia del swap en `sonda-tasas.mjs`.
//
// **1. El sentimiento minorista es el libro de UN bróker, no del mercado.**
// Es exactamente el mismo problema que el tick volume, y ya está explicado en
// CLAUDE.md bajo «Lo que NO se puede tener en Forex»: el Forex no tiene bolsa
// central, así que nadie tiene el total. Cuando una plataforma dice «el 78 %
// de los traders está comprado en EUR/USD», lo que dice de verdad es «el 78 %
// de MIS clientes». Dos brókers dan números distintos la misma hora.
//
// Y aquí hay un agravante que el tick volume no tiene: **la clientela de cada
// bróker es distinta**. Uno lleno de principiantes y otro lleno de veteranos
// no tienen por qué coincidir ni aunque los dos midieran bien.
//
// **2. «Los minoristas pierden, así que hay que hacer lo contrario» es la
// frase más repetida de este negocio y NO está medida aquí.** Suena
// convincente, que es justo la señal de alarma: este proyecto lleva cinco
// ocasiones documentadas en las que un mecanismo convincente resultó falso al
// medirlo. Si se quiere usar para algo más que mirarlo, va al banco de pruebas
// con su listón escrito antes, como el COT.
//
// **3. Es un FILTRO en potencia, así que entra como INFORMACIÓN o no entra.**
// La distinción está escrita en la fase de información: información no promete
// acertar más y entra sin medición; filtro cambia las señales y no entra sin
// pasar por el banco de pruebas. El COT acabó de información por esto mismo, y
// después la medición le dio la razón a la cautela.
//
// **4. Si el dato no trae FECHA, no sirve.** Misma regla que con las tasas y
// el COT. Un porcentaje sin decir de cuándo es se lee siempre como de ahora
// mismo.

import { decidirConRobots } from './lib/robots.mjs'

// Los pares que interesan: los 14 de Swing. La sonda pregunta por unos pocos
// representativos, no por todos — se trata de ver la FORMA, no de recolectar.
const MUESTRA = ['EURUSD', 'USDJPY', 'GBPUSD', 'AUDUSD']

// Las candidatas.
//
// El orden NO es casual; va de «más probable que se pueda usar» a menos:
//
//   1. **Myfxbook Community Outlook** es la más conocida y la que más gente
//      cita. Tiene una API declarada. ⚠️ Pero hasta donde se sabe pide iniciar
//      sesión para obtener un `session`, o sea una credencial. Se sondea SIN
//      sesión a propósito, para comprobar que la pide en vez de suponerlo —
//      exactamente como se hizo con FRED en la sonda de las tasas.
//   2. **Dukascopy** publica su índice SWFX por un servicio abierto.
//   3. **FXBlue** publica sentimiento agregado de sus usuarios.
//   4. **DailyFX / IG Client Sentiment** es el que más se cita en prensa. La
//      página es de marketing; la pregunta es si hay algo legible detrás.
//   5. **OANDA** tiene ratios de posiciones abiertas históricos y buenos, pero
//      casi seguro detrás de cuenta. Se sondea para dejarlo comprobado.
//
// ⚠️ Varias de estas direcciones son CONJETURAS mías sobre cómo se llaman sus
// endpoints. Eso NO es un defecto de la sonda: es exactamente para lo que
// existe. Una que dé 404 solo dice que esa dirección no es, no que la fuente
// no sirva.
const FUENTES = [
  {
    id: 'myfxbook-api-sin-sesion',
    nota: '⚠️ Se ESPERA que rechace por falta de sesión. Se sondea para comprobarlo, no para usarlo.',
    url: 'https://www.myfxbook.com/api/get-community-outlook.json?session=',
  },
  {
    id: 'myfxbook-pagina',
    nota: 'La página pública del Community Outlook. Interesa si trae los números dentro del HTML.',
    url: 'https://www.myfxbook.com/community/outlook',
  },
  {
    id: 'dukascopy-swfx',
    nota: 'Dukascopy, índice de sentimiento SWFX por su servicio abierto.',
    url: 'https://freeserv.dukascopy.com/2.0/index.php?path=sentiment_index/sentiment_index&instrument=EUR/USD',
  },
  {
    id: 'fxblue-sentimiento',
    nota: 'FXBlue, sentimiento agregado de sus usuarios.',
    url: 'https://www.fxblue.com/market-data/tools/sentiment',
  },
  {
    id: 'dailyfx-sentimiento',
    nota: 'DailyFX (IG Client Sentiment). El más citado en prensa; la página es de marketing.',
    url: 'https://www.dailyfx.com/sentiment',
  },
  {
    id: 'oanda-ratios',
    nota: '⚠️ Se espera que pida cuenta. Se sondea para dejarlo comprobado.',
    url: 'https://www.oanda.com/forex-trading/analysis/open-position-ratios',
  },
]

const recorta = (v, n = 220) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > n ? s.slice(0, n) + '…' : s
}

// Un User-Agent honesto: no se disfraza de navegador. Si una fuente solo
// contesta a algo que finja ser Chrome, eso YA ES una respuesta — quiere decir
// que no está publicando un dato, está sirviendo una página a personas.
const CABECERAS = {
  'User-Agent': 'NestorForex/1.0 (+https://github.com/Nestor-forex)',
  Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
}

// ─────────────────────────────────────────────────────────────────────────
// La mitad del permiso
// ─────────────────────────────────────────────────────────────────────────
//
// Lee el robots.txt del host y dice si la ruta que queremos está prohibida.
// Deliberadamente simple: solo mira las reglas de `User-agent: *`, y ante
// cualquier duda (no hay robots.txt, no se entiende, falla la petición) dice
// «no se sabe» en vez de «permitido».
//
// ⚠️ La asimetría es a propósito, como en `yaCorrioHoy` y en `esSombra`:
// equivocarse diciendo «no se sabe» cuesta que una persona lo mire; al revés
// cuesta pedir algo que nos habían dicho que no.
const cacheRobots = new Map()

async function robotsDice(url) {
  const origen = new URL(url).origin
  if (!cacheRobots.has(origen)) {
    try {
      const r = await fetch(`${origen}/robots.txt`, {
        headers: CABECERAS,
        signal: AbortSignal.timeout(20000),
      })
      cacheRobots.set(origen, r.ok ? await r.text() : { fallo: `HTTP ${r.status}` })
    } catch (e) {
      cacheRobots.set(origen, { fallo: `no responde (${e.name})` })
    }
  }
  const guardado = cacheRobots.get(origen)
  if (typeof guardado !== 'string') {
    return { veredicto: 'no se sabe', porque: `robots.txt ${guardado.fallo}` }
  }
  return decidirConRobots(guardado, url)
}

async function sondear(f) {
  console.log('')
  console.log('─'.repeat(72))
  console.log(`FUENTE: ${f.id}`)
  console.log(`  ${f.nota}`)
  console.log(`  ${f.url}`)

  const permiso = await robotsDice(f.url)
  console.log(`  ROBOTS.TXT: ${permiso.veredicto} — ${permiso.porque}`)

  const t0 = Date.now()
  let res
  try {
    res = await fetch(f.url, { headers: CABECERAS, signal: AbortSignal.timeout(30000) })
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
    console.log(`  ✗ RECHAZADA. Primeros caracteres: ${recorta(texto, 300)}`)
    return
  }

  // ── JSON ───────────────────────────────────────────────────────────────
  let datos = null
  try {
    datos = JSON.parse(texto)
  } catch {
    /* no es JSON: se mira como HTML más abajo */
  }

  if (datos) {
    console.log(`  ✓ RESPONDE EN JSON — claves de primer nivel: ${Object.keys(datos).join(' · ')}`)
    // Myfxbook contesta 200 con `error: true` dentro. Un 200 NO quiere decir
    // que haya datos: hay que mirar el cuerpo.
    if (datos.error) console.log(`  ⚠ 200 pero con error dentro: ${recorta(datos.message ?? datos, 300)}`)

    const lista =
      datos.symbols ?? datos.data ?? datos.result ?? (Array.isArray(datos) ? datos : null)
    if (Array.isArray(lista)) {
      console.log(`  filas: ${lista.length}`)
      if (lista.length) {
        console.log(`  CAMPOS de la primera: ${Object.keys(lista[0]).join(' · ')}`)
        for (const fila of lista.slice(0, 6)) console.log(`    ${recorta(fila, 300)}`)
      }
    } else {
      console.log(`  crudo: ${recorta(datos, 700)}`)
    }
    return
  }

  // ── HTML ───────────────────────────────────────────────────────────────
  // No se analiza el HTML: se buscan PISTAS de si los números están dentro de
  // la página o los trae después otra petición. Eso decide si hay lector
  // posible o no.
  console.log('  ✓ RESPONDE, pero no es JSON. Se mira si los números vienen dentro.')

  for (const par of MUESTRA) {
    const variantes = [par, `${par.slice(0, 3)}/${par.slice(3)}`, `${par.slice(0, 3)}_${par.slice(3)}`]
    const veces = variantes.map((v) => (texto.split(v).length - 1))
    console.log(`    ${par}: ${variantes.map((v, i) => `"${v}" ×${veces[i]}`).join(' · ')}`)
  }

  // Un porcentaje junto a la palabra «short»/«long» es la firma de este dato.
  const pcts = texto.match(/\d{1,3}(?:\.\d+)?\s*%/g) || []
  console.log(`    porcentajes en la página: ${pcts.length}${pcts.length ? ` (ej.: ${pcts.slice(0, 8).join(', ')})` : ''}`)
  const palabras = ['short', 'long', 'sentiment', 'bearish', 'bullish', 'net-short', 'positions']
  console.log(
    `    palabras clave: ${palabras.map((p) => `${p} ×${(texto.toLowerCase().split(p).length - 1)}`).join(' · ')}`,
  )

  // Si los números NO están, casi seguro los trae un JSON aparte que se pide
  // desde el navegador. Enseñar los candidatos ahorra la siguiente corrida.
  const apis = [...new Set((texto.match(/["'](\/[^"']*(?:api|json|sentiment)[^"']*)["']/gi) || []).map((s) => s.slice(1, -1)))]
  if (apis.length) {
    console.log(`    direcciones que parecen de datos dentro del HTML (${apis.length}):`)
    for (const a of apis.slice(0, 12)) console.log(`      ${a}`)
  }
}

console.log('---SONDA-INICIO---')
console.log(`Fecha (UTC): ${new Date().toISOString()}`)
console.log('Esta sonda solo PIDE y ENSEÑA. No interpreta, no elige y no guarda nada.')
console.log('')
console.log('⚠️ Lleva DOS preguntas por fuente: si responde, y si su robots.txt lo permite.')
console.log('   robots.txt NO es lo mismo que las condiciones de uso: sirve para DESCARTAR,')
console.log('   nunca para aprobar. Lo que aprueba es leerse las condiciones, y eso lo hace')
console.log('   una persona.')

for (const f of FUENTES) await sondear(f)

console.log('')
console.log('─'.repeat(72))
console.log('CÓMO LEER ESTO. Una candidata sirve solo si cumple LAS CUATRO:')
console.log('  1. responde sin credencial (si pide cuenta, es un secreto más que mantener);')
console.log('  2. su robots.txt no lo prohíbe, Y sus condiciones de uso lo permiten')
console.log('     — lo segundo hay que LEERLO, no sale aquí;')
console.log('  3. trae la FECHA del dato (un porcentaje sin fecha se lee siempre como de ahora);')
console.log('  4. trae varios pares, no solo uno de escaparate.')
console.log('')
console.log('Y al leerlo, lo que ya estaba escrito antes de ver estos números:')
console.log('  · esto es el libro de UN bróker, no del mercado — igual que el tick volume,')
console.log('    y encima con clientelas distintas en cada casa;')
console.log('  · «los minoristas pierden, hagamos lo contrario» NO está medido aquí;')
console.log('  · entra como INFORMACIÓN o no entra. Como filtro, al banco de pruebas.')
console.log('---SONDA-FIN---')
