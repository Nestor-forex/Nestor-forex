import { useEffect, useRef, useState } from 'react'
// Con extensión `.js`: Vite lo resuelve sin ella, pero Node no, y
// `scripts/prueba-mt5.mjs` importa este archivo desde Node.
import { PAIR_NAMES } from './pairs.js'

// Cotizaciones en vivo desde el puente de MetaTrader 5.
//
// El puente es un servidor de Python (FastAPI) que corre en el computador de
// Néstor junto a MT5 y expone GET /quotes con el Bid y el Ask de cada par.
// Esto es información que la app NUNCA tuvo: el barrido trabaja con velas
// (un precio por día), aquí hay precio de compra, de venta y el spread real
// del bróker, que es lo que de verdad se paga al abrir una operación.
//
// ⚠️ Esto NO reemplaza al barrido. /quotes da el instante actual, y la fuerza
// relativa, las EMAs, el RSI, el ATR y los setups necesitan cientos de días de
// historia. Son dos cosas distintas que conviven: el barrido dice QUÉ operar,
// esto dice a QUÉ precio está ahora mismo.
//
// La dirección sale de VITE_API_URL para poder cambiarla sin tocar el código:
// en desarrollo apunta al computador de uno, y el día que el puente viva en un
// servidor de verdad basta con cambiar esa variable y volver a publicar.
//
// El `?.` no sobra: en Vite `import.meta.env` siempre existe, pero este
// archivo también lo importa la prueba de `scripts/`, que corre en Node, y
// allí no existe. Es el mismo tropiezo que ya dio una vez con marketCalc.
const BASE = (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

const CADA_MS = 2000
// Más corto que el intervalo a propósito: si el puente no responde, la
// petición se cancela antes de que llegue la siguiente. Sin esto, con el
// servidor apagado se irían apilando peticiones muertas una encima de otra.
const LIMITE_MS = 1500

// MT5 nombra los pares sin barra y a veces con sufijo del bróker ('EURUSD',
// 'EURUSD.r', 'EURUSDm'). Se normaliza a 'EUR/USD', que es como los nombra la
// app en todas las demás pantallas.
function normalizarPar(sim) {
  const letras = String(sim || '').toUpperCase().replace(/[^A-Z]/g, '')
  if (letras.length < 6) return null
  return `${letras.slice(0, 3)}/${letras.slice(3, 6)}`
}

const pipDe = (par) => (par.includes('JPY') ? 0.01 : 0.0001)

// El puente lo escribió Néstor, así que su formato exacto puede cambiar. En
// vez de exigir una forma concreta se aceptan las razonables: una lista, una
// lista dentro de `quotes`/`data`, o un objeto con el par como llave. Los
// nombres de campo se buscan en minúscula y en mayúscula.
export function normalizarRespuesta(json) {
  let filas = []
  if (Array.isArray(json)) filas = json
  else if (Array.isArray(json?.quotes)) filas = json.quotes
  else if (Array.isArray(json?.data)) filas = json.data
  else if (json && typeof json === 'object') {
    filas = Object.entries(json).map(([sim, v]) => (v && typeof v === 'object' ? { symbol: sim, ...v } : null)).filter(Boolean)
  }

  const salida = {}
  for (const f of filas) {
    const par = normalizarPar(f.symbol ?? f.Symbol ?? f.par ?? f.pair ?? f.name)
    if (!par) continue

    const bid = Number(f.bid ?? f.Bid ?? f.BID)
    const ask = Number(f.ask ?? f.Ask ?? f.ASK)
    if (!Number.isFinite(bid) || !Number.isFinite(ask)) continue

    // El spread se calcula aquí aunque el puente mande uno propio: MT5 lo
    // reporta en "puntos", que en un bróker de 5 dígitos son diez veces un
    // pip. Sacarlo del bid y el ask deja siempre la misma unidad que usa el
    // resto de la app.
    salida[par] = {
      par,
      bid,
      ask,
      spread: (ask - bid) / pipDe(par),
      dec: par.includes('JPY') ? 3 : 5,
    }
  }
  return salida
}

// Devuelve las cotizaciones en vivo y en qué estado está la conexión.
//
//   estado: 'conectando' | 'ok' | 'sin-puente' | 'error'
//   quotes: { 'EUR/USD': { bid, ask, spread, dec }, … }
//
// `pares` limita qué se muestra; por defecto los 14 de la app.
export function useMT5Quotes({ pares = PAIR_NAMES, activo = true } = {}) {
  const [quotes, setQuotes] = useState({})
  const [estado, setEstado] = useState(activo ? 'conectando' : 'inactivo')
  const [error, setError] = useState(null)
  const [actualizadoEl, setActualizadoEl] = useState(null)
  // En una ref y no en el estado: sirve para no lanzar dos peticiones a la vez,
  // y meterlo en el estado provocaría un render por cada tic sin necesidad.
  const enVuelo = useRef(false)

  useEffect(() => {
    if (!activo) {
      setEstado('inactivo')
      return
    }

    let cancelado = false
    let temporizador = null

    const pedir = async () => {
      // Con la app en segundo plano no se pide nada: son 30 peticiones por
      // minuto, y en un celular eso es batería y datos gastados mirando una
      // pantalla que nadie tiene delante.
      if (document.visibilityState === 'hidden' || enVuelo.current) return
      enVuelo.current = true
      try {
        const r = await fetch(`${BASE}/quotes`, {
          signal: AbortSignal.timeout(LIMITE_MS),
          cache: 'no-store',
        })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const json = await r.json()
        if (cancelado) return

        const normalizadas = normalizarRespuesta(json)
        const filtradas = {}
        for (const p of pares) if (normalizadas[p]) filtradas[p] = normalizadas[p]

        setQuotes(filtradas)
        setActualizadoEl(new Date())
        setEstado(Object.keys(filtradas).length ? 'ok' : 'error')
        setError(Object.keys(filtradas).length ? null : 'El puente respondió, pero sin ninguno de los 14 pares.')
      } catch (e) {
        if (cancelado) return
        // No poder abrir la conexión (servidor apagado, o el celular buscando
        // un 127.0.0.1 que es él mismo) llega como TypeError o como corte por
        // tiempo. Se separa del resto porque tiene una explicación distinta
        // en pantalla: no es que el puente falle, es que no hay puente.
        const sinPuente = e.name === 'TypeError' || e.name === 'TimeoutError' || e.name === 'AbortError'
        setEstado(sinPuente ? 'sin-puente' : 'error')
        setError(e.message)
      } finally {
        enVuelo.current = false
      }
    }

    pedir()
    temporizador = setInterval(pedir, CADA_MS)
    // Al volver a la app se pide de inmediato en vez de esperar al siguiente
    // tic: si no, lo primero que se ve son los precios de cuando se salió.
    document.addEventListener('visibilitychange', pedir)

    return () => {
      cancelado = true
      clearInterval(temporizador)
      document.removeEventListener('visibilitychange', pedir)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `pares` es una lista fija; compararla por identidad reiniciaría el sondeo en cada render
  }, [activo])

  return { quotes, estado, error, actualizadoEl, base: BASE }
}
