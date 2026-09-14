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
// ⚠️ Y NO ELIGE POR SÍ SOLA. Imprime una ficha de cada conjunto de datos; la
// decisión se toma leyendo el log. Una sonda que decide sola acabaría quedándose
// con la que respondió primero ese día.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO MÁS IMPORTANTE DE ESTE ARCHIVO NO ES TÉCNICO
// ─────────────────────────────────────────────────────────────────────────
// Esto se escribió ANTES de ver un solo número, a propósito, igual que la
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
//    → **CONFIRMADO en la primera corrida:** el dato más reciente del
//      2026-09-14 (domingo) era del **2026-09-08**, que fue martes. Seis días.
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
//
// ─────────────────────────────────────────────────────────────────────────
// 📌 LO QUE LA PRIMERA CORRIDA DESTAPÓ, Y POR QUÉ ESTA SONDA CAMBIÓ
// ─────────────────────────────────────────────────────────────────────────
// La primera versión (run 34797433188, 2026-09-14) respondió bien y aun así
// **examinó a fondo el conjunto de datos equivocado**. Queda escrito porque los
// dos fallos son de los que no avisan:
//
// **1. FILTRABA LAS CANDIDATAS POR EL NOMBRE, y la buena se llama `TFF_All`.**
//    El filtro buscaba «commitment», «financial futures», «futures only»… y la
//    CFTC nombra sus conjuntos principales con abreviaturas: `TFF_All`,
//    `Legacy_All`, `CIT_All`. Así que **las dos que más falta hacían no se
//    miraron**, y sí se miró `Disaggregated_All`, que es de materias primas y
//    no tiene ni una divisa. La prueba pasaba enseñando trigo.
//    → Ahora se hace una ficha de **TODOS** los conjuntos que aparezcan, sin
//      filtrar por nombre. Son quince: caben.
//
// **2. EL VEREDICTO ESTABA MAL ROTULADO, y eso es un error de medición.**
//    Al no encontrar «EURO FX» en un conjunto de materias primas, la sonda
//    imprimía «el nombre de memoria está mal». **El nombre podía estar
//    perfecto**: lo que fallaba era el conjunto de datos. Es exactamente la
//    lección del 2026-09-04 («una etiqueta equivocada es un error de medición»)
//    repetida. Ahora dice lo que de verdad midió: «no está en ESTE conjunto».
//
// **3. Y una trampa de la API que conviene tener escrita:**
//    `publicreporting.cftc.gov/api/catalog/v1` **SIN `domains=`** devuelve el
//    catálogo de TODO Socrata, no el de la CFTC — en la primera corrida salieron
//    la policía de Dallas y los casos de covid en Colombia. Quien lo use para
//    «descubrir» los conjuntos de la CFTC se lleva cien datos ajenos. Se sigue
//    pidiendo, pero solo para dejar constancia de la trampa.
//
// **4. `$q=` (la búsqueda libre) NO sirve para encontrar una divisa.** `$q=EURO`
//    devolvió «NORTH EURO HOT-ROLL COIL STEEL»: acero. Hay que filtrar por el
//    nombre exacto del contrato, no por texto libre.

const UA = 'NestorForex/1.0 (+https://github.com/Nestor-forex)'
const DOMINIO = 'publicreporting.cftc.gov'

// Las ocho divisas del barrido y las formas en que PUEDE estar escrito su
// futuro. Varias por divisa a propósito: la CFTC no escribe igual «NEW ZEALAND
// DOLLAR» que «NZ DOLLAR», y desde aquí no se puede comprobar cuál usa.
//
// ⚠️ Estas grafías están escritas DE MEMORIA y por eso NO se usan para decidir
// nada: la sonda pide la lista REAL de contratos al servidor y la imprime
// entera. Si todas están mal, la lista lo dirá. Es la lección de `SYMBOLS` del
// puente (2026-09-08), que se escribió de memoria y dejó dos pares muertos sin
// que nada fallara.
const PISTAS_DIVISA = {
  EUR: ['EURO FX', 'EURO-FX', 'EUR '],
  JPY: ['JAPANESE YEN', 'JPY '],
  GBP: ['BRITISH POUND', 'POUND STERLING', 'GBP '],
  CHF: ['SWISS FRANC', 'CHF '],
  CAD: ['CANADIAN DOLLAR', 'CAD '],
  AUD: ['AUSTRALIAN DOLLAR', 'AUD '],
  NZD: ['NEW ZEALAND DOLLAR', 'NZ DOLLAR', 'NZD '],
  USD: ['U.S. DOLLAR INDEX', 'US DOLLAR INDEX', 'USD INDEX', 'DOLLAR INDEX'],
}

