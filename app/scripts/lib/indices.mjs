// ¿SIRVE ENSEÑAR EL ÍNDICE DEL DÓLAR Y UN PAR DE ÍNDICES? La parte que se
// puede comprobar sin red.
//
// Lo pidió Néstor el 2026-10-30: «calculas la fuerza del dólar y no enseñas el
// índice del dólar».
//
// ⚠️⚠️ LA HIPÓTESIS, ESCRITA ANTES DE VER UN SOLO NÚMERO, Y VA EN CONTRA
//
// El índice del dólar (DXY) **es una media ponderada de seis pares**, y cinco
// de los seis ya están dentro de esta app:
//
//     EUR 57,6 %  ·  JPY 13,6 %  ·  GBP 11,9 %  ·  CAD 9,1 %  ·
//     SEK 4,2 %   ·  CHF 3,6 %
//
// Y la app ya calcula la fuerza del dólar con esas mismas divisas. Así que lo
// más probable es que DXY y la fuerza del dólar de la app **sean casi el mismo
// número con otro nombre**, y entonces la tarjeta no añadiría información:
// sería un adorno, que es exactamente lo que se evitó con el oro (un precio
// suelto habría sido la primera tarjeta decorativa de la app).
//
// 📌 POR ESO LA SONDA LO MIDE: la correlación entre el índice y la fuerza del
// dólar que la app ya enseña. Si sale por encima de 0,9 en valor absoluto, la
// respuesta honesta a Néstor es «ya lo estás viendo, con otro rótulo». Si sale
// más baja, entonces el índice dice algo que la app no dice, y merece pantalla.
//
// ⚠️ Un ÍNDICE DE BOLSA (S&P 500, VIX) es otra cosa y NO cae en esa trampa: no
// se construye con divisas, así que puede traer información nueva (apetito de
// riesgo). Lo que hay que comprobar es si el plan gratuito los da.
//
// ⚠️ Y SERÍA INFORMACIÓN, NO UN FILTRO. Apagar señales con el DXY o con el VIX
// iría al banco de pruebas con su propio listón escrito antes. Van DIEZ
// familias de filtros medidas y diez que no aportan nada.

/**
 * ⚠️ LA TRAMPA DEL ORO, que es el motivo de que esta función exista.
 *
 * El 2026-09-29 `GOLD`, `CL`, `WTI` y `BZ` contestaron **200 con cinco velas
 * perfectamente válidas** y eran ACCIONES de la bolsa de Nueva York (`WTI`
 * resultó ser «W&T Offshore Inc.» y `BZ` una empresa china de reclutamiento).
 * Un lector que aceptara «200 con velas» habría publicado «oro: 42,85».
 *
 * No se caza por el código de respuesta: se caza mirando `type`.
 */
export const TIPOS_DE_ACCION = [
  'common stock',
  'preferred stock',
  'adr',
  'etf',
  'mutual fund',
  'reit',
  'depositary receipt',
  'warrant',
  'unit',
  'right',
]

/** Lo que sí puede ser un índice, según lo que Twelve Data rotula. */
export const TIPOS_DE_INDICE = ['index', 'indices', 'economic indicator']

/**
 * ¿Es de verdad un índice, o es una acción que se llama parecido?
 *
 * Devuelve `{ ok, porque }`. ⚠️ Ante la duda dice que NO: un `type` vacío o
 * desconocido no se aprueba. Los dos errores no cuestan lo mismo — aprobar una
 * acción creyendo que es un índice publica un número falso y creíble; rechazar
 * un índice de verdad solo deja la pregunta abierta otro día.
 *
 * ⚠️⚠️ `TIPOS_DE_ACCION` NO ES LA RED QUE DECIDE, y conviene saberlo: la que
 * decide es la última línea, porque un tipo desconocido se rechaza igual. Se
 * comprobó quitando la lista a propósito y el veredicto no cambió.
 *
 * Lo que la lista aporta es el MOTIVO en el log, y eso no es cosmético: «es una
 * acción» CIERRA la pregunta (esa grafía no es la que buscamos) y «no sé qué es
 * esto» la DEJA ABIERTA (puede ser un índice que esta fuente rotula raro). Las
 * dos llevan al mismo rechazo y no significan lo mismo, igual que «miré y no
 * hay» no es «no pude mirar».
 */
export function esIndiceDeVerdad(meta) {
  const tipo = String(meta?.type ?? '').trim().toLowerCase()
  if (!tipo) return { ok: false, porque: 'no dice `type`' }
  if (TIPOS_DE_ACCION.includes(tipo)) return { ok: false, porque: `es \`${tipo}\`, no un índice` }
  if (TIPOS_DE_INDICE.includes(tipo)) return { ok: true, porque: `\`${tipo}\`` }
  return { ok: false, porque: `\`${tipo}\` no está en la lista de tipos de índice` }
}

/**
 * Rangos plausibles, para que un 200 con velas válidas de OTRA cosa no pase.
 *
 * ⚠️ Son holgados a propósito: lo que tienen que cazar es un número de otro
 * orden de magnitud (una acción a 42 donde se espera un índice a 4.000), no
 * afinar una cotización.
 */
