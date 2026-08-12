// Vigía diario del barrido de swing.
//
// Hermano del de Nestor Forex Intradía, con una diferencia de fondo: aquí
// corre UNA VEZ AL DÍA, no cada hora. Trabaja con velas diarias, así que
// revisarlas cada hora sería pedir lo mismo veinticuatro veces.
//
// Hace tres cosas:
//   1. Anota las señales NUEVAS respecto a la revisión anterior. Ese archivo
//      ES el historial: sin él no hay forma de decir si la app acierta.
//   2. Manda un aviso al celular de quien los tenga activados.
//   3. Publica el barrido ya calculado, que es lo que lee la app.
//
// Lo tercero merece explicación. Antes la app pedía los precios ella misma a
// Frankfurter, que es gratis e ilimitado. Twelve Data no lo es: 8 consultas
// por minuto y 800 al día. Si cada persona que abre la app pidiera los 14
// pares, con un puñado de miembros se acabaría la cuota, y con dos abriéndola
// a la vez fallaría. Así que la consulta se hace UNA vez al día aquí, y la
// app lee el resultado. Sale igual de fresco —las velas diarias cambian una
// vez al día— y aguanta los miembros que hagan falta.
//
// Los datos NO se guardan en esta rama: van a la rama `datos`, para que el
// historial del código no quede sepultado bajo un commit diario.

import { fileURLToPath } from 'node:url'
import { computarBarrido, derivarVista } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { compararConAnterior, escribir, leerEstado, leerJsonl } from './lib/vigia-nucleo.mjs'
import { resolver, resumir } from './lib/resolver.mjs'

const DATOS = process.env.VIGIA_DATOS || fileURLToPath(new URL('../../datos-local', import.meta.url))
const ESTADO = `${DATOS}/estado/vigia.json`
const LOG_SENALES = `${DATOS}/historial/senales.jsonl`
const LOG_CORRIDAS = `${DATOS}/historial/corridas.jsonl`
// El barrido ya calculado, que es lo que lee la app. Ver el comentario de
// abajo sobre por qué la app no pide los precios ella misma.
const BARRIDO = `${DATOS}/estado/barrido.json`
const LOG_RESULTADOS = `${DATOS}/historial/resultados.jsonl`

const ahora = new Date()
const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave())
const data = computarBarrido(fechas, rates, rangosPar)
const vista = derivarVista(data, { thr: 0.5, topN: 3 })

const { actuales, nuevas } = compararConAnterior(vista.setups, leerEstado(ESTADO))

// Una línea por señal nueva, con los niveles tal como se los daríamos a
// Néstor. Es lo que después se compara contra lo que hizo el precio.
for (const { id, s } of nuevas) {
  const c = s.crudo
  escribir(
    LOG_SENALES,
    JSON.stringify({
      id,
      vistoEl: ahora.toISOString(),
      // El día de cierre con el que se calculó, no la fecha de hoy: si el
      // mercado no cotizó (fin de semana o festivo), son distintas y
      // confundirlas desalinearía el historial con los precios.
      cierre: data.ultima,
      par: s.name,
      lado: s.lado,
      tipo: s.tipo || 'tendencia',
      precio: c.precio,
      sl: c.sl,
      tp: c.tp,
      rr: Number(c.rr.toFixed(2)),
      pipRiesgo: Math.round(c.pipRiesgo),
      pipBeneficio: Math.round(c.pipBeneficio),
      rsi: c.rsi,
      atrPct: c.atrPct != null ? Number(c.atrPct.toFixed(3)) : null,
      tend: c.tend,
    }) + '\n',
    true
  )
}

escribir(
  LOG_CORRIDAS,
  JSON.stringify({
    en: ahora.toISOString(),
    cierre: data.ultima,
    total: actuales.length,
    nuevas: nuevas.length,
    disparo: process.env.GITHUB_EVENT_NAME || 'local',
  }) + '\n',
  true
)

escribir(
  ESTADO,
  JSON.stringify(
    { actualizadoEl: ahora.toISOString(), cierre: data.ultima, senales: actuales.map((x) => x.id) },
    null,
    2
  ) + '\n'
)

