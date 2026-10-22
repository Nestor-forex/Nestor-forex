// SONDA DE LA VOLATILIDAD IMPLÍCITA DE DIVISAS
//
//     node scripts/sonda-volatilidad.mjs
//
// Lo pidió Néstor el 2026-10-20: «estudiar la volatilidad de las opciones a
// ver si sirve para saber cuál es el horizonte de las apps».
//
// ⚠️ NO CAMBIA NADA. No escribe ningún archivo, no toca `src/`, no toca el
// historial ni la rama `datos`, y no gasta un crédito de Twelve Data. Su
// workflow lleva permiso de SOLO LECTURA.
//
// ⚠️ ESTA SONDA NO INTERPRETA. Pide, cuenta y enseña la forma cruda. Con eso
// delante se escribe el lector — nunca al revés. Es el mismo camino que el
// calendario, las tasas, el COT, el sentimiento y el oro, y en dos de esos
// cinco la sonda contestó «esto no sirve» y ahorró construir algo inútil.
//
// Las cuentas y el veredicto viven en `lib/volatilidad.mjs`, con 44
// comprobaciones sin internet, y ahí está escrito ANTES de ver ningún dato:
// la trampa de la anualización (√ y no división), lo que la volatilidad
// implícita NO dice, y que sería INFORMACIÓN y no un filtro.

import { NO_SE_SABE, PROHIBE, decidirConRobots } from './lib/robots.mjs'
import { plausibleIV, veredictoSonda } from './lib/volatilidad.mjs'

// Un User-Agent HONESTO. Un 403 a un programa es una respuesta y se respeta:
// es la línea que no se cruzó con Myfxbook, Dukascopy ni AvaTrade.
const UA = 'nestor-forex-sonda/1.0 (+https://github.com/Nestor-forex/Nestor-forex)'

// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LO QUE SE SABE ANTES DE PEDIR NADA, y acota lo que puede salir bien
// ─────────────────────────────────────────────────────────────────────────
//
// La volatilidad implícita de verdad —por par y por plazo— la cotizan los
// bancos en el mercado OTC y **no se publica gratis**. Lo que sí existe son
// los índices de la CBOE, que son de UN par cada uno:
//
//     EVZ    → EUR/USD      JYVIX → USD/JPY      BPVIX → GBP/USD
//
// O sea que **en el mejor caso esta sonda cubre 3 de los 14 pares de Swing**,
// y los tres contra el dólar. De EUR/NZD, GBP/CAD o NZD/CHF no va a haber
// nada. Eso no la hace inútil: con el euro basta para contestar la pregunta
// de fondo (¿cabe el objetivo en el horizonte?), pero el resultado habrá que
// rotularlo por lo que es y no extenderlo a los otros once.
//
// 📌 Y una nota para quien venga después: en ESTA sesión hay un conector de
// Alpha Vantage con llave. NO sirve para producción — un workflow no lo
// tiene. Por eso la sonda solo prueba fuentes SIN llave; si ninguna sirve, lo
// que toca es decidir si se añade un secreto, con el dato delante.

const CANDIDATAS = [
  {
    nombre: 'CBOE CDN · EVZ (euro)',
    url: 'https://cdn.cboe.com/api/global/us_indices/daily_prices/EVZ_History.csv',
    pares: ['EUR/USD'],
    comercial: true,
  },
  {
    nombre: 'CBOE CDN · JYVIX (yen)',
    url: 'https://cdn.cboe.com/api/global/us_indices/daily_prices/JYVIX_History.csv',
    pares: ['USD/JPY'],
    comercial: true,
  },
  {
    nombre: 'CBOE CDN · BPVIX (libra)',
    url: 'https://cdn.cboe.com/api/global/us_indices/daily_prices/BPVIX_History.csv',
    pares: ['GBP/USD'],
    comercial: true,
  },
  {
    nombre: 'Stooq · EVZ',
    url: 'https://stooq.com/q/d/l/?s=%5Eevz&i=d',
    pares: ['EUR/USD'],
    comercial: true,
  },
  {
    nombre: 'Yahoo Finance · ^EVZ',
    url: 'https://query1.finance.yahoo.com/v8/finance/chart/%5EEVZ?range=1mo&interval=1d',
    pares: ['EUR/USD'],
    comercial: true,
  },
  {
    nombre: 'FRED sin llave · VXEFXCLS',
    // Se pide a propósito SIN llave, para dejar COMPROBADO que la pide en vez
    // de suponerlo. Es lo mismo que se hizo con FRED en la sonda de tasas.
    url: 'https://api.stlouisfed.org/fred/series/observations?series_id=VXEFXCLS&file_type=json',
    pares: ['EUR/USD'],
    comercial: false,
  },
]

