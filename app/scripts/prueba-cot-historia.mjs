// Comprobaciones del historial del COT. SIN INTERNET.
//
//     node scripts/prueba-cot-historia.mjs
//
// ⚠️ LA MITAD DE ESTE ARCHIVO VIGILA UNA SOLA COSA: que la medición no mire el
// futuro. El informe lleva la fecha del martes y no se publica hasta el
// viernes por la tarde, así que usarlo el martes es mirar tres días adelante
// TODAS LAS SEMANAS durante cinco años. Y eso no falla: da un resultado
// creíble y sistemáticamente demasiado bueno. Es el fallo más caro que puede
// tener esta medición, porque llevaría a encender un filtro que no sirve.

import {
  DIAS_HASTA_PUBLICAR,
  cotConocidoEl,
  diasEntre,
  familiasQueFaltan,
  indexarHistoria,
  sesgoDePar,
} from './lib/cot-historia.mjs'
import { COLUMNAS, CONTRATOS, FAMILIAS, columnasDeFamilia } from '../src/lib/cot.js'
import { juzgarPequenos } from './lib/preregistro-cot-pequenos.mjs'

let hechas = 0
let fallos = 0
const ok = (cond, que) => {
  hechas++
  if (cond) return true
  fallos++
  console.error(`  ✗ ${que}`)
  return false
}

const fila = (divisa, fecha, oi, largos, cortos) => ({
  market_and_exchange_names: CONTRATOS[divisa],
  report_date_as_yyyy_mm_dd: `${fecha}T00:00:00.000`,
  open_interest_all: String(oi),
  lev_money_positions_long: String(largos),
  lev_money_positions_short: String(cortos),
})

// Tres martes seguidos. Los porcentajes salen redondos a propósito para que
// las comprobaciones digan qué esperan sin cuentas de por medio.
const MARTES = ['2026-08-25', '2026-09-01', '2026-09-08']
const HISTORIA = [
  fila('EUR', MARTES[0], 1000, 100, 0), //  +10 %
  fila('EUR', MARTES[1], 1000, 200, 0), //  +20 %
  fila('EUR', MARTES[2], 1000, 300, 0), //  +30 %
  fila('JPY', MARTES[0], 1000, 0, 50), //    −5 %
  fila('JPY', MARTES[1], 1000, 0, 100), //  −10 %
  fila('JPY', MARTES[2], 1000, 0, 150), //  −15 %
]

console.log('1. Los días entre dos fechas')
{
  ok(diasEntre('2026-09-08', '2026-09-12') === 4, 'del 8 al 12 son 4 días')
  ok(diasEntre('2026-09-08', '2026-09-08') === 0, 'el mismo día son 0')
  ok(diasEntre('2026-09-12', '2026-09-08') === -4, 'al revés sale negativo')
  ok(diasEntre('no', '2026-09-08') === null, 'una fecha ilegible es null')
  ok(diasEntre(null, '2026-09-08') === null, 'sin fecha es null')
  // Cambio de mes y año, que es donde una resta a mano se equivoca.
  ok(diasEntre('2026-12-29', '2027-01-02') === 4, 'cruza el fin de año bien')
}

console.log('2. Indexar el historial')
{
  const idx = indexarHistoria(HISTORIA)
  ok(Object.keys(idx).length === 2, `dos divisas, salieron ${Object.keys(idx).length}`)
  ok(idx.EUR.length === 3, `tres informes del euro, salieron ${idx.EUR.length}`)
  ok(idx.EUR[0].f === MARTES[0], 'ordenado de más viejo a más nuevo')
  ok(idx.EUR[2].f === MARTES[2], 'y el último es el más nuevo')
  ok(Math.abs(idx.EUR[2].pct - 30) < 0.001, `el último del euro es +30 % y salió ${idx.EUR[2].pct}`)
  ok(Math.abs(idx.JPY[2].pct + 15) < 0.001, `el último del yen es −15 % y salió ${idx.JPY[2].pct}`)

  // Un contrato que no es de los nuestros se ignora: si se colara un cruce,
  // se estaría midiendo el EUR/JPY creyendo que es el euro.
  const conRuido = [
    ...HISTORIA,
    { ...fila('EUR', MARTES[2], 1, 1, 0), market_and_exchange_names: 'WHEAT-SRW - CHICAGO BOARD OF TRADE' },
  ]
  ok(indexarHistoria(conRuido).EUR.length === 3, 'el trigo no entra como euro')

  // Una fila sin números no entra como 0 %.
  const sinNumeros = [{ ...fila('EUR', '2026-07-07', 0, 0, 0), open_interest_all: '' }]
  ok(Object.keys(indexarHistoria(sinNumeros)).length === 0, 'una fila sin interés abierto se salta')

  ok(Object.keys(indexarHistoria(null)).length === 0, 'con null devuelve {} sin reventar')
  ok(Object.keys(indexarHistoria([])).length === 0, 'con lista vacía devuelve {}')
}