// Juzgar las señales de días anteriores: ¿llegaron a su objetivo o a su stop?
// Va DESPUÉS de anotar las nuevas (así una recién vista ya entra en la cuenta)
// y ANTES de los avisos, porque esto sí escribe en disco y los avisos no.
//
// Solo "ganada" y "perdida" son definitivas. Una "caducada" NO cierra el caso:
// significa "hoy no pude juzgarla", y eso puede cambiar mañana. Tratarla como
// definitiva fue justo lo que dejó el historial de swing en cero — las 8
// señales quedaron marcadas caducada por un error de nombre de campo y ya
// nunca se volvían a mirar, ni siquiera después de arreglarlo.
const previos = leerJsonl(LOG_RESULTADOS)
const yaJuzgadas = new Set(previos.filter((r) => r.resultado !== 'caducada').map((r) => r.clave))
const { resultados, abiertas, caducadas } = resolver(leerJsonl(LOG_SENALES), data, yaJuzgadas)

// Una caducada que ya estaba anotada no se vuelve a escribir: si no, cada
// corrida añadiría una línea repetida por cada señal vieja, para siempre.
const caducadasPrevias = new Set(previos.filter((r) => r.resultado === 'caducada').map((r) => r.clave))
for (const r of resultados) {
  if (r.resultado === 'caducada' && caducadasPrevias.has(r.clave)) continue
  escribir(LOG_RESULTADOS, JSON.stringify(r) + '\n', true)
}

// El barrido que va a leer la app. Se publica lo justo para que pueda pintar
// sus pantallas: `derivarVista` se sigue ejecutando en el navegador, porque
// necesita el idioma de cada persona y eso aquí no se sabe.
//
// No se guardan las 300 fechas ni las series completas —solo `serie20`, que
// es lo que dibuja el gráfico—: el archivo lo baja cada miembro cada vez que
// abre la app, así que conviene que pese poco.
//
// ⚠️ `highs` y `lows` se quitan a propósito. Son 300 números por par y solo
// los necesita el resolver, que corre aquí mismo. Dejarlos dentro llevaría el
// archivo de 9 KB a más de medio mega, y lo paga cada miembro cada vez que
// abre la app.
escribir(
  BARRIDO,
  JSON.stringify({
    generadoEl: ahora.toISOString(),
    ultima: data.ultima,
    raw: data.raw,
    esc: data.esc,
    // eslint-disable-next-line no-unused-vars -- highs/lows se descartan aquí
    pares: data.pares.map(({ highs, lows, ...resto }) => resto),
    ratesUSD: data.ratesUSD,
  }) + '\n'
)

// Avisos al celular. Va al FINAL y aislado, igual que en la app hermana: para
// cuando llegamos aquí el historial ya está escrito en disco, así que ni un
// fallo de red ni una clave mal puesta pueden costarnos esos datos, que son
// los que no se pueden recuperar después. El `import` es dinámico por lo
// mismo: si faltara `web-push`, el vigía tiene que seguir anotando igual.
let avisos = { estado: 'sin-senales-nuevas' }
if (nuevas.length) {
  try {
    const { enviarAvisos } = await import('./lib/push-envio.mjs')
    avisos = await enviarAvisos(nuevas)
  } catch (e) {
    avisos = { estado: 'error', detalle: e.message }
  }
}

console.log('---VIGIA-INICIO---')
console.log(`Corrida: ${ahora.toISOString()}`)
console.log(`Última vela diaria: ${data.ultima}`)
console.log(`Señales activas: ${actuales.length} · nuevas en esta revisión: ${nuevas.length}`)
if (nuevas.length) {
  for (const { s } of nuevas) {
    const c = s.crudo
    console.log(
      `  • ${s.name} ${s.lado} — entrada ${c.precio.toFixed(c.dec)}, SL ${c.sl.toFixed(c.dec)}, TP ${c.tp.toFixed(c.dec)} (R/B 1:${c.rr.toFixed(1)})`
    )
  }
} else {
  console.log('  (nada nuevo respecto a la revisión anterior)')
}
const resumen = resumir(leerJsonl(LOG_RESULTADOS))
console.log(
  `Señales juzgadas en esta revisión: ${resultados.length}` +
    ` · siguen abiertas: ${abiertas}` +
    (caducadas ? ` · caducadas: ${caducadas}` : '')
)
if (resumen.todas.total) {
  console.log(
    `Historial: ${resumen.todas.ganadas}/${resumen.todas.total} acertadas` +
      ` (${resumen.todas.acierto}%), ${resumen.todas.pips >= 0 ? '+' : ''}${resumen.todas.pips} pips`
  )
}
console.log(`Avisos al celular: ${JSON.stringify(avisos)}`)
console.log('---VIGIA-FIN---')
