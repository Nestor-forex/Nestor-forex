// SONDA: ¿de dónde se saca el COT (posiciones institucionales) y qué forma tiene?
//
//     node scripts/sonda-cot.mjs
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ UNA SONDA Y NO EL LECTOR DIRECTAMENTE
// ─────────────────────────────────────────────────────────────────────────
// Igual que con el calendario (2026-09-08) y las tasas (2026-09-09): la red de
// las sesiones donde se programa esta app **bloquea los dos hosts que hacen
// falta** — comprobado el 2026-09-14 corriendo esta misma sonda, no supuesto:
//
//   · `publicreporting.cftc.gov` → 403 «Host not in allowlist»
//   · `api.us.socrata.com`       → 403 «Host not in allowlist»
//
// (con `curl` el mismo bloqueo sale como `403 CONNECT tunnel failed`, que es el
// proxy hablando en vez del servidor.) Desde ahí no se puede ver ni si responde
// ni qué columnas trae.
//
// Esta sonda **no interpreta nada**: pide, cuenta y enseña. Con la forma real
// delante se escribe el lector. Nunca al revés.
//
// ⚠️ NO GASTA CRÉDITOS DE TWELVE DATA. No toca esa API.
//
// ⚠️ Y NO ELIGE POR SÍ SOLA. Imprime el catálogo entero y una muestra de las
// candidatas; la decisión se toma leyendo el log. Una sonda que decide sola
// acabaría quedándose con la que respondió primero ese día.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO MÁS IMPORTANTE DE ESTE ARCHIVO NO ES TÉCNICO
// ─────────────────────────────────────────────────────────────────────────
// Esto se escribe ANTES de ver un solo número, a propósito, igual que la
// advertencia del swap en `sonda-tasas.mjs`. Son cinco cosas que el COT NO es,
// y cada una es una forma de exagerarlo que esta app no va a usar:
//
// **1. EL COT NO ES «LO QUE HACEN LOS BANCOS».** Son posiciones en FUTUROS de
//    divisa, casi todos del CME. El mercado Forex de verdad es sobre todo
//    contado y forwards entre bancos, fuera de bolsa. Los futuros son una
//    rebanada pequeña, la única que está obligada a declarar. Que sea la parte
//    visible no la convierte en el todo — es el mismo error que llamar
//    «volumen» al contador de ticks de un bróker.
//
// **2. LLEGA CON DÍAS DE RETRASO, SIEMPRE.** El informe se publica los viernes
//    por la tarde con los datos del MARTES anterior. O sea que el día que sale
//    ya tiene tres días, y para el jueves siguiente tiene diez. Un dato de
//    posicionamiento de hace diez días no dice dónde está el dinero hoy.
//    → En pantalla hay que enseñar la FECHA DEL DATO, como con las tasas.
//
// **3. «NON-COMMERCIAL» NO QUIERE DECIR «DINERO LISTO».** Son especuladores, y
//    pierden como cualquiera. Los «commercial» son coberturistas y su posición
//    es casi el espejo de la otra, así que mirar solo un lado y llamarlo «el
//    mercado» es elegir la mitad que cuadra con lo que uno quería decir.
//
// **4. UN POSICIONAMIENTO EXTREMO SE LEE DE DOS FORMAS OPUESTAS**, y esta app
//    NO sabe cuál es la correcta: una escuela dice que confirma la tendencia y
//    la otra que anuncia la vuelta porque ya no queda nadie por entrar. Las dos
//    suenan razonables. **Cuál acierta aquí no se sabe y habría que medirlo.**
//
// **5. DEL DÓLAR NO HAY COT DE DIVISA**, solo del índice del dólar, y encima
//    cotiza en ICE y no en el CME. Es un contrato bastante pequeño. Así que la
//    divisa que aparece en los 14 pares del barrido es justo la que peor
//    cubierta queda.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ Y LO QUE DECIDE SI ESTO PUEDE ENTRAR EN LA APP TAL CUAL
// ─────────────────────────────────────────────────────────────────────────
// En la fase de información quedó escrita la distinción que manda aquí:
//
//   · **información** (calendario, tasas, correlación) no promete acertar más
//     y entra sin medición;
//   · **filtro** (COT, sentimiento, «no operar antes de noticias») cambiaría
//     las señales y NO entra sin pasar por el banco de pruebas.
//
// **El COT está en la segunda lista.** Así que enseñarlo en pantalla como dato,
// con su fecha y sus advertencias, es legítimo; usarlo para apagar o encender
// una señal NO lo es hasta que haya una medición propia. Que el dato esté a
// mano hace muy fácil cruzar esa línea sin darse cuenta.
//
// ─────────────────────────────────────────────────────────────────────────
// LA FUENTE: la API oficial de la CFTC (Socrata)
// ─────────────────────────────────────────────────────────────────────────
// Decidido el 2026-09-08 y escrito en CLAUDE.md: **se lee el archivo oficial
// nosotros mismos, sin librerías de terceros.** La CFTC publica en Socrata, que
// devuelve JSON y admite filtros por URL, así que no hay nada que descomprimir
// ni ningún formato viejo que descifrar. Una librería ahorraría poco y añadiría
// código ajeno que se abandona, cambia o desaparece.
//
// Socrata funciona sin llave con un límite de peticiones por hora. Una consulta
// a la semana entra de sobra, así que no hace falta ningún secreto nuevo.