// Para LISTAR los contratos que parecen de divisa. Ajustado después de la
// primera corrida: el patrón ancho de entonces (que aceptaba «EURO» o «DOLLAR»
// sueltos) sacaba acero europeo, crudo del mar del Norte y electricidad de
// Ohio. Estos son nombres de divisa completos, así que no arrastran materias
// primas.
const PARECE_DIVISA =
  /(EURO FX|EURO-FX|JAPANESE YEN|BRITISH POUND|POUND STERLING|SWISS FRANC|CANADIAN DOLLAR|AUSTRALIAN DOLLAR|NEW ZEALAND DOLLAR|NZ DOLLAR|DOLLAR INDEX|MEXICAN PESO|BRAZILIAN REAL|SOUTH AFRICAN RAND|RUSSIAN RUBLE|CHINESE RENMINBI|SWEDISH KRONA|NORWEGIAN KRONE)/i

// Identificadores que CREO recordar. Se prueban además de los del catálogo y
// con esta etiqueta a propósito.
//
// 📌 En la primera corrida **los cuatro respondieron 200** aunque NINGUNO
// aparece en el catálogo de la CFTC. O sea que existen y no están anunciados:
// razón de más para mirar la fecha de su dato más reciente antes de fiarse de
// alguno, que es justo lo que esta versión añade.
const IDS_DE_MEMORIA = [
  { id: '6dca-aqww', nota: 'de memoria — 133 columnas, no está en el catálogo' },
  { id: 'gpe5-46if', nota: 'de memoria — 89 columnas (forma de TFF), no está en el catálogo' },
  { id: 'kh3c-gbw2', nota: 'de memoria — 194 columnas, no está en el catálogo' },
  { id: 'jun7-fc8e', nota: 'de memoria — 133 columnas, no está en el catálogo' },
]

