// DOBLE de `scripts/lib/cot-historia.mjs` para el humo. NO ES PRODUCCIÓN.
//
// Reexporta TODO lo de verdad y sustituye solo las dos funciones que salen a
// la red (`descubrirColumnas` y `bajarHistoria`). O sea que el indexado, la
// disciplina de fechas y el sesgo del par son los de producción: lo que se
// finge es la respuesta de la CFTC, no las cuentas.
//
// ⚠️ Eso es a propósito. Un doble que reimplementara `indexarHistoria` estaría
// comprobando el doble en vez del código.
import { CONTRATOS } from '../../../src/lib/cot.js'

// ⚠️ SE ANUNCIA AL CARGARSE. Si un día se renombrara el módulo original, el
// hook dejaría de redirigir **en silencio** y el humo mediría contra la red de
// verdad. El humo cuenta estas marcas y falla si no son las dos.
globalThis.__DOBLES_DE_HUMO = (globalThis.__DOBLES_DE_HUMO ?? 0) + 1

export {
  DIAS_HASTA_PUBLICAR,
  cotConocidoEl,
  diasEntre,
  familiasQueFaltan,
  indexarHistoria,
  sesgoDePar,
} from '../cot-historia.mjs'

// Todas las columnas que la tabla de verdad tiene para estas dos familias,
// más una de ruido para que `familiasQueFaltan` tenga algo que ignorar.
export async function descubrirColumnas() {
  return [
    'market_and_exchange_names',
    'report_date_as_yyyy_mm_dd',
    'open_interest_all',
    'lev_money_positions_long',
    'lev_money_positions_short',
    'asset_mgr_positions_long',
    'asset_mgr_positions_short',
    'change_in_lev_money_long',
    'change_in_lev_money_short',
    'nonrept_positions_long_all',
    'nonrept_positions_short_all',
    'dealer_positions_long_all',
  ]
}

// Un informe por semana, de martes, para las OCHO divisas y con las DOS
// familias dentro.
//
// ⚠️ Los pequeños se mueven al CONTRARIO de los fondos a propósito: así, si
// `indexarHistoria` ignorara la familia y leyera siempre la misma columna, las
// dos tablas saldrían idénticas y el humo lo cantaría. Es la misma defensa que
// el bloque 6 de `prueba-cot-historia.mjs`, pero de punta a punta.
export async function bajarHistoria(desde = '2019-01-01') {
  const filas = []
  const inicio = new Date(`${desde}T00:00:00Z`)
  // El primer martes a partir de `desde`.
  while (inicio.getUTCDay() !== 2) inicio.setUTCDate(inicio.getUTCDate() + 1)

  const divisas = Object.keys(CONTRATOS)
  const hoy = Date.now()
  let semana = 0
  for (const t = new Date(inicio); t.getTime() < hoy; t.setUTCDate(t.getUTCDate() + 7)) {
    const fecha = t.toISOString().slice(0, 10)
    divisas.forEach((d, k) => {
      // Una onda lenta por divisa, con fase propia, para que el sesgo cambie
      // de signo y los umbrales de 0 a 15 tengan todos algo que filtrar.
      const onda = Math.sin(semana / 11 + (k * 2 * Math.PI) / divisas.length)
      const oi = 500_000
      const netoFondos = Math.round(onda * 0.18 * oi) //  ±18 % del interés abierto
      const netoPeques = Math.round(-onda * 0.09 * oi) // al revés y la mitad
      filas.push({
        market_and_exchange_names: CONTRATOS[d],
        report_date_as_yyyy_mm_dd: `${fecha}T00:00:00.000`,
        open_interest_all: String(oi),
        lev_money_positions_long: String(Math.max(0, netoFondos)),
        lev_money_positions_short: String(Math.max(0, -netoFondos)),
        nonrept_positions_long_all: String(Math.max(0, netoPeques)),
        nonrept_positions_short_all: String(Math.max(0, -netoPeques)),
      })
    })
    semana++
  }
  return filas
}
