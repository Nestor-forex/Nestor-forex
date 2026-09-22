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
