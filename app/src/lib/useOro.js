import { useEffect, useState } from 'react'

import { clave } from './identidad.js'

// Baja el oro y su correlación con los pares, que publica
// `scripts/publicar-oro.mjs`.
//
// ⚠️ SOLO EXISTE EN SWING, y por el mismo motivo que la correlación entre
// pares: la ventana de 60 sesiones son 60 DÍAS aquí y 60 HORAS en la app
// hermana, o sea dos días y medio. Elegir la ventana buena para velas de una
// hora pide mirar SUS datos, no copiar este número. Si algún día se quiere
// allá, que sea con una ventana medida y no por simetría.
const URL_ORO =
  'https://raw.githubusercontent.com/Nestor-forex/Nestor-forex/datos/estado/oro.json'

// Con el prefijo de ESTA app: quien tenga las dos instaladas no debe pisarse la
// caché entre ellas. Ver `identidad.js`.
const CACHE_KEY = clave('oro_v1')
const LIMITE_MS = 12_000

// ⚠️ ESTE HOOK NUNCA DEVUELVE UN ERROR A LA PANTALLA.
//
// Si el oro no se puede bajar, devuelve `null` y la tarjeta sencillamente no
// sale. Misma decisión que `useCot`, `useTasas`, `useCalendario` y `correl`, y
// CONTRARIA a la de `setupsCaida`: aquí una ausencia solo cuesta una tarjeta
// que no se ve; allá se confundiría con «hoy no hubo señales» y borraría
// historial.
export function useOro() {
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    let cancelado = false

    const leerCache = () => {
      try {
        const guardado = JSON.parse(localStorage.getItem(CACHE_KEY))
        return typeof guardado?.precio === 'number' ? guardado : null
      } catch {
        return null
      }
    }

    // La caché se pinta ANTES de pedir nada. Y como el archivo lleva dentro la
    // fecha de SU dato, una copia vieja se delata sola en pantalla en vez de
    // hacerse pasar por nueva — la misma decisión que en el COT y las tasas.
    const guardado = leerCache()
    if (guardado) setDatos(guardado)

    fetch(URL_ORO, { signal: AbortSignal.timeout(LIMITE_MS), cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then((json) => {
        if (cancelado) return
        if (typeof json?.precio !== 'number') throw new Error('sin precio')
        setDatos(json)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(json))
        } catch {
          // Sin espacio o en modo privado: da igual, es solo la copia.
        }
      })
      .catch(() => {
        // A propósito en silencio. Ver el comentario de arriba.
      })

    return () => {
      cancelado = true
    }
  }, [])

  return datos
}
