// EL LISTÓN DE LA REJILLA DIARIA DE SWING, ESCRITO ANTES DE GASTAR UN CRÉDITO
//
// ⚠️⚠️ ESTE ARCHIVO NO ES EL DE INTRADÍA, Y LA DIFERENCIA NO ES DE ESTILO.
//
// Allá (`lib/preregistro-rejilla.mjs` de la app hermana) la pregunta es «¿hay
// horas de mercado cerrado dentro de una serie HORARIA?». Aquí las velas son
// DIARIAS, así que esa pregunta no existe: la pregunta es **qué es una vela
// diaria que no contiene un día de mercado**.
//
// Y hay un segundo motivo para no copiar nada de allá, medido en el código:
//
//   ┌──────────────┬────────────────────────────┬──────────────────────────┐
//   │              │ Intradía                   │ Swing (aquí)             │
//   ├──────────────┼────────────────────────────┼──────────────────────────┤
//   │ `atrWilder`  │ ventana DURA de 60 velas   │ **la serie ENTERA**      │
//   │ el stop      │ 1,5 × ATR (todo el stop)   │ lo10 − 0,5 × ATR         │
//   └──────────────┴────────────────────────────┴──────────────────────────┘
//
// O sea que aquí el ATR **no es el stop**: es medio cojín encima de un nivel
// estructural. Copiar el umbral de allá habría sido traerse una suposición
// sobre el mercado que en esta app es falsa — la lección que este proyecto
// lleva meses escribiendo.
//
// ─────────────────────────────────────────────────────────────────────────
// LO QUE YA SE SABE SIN GASTAR NADA, Y HAY QUE LEER ANTES DE LA TABLA
// ─────────────────────────────────────────────────────────────────────────
//
// Todo lo de abajo sale del `barrido.json` y del `senales.jsonl` REALES de
// producción, que ya estaban publicados. Cero créditos.
//
// 1. ⚠️ **UNA DE CADA SIETE VELAS ES SISTEMÁTICAMENTE ESTRECHA, EN LOS 14
//    PARES.** En los 20 máximos y mínimos que publica el barrido, las
//    posiciones 1, 8 y 15 —espaciadas exactamente 7— traen entre el 13 % y el
//    65 % del rango mediano de su par, y eso pasa en los CATORCE. Ninguna vela
//    es plana (0 de 280 con máximo = mínimo), así que no es un hueco: es una
//    vela con muy poco mercado dentro.
//
// 2. **El cojín de ATR es el 16,6 % del stop** (mediana de las 46 señales
//    reales de la app; rango del 7,7 % al 43,5 %). ATR mediano 47 pips, stop
//    mediano 155 pips.
//
// 3. **Una sola vela nueva no puede mover el stop más de 1,84 pips**, y eso es
//    un TECHO aritmético, no una estimación: en Wilder la vela más nueva pesa
//    1/14 = 7,14 %, y 7,14 % × 16,6 % × 155 pips = 1,84. El spread típico de
//    esta app es ~2 pips. **Por debajo del suelo de costes.**
//
// ⚠️ LOS PUNTOS 1 Y 3 NO SE CONTRADICEN, Y ES LO MENOS OBVIO DE TODO ESTO.
// El techo de 1/14 vale para UNA vela. Si una de cada siete es estrecha, el
// promedio de Wilder arrastra el sesgo entero: con seis velas normales y una
// al 28 %, el ATR sale ~10 % por debajo del real, y eso ya no lo acota el
// 1/14. **El paso barato dijo «no» a la pregunta pequeña y «sí» a la grande.**
//
// ─────────────────────────────────────────────────────────────────────────
// LO QUE COMPRAN LOS 14 CRÉDITOS, Y ES LO ÚNICO QUE NO SE PUEDE TENER GRATIS
// ─────────────────────────────────────────────────────────────────────────
//
// **LAS FECHAS.** El barrido publicado descarta las 300 fechas, así que desde
// fuera se ve el patrón de 1 cada 7 y **no se puede saber qué día es**. Sin el
// día no se puede elegir el arreglo, y elegirlo a ojo sería ponerle nombre a
// algo que no se ha mirado — que en este archivo está escrito como un error de
// medición.
//
// ⚠️ **NO SE PRESUPONE QUE SEA DOMINGO.** El historial tiene 28 fechas de vela
// distintas y solo UNA cae en domingo: el 2026-08-09, la primera corrida del
// vigía, lanzada a mano. El cron corre de lunes a viernes.
//
// 📌 Y queda dicho porque el error fue mío: el 2026-09-30 publiqué «6 de 29
// fechas son domingo». **Era un conteo por SEÑAL presentado como conteo por
// FECHA** — las 6 son las seis señales de ese único domingo, que es justo el
// número que esta memoria ya tenía escrito («dejó 6 señales registradas»).
// Un número bien calculado que describía otra cosa, por enésima vez.

