// El seguimiento hacia adelante del laboratorio (2026-11-19). Servicio
// adicional de 3 USD al mes que activa el administrador.
//
// Recorre a los miembros con el servicio activo, toma las reglas guardadas que
// tienen encendido «Seguir hacia adelante» y las avanza con las velas nuevas
// de la historia de cada app (`avanzarAdelante`, el mismo motor del
// laboratorio). Escribe el resultado en la propia regla (`adelante`).
//
// ⚠️ VIVE SOLO EN SWING, como el robot de vencimientos y los avisos: las dos
// apps comparten la colección `users`, y dos programas escribiendo lo mismo
// se pisarían. Lee la historia de las DOS apps (los archivos son públicos).
//
// ⚠️ SOLO SE ESCRIBE SI CAMBIÓ ALGO. Corre cada 15 minutos con los avisos, y
// las velas diarias cambian una vez al día: escribir siempre sería gastar
// escrituras para nada.
//
// ⚠️ SIN SERVICIO ACTIVO NO SE CALCULA NADA, aunque la regla siga marcada.
// Lo que ya estaba guardado se queda (no se borra el trabajo de nadie).

import { MAX_SEGUIDAS, avanzarAdelante, claveVela } from '../../src/lib/laboratorio.js'
import { SPREAD_PIPS, spreadDe } from './costes.mjs'

// ⚠️ Los cuatro pares que solo tiene Intradía. Viven en el `costes.mjs` de la
// app hermana; `prueba-seguir-reglas.mjs` los compara con aquél cuando el
// otro repositorio está a mano, para que no se separen en silencio. Sin esto
// esos pares se medirían con el valor por defecto y la cuenta no saldría
// igual que en la pantalla de Intradía.
export const SPREAD_SOLO_INTRADIA = Object.freeze({
  'AUD/JPY': 1.8,
  'NZD/JPY': 2.6,
  'AUD/NZD': 3.0,
  'EUR/GBP': 1.4,
})

export const TABLA_SPREAD = Object.freeze({
  swing: SPREAD_PIPS,
  intradia: { ...SPREAD_PIPS, ...SPREAD_SOLO_INTRADIA },
})

/** Quién tiene el servicio: aprobado y activado por el administrador. */
export const conServicio = (ficha) => ficha?.estado === 'aprobado' && ficha?.seguimientoActivo === true

/**
 * Las reglas que hay que seguir de una persona, por app: encendidas, con fecha
 * de inicio, las MAX_SEGUIDAS más antiguas de cada app (si alguien se salta el
 * límite de la pantalla, el programa no sigue más).
 */
export function reglasASeguir(reglas) {
  const porApp = {}
  for (const r of reglas ?? []) {
    if (r?.seguir !== true || !r.seguirDesde || !TABLA_SPREAD[r.app]) continue
    ;(porApp[r.app] ??= []).push(r)
  }
  const salida = []
  for (const lista of Object.values(porApp)) {
    lista.sort((a, b) => String(a.seguirDesde).localeCompare(String(b.seguirDesde)))
    salida.push(...lista.slice(0, MAX_SEGUIDAS))
  }
  return salida
}

const sinHora = ({ el: _el, ...resto } = {}) => JSON.stringify(resto)

/**
 * Avanza una regla. Devuelve el `adelante` nuevo, o null si no cambió nada
 * (o no se pudo calcular: sin historia de esa app, regla rota).
 */
export function avanzarUna(regla, historia, ahoraIso) {
  if (!historia?.fechas?.length) return null
  const desde = claveVela(regla.seguirDesde, historia.fechas)
  if (!desde) return null
  const tabla = TABLA_SPREAD[regla.app]
  const nuevo = avanzarAdelante(regla, historia, (par) => spreadDe(par, tabla), regla.adelante, desde)
  if (nuevo.error) return null
  if (regla.adelante && sinHora(regla.adelante) === sinHora(nuevo)) return null
  return { ...nuevo, el: ahoraIso }
}

/**
 * La vuelta entera. `bd` es lo de `firestore-rest.mjs` (`listar`,
 * `actualizar`); `historias` = { swing, intradia }.
 */
export async function seguirTodas({ bd, fichas, historias, aplicar, ahora = new Date() }) {
  const r = { personas: 0, reglas: 0, escritas: 0, sinCambio: 0, fallos: 0 }
  const ahoraIso = ahora.toISOString()
  for (const f of fichas ?? []) {
    if (!conServicio(f)) continue
    r.personas++
    let reglas
    try {
      reglas = await bd.listar(`users/${f.id}/reglas`)
    } catch {
      r.fallos++
      continue
    }
    for (const regla of reglasASeguir(reglas)) {
      r.reglas++
      const adelante = avanzarUna(regla, historias?.[regla.app], ahoraIso)
      if (!adelante) {
        r.sinCambio++
        continue
      }
      if (!aplicar) {
        r.escritas++
        continue
      }
      try {
        await bd.actualizar(regla.ruta, { adelante })
        r.escritas++
      } catch {
        r.fallos++
      }
    }
  }
  return r
}
