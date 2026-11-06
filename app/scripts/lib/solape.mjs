// ¿CUÁNTO SE PARECEN LAS SEÑALES QUE DEJAN PASAR DOS FILTROS?
//
// Lo necesita el criterio de independencia de un listón: si un filtro nuevo
// deja casi las mismas señales que otro ya medido, lo medido es el viejo con
// otro rótulo — y en este proyecto hay dos que ya suspendieron.
//
// ─────────────────────────────────────────────────────────────────────────
// LA DEFINICIÓN, Y POR QUÉ ESTA Y NO JACCARD
// ─────────────────────────────────────────────────────────────────────────
// `|A ∩ B| / |A|`: de las señales que deja el filtro CANDIDATO, qué fracción
// deja también el de referencia.
//
// 📌 No es la definición más elegante —Jaccard sería `|A∩B| / |A∪B|`— y se usa
// ésta a propósito: es **la misma con la que ya se publicaron dos números en
// este proyecto**, el 18 % de «comprar la caída» contra la reversión y el 76 %
// de Bollinger contra M2. Cambiar de definición dejaría tres cifras con el
// mismo nombre que no se pueden comparar entre sí, que es exactamente la clase
// de error que este repositorio lleva meses quitando.
//
// ⚠️ Y NO es simétrica: `solape(A, B) ≠ solape(B, A)`. El primer filtro es el
// candidato y el segundo la referencia. Al revés contestaría otra pregunta.

// Las señales se identifican por `id@vistoEl` y no por el objeto, que es la
// misma clave con la que `medir()` las empareja con su resultado. La misma
// combinación par/lado reaparece y cada aparición es una operación distinta.
export function claveDeSenal(s) {
  if (!s || s.id == null || s.vistoEl == null) return null
  return `${s.id}@${s.vistoEl}`
}

// Devuelve `{ candidato, referencia, comunes, fraccion }`, o `fraccion: null`
// cuando no se puede calcular.
//
// ⚠️ `null` NO es un aprobado. Con el candidato vacío no hay nada que comparar,
// y un 0 ahí se leería como «son completamente independientes» — que es la
// afirmación más favorable posible justo donde no se midió nada. Misma
// asimetría que `pearson` y que `mayorAportePorGrupo`.
export function solapeDeFiltros(senales, filtroCandidato, filtroReferencia) {
  const lista = Array.isArray(senales) ? senales : []

  const aKeys = new Set()
  for (const s of lista) {
    if (!filtroCandidato(s)) continue
    const k = claveDeSenal(s)
    if (k != null) aKeys.add(k)
  }

  const bKeys = new Set()
  for (const s of lista) {
    if (!filtroReferencia(s)) continue
    const k = claveDeSenal(s)
    if (k != null) bKeys.add(k)
  }

  let comunes = 0
  for (const k of aKeys) if (bKeys.has(k)) comunes++

  return {
    candidato: aKeys.size,
    referencia: bKeys.size,
    comunes,
    fraccion: aKeys.size ? comunes / aKeys.size : null,
  }
}

// Reparto crudo de las señales que pasan un filtro, por el grupo que diga
// `claveDe`. Es información, no un criterio: el criterio es el aporte a la
// mejora, que es otra cosa y puede decir lo contrario que el recuento.
export function repartoPorGrupo(senales, filtro, claveDe) {
  const out = new Map()
  for (const s of Array.isArray(senales) ? senales : []) {
    if (!filtro(s)) continue
    const k = claveDe(s)
    if (k == null) continue
    out.set(k, (out.get(k) ?? 0) + 1)
  }
  return out
}
