// LAS CUENTAS PURAS DE LA SONDA DE NOTICIAS (fase 4, 2026-11-13).
//
// Leer un canal RSS o Atom y decidir si una fuente SIRVE. Vive aparte de la
// sonda por la misma razón que `sitemaps.mjs` y `robots.mjs`: la plomería de
// red no se puede probar sin internet, y lo que decide —«esta fuente sirve» o
// «no se pudo mirar»— es justo lo que no puede equivocarse en silencio.
//
// ─────────────────────────────────────────────────────────────────────────
// LO QUE SE EXIGE A UNA FUENTE, escrito ANTES de ver ninguna respuesta
// ─────────────────────────────────────────────────────────────────────────
//   1. Responde 200 SIN credencial y con un User-Agent honesto.
//   2. Su robots.txt NO prohíbe esa dirección. ⚠️ robots.txt solo DESCARTA:
//      que no lo prohíba no autoriza nada. Las condiciones de uso las lee una
//      persona, y en las fuentes comerciales hay que leerlas antes de usarlas.
//   3. Trae entradas que se pueden leer como titular.
//   4. CADA entrada útil lleva FECHA y ENLACE. Una noticia sin fecha se lee
//      siempre como de ahora mismo; una sin enlace no se puede comprobar.
//   5. Es FRESCA: la más reciente tiene menos de 72 horas. Un canal que dejó de
//      publicar sigue respondiendo 200 igual que uno vivo — la trampa del
//      conjunto muerto de la CFTC, otra vez.
//
// ⚠️ Lo que NO se exige, a propósito: que hable de Forex. Un banco central
// publica de todo, y aun así su nota de prensa es la noticia más importante de
// la semana para su divisa. Se CUENTA cuántos titulares nombran una de
// nuestras divisas, como información, y no tumba a nadie.

import { PROHIBE } from './robots.mjs'

export const HORAS_FRESCA = 72
export const MIN_ENTRADAS = 3
// Por debajo de esta fracción de entradas con fecha y enlace, el canal no sirve:
// unas pocas sueltas sin fecha se descartan, pero un canal entero sin fechas no.
export const MIN_FRACCION_COMPLETAS = 0.8

// ─── leer el XML, sin librerías ──────────────────────────────────────────
// Un canal RSS es casi siempre lo mismo: <item> con <title>, <link> y
// <pubDate>; o <entry> de Atom con <title>, <link href=""> y <updated>. Se lee
// con expresiones regulares a propósito: es la decisión del COT —leer el
// archivo oficial nosotros mismos cuando es suficientemente simple— y una
// librería de XML sería código ajeno para cuatro etiquetas.

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function limpiarTexto(s) {
  if (typeof s !== 'string') return ''
  let t = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  t = t.replace(/<[^>]+>/g, ' ')
  t = t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTIDADES[e.toLowerCase()] ?? m
  })
  return t.replace(/\s+/g, ' ').trim()
}

const etiqueta = (bloque, nombres) => {
  for (const n of nombres) {
    const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i').exec(bloque)
    if (m) return limpiarTexto(m[1])
  }
  return ''
}