const UA = 'NestorForex/1.0 (+https://github.com/Nestor-forex)'
const DOMINIO = 'publicreporting.cftc.gov'

// Las ocho divisas del barrido y cómo se llama su futuro, MÁS O MENOS.
//
// ⚠️ Estos nombres están escritos DE MEMORIA y por eso NO se usan para decidir
// nada: la sonda pide la lista REAL de contratos al servidor y la imprime. Si
// alguno está mal escrito, el log lo dirá. Es la lección del 2026-09-08, cuando
// `SYMBOLS` del puente se escribió de memoria y dos pares salieron mal sin que
// nada fallara.
const PISTAS_DIVISA = {
  EUR: 'EURO FX',
  JPY: 'JAPANESE YEN',
  GBP: 'BRITISH POUND',
  CHF: 'SWISS FRANC',
  CAD: 'CANADIAN DOLLAR',
  AUD: 'AUSTRALIAN DOLLAR',
  NZD: 'NEW ZEALAND DOLLAR',
  USD: 'U.S. DOLLAR INDEX',
}

// Identificadores de conjunto de datos que CREO recordar. Van al final y con
// esta etiqueta a propósito: lo primero que hace la sonda es pedir el catálogo,
// que es la única lista de verdad. Si alguno de estos no existe, mejor: queda
// comprobado en el log en vez de acabar escrito en el lector.
const IDS_DE_MEMORIA = [
  { id: '6dca-aqww', nota: '¿COT clásico, solo futuros? (de memoria)' },
  { id: 'gpe5-46if', nota: '¿Traders in Financial Futures, solo futuros? (de memoria)' },
  { id: 'kh3c-gbw2', nota: '¿Desagregado, solo futuros? (de memoria)' },
  { id: 'jun7-fc8e', nota: '¿TFF combinado? (de memoria)' },
]

const recorta = (v, n = 220) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > n ? s.slice(0, n) + '…' : s
}

