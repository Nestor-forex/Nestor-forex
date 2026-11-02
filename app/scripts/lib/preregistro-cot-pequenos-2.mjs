// LOS DESCARTES DE «IR CONTRA LOS PEQUEÑOS», escritos el 2026-11-02 por la
// tarde, DESPUÉS de ver la tabla de la mañana. Y eso cambia lo que esto puede
// decir, así que va primero.
//
// ═════════════════════════════════════════════════════════════════════════
// ⚠️⚠️ ESTO NO ES UN LISTÓN DE APROBAR. NO PUEDE SERLO
// ═════════════════════════════════════════════════════════════════════════
//
// El listón de la mañana (`preregistro-cot-pequenos.mjs`, 2026-11-02) dio
// **NO PASA**, y lo suspendió un defecto de cómo estaba escrito: `juzgarPequenos`
// recibe «el mejor», y «el mejor» estaba definido como **el de mayor `porRiesgo`**.
// Ése resultó ser el umbral ≥ 15, con **55 operaciones y 0,9 señales al mes** —
// justo la fila más sobreajustada de la rejilla.
//
// Es el error clásico de las rejillas: *«quédate con el máximo»* premia la
// muestra más pequeña, porque es donde el ruido es mayor. Así que la fila con
// **1.011 operaciones** —que pasaba mejora, mitades, señales/mes y dirección—
// no se llegó a juzgar.
//
// ⚠️ EL LISTÓN DE LA MAÑANA NO SE TOCA Y SU VEREDICTO SIGUE SIENDO «NO PASA».
// El resultado ya está visto; cambiarle ahora cómo elige «el mejor» es
// exactamente lo que ese archivo prohíbe con esas palabras. La diferencia con
// los dos criterios que SÍ se corrigieron en este proyecto —el 70 % de señales
// del listón de cruces y el desplazamiento de Intradía— es que aquéllos se
// cambiaron **antes** de tener un solo resultado real, porque eran imposibles
// de cumplir por construcción.
//
// Y de ahí sale lo que este archivo es y lo que no:
//
//   · **el candidato se fija por nombre, y se eligió DESPUÉS de ver la tabla.**
//     Por honesto que sea el motivo (es la fila con más operaciones y la que
//     el defecto dejó sin juzgar), elegirlo con el número delante es troceo a
//     posteriori — el mismo que este proyecto rechazó con el control de la
//     confluencia y con el del barrido de liquidez;
//   · **por tanto ninguno de estos criterios puede APROBAR nada.** Lo único que
//     pueden hacer es TUMBARLO. Si sobrevive a los seis, lo que queda no es un
//     aprobado: es que no se ha encontrado la razón por la que no vale.
//
// Es la misma situación del LSS el 2026-09-20, resuelta igual.
export const FUENTE_DEL_VEREDICTO_PEQUENOS_2 = 'registro hacia adelante'

export const FECHA_DESCARTES_PEQUENOS = '2026-11-02'

// ⚠️ EL CANDIDATO VA FIJADO AQUÍ, NO SE BUSCA. Si se buscara «el que mejor
// sobreviva a los descartes», volveríamos al mismo error con otra cara: la
// rejilla tiene diez filas y siempre hay una que aguanta.
export const CANDIDATO_PEQUENOS = { dir: 'contra', umbral: 0 }

// ─────────────────────────────────────────────────────────────────────────
// LOS SEIS DESCARTES
// ─────────────────────────────────────────────────────────────────────────
export const DESCARTES_PEQUENOS = [
  {
    id: 'vecinos',
    que: 'Los umbrales VECINOS del candidato también mejoran',
    porque:
      'No se midió en la corrida de la mañana: los vecinos se calcularon solo para la fila del ' +
      'máximo. Un efecto real se degrada suave; si funciona en un número exacto y sus vecinos ' +
      'pierden, es una casualidad de la rejilla.',
  },
  {
    id: 'sinCostes',
    que: 'La mejora sobrevive también SIN descontar costes',
    porque:
      'Tampoco se midió para esta fila. Un filtro que solo quita señales puede parecer mejor ' +
      'sin acertar ni una dirección de más: basta que quite las de los cruces, que pagan 3 o 4 ' +
      'pips de spread contra menos de 1 de EUR/USD. Si la ventaja desaparece al quitar el ' +
      'peaje, era el peaje.',
  },
  {
    id: 'reparto',
    que: 'Ningún par aporta más del 40 % de la mejora',
    porque:
      'Con 14 pares, si uno se lleva casi todo lo ganado, lo medido es ese par y no la regla. ' +
      'Mismo criterio y mismo número que en «comprar la caída» y en el corte dólar/cruces.',
  },
  {
    id: 'independiente',
    que: 'Solapa MENOS DEL 60 % con el mismo filtro aplicado a los fondos',
    porque:
      '⚠️ PROPIO DE ESTA MEDICIÓN, Y ES EL DESCARTE MÁS IMPORTANTE. El COT de los GRANDES se ' +
      'midió el 2026-09-14 y el 2026-11-02, y suspendió las dos veces. Si ir contra los ' +
      'pequeños deja casi las mismas señales que ir contra los fondos, esto no es un hallazgo ' +
      'nuevo: es el filtro suspendido con otro rótulo.\n' +
      'El 60 % no es redondo por gusto: es el punto en que más de la mitad de las señales son ' +
      'compartidas, o sea que el conjunto lo manda la otra familia. A favor de que NO lo sean ' +
      'está que los dos dan signos opuestos sobre el mismo periodo (−0,033 contra +0,052), ' +
      'cosa imposible si fueran el mismo conjunto. Pero eso es un indicio, no la medición.',
  },
  {
    id: 'noEsElDolar',
    que: 'Ningún lado del dólar (comprarlo, venderlo, no tocarlo) aporta más del 50 % de la mejora',
    porque:
      '⚠️ PROPIO DE ESTA MEDICIÓN. El periodo 2021-2026 es el ciclo de subidas de la Fed, y el ' +
      'dólar fue la divisa fuerte buena parte de él. Un filtro que «funciona» aquí puede estar ' +
      'midiendo una apuesta direccional al dólar de ESTE tramo y no una regla.\n' +
      'El 50 % es más flojo que el 40 % de los pares a propósito: aquí solo hay TRES grupos ' +
      'y 7 de los 14 pares llevan dólar dentro, así que una concentración moderada es lo ' +
      'normal y no significa nada. Lo que se busca es el caso en que un solo lado se lleva ' +
      'la mitad o más.',
  },
  {
    id: 'habla',
    que: 'Sigue dejando al menos 10 señales al mes',
    porque:
      'Se cumplía en la corrida de la mañana (17,5) y se vuelve a comprobar porque es el ' +
      'criterio que convierte un filtro en un apagado. Mismo número que los otros dos listones ' +
      'del COT, para que las tres mediciones se puedan comparar entre sí.',
  },
]

