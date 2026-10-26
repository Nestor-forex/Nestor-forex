// Baja ~20 años de velas diarias y publica `estado/estacionalidad.json`.
//
// Néstor la pidió el 2026-10-26. El porqué y las dos preguntas que mide están
// en la cabecera de `src/lib/estacionalidad.js`; aquí va solo cómo se trae el
// dato y cuándo NO se publica.
//
// PRIMO, no gemelo. Swing necesita UNA descarga (velas diarias: de ahí salen el
// perfil por día de la semana Y los dos paneles por mes) e Intradía necesita
// DOS (H1 para el perfil por hora, diarias para los meses). Y Swing no tiene
// perfil por hora porque una vela ES un día.
//
// ⚠️ CUESTA 14 CRÉDITOS AL DÍA, los mismos que el vigía: los 14 pares en dos
// tandas de 7. Una petición de 5.000 velas cuesta lo mismo que una de 300 —el
// crédito se paga por petición, no por vela—, así que pedir veinte años de
// historia en vez de uno es gratis. Swing pasa de 64 a 78 de los 800.
//
// ⚠️ LAS VELAS VAN LIMPIAS, y aquí es donde más importa de todo el proyecto.
// `obtenerVelas` quita sábados y domingos por defecto desde el 2026-10-06. Sin
// eso, 5.000 velas crudas traen ~850 de fin de semana con el 27 % del recorrido
// normal, y el perfil por día de la semana sacaría **sábado y domingo como días
// reales**. No es un detalle de limpieza: es que el panel diría algo falso.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { PARES, leerLlave, obtenerVelas } from './lib/velas.mjs'
import { MIN_OBS, DIAS_HABILES, MESES, estacionalidadDe, casillaFloja } from '../src/lib/estacionalidad.js'

const DESTINO = join(process.env.VIGIA_DATOS || 'datos', 'estado', 'estacionalidad.json')

/**
 * 5.000 es el máximo por petición de Twelve Data.
 *
 * ⚠️ Son 5.000 velas DE CALENDARIO, no de mercado: la fuente manda también
 * sábados y domingos, y `limpiar` los quita. Así que lo que queda son ~3.570
 * sesiones, o sea **~14 años y no 20**. Lo escribí como 20 al diseñarlo y lo
 * destapó el humo.
 *
 * Consecuencia: la dirección por mes sale a ~14 observaciones y su margen es
 * de **±26**, no de ±22. Y el recorrido por mes a ~300 días, con margen chico,
 * que es lo que lo hace usable.
 *
 * 📌 Y NO merece la pena ir a buscar los 20 años paginando a 7 créditos por
 * página: pasar de ±26 a ±22 no cambia nada, porque las dos cifras dicen lo
 * mismo — que esa tabla no decide. Pedir menos de 5.000, en cambio, sí empeora
 * las dos sin ahorrar un crédito: el crédito se paga por petición.
 */
export const VELAS = 5000

/**
 * Por debajo de esto no se publica.
 *
 * ⚠️ No es para rechazar pares con poca historia —eso lo dice cada casilla con
 * su propio `n`— sino para cazar el fallo del guion: que la API devuelva 300
 * velas en vez de 5.000 porque cambió el plan o el parámetro. Eso NO daría
 * ningún error: daría una tabla mensual con una observación por mes, y en
 * pantalla se vería igual de bien. Es el mismo peligro que vigila el respaldo
 * del historial: lo grave no es que algo desaparezca, es que encoja en silencio.
 *
 * 1.000 sesiones son ~4 años: suficiente para que el perfil por día sea sólido
 * y para que el mensual al menos enseñe su margen honestamente.
 */
export const MIN_SESIONES = 1000

const r4 = (x) => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(4)) : null)

/** Deja una casilla lista para publicar, sin los decimales que nadie mira. */
function casillaPublicable(c) {
  return { n: c.n, medio: r4(c.medio), margen95: r4(c.margen95) }
}

function paquetePublicable(e) {
  const mapa = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, casillaPublicable(v)]))
  return {
    obs: e.obs,
    desde: e.desde,
    hasta: e.hasta,
    // En Swing nunca hay horas, así que no se publica la clave: un `null` en el
    // archivo invitaría a alguien a pintar una tabla vacía.
    dia: mapa(e.dia),
    mes: mapa(e.mes),
    mesDir: e.mesDir,
  }
}

const llave = leerLlave()
if (!llave) {
  console.error('✗ falta la llave de Twelve Data (secreto TWELVEDATA_KEY).')
  process.exit(1)
}

console.log(`Bajando ${VELAS} velas diarias de los ${PARES.length} pares (dos tandas, 14 créditos)…`)
const { fechas, rangosPar } = await obtenerVelas(llave, { velas: VELAS })

