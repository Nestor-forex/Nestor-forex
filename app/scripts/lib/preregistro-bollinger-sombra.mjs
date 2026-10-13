// EL LISTÓN DE «EL TOQUE DE BANDA SOLO», PARA SU REGISTRO HACIA ADELANTE.
//
// Escrito el 2026-10-13, ANTES de que se anotara una sola operación real.
//
// ═════════════════════════════════════════════════════════════════════════
// ⚠️⚠️ LO PRIMERO, PORQUE ES LO QUE HACE HONESTO TODO LO DEMÁS
// ═════════════════════════════════════════════════════════════════════════
//
// **Esta variante NO es la que el listón del 2026-10-13 juzgaba.** Aquél
// (`preregistro-bollinger.mjs`) fijó «con RSI estirado» antes de medir, con su
// motivo escrito, y esa variante FALLÓ: 2 de 6 criterios.
//
// Néstor leyó la tabla y pidió la fila de al lado: **«veo que el toque de la
// banda sola da todo en positivo, entonces por qué no la ponemos a prueba a
// ella sola»**. Eso es elegir DESPUÉS de ver los resultados, y es exactamente
// lo que este proyecto rechazó con el control de la confluencia y con el del
// barrido de liquidez.
//
// ⚠️ **Lo que lo hace legítimo aquí, y solo aquí, son dos cosas juntas:**
//
//   1. **No se enciende nada.** La regla no se propone, no despierta ningún
//      celular y no entra en el tablero de señales. Lo único que hace es
//      anotarse.
//   2. **El veredicto NO sale del histórico.** Sale de días que nadie ha
//      mirado. Por eso `FUENTE_DEL_VEREDICTO` dice `'registro hacia adelante'`
//      y el histórico se guarda abajo como PROMESA A COMPROBAR, nunca como
//      evidencia.
//
// Es la misma situación del LSS (2026-09-20): su variante también salió de
// mirar una tabla, y se resolvió igual. Si en vez de esto se encendiera en la
// app, sería troceo a posteriori puro y no habría excusa.
//
// ═════════════════════════════════════════════════════════════════════════
// EL HISTÓRICO, CON SU DATO INCÓMODO DELANTE
// ═════════════════════════════════════════════════════════════════════════
//
// Medido el 2026-10-13 sobre 1.341 días (2021-08-19 a 2026-10-14), 58,1 meses,
// vara neutra 1:1, spread por par:
//
//   · 1.041 operaciones · 17,9 señales/mes · 52 % de acierto
//   · **+0,027** por unidad de riesgo con spread
//   · gana en las DOS mitades: +0,031 y +0,022
//
// Y lo que no hay que esconder:
//
//   · ⚠️ **−0,014 pagando 0,5 pips de swap por noche.** O sea que con el peaje
//     completo de una cuenta real YA MIDIÓ NEGATIVO en el histórico;
//   · ⚠️ **−0,008 de ventaja contra la reversión M2** (+0,035), que es la regla
//     que ya corre y a la que habría que ganarle para que esto valga la pena.
//
// 📌 **Por eso este listón guarda los tres números y no solo el bueno.** Si
// dentro de un año el registro sale negativo, no será una sorpresa: el
// histórico lo avisaba y está escrito aquí con fecha anterior. Y si sale
// positivo PESE al swap, eso sí sería información nueva — que es la única razón
// por la que vale la pena esperar.
//
// ⚠️ Si algún día un resultado queda a un pelo, la respuesta NO es aflojar un
// criterio. Éste es el momento exacto para el que se escribe un listón antes.

export const FECHA_DEL_LISTON = '2026-10-13'

// De dónde sale el veredicto. NO del histórico: esos 1.341 días se usaron para
// ELEGIR esta fila, así que volver a medirlos devuelve el mismo número por
// construcción. No es una segunda muestra, es la misma.
export const FUENTE_DEL_VEREDICTO = 'registro hacia adelante'

// Lo que el histórico PROMETIÓ, guardado para comparar — nunca para decidir.
export const HISTORICO = Object.freeze({
  ops: 1041,
  senalesMes: 17.9,
  acierto: 52,
  porRiesgo: 0.027,
  primeraMitad: 0.031,
  segundaMitad: 0.022,
  // ⚠️ Los dos que la condenarían, guardados a propósito.
  conSwap05: -0.014,
  ventajaSobreM2: -0.008,
})

// ─────────────────────────────────────────────────────────────────────────
// LOS SEIS CRITERIOS. Todos obligatorios.
// ─────────────────────────────────────────────────────────────────────────

/**
 * El mínimo de operaciones REALES, y va primero porque sin él los otros cinco
 * no significan nada.
 *
 * Con `margen(n) = 98/√n`, 150 operaciones dejan el margen del peor caso en
 * ±8 puntos. Por debajo de eso un 40 % y un 70 % son el mismo número, y
 * cualquier veredicto sería una moneda al aire con tabla.
 *
 * ⚠️ Es el MISMO 150 que el LSS y que el aviso de `sombra.js`, y eso no es
 * copiar un número de trading entre reglas: sale de aritmética, no del mercado.
 */
export const MIN_OPS = 150

// A 17,9 señales al mes, 150 operaciones son ~8,4 meses más unas semanas para
// que resuelvan las últimas. ⚠️ El ritmo REAL puede salir por debajo: el vigía
// solo anota una señal cuando es NUEVA para ese par y lado, y si el mismo par
// sigue fuera de banda tres días seguidos, los días 2 y 3 no se cuentan. El
// banco contaba todas las velas. Se verá en las primeras semanas.
export const MESES_ESTIMADOS = 9

// Gana con los costes que se pueden medir (spread por par).
export const UMBRAL = 0.02