console.log('3. ⚠️ LO QUE SE SABÍA ESE DÍA — la comprobación que impide mirar el futuro')
{
  const idx = indexarHistoria(HISTORIA)
  const pct = (fecha) => cotConocidoEl(idx, 'EUR', fecha)?.pct ?? null

  ok(DIAS_HASTA_PUBLICAR === 4, `el retraso debe ser de 4 días y es ${DIAS_HASTA_PUBLICAR}`)

  // El informe del martes 8 NO existe para nadie hasta el viernes 11 por la
  // tarde. El vigía de la app decide a las 15:50 UTC y la CFTC publica a las
  // 19:30, así que el viernes TAMPOCO.
  ok(pct('2026-09-08') === 20, 'el MARTES 8 todavía se ve el informe anterior (+20 %), no el de ese día')
  ok(pct('2026-09-09') === 20, 'el miércoles 9, igual')
  ok(pct('2026-09-10') === 20, 'el jueves 10, igual')
  ok(pct('2026-09-11') === 20, '⚠️ el VIERNES 11 TAMPOCO: la CFTC publica después de la hora del vigía')
  ok(pct('2026-09-12') === 30, 'el sábado 12 sí: ya está publicado')
  ok(pct('2026-09-14') === 30, 'y el lunes 14 también, que es cuando la app lo usaría de verdad')

  // Antes del primer informe publicado no hay nada, y eso NO puede leerse como
  // «0 %»: esas señales tienen que quedarse fuera de la medición.
  ok(cotConocidoEl(idx, 'EUR', '2026-08-01') === null, 'antes del primer informe devuelve null, no 0')
  ok(cotConocidoEl(idx, 'EUR', '2026-08-28') === null, 'el 28 de agosto el del 25 aún no estaba publicado')
  ok(cotConocidoEl(idx, 'EUR', '2026-08-29') !== null, 'el 29 sí (25 + 4 días)')

  ok(cotConocidoEl(idx, 'GBP', '2026-09-14') === null, 'una divisa que no está en el historial da null')
  ok(cotConocidoEl(null, 'EUR', '2026-09-14') === null, 'sin índice da null sin reventar')
  ok(cotConocidoEl(idx, 'EUR', 'no-es-fecha') === null, 'con una fecha ilegible da null')
}

console.log('4. El sesgo del par combina las dos divisas como debe')
{
  const idx = indexarHistoria(HISTORIA)
  const F = '2026-09-14' // ya publicado el informe del 8: EUR +30, JPY −15

  // EUR/USD: el dólar vale 0 porque el número del euro YA es «euro contra
  // dólar». Sumarle el índice del dólar sería contarlo dos veces.
  const eurusd = sesgoDePar(idx, 'EUR', 'USD', F)
  ok(Math.abs(eurusd.sesgo - 30) < 0.001, `EUR/USD debe ser +30 y salió ${eurusd.sesgo}`)

  // EUR/JPY: comprar euro Y vender yen.
  const eurjpy = sesgoDePar(idx, 'EUR', 'JPY', F)
  ok(Math.abs(eurjpy.sesgo - 45) < 0.001, `EUR/JPY debe ser 30 − (−15) = +45 y salió ${eurjpy.sesgo}`)

  // USD/JPY: el dólar delante. Comprar USD/JPY es vender yen, así que el sesgo
  // es el del yen con el signo cambiado.
  const usdjpy = sesgoDePar(idx, 'USD', 'JPY', F)
  ok(Math.abs(usdjpy.sesgo - 15) < 0.001, `USD/JPY debe ser 0 − (−15) = +15 y salió ${usdjpy.sesgo}`)

  // Y la fecha del dato viaja con él, para poder contar el retraso real.
  ok(eurjpy.fechaDato === '2026-09-08', `la fecha del dato debe ser el 8 y salió ${eurjpy.fechaDato}`)

  // Si falta una de las dos divisas, NO hay sesgo. Nunca 0: un 0 diría «los
  // fondos están neutros», que es una afirmación, y metería en la medición
  // señales sobre las que no se sabía nada.
  ok(sesgoDePar(idx, 'EUR', 'GBP', F) === null, 'si falta una divisa el sesgo es null, NO 0')
  ok(sesgoDePar(idx, 'EUR', 'JPY', '2026-08-01') === null, 'antes del primer informe, null')
}

