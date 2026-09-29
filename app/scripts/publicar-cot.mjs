// Baja el COT (posiciones institucionales) de la CFTC y lo publica en
// `estado/cot.json`.
//
//     node scripts/publicar-cot.mjs
//
// ─────────────────────────────────────────────────────────────────────────
// LA FUENTE SE ELIGIÓ CON LA SONDA, no leyendo documentación
// ─────────────────────────────────────────────────────────────────────────
// `scripts/sonda-cot.mjs` corrió cuatro veces el 2026-09-14 y el resultado
// completo está en `app/CLAUDE.md`. La corta:
//
//   · de los QUINCE conjuntos que lista la CFTC, solo CINCO se consultan;
//     los otros diez dan 403 y son justo los de nombre legible;
//   · de esos cinco, `TFF_All` (`udgc-27he`) es el único vivo y con las ocho
//     divisas del barrido;
//   · `TFF_All` mezcla DOS informes y hay que fijar cuál — ver `TIPO_INFORME`
//     en `src/lib/cot.js`;
//   · y TRES de los ocho nombres de contrato que se habían escrito de memoria
//     estaban MUERTOS.
//
// ⚠️ NO GASTA NI UN CRÉDITO DE TWELVE DATA ni necesita ningún secreto: son
// datos públicos de un organismo oficial y Socrata responde sin llave. Por eso
// su workflow no lleva `env`.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ POR QUÉ VA APARTE DEL VIGÍA
// ─────────────────────────────────────────────────────────────────────────
// El mismo motivo que el calendario y las tasas: el vigía escribe el historial,
// que es lo ÚNICO de este proyecto que no se puede volver a fabricar. Un fallo
// bajando el COT no puede tener ni la posibilidad de tocarlo.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { APP } from '../src/lib/identidad.js'
import {
  COLUMNAS,
  CONJUNTO,
  CONTRATOS,
  MINIMO_PERCENTIL,
  SEMANAS_HISTORIA,
  TIPO_INFORME,
  diasDelDato,
  divisasOrdenadas,
  prepararCot,
  ventanaDesigual,
} from '../src/lib/cot.js'

const DESTINO = join(process.env.VIGIA_DATOS || 'datos', 'estado', 'cot.json')
const LIMITE_MS = 30_000

// En Socrata, una comilla dentro de un texto se escapa doblándola. Ninguno de
// los ocho contratos lleva comillas hoy, pero el día que la CFTC renombre uno
// no queremos que la consulta se rompa de una forma rara.
const comillas = (s) => `'${String(s).replace(/'/g, "''")}'`

// ⚠️ SE PIDEN VARIAS SEMANAS, NO SOLO LA ÚLTIMA, y no es por capricho: si una
// semana la CFTC no publica un contrato, con una sola semana esa divisa
// desaparecería de la pantalla. Así se enseña su último dato con SU fecha, que
// es lo honesto. `leerFilas` se queda con la más reciente de cada una.
//
// ⚠️ DE 10 SEMANAS A 156 (cambiado el 2026-09-29). Hasta esa fecha se pedían
// diez, que bastan para el último dato y NO bastan para saber si ese dato es
// mucho o es normal. Con tres años sale el PERCENTIL, que es la diferencia
// entre «+19,2 % en AUD» —que no dice nada— y «la posición más comprada de los
// últimos tres años».
//
// ⚠️⚠️ Y 156 NO SE PUEDE SUBIR SIN MÁS. Está medido con la sonda del
// 2026-09-29: con 156 los ocho contratos traen 156 informes cada uno (ventana
// idéntica, comparables); con 520 la respuesta trae 687 informes de cinco
// contratos y solo 242 de GBP, NZD y USD — los tres que la CFTC renombró en
// febrero de 2022. `$limit` es un tope GLOBAL de filas, no por contrato, así
// que los de historial largo se comen el presupuesto. Eso no da error: da
// percentiles de dos años al lado de percentiles de trece. Ver
// `SEMANAS_HISTORIA` en `src/lib/cot.js` y la comprobación de `ventanaDesigual`.
//
// No cuesta un crédito ni un secreto: es el mismo organismo público y la misma
// dirección. La descarga pasa de 29 KB a 449 KB, medio segundo, y la baja el
// runner una vez al día — lo que viaja al teléfono sigue siendo pequeño, porque
// la historia se resume aquí en un percentil y no se publica.
const SEMANAS = SEMANAS_HISTORIA
const TOPE = Object.keys(CONTRATOS).length * SEMANAS