// ⚠️ `fechas` es la INTERSECCIÓN: solo los días que trajeron dato en los 14
// pares. Así todo queda comparable entre pares, y tiene una consecuencia que
// hay que tener delante al leer el log — **el par con menos historia marca el
// techo de todos**. Si un cruce solo tiene 8 años, el archivo entero tiene 8
// años y la tabla mensual sale a ±35 en vez de ±22 para los catorce.
console.log(`Sesiones comunes a los 14 pares: ${fechas.length} (${fechas[0]} → ${fechas[fechas.length - 1]})`)

if (fechas.length < MIN_SESIONES) {
  console.error(
    `\n✗ NO SE PUBLICA: solo ${fechas.length} sesiones y el mínimo es ${MIN_SESIONES}.\n` +
      `  Con tan poca historia la tabla mensual tendría un puñado de observaciones por mes\n` +
      `  y en pantalla se vería igual de bien. Mirar si la API devolvió menos velas de las\n` +
      `  pedidas, o qué par está limitando la intersección.`
  )
  process.exit(1)
}

const pares = {}
for (const name of PARES) {
  const velas = fechas.map((d) => {
    const v = rangosPar[d][name]
    return { t: new Date(`${d}T00:00:00Z`), h: v.h, l: v.l, c: v.c }
  })
  pares[name] = paquetePublicable(estacionalidadDe(velas))
}

const datos = {
  app: 'swing',
  generadoEl: new Date().toISOString(),
  sesiones: fechas.length,
  desde: fechas[0],
  hasta: fechas[fechas.length - 1],
  pares,
}

// Si por lo que sea no salió ni un par, no se machaca el archivo bueno de ayer.
// Mismo criterio que el publicador del oro y el del calendario: lo grave no es
// que falte, es que lo que había se sustituya por nada.
if (!Object.keys(datos.pares).length) {
  console.error('\n✗ NO SE PUBLICA: no salió ni un par.')
  process.exit(1)
}

const texto = JSON.stringify(datos)
mkdirSync(dirname(DESTINO), { recursive: true })
writeFileSync(DESTINO, texto)

// ── El informe, que es lo que de verdad se lee la primera vez ────────────────
const DIA = { 1: 'lun', 2: 'mar', 3: 'mié', 4: 'jue', 5: 'vie' }
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const pc = (x) => (x == null ? '    —' : `${x.toFixed(3)}%`.padStart(7))

console.log(`\n✓ ${DESTINO} · ${(texto.length / 1024).toFixed(1)} KB · ${fechas.length} sesiones\n`)

const ejemplo = pares['EUR/USD'] || pares[PARES[0]]
const nombre = pares['EUR/USD'] ? 'EUR/USD' : PARES[0]

console.log(`RECORRIDO POR DÍA DE LA SEMANA (${nombre}) — cuánto se mueve, no hacia dónde`)
for (const d of DIAS_HABILES) {
  const c = ejemplo.dia[d]
  console.log(`  ${DIA[d]}  ${pc(c.medio)}  ±${pc(c.margen95).trim()}  (n=${c.n})`)
}

console.log(`\nRECORRIDO POR MES (${nombre})`)
for (const m of MESES) {
  const c = ejemplo.mes[m]
  console.log(`  ${MES[m]}  ${pc(c.medio)}  ±${pc(c.margen95).trim()}  (n=${c.n})`)
}

console.log(`\n⚠ DIRECCIÓN POR MES (${nombre}) — la parte DÉBIL, y el margen dice por qué`)
for (const m of MESES) {
  const c = ejemplo.mesDir[m]
  const pct = c.pct == null ? '  —' : `${String(c.pct).padStart(3)}%`
  const mg = c.margen == null ? '' : ` ±${c.margen}`
  console.log(`  ${MES[m]}  ${pct}${mg.padEnd(6)} (${c.verdes} de ${c.n} meses)`)
}

// Las casillas que no se pueden leer se NOMBRAN, no se esconden. Lo normal es
// que todas las de dirección salgan flojas: con 20 años son 20 observaciones y
// `MIN_OBS` está en 20, así que caen justo en el borde.
const flojas = []
for (const [name, p] of Object.entries(pares)) {
  const n = [...Object.values(p.dia), ...Object.values(p.mes)].filter(casillaFloja).length
  if (n) flojas.push(`${name}:${n}`)
}
console.log(
  flojas.length
    ? `\n⚠ casillas de recorrido con menos de ${MIN_OBS} observaciones: ${flojas.join(' · ')}`
    : `\n✓ todas las casillas de recorrido pasan de ${MIN_OBS} observaciones`
)

const mesesPorDebajo = MESES.filter((m) => (ejemplo.mesDir[m].n || 0) < MIN_OBS).length
console.log(
  `⚠ dirección por mes: ${mesesPorDebajo} de 12 meses por debajo de ${MIN_OBS} observaciones. ` +
    `Es lo esperable y es el punto: esa tabla no decide nada.`
)
