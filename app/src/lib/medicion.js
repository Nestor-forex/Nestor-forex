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
  fecha: '2026-09-05',
  desde: '2021-06-24',
  hasta: '2026-09-05',
  dias: 1436,

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
  // La app tal cual, con SU geometría de stop y objetivo, spread por par
  // descontado. Es lo que Néstor ve en pantalla, medido de verdad.
  app: {
    operaciones: 2320,
    acierto: 56,
    porRiesgo: -0.03,
  },

  // La misma app medida con la vara NEUTRA (stop y objetivo a la misma
  // distancia). Sirve para separar «acierta la dirección» de «gana dinero»:
  // con el objetivo más cerca que el stop se puede acertar mucho y perder
  // igual, y esta fila es la que lo desnuda.
  neutra: {
    operaciones: 2331,
    acierto: 48,
    porRiesgo: -0.05,
  },

  // La regla de reversión: comprar lo que se cayó en vez de lo que sube. Es lo
  // único positivo medido en todo el proyecto.
  //
  // ⚠️ DESDE EL 2026-09-05 YA NO CORRE EN LA SOMBRA: se enseña en el tablero,
  // en su propia sección y marcada como experimento. Lo que cambió no es la
  // medición sino la realidad, que dejó de contradecirla (ver abajo).
  reversion: {
    operaciones: 872,
    acierto: 55,
    porRiesgo: 0.051,
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
