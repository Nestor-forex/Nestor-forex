// ICHIMOKU KINKO HYO — la «nube»
//
// Néstor pidió medirlo el 2026-11-15, «igual que el FVG»: si de varios
// indicadores de tendencia alguno mide mejor, que el suscriptor lo pueda elegir
// en el Analizador. Este archivo es la matemática y la regla de entrada; el
// listón está en `scripts/lib/preregistro-ichimoku.mjs`, escrito antes.
//
// ─────────────────────────────────────────────────────────────────────────
// LAS CINCO LÍNEAS (definición estándar, 9 · 26 · 52)
// ─────────────────────────────────────────────────────────────────────────
//   · Tenkan-sen  = (máximo + mínimo de las últimas 9 velas) / 2
//   · Kijun-sen   = (máximo + mínimo de las últimas 26 velas) / 2
//   · Senkou A    = (Tenkan + Kijun) / 2, dibujada 26 velas HACIA DELANTE
//   · Senkou B    = (máximo + mínimo de las últimas 52 velas) / 2, ídem
//   · Chikou      = el cierre, dibujado 26 velas HACIA ATRÁS
// La «nube» (kumo) es el espacio entre Senkou A y Senkou B.
//
// ⚠️⚠️ LA NUBE DE HOY SE CALCULÓ HACE 26 VELAS. Es lo que más fácil se hace mal:
// si se usara la Senkou calculada HOY, la nube «de hoy» saldría con datos que en
// el gráfico se dibujan 26 velas a la derecha. No sería mirar el futuro (son
// datos pasados), pero sería OTRO indicador con el mismo nombre. Aquí la nube
// en la vela i sale de las velas que terminan en i − 26. Hay comprobación.
//
// ⚠️ Los números 9, 26 y 52 vienen del Japón de los años 30, con semanas de 6
// días de mercado. En Forex se usan igual por costumbre. No se tocan: cambiarlos
// después de medir sería ajustar la curva.

export const TENKAN = 9
export const KIJUN = 26
export const SENKOU_B = 52
export const DESPLAZAMIENTO = 26

const num = (x) => typeof x === 'number' && Number.isFinite(x)

/** (máximo + mínimo) / 2 de las `n` velas que terminan en `i`, o null. */
function puntoMedio(highs, lows, i, n) {
  if (i - n + 1 < 0 || i >= highs.length) return null
  let hi = -Infinity
  let lo = Infinity
  for (let j = i - n + 1; j <= i; j++) {
    if (!num(highs[j]) || !num(lows[j])) return null
    if (highs[j] > hi) hi = highs[j]
    if (lows[j] < lo) lo = lows[j]
  }
  return (hi + lo) / 2
}

/**
 * Las líneas en la vela `i`. La nube (`senA`, `senB`) es la que se VE en la
 * vela i, o sea la calculada en i − 26.
 *
 * @returns null si no hay velas suficientes (hacen falta 52 + 26 − 1 = 77 antes).
 */
export function ichimokuEn(highs, lows, i) {
  if (!Array.isArray(highs) || !Array.isArray(lows) || highs.length !== lows.length) return null
  const tenkan = puntoMedio(highs, lows, i, TENKAN)
  const kijun = puntoMedio(highs, lows, i, KIJUN)
  const j = i - DESPLAZAMIENTO
  const t0 = puntoMedio(highs, lows, j, TENKAN)
  const k0 = puntoMedio(highs, lows, j, KIJUN)
  const senB = puntoMedio(highs, lows, j, SENKOU_B)
  if ([tenkan, kijun, t0, k0, senB].some((x) => x === null)) return null
  const senA = (t0 + k0) / 2
  return { tenkan, kijun, senA, senB, techo: Math.max(senA, senB), suelo: Math.min(senA, senB) }
}

// ═════════════════════════════════════════════════════════════════════════
// LA REGLA DE ENTRADA — MATERIAL DE MEDICIÓN
// ═════════════════════════════════════════════════════════════════════════
//
// Tres disparos, nombrados por lo que hacen:
//
//   · `cruceFuerte`  la señal clásica «fuerte»: la Tenkan cruza POR ENCIMA de la
//                    Kijun HOY y el cierre está POR ENCIMA de la nube → COMPRA.
//                    Su espejo → VENTA. ← la CANDIDATA (ver el listón).
//   · `cruce`        el cruce Tenkan/Kijun solo, sin mirar la nube (información).
//   · `nube`         el cierre ATRAVIESA la nube hoy (ayer dentro o debajo, hoy
//                    encima) → COMPRA (información).
//
// Y el CONTROL: el mismo disparo de la candidata, operado al revés.
//
// ⚠️ El cierre de AYER sale del penúltimo valor de `serie20`, que son los
// últimos 20 cierres, y el de HOY de `p.c`. En producción el último de `serie20`
// y `p.c` coinciden.

function evento(p, disparo) {
  const H = p?.highs
  const L = p?.lows
  if (!Array.isArray(H) || !Array.isArray(L) || H.length !== L.length) return null
  const i = H.length - 1
  const hoy = ichimokuEn(H, L, i)
  const ayer = ichimokuEn(H, L, i - 1)
  if (!hoy || !ayer) return null
  const c = p.c
  const c1 = Array.isArray(p.serie20) && p.serie20.length >= 2 ? p.serie20.at(-2) : null
  if (!num(c)) return null

  const cruzaArriba = ayer.tenkan <= ayer.kijun && hoy.tenkan > hoy.kijun
  const cruzaAbajo = ayer.tenkan >= ayer.kijun && hoy.tenkan < hoy.kijun

  if (disparo === 'cruce') return cruzaArriba ? 'ALCISTA' : cruzaAbajo ? 'BAJISTA' : null
  if (disparo === 'cruceFuerte') {
    if (cruzaArriba && c > hoy.techo) return 'ALCISTA'
    if (cruzaAbajo && c < hoy.suelo) return 'BAJISTA'
    return null
  }
  if (disparo === 'nube') {
    if (!num(c1)) return null
    if (c1 <= ayer.techo && c > hoy.techo) return 'ALCISTA'
    if (c1 >= ayer.suelo && c < hoy.suelo) return 'BAJISTA'
    return null
  }
  return null
}

/**
 * La regla, con la firma que espera `generarSenales` (p, esc, thr).
 * ⚠️ No mira la fuerza relativa: sería otra regla con el mismo nombre.
 */
export const reglaIchimoku =
  ({ disparo = 'cruceFuerte', lectura = 'aFavor' } = {}) =>
  (p) => {
    const e = evento(p, disparo)
    if (!e) return null
    const aFavor = e === 'ALCISTA' ? 'COMPRA' : 'VENTA'
    if (lectura === 'aFavor') return aFavor
    return aFavor === 'COMPRA' ? 'VENTA' : 'COMPRA'
  }

/**
 * Orden para el corte de los N mejores: cuánto se separa la Tenkan de la Kijun,
 * medido en ATR. Sin esto la medición usaría el orden de la app (fuerza) y la
 * fila diría «Ichimoku» midiendo «Ichimoku desempatado por fuerza».
 */
export const ordenPorIchimoku = () => (p) => {
  const H = p?.highs
  const L = p?.lows
  if (!Array.isArray(H) || !num(p?.atrAbs) || !(p.atrAbs > 0)) return 0
  const x = ichimokuEn(H, L, H.length - 1)
  return x ? Math.abs(x.tenkan - x.kijun) / p.atrAbs : 0
}
