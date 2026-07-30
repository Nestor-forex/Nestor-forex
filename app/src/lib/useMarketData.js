import { useEffect, useState } from 'react'
import { computarBarrido, derivarVista } from './marketCalc'
import { useT } from './i18n'

const CACHE_KEY = 'nf_market_cache_v1'
const hoyISO = () => new Date().toISOString().slice(0, 10)

function leerCache() {
  const cacheRaw = localStorage.getItem(CACHE_KEY)
  if (!cacheRaw) return null
  try {
    const cache = JSON.parse(cacheRaw)
    if (cache.fechas && cache.rates && cache.fetchedOn) return cache
  } catch {
    // caché corrupta, se ignora
  }
  return null
}

// Descarga precios frescos, o si no hay internet reutiliza la última copia
// guardada (aunque sea de un día anterior) marcándola como "stale".
async function obtenerRates() {
  const cache = leerCache()
  if (cache?.fetchedOn === hoyISO()) {
    return { fechas: cache.fechas, rates: cache.rates, fetchedOn: cache.fetchedOn, stale: false }
  }

  const f = (d) => d.toISOString().slice(0, 10)
  const ini = new Date(Date.now() - 220 * 864e5)
  try {
    const r = await fetch(`https://api.frankfurter.dev/v1/${f(ini)}..?base=USD&symbols=EUR,GBP,JPY,CHF,AUD,NZD,CAD`)
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const j = await r.json()
    const fechas = Object.keys(j.rates).sort()
    const fetchedOn = hoyISO()
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedOn, fechas, rates: j.rates }))
    return { fechas, rates: j.rates, fetchedOn, stale: false }
  } catch (e) {
    if (cache) return { fechas: cache.fechas, rates: cache.rates, fetchedOn: cache.fetchedOn, stale: true }
    throw e
  }
}

// Descarga (o reutiliza la caché del día) y calcula todo el barrido.
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
    obtenerRates()
      .then(({ fechas, rates, stale, fetchedOn }) => {
        if (cancelado) return
        setData(computarBarrido(fechas, rates))
        setStale(stale)
        setGuardadoEl(fetchedOn)
      })
      .catch((e) => {
        if (cancelado) return
        const cache = leerCache()
        if (cache) {
          setData(computarBarrido(cache.fechas, cache.rates))
          setStale(true)
          setGuardadoEl(cache.fetchedOn)
        } else {
          setError('No se pudieron obtener los precios (' + e.message + '). Revisa la conexión y recarga.')
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

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
