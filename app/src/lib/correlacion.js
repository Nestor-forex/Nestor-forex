// CORRELACIÓN ENTRE PARES: ¿cuáles se mueven juntos?
//
// ─────────────────────────────────────────────────────────────────────────
// QUÉ CONTESTA Y POR QUÉ ENTRA SIN MEDICIÓN
// ─────────────────────────────────────────────────────────────────────────
// La pregunta es: «si abro EUR/USD y GBP/USD a la vez, ¿estoy haciendo dos
// apuestas o una del doble de tamaño?». Eso es GESTIÓN DE RIESGO, no una
// predicción: no dice a dónde va el precio, dice cuánto se parecen dos pares.
//
// Por eso entra en la app sin pasar por el banco de pruebas, igual que el
// stop y la calculadora de lote. Un filtro que cambiara las señales —«no
// operes dos pares correlacionados»— sí tendría que medirse antes; enseñar
// el número no.
//
// El Diario ya avisa cuando dos operaciones abiertas comparten una divisa
// (EUR/USD y EUR/CHF comparten el euro). Esto lo convierte en un número
// medido en vez de una regla de dedo — y además caza los casos que la regla
// de dedo NO ve: AUD/USD y NZD/USD no comparten ninguna divisa y aun así se
// mueven casi igual.
//
// ⚠️ SE CALCULA SOBRE LOS CAMBIOS DIARIOS, NO SOBRE EL PRECIO. Correlacionar
// los precios a pelo da números altísimos y falsos: dos series que suben a lo
// largo del año «se parecen» aunque su día a día no tenga nada que ver. Lo que
// importa para el riesgo es si se mueven juntos EL MISMO DÍA.

// Tres meses de mercado, que es lo que publican los brókers en sus tablas y
// bastante más estable que un mes.
//
// Se eligió esta ventana y no una corta a propósito: con 20 días una
// coincidencia de dos semanas ya se ve como correlación alta, y el aviso
// saltaría por ruido. Una operación de Swing dura ~12 días de mediana, así que
// 60 sesiones cubren varias operaciones seguidas.
export const VENTANA_CORREL = 60

// A partir de aquí se considera que dos pares son «lo mismo» para efectos de
// riesgo. No es un número mágico: es el umbral que usa la industria para
// avisar, y está aquí arriba con nombre para que se pueda discutir en vez de
// aparecer suelto dentro de una condición.
export const CORREL_ALTA = 0.7

/** Cambios de un día al siguiente, en tanto por uno. */
export function cambiosDiarios(closes) {
  const out = []
  for (let i = 1; i < closes.length; i++) {
    const previo = closes[i - 1]
    // Un cero o un valor que no es número partiría la serie entera. Se salta
    // ese punto en vez de devolver NaN y contaminar todo lo que venga después.
    if (!Number.isFinite(previo) || previo === 0 || !Number.isFinite(closes[i])) continue
    out.push(closes[i] / previo - 1)
  }
  return out
}

/**
 * Correlación de Pearson entre dos listas del mismo largo.
 * Devuelve `null` —y no un número— cuando no se puede calcular: menos de dos
 * puntos, o una de las dos series plana (un par clavado todo el periodo).
 * Devolver 0 ahí sería mentir: 0 significa «no se parecen», y esto es «no se
 * sabe».
 */
export function pearson(a, b) {
  const n = Math.min(a.length, b.length)
  if (n < 2) return null

  let sa = 0
  let sb = 0
  for (let i = 0; i < n; i++) {
    sa += a[i]
    sb += b[i]
  }
  const ma = sa / n
  const mb = sb / n

  let num = 0
  let va = 0
  let vb = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma
    const db = b[i] - mb
    num += da * db
    va += da * da
    vb += db * db
  }
  if (va === 0 || vb === 0) return null

  const r = num / Math.sqrt(va * vb)
  // La aritmética de coma flotante puede dejar 1.0000000000000002, que luego
  // se imprime como 100 % y desconcierta. Se recorta al rango que existe.
  return Math.max(-1, Math.min(1, r))
}

/**
 * La matriz, como objeto plano con clave "A|B" (A antes que B alfabéticamente,
 * para que cada combinación aparezca UNA vez y siempre con la misma clave).
 *
 * Se guarda así y no como matriz 14×14 porque la mitad de una matriz es
 * espejo de la otra y la diagonal siempre vale 1: publicar las tres cosas
 * triplicaría el tamaño del archivo que baja cada miembro al abrir la app.
 *
 * @param pares  [{ name, serie }] — `serie` son CIERRES, no máximos.
 */
export function matrizCorrelacion(pares, ventana = VENTANA_CORREL) {
  const cambios = new Map()
  for (const p of pares) {
    // +1 porque de N cierres salen N−1 cambios.
    cambios.set(p.name, cambiosDiarios((p.serie || []).slice(-(ventana + 1))))
  }

  const out = {}
  for (let i = 0; i < pares.length; i++) {
    for (let j = i + 1; j < pares.length; j++) {
      const a = pares[i].name
      const b = pares[j].name
      const r = pearson(cambios.get(a), cambios.get(b))
      if (r == null) continue
      out[claveCorrel(a, b)] = Number(r.toFixed(2))
    }
  }
  return out
}