// Un solo sitio donde se pide algo, para que NINGÚN fallo de red tumbe la
// sonda entera: si una dirección no responde, se anota y se sigue con la
// siguiente. Media sonda es mucho mejor que ninguna.
async function pedir(url, etiqueta) {
  const t0 = Date.now()
  let res
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    })
  } catch (e) {
    console.log(`  ✗ NO RESPONDE (${etiqueta}) — ${e.name}: ${e.message}`)
    return null
  }

  const ms = Date.now() - t0
  const texto = await res.text()
  console.log(
    `  estado ${res.status} · ${res.headers.get('content-type') || '(sin content-type)'} · ${ms} ms · ${texto.length} caracteres`,
  )

  if (!res.ok) {
    console.log(`  ✗ RECHAZADA. Primeros caracteres: ${recorta(texto, 300)}`)
    return null
  }

  try {
    return JSON.parse(texto)
  } catch {
    console.log(`  ⚠ RESPONDE PERO NO ES JSON. Primeros caracteres: ${recorta(texto, 300)}`)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 1. EL CATÁLOGO: qué publica de verdad la CFTC
// ─────────────────────────────────────────────────────────────────────────
// Esto es lo ÚNICO que no se puede adivinar desde una sesión sin red, y por
// eso va primero. Se prueban tres caminos porque no se sabe cuál está vivo:
// el catálogo central de Socrata, el del propio dominio, y el índice DCAT que
// publican los sitios de datos abiertos del gobierno de EE. UU.
async function catalogo() {
  const candidatos = [
    {
      id: 'catalogo-socrata-central',
      url: `https://api.us.socrata.com/api/catalog/v1?domains=${DOMINIO}&search_context=${DOMINIO}&only=dataset&limit=100`,
      saca: (d) => (d?.results || []).map((r) => ({ id: r?.resource?.id, nombre: r?.resource?.name })),
    },
    {
      id: 'catalogo-del-dominio',
      url: `https://${DOMINIO}/api/catalog/v1?only=dataset&limit=100`,
      saca: (d) => (d?.results || []).map((r) => ({ id: r?.resource?.id, nombre: r?.resource?.name })),
    },
    {
      id: 'indice-dcat',
      url: `https://${DOMINIO}/data.json`,
      saca: (d) =>
        (d?.dataset || []).map((r) => ({
          // En DCAT el identificador viene como URL completa; interesa el
          // trozo final, que es el que Socrata usa en /resource/<id>.json
          id: String(r?.identifier || '').split('/').pop(),
          nombre: r?.title,
        })),
    },
  ]

  const encontrados = new Map()

  for (const c of candidatos) {
    console.log('')
    console.log('─'.repeat(72))
    console.log(`CATÁLOGO: ${c.id}`)
    console.log(`  ${c.url}`)

    const datos = await pedir(c.url, c.id)
    if (!datos) continue

    let filas = []
    try {
      filas = c.saca(datos).filter((f) => f.id && f.nombre)
    } catch (e) {
      console.log(`  ⚠ Responde pero no se reconoce la forma — ${e.message}`)
      console.log(`  Claves de primer nivel: ${Object.keys(datos).join(' · ')}`)
      continue
    }

    console.log(`  ✓ ${filas.length} conjuntos de datos`)
    for (const f of filas) {
      console.log(`    ${f.id}  ${f.nombre}`)
      if (!encontrados.has(f.id)) encontrados.set(f.id, f.nombre)
    }
  }

  return encontrados
}

// ─────────────────────────────────────────────────────────────────────────
// 2. UNA MUESTRA de cada candidata: los NOMBRES de las columnas
// ─────────────────────────────────────────────────────────────────────────
// Los nombres de las columnas son lo segundo que no se puede adivinar, y el
// lector se escribe sobre ellos. Se imprimen TODOS aunque sean muchos: una
// columna que no se ve es una columna que después se escribe de memoria.
async function muestra(id, nombre) {
  console.log('')
  console.log('─'.repeat(72))
  console.log(`MUESTRA: ${id}`)
  console.log(`  ${nombre}`)

  const url = `https://${DOMINIO}/resource/${id}.json?$limit=1`
  console.log(`  ${url}`)

  const datos = await pedir(url, id)
  if (!Array.isArray(datos)) {
    if (datos) console.log(`  ⚠ No devuelve una lista. Claves: ${Object.keys(datos).join(' · ')}`)
    return null
  }
  if (!datos.length) {
    console.log('  ⚠ RESPONDE VACÍO: existe pero no trae filas.')
    return null
  }

  const fila = datos[0]
  const columnas = Object.keys(fila)
  console.log(`  ✓ ${columnas.length} columnas:`)
  for (const c of columnas) console.log(`    ${c} = ${recorta(fila[c], 80)}`)

  return { id, columnas, fila }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. ¿ESTÁN NUESTRAS DIVISAS AHÍ, Y CÓMO SE LLAMAN EXACTAMENTE?
// ─────────────────────────────────────────────────────────────────────────
// Aquí está el dato por el que existe esta sonda. Los nombres de contrato de
// `PISTAS_DIVISA` están escritos de memoria; lo que hace falta es el nombre
// EXACTO tal y como lo escribe la CFTC, porque el lector va a filtrar por él.
//
// Se pide la lista de nombres distintos en vez de buscar uno a uno: así salen
// también los que yo habría escrito mal.
async function contratos(id, columnas) {
  const col =
    columnas.find((c) => /market.*exchange.*name/i.test(c)) ||
    columnas.find((c) => /market.*name/i.test(c)) ||
    columnas.find((c) => /contract.*name/i.test(c))

  console.log('')
  console.log('─'.repeat(72))
  console.log(`CONTRATOS en ${id}`)

  if (!col) {
    console.log('  ⚠ No se encuentra una columna con el nombre del contrato.')
    console.log(`  Columnas disponibles: ${columnas.join(' · ')}`)
    return
  }
  console.log(`  columna del nombre del contrato: "${col}"`)

  // Nombres distintos, ordenados. `$group` con `$select` es lo que Socrata
  // entiende como «distinct».
  const url =
    `https://${DOMINIO}/resource/${id}.json` +
    `?$select=${col}&$group=${col}&$order=${col}&$limit=2000`
  console.log(`  ${url}`)

  const datos = await pedir(url, `${id}:contratos`)
  if (!Array.isArray(datos)) return

  const nombres = datos.map((d) => String(d?.[col] ?? '')).filter(Boolean)
  console.log(`  ✓ ${nombres.length} contratos distintos en total`)

  // Solo se imprimen los que huelen a divisa: la lista entera son cientos
  // (maíz, petróleo, bonos…) y llenaría el log tapando lo que importa.
  console.log('  Los que parecen de divisa:')
  const pinta = nombres.filter((n) =>
    /(EURO|YEN|POUND|STERLING|FRANC|CANADIAN|AUSTRALIAN|ZEALAND|DOLLAR|PESO|KRONA|REAL|RENMINBI|YUAN|CURRENC|FX)/i.test(n),
  )
  for (const n of pinta) console.log(`    ${n}`)
  if (!pinta.length) console.log('    (ninguno — mala señal para este conjunto de datos)')

  // Y por separado: ¿cuadra cada pista con algo de la lista? Esto es lo que
  // deja por escrito cuáles de mis nombres de memoria estaban mal.
  console.log('  ¿Cuadra cada divisa del barrido?')
  for (const [divisa, pista] of Object.entries(PISTAS_DIVISA)) {
    const coincide = nombres.filter((n) => n.toUpperCase().includes(pista.toUpperCase()))
    if (coincide.length) {
      console.log(`    ${divisa}: ✓ ${coincide.length} → ${recorta(coincide.join(' | '), 220)}`)
    } else {
      console.log(`    ${divisa}: ✗ NADA contiene "${pista}" — el nombre de memoria está mal`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. LA ÚLTIMA FILA DE UNA DIVISA, con la fecha
// ─────────────────────────────────────────────────────────────────────────
// La prueba de que se puede pedir exactamente lo que el lector va a pedir: la
// fila más reciente de un contrato. Y la FECHA, que es el dato que hay que
// enseñar en pantalla (ver la advertencia 2 de la cabecera).
async function ultimaFila(id, columnas) {
  const colNombre =
    columnas.find((c) => /market.*exchange.*name/i.test(c)) || columnas.find((c) => /market.*name/i.test(c))
  const colFecha =
    columnas.find((c) => /report_date_as_yyyy_mm_dd/i.test(c)) ||
    columnas.find((c) => /as_of_date/i.test(c)) ||
    columnas.find((c) => /date/i.test(c))

  console.log('')
  console.log('─'.repeat(72))
  console.log(`ÚLTIMA FILA de una divisa en ${id}`)

  if (!colNombre || !colFecha) {
    console.log(`  ⚠ Falta la columna del nombre (${colNombre}) o de la fecha (${colFecha}).`)
    return
  }
  console.log(`  columna de fecha: "${colFecha}"`)

  // `$q` es la búsqueda libre de Socrata: sirve aunque el nombre exacto del
  // contrato no sea el que yo creo. Se pide el euro porque es el contrato de
  // divisa más grande del CME.
  const url =
    `https://${DOMINIO}/resource/${id}.json` +
    `?$q=EURO&$order=${colFecha}%20DESC&$limit=1`
  console.log(`  ${url}`)

  const datos = await pedir(url, `${id}:ultima`)
  if (!Array.isArray(datos) || !datos.length) {
    console.log('  ⚠ Sin filas.')
    return
  }

  const fila = datos[0]
  console.log(`  ✓ contrato: ${fila[colNombre]}`)
  console.log(`  ✓ fecha del dato: ${fila[colFecha]}`)
  console.log('  Columnas con «long», «short», «net» o «open_interest» (las que usaría el lector):')
  for (const [k, v] of Object.entries(fila)) {
    if (/long|short|net|open_interest|traders/i.test(k)) console.log(`    ${k} = ${recorta(v, 60)}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────

console.log('---SONDA-INICIO---')
console.log(`Fecha (UTC): ${new Date().toISOString()}`)
console.log('Esta sonda solo PIDE y ENSEÑA. No interpreta, no elige y no guarda nada.')
console.log('')
console.log('RECORDAR AL LEER EL RESULTADO (escrito antes de ver ningún dato):')
console.log('  · el COT son FUTUROS del CME, no el mercado Forex entero;')
console.log('  · llega con 3 días de retraso como mínimo, y 10 antes del siguiente;')
console.log('  · «non-commercial» son especuladores, no «dinero listo»;')
console.log('  · un extremo se lee de dos formas OPUESTAS y no sabemos cuál acierta;')
console.log('  · y del dólar solo hay índice, en ICE, y pequeño.')
console.log('')
console.log('Y lo que decide si esto entra en la app: el COT es un FILTRO, no')
console.log('información, así que enseñarlo con su fecha sí, pero apagar o')
console.log('encender señales con él NO sin pasar por el banco de pruebas.')

const encontrados = await catalogo()

// Las candidatas: lo que el catálogo diga que se parece a un COT, más las que
// yo recordaba. Las de memoria van igual aunque el catálogo no las mencione —
// precisamente para dejar comprobado si existen o no.
const delCatalogo = [...encontrados.entries()].filter(([, nombre]) =>
  /commitment|financial futures|traders in|futures only|disaggregated/i.test(nombre),
)

console.log('')
console.log('─'.repeat(72))
console.log(`CANDIDATAS del catálogo: ${delCatalogo.length}`)
for (const [id, nombre] of delCatalogo) console.log(`  ${id}  ${nombre}`)

const aProbar = [
  ...delCatalogo.slice(0, 6).map(([id, nombre]) => ({ id, nombre })),
  ...IDS_DE_MEMORIA.filter((m) => !delCatalogo.some(([id]) => id === m.id)).map((m) => ({
    id: m.id,
    nombre: `${m.nota} — NO estaba en el catálogo`,
  })),
]

// La primera que traiga columnas Y contratos de divisa es la que se examina a
// fondo. Se examina UNA a fondo y no todas para no llenar el log: las demás ya
// quedaron con sus columnas impresas, que es lo que hace falta para comparar.
let aFondo = null
for (const c of aProbar) {
  const m = await muestra(c.id, c.nombre)
  if (m && !aFondo) aFondo = m
}

if (aFondo) {
  await contratos(aFondo.id, aFondo.columnas)
  await ultimaFila(aFondo.id, aFondo.columnas)
} else {
  console.log('')
  console.log('⚠ Ninguna candidata devolvió filas. Con esto NO se puede escribir el lector.')
}

console.log('')
console.log('─'.repeat(72))
console.log('Leer de arriba abajo y elegir a mano el conjunto de datos que:')
console.log('  1. responda;')
console.log('  2. traiga las 7 divisas del barrido (del dólar solo habrá índice);')
console.log('  3. traiga la FECHA del dato — sin ella no se puede enseñar en pantalla;')
console.log('  4. y separe posiciones largas y cortas por tipo de operador.')
console.log('')
console.log('Y escribir el lector con los nombres EXACTOS que salgan arriba, no')
console.log('con los de `PISTAS_DIVISA`, que están puestos de memoria.')
console.log('---SONDA-FIN---')
