// LO QUE MIDE EL BANCO DE PRUEBAS, PARA ENSEÑARLO DENTRO DE LA APP.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ ESTO ESTÁ EN LA APP Y NO SOLO EN UN INFORME QUE NADIE VE
// ─────────────────────────────────────────────────────────────────────────
// Comparando esta app con las que se venden, la conclusión fue que en
// funciones compite y en confianza no: nadie tiene motivo para creerle. Y
// resulta que lo único que de verdad la distingue ya existía y estaba
// escondido — estas mediciones vivían en los registros de GitHub, donde no
// las ve nadie.
//
// Las apps que presumen de «motor de backtesting» enseñan la HERRAMIENTA de
// medir, no el resultado. Si el número fuera bueno sería lo primero de su
// página. Enseñar el propio número, siendo malo, es lo contrario de lo que
// hace el sector, y es la única forma de que alguien tenga razones para creer
// lo demás.
//
// ⚠️ ESTOS NÚMEROS SE ESCRIBEN A MANO Y LLEVAN FECHA A PROPÓSITO.
// No hay forma de calcularlos en el navegador: salen de descargar 1.400 días
// de velas y recalcular el barrido día a día, que es media hora de trabajo en
// un servidor. Al llevar la fecha dentro, un número viejo se delata solo en la
// pantalla en vez de envejecer en silencio.
//
// CÓMO SE ACTUALIZAN: Actions → «Banco de pruebas de las reglas» → Run
// workflow, y se copian aquí los de la tabla «GEOMETRÍA DEL STOP Y EL
// OBJETIVO» (la app tal cual) y los de la sección de reversión.

export const MEDICION = {
  // Cuándo se corrió el banco de pruebas que dio estos números.
  fecha: '2026-10-06',
  desde: '2021-08-09',
  hasta: '2026-10-06',
  // ⚠️ BAJA DE 1.436 A 1.343 Y NO SE PERDIÓ NINGÚN DÍA DE MERCADO.
  //
  // El 2026-10-06 la app pasó a limpiar la rejilla: el sábado se quita (no
  // tiene mercado ninguno) y el domingo se funde con el lunes (tiene ~2 horas).
  // El periodo de calendario es el MISMO; lo que baja es el número de velas,
  // porque antes se contaban como días completos unas que traían el 27 % del
  // recorrido normal de su par.
  dias: 1343,

  // ⚠️ ACTUALIZADOS EL 2026-09-05, y esta es la razón exacta por la que estos
  // números llevan fecha dentro.
  //
  // Ese día se aflojó `TENDENCIA_MIN` de 'alineada' a 'media', o sea que la
  // app pasó a dar 36,1 señales al mes en vez de 27,7. Los números de aquí
  // eran de la app ANTERIOR y quedaron falsos en el mismo momento del cambio,
  // sin que nada fallara: la pantalla habría seguido enseñando 1.693
  // operaciones de una app que ya no existe.
  //
  // 📌 REGLA QUE SALE DE AQUÍ: cambiar un umbral de `marketCalc.js` obliga a
  // volver a correr el banco de pruebas y actualizar este archivo. No es
  // opcional — es la mitad del cambio.
  //
  // ⚠️ Y SE VOLVIERON A ACTUALIZAR EL 2026-10-06, por la misma regla: ese día
  // la app pasó a limpiar la rejilla (`rejilla-limpia.mjs`), o sea que cambió
  // el DATO con el que calcula. No es un filtro encima de la entrada: cambia
  // EMA20, EMA50, RSI, ATR y los soportes a la vez, así que las señales NO son
  // las mismas. Los números de antes eran de OTRA app.
  //
  // La app tal cual, con SU geometría de stop y objetivo, spread por par
  // descontado. Es lo que Néstor ve en pantalla, medido de verdad.
  // (fila «tendencia media» de la tabla de geometría real: 2095 · 56% · −0.04)
  app: {
    operaciones: 2095,
    acierto: 56,
    porRiesgo: -0.04,
  },

  // La misma app medida con la vara NEUTRA (stop y objetivo a la misma
  // distancia). Sirve para separar «acierta la dirección» de «gana dinero»:
  // con el objetivo más cerca que el stop se puede acertar mucho y perder
  // igual, y esta fila es la que lo desnuda.
  // (fila «la app tal cual (vara neutra)»: 2103 · 49% · −0.04)
  neutra: {
    operaciones: 2103,
    acierto: 49,
    porRiesgo: -0.04,
  },

  // La regla de reversión: comprar lo que se cayó en vez de lo que sube. Es lo
  // único positivo medido en todo el proyecto.
  //
  // ⚠️ DESDE EL 2026-09-05 YA NO CORRE EN LA SOMBRA: se enseña en el tablero,
  // en su propia sección y marcada como experimento. Lo que cambió no es la
  // medición sino la realidad, que dejó de contradecirla (ver abajo).
  //
  // ⚠️⚠️ ESTE `porRiesgo` CAMBIÓ DE SIGNIFICADO EL 2026-10-06, y el parecido de
  // los números lo esconde. Antes era 0.051 y ahora 0.05, así que de un vistazo
  // parece «casi no se movió». No es eso:
  //
  //   · 0.051 era la fila PAGANDO 0,5 pips de swap por noche
  //   · 0.05  es la fila de SOLO SPREAD, sin swap
  //
  // Se cambió para que esta fila y las dos de arriba midan lo MISMO: la app se
  // enseña con spread y sin swap, así que enseñar la reversión con swap encima
  // la castigaba a ella sola y hacía la comparación injusta en la dirección
  // cómoda. Las tres filas llevan ahora el MISMO peaje: spread por par y nada
  // de swap. (Lo que sigue siendo distinto, y a propósito, es la vara: `app` va
  // con la geometría real porque es lo que Néstor ve; `neutra` y `reversion`
  // van con la vara 1:1 porque es la que compara direcciones.)
  //
  // (fila «la reversión M2 (lo mejor medido)»: 870 · 54% · +0.05)
  reversion: {
    operaciones: 870,
    acierto: 54,
    porRiesgo: 0.05,
  },
}

