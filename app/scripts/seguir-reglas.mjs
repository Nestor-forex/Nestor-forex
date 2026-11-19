// El seguimiento hacia adelante de las reglas del laboratorio (2026-11-19).
// Corre en el workflow de los avisos, cada 15 minutos.
//
//   node scripts/seguir-reglas.mjs            solo mira
//   node scripts/seguir-reglas.mjs --aplicar  escribe los resultados
//
// No gasta ni un crédito de Twelve Data: lee la historia de velas que el
// vigía (Swing) y el publicador (Intradía) ya publican en la rama `datos`.
// Y solo la baja si alguien tiene el servicio activo.

import { abrir, leerCuentaDeServicio } from './lib/firestore-rest.mjs'
import { conServicio, seguirTodas } from './lib/seguir-reglas.mjs'

const APLICAR = process.argv.includes('--aplicar')
const RAW = 'https://raw.githubusercontent.com/Nestor-forex'
const FUENTES = {
  swing: `${RAW}/Nestor-forex/datos/estado/historia.json`,
  intradia: `${RAW}/Nestor-forex-intradia/datos/estado/historia.json`,
}

async function bajar(url, queEs) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: 'no-cache' })
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

console.log(`\nSeguimiento hacia adelante — ${APLICAR ? 'APLICANDO' : 'solo mirar'}\n`)

const cuenta = leerCuentaDeServicio(process.env)
if (!cuenta) {
  console.log('Sin configurar: falta FIREBASE_SERVICE_ACCOUNT.\n')
  process.exit(0)
}

const bd = await abrir(cuenta)
const fichas = await bd.listar('users')
const activos = fichas.filter(conServicio).length
console.log(`  miembros con el servicio activo: ${activos}`)
if (!activos) {
  console.log('\nNadie tiene el servicio activo: nada que seguir.\n')
  process.exit(0)
}

const [swing, intradia] = await Promise.all([bajar(FUENTES.swing, 'velas de Swing'), bajar(FUENTES.intradia, 'velas de Intradía')])
console.log(`  velas Swing:     ${swing?.generadoEl || '—'} · ${swing?.fechas?.length ?? 0} velas`)
console.log(`  velas Intradía:  ${intradia?.generadoEl || '—'} · ${intradia?.fechas?.length ?? 0} velas`)
// Con una sola se sigue: las reglas de la otra app esperan a la vuelta siguiente.
if (!swing && !intradia) {
  console.log('\nNo llegó ninguna historia de velas: nada que seguir en esta vuelta.\n')
  process.exit(0)
}

const r = await seguirTodas({ bd, fichas, historias: { swing, intradia }, aplicar: APLICAR })
console.log(`\n  personas: ${r.personas} · reglas seguidas: ${r.reglas}`)
console.log(`  ${APLICAR ? 'escritas' : 'se escribirían'}: ${r.escritas} · sin cambios: ${r.sinCambio}`)
if (r.fallos) {
  console.log(`\n⚠️ ${r.fallos} lecturas o escrituras fallaron. Se reintentan en la vuelta siguiente.\n`)
  process.exit(1)
}
console.log('')
