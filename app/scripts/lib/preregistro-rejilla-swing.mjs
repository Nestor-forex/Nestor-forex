// EL LISTÓN DEL CAMBIO DE REJILLA EN SWING, ESCRITO ANTES DE MEDIR NADA
//
// ⚠️⚠️ ESTE NO ES EL DEL DIAGNÓSTICO. Son dos preguntas distintas y conviene
// no confundirlas nunca:
//
//   · `preregistro-rejilla-diaria.mjs` (2026-09-30, ya corrido) preguntaba
//     **«¿la vela estrecha CAMBIA el stop?»**. Contestó que sí: el ATR sube un
//     +18,5 % de mediana y el stop de la app un +5,2 %, con 12 de 14 pares por
//     encima del umbral. Y trajo las fechas, que es lo que no se podía tener
//     gratis: **44 de las 51 estrechas son sábado o domingo, CERO son lunes o
//     viernes.**
//
//   · éste pregunta lo único que aquél decía expresamente que no autorizaba:
//     **«¿la app MEJORA con la rejilla limpia?»**. Cambiar el stop y mejorar
//     no son lo mismo, y hasta hoy solo está medido lo primero.
//
// ─────────────────────────────────────────────────────────────────────────
// EL ARREGLO, NOMBRADO ANTES DE MEDIR: QUITAR EL SÁBADO, FUNDIR EL DOMINGO
// ─────────────────────────────────────────────────────────────────────────
//
// No es una elección de gusto: sale del reparto que trajo el diagnóstico y de
// un hecho del mercado. El Forex cierra el viernes a las 22:00 UTC y abre el
// domingo a las 22:00, así que:
//
//   · el SÁBADO no tiene mercado NINGUNO      → se QUITA
//   · el DOMINGO tiene ~2 horas (22:00-24:00) → se FUNDE con el lunes
//
// ⚠️ Y queda dicho porque es una limitación de cómo escribí el listón
// anterior: allí nombré los dos arreglos **por separado** y el fiel resultó
// ser **un MIX**, uno por día — que no era ninguna de las dos opciones
// sueltas. La regla que decidía («si es un día con algunas horas de mercado,
// FUNDIR; si es un día sin mercado ninguno, QUITAR») sí estaba escrita antes y
// se aplica tal cual; lo que faltó fue prever que hicieran falta las dos.
//
// ✅ Lo que salva esa medición: los dos arreglos medían casi igual por separado
// (EUR/USD +23,5 % contra +24,9 %), así que la elección no puede cambiar el
// veredicto. Suerte, no diseño.
//
// La limpieza vive en `lib/rejilla-limpia.mjs` y no se toca desde aquí.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE HACE ESTA MEDICIÓN DISTINTA DE TODAS LAS ANTERIORES
// ─────────────────────────────────────────────────────────────────────────
//
// **LAS SEÑALES NO SON LAS MISMAS.** Esto no es un filtro que puntúe las
// señales de hoy: cambia el DATO con el que se calculan, así que cambia EMA20,
// EMA50, RSI, ATR, los soportes y las resistencias a la vez. Salen otras
// señales, en otras fechas, en otros pares y con otros niveles.
//
// Ya está escrito en este proyecto lo que eso hace con una tabla — el filtro de
// RSI del 2026-08-25: «no quita señales: las cambia por otras», y con el filtro
// puesto salían MÁS operaciones, no menos. Aquí es más fuerte, porque allí
// cambiaba el filtro y aquí cambia el suelo.
//
// Consecuencia práctica, y de aquí sale el criterio que más pesa: **la
// comparación no es «la app con mejores números» sino «la app contra OTRA
// app»**, o sea dos muestras independientes. Dos muestras independientes de
// ~1.800 operaciones se diferencian solas: con resultados por operación que
// van de −1 a +1, el error típico de cada media ronda **0,024 por unidad de
// riesgo**, o sea MÁS que el umbral de abajo. Un total mejor puede ser ruido.
//
// **Lo que el ruido no hace es repetirse en las dos mitades del periodo.** Por
// eso el criterio de las mitades no es un adorno de rigor: es el único que
// distingue una mejora de un reparto afortunado.
//
// ─────────────────────────────────────────────────────────────────────────
// LAS DOS MEDICIONES, Y POR QUÉ SON DOS
// ─────────────────────────────────────────────────────────────────────────
//
// **A) TODO EN LA REJILLA LIMPIA** — las señales se generan Y se juzgan con la
// serie limpia. Es la que decide, porque es la app que existiría: si la rejilla
// se arregla, se arregla también para el resolver.
//
// **B) SEÑALES LIMPIAS, JUZGADAS EN LA REJILLA DE HOY** — diagnóstico, no
// decisión. Sirve para separar dos efectos que en A van pegados:
//   · el de las SEÑALES (otros niveles, otras fechas, otro ATR);
//   · el de la RESOLUCIÓN (una vela de sábado dentro de la serie con la que se
//     mira si el precio tocó el stop).
//
// ⚠️ **El segundo efecto NO es hipotético y ya costó datos reales.** El
// comentario de `lib/resolver.mjs` lo lleva escrito: la vela de domingo del
// 2026-08-09 hizo que `indexOf` devolviera −1 y **8 señales reales quedaron
// marcadas «caducada» para siempre**, sobre 18 visibles. O sea que la rejilla
// sucia no solo mueve el stop: ya se comió casi la mitad de un día de
// historial.
//
// 📌 Si A y B se parecen, el efecto es de las señales. Si difieren, parte del
// resultado es de cómo se juzga — y eso hay que decirlo en vez de dejar que se
// lea como si fuera todo mérito de la entrada.

