import { useEffect, useState } from 'react'
import { computarBarrido, derivarVista } from './marketCalc'

const CACHE_KEY = 'nf_market_cache_v1'
const hoyISO = () => new Date().toISOString().slice(0, 10)

async function obtenerRates() {
  const cacheRaw = localStorage.getItem(CACHE_KEY)
  if (cacheRaw) {
    try {
      const cache = JSON.parse(cacheRaw)
      if (cache.fetchedOn === hoyISO() && cache.fechas && cache.rates) {
        return { fechas: cache.fechas, rates: cache.rates }
      }
    } catch {
      // caché corrupta, seguimos a pedir datos frescos
    }
  }

  const f = (d) => d.toISOString().slice(0, 10)
  const ini = new Date(Date.now() - 220 * 864e5)
  const r = await fetch(`https://api.frankfurter.dev/v1/${f(ini)}..?base=USD&symbols=EUR,GBP,JPY,CHF,AUD,NZD,CAD`)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const j = await r.json()
  const fechas = Object.keys(j.rates).sort()

  localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedOn: hoyISO(), fechas, rates: j.rates }))
  return { fechas, rates: j.rates }
}

// Descarga (o reutiliza la caché del día) y calcula todo el barrido.
// thr = umbral de diferencial para clasificar sesgo, topN = setups por lado.
export function useMarketData({ thr = 0.5, topN = 3 } = {}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setError(null)
    obtenerRates()
      .then(({ fechas, rates }) => {
        if (cancelado) return
        setData(computarBarrido(fechas, rates))
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

  const vista = data ? derivarVista(data, { thr, topN }) : null

  return {
    loading,
    error,
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
