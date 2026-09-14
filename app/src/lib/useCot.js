import { useEffect, useState } from 'react'

import { clave } from './identidad.js'

// Baja el COT (posiciones institucionales) que publica
// `scripts/publicar-cot.mjs`.
//
// ⚠️ SOLO EXISTE EN SWING, a propósito. El COT es un dato SEMANAL que además
// llega con entre 3 y 10 días de retraso: la CFTC publica los viernes con los
// datos del martes anterior. Para operaciones de horas a días eso todavía dice
// algo; para una operación que abre y cierra dentro del mismo día no dice nada
// que no esté ya en el precio. Si algún día se quiere en Intradía, que sea con
// un motivo escrito y no por simetría.
const URL_COT =
  'https://raw.githubusercontent.com/Nestor-forex/Nestor-forex/datos/estado/cot.json'

// Con el prefijo de ESTA app: quien tenga las dos instaladas no debe pisarse la
// caché entre ellas. Ver `identidad.js`.
const CACHE_KEY = clave('cot_v1')
const LIMITE_MS = 12_000

// ⚠️ ESTE HOOK NUNCA DEVUELVE UN ERROR A LA PANTALLA.
//
// Si el COT no se puede bajar, devuelve `null` y la tarjeta sencillamente no
// sale. Misma decisión que `useTasas`, `useCalendario` y `correl`, y CONTRARIA
// a la de `setupsCaida`: aquí una ausencia solo cuesta una tarjeta que no se
// ve; allá se confundiría con «hoy no hubo señales» y borraría historial.
export function useCot() {
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    let cancelado = false

    const leerCache = () => {
      try {
        const guardado = JSON.parse(localStorage.getItem(CACHE_KEY))
        return guardado?.divisas && typeof guardado.divisas === 'object' ? guardado : null
      } catch {
        return null
      }
    }

    // La caché se pinta ANTES de pedir nada, y aquí tiene todavía más sentido
    // que en las tasas: el COT cambia UNA VEZ POR SEMANA, así que la copia
    // guardada casi siempre es exactamente la misma que se va a bajar. Y como
    // el archivo lleva dentro la fecha de SU informe, una copia vieja se
    // delata sola en pantalla en vez de hacerse pasar por nueva.
    const guardado = leerCache()
    if (guardado) setDatos(guardado)

    fetch(URL_COT, { signal: AbortSignal.timeout(LIMITE_MS), cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then((json) => {
        if (cancelado) return
        if (!json?.divisas || typeof json.divisas !== 'object') throw new Error('sin divisas')
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