export const FECHA_PREREGISTRO = '2026-09-30'

// La vara con la que se juzga, si se llega a juzgar algo.
export const VARA = 'neutra 1:1, spread por par descontado'

// ── Lo medido gratis, congelado para que no se reescriba después ──────────
export const LO_QUE_SE_SUPO_GRATIS = Object.freeze({
  // Del `barrido.json` real: 14 pares × 20 velas.
  paresMirados: 14,
  velasPorPar: 20,
  velasPlanas: 0,
  posicionesEstrechas: Object.freeze([1, 8, 15]),
  espaciado: 7,
  // Del `senales.jsonl` real: las 46 señales de la app con ATR y stop.
  senalesMiradas: 46,
  atrMedianoPips: 47.0,
  stopMedianoPips: 155.5,
  // Qué fracción del stop es el cojín de 0,5 × ATR.
  cojinSobreStop: 0.166,
  cojinSobreStopMin: 0.077,
  cojinSobreStopMax: 0.435,
  // El techo aritmético de UNA vela: 1/14 en Wilder.
  pesoDeUnaVela: 1 / 14,
  techoUnaVelaPips: 1.84,
  spreadTipicoPips: 2,
})

// ─────────────────────────────────────────────────────────────────────────
// LOS DOS ARREGLOS POSIBLES, NOMBRADOS ANTES DE VER NINGÚN NÚMERO
// ─────────────────────────────────────────────────────────────────────────
//
// ⚠️ Se nombran los dos a propósito. Si se mide uno solo y sale bien, no hay
// forma de saber si el otro salía mejor; y elegir después de ver la tabla es el
// troceo a posteriori que este proyecto ya rechazó dos veces (el control de la
// confluencia y el del barrido de liquidez).
export const ARREGLOS = Object.freeze({
  // QUITARLA. La vela estrecha sale de la serie y el rango del día siguiente
  // se mide contra el cierre del día ANTERIOR a ella, así que el salto del fin
  // de semana no se pierde: pasa entero al día siguiente.
  quitar: 'la vela estrecha se saca de la serie',
  // FUNDIRLA en la siguiente: máximo de las dos, mínimo de las dos, cierre de
  // la siguiente. Es el arreglo fiel SI esas horas son de verdad el arranque
  // de la sesión siguiente.
  fundir: 'la vela estrecha se funde con la siguiente (máx, mín y cierre de la fundida)',
})

// ⚠️ Y CUÁL ES EL FIEL DEPENDE DE UN HECHO, NO DE UNA OPINIÓN: si la vela
// estrecha es un día de calendario en el que el mercado casi no abrió, el fiel
// es FUNDIR (esas horas existieron y pertenecen a la sesión siguiente). Si es
// una fila repetida o un día sin mercado ninguno, el fiel es QUITAR.
//
// El diagnóstico trae el dato que lo decide —el DÍA de la semana de la vela
// estrecha— y por eso las dos se miden y se enseñan juntas.
export const QUIEN_DECIDE_ENTRE_LOS_DOS =
  'el día de la semana de la vela estrecha: si es un día con algunas horas de mercado, ' +
  'el arreglo fiel es FUNDIR; si es un día sin mercado ninguno, QUITAR'

// ─────────────────────────────────────────────────────────────────────────
// EL UMBRAL, Y DE DÓNDE SALE
// ─────────────────────────────────────────────────────────────────────────
//
// ⚠️ UNO SOLO, y en dinero. La tentación era poner un umbral para el ATR y
// otro para el stop; serían dos números inventados donde hace falta uno
// medido. El único suelo que existe aquí es **el spread**: un cambio en el
// stop más pequeño que el spread que se paga por entrar no cambia ninguna
// decisión, porque ya está por debajo del coste.
//
//   2 pips de spread sobre los 155,5 de stop mediano = 1,29 %.
//
// Se redondea a **2 %** hacia arriba, no hacia abajo: el spread de esta app
// está escrito «en el lado alto de lo normal» y aun así redondear a favor del
// hallazgo sería empujar la balanza.
//
// ⚠️ **Si el número real sale por debajo, el umbral NO se vuelve a tocar.**
// Para eso se escribe antes.
export const CAMBIO_MINIMO = 0.02

