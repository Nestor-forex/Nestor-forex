// DOBLE de `scripts/lib/velas.mjs` para el humo. NO ES PRODUCCIÓN.
//
// Devuelve un mercado inventado con la forma exacta que devuelve el lector de
// verdad, para que un guion de medición se pueda correr entero sin red, sin
// llave y sin gastar un crédito de Twelve Data.
//
// ⚠️ NO SIRVE PARA SACAR CONCLUSIONES SOBRE LA APP, y está medido: el
// 2026-10-24 un barrido de 54 mercados inventados dijo que en Intradía
// restringir el universo no desplazaba señales, y con datos reales SÍ las
// desplazaba (178 de 3.942). Un mercado inventado da decenas de señales y el
// real da miles. Esto comprueba la PLOMERÍA, nada más.
import { PAIR_NAMES } from '../../../src/lib/pairs.js'

// ⚠️ SE ANUNCIA AL CARGARSE. Si un día se renombrara el módulo original, el
// hook dejaría de redirigir **en silencio** y el humo mediría contra la red de
// verdad. El humo cuenta estas marcas y falla si no son las dos.
globalThis.__DOBLES_DE_HUMO = (globalThis.__DOBLES_DE_HUMO ?? 0) + 1

const CCY = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']

export function leerLlave() {
  return 'llave-de-mentira'
}

// Azar DETERMINISTA: con `Math.random` una prueba que falla no se puede
// repetir, y entonces no es una prueba.
function azarador(semilla = 7) {
  let s = semilla
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

// ⚠️ EL MERCADO INVENTADO NECESITA DOS COSAS A LA VEZ, y costó aprenderlo:
// una ONDA con fase propia por divisa para que haya divergencia de fuerza (sin
// ella ningún par pasa el umbral y la prueba pasaría comparando listas vacías)
// y un PASEO para que haya retrocesos que muevan el RSI (sin él se queda
// clavado arriba y el filtro rechaza todas las señales).
export async function obtenerVelas(_llave, { velas = 1500 } = {}) {
  const azar = azarador()
  const dias = Math.min(velas, 1500)

  const fechas = []
  // Empieza un lunes (2022-01-03) para que los días de semana caigan donde
  // toca: la rejilla limpia quita sábados y funde domingos, y una serie que
  // empiece en otro día dejaría el reparto por día de la semana torcido.
  for (let i = 0; i < dias; i++) {
    fechas.push(new Date(Date.UTC(2022, 0, 3 + i)).toISOString().slice(0, 10))
  }

  const nivel = { EUR: 0.92, GBP: 0.79, JPY: 150, CHF: 0.88, CAD: 1.36, AUD: 1.52, NZD: 1.64 }
  const fase = {}
  CCY.forEach((c, k) => (fase[c] = (k * 2 * Math.PI) / CCY.length))

  const rates = {}
  fechas.forEach((d, i) => {
    const fila = {}
    for (const c of CCY) {
      const onda = Math.sin(i / 45 + fase[c]) * 0.0012
      nivel[c] *= 1 + onda + (azar() - 0.5) * 0.004
      fila[c] = nivel[c]
    }
    rates[d] = fila
  })

  // ⚠️ EL PRECIO DEL PAR ES `q / b`, Y EL DÓLAR VALE 1 Y PUNTO. Las dos cosas
  // están escritas en CLAUDE.md como tropiezos del 2026-09-22: con la división
  // al revés, o haciendo oscilar el dólar, los cierres y los extremos se
  // desalinean menos de un 1 % y el resultado sale creíble y falso.
  const px = (par, d) => {
    const [b, q] = par.split('/')
    const vb = b === 'USD' ? 1 : rates[d][b]
    const vq = q === 'USD' ? 1 : rates[d][q]
    return vq / vb
  }

  // `rangosPar[fecha][par] = { h, l }` — la forma que devuelve el lector de
  // verdad, comprobada en `velas.mjs` y no supuesta. Con la forma mal,
  // `marketCalc` cae al `?? closes[i]` y mide sobre cierres llamándolo rangos.
  const rangosPar = {}
  fechas.forEach((d) => {
    const fila = {}
    for (const par of PAIR_NAMES) {
      const p = px(par, d)
      const a = 0.004 + azar() * 0.004
      fila[par] = { h: p * (1 + a), l: p * (1 - a) }
    }
    rangosPar[d] = fila
  })

  return { fechas, rates, rangosPar }
}
