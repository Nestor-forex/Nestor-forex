// LA REJILLA DIARIA DE SWING: ¿qué es esa vela que trae un cuarto de rango?
//
// Las cuentas puras, sin red. El guion de al lado (`medir-rejilla-diaria.mjs`)
// baja las velas; aquí vive lo que se calcula con ellas.
//
// ─────────────────────────────────────────────────────────────────────────
// LA PREGUNTA, Y QUÉ PARTE YA ESTABA CONTESTADA GRATIS
// ─────────────────────────────────────────────────────────────────────────
// Del `barrido.json` real de producción, sin gastar un crédito: en los 20
// máximos y mínimos que publica, **las posiciones 1, 8 y 15 —espaciadas
// exactamente 7— son sistemáticamente estrechas en los CATORCE pares**, con
// entre el 13 % y el 65 % del rango mediano de su par. Ninguna es plana.
//
// Eso dice que **una de cada siete velas de la serie con la que la app calcula
// contiene muy poco mercado**. Lo que NO dice es qué día es: el barrido
// descarta las 300 fechas al publicarse.
//
// Los 14 créditos compran exactamente eso: **las fechas**. Sin el día no se
// puede elegir entre los dos arreglos, y elegirlo a ojo sería ponerle nombre a
// algo que no se ha mirado.
//
// ⚠️ Lo que significa cada resultado posible está en el PREREGISTRO, con fecha
// anterior a estos números. Sin eso, cualquier número se lee como una
// confirmación de algo.

import { atrWilder } from '../../src/lib/marketCalc.js'

// El mismo ATR que usa la app: Wilder de 14.
//
// ⚠️⚠️ Y AQUÍ NO HAY VENTANA. El `atrWilder` de Swing recorre la serie
// ENTERA; el de Intradía arranca en `Math.max(1, n - 60)`. Este archivo **no
// reimplementa el ATR: llama al de la app**, que es lo único que garantiza que
// el número del diagnóstico sea el de la app y no uno parecido. En la app
// hermana ese mismo descuido dio 0,00032607 contra 0,00032576 — creíble y
// distinto.
export const PERIODO_ATR = 14

// El cojín del stop de la app: `sl = lo10 − 0,5 × ATR` para una compra.
export const COJIN_ATR = 0.5
// Cuántas velas mira ese nivel estructural.
export const VELAS_LO10 = 10
// La reversión de la sombra: `sl = c ∓ 1,5 × ATR`, o sea el ATR ES el stop.
export const ATR_REVERSION = 1.5

// Cuándo se considera que una vela es «estrecha»: por debajo de esta fracción
// del rango MEDIANO de su propio par.
//
// ⚠️ Se compara contra la mediana de SU par y no contra un número absoluto:
// un rango del 0,1 % es estrecho en GBP/JPY y normal en EUR/CHF. Y se usa la
// mediana, no la media, porque una vela de noticia mueve la media.
export const UMBRAL_ESTRECHA = 0.5

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * El día de la semana de una fecha `YYYY-MM-DD`, en UTC.
 *
 * ⚠️ `getUTCDay` y no `getDay`: con la hora local del que corre el guion, la
 * misma fecha cambiaría de día según dónde esté la máquina de GitHub. Ya
 * mordió en el calendario, donde el mismo instante cae el día 8 en Bogotá y el
 * 9 en Madrid.
 *
 * Devuelve `null` si no se entiende la fecha, nunca un día por defecto.
 */
export function diaDe(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) return null
  const t = Date.parse(fecha.slice(0, 10) + 'T00:00:00Z')
  if (!Number.isFinite(t)) return null
  return new Date(t).getUTCDay()
}

export const nombreDia = (d) => (d == null ? '—' : DIAS[d])

export function mediana(xs) {
  const v = (xs ?? []).filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return null
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2
}

/**
 * Los índices de las velas estrechas, y cómo se reparten por día de la semana.
 *
 * ⚠️ Devuelve el reparto ENTERO, no solo el día ganador. Si las estrechas
 * salieran repartidas entre tres días, no habría un día culpable y la
 * conclusión sería otra — y con solo el ganador impreso eso no se vería.
 */