// ⚠️⚠️ AQUÍ VIVÍA `REAL`, Y SE BORRÓ EL 2026-09-16. NO VOLVER A TRAERLO.
//
// Era un bloque escrito a mano con lo que llevaban en operaciones REALES la
// app y la reversión, y el tablero completo lo pintaba. **Se quedó viejo por
// SEGUNDA vez**, y esta vez enseñando una PÉRDIDA COMO GANANCIA:
//
//   en pantalla:  12 ops · 6–6 · +117 pips  (en verde)
//   la realidad:  18 ops · 7–11 · −337 pips (en rojo)
//
// Y el número de la app que guardaba (17 · 11 · −462) tenía además el signo al
// revés: lo real era 18 · 14 · +462.
//
// 📌 La primera vez que envejeció se corrigió a mano y se escribió aquí mismo
// «un número viejo en un comentario envejece en silencio». La corrección fue
// correcta y NO SIRVIÓ DE NADA: diez días después había vuelto a pasar. La
// lección no es que haga falta más cuidado — es que **un número que hay que
// acordarse de actualizar acaba mintiendo**, y este favorecía a un
// experimento, que es la peor dirección posible en este proyecto.
//
// Ahora el tablero lo cuenta EN VIVO con `useResumenReal()`, usando la misma
// función que la pestaña Historial. No hay nada que actualizar y los dos
// sitios no pueden discrepar.
//
// ⚠️ Lo de arriba (`MEDICION`) SÍ sigue a mano, y esto no es incoherencia: son
// cosas distintas. Eso sale de descargar 1.400 días de velas y recalcular el
// barrido día a día — media hora de servidor, imposible en el navegador. Esto
// de aquí salía de contar un archivo de 18 KB que la app ya sabe leer. Cuando
// contar en vivo es posible, escribirlo a mano no tiene defensa.
