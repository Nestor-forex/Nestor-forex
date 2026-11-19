// Comprobaciones del seguimiento hacia adelante (2026-11-19), sin internet.
//
//   node scripts/prueba-seguir-reglas.mjs
//
// Solo Swing: el programa vive aquí. El motor (`avanzarAdelante`) tiene sus
// propias comprobaciones en `prueba-laboratorio.mjs`, que es gemelo.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { MAX_SEGUIDAS, serieAtr } from '../src/lib/laboratorio.js'
import { SPREAD_SOLO_INTRADIA, TABLA_SPREAD, avanzarUna, conServicio, reglasASeguir, seguirTodas } from './lib/seguir-reglas.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
let fallos = 0
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) fallos++
}

// Una historia a mano: plana, y en la vela 40 se rompe el mínimo de 10 velas.
function historia() {
  const n = 80
  const c = Array(n).fill(1.1)
  const h = Array(n).fill(1.101)
  const l = Array(n).fill(1.099)
  l[40] = 1.09
  const riesgo = 1.5 * serieAtr(h, l, c)[40]
  h[42] = 1.1 + riesgo * 1.01
  const fechas = Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10))
  return { fechas, pares: { 'EUR/USD': { c, h, l } } }
}
const H = historia()
const REGLA = { app: 'swing', lado: 'COMPRA', condiciones: [{ tipo: 'extremo', extremo: 'minimo', n: 10 }], riesgoATR: 1.5, objetivoRB: 1 }

console.log('\n1 · Quién y qué se sigue')
{
  ok(conServicio({ estado: 'aprobado', seguimientoActivo: true }), 'aprobado y con el servicio activo → sí')
  ok(!conServicio({ estado: 'aprobado', seguimientoSolicitado: 'x' }), 'pedirlo no basta: lo activa el administrador')
  ok(!conServicio({ estado: 'retirado', seguimientoActivo: true }), 'un retirado no, aunque lo tuviera activo')
  const muchas = Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, app: 'swing', seguir: true, seguirDesde: `2026-01-0${i + 1}T00:00:00Z` }))
  const sel = reglasASeguir([...muchas, { app: 'swing', seguir: false, seguirDesde: 'x' }, { app: 'swing', seguir: true }, { app: 'otra', seguir: true, seguirDesde: 'x' }])
  ok(sel.length === MAX_SEGUIDAS && sel[0].id === 'r0', `como mucho ${MAX_SEGUIDAS} por app, las más antiguas (${sel.length})`)
  const dos = reglasASeguir([...muchas.slice(0, 3), ...muchas.slice(0, 3).map((r) => ({ ...r, app: 'intradia' }))])
  ok(dos.length === 6, 'el límite es por app: cada app con lo suyo')
}

console.log('\n2 · Avanzar una regla')
{
  const r = { ...REGLA, seguirDesde: '2026-02-01T10:00:00Z' } // = fechas[31], antes de la señal
  const a = avanzarUna(r, H, 'AHORA')
  ok(a && a.ops.length === 1 && a.el === 'AHORA' && a.desde === '2026-02-01', 'cuenta la operación que empezó después de activar')
  ok(avanzarUna({ ...r, adelante: a }, H, 'LUEGO') === null, 'si nada cambió, no se escribe')
  ok(avanzarUna(r, null, 'X') === null, 'sin historia de esa app, no se toca nada')
  ok(avanzarUna({ ...r, seguirDesde: null }, H, 'X') === null, 'sin fecha de inicio, nada')
  ok(TABLA_SPREAD.intradia['EUR/GBP'] === SPREAD_SOLO_INTRADIA['EUR/GBP'] && TABLA_SPREAD.swing['EUR/GBP'] === undefined, 'cada app con su tabla de spread')
}

console.log('\n3 · La vuelta entera, con una base de datos de mentira')
{
  const escritas = []
  const bd = {
    listar: async (ruta) =>
      ruta === 'users/u1/reglas'
        ? [{ ...REGLA, id: 'a', ruta: 'R/a', seguir: true, seguirDesde: '2026-02-01T10:00:00Z' }, { ...REGLA, id: 'b', ruta: 'R/b', seguir: false }]
        : ruta === 'users/u2/reglas'
          ? [{ ...REGLA, id: 'c', ruta: 'R/c', seguir: true, seguirDesde: '2026-02-01T10:00:00Z' }]
          : [],
    actualizar: async (ruta, campos) => escritas.push([ruta, campos]),
  }
  const fichas = [
    { id: 'u1', estado: 'aprobado', seguimientoActivo: true },
    { id: 'u2', estado: 'aprobado' }, // sin el servicio
  ]
  const r = await seguirTodas({ bd, fichas, historias: { swing: H }, aplicar: true, ahora: new Date('2026-03-01T00:00:00Z') })
  ok(r.personas === 1 && r.reglas === 1, 'solo quien tiene el servicio, y solo la regla encendida')
  ok(escritas.length === 1 && escritas[0][0] === 'R/a' && Object.keys(escritas[0][1]).join() === 'adelante', 'escribe SOLO el campo `adelante` de esa regla')
  const seco = []
  await seguirTodas({ bd: { ...bd, actualizar: async (...x) => seco.push(x) }, fichas, historias: { swing: H }, aplicar: false })
  ok(seco.length === 0, 'en «solo mirar» no escribe nada')
}

console.log('\n4 · Los spreads de Intradía no se separan de los de la app hermana')
{
  const hermana = join(RAIZ, '..', '..', 'nestor-forex-intradia', 'app', 'scripts', 'lib', 'costes.mjs')
  if (!existsSync(hermana)) {
    console.log('  (la app hermana no está a mano: se salta, no es un fallo)')
  } else {
    const { SPREAD_PIPS } = await import(pathToFileURL(hermana).href)
    for (const [par, v] of Object.entries(SPREAD_SOLO_INTRADIA)) ok(SPREAD_PIPS[par] === v, `${par}: ${v} (allá ${SPREAD_PIPS[par]})`)
    const faltan = Object.keys(SPREAD_PIPS).filter((p) => TABLA_SPREAD.intradia[p] === undefined)
    ok(!faltan.length, `ningún par de Intradía sin spread (${faltan.join(', ') || 'ninguno'})`)
  }
}

console.log('\n5 · El workflow lo corre, y escribe sin que nadie marque nada')
{
  const yml = readFileSync(join(RAIZ, '..', '.github', 'workflows', 'avisos.yml'), 'utf8')
  ok(/node scripts\/seguir-reglas\.mjs --aplicar/.test(yml), 'el paso está en el workflow de los avisos')
  const paso = yml.slice(yml.indexOf('Seguir las reglas del laboratorio'))
  ok(/if: always\(\)/.test(paso.slice(0, 200)), 'corre aunque falle un paso anterior')
  ok(/inputs\.solo_mirar/.test(paso) && !/github\.event_name/.test(paso), 'escribe salvo «solo mirar» (el reloj de fuera llega sin inputs)')
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron` : '\n✓ todo bien')
process.exit(fallos ? 1 : 0)
