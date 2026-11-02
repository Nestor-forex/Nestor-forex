// EL HISTORIAL DEL COT, con la disciplina de «solo lo que se sabía ese día».
//
// Esto existe para UNA medición (`scripts/medir-cot.mjs`) y **no lo usa la
// app**. Néstor pidió la prueba «sin que por ahora me haga cambios en la app»,
// así que ningún archivo de `src/` importa esto.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO MÁS IMPORTANTE DE ESTE ARCHIVO: EL RETRASO DE PUBLICACIÓN
// ─────────────────────────────────────────────────────────────────────────
// Aquí es donde un backtest del COT hace trampa sin que nadie lo note, y la
// trampa sale PRECIOSA en la tabla:
//
//   · el informe lleva la fecha del MARTES en que se tomó la foto;
//   · pero la CFTC no lo publica hasta el VIERNES por la tarde (~19:30 UTC).
//
// O sea que el martes, el miércoles, el jueves y el viernes por la mañana ese
// informe **todavía no existe para nadie**. Un backtest que use la fila del
// martes para decidir el martes está mirando el futuro — tres días de futuro,
// todas las semanas, durante cinco años. Y no falla: devuelve un resultado
// perfectamente creíble y sistemáticamente demasiado bueno.
//
// Por eso la regla de aquí es **conservadora a propósito**:
//
//     un informe fechado T solo se puede usar desde T + 4 días.
//
// T+3 es el viernes, y ese día la publicación (19:30 UTC) llega DESPUÉS de la
// hora a la que decide el vigía de la app (15:50 UTC). Así que el viernes
// todavía no. T+4 es el sábado, y como las señales solo salen entre semana, en
// la práctica el informe del martes empieza a usarse **el lunes siguiente**:
// seis días después de la foto.
//
// ⚠️ Equivocarse hacia el lado conservador cuesta un poco de realismo; hacia el
// otro lado, cuesta una conclusión falsa. No son lo mismo, así que la regla no
// puede ser simétrica. Hay pruebas dedicadas solo a esto en
// `scripts/prueba-cot-historia.mjs`.
import {
  CONJUNTO,
  CONTRATOS,
  COLUMNAS,
  FAMILIAS,
  TIPO_INFORME,
  columnasDeFamilia,
  neto,
  num,
  pctDelInteres,
} from '../../src/lib/cot.js'
import { APP } from '../../src/lib/identidad.js'

// Ver arriba. No tocar sin leer el porqué.
export const DIAS_HASTA_PUBLICAR = 4

const DIA_MS = 86_400_000
const esFecha = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

// Días enteros de `a` a `b`, las dos en 'YYYY-MM-DD'. `null` si alguna no vale.
export function diasEntre(a, b) {
  if (!esFecha(a) || !esFecha(b)) return null
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()
  return Number.isFinite(ms) ? Math.round(ms / DIA_MS) : null
}

// ─────────────────────────────────────────────────────────────────────────
// Indexar el historial
// ─────────────────────────────────────────────────────────────────────────
//
// Devuelve `{ EUR: [{ f, pct, neto }, …], … }` ordenado de más viejo a más
// nuevo. Las filas que no son de nuestros contratos se ignoran, igual que en
// `leerFilas`: la respuesta puede traer cruces y colar uno sería medir el
// EUR/JPY creyendo que es el euro.
//
// `familia` elige de QUIÉN son las posiciones. Por defecto `'fondos'`, que es
// lo único que había hasta el 2026-11-02, para que todo lo medido antes siga
// dando exactamente el mismo número — hay una prueba que lo exige.
//
// ⚠️ Una familia desconocida REVIENTA (`columnasDeFamilia` lanza). No se cae a
// los fondos en silencio: ver el porqué en `src/lib/cot.js`.
export function indexarHistoria(filas, { familia = 'fondos' } = {}) {
  const porContrato = Object.fromEntries(Object.entries(CONTRATOS).map(([d, c]) => [c, d]))
  const [colLargos, colCortos] = columnasDeFamilia(familia)
  const out = {}

  for (const fila of Array.isArray(filas) ? filas : []) {
    const divisa = porContrato[String(fila?.market_and_exchange_names ?? '').trim()]
    if (!divisa) continue

    const f = String(fila?.report_date_as_yyyy_mm_dd ?? '').slice(0, 10)
    if (!esFecha(f)) continue

    const n = neto(num(fila?.[colLargos]), num(fila?.[colCortos]))
    const pct = pctDelInteres(n, num(fila?.open_interest_all))
    // Sin porcentaje la fila no sirve para nada aquí. Se salta en vez de
    // entrar como 0, que diría «no estaban posicionados» — una afirmación.
    if (pct == null) continue

    ;(out[divisa] ||= []).push({ f, pct, neto: n })
  }

  for (const divisa of Object.keys(out)) {
    out[divisa].sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0))
    // Una misma fecha repetida (no debería pasar con el informe fijado, pero
    // por si acaso) se queda con la última leída.
    out[divisa] = out[divisa].filter((r, i, arr) => i === arr.length - 1 || arr[i + 1].f !== r.f)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Lo que se sabía ese día