export function velasEstrechas(fechas, highs, lows, { umbral = UMBRAL_ESTRECHA } = {}) {
  const n = Math.min(fechas?.length ?? 0, highs?.length ?? 0, lows?.length ?? 0)
  const rangos = []
  for (let i = 0; i < n; i++) {
    const r = highs[i] - lows[i]
    rangos.push(Number.isFinite(r) ? r : null)
  }
  const m = mediana(rangos)
  if (m == null || m <= 0) return null

  const idx = []
  const porDia = {}
  const totalPorDia = {}
  for (let i = 0; i < n; i++) {
    const d = diaDe(fechas[i])
    if (d != null) totalPorDia[d] = (totalPorDia[d] ?? 0) + 1
    if (rangos[i] == null || rangos[i] >= umbral * m) continue
    idx.push(i)
    if (d != null) porDia[d] = (porDia[d] ?? 0) + 1
  }
  return {
    n,
    idx,
    rangoMediano: m,
    rangoMedianoEstrechas: mediana(idx.map((i) => rangos[i])),
    porDia,
    totalPorDia,
    proporcion: idx.length / n,
  }
}

/**
 * ⚠️ EL DÍA CULPABLE, O `null`. No hay día por defecto.
 *
 * Pide que un solo día concentre la mayoría de las estrechas Y que casi todas
 * las velas de ese día sean estrechas. Las dos condiciones hacen falta:
 *   · sin la primera, un día con dos estrechas de veinte saldría culpable;
 *   · sin la segunda, el día más frecuente de la serie ganaría por ser el más
 *     frecuente, no por ser estrecho.
 */
export function diaCulpable(e, { concentracion = 0.7, densidad = 0.7 } = {}) {
  if (!e || !e.idx.length) return null
  let mejor = null
  for (const [d, c] of Object.entries(e.porDia)) {
    if (mejor == null || c > e.porDia[mejor]) mejor = Number(d)
  }
  if (mejor == null) return null
  const concentra = e.porDia[mejor] / e.idx.length
  const densa = e.porDia[mejor] / (e.totalPorDia[mejor] ?? 0)
  if (concentra < concentracion || !(densa >= densidad)) return null
  return { dia: mejor, nombre: nombreDia(mejor), concentra, densa }
}

/**
 * QUITAR: la vela estrecha sale de la serie.
 *
 * ⚠️ El salto del fin de semana NO se pierde. `atrWilder` mide el rango
 * verdadero contra el cierre ANTERIOR, así que al desaparecer la vela
 * estrecha el día siguiente se mide contra el cierre de antes de ella — el
 * salto pasa entero al día siguiente en vez de quedarse repartido.
 */
export function quitar(idx, fechas, highs, lows, closes) {
  const fuera = new Set(idx)
  const keep = fechas.map((_, i) => i).filter((i) => !fuera.has(i))
  return {
    fechas: keep.map((i) => fechas[i]),
    highs: keep.map((i) => highs[i]),
    lows: keep.map((i) => lows[i]),
    closes: keep.map((i) => closes[i]),
  }
}

/**
 * FUNDIR: la vela estrecha se junta con la SIGUIENTE — máximo de las dos,
 * mínimo de las dos, y el cierre de la siguiente.
 *
 * Es el arreglo fiel SI esas horas de mercado existieron de verdad y
 * pertenecen a la sesión siguiente.
 *
 * ⚠️ Una vela estrecha que sea la ÚLTIMA de la serie no tiene siguiente con la
 * que fundirse. Ahí se QUITA, y no es una excepción cómoda: dejarla sería
 * dejar exactamente la vela que la app usa para calcular hoy.
 */