export const FECHA_PREREGISTRO = '2026-09-30'

// La vara, igual que en todo lo demás de este proyecto.
export const VARA = 'neutra 1:1, spread por par descontado'

// De dónde viene esto: lo que el diagnóstico YA midió, congelado para que no
// se reescriba después con los números de hoy.
export const LO_QUE_MIDIO_EL_DIAGNOSTICO = Object.freeze({
  fecha: '2026-09-30',
  velasMiradas: 300,
  velasEstrechas: 51,
  enFinDeSemana: 44,
  enLunesYViernes: 0,
  sabadosEstrechos: 35,
  sabadosTotales: 43,
  rangoEstrechasSobreNormal: 0.27,
  // Lo que cambia al limpiar, medido par por par.
  subeATRMediana: 0.185,
  subeStopAppMediana: 0.052,
  subeStopAppMaximo: 0.808, // USD/JPY
  paresPorEncimaDelUmbral: 12,
  paresMirados: 14,
  // ⚠️ Y el hallazgo que NO estaba en ninguna de mis dos hipótesis: el efecto
  // grande del arreglo no es el ATR, es que «los últimos 10 días» vuelvan a
  // ser 10 días. Al quitar 51 velas la ventana de `lo10` pasa a abarcar ~14
  // días de calendario y alcanza fondos más profundos. Con el ATR al 16,6 %
  // del stop, en USD/JPY el ATR explica 5,2 de los 80,8 puntos: los otros
  // 75,6 son `lo10`. Es aritmética sobre números medidos, no una hipótesis.
  loQueMandaEnElStop: 'lo10, no el ATR',
})

// ─────────────────────────────────────────────────────────────────────────
// EL UMBRAL, Y POR QUÉ NO BASTA CON ÉL
// ─────────────────────────────────────────────────────────────────────────
//
// 0,01 por unidad de riesgo es la resolución con la que este proyecto imprime
// TODAS sus tablas (dos decimales), así que por debajo de eso no se distingue
// del redondeo. Se pide el doble, **0,02**, por lo escrito arriba: con dos
// muestras independientes el error típico de cada media ronda 0,024.
//
// ⚠️ O sea que este umbral, solo, NO demuestra nada. Está aquí para descartar
// lo que ni se mueve, no para aprobar. **Lo que aprueba son las dos mitades.**
//
// ⚠️ **Si el número real sale por debajo, el umbral NO se vuelve a tocar.**
// Para eso se escribe antes.
export const MEJORA_MINIMA = 0.02

// El nivel de swap al que se comprueba que la mejora aguanta. 0,5 pips por
// noche es el lado normal de lo que cobra un bróker, y es el nivel al que este
// proyecto ya juzga la reversión y «comprar la caída».
//
// ⚠️ Importa MÁS que en otras mediciones, y por un motivo propio: la rejilla
// limpia tiene MENOS velas, así que `diasTardados` baja y el swap medido baja
// con él. Parte de cualquier mejora podría ser eso y nada más — una operación
// que «dura 10 días» en vez de 12 paga dos noches menos SIN que el precio haya
// hecho nada distinto. Por eso se exige que la mejora siga estando con swap.
export const SWAP_DE_CONTROL = 0.5

// Cuánta señal se puede perder. La rejilla limpia tiene ~17 % menos velas, así
// que es normal que salgan algunas menos; lo que no vale es que la app se
// quede muda. Por debajo de esto ya no es la misma herramienta.
export const SENAL_MINIMA_RELATIVA = 0.7

