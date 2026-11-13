// PUBLICA LAS NOTICIAS QUE LA APP ENSEÑA (2026-11-13).
//
// Baja los canales de `FUENTES_PUBLICABLES` —solo las fuentes cuyas condiciones
// de uso lo permiten, leídas una por una— y escribe `estado/noticias.json` en
// la rama `datos`. La app lo lee de ahí, igual que el calendario.
//
// ⚠️ Titular, fecha, enlace y fuente, TAL CUAL. Ni el texto de la noticia ni un
// titular reescrito. Y ninguna noticia dice hacia dónde va el precio.
//
// ⚠️ SI NO SALE NI UNA NOTICIA, NO SE ESCRIBE NADA y el guion falla. Escribir
// un archivo vacío machacaría el bueno y en pantalla se vería igual que una
// semana sin noticias. Misma regla que el calendario.
//
// No gasta créditos de Twelve Data ni usa ninguna llave.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { decidirConRobots, PROHIBE } from './lib/robots.mjs'
import { FUENTES_PUBLICABLES, leerCanal, prepararNoticias } from './lib/noticias.mjs'

const UA = 'NestorForexSwing/1.0 (noticias; https://github.com/Nestor-forex/Nestor-forex)'
const DESTINO = join(process.env.VIGIA_DATOS || 'datos', 'estado', 'noticias.json')

async function pedir(url, agente, timeoutMs = 20000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': agente, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
      signal: ctl.signal,
    })
    return { http: r.status, texto: await r.text() }
  } catch (e) {
    return { http: null, texto: '', error: e?.cause?.code ?? e?.name ?? String(e) }
  } finally {
    clearTimeout(t)
  }
}

const porFuente = []
for (const fuente of FUENTES_PUBLICABLES) {
  const agente = fuente.agente ?? UA
  const robots = await pedir(`${new URL(fuente.url).origin}/robots.txt`, agente, 10000)
  const permiso = decidirConRobots(robots.http === 200 ? robots.texto : null, fuente.url)
  if (permiso.veredicto === PROHIBE) {
    console.log(`⛔ ${fuente.nombre}: su robots.txt lo prohíbe ahora. No se pide.`)
    porFuente.push({ fuente, entradas: [] })
    continue
  }
  const r = await pedir(fuente.url, agente)
  const canal = r.http === 200 ? leerCanal(r.texto) : null
  if (!canal?.formato) {
    console.log(`⚠️ ${fuente.nombre}: HTTP ${r.http ?? '—'}${r.error ? ' · ' + r.error : ''} — no se pudo leer. Se sigue con las demás.`)
    porFuente.push({ fuente, entradas: [] })
    continue
  }
  console.log(`✓ ${fuente.nombre}: ${canal.entradas.length} entradas en el canal`)
  // Lo que ING marca en sus categorías, para poder revisar que el filtro de
  // «THINK Outside» mira donde tiene que mirar.
  if (fuente.id === 'ing') {
    const cats = [...new Set(canal.entradas.flatMap((e) => e.categorias))]
    console.log(`   categorías de ING en el canal: ${cats.join(' · ') || '(ninguna)'}`)
  }
  porFuente.push({ fuente, entradas: canal.entradas })
}

const archivo = prepararNoticias(porFuente, new Date())
for (const f of archivo.fuentes) console.log(`   ${f.nombre}: ${f.n} titulares publicables`)

if (!archivo.noticias.length) {
  console.log('\n✗ NINGUNA noticia publicable: no se escribe nada y el archivo anterior se queda.')
  process.exit(1)
}

mkdirSync(dirname(DESTINO), { recursive: true })
const texto = JSON.stringify(archivo)
writeFileSync(DESTINO, texto)
console.log(`\n✓ ${archivo.noticias.length} noticias de ${archivo.fuentes.filter((f) => f.n).length} fuentes → ${DESTINO} (${(texto.length / 1024).toFixed(1)} KB)`)
