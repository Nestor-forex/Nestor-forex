// EL LISTÓN DE «IR CONTRA LOS PEQUEÑOS», escrito el 2026-11-02 ANTES de medir.
//
// ─────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE LA PREGUNTA
// ─────────────────────────────────────────────────────────────────────────
// Néstor preguntó el 2026-11-02 si lo de «los minoristas pierden, hagamos lo
// contrario» estaba medido aquí. **No lo estaba**, y la respuesta tenía dos
// mitades:
//
//   · lo que SÍ se midió el 2026-09-14 fue ir a favor y en contra de los
//     GRANDES (los hedge funds, `lev_money`): once filas y las once perdieron,
//     con la dirección ganadora cambiando entre mitades — una moneda al aire;
//   · ir contra los PEQUEÑOS nunca se midió, y los dos grupos no son espejos:
//     el informe reparte a todo el mundo en CINCO familias, no en dos.
//
// Y al mirarlo apareció que **se puede medir sin ningún dato nuevo**: el mismo
// archivo de la CFTC que la app ya baja trae la familia `nonrept`, «los que no
// declaran». Cinco años de historia, cero créditos de Twelve Data, y sin
// depender del permiso de nadie.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE ESTO NO ES, Y VA ESCRITO ANTES DE VER UN SOLO NÚMERO
// ─────────────────────────────────────────────────────────────────────────
// **`nonrept` NO ES EL SENTIMIENTO MINORISTA.** La pregunta de Néstor venía de
// querer poner en pantalla el sentimiento de un agregador de brókers de Forex
// (Myfxbook) al lado del COT. Esto NO es eso, y las diferencias son grandes:
//
//   | | los pequeños del COT | el sentimiento minorista |
//   | quiénes | cuenta de futuros en el CME | cuenta en un bróker de Forex |
//   | tamaño | un contrato de euro = 125.000 € | 0,01 lotes = 1.000 unidades |
//   | qué cuenta | contratos (dinero) | % de cuentas (una cuenta, un voto) |
//   | cada cuánto | semanal, 8 días de retraso | cada 15 minutos |
//
// O sea que «pequeño» aquí significa pequeño **comparado con un banco**, no
// alguien con 500 dólares. Es un PARECIDO, y su único mérito frente al dato de
// verdad es que tiene cinco años de historia en vez de cero.
//
// Por eso el aprobado de aquí NO dice nada sobre Myfxbook — ver
// `QUE_SIGNIFICA_APROBAR_PEQUENOS` al final. Queda escrito antes de medir
// justo porque, si saliera positivo, la frase «entonces el sentimiento
// funciona» se diría sola.
//
// ─────────────────────────────────────────────────────────────────────────
// EL PRIOR, QUE ES MALO Y SE DICE IGUAL
// ─────────────────────────────────────────────────────────────────────────
// En estas dos apps van **diez familias de filtros medidas y diez que no
// aportan nada**: RSI, ADX, confluencia de marcos temporales, barrido de
// liquidez, el COT de los grandes, la compresión, el carry, Bollinger, el
// corte dólar/cruces en Intradía. Esta sería la siguiente de esa lista.
//
// Y hay dos cosas propias que lo hacen más dudoso todavía:
//
//   · **llega igual de tarde que el de los grandes** — es el MISMO informe, así
//     que se estaría filtrando la señal de hoy con una foto de hace 4 a 11
//     días;
//   · **«los pequeños pierden» es la frase más repetida del negocio**, y en
//     este proyecto hay doce casos documentados de un mecanismo convincente que
//     resultó falso al medirlo. Que suene evidente es motivo de sospecha, no de
//     confianza.
//
// ⚠️ SI ALGÚN CRITERIO QUEDA A UN PELO, LA RESPUESTA NO ES AFLOJARLO. Ése es
// exactamente el momento para el que se escribe esto antes.

export const FECHA_PREREGISTRO_PEQUENOS = '2026-11-02'

