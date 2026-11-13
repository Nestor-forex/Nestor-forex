// SONDA DE FUENTES DE NOTICIAS Y OPINIONES — fase 4 del plan, 2026-11-13.
//
// ─────────────────────────────────────────────────────────────────────────
// PARA QUÉ
// ─────────────────────────────────────────────────────────────────────────
// Néstor pidió que las noticias del mercado se puedan cruzar con lo que la app
// ya enseña (calendario, tasas, COT) y, más adelante, que Qwen las lea (fases 5
// y 6). Antes de escribir ningún lector hay que saber QUÉ fuentes se pueden
// leer gratis, sin llave, con fecha y enlace. Es el camino de siempre: sonda
// primero, lector después. La red de las sesiones donde se programa bloquea
// casi todos estos hosts, así que esto corre en Actions.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LO QUE QUEDA ESCRITO ANTES DE VER NINGÚN TITULAR
// ─────────────────────────────────────────────────────────────────────────
//   1. UNA NOTICIA NO ES UNA SEÑAL. Si algún día la app enseña titulares, dirá
//      QUÉ pasó y CUÁNDO, nunca hacia dónde va el precio. Es la regla de
//      «¿Qué significa?»: alto o bajo, nunca compra o venta.
//   2. Se guardaría solo TITULAR, FECHA, ENLACE y FUENTE. El texto de la noticia
//      es de quien la escribió; el enlace lleva a leerla allí.
//   3. robots.txt SOLO DESCARTA. Que no prohíba algo no lo autoriza: en las
//      fuentes COMERCIALES las condiciones de uso las lee una persona antes de
//      construir nada. Las de los bancos centrales son notas de prensa públicas.
//   4. Y si se usara para decidir —«no operar cuando hay titulares de X»— sería
//      un FILTRO, y los filtros van al banco de pruebas con su listón escrito
//      antes. Van diez familias de filtros medidas y diez que no aportan nada.
//
// ⚠️ El User-Agent es HONESTO. Un 403 a un programa es una respuesta, y se
// respeta: es la línea que no se cruzó con Myfxbook, Dukascopy ni AvaTrade.
//
// ⚠️ Varias direcciones son CONJETURAS sobre dónde vive el canal de cada
// sitio. Un 404 solo dice que esa dirección no es, no que la fuente no sirva.

import { decidirConRobots, PROHIBE } from './lib/robots.mjs'
import { leerCanal, veredictoFuente, veredictoGeneral, divisasDe, HORAS_FRESCA } from './lib/noticias.mjs'

const UA = 'NestorForexSwing/1.0 (sonda de noticias; https://github.com/Nestor-forex/Nestor-forex)'

export const CANDIDATAS = [
  // Bancos centrales: la noticia más importante de cada divisa sale de aquí.
  { id: 'fed', tipo: 'oficial', divisa: 'USD', nombre: 'Reserva Federal (notas de prensa)', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  { id: 'bce', tipo: 'oficial', divisa: 'EUR', nombre: 'Banco Central Europeo', url: 'https://www.ecb.europa.eu/rss/press.html' },
  { id: 'boe', tipo: 'oficial', divisa: 'GBP', nombre: 'Banco de Inglaterra', url: 'https://www.bankofengland.co.uk/rss/news' },
  { id: 'boj', tipo: 'oficial', divisa: 'JPY', nombre: 'Banco de Japón', url: 'https://www.boj.or.jp/en/rss/whatsnew.xml' },
  { id: 'snb', tipo: 'oficial', divisa: 'CHF', nombre: 'Banco Nacional Suizo', url: 'https://www.snb.ch/public/en/rss/news' },
  { id: 'boc', tipo: 'oficial', divisa: 'CAD', nombre: 'Banco de Canadá', url: 'https://www.bankofcanada.ca/content_type/press-releases/feed/' },
  { id: 'rba', tipo: 'oficial', divisa: 'AUD', nombre: 'Banco de la Reserva de Australia', url: 'https://www.rba.gov.au/rss/rss-cb-media-releases.xml' },
  { id: 'rbnz', tipo: 'oficial', divisa: 'NZD', nombre: 'Banco de la Reserva de Nueva Zelanda', url: 'https://www.rbnz.govt.nz/feeds/news' },
  // Medios y casas de análisis: noticias y opiniones del día.
  { id: 'fxstreet-noticias', tipo: 'comercial', nombre: 'FXStreet — noticias', url: 'https://www.fxstreet.com/rss/news' },
  { id: 'fxstreet-analisis', tipo: 'comercial', nombre: 'FXStreet — análisis', url: 'https://www.fxstreet.com/rss/analysis' },
  { id: 'forexlive', tipo: 'comercial', nombre: 'ForexLive', url: 'https://www.forexlive.com/feed/news' },
  { id: 'investing', tipo: 'comercial', nombre: 'Investing.com — Forex', url: 'https://www.investing.com/rss/news_1.rss' },
  { id: 'ing', tipo: 'comercial', nombre: 'ING Think', url: 'https://think.ing.com/rss/' },
  { id: 'dailyforex', tipo: 'comercial', nombre: 'DailyForex', url: 'https://www.dailyforex.com/rss/forexnews.xml' },
  { id: 'babypips', tipo: 'comercial', nombre: 'BabyPips', url: 'https://www.babypips.com/feed' },
]

async function pedir(url, { timeoutMs = 20000 } = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
      signal: ctl.signal,
    })
    const texto = await r.text()
    return { http: r.status, texto, tipo: r.headers.get('content-type') ?? '' }
  } catch (e) {
    return { http: null, texto: '', tipo: '', error: e?.cause?.code ?? e?.name ?? String(e) }
  } finally {
    clearTimeout(t)
  }
}

