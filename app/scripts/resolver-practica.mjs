// Resuelve las operaciones del modo práctica de las DOS apps (punto 5 del plan,
// 2026-11-16). Corre en el workflow de los avisos, cada 15 minutos.
//
//   node scripts/resolver-practica.mjs            solo mira
//   node scripts/resolver-practica.mjs --aplicar  escribe los resultados
//
// No gasta ni un crédito de Twelve Data: lee los barridos que ya se publican en
// la rama `datos` de cada app.

import { abrir, leerCuentaDeServicio } from './lib/firestore-rest.mjs'
import { resolverTodas } from './lib/practica-robot.mjs'

const APLICAR = process.argv.includes('--aplicar')
const RAW = 'https://raw.githubusercontent.com/Nestor-forex'
const FUENTES = {
  swing: `${RAW}/Nestor-forex/datos/estado/barrido.json`,
  intradia: `${RAW}/Nestor-forex-intradia/datos/estado/barrido.json`,
}

async function bajar(url, queEs) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: 'no-cache' })
    if (!r.ok) {
      console.log(`  ⚠️ ${queEs}: HTTP ${r.status}`)
      return null
    }
    return await r.json()
  } catch (e) {
    console.log(`  ⚠️ ${queEs}: ${e?.message || e}`)
    return null
  }
}

console.log(`\nModo práctica — ${APLICAR ? 'APLICANDO' : 'solo mirar'}\n`)

const cuenta = leerCuentaDeServicio(process.env)
if (!cuenta) {
  console.log('Sin configurar: falta FIREBASE_SERVICE_ACCOUNT.\n')
  process.exit(0)
}

const [swing, intradia] = await Promise.all([bajar(FUENTES.swing, 'barrido de Swing'), bajar(FUENTES.intradia, 'barrido de Intradía')])
console.log(`  barrido Swing:     ${swing?.generadoEl || '—'} · velas con fecha: ${swing?.fechas20 ? 'sí' : 'NO'}`)
console.log(`  barrido Intradía:  ${intradia?.generadoEl || '—'} · velas con fecha: ${intradia?.fechas20 ? 'sí' : 'NO'}`)
// ⚠️ Sin los dos barridos no hay nada que decidir, y no es un fallo nuestro: se
// sale en verde. Con uno solo se sigue: las operaciones de la otra app esperan.
if (!swing && !intradia) {
  console.log('\nNo llegó ningún barrido: nada que decidir en esta vuelta.\n')
  process.exit(0)
}

const bd = await abrir(cuenta)
const fichas = await bd.listar('users')
const r = await resolverTodas({ bd, fichas, barridos: { swing, intradia }, aplicar: APLICAR })

console.log(`\n  personas con operaciones abiertas: ${r.personas} · abiertas: ${r.abiertas}`)
console.log(`  ganadas ${r.ganadas} · perdidas ${r.perdidas} · caducadas ${r.caducadas} · inválidas ${r.invalidas}`)
console.log(`  siguen abiertas con más velas revisadas: ${r.avanzadas} · sin velas todavía: ${r.sinVelas}`)
if (r.fallos) {
  console.log(`\n⚠️ ${r.fallos} escrituras o lecturas fallaron. Se reintentan en la vuelta siguiente.\n`)
  process.exit(1)
}
console.log('')
