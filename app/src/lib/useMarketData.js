import { useEffect, useState } from 'react'
import { derivarVista } from './marketCalc'
import { useT } from './i18n'

// De dónde salen los precios.
//
// Hasta 2026-08-09 la app le pedía los cierres directamente a Frankfurter
// (BCE), que es gratis e ilimitado. Ahora usa velas diarias reales de Twelve
// Data —con máximo y mínimo, no solo el cierre—, y esa fuente sí tiene tope:
// 8 consultas por minuto y 800 al día. Si cada persona que abre la app pidiera
// los 14 pares, con un puñado de miembros se acabaría la cuota, y con dos
// abriéndola a la vez fallaría.
//
// Por eso la consulta se hace UNA vez al día, en el vigía, y lo que la app
// baja es el barrido ya calculado. Sale igual de fresco (las velas diarias
// cambian una vez al día) y aguanta los miembros que hagan falta.
//
// El archivo lo escribe app/scripts/vigia.mjs en la rama `datos`.
const URL_BARRIDO =
  'https://raw.githubusercontent.com/Nestor-forex/Nestor-forex/datos/estado/barrido.json'

const CACHE_KEY = 'nf_market_cache_v2'
const LIMITE_MS = 15_000

function leerCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY))
    if (cache?.barrido?.pares && cache.guardadoEl) return cache
  } catch {
    // caché corrupta o bloqueada, se ignora
  }
  return null
}

// Baja el barrido del día. Si no hay internet, reutiliza la última copia
// guardada —aunque sea de días atrás— marcándola como vieja, para que la app
// siga sirviendo de algo en el avión o sin señal.
async function obtenerBarrido() {
  try {
    const r = await fetch(URL_BARRIDO, {
      signal: AbortSignal.timeout(LIMITE_MS),
      cache: 'no-cache',
    })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const barrido = await r.json()
    if (!barrido?.pares?.length) throw new Error('barrido vacío')

    const guardadoEl = new Date().toISOString().slice(0, 10)
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ guardadoEl, barrido }))
    } catch {
      // Sin espacio o en modo privado: da igual, es solo la copia de respaldo.
    }
    return { barrido, guardadoEl, stale: false }
  } catch (e) {
    const cache = leerCache()
    if (cache) return { barrido: cache.barrido, guardadoEl: cache.guardadoEl, stale: true }
    throw e
  }
}

// Baja (o reutiliza la caché) y arma la vista del barrido.
// thr = umbral de diferencial para clasificar sesgo, topN = setups por lado.
export function useMarketData({ thr = 0.5, topN = 3 } = {}) {
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [stale, setStale] = useState(false)
  const [guardadoEl, setGuardadoEl] = useState(null)

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setError(null)

    obtenerBarrido()
      .then(({ barrido, guardadoEl, stale }) => {
        if (cancelado) return
        setData(barrido)
        setStale(stale)
        setGuardadoEl(guardadoEl)
      })
      .catch((e) => {
        if (cancelado) return
        setError('No se pudieron obtener los precios (' + e.message + '). Revisa la conexión y recarga.')
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  // `derivarVista` se sigue ejecutando aquí y no en el vigía porque necesita
  // el idioma de cada persona, y eso el servidor no lo sabe.
  const vista = data ? derivarVista(data, { thr, topN, t }) : null

  return {
    loading,
    error,
    stale,
    guardadoEl,
    ultima: data?.ultima ?? null,
    ratesUSD: data?.ratesUSD ?? null,
    monedas: vista?.monedas ?? [],
    pares: vista?.pares ?? [],
    compras: vista?.compras ?? [],
    ventas: vista?.ventas ?? [],
    vigilancia: vista?.vigilancia ?? [],
    setups: vista?.setups ?? [],
    corte: vista?.corte ?? '…',
  }
}
