// SONDA: ¿qué fuente de calendario económico funciona de verdad, y qué trae?
//
//     node scripts/sonda-calendario.mjs
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ EXISTE ESTO Y NO SE ESCRIBIÓ EL LECTOR DIRECTAMENTE
// ─────────────────────────────────────────────────────────────────────────
// La política de red de las sesiones donde se programa esta app **bloquea**
// todos los servidores de calendario económico (403 del proxy, comprobado el
// 2026-09-08 con faireconomy, tradingeconomics y tradingview). O sea que desde
// ahí no se puede ver ni si responden ni qué forma tienen los datos.
//
// Escribir el lector a ciegas y descubrir la verdad cuando ya esté en la app
// es exactamente al revés de como trabaja este proyecto. Así que primero se
// manda esta sonda, que **no interpreta nada**: pide, cuenta y enseña un
// ejemplo crudo. Con eso a la vista se escribe el lector de verdad.
//
// ⚠️ NO GASTA CRÉDITOS DE TWELVE DATA. No toca esa API.
//
// ⚠️ Y NO ELIGE POR SÍ SOLA. Imprime lo que encuentra; la decisión de qué
// fuente usar se toma leyendo esto, no automáticamente. Una sonda que decide
// sola acabaría eligiendo la que respondió más rápido ese día.

const HOY = new Date()
const enDias = (n) => new Date(HOY.getTime() + n * 86400000).toISOString().slice(0, 10)

// Las candidatas, en el orden en que se prefieren si todas funcionaran.
//
// El orden NO es casual:
//   1. ForexFactory es el calendario que miran de verdad los operadores de
//      Forex al por menor, y su feed no pide llave ninguna. Si funciona, es
//      el que menos explicaciones necesita.
//   2. Trading Economics tiene API oficial pero su capa gratis está muy
//      recortada.
//   3. TradingView no publica esto como API para terceros: si responde, hay
//      que mirar sus términos antes de usarlo en un producto de pago.
const FUENTES = [
  {
    id: 'forexfactory-semana',
    nota: 'Feed público de ForexFactory (FairEconomy). Sin llave. La semana en curso.',
    url: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  },
  {
    id: 'forexfactory-cdn',
    nota: 'Lo mismo por el CDN, por si el primero va por otro camino.',
    url: 'https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json',
  },
  {
    id: 'tradingeconomics-invitado',
    nota: 'Trading Economics con la cuenta de invitado (muy limitada, pero oficial).',
    url: 'https://api.tradingeconomics.com/calendar?c=guest:guest&f=json',
  },
  {
    id: 'tradingview',
    nota: '⚠️ No es API pública para terceros. Solo se sondea para saber si existe.',
    url:
      'https://economic-calendar.tradingview.com/events' +
      `?from=${enDias(0)}T00:00:00.000Z&to=${enDias(7)}T00:00:00.000Z` +
      '&countries=US,EU,GB,JP,CA,AU,NZ,CH',
  },
]

// Las ocho divisas del barrido. Sirve para contestar la única pregunta que de
// verdad decide: ¿esta fuente trae los eventos que nos importan, o está llena
// de países que no operamos?
const CCY = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']

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
      // Sin User-Agent algunos servidores devuelven 403 aunque el feed sea
      // público. Se pone uno normal y honesto: no se disfraza de navegador.
      headers: { 'User-Agent': 'NestorForexSwing/1.0 (+https://github.com/Nestor-forex)' },
      signal: AbortSignal.timeout(25000),
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
    console.log(`  ✗ RECHAZADA. Primeros caracteres: ${recorta(texto, 200)}`)
    return
  }

  let datos
  try {
    datos = JSON.parse(texto)
  } catch {
    console.log(`  ✗ RESPONDE PERO NO ES JSON. Primeros caracteres: ${recorta(texto, 200)}`)
    return
  }

  // Algunas APIs devuelven la lista dentro de una propiedad (`result`, `data`…)
  // y otras la devuelven pelada. Se busca la primera lista que aparezca.
  let lista = Array.isArray(datos) ? datos : null
  if (!lista) {
    for (const [k, v] of Object.entries(datos)) {
      if (Array.isArray(v)) {
        lista = v
        console.log(`  (la lista venía dentro de "${k}")`)
        break
      }
    }
  }
  if (!lista) {
    console.log(`  ⚠ ES JSON PERO NO SE VE UNA LISTA. Claves: ${Object.keys(datos).join(', ')}`)
    console.log(`  Crudo: ${recorta(datos, 400)}`)
    return
  }

  console.log(`  ✓ FUNCIONA — ${lista.length} eventos`)
  if (!lista.length) return

  // Lo que hace falta para decidir: los nombres de los campos. Sin esto no se
  // puede escribir el lector, y es justo lo que no se ve desde el entorno de
  // programación.
  console.log(`  CAMPOS de un evento: ${Object.keys(lista[0]).join(' · ')}`)
  console.log(`  EJEMPLO CRUDO:`)
  console.log(`    ${recorta(lista[0], 700)}`)

  // ¿Trae nuestras divisas? Se busca el campo que las contenga sin suponer
  // cómo se llama: distintas fuentes lo llaman country, currency o code.
  const claveDivisa = Object.keys(lista[0]).find((k) => {
    const v = lista[0][k]
    return typeof v === 'string' && CCY.includes(v.toUpperCase())
  })
  if (claveDivisa) {
    const cuenta = {}
    for (const ev of lista) {
      const d = String(ev[claveDivisa] || '').toUpperCase()
      if (CCY.includes(d)) cuenta[d] = (cuenta[d] || 0) + 1
    }
    const nuestros = Object.values(cuenta).reduce((a, b) => a + b, 0)
    console.log(`  DIVISAS (campo "${claveDivisa}"): ${JSON.stringify(cuenta)}`)
    console.log(`  → ${nuestros} de ${lista.length} eventos son de las 8 que operamos`)
  } else {
    console.log(`  ⚠ No se encontró un campo con nuestras divisas. Hay que mirar el ejemplo a mano.`)
  }
}

console.log('---SONDA-INICIO---')
console.log(`Fecha (UTC): ${HOY.toISOString()}`)
console.log('Esta sonda solo PIDE y ENSEÑA. No interpreta, no elige y no guarda nada.')

for (const f of FUENTES) await sondear(f)

console.log('')
console.log('─'.repeat(72))
console.log('Leer de arriba abajo y elegir a mano la primera que:')
console.log('  1. responda,')
console.log('  2. traiga eventos de nuestras 8 divisas,')
console.log('  3. y traiga fecha, nombre del evento y algún nivel de importancia.')
console.log('---SONDA-FIN---')
