// Vigía diario del barrido de swing.
//
// Hermano del de Nestor Forex Intradía, con una diferencia de fondo: aquí
// corre UNA VEZ AL DÍA, no cada hora. Los precios vienen del Banco Central
// Europeo y solo cambian una vez al día, así que revisarlos cada hora sería
// pedir lo mismo veinticuatro veces.
//
// Hace dos cosas:
//   1. Anota las señales NUEVAS respecto a la revisión anterior. Ese archivo
//      ES el historial: sin él no hay forma de decir si la app acierta.
//   2. Manda un aviso al celular de quien los tenga activados.
//
// Los datos NO se guardan en esta rama: van a la rama `datos`, para que el
// historial del código no quede sepultado bajo un commit diario.

import { fileURLToPath } from 'node:url'
import { computarBarrido, derivarVista } from '../src/lib/marketCalc.js'
import { compararConAnterior, escribir, leerEstado } from './lib/vigia-nucleo.mjs'

const DATOS = process.env.VIGIA_DATOS || fileURLToPath(new URL('../../datos-local', import.meta.url))
const ESTADO = `${DATOS}/estado/vigia.json`
const LOG_SENALES = `${DATOS}/historial/senales.jsonl`
const LOG_CORRIDAS = `${DATOS}/historial/corridas.jsonl`

// Misma descarga que usa el reporte diario. Frankfurter no pide llave.
async function obtenerRates() {
  const f = (d) => d.toISOString().slice(0, 10)
  const ini = new Date(Date.now() - 220 * 864e5)
  const r = await fetch(
    `https://api.frankfurter.dev/v1/${f(ini)}..?base=USD&symbols=EUR,GBP,JPY,CHF,AUD,NZD,CAD`,
    { signal: AbortSignal.timeout(20_000) }
  )
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const j = await r.json()
  const fechas = Object.keys(j.rates).sort()
  return { fechas, rates: j.rates }
}

const ahora = new Date()
const { fechas, rates } = await obtenerRates()
const data = computarBarrido(fechas, rates)
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
      // El día de cierre con el que se calculó, no la fecha de hoy: si el BCE
      // no publicó (fin de semana o festivo), son distintas y confundirlas
      // desalinearía el historial con los precios.
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
console.log(`Último cierre del BCE: ${data.ultima}`)
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
console.log(`Avisos al celular: ${JSON.stringify(avisos)}`)
console.log('---VIGIA-FIN---')
