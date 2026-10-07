// Baja el oro (XAU/USD) y lo publica en `estado/oro.json`, junto con su
// correlación MEDIDA con los 14 pares de la app.
//
//     node scripts/publicar-oro.mjs
//
// ─────────────────────────────────────────────────────────────────────────
// LO QUE CUESTA, DICHO SIN ADORNOS
// ─────────────────────────────────────────────────────────────────────────
// **15 créditos de los 800 del día**: 1 el oro y 14 los pares.
//
// El oro solo costaría 1. Los otros 14 son para la CORRELACIÓN, y esa es toda
// la diferencia entre una tarjeta que informa y una que decora: sin el número
// medido, «oro 4.131, +0,4 %» en una app de Forex no dice nada sobre ningún
// par e invita a que cada uno se invente la relación. Ver la cabecera de
// `src/lib/oro.js`.
//
// Gasto total de Swing al día: 14 (vigía) + 28 (publicar el barrido, dos
// corridas desde el 2026-10-07) + 7 (reporte) + 15 (esto) = 64 de
// 800. Queda sitio de sobra, y el banco de pruebas se lanza a mano.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ POR QUÉ VA APARTE DEL VIGÍA, aunque el vigía ya baje esos 14 pares
// ─────────────────────────────────────────────────────────────────────────
// Meterlo dentro ahorraría 14 créditos y pondría al oro a compartir guion con
// **lo único de este proyecto que no se puede volver a fabricar**: el
// historial de señales. El mismo motivo que el calendario, las tasas y el COT.
//
// Los dos errores no cuestan lo mismo:
//
//   · gastar 14 créditos de más → 64 de 800 en vez de 50. No cuesta nada.
//   · un fallo dentro del vigía → un día de historial que no vuelve.
//
// Así que la elección no es ajustada. Y de paso, este guion puede fallar,
// reintentarse y quedarse a medias sin que nada de lo importante se entere.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  SIMBOLO_ORO,
  VELAS_ORO,
  esOroDeVerdad,
  prepararOro,
  correlOrdenada,
} from '../src/lib/oro.js'
import { PARES, leerLlave, obtenerVelas } from './lib/velas.mjs'

const DESTINO = join(process.env.VIGIA_DATOS || 'datos', 'estado', 'oro.json')
const LIMITE_MS = 30_000

console.log('Oro (XAU/USD) — publicador')
console.log(`  símbolo: ${SIMBOLO_ORO} · ${VELAS_ORO} velas diarias`)

const llave = leerLlave()

// ── 1. El oro ────────────────────────────────────────────────────────────
const url =
  `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(SIMBOLO_ORO)}` +
  `&interval=1day&outputsize=${VELAS_ORO}&timezone=UTC&apikey=${llave}`

const r = await fetch(url, { signal: AbortSignal.timeout(LIMITE_MS) })
const j = await r.json().catch(() => null)

// ⚠️⚠️ UN SÍMBOLO FUERA DEL PLAN NO DA 403: DA 200 CON `status: "error"`.
// Comprobado con la sonda: `WTI/USD` contesta «This symbol is available
// starting with the Grow or Venture plan». Por eso se mira el cuerpo y no el
// código de respuesta.
if (!j || j.status === 'error' || !Array.isArray(j.values) || !j.values.length) {
  console.error('')
  console.error(`✗ Twelve Data no devolvió velas de ${SIMBOLO_ORO}.`)
  console.error(`  HTTP ${r.status} · code=${j?.code ?? '—'} · ${String(j?.message ?? '(sin mensaje)').slice(0, 300)}`)
  console.error('  NO se publica nada, para no machacar el archivo bueno anterior.')
  process.exit(1)
}

// ⚠️⚠️ Y AQUÍ SE COMPRUEBA QUE LO QUE LLEGÓ ES ORO, no una acción que se llama
// parecido. La sonda del 2026-09-29 pidió `GOLD` y `CL` y las dos contestaron
// 200 con cinco velas válidas de una ACCIÓN de la bolsa de Nueva York. La
// única diferencia visible era `type`.
if (!esOroDeVerdad(j.meta)) {
  console.error('')
  console.error(`✗ ${SIMBOLO_ORO} respondió, pero NO es una materia prima.`)
  console.error(`  meta: ${JSON.stringify(j.meta ?? {}).slice(0, 300)}`)
  console.error('  Publicar esto pondría el precio de otro activo bajo la palabra «oro».')
  console.error('  Ver TIPOS_DE_ORO en src/lib/oro.js y la sonda `sonda-huecos.mjs`.')
  process.exit(1)
}

const oro = new Map()
for (const v of j.values) {
  const f = String(v?.datetime ?? '').slice(0, 10)
  const c = Number(v?.close)
  if (/^\d{4}-\d{2}-\d{2}$/.test(f) && Number.isFinite(c)) oro.set(f, c)
}
console.log(`  oro: ${oro.size} cierres · type «${j.meta?.type}» · base «${j.meta?.currency_base ?? '?'}»`)

