import { costeEnPips, NIVELES_SWAP } from './costes.mjs'
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

// Las candidatas del día según el barrido de la app, tal cual. Se le pide a
// `derivarVista` para no reescribir aquí su lógica: si la app cambia, esto
// cambia con ella y no se separan en silencio.
function setupsDeLaApp(data, thr, topN, vista = {}) {
  // `incluirVentas: true` a propósito. La app tiene las ventas en pausa (ver
  // src/lib/reglas.js), pero el banco de pruebas TIENE que seguir viéndolas:
  // si la medición dejara de producirlas, no habría forma de comprobar si
  // algún día se arreglan, y la pausa se volvería permanente sin que nadie lo
  // hubiera decidido. Aquí se mide lo que la app PODRÍA hacer, no solo lo que
  // hace hoy.
  // `vista` deja mover los umbrales de la app —hoy solo el del RSI— SIN
  // duplicar aquí su lógica de selección. Si la copiara, un día las dos
  // versiones dirían cosas distintas y no sabríamos cuál creer. Vacío = la app
  // tal cual.
  return derivarVista(data, { thr, topN, incluirVentas: true, ...vista }).setups
}

// Las candidatas según una regla propia, para poder probar formas de entrar
// que la app hoy NO puede producir.
//
// Devuelve objetos con la misma forma que los de la app —{ name, lado, crudo }—
// para que el resto del motor no note la diferencia. `crudo` se arma con los
// mismos campos que pone `mkSetup`, porque las geometrías los leen de ahí.
function porReglaPropia(data, regla, thr, topN) {
  const salida = []
  for (const lado of ['COMPRA', 'VENTA']) {
    const suyos = data.pares
      .filter((p) => regla(p, data.esc, thr) === lado)
      // Igual que la app: primero los de mayor diferencia de fuerza.
      .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif))
      .slice(0, topN)

    for (const p of suyos) {
      salida.push({
        name: p.name,
        lado,
        crudo: {
          b: p.b,
          q: p.q,
          dec: p.dec,
          precio: p.c,
          res: p.hi20,
          sup: p.lo20,
          hi10: p.hi10,
          lo10: p.lo10,
          atrAbs: p.atrAbs,
          e50: p.e50,
          e100: p.e100,
          rsi: Math.round(p.rsiV),
          tend: p.tend,
          fuerzaB: data.esc[p.b],
          fuerzaQ: data.esc[p.q],
        },
      })
    }
  }
  return salida
}

/**
 * @param geometria  función (crudo, compra) → { sl, tp }. Por defecto la que
 *                   usa la app hoy, para que sin pedir nada esto mida la app
 *                   de verdad. Ver `geometrias.mjs`.
 * @param invertirVentas  cuando el barrido dice VENDER, apuntar la operación
 *                   al revés: COMPRAR ese par, con los niveles de compra de la
 *                   app. Es un diagnóstico, no una propuesta. Una señal que
 *                   pierde siempre no es una señal sin información: es una con
 *                   información y el signo cambiado, y eso se arregla distinto
 *                   que una que acierta a medias. Las compras se dejan igual.
 * @returns lista de señales en el mismo formato que escribe el vigía, lista
 *          para pasarle a `resolver.mjs`.
 */
