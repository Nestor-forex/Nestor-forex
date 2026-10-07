// EL ARCHIVO QUE LEE LA APP.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ EXISTE ESTE ARCHIVO, Y POR QUÉ APARECIÓ TAN TARDE
// ─────────────────────────────────────────────────────────────────────────
// La app ya no le pide los precios a Twelve Data: lo hace el vigía una vez al
// día y publica aquí el barrido ya calculado (ver la cabecera de `vigia.mjs`).
//
// 📌 La app hermana tiene esto desde el 2026-09-02 **con su prueba**. Swing
// llevaba la misma lógica metida dentro de `vigia.mjs`, en línea, y por eso
// **no tenía prueba ninguna**: no había nada que importar sin arrancar el vigía
// entero, que necesita red y créditos.
//
// Se descubrió el 2026-09-22 al publicar campos nuevos: se buscó el guardia que
// la memoria decía que existía y **en Swing no estaba**. Es el patrón escrito
// en CLAUDE.md —«a los PRIMOS no los vigila nadie»— con una vuelta de tuerca:
// aquí el archivo **no existía en un lado**, y un archivo que falta en una sola
// app no lo caza ni el detector de duplicados sin clasificar, porque ése solo
// mira lo que está en las DOS.
//
// ─────────────────────────────────────────────────────────────────────────
// QUÉ SE PUBLICA Y QUÉ NO
// ─────────────────────────────────────────────────────────────────────────
// Todo lo que trae cada par MENOS las series largas. `derivarVista` se sigue
// ejecutando en el navegador y no aquí, porque necesita el idioma de cada
// persona y eso el servidor no lo sabe.
//
// ⚠️ Se quitan POR NOMBRE —lista de lo que SALE, no de lo que entra— y eso no
// es un detalle de estilo. Con una lista de lo que entra, el día que
// `computarBarrido` calcule un campo nuevo la app se quedaría sin él, y el
// fallo aparecería como una pantalla rara en el celular de Néstor, nunca como
// un error en ningún registro. Así al revés: lo nuevo pasa solo, y de que no se
// cuele una serie larga se encarga `prueba-barrido-publicado.mjs`.
//
// 📌 Esa decisión ya se pagó sola: `altos20` y `bajos20` (2026-09-22) llegaron
// a la app sin tocar este archivo.

// ⚠️ Son 300 números POR PAR, y hay 14 pares. Solo las necesita el resolver,
// que corre aquí mismo, en el vigía.
//
// Medido sobre el archivo REAL de producción el 2026-09-22, porque el número
// que había escrito («más de medio mega») estaba inflado unas diez veces y
// bloqueó una decisión durante mes y medio:
//
//     hoy publicado ......... 11,3 KB
//     + 20 días de máx/mín .. 14,4 KB   ← lo que se publica desde hoy
//     + los 300 completos ... 52,6 KB
//
// O sea que el motivo para dejar fuera los 300 **ya no es el tamaño**: es que
// solo los necesita «comprar la caída», que corre en la sombra y no se enseña
// hasta pasar su listón.
export const SERIES_LARGAS = ['highs', 'lows']

/**
 * Arma el objeto que se guarda en `estado/barrido.json`.
 *
 * @param data   lo que devuelve `computarBarrido`
 * @param ahora  Date de la corrida, para que el archivo diga cuándo se hizo
 */
export function armarBarrido(data, ahora = new Date()) {
  return {
    generadoEl: ahora.toISOString(),
    ultima: data.ultima,
    raw: data.raw,
    esc: data.esc,
    pares: data.pares.map((p) => {
      const salida = {}
      for (const [campo, valor] of Object.entries(p)) {
        if (!SERIES_LARGAS.includes(campo)) salida[campo] = valor
      }
      return salida
    }),
    ratesUSD: data.ratesUSD,
    // Qué pares se mueven juntos, ~2 KB. SÍ se publica —al revés que
    // `highs`/`lows`— porque la app no puede recalcularlo: necesita 60 cierres
    // por par y el barrido solo lleva los últimos 20.
    correl: data.correl,
  }
}

/**
 * Qué parte de una vela diaria normal trae la vela de HOY, que va a medias.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PARA QUÉ: EL PUBLICADOR CORRE A MEDIO DÍA (2026-10-07)
 * ─────────────────────────────────────────────────────────────────────────
 * El vigía corre una vez y tarde; `publicar-barrido.mjs` corre a las 11:20 y
 * las 19:20 UTC. La vela diaria va de 22:00 a 22:00 UTC, así que a las 11:20
 * lleva 13 horas de 24 — y de esa vela sale parte del ATR, y del ATR el stop.
 *
 * La aritmética dice que el efecto es despreciable (la vela más nueva pesa
 * 1/14 en Wilder y el cojín de ATR es el 16,6 % del stop, así que una vela al
 * 75 % mueve el stop un 0,3 %). Lo que NO está medido es a cuánto llega de
 * verdad esa vela a esa hora. Esto lo mide en cada corrida para que la
 * pregunta se conteste con datos en vez de con un comentario.
 *
 * ⚠️ NO DECIDE NADA. No apaga, no cambia y no filtra ninguna señal: solo
 * imprime un número en el log. Si algún día se quisiera usar para decidir,
 * eso sería un FILTRO y va al banco de pruebas con su listón escrito antes,
 * como todo lo demás — van siete familias medidas y siete fallando.
 *
 * Se compara contra la MEDIANA de las otras velas y no contra la media: basta
 * un día de noticias para que la media no describa a ninguna.
 *
 * ⚠️ Devuelve `null` —no 1, ni 0— cuando no se puede medir: sin extremos
 * publicados, con menos de dos velas, o si la mediana sale cero o no finita.
 * Un 1 diría «la vela está completa» y un 0 diría «está vacía»; las dos son
 * afirmaciones, y aquí lo cierto es que no se sabe. Misma asimetría que
 * `pearson` y que `edadEnMinutos`.
 *
 * @param barrido lo que devuelve `armarBarrido`
 * @returns {number|null} 1 = una vela entera; 0,5 = la mitad del recorrido
 */
export function anchoDeLaVelaEnCurso(barrido) {
  const cocientes = []

  for (const p of barrido?.pares || []) {
    const altos = p.altos20
    const bajos = p.bajos20
    if (!Array.isArray(altos) || !Array.isArray(bajos)) continue
    if (altos.length !== bajos.length || altos.length < 2) continue

    const rangos = altos.map((a, i) => a - bajos[i])
    if (!rangos.every(Number.isFinite)) continue

    const ultima = rangos[rangos.length - 1]
    const previas = rangos.slice(0, -1).sort((a, b) => a - b)
    const m = previas.length % 2
      ? previas[(previas.length - 1) / 2]
      : (previas[previas.length / 2 - 1] + previas[previas.length / 2]) / 2

    if (!(m > 0)) continue
    cocientes.push(ultima / m)
  }

  if (!cocientes.length) return null

  // La mediana de los 14 pares, por el mismo motivo que dentro de cada par.
  cocientes.sort((a, b) => a - b)
  return cocientes.length % 2
    ? cocientes[(cocientes.length - 1) / 2]
    : (cocientes[cocientes.length / 2 - 1] + cocientes[cocientes.length / 2]) / 2
}