export function fundir(idx, fechas, highs, lows, closes) {
  const n = fechas.length
  const fuera = new Set()
  const conHueco = new Map() // índice destino → índices que se le funden
  for (const i of idx) {
    if (i + 1 >= n) {
      fuera.add(i) // la última: no hay siguiente, se quita
      continue
    }
    fuera.add(i)
    const lista = conHueco.get(i + 1) ?? []
    lista.push(i)
    conHueco.set(i + 1, lista)
  }

  const out = { fechas: [], highs: [], lows: [], closes: [] }
  for (let i = 0; i < n; i++) {
    if (fuera.has(i)) continue
    const funde = conHueco.get(i) ?? []
    const hs = [highs[i], ...funde.map((j) => highs[j])].filter(Number.isFinite)
    const ls = [lows[i], ...funde.map((j) => lows[j])].filter(Number.isFinite)
    out.fechas.push(fechas[i])
    out.highs.push(hs.length ? Math.max(...hs) : highs[i])
    out.lows.push(ls.length ? Math.min(...ls) : lows[i])
    out.closes.push(closes[i]) // el cierre de la vela que se queda
  }
  return out
}

/**
 * Lo que la app calcularía con una serie dada: el ATR, el nivel estructural y
 * los DOS stops que existen en esta app.
 *
 * ⚠️ `lo10` se recalcula sobre la serie nueva a propósito. Al quitar velas,
 * las «10 últimas» abarcan más días de calendario, y ese nivel es la parte
 * grande del stop de la app (el ATR solo pone el 16,6 % de mediana). Dejar el
 * `lo10` viejo mediría medio efecto y lo llamaría el efecto.
 */
export function comoQuedaria(highs, lows, closes) {
  const n = Math.min(highs?.length ?? 0, lows?.length ?? 0, closes?.length ?? 0)
  if (n < PERIODO_ATR + 2) return null
  const atr = atrWilder(highs.slice(0, n), lows.slice(0, n), closes.slice(0, n), PERIODO_ATR)
  if (!Number.isFinite(atr) || atr <= 0) return null
  const cL = closes[n - 1]
  const lo10 = Math.min(...lows.slice(Math.max(0, n - VELAS_LO10), n))
  if (!Number.isFinite(cL) || !Number.isFinite(lo10)) return null
  return {
    velas: n,
    atr,
    lo10,
    cierre: cL,
    // El stop de la regla de la app, para una compra: del cierre al nivel de
    // 10 días, más medio ATR de cojín.
    stopApp: cL - lo10 + COJIN_ATR * atr,
    // El de la reversión, que corre en la sombra: el ATR entero, ×1,5.
    stopReversion: ATR_REVERSION * atr,
  }
}

const rel = (nuevo, viejo) =>
  Number.isFinite(nuevo) && Number.isFinite(viejo) && viejo !== 0 ? nuevo / viejo - 1 : null

/**
 * ⚠️⚠️ LA COMPARACIÓN QUE CONTESTA LA PREGUNTA.
 *
 * Calcula lo que la app tendría HOY y lo que tendría con cada uno de los dos
 * arreglos, y devuelve el cambio RELATIVO de cada número.
 *
 * ⚠️ Se devuelven LOS DOS arreglos, siempre. Medir solo uno y darlo por bueno
 * no deja saber si el otro salía mejor, y elegir después de ver la tabla es el
 * troceo a posteriori que este proyecto ya rechazó dos veces.
 */
export function compararArreglos(fechas, highs, lows, closes, opciones = {}) {
  const n = Math.min(
    fechas?.length ?? 0,
    highs?.length ?? 0,
    lows?.length ?? 0,
    closes?.length ?? 0
  )
  if (n < PERIODO_ATR + 3) return null

  const f = fechas.slice(0, n)
  const h = highs.slice(0, n)
  const l = lows.slice(0, n)
  const c = closes.slice(0, n)

  const estrechas = velasEstrechas(f, h, l, opciones)
  if (!estrechas) return null

  const hoy = comoQuedaria(h, l, c)
  if (!hoy) return null

  const salida = { n, estrechas, culpable: diaCulpable(estrechas, opciones), hoy, arreglos: {} }

  for (const [nombre, fn] of [
    ['quitar', quitar],
    ['fundir', fundir],
  ]) {
    const s = fn(estrechas.idx, f, h, l, c)
    const q = comoQuedaria(s.highs, s.lows, s.closes)
    salida.arreglos[nombre] = q
      ? {
          ...q,
          cambioATR: rel(q.atr, hoy.atr),
          cambioStopApp: rel(q.stopApp, hoy.stopApp),
          cambioStopReversion: rel(q.stopReversion, hoy.stopReversion),
        }
      : null
  }
  return salida
}
