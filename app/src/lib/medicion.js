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
  fecha: '2026-09-04',
  desde: '2021-06-23',
  hasta: '2026-09-04',
  dias: 1436,

  // La app tal cual, con SU geometría de stop y objetivo, spread por par
  // descontado. Es lo que Néstor ve en pantalla, medido de verdad.
  app: {
    operaciones: 1693,
    acierto: 55,
    porRiesgo: -0.03,
  },

  // La misma app medida con la vara NEUTRA (stop y objetivo a la misma
  // distancia). Sirve para separar «acierta la dirección» de «gana dinero»:
  // con el objetivo más cerca que el stop se puede acertar mucho y perder
  // igual, y esta fila es la que lo desnuda.
  neutra: {
    operaciones: 1706,
    acierto: 48,
    porRiesgo: -0.06,
  },

  // La regla de reversión, que corre en la sombra sin enseñarse. Es lo único
  // positivo medido en todo el proyecto, y aun así no está encendida: en el
  // historial real va 0 de 5 y necesita 150-200 operaciones reales antes de
  // que backtest y realidad se hayan puesto de acuerdo.
  reversion: {
    operaciones: 872,
    acierto: 55,
    porRiesgo: 0.051,
  },
}