const robotsCache = new Map()
async function robotsDe(url) {
  const origen = new URL(url).origin
  if (!robotsCache.has(origen)) {
    const r = await pedir(`${origen}/robots.txt`, { timeoutMs: 10000 })
    robotsCache.set(origen, r.http === 200 ? r.texto : null)
  }
  return decidirConRobots(robotsCache.get(origen), url)
}

const hace = (ms) => {
  if (ms === null) return 'sin fecha'
  const h = (Date.now() - ms) / 3_600_000
  return h < 48 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} días`
}

const resultados = []
for (const c of CANDIDATAS) {
  console.log(`\n── ${c.nombre} [${c.tipo}${c.divisa ? ' · ' + c.divisa : ''}]`)
  console.log(`   ${c.url}`)
  const permiso = await robotsDe(c.url)
  console.log(`   robots.txt: ${permiso.veredicto} (${permiso.porque})`)

  // Si robots.txt lo prohíbe, NI SE PIDE el canal: es un «no» explícito.
  if (permiso.veredicto === PROHIBE) {
    const v = veredictoFuente({ http: 200, robots: PROHIBE, canal: null })
    resultados.push({ id: c.id, nombre: c.nombre, tipo: c.tipo, ...v })
    console.log(`   → ${v.estado}: ${v.motivo}`)
    continue
  }

  const r = await pedir(c.url)
  console.log(`   HTTP ${r.http ?? '—'}${r.error ? ' · ' + r.error : ''} · ${r.tipo || 'sin tipo'} · ${r.texto.length} caracteres`)
  const canal = r.http === 200 ? leerCanal(r.texto) : null
  if (canal) {
    const conFecha = canal.entradas.filter((e) => e.fecha !== null).length
    console.log(`   formato: ${canal.formato ?? 'NO es un canal'} · ${canal.entradas.length} entradas · ${conFecha} con fecha`)
    for (const e of canal.entradas.slice(0, 3)) {
      const div = divisasDe(e.titulo)
      console.log(`     · [${hace(e.fecha)}] ${e.titulo.slice(0, 110)}${div.length ? '  {' + div.join(',') + '}' : ''}`)
      console.log(`       ${e.enlace.slice(0, 120) || '(sin enlace)'}`)
    }
    if (!canal.formato) console.log(`   primeros caracteres: ${JSON.stringify(r.texto.slice(0, 160))}`)
  }
  const v = veredictoFuente({ http: r.http, robots: permiso.veredicto, canal })
  resultados.push({ id: c.id, nombre: c.nombre, tipo: c.tipo, ...v })
  console.log(`   → ${v.estado}: ${v.motivo}${v.estado === 'sirve' ? ` · ${v.nombranDivisa} de ${v.total} nombran una de nuestras divisas` : ''}`)
}

console.log('\n════════════ RESUMEN ════════════')
for (const r of resultados) console.log(`  ${r.estado.padEnd(11)} ${r.nombre.padEnd(40)} ${r.motivo}`)

const g = veredictoGeneral(resultados)
console.log('')
if (g.estado === 'no-se-pudo') {
  console.log('✗ NO SE PUDO MIRAR: ninguna fuente respondió algo legible.')
  console.log('   Esto NO dice que no haya fuentes. Dice que desde aquí no se pudo leer ninguna.')
  process.exit(1)
}
if (g.estado === 'ninguna-sirve') {
  console.log('⚠️ Se leyeron fuentes y NINGUNA cumple los cinco criterios (200 sin llave, robots.txt,')
  console.log(`   titulares, fecha y enlace, y algo de las últimas ${HORAS_FRESCA} h).`)
} else {
  const oficiales = resultados.filter((r) => r.estado === 'sirve' && r.tipo === 'oficial').map((r) => r.id)
  const comerciales = resultados.filter((r) => r.estado === 'sirve' && r.tipo === 'comercial').map((r) => r.id)
  console.log(`✓ SIRVEN ${g.sirven.length}: oficiales [${oficiales.join(', ')}] · comerciales [${comerciales.join(', ')}]`)
  if (comerciales.length) {
    console.log('   ⚠️ Las COMERCIALES pasan solo los criterios técnicos: antes de usarlas hay que leer')
    console.log('      sus condiciones de uso. robots.txt no autoriza nada.')
  }
}