// Cuánto puede aportar UN par a la mejora. Si un solo par se lleva casi todo,
// no es la rejilla: es ese par. Mismo número que en los otros dos
// preregistros de este proyecto.
export const APORTE_MAXIMO_DE_UN_PAR = 0.4

// ─────────────────────────────────────────────────────────────────────────
// QUÉ SIGNIFICA CADA RESULTADO POSIBLE — escrito ANTES de los números
// ─────────────────────────────────────────────────────────────────────────
export const QUE_DICE_LA_MEDICION = Object.freeze({
  mejora:
    'La rejilla limpia mejora el resultado por encima del umbral, en las DOS mitades, ' +
    'pagando swap, sin quedarse muda y sin que lo aporte un solo par. Entonces se le ' +
    'PROPONE a Néstor encenderla — y sigue siendo su decisión, no un automatismo.',
  noPasa:
    'El total mejora pero falla al menos un criterio. NO se enciende. El criterio que ' +
    'suele fallar aquí es el de las mitades, y cuando falla ése lo que hay delante es ' +
    'un reparto afortunado entre dos conjuntos de señales distintos, no una mejora.',
  igual:
    'La rejilla no mueve el resultado. ⚠️ Eso NO cierra el asunto: el argumento para ' +
    'limpiarla deja de ser el rendimiento y pasa a ser que el stop sea honesto (12 de ' +
    '14 pares con stop distinto, y «los últimos 10 días» que no eran 10). Eso es una ' +
    'decisión de Néstor sobre qué clase de herramienta quiere, no un hallazgo que ' +
    'decida solo.',
  empeora:
    '⚠️⚠️ La app mide PEOR con datos honestos. Esto NO autoriza quedarse con los datos ' +
    'sucios, y es la trampa que este listón existe para cerrar antes de verla: que la ' +
    'rejilla de hoy mide el ATR de menos es ARITMÉTICA, no opinión, y un sistema que ' +
    'solo «funciona» con un dato mal medido no funciona — funciona el error. Lo que un ' +
    '«empeora» autorizaría es volver a mirar la GEOMETRÍA sobre la rejilla buena, ' +
    'nunca volver a la rejilla mala.',
})

// ⚠️ Y LO QUE NINGÚN RESULTADO AUTORIZA POR SÍ SOLO: tocar la app. Ni el
// mejor número de esta tabla enciende nada; enciende Néstor, y el cambio va
// con su propio PR, su prueba y su verificación en navegador como todo lo
// demás de este repositorio.
export const QUE_NO_AUTORIZA =
  'encender nada por sí solo. Es una medición: el cambio en la app es una decisión ' +
  'aparte, de Néstor, con su propio PR.'

// 📌 Y lo que NO se puede citar en contra, porque ya fue un argumento mal usado
// mío una vez: «en esta app los filtros no funcionan, siete familias medidas y
// siete fallando». **ESTO NO ES UN FILTRO.** Los filtros iban ENCIMA de la
// entrada y la dejaban pasar o no; esto corrige el dato con el que se calcula
// la entrada. El historial de los filtros no dice nada sobre esto.
export const LO_QUE_NO_APLICA =
  'el historial de los siete filtros medidos y fallidos: esto no es un filtro, cambia ' +
  'el dato de entrada'

/**
 * El veredicto, CALCULADO. Nadie lo argumenta.
 *
 * @param {object} d
 *   `d.hoy` y `d.limpia`   — { total, acierto, porRiesgo, senalesMes }
 *   `d.mitades`            — { hoy: [m1, m2], limpia: [m1, m2] }, cada uno con porRiesgo
 *   `d.conSwap`            — { hoy, limpia }, medidos a SWAP_DE_CONTROL
 *   `d.aporteMaximoDeUnPar`— fracción de la mejora que se lleva el par que más aporta
 *
 * ⚠️ Devuelve `null` —«no se pudo mirar»— y nunca `'igual'`, cuando falta un
 * número. «No se pudo mirar» y «no pasa nada» son cosas distintas, y ya mordió
 * en la sonda del sentimiento: un informe afirmó «no lo publican» habiendo
 * leído cero páginas.
 */
