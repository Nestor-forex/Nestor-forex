// Genera el reporte diario del barrido (Nestor Forex Swing) y lo imprime
// entre marcadores, para que la sesión de Claude que lo lee en los logs de
// GitHub Actions lo pueda extraer sin ambigüedad.
//
// Corre en GitHub Actions (con internet completo) porque el entorno normal
// de la sesión de Claude tiene bloqueado el acceso a api.frankfurter.dev.

import { computarBarrido, derivarVista } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import { limitaciones } from '../src/lib/fakeData.js'

function formatoChat({ fecha, monedas, pares, compras, ventas, vigilancia, setups, corte }) {
  const li = (xs) => (xs.length ? xs.map((x) => `• *${x.name}* — ${x.razon}`).join('\n') : '_Ninguno hoy._')
  const fuerza = monedas.map((m) => `${m.cod} ${m.score.toFixed(1)}`).join(' · ')

  return `📊 *Nestor Forex Swing* — ${fecha}
${corte}

*Fuerza relativa:* ${fuerza}

*Mejores para comprar:*
${li(compras)}

*Mejores para vender:*
${li(ventas)}

*En vigilancia:*
${li(vigilancia)}

*Setups del top:*
${
  setups.length
    ? setups
        .map((s) => `• *${s.name} ${s.lado}* — entrada ${s.entrada.split(' · ')[0]}, SL ${s.sl.split(' (')[0]}, TP ${s.tp} (R/B ${s.rr})`)
        .join('\n')
    : '_Sin setups limpios hoy._'
}

_Riesgo: 1-2% del capital por operación. ${limitaciones}_`
}

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave())
const data = computarBarrido(fechas, rates, rangosPar)
const vista = derivarVista(data, { thr: 0.5, topN: 3 })
const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

console.log('---REPORTE-INICIO---')
console.log(formatoChat({ fecha, ...vista }))
console.log('---REPORTE-FIN---')