const pedir = async (url, segundos = 20) => {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), segundos * 1000)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: ctl.signal })
    const cuerpo = await r.text()
    return { ok: true, estado: r.status, tipo: r.headers.get('content-type') || '—', cuerpo }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  } finally {
    clearTimeout(t)
  }
}

/**
 * Intento de sacar el último número del cuerpo. ES UN INTENTO, no un lector:
 * la sonda enseña el crudo precisamente para que el lector se escriba después
 * con la forma real delante.
 *
 * ⚠️ Devuelve `null` si no lo consigue. Nunca inventa un 0.
 */
function intentarUltimaIV(cuerpo, tipo) {
  if (typeof cuerpo !== 'string' || !cuerpo.trim()) return null
  // JSON de Yahoo: el último `close` del primer indicador de cotización.
  if (/json/i.test(tipo) || cuerpo.trimStart().startsWith('{')) {
    try {
      const j = JSON.parse(cuerpo)
      const cierres = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
      if (Array.isArray(cierres)) {
        const ultimo = [...cierres].reverse().find((x) => Number.isFinite(x))
        return Number.isFinite(ultimo) ? ultimo : null
      }
      const obs = j?.observations
      if (Array.isArray(obs) && obs.length) {
        const v = Number(obs[obs.length - 1]?.value)
        return Number.isFinite(v) ? v : null
      }
    } catch {
      return null
    }
    return null
  }
  // CSV: la última fila con números. Se coge la columna de CIERRE si la
  // cabecera la nombra, y si no, la última numérica.
  const lineas = cuerpo.trim().split(/\r?\n/).filter(Boolean)
  if (lineas.length < 2) return null
  const cab = lineas[0].toLowerCase().split(',').map((s) => s.trim().replace(/"/g, ''))
  const iCierre = cab.findIndex((c) => /close|cierre/.test(c))
  for (let i = lineas.length - 1; i > 0; i--) {
    const cols = lineas[i].split(',').map((s) => s.trim().replace(/"/g, ''))
    const bruto = iCierre >= 0 ? cols[iCierre] : cols.filter((c) => Number.isFinite(Number(c)) && c !== '').pop()
    const v = Number(bruto)
    if (Number.isFinite(v) && v !== 0) return v
  }
  return null
}

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║  SONDA DE LA VOLATILIDAD IMPLÍCITA DE DIVISAS                     ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('\nPide, cuenta y enseña. NO interpreta y NO escribe nada.')
console.log('Las cuentas y el veredicto viven en `lib/volatilidad.mjs`, escritas')
console.log('antes de ver ningún dato y con 44 comprobaciones sin internet.\n')

const fuentes = []

for (const c of CANDIDATAS) {
  console.log('─'.repeat(70))
  console.log(`▸ ${c.nombre}`)
  console.log(`  ${c.url}`)

  // ⚠️ El robots.txt solo del sitio COMERCIAL. Los organismos públicos
  // publican para que se lea. Y sirve para DESCARTAR, nunca para aprobar: uno
  // permisivo no autoriza nada; uno que lo prohíbe sí es un «no» explícito.
  if (c.comercial) {
    //
    // ⚠️⚠️ `decidirConRobots` devuelve una FICHA `{ veredicto, porque }`, y los
    // veredictos se importan — NO se escriben a mano. La primera versión de
    // este bloque comparaba la ficha entera contra la palabra `'prohibido'`,
    // que ni siquiera es uno de los tres valores posibles: imprimía
    // `[object Object]` en el log y **el guardia no podía saltar nunca**.
    // Salió en la corrida real del 2026-10-22. Una comprobación que no muerde
    // es lo mismo que no tener comprobación.
    const host = new URL(c.url).origin
    const rb = await pedir(host + '/robots.txt', 10)
    const permiso =
      rb.ok && rb.estado === 200
        ? decidirConRobots(rb.cuerpo, c.url)
        : { veredicto: NO_SE_SABE, porque: `el robots.txt no respondió (${rb.ok ? rb.estado : rb.error})` }
    console.log(`  robots.txt: ${rb.ok ? rb.estado : 'no respondió'} → ${permiso.veredicto} · ${permiso.porque}`)
    if (permiso.veredicto === PROHIBE) {
      console.log('  ⛔ El sitio lo prohíbe explícitamente. NO se pide.')
      fuentes.push({ nombre: c.nombre, respondio: false, iv: null, pares: c.pares })
      continue
    }
  }

  const r = await pedir(c.url)
  if (!r.ok) {
    console.log(`  ❌ no respondió: ${r.error}`)
    fuentes.push({ nombre: c.nombre, respondio: false, iv: null, pares: c.pares })
    continue
  }

  console.log(`  HTTP ${r.estado} · ${r.tipo} · ${r.cuerpo.length} caracteres`)

  // ⚠️ SE ENSEÑA EL CRUDO. Contar apariciones no es leer: el 2026-09-14 dije
  // que FX Blue traía los números «dentro del HTML» porque conté la palabra
  // 13 veces, y estaba en su texto de propaganda.
  const cabeza = r.cuerpo.slice(0, 300).replace(/\s+/g, ' ')
  const cola = r.cuerpo.length > 600 ? r.cuerpo.slice(-200).replace(/\s+/g, ' ') : ''
  console.log(`  primeros 300: ${cabeza}`)
  if (cola) console.log(`  últimos 200:  ${cola}`)

  if (r.estado !== 200) {
    console.log('  → no sirve: no devolvió 200.')
    fuentes.push({ nombre: c.nombre, respondio: false, iv: null, pares: c.pares })
    continue
  }

  const iv = intentarUltimaIV(r.cuerpo, r.tipo)
  if (iv === null) {
    console.log('  ⚠️ respondió 200 y NO se pudo sacar un número. Eso NO es «no existe»:')
    console.log('     es que la forma no es la que esta sonda sabe leer. Mirar el crudo.')
  } else {
    const ok = plausibleIV(iv)
    console.log(`  último valor leído: ${iv}  → ${ok ? '✅ creíble como volatilidad anual' : '❌ FUERA del rango plausible'}`)
    if (!ok) {
      console.log('     ⚠️ Responder 200 con un número válido NO basta: es la trampa del oro')
      console.log('        (el 2026-09-29 `GOLD` devolvió velas perfectas de una ACCIÓN).')
    }
  }
  // `respondio: true` solo si de verdad trajo cuerpo con 200. El veredicto
  // distingue «respondieron y ninguna sirve» (hallazgo) de «no se pudo
  // mirar» (nada), y esa distinción se rompe si esto se marca a la ligera.
  fuentes.push({ nombre: c.nombre, respondio: true, iv, pares: c.pares })
}

console.log('─'.repeat(70))

const v = veredictoSonda(fuentes)
console.log('')
console.log('╔════════════════════════════════════════════════════════════════════╗')
console.log('║  EL VEREDICTO (lo calcula `veredictoSonda`, no lo argumenta nadie) ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')
console.log(`  ${v.veredicto.toUpperCase()}`)
console.log(`  ${v.dice}`)
if (v.sirven.length) console.log(`  sirven: ${v.sirven.join(' · ')}`)

console.log('')
console.log('⚠️  LO QUE ESTO NO AUTORIZA')
console.log('')
console.log('   Nada se enciende. La volatilidad implícita sería INFORMACIÓN —no')
console.log('   apaga ni una señal— y «no operar cuando esté alta» sería un FILTRO,')
console.log('   que va al banco de pruebas con su listón escrito antes. Van ocho')
console.log('   familias de filtros medidas y ocho fallando.')
console.log('')
console.log('   Y el horizonte de las apps YA está medido: Swing 5 días con la vara')
console.log('   neutra y 12-13 con la geometría real, Intradía 9 h de mediana. Esto')
console.log('   no viene a contestar cuánto duran, sino si el objetivo cabe dentro.')
console.log('')