// Cuántos de los 14 pares tienen que estar de acuerdo. Es la MISMA rejilla
// para los catorce: si el efecto es de la rejilla, sale en casi todos. Que
// salga en tres sería un efecto de esos tres pares, no de la rejilla.
export const MAYORIA = 0.7

// ─────────────────────────────────────────────────────────────────────────
// QUÉ SIGNIFICA CADA RESULTADO POSIBLE — escrito ANTES de los números
// ─────────────────────────────────────────────────────────────────────────
export const QUE_DICE_EL_DIAGNOSTICO = Object.freeze({
  nada:
    'La vela estrecha no mueve el ATR por encima del spread. La inferencia era ' +
    'falsa y se documenta: NO se hace la medición completa y NO se toca la app.',
  soloLaSombra:
    'Mueve el ATR pero NO mueve el stop de la app por encima del spread — que es ' +
    'lo que el techo de 1/14 ya hacía sospechar. Entonces afecta solo a las reglas ' +
    'de la sombra, donde el ATR ES el stop entero (reversión: 1,5 × ATR a los dos ' +
    'lados). Eso es una decisión aparte y más pequeña: esas reglas no se enseñan ni ' +
    'despiertan el celular.',
  cambiaLosStops:
    'Mueve el stop de la app por encima del spread. Entonces la app lleva desde el ' +
    '2026-08-09 poniendo stops con un ATR medido de menos, y la medición completa ' +
    'en el banco de pruebas vale la pena.',
})

// ⚠️ Y LO QUE NINGÚN RESULTADO AUTORIZA: encender nada. Esto es un
// DIAGNÓSTICO. Cambiar la rejilla cambia el dato de entrada, así que cambia
// EMA20, EMA50, RSI, ATR, los soportes y las señales a la vez — y eso va al
// banco de pruebas con su propio listón, nunca de pasada.
//
// 📌 Lo que NO aplica aquí, y citarlo sería un argumento mal usado (ya fue mío
// una vez): «en esta app los filtros no funcionan, siete familias medidas y
// siete fallando». **Esto no es un filtro.** Los filtros iban ENCIMA de la
// entrada; esto corrige el DATO con el que se calcula la entrada.
export const QUE_NO_AUTORIZA =
  'nada: es un diagnóstico. Cambiar la rejilla cambia el dato de entrada, y eso va ' +
  'al banco de pruebas con su propio listón escrito antes.'

/**
 * El veredicto de un par, CALCULADO. Nadie lo argumenta.
 *
 * ⚠️ Devuelve `null` —«no se pudo mirar»— y nunca `'nada'`, cuando falta un
 * número. «No se pudo mirar» y «no pasa nada» son cosas distintas, y ya
 * mordió en la sonda del sentimiento: un informe afirmó «no lo publican»
 * habiendo leído cero páginas.
 */
export function juzgarPar(r, { cambioMinimo = CAMBIO_MINIMO } = {}) {
  if (!r) return null
  const { cambioATR, cambioStopApp } = r
  if (!Number.isFinite(cambioATR) || !Number.isFinite(cambioStopApp)) return null
  if (Math.abs(cambioATR) < cambioMinimo) return 'nada'
  if (Math.abs(cambioStopApp) < cambioMinimo) return 'soloLaSombra'
  return 'cambiaLosStops'
}

/**
 * El veredicto conjunto: pide MAYORÍA en una dirección.
 *
 * ⚠️ Sin mayoría devuelve `'mezclado'`, que NO es un empate cómodo: si fuera
 * la rejilla, el efecto tendría que aparecer en casi todos los pares. Que
 * dependa del par apunta a otra causa, y medir más sobre un efecto sin
 * mecanismo detrás es gastar créditos en un número que no se va a poder leer.
 */
export function juzgarConjunto(veredictos, { mayoria = MAYORIA } = {}) {
  const vistos = (veredictos ?? []).filter((v) => v != null)
  if (!vistos.length) return null
  const hacenFalta = Math.ceil(vistos.length * mayoria)
  const cuenta = {}
  for (const v of vistos) cuenta[v] = (cuenta[v] ?? 0) + 1
  for (const clave of ['cambiaLosStops', 'soloLaSombra', 'nada']) {
    if ((cuenta[clave] ?? 0) >= hacenFalta) return clave
  }
  return 'mezclado'
}