console.log('5. El sesgo usa lo de ESE día, no lo último del historial')
{
  // La trampa más sutil: coger siempre el informe más reciente de la serie en
  // vez del más reciente CONOCIDO en esa fecha. Daría el mismo número para
  // todos los días del backtest y sería el futuro entero de golpe.
  const idx = indexarHistoria(HISTORIA)
  const enAgosto = sesgoDePar(idx, 'EUR', 'JPY', '2026-08-30')
  const enSeptiembre = sesgoDePar(idx, 'EUR', 'JPY', '2026-09-14')
  ok(enAgosto != null && enSeptiembre != null, 'las dos fechas dan sesgo')
  ok(
    Math.abs(enAgosto.sesgo - 15) < 0.001,
    `el 30 de agosto solo se conocía el informe del 25: 10 − (−5) = +15, y salió ${enAgosto.sesgo}`,
  )
  ok(
    enAgosto.sesgo !== enSeptiembre.sesgo,
    'el sesgo CAMBIA con la fecha: si fuera igual, estaría usando el futuro',
  )
}

// ─────────────────────────────────────────────────────────────────────────

console.log('6. ⚠️ LAS DOS FAMILIAS — que medir «los pequeños» no devuelva «los fondos»')
{
  // Una fila con las DOS familias dentro, y a propósito con números que no se
  // parecen: si `indexarHistoria` ignorara la familia, los dos índices darían
  // lo mismo y eso es justo lo que hay que poder distinguir.
  const dos = (divisa, fecha, oi, fl, fc, pl, pc) => ({
    market_and_exchange_names: CONTRATOS[divisa],
    report_date_as_yyyy_mm_dd: `${fecha}T00:00:00.000`,
    open_interest_all: String(oi),
    lev_money_positions_long: String(fl),
    lev_money_positions_short: String(fc),
    nonrept_positions_long_all: String(pl),
    nonrept_positions_short_all: String(pc),
  })
  //                               oi    fondos      pequeños
  const H = [dos('EUR', MARTES[0], 1000, 300, 0, /**/ 0, 200)]

  const f = indexarHistoria(H, { familia: 'fondos' })
  const p = indexarHistoria(H, { familia: 'pequenos' })
  ok(Math.abs(f.EUR[0].pct - 30) < 0.001, `los fondos salen +30 %, y salió ${f.EUR[0].pct}`)
  ok(Math.abs(p.EUR[0].pct - -20) < 0.001, `los pequeños salen −20 %, y salió ${p.EUR[0].pct}`)
  ok(f.EUR[0].pct !== p.EUR[0].pct, 'las dos familias dan números DISTINTOS sobre la misma fila')

  // ⚠️ ADITIVO: sin el parámetro tiene que dar EXACTAMENTE lo de antes del
  // 2026-11-02. Si esto cambiara, todos los números medidos hasta hoy dejarían
  // de ser comparables con los de mañana.
  const porDefecto = indexarHistoria(HISTORIA)
  const explicito = indexarHistoria(HISTORIA, { familia: 'fondos' })
  ok(
    JSON.stringify(porDefecto) === JSON.stringify(explicito),
    'sin familia da lo mismo que pidiendo `fondos`: el cambio es aditivo',
  )

  // ⚠️ Una familia desconocida REVIENTA. Es la decisión CONTRARIA a la
  // asimetría habitual del proyecto, y a propósito: caer en silencio a los
  // fondos daría la tabla de otro grupo con el rótulo equivocado.
  let revento = false
  try {
    indexarHistoria(H, { familia: 'minoristas-de-verdad' })
  } catch {
    revento = true
  }
  ok(revento, 'una familia que no existe LANZA en vez de caer a los fondos')
}

