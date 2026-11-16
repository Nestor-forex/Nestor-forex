// El bucle que resuelve las operaciones del modo práctica, sin red ni
// credenciales: recibe la base de datos y los barridos por parámetro, así que
// `prueba-practica.mjs` lo corre entero con dobles.
//
// Vive en Swing y sirve a las DOS apps (comparten la colección `users`), igual
// que el robot de vencimientos y el de los avisos: dos programas resolviendo lo
// mismo se pisarían.

import { APPS } from '../../src/lib/alertas.js'
import { resolverPractica, velasDelPar } from '../../src/lib/practica.js'

// Lo que dura una vela en cada app. Solo se usa para no aceptar una entrada con
// un precio viejo (ver `resolverPractica`).
export const PERIODO_MS = Object.freeze({ swing: 86_400_000, intradia: 3_600_000 })

/**
 * @param bd        { listar(coleccion), actualizar(ruta, campos) }
 * @param fichas    los documentos de `users`
 * @param barridos  { swing, intradia }: los barridos publicados (o null)
 * @param aplicar   sin esto no se escribe nada
 */
export async function resolverTodas({ bd, fichas, barridos, aplicar = false, ahora = Date.now() }) {
  const r = { personas: 0, abiertas: 0, ganadas: 0, perdidas: 0, caducadas: 0, invalidas: 0, avanzadas: 0, sinVelas: 0, fallos: 0 }
  for (const f of fichas || []) {
    // Solo quien tiene la puerta abierta: las reglas tampoco le dejan crear
    // operaciones de práctica a nadie más.
    if (!f?.id || f.estado !== 'aprobado') continue
    let ops
    try {
      ops = await bd.listar(`users/${f.id}/practica`)
    } catch {
      r.fallos++
      continue
    }
    const abiertas = ops.filter((o) => !o.estado)
    if (!abiertas.length) continue
    r.personas++
    for (const op of abiertas) {
      r.abiertas++
      // ⚠️ Una app que no conocemos no se adivina: se espera.
      if (!APPS.includes(op.app)) {
        r.sinVelas++
        continue
      }
      const velas = velasDelPar(barridos?.[op.app], op.par)
      if (!velas) {
        r.sinVelas++
        continue
      }
      const d = resolverPractica(op, velas, { periodoMs: PERIODO_MS[op.app] })
      if (!d.cambio) continue

      const campos = {}
      if (d.estado) {
        campos.estado = d.estado
        campos.resueltaEnMs = ahora
        if (d.vela) campos.velaResuelta = d.vela
        if (typeof d.r === 'number') campos.r = d.r
        if (d.motivo) campos.motivo = d.motivo
        const k = { ganada: 'ganadas', perdida: 'perdidas', caducada: 'caducadas', invalida: 'invalidas' }[d.estado]
        r[k]++
      } else {
        campos.revisadoHasta = d.revisadoHasta
        r.avanzadas++
      }
      if (!aplicar) continue
      try {
        const ok = await bd.actualizar(op.ruta, campos)
        if (!ok) r.fallos++
      } catch {
        r.fallos++
      }
    }
  }
  return r
}