export function juzgar(d, opciones = {}) {
  const {
    mejoraMinima = MEJORA_MINIMA,
    senalMinimaRelativa = SENAL_MINIMA_RELATIVA,
    aporteMaximo = APORTE_MAXIMO_DE_UN_PAR,
  } = opciones

  const num = (x) => (Number.isFinite(x) ? x : null)
  const hoy = num(d?.hoy?.porRiesgo)
  const limpia = num(d?.limpia?.porRiesgo)
  if (hoy === null || limpia === null) return { veredicto: null, criterios: [] }

  const delta = limpia - hoy

  // ⚠️ Un pelo de tolerancia para la coma flotante, y no es un detalle de
  // programación: `−0,06 − (−0,04)` en JavaScript NO da −0,02, da
  // −0,019999999999999997. Sin esto, un resultado que cae EXACTAMENTE en el
  // umbral se iría al lado cómodo por el último bit de un número decimal, y
  // el veredicto dependería de algo que nadie escribió en ningún listón.
  const EPS = 1e-9

  // Las mitades, una por una. Se exige que MEJORE en las dos, no que «no
  // empeore»: un cero en una mitad ya dice que el efecto no está ahí.
  const mh = (d?.mitades?.hoy ?? []).map((m) => num(m?.porRiesgo))
  const ml = (d?.mitades?.limpia ?? []).map((m) => num(m?.porRiesgo))
  const mitadesCompletas = mh.length === 2 && ml.length === 2 && ![...mh, ...ml].includes(null)
  const deltasMitades = mitadesCompletas ? [ml[0] - mh[0], ml[1] - mh[1]] : null

  const hoySwap = num(d?.conSwap?.hoy?.porRiesgo)
  const limpiaSwap = num(d?.conSwap?.limpia?.porRiesgo)
  const deltaSwap = hoySwap === null || limpiaSwap === null ? null : limpiaSwap - hoySwap

  const senalesHoy = num(d?.hoy?.senalesMes)
  const senalesLimpia = num(d?.limpia?.senalesMes)
  const relacionSenal =
    senalesHoy === null || senalesLimpia === null || senalesHoy <= 0 ? null : senalesLimpia / senalesHoy

  const aporte = num(d?.aporteMaximoDeUnPar)

  const criterios = [
    {
      nombre: 'el total mejora por encima del umbral',
      pasa: delta >= mejoraMinima - EPS,
      detalle: `${delta >= 0 ? '+' : ''}${delta.toFixed(3)} contra ${mejoraMinima.toFixed(2)} pedido`,
    },
    {
      nombre: 'mejora en las DOS mitades',
      pasa: deltasMitades ? deltasMitades.every((x) => x > 0) : false,
      detalle: deltasMitades
        ? deltasMitades.map((x) => `${x >= 0 ? '+' : ''}${x.toFixed(3)}`).join(' y ')
        : 'no se pudo mirar',
    },
    {
      nombre: `la mejora aguanta ${SWAP_DE_CONTROL} de swap por noche`,
      pasa: deltaSwap === null ? false : deltaSwap >= mejoraMinima - EPS,
      detalle:
        deltaSwap === null
          ? 'no se pudo mirar'
          : `${deltaSwap >= 0 ? '+' : ''}${deltaSwap.toFixed(3)}`,
    },
    {
      nombre: 'la app no se queda muda',
      pasa: relacionSenal === null ? false : relacionSenal >= senalMinimaRelativa - EPS,
      detalle:
        relacionSenal === null
          ? 'no se pudo mirar'
          : `${(100 * relacionSenal).toFixed(0)} % de las señales de hoy (mínimo ${(100 * senalMinimaRelativa).toFixed(0)} %)`,
    },
    {
      nombre: 'ningún par aporta la mayoría de la mejora',
      pasa: aporte === null ? false : aporte <= aporteMaximo + EPS,
      detalle:
        aporte === null
          ? 'no se pudo mirar'
          : `el que más aporta se lleva el ${(100 * aporte).toFixed(0)} % (máximo ${(100 * aporteMaximo).toFixed(0)} %)`,
    },
  ]

  // ⚠️ EL ORDEN IMPORTA. Primero se separa «empeora» e «igual», que no son
  // suspensos del listón sino respuestas distintas con su propio significado
  // escrito arriba. Solo si el total mejora de verdad se pregunta por los
  // criterios — y ahí un solo fallo basta para no encender.
  let veredicto
  if (delta <= -mejoraMinima + EPS) veredicto = 'empeora'
  else if (Math.abs(delta) < mejoraMinima - EPS) veredicto = 'igual'
  else veredicto = criterios.every((c) => c.pasa) ? 'mejora' : 'noPasa'

  return { veredicto, delta, criterios }
}