// ⚠️ Y GANA EN LAS DOS MITADES del registro real. Es el criterio que distingue
// un efecto de un reparto afortunado, y el que el histórico de esta variante SÍ
// cumplía (+0,031 / +0,022) — así que aquí se exige de verdad, no de adorno.
export const EXIGE_DOS_MITADES = true

/**
 * Aguanta 0,5 pips de swap por noche.
 *
 * ⚠️⚠️ ESTE ES EL CRITERIO QUE EL HISTÓRICO YA FALLABA (−0,014), y por eso es
 * el que de verdad decide. Una regla que solo gana con swap cero no gana en una
 * cuenta real: el swap típico de un par mayor está entre 0,2 y 1 pip por noche.
 *
 * No se afloja «porque el swap no se puede conocer». Justo porque no se puede
 * conocer hay que exigir que sobreviva al nivel plausible.
 */
export const SWAP_EXIGIDO = 0.5

/**
 * Le gana a la reversión M2 por al menos `VENTAJA_SOBRE_M2`.
 *
 * ⚠️ El segundo criterio que el histórico fallaba (−0,008). Y es el que
 * contesta la pregunta que importa: no «¿gana algo?» sino **«¿aporta algo
 * ENCIMA de la regla que ya tenemos corriendo?»**. Si no le gana, lo honesto es
 * quedarse con una sola regla en la sombra y no con dos que dicen lo mismo.
 */
export const VENTAJA_SOBRE_M2 = 0.02

// Que el resultado no salga de un solo par.
export const MAX_POR_PAR = 0.4

/**
 * El veredicto lo CALCULA esta función. No lo argumenta nadie.
 *
 * ⚠️ Se niega a juzgar cuando falta un número, en vez de dar «no pasa» — que
 * se leería como «se midió y falló». Es el falso verde del 2026-10-12 por el
 * otro lado: una herramienta que al fallar es indistinguible de un resultado.
 */
export function juzgar(d) {
  const n = (x) => typeof x === 'number' && Number.isFinite(x)
  const faltan = []
  if (!n(d?.ops)) faltan.push('ops')
  if (!n(d?.porRiesgo)) faltan.push('porRiesgo')
  if (!n(d?.primeraMitad)) faltan.push('primeraMitad')
  if (!n(d?.segundaMitad)) faltan.push('segundaMitad')
  if (!n(d?.conSwap)) faltan.push('conSwap')
  if (!n(d?.m2PorRiesgo)) faltan.push('m2PorRiesgo')
  if (!n(d?.maxPorPar)) faltan.push('maxPorPar')
  if (faltan.length) {
    return { veredicto: null, sePudoMedir: false, faltan, criterios: [] }
  }

  // Tolerancia de coma flotante: `0.05 - 0.03` no da `0.02` en JavaScript, y
  // sin esto un resultado que cae exactamente en el umbral se iría al lado
  // cómodo por el último bit de un decimal — un veredicto decidido por algo
  // que nadie escribió en ningún listón. Lo cazó el borde exacto del listón
  // anterior.
  const EPS = 1e-9
  const ge = (a, b) => a >= b - EPS

  const criterios = [
    {
      nombre: `al menos ${MIN_OPS} operaciones reales`,
      pasa: d.ops >= MIN_OPS,
      dice: `${d.ops} operaciones`,
    },
    {
      nombre: 'gana con costes',
      pasa: ge(d.porRiesgo, UMBRAL),
      dice: `${d.porRiesgo.toFixed(3)} (hace falta ≥ ${UMBRAL})`,
    },
    {
      nombre: 'gana en las DOS mitades',
      pasa: d.primeraMitad > 0 && d.segundaMitad > 0,
      dice: `1ª ${d.primeraMitad.toFixed(3)} · 2ª ${d.segundaMitad.toFixed(3)}`,
    },
    {
      nombre: `aguanta ${SWAP_EXIGIDO} de swap`,
      pasa: d.conSwap > 0,
      dice: `${d.conSwap.toFixed(3)} pagando ${SWAP_EXIGIDO} pips/noche`,
    },
    {
      nombre: `le gana a la reversión M2 por ≥ ${VENTAJA_SOBRE_M2}`,
      pasa: ge(d.porRiesgo - d.m2PorRiesgo, VENTAJA_SOBRE_M2),
      dice: `${(d.porRiesgo - d.m2PorRiesgo).toFixed(3)} de ventaja (M2 va a ${d.m2PorRiesgo.toFixed(3)})`,
    },
    {
      nombre: `ningún par aporta más del ${MAX_POR_PAR * 100} %`,
      pasa: d.maxPorPar <= MAX_POR_PAR + EPS,
      dice: `el mayor aporta el ${(d.maxPorPar * 100).toFixed(0)} %`,
    },
  ]

  return {
    veredicto: criterios.every((c) => c.pasa) ? 'pasa' : 'noPasa',
    sePudoMedir: true,
    faltan: [],
    criterios,
  }
}

export const QUE_HACER = Object.freeze({
  pasa:
    'Se le PROPONE a Néstor encenderla, con su propio PR, su prueba y su ' +
    'verificación en navegador. Pasar el listón es necesario y no suficiente: ' +
    'lo decide él.',
  noPasa:
    'Se queda en la sombra o se apaga, y NO se vuelve a medir sobre estos ' +
    'mismos días. Si falla el criterio del swap o el de ganarle a M2, es que ' +
    'el histórico tenía razón y no hay nada nuevo.',
  siempre:
    'Nada de esto enciende una señal por su cuenta. La regla no se propone, no ' +
    'despierta ningún celular y no entra en el tablero: solo se anota y se ' +
    'enseña rotulada como prueba.',
})
