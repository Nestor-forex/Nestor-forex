// Utilidades para grabar los videos del curso (2026-11-19).
//
// Sirve el banco construido (`_videos/`) y los datos REALES publicados en la
// rama `datos` (bajados antes a una carpeta con `curl`), sin servidor: todo
// pasa por las rutas de Playwright. Firebase se corta: el usuario es un doble.
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../../_videos/', import.meta.url))
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webm': 'video/webm', '.mp4': 'video/mp4', '.woff2': 'font/woff2' }

export const ANCHO = 390
export const ALTO = 720

export async function abrir(chromium, { datos, video, consulta = '' }) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  const opciones = { viewport: { width: ANCHO, height: ALTO } }
  if (video) opciones.recordVideo = { dir: video, size: { width: ANCHO, height: ALTO } }
  const ctx = await b.newContext(opciones)
  await ctx.addInitScript(() => {
    localStorage.setItem('nfs_idioma', 'es')
    localStorage.setItem('nfs_vista', 'vertical')
    localStorage.setItem('nfs_arranque_cerrado', '1')
  })
  // Lo que no es nuestro se corta (fuentes, Firebase). Va PRIMERO: Playwright
  // da prioridad a la última ruta registrada.
  await ctx.route('**/*', (r) => r.abort())
  await ctx.route('https://raw.githubusercontent.com/**', async (r) => {
    const u = new URL(r.request().url())
    const m = u.pathname.match(/\/datos\/(.+)$/)
    // Solo los datos de swing: lo de intradía no se sirve y la app lo dice.
    if (!m || !u.pathname.includes('/Nestor-forex/datos/')) return r.fulfill({ status: 404, body: '' })
    try {
      r.fulfill({ status: 200, body: await readFile(join(datos, m[1])), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } })
    } catch {
      r.fulfill({ status: 404, body: '' })
    }
  })
  await ctx.route('http://banco.local/**', async (r) => {
    let ruta = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'
    try {
      r.fulfill({ status: 200, body: await readFile(join(DIST, ruta)), headers: { 'content-type': TIPOS[extname(ruta)] || 'application/octet-stream' } })
    } catch {
      r.fulfill({ status: 404, body: '' })
    }
  })
  const p = await ctx.newPage()
  const errores = []
  p.on('pageerror', (e) => errores.push(String(e)))
  await p.goto(`http://banco.local/index.html${consulta}`)
  await p.waitForTimeout(1500)
  return { b, ctx, p, errores }
}

// El rótulo de abajo: el texto que explica el video (no hay voz).
export async function ponerRotulo(p) {
  await p.evaluate(() => {
    const d = document.createElement('div')
    d.id = 'rotulo'
    Object.assign(d.style, { position: 'fixed', left: '12px', right: '12px', bottom: '78px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(10,14,22,0.95)', border: '1px solid #23c4d8', color: '#fff', font: '600 15px/1.4 system-ui, sans-serif', zIndex: 99999, boxShadow: '0 6px 24px rgba(0,0,0,.5)' })
    document.body.appendChild(d)
  })
  return (t) => p.evaluate((x) => { document.getElementById('rotulo').textContent = x }, t)
}

// Resalta un elemento con un marco: sirve para decir «mira aquí».
export async function marcar(p, locator) {
  await locator.evaluate((el) => {
    document.querySelectorAll('[data-marca]').forEach((x) => { x.style.outline = ''; delete x.dataset.marca })
    el.dataset.marca = '1'
    el.style.outline = '3px solid #23c4d8'
    el.style.outlineOffset = '3px'
    el.style.borderRadius = el.style.borderRadius || '8px'
  })
}
export const desmarcar = (p) => p.evaluate(() => document.querySelectorAll('[data-marca]').forEach((x) => { x.style.outline = ''; delete x.dataset.marca }))

export async function llevar(p, locator, margen = 70) {
  await locator.evaluate((el, m) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - m, behavior: 'smooth' }), margen)
  await p.waitForTimeout(700)
}