export function generarSenales(
  fechas,
  rates,
  rangosPar,
  {
    calentamiento = 80,
    thr = 0.5,
    topN = 3,
    geometria = actual,
    invertirVentas = false,
    reglaEntrada = null,
    vista = {},
  } = {}
) {
  const senales = []
  let previas = new Set()
  // Fuerza de cada divisa día a día. Sirve para preguntar si una divisa ya
  // estaba débil hace una semana o si acaba de caerse hoy: una debilidad de un
  // día suele ser un susto que se deshace, y una de una semana es una
  // tendencia. Es la diferencia entre vender algo que sigue cayendo y vender
  // justo antes del rebote.
  const escPorDia = new Map()

  for (let i = calentamiento; i < fechas.length; i++) {
    const hasta = fechas.slice(0, i + 1)
    const data = computarBarrido(hasta, rates, rangosPar)
    escPorDia.set(i, data.esc)
    // De dónde salen las candidatas del día.
    //
    // Sin `reglaEntrada` se usa el barrido de la app tal cual, que es lo que
    // hay que medir por defecto. Con `reglaEntrada` se puede probar una forma
    // DISTINTA de decidir qué operar —por ejemplo comprar retrocesos, que la
    // app hoy no puede porque exige que el precio esté por encima de las dos
    // medias— sin tocar la app.
    //
    // Se ordenan por fuerza y se cortan igual que hace la app (top N por
    // lado), para que la comparación no cambie por el número de operaciones.
    const candidatos = reglaEntrada
      ? porReglaPropia(data, reglaEntrada, thr, topN)
      : setupsDeLaApp(data, thr, topN, vista)

    const ahora = new Set()
    for (const s of candidatos) {
      const id = `${s.name}|${s.lado}|tendencia`
      ahora.add(id)
      // Solo las NUEVAS, igual que el vigía: una señal que sigue viva tres
      // días es UNA operación, no tres. Contarla cada día inflaría el número
      // de operaciones y repetiría el mismo acierto o el mismo fallo.
      if (previas.has(id)) continue

      const c = s.crudo
      // El lado que se OPERA. Normalmente el que dice el barrido; con
      // `invertirVentas`, las ventas se dan la vuelta (ver el comentario de
      // arriba). El identificador se queda con el lado ORIGINAL para que dos
      // mediciones de la misma señal se puedan cruzar entre sí.
      const compra = invertirVentas ? true : s.lado === 'COMPRA'
      const lado = compra ? 'COMPRA' : 'VENTA'

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
        lado,
        // Lo que dijo el barrido, aunque se opere al revés. Sin esto no se
        // podría separar "las ventas invertidas" de las compras de verdad.
        ladoOriginal: s.lado,
        // Divisas del par, para poder mirar si la pérdida se concentra en
        // vender (o comprar) una divisa concreta.
        base: c.b,
        cotizada: c.q,
        // Fuerza de las dos divisas HOY y hace 5 días. Con esto se puede
        // exigir que la debilidad venga de antes en vez de ser de hoy.
        // `null` en los primeros días medidos, que no tienen 5 días detrás.
        fuerzaBase: c.fuerzaB,
        fuerzaCotizada: c.fuerzaQ,
        fuerzaBaseAntes: escPorDia.get(i - 5)?.[c.b] ?? null,
        fuerzaCotizadaAntes: escPorDia.get(i - 5)?.[c.q] ?? null,
        // Tendencia de fondo del par, para poder exigir que la operación vaya
        // a favor del movimiento largo y no en su contra.
        e50: c.e50,
        e100: c.e100,
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


// Cuenta el resultado de una lista de señales ya resueltas.
//
// Vive aquí y no en backtest.mjs porque de esta función salen TODOS los
// números con los que se decide si una regla se enciende o se apaga. Mientras
// estuvo dentro del script no se podía probar sin internet ni sin gastar
// créditos de la API: o sea que la cuenta que más pesa era la única sin
// comprobar. Ahora `prueba-backtest.mjs` la mide directamente.
export function medir(senales, porClave, { conSpread = false, swapPipsNoche = 0 } = {}) {
  let ganadas = 0
  let perdidas = 0
  let pips = 0
  let sinJuzgar = 0
  // Suma de resultados medidos en "veces el riesgo de ESA operación". Se
  // acumula operación por operación, no dividiendo el total de pips entre un
  // riesgo promedio: con riesgos distintos en cada par, el promedio daría un
  // número parecido pero no el correcto.
  let sumaR = 0

  for (const s of senales) {
    const r = porClave.get(`${s.id}@${s.vistoEl}`)
    if (!r || (r.resultado !== 'ganada' && r.resultado !== 'perdida')) {
      sinJuzgar++
      continue
    }
    // Los costes se pagan siempre, gane o pierda. En "veces el riesgo" pesan
    // menos cuanto más ancho sea el stop de esa operación concreta, así que se
    // calculan por operación y no como un descuento global al final.
    //
    // Las noches salen del resolver (`diasTardados`): una operación que se
    // resolvió al día siguiente pagó una noche, una que tardó tres semanas
    // pagó veintiuna. Por eso el swap castiga sobre todo a las que se quedan
    // colgadas, que es exactamente como funciona en la cuenta real.
    const costePips = conSpread ? costeEnPips(s.par, r.diasTardados ?? 0, swapPipsNoche) : 0
    const coste = costePips / s.pipRiesgo
    if (r.resultado === 'ganada') {
      ganadas++
      // Ganó: se llevó exactamente su relación riesgo/beneficio.
      sumaR += s.pipBeneficio / s.pipRiesgo - coste
    } else {
      perdidas++
      // Perdió: se fue al stop, o sea exactamente 1 riesgo.
      sumaR -= 1 + coste
    }
    pips += r.pips - costePips
  }

  const total = ganadas + perdidas
  return {
    total,
    ganadas,
    sinJuzgar,
    pips: Math.round(pips),
    acierto: total ? (ganadas / total) * 100 : null,
    // Lo que de verdad importa: cuánto se gana o se pierde POR CADA UNIDAD DE
    // RIESGO. Los pips sueltos engañan —100 pips en GBP/JPY no son 100 pips en
    // EUR/CHF— y además dos geometrías con riesgos distintos no se pueden
    // comparar en pips. Esto sí: es el número que dice si el sistema gana.
    //
    // Y es lo que Néstor nota en la cuenta: como el lote se calcula para
    // arriesgar siempre el mismo dinero, +0.20 por operación significa ganar
    // un 20% de lo que se arriesga en cada una, sea el par que sea.
    porRiesgo: total ? sumaR / total : null,
  }
}

/**
 * El barrido de swap: cuánto duran las operaciones de una regla y cuánto se
 * lleva el swap a cada nivel.
 *
 * ⚠️ POR QUÉ ESTO IMPORTA MÁS EN SWING QUE EN INTRADÍA. Aquí una operación
 * dura una docena de días de mediana, o sea que paga una docena de noches. A
 * 0,5 pips por noche son 6 pips por operación, y sobre un riesgo típico de
 * unos 60 pips eso es 0,10 por unidad de riesgo — suficiente para borrar del
 * mapa una regla que parecía ganar +0,09.
 *
 * Hasta ahora esto solo se medía sobre las señales de la app. La regla de
 * reversión, que es la ÚNICA candidata a ganar dinero, nunca se había medido
 * pagando swap. Por eso la cuenta vive aquí y no dentro del script: para
 * poder aplicársela a cualquier regla, y para poder probarla sin internet.
 *
 * @returns { total, mediana, media, filas } — `filas` trae una entrada por
 *          nivel de NIVELES_SWAP con su medición y su coste medio en pips.
 */
export function barridoSwap(senales, porClave, niveles = NIVELES_SWAP) {
  const resueltas = []
  for (const s of senales) {
    const r = porClave.get(`${s.id}@${s.vistoEl}`)
    if (!r || (r.resultado !== 'ganada' && r.resultado !== 'perdida')) continue
    // En swing cada vela ES un día, así que los días que tardó son las noches
    // que se pagaron. En la app hermana no vale esta cuenta: allí depende de
    // la HORA de entrada y hay que mirar los cortes reales.
    resueltas.push({ par: s.par, noches: r.diasTardados ?? 0 })
  }

  const total = resueltas.length
  const dias = resueltas.map((x) => x.noches).sort((a, b) => a - b)
  const mediana = total ? dias[Math.floor(total / 2)] : 0
  const media = total ? dias.reduce((a, b) => a + b, 0) / total : 0

  const filas = niveles.map((nivel) => {
    const sumaCoste = resueltas.reduce((a, x) => a + costeEnPips(x.par, x.noches, nivel), 0)
    return {
      nivel,
      medicion: medir(senales, porClave, { conSpread: true, swapPipsNoche: nivel }),
      costeMedio: total ? sumaCoste / total : 0,
    }
  })

  return { total, mediana, media, filas }
}