// ─────────────────────────────────────────────────────────────────────────
//
// El informe MÁS RECIENTE que ya estaba publicado el día `fecha`. `null` si
// ninguno lo estaba todavía — que es lo correcto al principio de la serie, y
// esas señales se quedan fuera de la medición en vez de contarse a favor.
export function cotConocidoEl(indice, divisa, fecha) {
  const serie = indice?.[divisa]
  if (!Array.isArray(serie) || !esFecha(fecha)) return null

  let mejor = null
  for (const r of serie) {
    const d = diasEntre(r.f, fecha)
    if (d == null) continue
    // ⚠️ El `>=` con DIAS_HASTA_PUBLICAR es la línea que impide mirar el
    // futuro. Ver la cabecera del archivo.
    if (d < DIAS_HASTA_PUBLICAR) break
    mejor = r
  }
  return mejor
}

// ─────────────────────────────────────────────────────────────────────────
// El sesgo del PAR
// ─────────────────────────────────────────────────────────────────────────
//
// ⚠️ CÓMO SE COMBINAN LAS DOS DIVISAS, QUE ES LA DECISIÓN QUE MÁS FÁCIL SE
// HACE MAL. Cada futuro del CME es esa divisa CONTRA EL DÓLAR:
//
//   · `neto%(EUR)` ya significa «cuán comprados están de euro contra dólar»;
//   · así que para EUR/USD el sesgo es, simplemente, `neto%(EUR)`;
//   · y para un cruce como EUR/JPY —que es comprar euro y vender yen— el
//     sesgo es `neto%(EUR) − neto%(JPY)`.
//
// De ahí sale la regla única: **sesgo = neto%(base) − neto%(cotizada), con el
// dólar valiendo 0.** El dólar vale 0 porque su lado ya está dentro del
// número de la otra divisa; sumarle además el índice del dólar sería contarlo
// dos veces.
//
// 📌 Por eso el índice del dólar NO se usa aquí aunque sí se enseñe en
// pantalla: en pantalla es información sobre el dólar, y aquí sería un
// doble conteo.
export function sesgoDePar(indice, base, cotizada, fecha) {
  const lado = (d) => {
    if (d === 'USD') return { pct: 0, f: null }
    return cotConocidoEl(indice, d, fecha)
  }
  const a = lado(base)
  const b = lado(cotizada)
  if (!a || !b) return null

  return {
    sesgo: a.pct - b.pct,
    // La fecha del informe MÁS VIEJO de los dos, para poder contar cuántos
    // días de retraso llevaba la decisión.
    fechaDato: [a.f, b.f].filter(Boolean).sort()[0] ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Bajar el historial de la CFTC
// ─────────────────────────────────────────────────────────────────────────
//
// ⚠️ NO GASTA CRÉDITOS DE TWELVE DATA: es la API pública de la CFTC, sin llave.
// (El script que llama a esto SÍ gasta créditos, pero por las velas, no por
// esto.)
const CABECERAS = {
  'User-Agent': `NestorForex-${APP}/1.0 (+https://github.com/Nestor-forex)`,
  Accept: 'application/json',
}

// ─────────────────────────────────────────────────────────────────────────
// ¿Existen las columnas que vamos a pedir?
// ─────────────────────────────────────────────────────────────────────────
//
// Socrata devuelve **400** si en `$select` va una columna que no existe, así
// que el fallo ya sería ruidoso. Esto existe por otra razón: para que el
// mensaje diga QUÉ nombres hay en vez de solo cuál falló.
//
// La diferencia no es cosmética. Los nombres de esta tabla son inconsistentes
// a propósito de la CFTC (`lev_money_positions_long` sin sufijo contra
// `nonrept_positions_long_all` con él), y la red de estas sesiones tiene
// `publicreporting.cftc.gov` BLOQUEADO, así que desde donde se programa no se
// puede comprobar ni uno. Sin esto, arreglar un nombre mal escrito costaría un
// viaje al workflow por intento.
//
// Pide UNA fila sin `$select`, o sea todas las columnas de un solo registro.
// No gasta nada y no es una medición: es mirar antes de pedir.
export async function descubrirColumnas() {
  const url = `https://publicreporting.cftc.gov/resource/${CONJUNTO}.json?$limit=1`
  const r = await fetch(url, { headers: CABECERAS, signal: AbortSignal.timeout(30_000) })
  if (!r.ok) throw new Error(`CFTC HTTP ${r.status} al descubrir columnas`)
  const filas = await r.json()
  if (!Array.isArray(filas) || !filas.length) throw new Error('la CFTC no devolvió ninguna fila')
  return Object.keys(filas[0])
}

// Comprueba que las columnas de cada familia estén de verdad. Devuelve la
// lista de las que faltan, con las candidatas parecidas al lado para que el
// mensaje sirva de algo.
export function familiasQueFaltan(disponibles, familias = Object.keys(FAMILIAS)) {
  const hay = new Set(Array.isArray(disponibles) ? disponibles : [])
  const faltan = []
  for (const familia of familias) {
    for (const col of columnasDeFamilia(familia)) {
      if (hay.has(col)) continue
      // El prefijo de la columna que falta (`nonrept_positions`), para poder
      // enseñar qué nombres parecidos SÍ existen.
      const raiz = col.split('_').slice(0, 2).join('_')
      faltan.push({
        familia,
        columna: col,
        parecidas: [...hay].filter((c) => c.startsWith(raiz)).sort(),
      })
    }
  }
  return faltan
}

// `familias` decide qué columnas de posiciones viajan en la respuesta. Por
// defecto solo los fondos, que es lo que había antes del 2026-11-02.
export async function bajarHistoria(desde = '2019-01-01', { familias = ['fondos'] } = {}) {
  const comillas = (s) => `'${String(s).replace(/'/g, "''")}'`
  // La unión de las columnas comunes y las de cada familia pedida, sin
  // repetir: una familia podría compartir columna con otra el día que se
  // añada una tercera.
  const columnas = [...new Set([...COLUMNAS, ...familias.flatMap(columnasDeFamilia)])]
  const url =
    `https://publicreporting.cftc.gov/resource/${CONJUNTO}.json` +
    `?$select=${columnas.join(',')}` +
    // El mismo informe que usa el publicador. Sin fijarlo, la CFTC devuelve
    // una de las dos versiones según le apetezca — ver `TIPO_INFORME`.
    `&$where=futonly_or_combined=${comillas(TIPO_INFORME)}` +
    ` AND market_and_exchange_names IN(${Object.values(CONTRATOS).map(comillas).join(',')})` +
    ` AND report_date_as_yyyy_mm_dd >= ${comillas(desde)}` +
    `&$order=report_date_as_yyyy_mm_dd ASC` +
    `&$limit=20000`

  const r = await fetch(url, { headers: CABECERAS, signal: AbortSignal.timeout(60_000) })
  if (!r.ok) throw new Error(`CFTC HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}