// El enlace de una entrada: <link>texto</link> en RSS, <link href="..."/> en
// Atom. En Atom puede haber varios; se prefiere el `alternate` o el que no dice
// `rel`, que es la página de la noticia y no el comentario ni la imagen.
const enlaceDe = (bloque) => {
  const atom = [...bloque.matchAll(/<link\b([^>]*?)\/?>/gi)]
    .map((m) => m[1])
    .filter((attrs) => /\bhref\s*=/.test(attrs))
  if (atom.length) {
    const elegido = atom.find((a) => /rel\s*=\s*["']alternate["']/.test(a)) ?? atom.find((a) => !/\brel\s*=/.test(a)) ?? atom[0]
    const h = /href\s*=\s*["']([^"']+)["']/.exec(elegido)
    if (h) return limpiarTexto(h[1])
  }
  const rss = etiqueta(bloque, ['link'])
  if (rss) return rss
  // Hay canales que solo ponen el enlace en <guid isPermaLink="true">.
  const guid = /<guid\b[^>]*isPermaLink\s*=\s*["']true["'][^>]*>([\s\S]*?)<\/guid>/i.exec(bloque)
  return guid ? limpiarTexto(guid[1]) : ''
}

// ⚠️ UNA FECHA QUE NO SE ENTIENDE ES `null`, NUNCA «AHORA». `new Date('')` es
// inválida, pero `new Date(0)` y `new Date(null)` son 1970: por eso se mira el
// texto antes de convertirlo. Una noticia sin fecha leída como de hoy es el
// fallo exacto que el criterio 4 viene a impedir.
export function leerFecha(s) {
  if (typeof s !== 'string' || !s.trim()) return null
  const ms = Date.parse(s.trim())
  return Number.isFinite(ms) ? ms : null
}

export function leerCanal(xml) {
  if (typeof xml !== 'string' || !xml.trim()) return { formato: null, entradas: [] }
  const esAtom = /<feed\b[^>]*xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2005\/Atom["']/i.test(xml) || (/<entry\b/i.test(xml) && !/<item\b/i.test(xml))
  const bloques = [...xml.matchAll(esAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0])
  const formato = bloques.length ? (esAtom ? 'atom' : 'rss') : /<rss\b|<feed\b|<rdf:RDF\b/i.test(xml) ? (esAtom ? 'atom' : 'rss') : null
  const entradas = bloques.map((b) => {
    const titulo = etiqueta(b, ['title'])
    const enlace = enlaceDe(b)
    const textoFecha = etiqueta(b, ['pubDate', 'published', 'updated', 'dc:date'])
    // Categorías y autor: solo los lee el publicador, para dejar fuera lo que
    // una fuente dice que NO es suyo (ver `entradaPublicable`).
    const categorias = [...b.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)].map((m) => limpiarTexto(m[1])).filter(Boolean)
    const autor = etiqueta(b, ['dc:creator', 'author'])
    return { titulo, enlace, fecha: leerFecha(textoFecha), textoFecha, categorias, autor }
  })
  return { formato, entradas }
}

// ─── ¿nombra una de nuestras divisas? ────────────────────────────────────
// Solo para CONTAR. Códigos (USD) y pares (EUR/USD) en mayúsculas, y los
// nombres en inglés que usan los titulares. Nunca decide nada.
const DIVISAS = {
  USD: /\bUSD\b|\bdollar\b|\bfed\b|federal reserve|\bfomc\b/i,
  EUR: /\bEUR\b|\beuro\b|\becb\b|eurozone|euro area/i,
  GBP: /\bGBP\b|\bpound\b|sterling|bank of england|\bboe\b/i,
  JPY: /\bJPY\b|\byen\b|bank of japan|\bboj\b/i,
  CHF: /\bCHF\b|swiss franc|\bsnb\b|swiss national bank/i,
  CAD: /\bCAD\b|canadian dollar|loonie|bank of canada|\bboc\b/i,
  AUD: /\bAUD\b|aussie|australian dollar|\brba\b|reserve bank of australia/i,
  NZD: /\bNZD\b|kiwi|new zealand dollar|\brbnz\b|reserve bank of new zealand/i,
}
export const DIVISAS_NUESTRAS = Object.freeze(Object.keys(DIVISAS))

export function divisasDe(titulo) {
  const t = String(titulo ?? '')
  return DIVISAS_NUESTRAS.filter((c) => DIVISAS[c].test(t))
}

// ─── el veredicto de UNA fuente ──────────────────────────────────────────
// ⚠️ Devuelve SIEMPRE uno de tres estados, y el del medio es el que importa:
//   · 'sirve'       → pasó los cinco criterios
//   · 'no-se-pudo'  → no se pudo LEER (red, 4xx/5xx, no es un canal). Esto NO
//                     dice nada de si la fuente sirve
//   · 'no-sirve'    → se leyó y falla un criterio, con el motivo
// Es la asimetría de `veredictoBusqueda`: «no pude abrirlo» no es «no sirve».
export function veredictoFuente({ http, robots, canal, ahora = Date.now() } = {}) {
  if (!Number.isFinite(http) || http !== 200) {
    return { estado: 'no-se-pudo', motivo: `respondió ${Number.isFinite(http) ? http : 'sin respuesta'}` }
  }
  // `robots` es el `veredicto` de `decidirConRobots`, comparado contra su
  // constante y no contra una palabra escrita a mano (el fallo del 2026-10-22).
  if (robots === PROHIBE) return { estado: 'no-sirve', motivo: 'su robots.txt lo prohíbe' }
  if (!canal || !canal.formato) return { estado: 'no-se-pudo', motivo: 'respondió 200 pero no es un canal RSS ni Atom' }

  const conTitulo = canal.entradas.filter((e) => e.titulo)
  if (conTitulo.length < MIN_ENTRADAS) {
    return { estado: 'no-sirve', motivo: `trae ${conTitulo.length} titulares (hacen falta ${MIN_ENTRADAS})` }
  }
  const completas = conTitulo.filter((e) => e.fecha !== null && /^https?:\/\//i.test(e.enlace))
  const fraccion = completas.length / conTitulo.length
  if (fraccion < MIN_FRACCION_COMPLETAS) {
    return {
      estado: 'no-sirve',
      motivo: `solo ${completas.length} de ${conTitulo.length} titulares traen fecha y enlace`,
    }
  }
  const masReciente = Math.max(...completas.map((e) => e.fecha))
  const horas = (ahora - masReciente) / 3_600_000
  if (horas > HORAS_FRESCA) {
    return { estado: 'no-sirve', motivo: `el titular más reciente es de hace ${Math.round(horas)} h: el canal parece parado` }
  }
  const nombranDivisa = completas.filter((e) => divisasDe(e.titulo).length > 0).length
  return {
    estado: 'sirve',
    motivo: `${completas.length} titulares con fecha y enlace, el último de hace ${Math.max(0, Math.round(horas))} h`,
    nombranDivisa,
    total: completas.length,
  }
}

// ─── el veredicto de la sonda entera ─────────────────────────────────────
// ⚠️ SIN FUENTES LEÍDAS NO HAY VEREDICTO. Si todas dieron 'no-se-pudo', la
// conclusión es que no se pudo mirar — nunca «no hay fuentes».
export function veredictoGeneral(resultados = []) {
  const leidas = resultados.filter((r) => r.estado !== 'no-se-pudo')
  const sirven = resultados.filter((r) => r.estado === 'sirve')
  if (!leidas.length) return { estado: 'no-se-pudo', sirven: [] }
  if (!sirven.length) return { estado: 'ninguna-sirve', sirven: [] }
  return { estado: 'hay-fuentes', sirven: sirven.map((r) => r.id) }
}

// ═════════════════════════════════════════════════════════════════════════
// LO QUE SE PUBLICA EN LA APP (2026-11-13)
// ═════════════════════════════════════════════════════════════════════════
// Néstor pidió usar las fuentes cuyas condiciones lo permiten. Leídas el
// 2026-11-13 (el detalle, en CLAUDE.md):
//
//   · Reserva Federal — dominio público; pide citar a la Junta como fuente.
//   · Banco Central Europeo — uso libre citando al BCE y sin alterarlo.
//   · Banco de la Reserva de Nueva Zelanda — se puede reproducir citándolo como
//     fuente y dueño; acceso automático permitido con su User-Agent y un máximo
//     de 120 peticiones por hora.
//   · ING THINK — licencia para lo que es de ING Bank N.V., citándolo como dueño.
//     Lo de otros autores («THINK Outside») NO.
//
// ⚠️⚠️ LO QUE NO ESTÁ AQUÍ, A PROPÓSITO, Y NO SE AÑADE SIN PERMISO ESCRITO:
// Investing.com (solo uso personal, prohíbe programas automáticos),
// investingLive (pide permiso escrito), Banco de Inglaterra (uso comercial con
// permiso), Banco de Japón (copia comercial con permiso) y Banco Nacional Suizo
// (solo uso no comercial). Que su canal responda no autoriza nada. Hay una
// comprobación que falla si alguno aparece en esta lista.
//
// ⚠️ SE PUBLICA SOLO TITULAR, FECHA, ENLACE Y FUENTE, tal cual: nunca el texto
// de la noticia, y nunca un titular reescrito. Ninguna noticia dice hacia dónde
// va el precio, y la app no se lo añade.
export const FUENTES_PUBLICABLES = Object.freeze([
  {
    id: 'fed',
    nombre: 'Federal Reserve',
    divisa: 'USD',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    derechos: 'Source: Federal Reserve Board (public domain)',
    condiciones: 'https://www.federalreserve.gov/disclaimer.htm',
  },
  {
    id: 'bce',
    nombre: 'European Central Bank',
    divisa: 'EUR',
    url: 'https://www.ecb.europa.eu/rss/press.html',
    derechos: 'Source: © European Central Bank',
    condiciones: 'https://www.ecb.europa.eu/home/disclaimer/html/index.en.html',
  },
  {
    id: 'rbnz',
    nombre: 'Reserve Bank of New Zealand',
    divisa: 'NZD',
    url: 'https://www.rbnz.govt.nz/feeds/news',
    derechos: 'Source: © Reserve Bank of New Zealand',
    condiciones: 'https://www.rbnz.govt.nz/copyright',
    // Su política lo exige con este formato exacto: «RBNZ-Automated-Agent/
    // <organización>/<propósito>».
    agente: 'RBNZ-Automated-Agent/NestorForex/Noticias',
  },
  {
    id: 'ing',
    nombre: 'ING THINK',
    divisa: null,
    url: 'https://think.ing.com/rss/',
    derechos: '© ING Bank N.V.',
    condiciones: 'https://think.ing.com/about/terms-of-use/',
  },
])

export const DIAS_NOTICIA = 7
export const MAX_POR_FUENTE = 6

// ¿Se puede publicar esta entrada de esta fuente?
//
// ⚠️ El enlace tiene que ir al MISMO sitio que el canal. Un canal que enlaza a
// otra web estaría enseñando contenido de un tercero con la atribución de otro.
// ⚠️ ING: lo que su canal marca como de otros autores («THINK Outside») queda
// fuera: su licencia solo cubre lo que es de ING Bank N.V.
export function entradaPublicable(fuente, e, ahora = Date.now()) {
  if (!fuente || !e || !e.titulo || e.fecha === null || !Number.isFinite(e.fecha)) return false
  let host
  try {
    host = new URL(e.enlace).hostname.replace(/^www\./, '')
  } catch {
    return false
  }
  if (host !== new URL(fuente.url).hostname.replace(/^www\./, '')) return false
  if (ahora - e.fecha > DIAS_NOTICIA * 86_400_000) return false
  if (e.fecha - ahora > 3_600_000) return false
  if (fuente.id === 'ing') {
    const marcas = [...(e.categorias ?? []), e.autor ?? '', e.enlace].join(' ')
    if (/think[\s-]*outside/i.test(marcas)) return false
  }
  return true
}

// De lo que devolvió cada fuente, el archivo que lee la app.
// `porFuente`: [{ fuente, entradas }] — `entradas` vacío si la fuente falló.
export function prepararNoticias(porFuente = [], ahora = new Date()) {
  const ms = ahora.getTime()
  const fuentes = []
  const noticias = []
  for (const { fuente, entradas = [] } of porFuente) {
    const vistas = new Set()
    const buenas = entradas
      .filter((e) => entradaPublicable(fuente, e, ms))
      .filter((e) => (vistas.has(e.enlace) ? false : vistas.add(e.enlace)))
      .sort((a, b) => b.fecha - a.fecha)
      .slice(0, MAX_POR_FUENTE)
    fuentes.push({
      id: fuente.id,
      nombre: fuente.nombre,
      derechos: fuente.derechos,
      condiciones: fuente.condiciones,
      n: buenas.length,
    })
    for (const e of buenas) {
      noticias.push({
        f: fuente.id,
        t: e.titulo,
        u: e.enlace,
        d: new Date(e.fecha).toISOString(),
        div: fuente.divisa ? [fuente.divisa] : divisasDe(e.titulo),
      })
    }
  }
  noticias.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0))
  return { generadoEl: ahora.toISOString(), fuentes, noticias }
}
