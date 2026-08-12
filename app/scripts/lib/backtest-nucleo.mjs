// El motor del banco de pruebas: qué señales habría dado la app cada día.
//
// Va aparte de `backtest.mjs` para poder comprobarlo sin internet: el script
// de arriba necesita descargar 300 días de velas reales, y esto se puede
// alimentar con datos de mentira desde `prueba-backtest.mjs`.
//
// La regla de oro está en `hasta`: para decidir el día i solo se entregan los
// días 0..i. Un indicador no puede ver el futuro porque el futuro no está en
// los datos que recibe. Es lo único que separa una medición de un cuento.

import { computarBarrido, derivarVista } from '../../src/lib/marketCalc.js'
import { actual } from './geometrias.mjs'

/**
 * @param geometria  función (crudo, compra) → { sl, tp }. Por defecto la que
 *                   usa la app hoy, para que sin pedir nada esto mida la app
 *                   de verdad. Ver `geometrias.mjs`.
 * @returns lista de señales en el mismo formato que escribe el vigía, lista
 *          para pasarle a `resolver.mjs`.
 */
export function generarSenales(
  fechas,
  rates,
  rangosPar,
  { calentamiento = 80, thr = 0.5, topN = 3, geometria = actual } = {}
) {
  const senales = []
  let previas = new Set()

  for (let i = calentamiento; i < fechas.length; i++) {
    const hasta = fechas.slice(0, i + 1)
    const data = computarBarrido(hasta, rates, rangosPar)
    const { setups } = derivarVista(data, { thr, topN })

    const ahora = new Set()
    for (const s of setups) {
      const id = `${s.name}|${s.lado}|tendencia`
      ahora.add(id)
      // Solo las NUEVAS, igual que el vigía: una señal que sigue viva tres
      // días es UNA operación, no tres. Contarla cada día inflaría el número
      // de operaciones y repetiría el mismo acierto o el mismo fallo.
      if (previas.has(id)) continue

      const c = s.crudo
      const compra = s.lado === 'COMPRA'

      // El stop y el objetivo se recalculan con la geometría que toque, en vez
      // de usar los que trae `crudo`. Todo lo demás —qué pares, qué lado, qué
      // día— sale igual que en la app: así lo único que cambia entre una
      // medición y otra es la geometría, que es lo que queremos comparar.
      const { sl, tp } = geometria(c, compra)
      const pip = c.dec === 2 ? 0.01 : 0.0001

      senales.push({
        id,
        vistoEl: fechas[i],
        cierre: fechas[i],
        par: s.name,
        lado: s.lado,
        tipo: 'tendencia',
        precio: c.precio,
        sl,
        tp,
        rr: Math.abs(tp - c.precio) / Math.abs(c.precio - sl),
        pipRiesgo: Math.round(Math.abs(c.precio - sl) / pip),
        pipBeneficio: Math.round(Math.abs(tp - c.precio) / pip),
        rsi: c.rsi,
        // Para la variante de "tierra de nadie": ¿queda algún nivel real por
        // delante, o el precio ya se salió del rango de los últimos 20 días?
        res: c.res,
        sup: c.sup,
      })
    }
    previas = ahora
  }

  return senales
}