/** La clave de dos pares, siempre en el mismo orden. */
export const claveCorrel = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Busca la correlación de dos pares en la matriz. `null` si no está. */
export const correlDe = (matriz, a, b) => {
  if (a === b) return 1
  const v = matriz?.[claveCorrel(a, b)]
  return typeof v === 'number' ? v : null
}

/**
 * Las parejas que se mueven juntas (o al revés), de más a menos.
 *
 * ⚠️ Cuenta también las NEGATIVAS, y eso no es un detalle: dos pares con
 * correlación −0,9 se mueven al revés, así que comprar los dos es abrir y
 * cerrar la misma apuesta —te quedas con los dos spreads y con nada más—.
 * Para el riesgo, −0,9 es tan importante como +0,9. Por eso el orden va por
 * VALOR ABSOLUTO.
 *
 * @param soloEstos  si se pasa, solo parejas donde ambos estén en la lista
 *                   (sirve para «de las señales de HOY, cuáles van juntas»).
 */
export function paresQueVanJuntos(matriz, { minimo = CORREL_ALTA, soloEstos = null } = {}) {
  const permitido = soloEstos ? new Set(soloEstos) : null
  const filas = []
  for (const [clave, r] of Object.entries(matriz || {})) {
    if (Math.abs(r) < minimo) continue
    const [a, b] = clave.split('|')
    if (permitido && !(permitido.has(a) && permitido.has(b))) continue
    filas.push({ a, b, r, juntos: r > 0 })
  }
  return filas.sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
}

/**
 * ⚠️ LAS SEÑALES DE HOY: ¿cuáles son la MISMA APUESTA?
 *
 * Esto NO es `paresQueVanJuntos` con otra lista. La diferencia es la
 * DIRECCIÓN, y es la que decide si el riesgo se dobla o se anula:
 *
 *   | correlación | los dos lados | qué pasa de verdad                      |
 *   |-------------|---------------|-----------------------------------------|
 *   | +0,9        | los dos COMPRA| una apuesta del DOBLE de tamaño         |
 *   | +0,9        | uno de cada   | se ANULAN: dos spreads y nada más       |
 *   | −0,9        | los dos COMPRA| se ANULAN                               |
 *   | −0,9        | uno de cada   | una apuesta del DOBLE de tamaño         |
 *
 * O sea que la correlación sola NO basta para decir nada: «EUR/USD y USD/CHF
 * van a −0,83» es verdad y no dice si hoy conviene abrir los dos. Con el lado
 * delante sí se puede: se le da la vuelta al signo cuando los lados difieren y
 * lo que queda (`efectivo`) ya responde la pregunta directamente.
 *
 * La tarjeta de correlación del tablero enseña la primera cosa —el mapa del
 * mercado, que no cambia con lo que la app señale hoy— y esto enseña la
 * segunda. No se sustituyen.
 *
 * ⚠️ ES INFORMACIÓN, NO UN FILTRO. No apaga ni una señal, ni las reordena, ni
 * las puntúa. Apagar señales por correlación CAMBIARÍA las señales y tendría
 * que pasar por el banco de pruebas con su listón escrito antes, como el COT.
 * Aquí solo se pone delante un número que la app ya tenía calculado.
 *
 * ⚠️ Y SE LLAMA SOLO CON LAS SEÑALES DE UNA MISMA REGLA. Cruzar las de la app
 * con las de la sombra diría «estas dos van juntas» de dos operaciones que
 * nadie va a abrir a la vez, porque las de la sombra no se proponen.
 *
 * @param senales  [{ name, lado }] — `lado` es 'COMPRA' / 'VENTA' tal cual se
 *                 guarda, sin traducir (ver la nota de i18n del 2026-07-30).
 */
export function riesgoEntreSenales(matriz, senales, { minimo = CORREL_ALTA } = {}) {
  const lista = (senales || []).filter((s) => s && s.name && s.lado)
  const filas = []

  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const A = lista[i]
      const B = lista[j]
      // El mismo par en los dos lados no es un caso real de la app (cada par
      // recibe una sola clasificación), pero si algún día lo fuera, «EUR/USD
      // contra EUR/USD» no es una pareja: es un error de quien llama.
      if (A.name === B.name) continue

      const r = correlDe(matriz, A.name, B.name)
      // `null` es «no se pudo calcular», no «no se parecen». Saltar es lo
      // único honesto: inventar un 0 diría que no hay riesgo compartido.
      if (r == null) continue

      const efectivo = A.lado === B.lado ? r : -r
      if (Math.abs(efectivo) < minimo) continue

      filas.push({
        a: A.name,
        ladoA: A.lado,
        b: B.name,
        ladoB: B.lado,
        r,
        efectivo,
        // El único campo que la pantalla necesita para decidir qué decir.
        mismaApuesta: efectivo > 0,
      })
    }
  }

  // Por tamaño del efecto, no por el de la correlación cruda: lo que importa
  // es cuánto se dobla (o se anula) el riesgo de verdad.
  return filas.sort((x, y) => Math.abs(y.efectivo) - Math.abs(x.efectivo))
}
