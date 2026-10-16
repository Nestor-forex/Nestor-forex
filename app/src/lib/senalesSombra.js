// Lo que señalaron HOY las reglas que corren en pruebas.
//
// Néstor lo pidió el 2026-10-13: «quiero ver sus movimientos y resultados
// diarios en las apps». Hasta hoy el Historial enseñaba sus PORCENTAJES —
// cuántas ganaron, cuántos pips— pero no las señales en sí, así que no había
// forma de ver qué par y qué niveles marcó cada regla.
//
// ⚠️ DE DÓNDE SALEN, y por qué de ahí y no recalculándolas.
//
// Salen de `historial/senales.jsonl`, el archivo que el vigía escribe y que
// esta pantalla YA baja para los porcentajes. Cero datos nuevos, cero
// créditos de Twelve Data y cero archivos que publicar.
//
// Pero el motivo de fondo no es el ahorro: es que recalcularlas en el
// navegador daría **otro** número. Dos de las cuatro reglas no se pueden
// calcular aquí —«comprar la caída» necesita los 300 extremos, que
// `barrido.json` descarta, y la ruptura de estructura vive en un guion— así
// que media lista saldría vacía sin que nada fallara. Y las dos que sí se
// pueden saldrían del precio de AHORA, no del que tenía el par cuando el
// vigía la anotó: la pantalla y el historial discreparían, y el historial es
// lo único irrecuperable del proyecto. Se lee lo ANOTADO.
//
// ⚠️ NO SE DICE «HOY» EN NINGUNA PARTE. Se enseña la FECHA de cada grupo. El
// vigía corre de lunes a viernes y el reloj de GitHub se le ha saltado días
// enteros (el viernes 5 de septiembre se perdió), así que lo último anotado
// puede ser de hace tres días. Llamarlo «hoy» sería afirmar algo que no se ha
// comprobado — y la fecha al lado lo dice sin afirmar nada.

// Las reglas que corren en la sombra, en el orden en que se enseñan.
//
// ⚠️ VA ESCRITA A MANO, como GEMELOS/PRIMOS y por el mismo motivo. Calcularla
// («todos los `tipo` que aparezcan») sería más cómodo y escondería justo lo
// que hay que ver: una regla que el vigía dejara de anotar desaparecería de
// la pantalla sin que nadie lo notara, que es el fallo contrario al de
// `filasOtras` y cuesta lo mismo.
//
// ⚠️ `'tendencia'` NO está, y no es un descuido: una señal de sombra con ese
// tipo es una VENTA PAUSADA — una señal de la propia app que se anota pero no
// se propone. Puesta entre los experimentos se leería como una regla nueva.
export const REGLAS_SOMBRA = Object.freeze(['reversion', 'caida', 'lss', 'bollinger'])

/**
 * El día de una señal, para agrupar.
 *
 * ⚠️ Se usa `cierre` (la fecha de la VELA) y no `vistoEl` (el instante en que
 * corrió el vigía). Son dos cosas distintas: el vigía puede correr a las 20:30
 * UTC y estar juzgando la vela del día anterior. `cierre` es lo que la señal
 * describe; `vistoEl` es cuándo se escribió.
 */
export function diaDe(senal) {
  if (typeof senal?.cierre === 'string' && /^\d{4}-\d{2}-\d{2}/.test(senal.cierre)) {
    return senal.cierre.slice(0, 10)
  }
  // Las líneas viejas pueden no traer `cierre`. Se cae a la fecha de `vistoEl`
  // en vez de descartar la señal: una fila con el día aproximado se lee; una
  // que no sale, no.
  if (typeof senal?.vistoEl === 'string' && /^\d{4}-\d{2}-\d{2}/.test(senal.vistoEl)) {
    return senal.vistoEl.slice(0, 10)
  }
  return null
}

/**
 * Para cada regla de la sombra, sus señales del ÚLTIMO día que señaló.
 *
 * Devuelve SIEMPRE las cuatro, también las que no han señalado nunca
 * (`senales: []`, `fecha: null`).
 *
 * ⚠️ Eso último es deliberado y es media razón de que esto exista. Esconder
 * una regla sin señales dejaría en pantalla solo lo que parece estar pasando
 * algo, que es cómo se fabrica un espejismo — la misma decisión que los grupos
 * con n = 0 de `Diagnostico`. Y para Néstor, que pidió «no silencio», una
 * regla que dice «todavía nada» informa; una que desaparece, no.
 *
 * @param senales  las líneas crudas de `senales.jsonl`
 * @param reglas   para las pruebas; por defecto `REGLAS_SOMBRA`
 */
export function senalesDelUltimoDia(senales, reglas = REGLAS_SOMBRA) {
  const lista = Array.isArray(senales) ? senales : []

  return reglas.map((tipo) => {
    const suyas = lista.filter((s) => s?.tipo === tipo && diaDe(s))
    if (!suyas.length) return { tipo, fecha: null, senales: [] }

    // El día más reciente que esa regla señaló. Las fechas son ISO, así que
    // se comparan como texto sin pasar por `Date` — que es donde se cuelan los
    // husos horarios.
    const fecha = suyas.reduce((max, s) => {
      const d = diaDe(s)
      return d > max ? d : max
    }, '')

    const delDia = suyas
      .filter((s) => diaDe(s) === fecha)
      // Por par, para que el orden no dependa de en qué orden las escribió el
      // vigía: dos cargas de la misma pantalla tienen que dar la misma lista.
      .sort((a, b) => String(a.par).localeCompare(String(b.par)))

    return { tipo, fecha, senales: delDia }
  })
}

/**
 * ¿Hay algo que enseñar? Si NINGUNA regla ha señalado nunca, la tarjeta entera
 * sobra: sería un marco vacío repetido cuatro veces.
 */
export function hayAlgoQueEnsenar(grupos) {
  return (grupos || []).some((g) => g?.senales?.length > 0)
}