console.log('7. Los nombres de columna de cada familia')
{
  // ⚠️ LA INCONSISTENCIA DE LA CFTC, FIJADA AQUÍ. `lev_money_positions_long`
  // va SIN sufijo y `nonrept_positions_long_all` CON él. Comprobado en la
  // sonda del 2026-09-14, y desde donde se programa el host está bloqueado:
  // nadie puede verificarlo sobre la marcha, así que la defensa es esta
  // prueba. Un nombre «corregido» de memoria daría un 400 de Socrata que
  // aborta la medición entera.
  ok(
    columnasDeFamilia('fondos').every((c) => !c.endsWith('_all')),
    'las de los fondos NO llevan `_all`',
  )
  ok(
    columnasDeFamilia('pequenos').every((c) => c.endsWith('_all')),
    'las de los pequeños SÍ llevan `_all`',
  )
  ok(
    columnasDeFamilia('pequenos').join(',') ===
      'nonrept_positions_long_all,nonrept_positions_short_all',
    'los nombres exactos de los pequeños son los de la sonda',
  )

  // ⚠️ Y que NO estén en `COLUMNAS`: eso es lo que pide el publicador, y lo
  // que el publicador pide acaba en el archivo que baja cada miembro. Mientras
  // los pequeños sean solo una medición, no viajan al teléfono de nadie.
  ok(
    columnasDeFamilia('pequenos').every((c) => !COLUMNAS.includes(c)),
    'los pequeños NO están en COLUMNAS: no se publican todavía',
  )
  ok(
    columnasDeFamilia('fondos').every((c) => COLUMNAS.includes(c)),
    'los fondos SÍ están en COLUMNAS: la pantalla los enseña',
  )

  // El aviso que convierte un 400 ciego en un mensaje útil.
  const hay = ['market_and_exchange_names', ...columnasDeFamilia('fondos'), 'nonrept_positions_long']
  const faltan = familiasQueFaltan(hay, ['fondos', 'pequenos'])
  ok(faltan.length === 2, `con las de los pequeños ausentes avisa de las 2, y avisó de ${faltan.length}`)
  ok(
    faltan.every((f) => f.familia === 'pequenos'),
    'y dice de QUÉ familia son las que faltan',
  )
  ok(
    faltan.some((f) => f.parecidas.includes('nonrept_positions_long')),
    'y enseña el nombre PARECIDO que sí existe, que es lo que hace útil el mensaje',
  )
  ok(familiasQueFaltan(['market_and_exchange_names'], []).length === 0, 'sin familias que mirar no inventa faltas')
  ok(familiasQueFaltan(null, ['fondos']).length === 2, 'sin lista de columnas las da todas por ausentes')

  // Las etiquetas: una familia sin rótulo saldría en la tabla como `undefined`.
  for (const k of Object.keys(FAMILIAS)) {
    ok(typeof FAMILIAS[k].etiqueta === 'string' && FAMILIAS[k].etiqueta.length > 2, `«${k}» tiene etiqueta`)
  }
}

console.log('8. ⚠️ EL LISTÓN DE LOS PEQUEÑOS muerde — siete resultados que fallan uno cada uno')
{
  // Un resultado que pasa los siete. Los demás se construyen cambiando UNA
  // cosa, para que cada comprobación señale a su criterio y no a otro.
  const bueno = {
    basePorR: -0.05,
    baseMitad1: -0.06,
    baseMitad2: -0.04,
    mejorPorR: 0.02,
    mejorMitad1: 0.01,
    mejorMitad2: 0.03,
    mejorSenalesMes: 20,
    vecinosMejoran: true,
    direccionMitad1: 'contra',
    direccionMitad2: 'contra',
    baseSinCostes: -0.02,
    mejorSinCostes: 0.04,
    mayorAporteDeUnPar: 0.25,
  }
  ok(juzgarPequenos(bueno).aprobado, 'el resultado bueno pasa los siete')

  const falla = (cambios, criterio) => {
    const v = juzgarPequenos({ ...bueno, ...cambios })
    ok(!v.aprobado && v.criterios[criterio] === false, `falla «${criterio}» y no aprueba`)
  }
  falla({ mejorPorR: -0.06 }, 'mejora')
  falla({ mejorMitad2: -0.05 }, 'mitades')
  falla({ mejorSenalesMes: 9.9 }, 'habla')
  falla({ vecinosMejoran: false }, 'vecinos')
  falla({ direccionMitad2: 'seguir' }, 'direccion')
  falla({ mejorSinCostes: -0.03 }, 'sinCostes')
  falla({ mayorAporteDeUnPar: 0.41 }, 'reparto')

  // Los bordes exactos, que es donde un `>` y un `>=` se confunden.
  ok(juzgarPequenos({ ...bueno, mejorSenalesMes: 10 }).criterios.habla, '10 señales/mes justas PASAN')
  ok(juzgarPequenos({ ...bueno, mayorAporteDeUnPar: 0.4 }).criterios.reparto, 'un 40 % justo PASA')
  ok(!juzgarPequenos({ ...bueno, mejorPorR: -0.05 }).criterios.mejora, 'empatar con la base NO es mejorar')

  // ⚠️ Y `null` no es un aprobado. «No se pudo medir» y «salió bien» se leen
  // igual en una tabla, así que aquí tienen que separarse.
  ok(!juzgarPequenos({ ...bueno, mejorSinCostes: null }).criterios.sinCostes, 'sin el dato de costes NO aprueba')
  ok(!juzgarPequenos({ ...bueno, mayorAporteDeUnPar: null }).criterios.reparto, 'sin el reparto medido NO aprueba')
  ok(!juzgarPequenos({ ...bueno, direccionMitad1: null }).criterios.direccion, 'sin dirección medida NO aprueba')
}

console.log('')
if (fallos) {
  console.error(`✗ ${fallos} de ${hechas} comprobaciones fallaron.`)
  process.exit(1)
}
console.log(`✓ todo bien (${hechas} comprobaciones).`)
