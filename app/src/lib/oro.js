// EL ORO (XAU/USD), y su correlación MEDIDA con los 14 pares.
//
// Las cuentas puras, sin React y sin red, para que sirvan igual desde Node
// (`scripts/publicar-oro.mjs`) y desde el navegador.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ POR QUÉ ESTA TARJETA NO ES SOLO UN PRECIO
// ─────────────────────────────────────────────────────────────────────────
// Enseñar «oro: 4.131, +0,4 % hoy» en una app de Forex sería la primera
// tarjeta decorativa del proyecto: un número que no dice nada sobre los pares
// y que **invita a que cada uno le ponga el significado que quiera**. Y el
// significado que se le pone solo es siempre el mismo — «el oro sube, así que
// hay miedo, así que compro francos» — que es una afirmación sobre el mercado
// que NADIE ha medido aquí.
//
// Así que en vez de afirmarla, se MIDE: la correlación del oro con cada uno de
// los 14 pares, con el mismo motor, la misma ventana de 60 sesiones y la misma
// disciplina que la correlación entre pares. Si el oro y el USD/CHF se mueven
// juntos, el número lo dice; si no, también.
//
// 📌 Es exactamente lo que hace creíble al resto de la app: no se cuenta la
// relación, se enseña el número y que cada quien saque su conclusión.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LA TRAMPA QUE ESTE ARCHIVO EXISTE PARA EVITAR: LAS FECHAS NO COINCIDEN
// ─────────────────────────────────────────────────────────────────────────
// El oro viene de UNA consulta y los 14 pares de OTRA. `obtenerVelas` deja
// solo los días que tienen dato en los catorce, así que su calendario ya está
// recortado. El del oro no: tiene sus propios festivos y sus propios huecos.
//
// Si se calcularan los cambios por POSICIÓN —el elemento 5 del oro contra el
// elemento 5 del par— bastaría un día de diferencia para que a partir de ahí
// se estuviera comparando el martes del oro con el miércoles del par. Y eso
// **no daría ningún error**: daría una correlación perfectamente plausible,
// calculada sobre días distintos. Es la misma familia que el ATR de cierre a
// cierre y que `CL`/`GOLD` de Twelve Data: un número correcto de una cosa
// distinta de la que uno cree estar midiendo.
//
// Por eso `correlConPares` INTERSECA las fechas primero, siempre, y se queda
// sin correlación antes que dar una mal alineada.

import { VENTANA_CORREL, cambiosDiarios, pearson } from './correlacion.js'

// El símbolo, elegido CON LA SONDA (`sonda-huecos.mjs`, 2026-09-29) y no de
// memoria. De seis candidatos probados, es el único que responde en el plan
// gratuito Y es de verdad una materia prima.
export const SIMBOLO_ORO = 'XAU/USD'

// ⚠️ LOS TIPOS QUE SÍ SON ORO, y esto no es paranoia: está medido.
//
// La sonda pidió `GOLD` y `CL` a Twelve Data y las dos contestaron **200 con
// cinco velas perfectamente válidas** — de una ACCIÓN de la bolsa de Nueva
// York que se llama así por casualidad (42,85 y 86,52). `WTI` resultó ser
// «W&T Offshore Inc.» y `BZ` una empresa china de reclutamiento.
//
// Un lector que aceptara «200 con velas» habría publicado «oro: 42,85»: con su
// fecha, su máximo y su mínimo, y completamente falso. **No se caza por el
// código de respuesta — se caza mirando `type`.**
export const TIPOS_DE_ORO = [/precious metal/i, /commodity/i]

// Cuántas velas se piden. Hacen falta `VENTANA_CORREL + 1` cierres para sacar
// 60 cambios, más margen para los días que el oro tenga y los pares no.
//
// 📌 NO cuesta un crédito extra pedir más: Twelve Data cobra por CONSULTA, no
// por vela. Está escrito así desde el 2026-08-09 y aquí se aprovecha.
export const VELAS_ORO = 120

// ⚠️ AQUÍ HABÍA UN `SERIE_ORO = 20` QUE PUBLICABA 20 CIERRES PARA UN GRÁFICO, Y
// SE QUITÓ ANTES DE QUE LLEGARA A PRODUCCIÓN. Queda escrito porque el motivo no
// es obvio y la idea va a volver.
//
// Primero, la razón general: **publicar un dato que nadie pinta es la misma
// clase de descuido que el tick volume**, que estuvo un día entero llegando a
// `estado/mt5.json` sin que ninguna pantalla lo mirara. Si nadie lo lee, no se
// publica.
//
// Y segundo, la razón propia de esta tarjeta, que es la que decide: el
// `Sparkline` de esta app **pinta verde si subió y rojo si bajó**. En un par
// eso significa dinero y está bien. En el oro diría «que el oro suba es
// bueno», que es exactamente la afirmación que esta tarjeta existe para NO
// hacer — ver el aviso de la cabecera y `Correlacion.jsx`.
//
// O sea que un gráfico del oro aquí pide un `Sparkline` NEUTRO, y eso es tocar
// un archivo GEMELO por un adorno. Si algún día se quiere, ése es el trabajo:
// primero el color, después el gráfico. No al revés.

