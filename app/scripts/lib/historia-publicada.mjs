// La historia de velas que lee el laboratorio «prueba tu propia regla»
// (2026-11-18). Solo Swing: velas DIARIAS de los 14 pares, pedidos directos.
//
// Sale de la serie larga que el vigía YA se baja para las medias (950 días de
// calendario, ~680 de mercado con la rejilla limpia), así que NO CUESTA NI UN
// CRÉDITO MÁS de Twelve Data: solo deja de tirar lo que ya tenía en la mano.
//
// El formato es el que lee `probarRegla` en `src/lib/laboratorio.js`, y es el
// mismo en las dos apps:
//
//   { v: 1, vela: '1day', generadoEl, fechas: [...], pares: { 'EUR/USD': { c, h, l } } }
//
// ⚠️ Los números se redondean a 5 decimales (3 en los pares con yen): es la
// precisión con la que cotizan, y sin redondear el archivo pesaría el doble.
// ⚠️ Si un par no trae algún día, NO se rellena: ese par se deja fuera.

import { PARES } from './velas.mjs'

const decimales = (par) => (par.includes('JPY') ? 3 : 5)
const redondear = (v, d) => Math.round(v * 10 ** d) / 10 ** d

export function armarHistoria(largo, ahora = new Date()) {
  const fechas = largo?.fechas
  const rangos = largo?.rangosPar
  if (!Array.isArray(fechas) || !fechas.length || !rangos) return null
  const pares = {}
  for (const par of PARES) {
    const d = decimales(par)
    const c = []
    const h = []
    const l = []
    let ok = true
    for (const f of fechas) {
      const v = rangos[f]?.[par]
      if (!v || ![v.c, v.h, v.l].every(Number.isFinite)) { ok = false; break }
      c.push(redondear(v.c, d))
      h.push(redondear(v.h, d))
      l.push(redondear(v.l, d))
    }
    if (ok) pares[par] = { c, h, l }
  }
  if (!Object.keys(pares).length) return null
  return { v: 1, vela: '1day', generadoEl: ahora.toISOString(), fechas, pares }
}