const URL =
  `https://publicreporting.cftc.gov/resource/${CONJUNTO}.json` +
  `?$select=${COLUMNAS.join(',')}` +
  // ⚠️⚠️ `futonly_or_combined` FIJADO. Sin esto la CFTC devuelve una de las dos
  // versiones del informe según le apetezca, y no falla: devuelve un número
  // plausible del informe que no era. Ver `TIPO_INFORME` en `src/lib/cot.js`.
  `&$where=futonly_or_combined=${comillas(TIPO_INFORME)}` +
  ` AND market_and_exchange_names IN(${Object.values(CONTRATOS).map(comillas).join(',')})` +
  `&$order=report_date_as_yyyy_mm_dd DESC` +
  `&$limit=${TOPE}`

async function bajar() {
  const r = await fetch(URL, {
    // Sin User-Agent algunos servidores devuelven 403 aunque el dato sea
    // público. Se pone uno honesto: no se disfraza de navegador.
    headers: {
      'User-Agent': `NestorForex-${APP}/1.0 (+https://github.com/Nestor-forex)`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(LIMITE_MS),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}

console.log('COT (posiciones institucionales) — publicador')
console.log(`  conjunto: ${CONJUNTO} · informe: ${TIPO_INFORME}`)
console.log(`  fuente: ${URL}`)

const filas = await bajar()
console.log(`  bajadas: ${Array.isArray(filas) ? filas.length : 0} filas`)

const datos = prepararCot(filas)
const cuantas = Object.keys(datos.divisas).length

// ⚠️ SI FALTA ALGUNA DE LAS OCHO, NO SE PUBLICA NADA.
//
// Y aquí el motivo es MÁS fuerte que en las tasas, porque el fallo que esto
// caza ya ha ocurrido: **la CFTC renombra contratos**. Tres de los ocho
// nombres que se escribieron la primera vez estaban muertos. Cuando eso pase
// otra vez, el contrato viejo dejará de tener filas y esta divisa se caerá de
// la pantalla **sin ningún error**. Nadie se enteraría.
//
// Fallar deja el archivo anterior intacto —que sigue siendo válido, porque el
// COT solo cambia una vez por semana— y manda un correo de fallo.
if (cuantas < 8) {
  const faltan = Object.keys(CONTRATOS).filter((d) => !datos.divisas[d])
  console.error('')
  console.error(`✗ La CFTC respondió pero solo trajo ${cuantas} de las 8 divisas.`)
  console.error(`  Faltan: ${faltan.join(', ')}`)
  for (const d of faltan) console.error(`    ${d} → se pidió «${CONTRATOS[d]}»`)
  console.error('  NO se publica nada, para no machacar el archivo bueno anterior.')
  console.error('')
  console.error('  LO MÁS PROBABLE ES QUE LA CFTC HAYA RENOMBRADO UN CONTRATO.')
  console.error('  Ya pasó: el NZD dejó de ser «NEW ZEALAND DOLLAR» y pasó a «NZ DOLLAR».')
  console.error('  Lanzar Actions → «Sonda del COT» y mirar la lista del ÚLTIMO informe:')
  console.error('  el nombre que no salga ahí está muerto, aunque siga en el histórico.')
  process.exit(1)
}

const texto = JSON.stringify(datos)
mkdirSync(dirname(DESTINO), { recursive: true })
writeFileSync(DESTINO, texto)

console.log(`  escrito: ${DESTINO} (${(texto.length / 1024).toFixed(2)} KB)`)
console.log(`  informe del: ${datos.fecha}`)

// Las ocho al log con sus números. No es adorno: si un día la pantalla enseña
// algo raro, el log de ese día dice exactamente qué se publicó.
console.log('')
console.log('  divisa   neto fondos      % del interés   cambio semana   dato del     percentil (n · mín…máx)')
for (const d of divisasOrdenadas(datos)) {
  const p = datos.percentiles?.[d.divisa]
  const cola = p
    ? `${p.pct.toFixed(1).padStart(6)}  (${p.n} sem · ${p.min}…${p.max})` +
      (p.esMaximo ? '  ← MÁXIMO de la ventana' : p.esMinimo ? '  ← MÍNIMO de la ventana' : '')
    : '   — (sin suficiente historia)'
  console.log(
    `    ${d.divisa}   ${String(d.fondosNeto).padStart(12)}` +
      `   ${d.fondosPct.toFixed(1).padStart(10)} %` +
      `   ${String(d.cambioNeto ?? '—').padStart(10)}` +
      `      ${d.f}   ${cola}`,
  )
}

// ⚠️⚠️ LA VENTANA TIENE QUE SER LA MISMA PARA LAS OCHO, y esto lo vigila.
//
// El fallo que caza está MEDIDO, no imaginado: `$limit` es un tope GLOBAL de
// filas, así que si se subiera `SEMANAS` demasiado, los cinco contratos con
// historial largo se comerían el presupuesto y GBP, NZD y USD —renombrados por
// la CFTC en febrero de 2022— se quedarían cortos. Con 520 semanas salían 687
// informes contra 242.
//
// Eso no da ningún error: pondría un percentil de dos años al lado de uno de
// trece en la misma pantalla. Es un aviso y no un fallo porque el archivo sigue
// siendo útil (los niveles son correctos), pero hay que enterarse el día que
// pase y no ocho meses después.
if (ventanaDesigual(datos.percentiles)) {
  const ns = Object.entries(datos.percentiles).map(([d, p]) => `${d}:${p.n}`)
  console.log('')
  console.log('⚠ VENTANAS DESIGUALES entre divisas: ' + ns.join(' · '))
  console.log('  Los percentiles NO son comparables entre sí así.')
  console.log(`  Lo más probable: SEMANAS (${SEMANAS}) es demasiado alto y el tope de filas`)
  console.log('  se lo comen los contratos con historial largo. Bajarlo.')
}

// ⚠️ Un aviso, no un fallo: los niveles se publican igual. Que salga en el log
// importa porque la primera explicación no es «esa divisa es nueva» sino «se
// pidieron pocas semanas», y eso se arregla subiendo SEMANAS.
const sinPercentil = Object.keys(datos.divisas).filter((d) => !datos.percentiles?.[d])
if (sinPercentil.length) {
  console.log('')
  console.log(`⚠ Sin percentil (menos de ${MINIMO_PERCENTIL} semanas): ${sinPercentil.join(', ')}`)
  console.log(`  Se publican igual con su nivel. Si se repite, mirar SEMANAS (hoy ${SEMANAS}).`)
}

const dias = diasDelDato(datos.fecha)
console.log('')
console.log(`  el informe tiene ${dias} días.`)

// ⚠️ Un aviso, NO un fallo. El COT se publica los viernes con los datos del
// martes anterior, así que **entre 3 y 10 días es lo NORMAL** y no hay nada que
// arreglar. Pero tres semanas parado sería la CFTC dejando de publicar o el
// publicador roto, y eso conviene que salga en el log antes de que alguien lo
// busque.
if (dias != null && dias > 21) {
  console.log('')
  console.log(`⚠ El informe más reciente tiene ${dias} días, y lo normal son entre 3 y 10.`)
  console.log('  Comprobar que la CFTC sigue publicando y que el contrato no cambió de nombre.')
}
