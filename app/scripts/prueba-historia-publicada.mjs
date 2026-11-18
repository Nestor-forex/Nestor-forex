// Comprobaciones de la historia que lee el laboratorio (2026-11-18), sin
// internet ni créditos. Solo Swing (PRIMO): cada app la publica a su manera.
//
//   node scripts/prueba-historia-publicada.mjs

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { armarHistoria } from './lib/historia-publicada.mjs'
import { obtenerVelas } from './lib/dobles/velas-dobles.mjs'
import { PARES } from './lib/velas.mjs'
import { probarRegla } from '../src/lib/laboratorio.js'
import { historiaValida } from '../src/lib/useHistoria.js'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const leer = (r) => readFileSync(join(RAIZ, r), 'utf8')
let fallos = 0
const ok = (c, m) => {
  console.log(`${c ? '✓' : '✗'} ${m}`)
  if (!c) fallos++
}

const { largo } = await obtenerVelas('x', { velas: 300, velasLargas: 950 })
const h = armarHistoria(largo, new Date('2026-11-18T12:00:00Z'))

console.log('\n1 · La forma')
ok(h && h.v === 1 && h.vela === '1day', 'versión 1, velas diarias')
ok(h.fechas.length === largo.fechas.length && h.fechas.length > 600, `todas las fechas de la serie larga (${h.fechas.length})`)
ok(PARES.every((p) => h.pares[p] && h.pares[p].c.length === h.fechas.length), 'los 14 pares, cada uno del largo de las fechas')
ok(PARES.every((p) => ['c', 'h', 'l'].every((k) => h.pares[p][k].every(Number.isFinite))), 'ningún número roto')
ok(h.pares['USD/JPY'].c.every((v) => Math.round(v * 1000) === v * 1000 || Math.abs(Math.round(v * 1000) - v * 1000) < 1e-6), 'yen a 3 decimales')
ok(historiaValida(JSON.parse(JSON.stringify(h))), 'la app la da por buena después de pasar por JSON')
const kb = JSON.stringify(h).length / 1024
ok(kb < 600, `pesa ${kb.toFixed(0)} KB`)

console.log('\n2 · Lo que falta no se inventa')
ok(armarHistoria(null) === null && armarHistoria({ fechas: [], rangosPar: {} }) === null, 'sin serie larga no hay historia (no una vacía)')
{
  const roto = structuredClone(largo)
  delete roto.rangosPar[roto.fechas[5]]['EUR/USD']
  const h2 = armarHistoria(roto)
  ok(!h2.pares['EUR/USD'] && h2.pares['GBP/USD'], 'un par con un día sin dato se deja fuera; los demás siguen')
}

console.log('\n3 · El laboratorio prueba sobre ella')
{
  const r = probarRegla({ lado: 'COMPRA', condiciones: [{ tipo: 'rsi', op: '<=', valor: 35 }], riesgoATR: 1.5, objetivoRB: 1 }, h, () => 2)
  ok(!r.error && r.ops > 0, `una regla sencilla da operaciones (${r.ops})`)
}

console.log('\n4 · El vigía la escribe sin poner en riesgo el historial')
{
  const v = leer('scripts/vigia.mjs')
  const iB = v.indexOf("escribir(BARRIDO,")
  const iH = v.indexOf('armarHistoria(largo')
  ok(iB > 0 && iH > iB, 'se escribe DESPUÉS del barrido (y del historial, que va antes)')
  ok(/try \{\s*const historia = armarHistoria/.test(v), 'dentro de un try: un fallo aquí no tumba el vigía')
  ok(/rangosPar: largo\.rangosPar/.test(leer('scripts/lib/velas.mjs')), 'la serie larga trae los máximos y mínimos')
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron` : '\n✓ todo bien')
process.exit(fallos ? 1 : 0)