// El veredicto lo CALCULA esta función.
//
// ⚠️ Devuelve `sobrevive`, NO `aprobado`, y el nombre es deliberado: «no se ha
// encontrado la razón por la que no vale» y «vale» no son lo mismo, y en una
// tabla se leen igual si no se separan. Una etiqueta equivocada es un error de
// medición.
export function juzgarDescartesPequenos(r) {
  const c = {}

  c.vecinos = r.vecinosMejoran === true
  // `null` en cualquiera de los dos es «no se pudo medir», y eso NO salva.
  c.sinCostes =
    r.candidatoSinCostes != null && r.baseSinCostes != null && r.candidatoSinCostes > r.baseSinCostes
  c.reparto = r.mayorAporteDeUnPar != null && r.mayorAporteDeUnPar <= 0.4
  c.independiente = r.solapeConFondos != null && r.solapeConFondos < 0.6
  c.noEsElDolar = r.mayorAporteDeUnLadoDelDolar != null && r.mayorAporteDeUnLadoDelDolar <= 0.5
  c.habla = r.candidatoSenalesMes >= 10

  return { criterios: c, sobrevive: Object.values(c).every(Boolean) }
}

export const QUE_SIGNIFICA_SOBREVIVIR_PEQUENOS =
  'SOBREVIVIR A LOS SEIS DESCARTES NO ES UN APROBADO, y la diferencia no es de matiz:\n' +
  '\n' +
  '  1. ⚠️ El candidato se eligió DESPUÉS de ver la tabla. Los descartes solo pueden\n' +
  '     tumbarlo; ninguno puede convertir una elección a posteriori en un hallazgo.\n' +
  '     Lo único limpio sería un registro hacia adelante — ver\n' +
  '     `FUENTE_DEL_VEREDICTO_PEQUENOS_2`.\n' +
  '\n' +
  '  2. ⚠️⚠️ ESTO ES UN FILTRO, Y EN ESTAS DOS APPS VAN DIEZ FAMILIAS DE FILTROS\n' +
  '     MEDIDAS Y DIEZ QUE NO APORTAN NADA. Encenderlo cambiaría lo que la app\n' +
  '     propone, así que no se enciende con un backtest: nunca se ha hecho en este\n' +
  '     proyecto y no es el día de empezar.\n' +
  '\n' +
  '  3. ⚠️ Y SIGUE SIN DECIR NADA SOBRE EL SENTIMIENTO MINORISTA DE UN BRÓKER DE\n' +
  '     FOREX. Son dos poblaciones distintas —un contrato de euro del CME son\n' +
  '     125.000 €— y está escrito en el listón de la mañana, antes de ver un número.\n' +
  '\n' +
  'Qué SÍ autorizaría sobrevivir: proponerle a Néstor que el vigía ANOTE el sesgo del\n' +
  'COT en cada señal, como ya anota el RSI y `huboSweep`. Eso no enciende nada, no\n' +
  'cuesta un crédito, y en unos meses dejaría la pregunta re-respondible con datos\n' +
  'que nadie ha mirado todavía. Es lo más barato que se puede hacer con una idea que\n' +
  'el histórico no puede juzgar limpiamente.\n' +
  '\n' +
  'Y un TUMBADO sí cierra: con el candidato descartado por una razón concreta, la\n' +
  'pregunta de los pequeños queda cerrada para estos cinco años y no hay que volver.'
