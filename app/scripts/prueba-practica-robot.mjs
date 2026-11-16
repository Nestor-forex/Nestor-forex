// Comprobaciones del programa que resuelve el modo práctica, sin red ni
// credenciales: corre el bucle entero con una base de datos de mentira.
//
//   node scripts/prueba-practica-robot.mjs
//
// Solo Swing: el programa vive aquí y sirve a las dos apps.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PERIODO_MS, resolverTodas } from './lib/practica-robot.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
let mal = 0
const ok = (cond, msg) => {
  console.log(`${cond ? '  ✓' : '  ✗ MAL'} ${msg}`)
  if (!cond) mal++
}

const FECHAS = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
const H = ['2026-11-10 13:00:00', '2026-11-10 14:00:00', '2026-11-10 15:00:00', '2026-11-10 16:00:00']
const BARRIDOS = {
  swing: { fechas20: FECHAS, pares: [{ name: 'EUR/USD', altos20: [1.102, 1.105, 1.111, 1.105, 1.106], bajos20: [1.098, 1.099, 1.097, 1.098, 1.099] }] },
  intradia: { fechas20: H, pares: [{ name: 'EUR/USD', altos20: [1.101, 1.104, 1.105, 1.106], bajos20: [1.099, 1.099, 1.0948, 1.099] }] },
}
const base = { par: 'EUR/USD', lado: 'COMPRA', entrada: 1.1, sl: 1.095, tp: 1.11, metodo: 'app' }

function bdDeMentira(porUid, { fallaEscribir = false } = {}) {
  const escritas = []
  return {
    escritas,
    async listar(col) {
      const uid = col.split('/')[1]
      return (porUid[uid] || []).map((o, i) => ({ ruta: `x/users/${uid}/practica/${i}`, id: String(i), ...o }))
    },
    async actualizar(ruta, campos) {
      if (fallaEscribir) return false
      escritas.push({ ruta, campos })
      return true
    },
  }
}

const FICHAS = [
  { id: 'a', estado: 'aprobado' },
  { id: 'r', estado: 'retirado' },
  { id: 'b', estado: 'aprobado' },
]
const OPS = {
  a: [
    { ...base, app: 'swing', vela: '2026-11-10', creado: '2026-11-10T15:00:00Z' }, // gana en 11-11
    { ...base, app: 'intradia', vela: H[0], creado: '2026-11-10T13:30:00Z' }, // pierde en 15:00
    { ...base, app: 'swing', vela: '2026-11-10', creado: '2026-11-10T15:00:00Z', estado: 'perdida', r: -1 }, // ya resuelta
    { ...base, app: 'loQueVenga', vela: '2026-11-10', creado: '2026-11-10T15:00:00Z' }, // app desconocida
  ],
  r: [{ ...base, app: 'swing', vela: '2026-11-10', creado: '2026-11-10T15:00:00Z' }],
  b: [{ ...base, app: 'swing', par: 'GBP/USD', vela: '2026-11-10', creado: '2026-11-10T15:00:00Z' }], // par sin velas
}

console.log('\n1 · El bucle entero, aplicando')
let bd = bdDeMentira(OPS)
let r = await resolverTodas({ bd, fichas: FICHAS, barridos: BARRIDOS, aplicar: true, ahora: 123 })
ok(r.ganadas === 1 && r.perdidas === 1, 'una ganada (Swing) y una perdida (Intradía), cada una con las velas de su app')
ok(bd.escritas.length === 2, 'escribe solo las dos que cambiaron')
const g = bd.escritas.find((e) => e.campos.estado === 'ganada')
ok(g && g.ruta.endsWith('/0') && Math.abs(g.campos.r - 2) < 1e-9 && g.campos.velaResuelta === '2026-11-11' && g.campos.resueltaEnMs === 123, 'la ganada lleva R, la vela y cuándo se resolvió')
ok(!bd.escritas.some((e) => e.ruta.includes('/r/')), '⚠️ a quien está retirado no se le toca nada')
ok(!bd.escritas.some((e) => e.ruta.endsWith('/2')), 'la que ya estaba resuelta no se vuelve a escribir')
ok(r.sinVelas === 2, 'la de app desconocida y la de un par sin velas esperan (no se adivinan)')

console.log('\n2 · Sin «aplicar» no escribe nada')
bd = bdDeMentira(OPS)
r = await resolverTodas({ bd, fichas: FICHAS, barridos: BARRIDOS })
ok(bd.escritas.length === 0 && r.ganadas === 1, 'cuenta lo que haría y no escribe')

console.log('\n3 · Si una escritura falla, se dice')
bd = bdDeMentira(OPS, { fallaEscribir: true })
r = await resolverTodas({ bd, fichas: FICHAS, barridos: BARRIDOS, aplicar: true })
ok(r.fallos === 2, 'dos escrituras fallidas → el programa acaba en rojo')

console.log('\n4 · Sin barrido de una app, las de la otra siguen')
bd = bdDeMentira(OPS)
r = await resolverTodas({ bd, fichas: FICHAS, barridos: { swing: BARRIDOS.swing, intradia: null }, aplicar: true })
ok(r.ganadas === 1 && r.perdidas === 0, 'Swing se resuelve; Intradía espera')

console.log('\n5 · Cada app con su duración de vela')
ok(PERIODO_MS.swing === 86_400_000 && PERIODO_MS.intradia === 3_600_000, 'un día en Swing, una hora en Intradía')

console.log('\n6 · Corre en el workflow de los avisos, y escribe sin que nadie marque nada')
const wf = readFileSync(join(AQUI, '../../.github/workflows/avisos.yml'), 'utf8')
const paso = wf.slice(wf.indexOf('Resolver las operaciones de práctica'))
ok(paso.includes('node scripts/resolver-practica.mjs --aplicar'), 'el paso existe y aplica por defecto (el reloj lo pulsa sin inputs)')
ok(/if: always\(\)/.test(paso.slice(0, 200)), 'corre aunque fallen los avisos')
ok(/FIREBASE_SERVICE_ACCOUNT/.test(paso), 'lleva la llave de Firebase')

console.log(mal ? `\n✗ ${mal} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(mal ? 1 : 0)
