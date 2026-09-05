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

// LO QUE LLEVA EN OPERACIONES REALES, que es distinto del banco de pruebas y
// es lo que de verdad decide.
//
// 📌 ESTE BLOQUE CORRIGE UN NÚMERO QUE ESTUVO MAL ESCRITO AQUÍ.
// Hasta el 2026-09-05 el comentario de arriba decía «en el historial real va
// 0 de 5». Era verdad cuando se escribió y dejó de serlo sin que nadie lo
// mirara: al contarlo de nuevo iban 12 resueltas, 6 y 6. Un número viejo en un
// comentario envejece en silencio, que es justo lo que estas fechas evitan.
//
// CÓMO SE ACTUALIZAN: bajar
// raw.githubusercontent.com/Nestor-forex/Nestor-forex/datos/historial/resultados.jsonl
// y contar por `tipo`. La pestaña Historial ya lo calcula sola y en vivo; esto
// es solo para poder enseñarlo al lado de la señal, sin esperar esa descarga.
export const REAL = {
  fecha: '2026-09-05',

  // Las señales que la app da hoy. El contraste entre estas dos filas es el
  // argumento entero: la app ACIERTA MÁS y PIERDE MÁS. Con el objetivo más
  // cerca que el stop se gana muchas veces poquito y se pierde pocas veces
  // mucho, y por eso el porcentaje de acierto, solo, no dice nada.
  app: { resueltas: 17, ganadas: 11, perdidas: 6, pips: -462 },

  // La reversión, anotada en paralelo desde el 2026-08-18.
  reversion: { resueltas: 12, ganadas: 6, perdidas: 6, pips: 117 },
}