// ¿Es de verdad oro lo que devolvió la API? Ver `TIPOS_DE_ORO`.
export function esOroDeVerdad(meta) {
  const tipo = String(meta?.type ?? '')
  return TIPOS_DE_ORO.some((re) => re.test(tipo))
}

/**
 * El cambio en tanto por uno entre el último cierre y el de `atras` sesiones
 * antes. `null` —nunca 0— si no hay suficientes datos o el divisor no sirve:
 * un 0 diría «no se movió», que es una afirmación. Misma decisión que
 * `pearson` en `correlacion.js`.
 */
export function cambio(closes, atras) {
  if (!Array.isArray(closes) || closes.length < atras + 1) return null
  const fin = closes[closes.length - 1]
  const ini = closes[closes.length - 1 - atras]
  if (!Number.isFinite(fin) || !Number.isFinite(ini) || ini === 0) return null
  return fin / ini - 1
}

/**
 * La correlación del oro con cada par, sobre los días que TIENEN LOS DOS.
 *
 * @param oro    Map de fecha → cierre del oro
 * @param pares  [{ name, porFecha }] donde `porFecha` es Map de fecha → cierre
 *
 * ⚠️ Ver la cabecera: las fechas se INTERSECAN y se ordenan antes de calcular
 * nada. Comparar por posición dos series con calendarios distintos devuelve un
 * número creíble y equivocado.
 *
 * ⚠️ Y se exige un mínimo de días comunes. Con cuatro días una correlación de
 * +0,95 no significa nada, y publicarla la pondría en pantalla con el mismo
 * aspecto que una de 60.
 */
export function correlConPares(oro, pares, { ventana = VENTANA_CORREL, minimo = 30 } = {}) {
  const out = {}
  if (!(oro instanceof Map) || !Array.isArray(pares)) return out

  for (const p of pares) {
    const porFecha = p?.porFecha
    if (!(porFecha instanceof Map)) continue

    // Los días que tienen dato en LOS DOS, en orden.
    const comunes = [...oro.keys()].filter((f) => porFecha.has(f)).sort()
    if (comunes.length < minimo + 1) continue

    // La ventana se recorta sobre los días COMUNES, no sobre cada serie por su
    // cuenta: si se recortara antes de intersecar, las dos ventanas podrían
    // acabar cubriendo periodos distintos.
    const usados = comunes.slice(-(ventana + 1))
    const r = pearson(
      cambiosDiarios(usados.map((f) => oro.get(f))),
      cambiosDiarios(usados.map((f) => porFecha.get(f))),
    )
    if (r == null) continue

    out[p.name] = { r: Number(r.toFixed(2)), n: usados.length - 1 }
  }
  return out
}

/**
 * Lo que se publica en `estado/oro.json`.
 *
 * ⚠️ NO DEVUELVE NINGÚN VEREDICTO. No hay `lado`, ni `riesgo`, ni «refugio»,
 * ni nada que diga qué hacer. El oro como FILTRO —«no comprar dólar si el oro
 * sube»— cambiaría las señales y tendría que pasar por el banco de pruebas con
 * su listón escrito antes, como el COT, que se midió y suspendió. Hay una
 * comprobación que falla si aparece un veredicto, para que añadirlo obligue a
 * venir aquí a borrarla a mano.
 */
export function prepararOro(oro, pares, ahora = new Date()) {
  const fechas = oro instanceof Map ? [...oro.keys()].sort() : []
  const closes = fechas.map((f) => oro.get(f))

  return {
    actualizadoEl: ahora.toISOString(),
    simbolo: SIMBOLO_ORO,
    // La fecha del ÚLTIMO dato, no la de la consulta. Igual que en las tasas y
    // en el COT: sin ella, un dato de hace tres días se lee como de hoy.
    fecha: fechas.length ? fechas[fechas.length - 1] : null,
    precio: closes.length ? closes[closes.length - 1] : null,
    cambio1: cambio(closes, 1),
    cambio20: cambio(closes, 20),
    correl: correlConPares(oro, pares),
  }
}

/**
 * Las correlaciones para la pantalla, ordenadas por tamaño ABSOLUTO.
 *
 * ⚠️ Por valor absoluto, igual que en `correlacion.js` y en `tasas.js`: un
 * −0,9 y un +0,9 dicen lo mismo de fuerte, solo cambia hacia qué lado.
 * Ordenar por valor dejaría al final justo las más negativas, que son tan
 * informativas como las positivas.
 */
export function correlOrdenada(datos, { minimo = 0.5 } = {}) {
  const correl = datos?.correl
  if (!correl || typeof correl !== 'object') return []
  return Object.entries(correl)
    .filter(([, v]) => typeof v?.r === 'number' && Math.abs(v.r) >= minimo)
    .map(([par, v]) => ({ par, ...v }))
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
}

// ¿Cuántos días tiene el dato? `null` si no se sabe — nunca 0.
export function diasDelOro(fecha, ahora = new Date()) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const ms = ahora.getTime() - new Date(fecha + 'T00:00:00Z').getTime()
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.floor(ms / 86_400_000))
}