export const RANGOS_PLAUSIBLES = {
  dolar: [70, 130], // el DXY lleva décadas entre 70 y 115
  sp500: [1000, 15000],
  nasdaq: [3000, 40000],
  vix: [5, 100],
  dax: [5000, 40000],
}

/** ¿Cae el precio donde tiene que caer? Sin rango conocido, no se juzga. */
export function precioPlausible(valor, clave) {
  const r = RANGOS_PLAUSIBLES[clave]
  if (!r) return null
  if (!Number.isFinite(valor)) return false
  return valor >= r[0] && valor <= r[1]
}

/**
 * Cuántos años de historia trae una lista de fechas (ISO, cualquier orden).
 * Devuelve `null` —y nunca 0— si no se puede medir: un 0 diría «no tiene
 * historia», que es una afirmación.
 */
export function anosDeHistoria(fechas) {
  const ts = (fechas ?? [])
    .map((d) => Date.parse(String(d).slice(0, 10) + 'T00:00:00Z'))
    .filter(Number.isFinite)
  if (ts.length < 2) return null
  return (Math.max(...ts) - Math.min(...ts)) / (365.25 * 86400000)
}

/**
 * Cuántas fechas comparten dos series, y qué fracción de la más corta es.
 *
 * ⚠️ Existe porque el índice viene de UNA consulta y los 14 pares de OTRA, y
 * sus calendarios no coinciden. Comparar por POSICIÓN —el elemento 5 de uno
 * contra el 5 del otro— bastaría un día de diferencia para estar comparando
 * días distintos, y **no daría ningún error**: daría una correlación creíble
 * calculada sobre fechas que no son las mismas. Es el fallo que ya se evitó en
 * la tarjeta del oro.
 */
export function fechasComunes(a, b) {
  const sa = new Set((a ?? []).map((d) => String(d).slice(0, 10)))
  const sb = new Set((b ?? []).map((d) => String(d).slice(0, 10)))
  const comunes = [...sa].filter((d) => sb.has(d)).sort()
  const menor = Math.min(sa.size, sb.size)
  return { comunes, n: comunes.length, fraccion: menor ? comunes.length / menor : null }
}

/**
 * EL VEREDICTO, y lo calcula esto — no lo argumenta nadie.
 *
 * ⚠️⚠️ SIN FICHAS LEÍDAS NO HAY VEREDICTO. «Pregunté y ninguno sirve» es un
 * hallazgo; «no se pudo mirar» no es nada, y las dos cosas se escriben igual.
 * Es el agujero que ya mordió el 2026-09-14, cuando mi propio informe escribió
 * «no la publican» habiendo leído CERO páginas.
 */
export function veredicto(fichas) {
  const vistas = (fichas ?? []).filter((f) => f && f.respondio)
  if (!vistas.length) {
    return {
      estado: 'noSePudoMirar',
      texto: 'NO SE PUDO MIRAR: ninguna consulta llegó a responder. Esto NO dice que no exista.',
      sirven: [],
    }
  }
  const sirven = vistas.filter((f) => f.esIndice && f.precioOk !== false && f.velas > 0)
  if (!sirven.length) {
    return {
      estado: 'ningunoSirve',
      texto: `Se miraron ${vistas.length} y NINGUNO sirve: o no es un índice de verdad, o el precio no es plausible, o no trae velas.`,
      sirven: [],
    }
  }
  return {
    estado: 'hayCandidatos',
    texto: `Se miraron ${vistas.length} y ${sirven.length} sirven: ${sirven.map((f) => f.simbolo).join(', ')}.`,
    sirven: sirven.map((f) => f.simbolo),
  }
}

/**
 * ¿El índice del dólar aporta algo sobre lo que la app ya enseña?
 *
 * `r` es la correlación entre los cambios diarios del índice y los de la
 * fuerza del dólar que la app ya calcula.
 *
 * ⚠️ Se mira el VALOR ABSOLUTO: una correlación de −0,95 es tan redundante
 * como una de +0,95 — solo cambia el signo del rótulo. Es la misma decisión
 * que en `correlacion.js`, donde las negativas pesan igual.
 */
export const REDUNDANTE_DESDE = 0.9

export function aportaAlgo(r) {
  if (r === null || !Number.isFinite(r)) {
    return { aporta: null, texto: 'no se pudo calcular: ni «aporta» ni «no aporta»' }
  }
  if (Math.abs(r) >= REDUNDANTE_DESDE) {
    return {
      aporta: false,
      texto:
        `r = ${r.toFixed(2)} contra la fuerza del dólar que la app YA enseña. ` +
        `Por encima de ${REDUNDANTE_DESDE} en valor absoluto es el mismo número con otro ` +
        `nombre: la tarjeta sería un adorno.`,
    }
  }
  return {
    aporta: true,
    texto:
      `r = ${r.toFixed(2)} contra la fuerza del dólar de la app. Por debajo de ` +
      `${REDUNDANTE_DESDE} dice algo que la app no dice, así que merece pantalla.`,
  }
}