// ── 2. Los 14 pares, para la correlación ─────────────────────────────────
//
// ⚠️ LA PAUSA ANTES DE PEDIRLOS NO ES ADORNO, Y EL MOTIVO ES ARITMÉTICA.
//
// El plan gratuito de Twelve Data da **8 créditos por minuto**. Acabamos de
// gastar 1 en el oro, y `obtenerVelas` arranca pidiendo su primera tanda de 7
// SIN esperar: 1 + 7 = 8 en el mismo minuto, o sea **justo en el límite y sin
// un solo crédito de margen**. Si la ventana del servidor no empieza a contar
// exactamente donde nosotros creemos, eso es un 429.
//
// Y un 429 aquí no se ve venir: `obtenerVelas` se quedaría sin algunos pares,
// la correlación saldría con menos filas y la tarjeta se vería perfectamente
// bien. Es el mismo peligro que vigila el guardia de «ni una correlación»,
// pero a medias — y a medias no lo caza nadie.
//
// 65 segundos cuestan 65 segundos. El 429 cuesta una tarjeta que miente por
// omisión.
console.log('  esperando 65 s para no rozar el límite de 8 créditos por minuto…')
await new Promise((res) => setTimeout(res, 65_000))

console.log(`  bajando los ${PARES.length} pares para la correlación (2 tandas con pausa)…`)
const { rangosPar } = await obtenerVelas(llave, { velas: VELAS_ORO })

// `rangosPar` viene como fecha → { par: { h, l, c } }. La correlación necesita
// lo contrario: par → (fecha → cierre).
const pares = PARES.map((name) => {
  const porFecha = new Map()
  for (const [f, fila] of Object.entries(rangosPar)) {
    const c = fila?.[name]?.c
    if (Number.isFinite(c)) porFecha.set(f, c)
  }
  return { name, porFecha }
})
console.log(`  pares: ${pares.filter((p) => p.porFecha.size).length} con cierres`)

// ── 3. Publicar ──────────────────────────────────────────────────────────
const datos = prepararOro(oro, pares)

// ⚠️ SI NO SALE NI UNA CORRELACIÓN, NO SE PUBLICA.
//
// Es el caso que delata el fallo silencioso de este guion: las fechas del oro
// y las de los pares dejan de cruzarse (un cambio de formato, un huso, una
// columna renombrada) y `correlConPares` devuelve `{}` sin quejarse. El precio
// seguiría saliendo bien, así que en pantalla se vería una tarjeta correcta a
// la que «simplemente hoy no le salieron correlaciones» — indistinguible de un
// mercado tranquilo.
//
// Mismo peligro que vigila el respaldo del historial: lo grave no es que algo
// desaparezca, es que encoja en silencio.
const cuantas = Object.keys(datos.correl).length
if (!cuantas) {
  console.error('')
  console.error('✗ El oro llegó, pero NO salió ni una correlación con los 14 pares.')
  console.error('  Lo más probable: las fechas del oro y las de los pares dejaron de cruzarse.')
  console.error(`  Oro: ${oro.size} días, de ${[...oro.keys()].sort()[0]} a ${datos.fecha}.`)
  const f0 = pares[0]?.porFecha
  const fp = f0 ? [...f0.keys()].sort() : []
  console.error(`  ${PARES[0]}: ${fp.length} días, de ${fp[0]} a ${fp[fp.length - 1]}.`)
  console.error('  NO se publica nada, para no machacar el archivo bueno anterior.')
  process.exit(1)
}

const texto = JSON.stringify(datos)
mkdirSync(dirname(DESTINO), { recursive: true })
writeFileSync(DESTINO, texto)

const pct = (x) => (x == null ? '   —  ' : ((x >= 0 ? '+' : '') + (100 * x).toFixed(2) + ' %').padStart(9))
console.log('')
console.log(`  escrito: ${DESTINO} (${(texto.length / 1024).toFixed(2)} KB)`)
console.log(`  precio: ${datos.precio} (dato del ${datos.fecha})`)
console.log(`  cambio 1 día: ${pct(datos.cambio1)} · 20 días: ${pct(datos.cambio20)}`)
console.log('')

// Las correlaciones al log, de mayor a menor en valor absoluto. No es adorno:
// si un día la pantalla enseña algo raro, el log de ese día dice exactamente
// qué se publicó y sobre cuántos días.
console.log(`  correlación con los pares (${cuantas} de ${PARES.length}):`)
for (const c of correlOrdenada(datos, { minimo: 0 })) {
  console.log(`    ${c.par.padEnd(8)} ${(c.r >= 0 ? '+' : '') + c.r.toFixed(2)}   sobre ${c.n} días`)
}

// ⚠️ Un aviso, NO un fallo: el archivo es útil igual. Pero que salga en el log
// importa, porque una correlación sobre pocos días se ve en pantalla
// exactamente igual que una sobre sesenta.
const cortas = correlOrdenada(datos, { minimo: 0 }).filter((c) => c.n < 50)
if (cortas.length) {
  console.log('')
  console.log(`⚠ ${cortas.length} correlaciones salen de menos de 50 días comunes: ${cortas.map((c) => `${c.par}:${c.n}`).join(' · ')}`)
  console.log('  Si se repite, mirar si el calendario del oro y el de los pares se están separando.')
}