export const PREREGISTRO_PEQUENOS = [
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
      'es una regla: es un tramo de mercado. Es el listón que no pasó el ADX, y el que ' +
      'tumbó al COT de los grandes.',
  },
  {
    id: 'habla',
    que: 'Deja al menos 10 señales al mes',
    porque:
      'Un filtro que deja la app muda no es un filtro, es un apagado. Mismo número que el ' +
      'listón de los grandes, para que las dos mediciones se puedan comparar entre sí.',
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
      '⚠️ Se prueban las dos lecturas porque nadie sabe cuál es la buena, y aquí hay un ' +
      'agravante: la lectura popular («hacer lo contrario») es la que uno quiere que gane. ' +
      'Si en una mitad gana «seguir» y en la otra «ir en contra», no hay señal: hay una ' +
      'moneda al aire con dos caras que se turnan. Es justo lo que tumbó a los grandes.',
  },
  {
    id: 'sinCostes',
    que: 'La mejora sobrevive también SIN descontar costes',
    porque:
      '⚠️ PROPIO DE ESTA MEDICIÓN. Un filtro que solo quita señales puede parecer mejor sin ' +
      'acertar ni una dirección de más: basta que quite las de los cruces, que pagan 3 o 4 ' +
      'pips de spread contra menos de 1 de EUR/USD. Si la ventaja desaparece al quitar el ' +
      'peaje, era el peaje. Es el criterio que distinguió el H4 del NFX-LSS y el que explicó ' +
      'la compresión.',
  },
  {
    id: 'reparto',
    que: 'Ningún par aporta más del 40 % de la mejora',
    porque:
      'Con 14 pares, si uno solo se lleva casi todo lo ganado, lo medido es ese par y no la ' +
      'regla. Mismo criterio que en el listón de «comprar la caída» y en el del corte ' +
      'dólar/cruces.',
  },
]

// El veredicto lo CALCULA esta función, no lo argumenta nadie.
//
// ⚠️ `mejoraSinCostes` y `base...SinCostes` son del MISMO filtro y el MISMO
// universo de señales, solo sin descontar el spread. Compararlos con los de
// otra fila sería comparar dos cosas distintas.
export function juzgarPequenos(r) {
  const c = {}

  c.mejora = r.mejorPorR > r.basePorR
  c.mitades = r.mejorMitad1 > r.baseMitad1 && r.mejorMitad2 > r.baseMitad2
  c.habla = r.mejorSenalesMes >= 10
  c.vecinos = r.vecinosMejoran === true
  c.direccion = r.direccionMitad1 != null && r.direccionMitad1 === r.direccionMitad2
  // `null` en cualquiera de los dos es «no se pudo medir», y eso NO es un
  // aprobado. Misma asimetría que `pearson` devolviendo null.
  c.sinCostes =
    r.mejorSinCostes != null && r.baseSinCostes != null && r.mejorSinCostes > r.baseSinCostes
  // Lo mismo: sin reparto medido no se da por bueno.
  c.reparto = r.mayorAporteDeUnPar != null && r.mayorAporteDeUnPar <= 0.4

  return { criterios: c, aprobado: Object.values(c).every(Boolean) }
}

export const QUE_SIGNIFICA_APROBAR_PEQUENOS =
  'Pasar los siete es NECESARIO y NO SUFICIENTE, por dos razones distintas:\n' +
  '\n' +
  '  1. Estos mismos días ya se han mirado muchas veces en este proyecto, así que un\n' +
  '     aprobado aquí NO autoriza a encender nada: autoriza a seguir mirándolo, y lo\n' +
  '     único limpio sería un registro hacia adelante.\n' +
  '\n' +
  '  2. ⚠️⚠️ Y SOBRE TODO: UN APROBADO AQUÍ NO DICE NADA SOBRE EL SENTIMIENTO\n' +
  '     MINORISTA DE UN BRÓKER DE FOREX. Son dos poblaciones distintas —ver la\n' +
  '     cabecera—. Serían dos cosas distintas con un parecido, y tratar el parecido\n' +
  '     como la cosa es el error que esta app no comete. Como mucho, un aprobado\n' +
  '     sería un MOTIVO para ir a buscar el dato de verdad; nunca su sustituto.\n' +
  '\n' +
  'Y un SUSPENSO sí cierra bastante: si con cinco años del único grupo pequeño que se\n' +
  'puede medir no aparece ninguna ventaja, perseguir el dato minorista en vivo —con su\n' +
  'cuenta, su secreto, su permiso comercial y meses de espera— tiene mucho peor\n' +
  'pronóstico del que tenía antes de esta medición.'