const recorta = (v, n = 220) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > n ? s.slice(0, n) + '…' : s
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// Un solo sitio donde se pide algo, para que NINGÚN fallo de red tumbe la
// sonda entera: si una dirección no responde, se anota y se sigue con la
// siguiente. Media sonda es mucho mejor que ninguna.
async function pedir(url, etiqueta, { silencioso = false } = {}) {
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
  if (!silencioso) {
    console.log(`  estado ${res.status} · ${ms} ms · ${texto.length} caracteres`)
  }

  if (!res.ok) {
    console.log(`  ✗ RECHAZADA (${res.status}): ${recorta(texto.replace(/\s+/g, ' '), 200)}`)
    return null
  }

  try {
    return JSON.parse(texto)
  } catch {
    console.log(`  ⚠ RESPONDE PERO NO ES JSON: ${recorta(texto, 200)}`)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 1. EL CATÁLOGO: qué publica de verdad la CFTC
// ─────────────────────────────────────────────────────────────────────────
// Esto es lo ÚNICO que no se puede adivinar desde una sesión sin red, y por
// eso va primero.
async function catalogo() {
  const encontrados = new Map()

  // ── El índice DCAT del propio dominio ──────────────────────────────────
  // En la primera corrida fue **el mejor de los tres**: quince conjuntos, con
  // nombres legibles («TFF - Futures Only», «Legacy - Combined») en vez de
  // abreviaturas. Va primero por eso.
  console.log('')
  console.log('─'.repeat(72))
  console.log('CATÁLOGO: índice DCAT del dominio')
  console.log(`  https://${DOMINIO}/data.json`)
  const dcat = await pedir(`https://${DOMINIO}/data.json`, 'dcat')
  if (dcat?.dataset) {
    const filas = dcat.dataset
      .map((r) => ({
        // En DCAT el identificador viene como URL completa; interesa el trozo
        // final, que es el que Socrata usa en /resource/<id>.json
        id: String(r?.identifier || '').split('/').pop(),
        nombre: r?.title,
      }))
      .filter((f) => f.id && f.nombre)
    console.log(`  ✓ ${filas.length} conjuntos de datos`)
    for (const f of filas) {
      console.log(`    ${f.id}  ${f.nombre}`)
      if (!encontrados.has(f.id)) encontrados.set(f.id, f.nombre)
    }
  }

  // ── El catálogo central de Socrata, ACOTADO al dominio ─────────────────
  await pausa(250)
  console.log('')
  console.log('─'.repeat(72))
  console.log('CATÁLOGO: central de Socrata, acotado a la CFTC')
  const url = `https://api.us.socrata.com/api/catalog/v1?domains=${DOMINIO}&search_context=${DOMINIO}&only=dataset&limit=100`
  console.log(`  ${url}`)
  const central = await pedir(url, 'socrata-central')
  if (central?.results) {
    const filas = central.results
      .map((r) => ({ id: r?.resource?.id, nombre: r?.resource?.name }))
      .filter((f) => f.id && f.nombre)
    console.log(`  ✓ ${filas.length} conjuntos de datos`)
    for (const f of filas) {
      console.log(`    ${f.id}  ${f.nombre}`)
      if (!encontrados.has(f.id)) encontrados.set(f.id, f.nombre)
    }
  }

  // ── La TRAMPA, documentada a propósito ─────────────────────────────────
  // El mismo camino SIN `domains=` devuelve el catálogo de TODO Socrata. No se
  // listan los resultados —son cien datos ajenos— pero sí se deja constancia
  // de que responde 200 y de la cifra, que es lo que engaña.
  await pausa(250)
  console.log('')
  console.log('─'.repeat(72))
  console.log('⚠ TRAMPA: el mismo catálogo SIN acotar el dominio')
  console.log(`  https://${DOMINIO}/api/catalog/v1?only=dataset&limit=100`)
  const sinAcotar = await pedir(`https://${DOMINIO}/api/catalog/v1?only=dataset&limit=100`, 'trampa')
  if (sinAcotar?.results) {
    const ajenos = sinAcotar.results.filter((r) => r?.metadata?.domain && r.metadata.domain !== DOMINIO)
    console.log(`  Devuelve ${sinAcotar.results.length} conjuntos, de los cuales ${ajenos.length} NO son de la CFTC.`)
    console.log('  Ejemplos de lo que cuela:')
    for (const r of sinAcotar.results.slice(0, 3)) {
      console.log(`    ${r?.resource?.id}  ${r?.resource?.name}  (dominio: ${r?.metadata?.domain})`)
    }
    console.log('  → NO usar este camino para descubrir nada. Hace falta `domains=`.')
  }

  return encontrados
}

// ─────────────────────────────────────────────────────────────────────────
// 2. LA FICHA de un conjunto de datos
// ─────────────────────────────────────────────────────────────────────────
// Cuatro preguntas, y las cuatro hacen falta para poder elegir:
//
//   a) ¿responde y con qué columnas?
//   b) ¿de cuándo es su dato MÁS RECIENTE? — la que más falta hacía y no
//      estaba en la primera versión. Un conjunto que dejó de actualizarse
//      responde 200 igual que uno vivo.
//   c) ¿qué contratos de divisa tiene?
//   d) ¿cuáles de NUESTRAS ocho aparecen?
async function ficha(id, nombre) {
  console.log('')
  console.log('═'.repeat(72))
  console.log(`${id}  ${nombre}`)

  // (a) Columnas
  const muestra = await pedir(`https://${DOMINIO}/resource/${id}.json?$limit=1`, id)
  if (!Array.isArray(muestra) || !muestra.length) {
    if (Array.isArray(muestra)) console.log('  ⚠ Existe pero no trae filas.')
    return
  }

  const columnas = Object.keys(muestra[0])
  const colNombre =
    columnas.find((c) => /market.*exchange.*name/i.test(c)) ||
    columnas.find((c) => /market.*name/i.test(c)) ||
    columnas.find((c) => /contract.*name/i.test(c))
  const colFecha =
    columnas.find((c) => /report_date_as_yyyy_mm_dd/i.test(c)) ||
    columnas.find((c) => /as_of_date/i.test(c)) ||
    columnas.find((c) => /date/i.test(c))

  console.log(`  ✓ ${columnas.length} columnas · nombre del contrato: "${colNombre}" · fecha: "${colFecha}"`)

  if (!colNombre || !colFecha) {
    console.log(`  ⚠ Sin columna de nombre o de fecha: no sirve. Columnas: ${recorta(columnas.join(' · '), 400)}`)
    return
  }

  // (b) ¿Está vivo? El dato más reciente de TODO el conjunto.
  await pausa(250)
  const reciente = await pedir(
    `https://${DOMINIO}/resource/${id}.json?$select=${colFecha}&$order=${colFecha}%20DESC&$limit=1`,
    `${id}:reciente`,
    { silencioso: true },
  )
  const fechaMax = Array.isArray(reciente) ? reciente[0]?.[colFecha] : null
  console.log(`  DATO MÁS RECIENTE: ${fechaMax || '(no se pudo leer)'}`)

  // (c) y (d) Los contratos
  await pausa(250)
  const lista = await pedir(
    `https://${DOMINIO}/resource/${id}.json?$select=${colNombre}&$group=${colNombre}&$order=${colNombre}&$limit=3000`,
    `${id}:contratos`,
    { silencioso: true },
  )
  if (!Array.isArray(lista)) return

  const nombres = lista.map((d) => String(d?.[colNombre] ?? '')).filter(Boolean)
  const divisas = nombres.filter((n) => PARECE_DIVISA.test(n))
  console.log(`  ${nombres.length} contratos distintos · ${divisas.length} parecen de divisa`)

  if (divisas.length) {
    for (const n of divisas.slice(0, 40)) console.log(`      ${n}`)
    if (divisas.length > 40) console.log(`      … y ${divisas.length - 40} más`)
  }

  // ⚠️ El rótulo dice lo que de verdad se midió: si una divisa no aparece, lo
  // que está comprobado es que NO ESTÁ EN ESTE CONJUNTO — no que la grafía sea
  // mala. En la primera corrida se rotuló al revés y la conclusión que inducía
  // era la contraria.
  const faltan = []
  const hay = []
  for (const [divisa, grafias] of Object.entries(PISTAS_DIVISA)) {
    const coincide = nombres.filter((n) => grafias.some((g) => n.toUpperCase().includes(g.toUpperCase())))
    if (coincide.length) hay.push(`${divisa} (${recorta(coincide[0], 60)})`)
    else faltan.push(divisa)
  }
  console.log(`  DE NUESTRAS 8 — están: ${hay.length ? hay.join(' · ') : 'ninguna'}`)
  console.log(`  DE NUESTRAS 8 — no están EN ESTE CONJUNTO: ${faltan.length ? faltan.join(' · ') : 'ninguna'}`)
}

// ─────────────────────────────────────────────────────────────────────────
// 3. EL DETALLE del conjunto elegido
// ─────────────────────────────────────────────────────────────────────────
// 📌 ESTA ETAPA FALTABA en la segunda versión, y la falta era grave: la ficha
// imprimía «87 columnas» **sin decir cómo se llaman**. Con eso no se puede
// escribir el lector sin adivinar los nombres, que es justo lo que esta sonda
// existe para evitar. Se vio al ir a escribir el lector y no tener los datos.
//
// Imprime dos cosas, y las dos hacen falta:
//
//   · **TODAS las columnas de una fila real**, con su valor. El lector se
//     escribe sobre estos nombres y no sobre lo que uno recuerde.
//   · **TODOS los contratos del conjunto**, sin filtrar por «parece divisa».
//     El filtro de la ficha se dejó **fuera a propósito** aquí: en la segunda
//     corrida `PARECE_DIVISA` NO cazó «USD INDEX - ICE FUTURES U.S.» (solo
//     reconoce «DOLLAR INDEX»), así que la lista filtrada escondía un
//     contrato del dólar. Un filtro que esconde lo que se está buscando es
//     peor que ninguno.
async function detalle(id, contrato) {
  console.log('')
  console.log('█'.repeat(72))
  console.log(`DETALLE del conjunto elegido: ${id}`)
  console.log(`Contrato de referencia: ${contrato}`)
  console.log('█'.repeat(72))

  const colNombre = 'market_and_exchange_names'
  const colFecha = 'report_date_as_yyyy_mm_dd'

  // ── La fila más reciente de ESE contrato, entera ────────────────────────
  // Se filtra con `$where` y el nombre EXACTO, no con `$q`: en la primera
  // corrida `$q=EURO` devolvió «NORTH EURO HOT-ROLL COIL STEEL».
  const donde = encodeURIComponent(`${colNombre}='${contrato.replace(/'/g, "''")}'`)
  const url =
    `https://${DOMINIO}/resource/${id}.json?$where=${donde}` +
    `&$order=${colFecha}%20DESC&$limit=1`
  console.log('')
  console.log(`  ${url}`)

  const filas = await pedir(url, `${id}:detalle`)
  if (Array.isArray(filas) && filas.length) {
    const fila = filas[0]
    const columnas = Object.keys(fila)
    console.log(`  ✓ ${columnas.length} columnas, con el valor de la fila más reciente:`)
    for (const c of columnas) console.log(`    ${c} = ${recorta(fila[c], 90)}`)
  } else if (Array.isArray(filas)) {
    console.log('  ⚠ SIN FILAS: el nombre del contrato no coincide exactamente.')
    console.log('    Copiarlo tal cual de la lista de abajo.')
  }

  // ── TODOS los contratos, sin filtrar ───────────────────────────────────
  await pausa(250)
  console.log('')
  console.log(`  LISTA COMPLETA de contratos de ${id} (sin filtrar):`)
  const lista = await pedir(
    `https://${DOMINIO}/resource/${id}.json?$select=${colNombre}&$group=${colNombre}&$order=${colNombre}&$limit=3000`,
    `${id}:todos`,
    { silencioso: true },
  )
  if (Array.isArray(lista)) {
    const nombres = lista.map((d) => String(d?.[colNombre] ?? '')).filter(Boolean)
    console.log(`  (${nombres.length} en total)`)
    for (const n of nombres) console.log(`    ${n}`)
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

// ⚠️ SIN FILTRAR POR NOMBRE. La primera versión filtraba y se dejó fuera
// `TFF_All`, que es justo la de futuros financieros, porque su nombre es una
// abreviatura. Quince fichas caben en un log; una candidata que no se mira, no.
const aProbar = [
  ...[...encontrados.entries()].map(([id, nombre]) => ({ id, nombre })),
  ...IDS_DE_MEMORIA.filter((m) => !encontrados.has(m.id)).map((m) => ({ id: m.id, nombre: m.nota })),
]

console.log('')
console.log('─'.repeat(72))
console.log(`FICHAS a levantar: ${aProbar.length} (TODAS las encontradas, sin filtrar por nombre)`)

for (const c of aProbar) {
  await ficha(c.id, c.nombre)
  await pausa(250)
}

// ⚠️ El conjunto y el contrato de referencia se pueden cambiar al lanzar el
// workflow, pero los valores por defecto **no son una suposición**: salieron
// de la segunda corrida (2026-09-14), donde `TFF_All` fue el único conjunto
// catalogado, vivo y con las ocho divisas del barrido. Están aquí escritos
// para que la sonda se pueda repetir sin acordarse de nada.
await detalle(
  process.env.COT_CONJUNTO || 'udgc-27he',
  process.env.COT_CONTRATO || 'EURO FX - CHICAGO MERCANTILE EXCHANGE',
)

console.log('')
console.log('─'.repeat(72))
console.log('Leer de arriba abajo y elegir a mano el conjunto de datos que:')
console.log('  1. responda;')
console.log('  2. tenga un DATO MÁS RECIENTE de esta semana o la pasada — uno')
console.log('     que dejó de actualizarse responde 200 igual que uno vivo;')
console.log('  3. traiga las 7 divisas del barrido (del dólar solo habrá índice);')
console.log('  4. y separe posiciones largas y cortas por tipo de operador.')
console.log('')
console.log('Y escribir el lector con los nombres EXACTOS que salgan arriba, no')
console.log('con los de `PISTAS_DIVISA`, que están puestos de memoria.')
console.log('---SONDA-FIN---')
