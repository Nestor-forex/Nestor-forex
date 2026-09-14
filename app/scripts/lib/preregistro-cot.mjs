// EL LISTÓN DEL COT COMO FILTRO, escrito el 2026-09-14 ANTES de medir nada.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ ESTO EXISTE ANTES QUE LA MEDICIÓN
// ─────────────────────────────────────────────────────────────────────────
// Néstor pidió medir si el COT sirve para filtrar las señales de la app, y lo
// pidió **como prueba, sin tocar la app**. La forma de que una prueba así
// signifique algo es fijar el aprobado ANTES de ver el resultado: si se escribe
// después, uno lo ajusta sin darse cuenta a lo que salió.
//
// Es el mismo mecanismo que `preregistro.mjs` (el de «comprar la caída», del
// 2026-09-07), y por el mismo motivo.
//
// ⚠️ SI ALGÚN CRITERIO QUEDA A UN PELO, LA RESPUESTA NO ES AFLOJARLO. Ése es
// exactamente el momento para el que se escribió esto antes.
//
// ─────────────────────────────────────────────────────────────────────────
// LO QUE YA SABEMOS ANTES DE EMPEZAR, Y QUE HACE ESTE LISTÓN EXIGENTE
// ─────────────────────────────────────────────────────────────────────────
// En este proyecto se han medido SEIS familias de filtros —RSI, ADX,
// confluencia de marcos temporales, barrido de liquidez y otras— y **todas
// fallaron**. Ninguna mejoró; varias empeoraron. Un séptimo filtro que
// «mejora un poquito» es, a priori, más probable que sea ruido que hallazgo.
//
// Y hay dos cosas propias del COT que lo hacen más dudoso todavía:
//
//   · **Llega tarde**: el informe del martes se publica el viernes. Se estaría
//     filtrando la señal de hoy con información de hace entre 4 y 10 días.
//   · **Nadie sabe en qué dirección leerlo**: media industria lee un
//     posicionamiento extremo como continuación y la otra media como vuelta.
//
// Esa segunda es la que obliga al criterio 5, que no estaba en el listón de
// «comprar la caída» y aquí es imprescindible.

export const FECHA_PREREGISTRO = '2026-09-14'

export const PREREGISTRO_COT = [
  {
    id: 'mejora',
    que: 'Mejora el «por 1R» frente a la app sin filtro, con la vara neutra 1:1 y con costes',
    porque:
      'Es la pregunta. Con la vara neutra porque es la honesta, y con costes porque sin ' +
      'ellos cualquier regla parece mejor de lo que es.',
  },
  {
    id: 'mitades',
    que: 'Mejora en LAS DOS mitades del periodo, no solo en el total',
    porque:
      'Una regla que gana mucho en una mitad y pierde en la otra da un total positivo y no ' +
      'es una regla: es un tramo de mercado. Es el mismo listón que no pasó el ADX.',
  },
  {
    id: 'habla',
    que: 'Deja al menos 10 señales al mes',
    porque:
      'Un filtro que deja la app muda no es un filtro, es un apagado. La app da ~28 al mes; ' +
      'por debajo de 10 el número deja de significar nada y además el producto se vacía.',
  },
  {
    id: 'vecinos',
    que: 'Los umbrales VECINOS también mejoran',
    porque:
      'Si funciona solo con un número exacto y sus vecinos pierden, no se encontró un efecto: ' +
      'se encontró una casualidad en la rejilla. Un efecto real se degrada suave.',
  },
  {
    id: 'direccion',
    que: 'La MISMA dirección (seguir o ir en contra) gana en las dos mitades',
    porque:
      '⚠️ ESTE ES EL PROPIO DEL COT. Se prueban las dos lecturas porque nadie sabe cuál es ' +
      'la buena. Si en una mitad gana «seguir a los fondos» y en la otra «ir en contra», no ' +
      'hay señal: hay una moneda al aire con dos caras que se turnan. Sin este criterio, ' +
      'mirar ambas direcciones y quedarse con la ganadora sería elegir a posteriori.',
  },
]

// El veredicto lo CALCULA esta función, no lo argumenta nadie.
//
// `r` trae, por cada dirección probada y cada umbral, lo medido. Devuelve qué
// criterios pasan y el aprobado final, que es el Y lógico de todos.
export function juzgarCot(r) {
  const c = {}

  c.mejora = r.mejorPorR > r.basePorR
  c.mitades = r.mejorMitad1 > r.baseMitad1 && r.mejorMitad2 > r.baseMitad2
  c.habla = r.mejorSenalesMes >= 10
  c.vecinos = r.vecinosMejoran === true
  c.direccion = r.direccionMitad1 != null && r.direccionMitad1 === r.direccionMitad2

  return { criterios: c, aprobado: Object.values(c).every(Boolean) }
}

export const QUE_SIGNIFICA_APROBAR_COT =
  'Pasar los cinco es NECESARIO y NO SUFICIENTE. Estos mismos días ya se han mirado muchas\n' +
  'veces en este proyecto, así que un aprobado aquí NO autoriza a encender el filtro en la\n' +
  'app: autoriza a seguir mirándolo. Lo único limpio sería el registro hacia adelante.\n' +
  '\n' +
  'Y un SUSPENSO sí cierra el asunto: el COT se queda como INFORMACIÓN en pantalla, con su\n' +
  'fecha y sus avisos, que es exactamente como está hoy.'
