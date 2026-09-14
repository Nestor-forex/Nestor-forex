// EL COT: cuántos futuros de cada divisa tienen comprados y vendidos los
// grandes operadores, según la CFTC.
//
// La #4 de la fase de información. Las cuentas puras, sin React y sin red, para
// que sirvan igual desde Node (`scripts/publicar-cot.mjs`) y desde el navegador.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO MÁS IMPORTANTE DE ESTE ARCHIVO NO ES TÉCNICO
// ─────────────────────────────────────────────────────────────────────────
// Estas cinco cosas se escribieron en `scripts/sonda-cot.mjs` **antes de ver
// un solo número**, a propósito, igual que la advertencia del swap en
// `sonda-tasas.mjs`. Cada una es una forma de exagerar el COT que esta app no
// va a usar:
//
// **1. ESTO NO ES «LO QUE HACEN LOS BANCOS».** Son posiciones en FUTUROS, casi
//    todos del CME. El Forex de verdad es sobre todo contado y forwards entre
//    bancos, fuera de bolsa. Los futuros son la rebanada que está obligada a
//    declarar, no el mercado. Llamarlo «lo que hace el dinero grande» sería el
//    mismo error que llamar «volumen» al contador de ticks de un bróker.
//
// **2. LLEGA CON DÍAS DE RETRASO, SIEMPRE.** La CFTC publica los viernes por la
//    tarde con los datos del MARTES anterior. El día que sale ya tiene tres
//    días; para el jueves siguiente tiene diez. **MEDIDO:** el domingo
//    2026-09-14 el dato más reciente era del martes 2026-09-08. Seis días.
//    → Por eso `fecha` viaja con el dato y la pantalla la enseña SIEMPRE.
//
// **3. `lev_money` SON HEDGE FUNDS, NO «DINERO LISTO».** Es la familia que
//    todo el mundo mira y llama «los especuladores», y pierden como cualquiera.
//    Los `dealer` (bancos e intermediarios) son casi su espejo exacto, así que
//    enseñar un lado y llamarlo «el mercado» es elegir la mitad que cuadra con
//    lo que uno quería decir.
//
// **4. UN POSICIONAMIENTO EXTREMO SE LEE DE DOS FORMAS OPUESTAS**, y esta app
//    NO sabe cuál acierta: una escuela dice que confirma la tendencia, la otra
//    que anuncia la vuelta porque ya no queda nadie por entrar. Las dos suenan
//    razonables. **Cuál acierta aquí no está medido.**
//
// **5. DEL DÓLAR NO HAY COT DE DIVISA**, solo del índice, y cotiza en ICE, no
//    en el CME. Es un contrato pequeño (57.858 de interés abierto contra
//    942.464 del euro). O sea que la divisa que sale en los 14 pares del
//    barrido es justo la peor cubierta. Va con su propia etiqueta.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ ESTO ES INFORMACIÓN, NO UN FILTRO
// ─────────────────────────────────────────────────────────────────────────
// En la fase de información quedó escrita la distinción que manda aquí:
// **información** entra sin medición porque no promete acertar más; **filtro**
// cambiaría las señales y NO entra sin pasar por el banco de pruebas.
//
// **El COT está en la lista de FILTROS.** Enseñarlo en pantalla con su fecha y
// sus advertencias es legítimo; apagar o encender una señal con él NO lo es
// hasta que haya una medición propia. Que el dato esté aquí a mano hace muy
// fácil cruzar esa línea sin darse cuenta, así que queda escrito.
//
// ⚠️ NINGUNA FUNCIÓN DE ESTE ARCHIVO DEVUELVE UN VEREDICTO. No hay `lado`, no
// hay `compra`/`venta`. Devuelve cuánto hay de cada cosa y ya. Si algún día
// alguien añade aquí un «lado», que sea después de medirlo, no antes.

// ─────────────────────────────────────────────────────────────────────────
// LA FUENTE, elegida con la sonda del 2026-09-14
// ─────────────────────────────────────────────────────────────────────────
// De los quince conjuntos que lista la CFTC solo CINCO se pueden consultar
// (los otros diez dan 403 «no row or column access to non-tabular tables», y
// son justo los de nombre legible). De esos cinco, `TFF_All` es el único vivo
// y con las ocho divisas del barrido.
export const CONJUNTO = 'udgc-27he'

// ⚠️⚠️ `TFF_All` SON DOS INFORMES MEZCLADOS EN LA MISMA TABLA, y hay que fijar
// cuál. Cada contrato tiene DOS filas cada semana:
//
//   · `FutOnly`  — solo futuros
//   · `Combined` — futuros MÁS opciones convertidas a futuros equivalentes
//
// Y no coinciden. Medido en EURO FX el 2026-09-08:
//
//   |          | interés abierto | fondos apalancados largos |
//   | FutOnly  |         942.464 |                    94.808 |
//   | Combined |       1.056.521 |                    81.335 |
//
// Un 14 % de diferencia en el dato que más se mira. **Pedir sin fijar esta
// columna devuelve uno de los dos según le apetezca al servidor**, y no falla:
// devuelve un número plausible del informe que no era. Es la misma familia de
// fallo que el ATR de cierre a cierre del 2026-08-09 — un dato correcto de una
// cosa distinta de la que uno cree estar midiendo.
//
// Se usa `FutOnly` por ser la medida más literal: posiciones en futuros y nada
// más. La elección está aquí, en una constante con nombre, y viaja dentro del
// archivo publicado para que en pantalla se pueda decir cuál se usó.
export const TIPO_INFORME = 'FutOnly'

// Los nombres EXACTOS de contrato, copiados del último informe real.
//
// ⚠️⚠️ NO TOCAR ESTOS NOMBRES DE MEMORIA. La primera versión de esta tabla
// tenía TRES de los ocho mal, y el motivo importa: se escribieron leyendo la
// lista de contratos del histórico, donde conviven el nombre vivo y los
// viejos. **Un contrato muerto no da error**: sigue en la tabla y devuelve su
// último dato, de hace años, sin decir que es viejo.
//
// La pregunta que decide no es «¿está en la lista de contratos?» sino
// «¿tiene fila en el ÚLTIMO informe?».
export const CONTRATOS = {
  EUR: 'EURO FX - CHICAGO MERCANTILE EXCHANGE',
  JPY: 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
  GBP: 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE',
  CHF: 'SWISS FRANC - CHICAGO MERCANTILE EXCHANGE',
  CAD: 'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
  AUD: 'AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
  NZD: 'NZ DOLLAR - CHICAGO MERCANTILE EXCHANGE',
  USD: 'USD INDEX - ICE FUTURES U.S.',
}

// Los nombres que PARECEN correctos y están muertos. Existen en la tabla y
// responden 200 con datos viejos.
//
// Esta lista no es documentación decorativa: `prueba-cot.mjs` comprueba que
// ninguno de ellos se ha colado en `CONTRATOS`. Es la única defensa contra que
// alguien «corrija» un nombre de memoria dentro de seis meses.
export const CONTRATOS_MUERTOS = {
  'NEW ZEALAND DOLLAR - CHICAGO MERCANTILE EXCHANGE': 'el vivo es NZ DOLLAR',
  'U.S. DOLLAR INDEX - ICE FUTURES U.S.': 'el vivo es USD INDEX',
  'BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE': 'el vivo es BRITISH POUND',
}

// ⚠️ Y estos son CRUCES, no la divisa suelta. Están vivos los dos y son
// minúsculos (23.252 y 43.316 de interés abierto contra 942.464 del euro).
// Coger «el primero que contenga EURO FX» daría el cruce en vez del par.
export const CONTRATOS_QUE_SON_CRUCES = [
  'EURO FX/JAPANESE YEN XRATE - CHICAGO MERCANTILE EXCHANGE',
  'EURO FX/BRITISH POUND XRATE - CHICAGO MERCANTILE EXCHANGE',
]

// Las columnas que se piden. Pedir solo estas y no las 87 no es tacañería: el
// archivo publicado lo baja cada miembro cada vez que abre la app.
export const COLUMNAS = [
  'market_and_exchange_names',
  'report_date_as_yyyy_mm_dd',
  'open_interest_all',
  'lev_money_positions_long',
  'lev_money_positions_short',
  'asset_mgr_positions_long',
  'asset_mgr_positions_short',
  'change_in_lev_money_long',
  'change_in_lev_money_short',
]

const PARA_DIVISA = Object.fromEntries(Object.entries(CONTRATOS).map(([d, c]) => [c, d]))

// ─────────────────────────────────────────────────────────────────────────

// Socrata manda los números como TEXTO (`"942464"`), así que hay que
// convertirlos. Y hay que hacerlo con cuidado:
//
// ⚠️ `Number('')` es 0, y un 0 aquí es una afirmación («no tienen nada
// comprado») en vez de un hueco. Se comprueba que el texto no esté vacío ANTES
// de mirar el número. Es exactamente la misma trampa que en `tasas.js`, donde
// una tasa de 0 sí era real (Suiza).
export function num(v) {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Lo comprado menos lo vendido. `null` si falta cualquiera de los dos — nunca
// 0, que diría «están igualados».
export function neto(largos, cortos) {
  if (largos == null || cortos == null) return null
  return largos - cortos
}

// El neto como porcentaje del interés abierto.
//
// ⚠️ POR QUÉ EN PORCENTAJE Y NO EN CONTRATOS. «49.779 contratos comprados» no
// se puede comparar con nada: el euro mueve veinte veces más contratos que el
// índice del dólar, así que el más grande siempre parecería el más
// posicionado. El porcentaje pone a las ocho en la misma escala.
export function pctDelInteres(n, interes) {
  if (n == null || interes == null || interes <= 0) return null
  return (100 * n) / interes
}

// ─────────────────────────────────────────────────────────────────────────
// Leer la respuesta de la CFTC
// ─────────────────────────────────────────────────────────────────────────
//
// Se le pasan VARIAS semanas de filas y se queda, para cada divisa, con la más
// reciente. No es por gusto: si una semana la CFTC no publica un contrato, con
// una sola semana pedida esa divisa desaparecería de la pantalla; así se
// enseña su último dato con su fecha, que es lo honesto.
//
// ⚠️ Una fila cuyo contrato no esté en `CONTRATOS` se IGNORA en silencio. Es a
// propósito: la respuesta puede traer cruces u otros contratos, y colar uno
// sería enseñar el EUR/JPY creyendo que es el euro.
export function leerFilas(filas) {
  if (!Array.isArray(filas)) return {}

  const out = {}
  for (const f of filas) {
    const contrato = String(f?.market_and_exchange_names ?? '').trim()
    const divisa = PARA_DIVISA[contrato]
    if (!divisa) continue

    const fecha = String(f?.report_date_as_yyyy_mm_dd ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue

    // La más reciente gana. Con `$order DESC` ya vendría primero, pero no se
    // confía en el orden de la respuesta: es lo mismo que se hizo en
    // `leerTasasCSV` y por el mismo motivo — el día que alguien cambie el
    // parámetro, no queremos que gane la primera por azar.
    if (out[divisa] && out[divisa].f >= fecha) continue

    const interes = num(f?.open_interest_all)
    const fLargos = num(f?.lev_money_positions_long)
    const fCortos = num(f?.lev_money_positions_short)
    const gLargos = num(f?.asset_mgr_positions_long)
    const gCortos = num(f?.asset_mgr_positions_short)

    const nFondos = neto(fLargos, fCortos)
    const nGestoras = neto(gLargos, gCortos)

    out[divisa] = {
      f: fecha,
      interes,
      // «fondos» = `lev_money`, los hedge funds. Ver la advertencia 3 de la
      // cabecera: es la familia que todo el mundo mira, y no son dinero listo.
      fondosLargos: fLargos,
      fondosCortos: fCortos,
      fondosNeto: nFondos,
      fondosPct: pctDelInteres(nFondos, interes),
      // «gestoras» = `asset_mgr`, fondos de pensiones y gestoras. Dinero lento.
      // Va en el archivo aunque la primera pantalla no lo enseñe: cuesta unos
      // bytes y evita tener que cambiar el formato publicado para enseñarlo.
      gestorasNeto: nGestoras,
      gestorasPct: pctDelInteres(nGestoras, interes),
      // El cambio del neto en la semana, tal y como lo da la CFTC.
      cambioNeto: neto(num(f?.change_in_lev_money_long), num(f?.change_in_lev_money_short)),
    }
  }
  return out
}

// Lo que se publica en `estado/cot.json`.
//
// `tipoInforme` viaja dentro a propósito: es lo que permite que la pantalla
// diga cuál de los dos informes está enseñando, en vez de que haya que venir
// aquí a mirarlo.
export function prepararCot(filas, ahora = new Date()) {
  const divisas = leerFilas(filas)
  const fechas = Object.values(divisas)
    .map((d) => d.f)
    .sort()
  return {
    actualizadoEl: ahora.toISOString(),
    // La fecha del informe más reciente que se haya conseguido. La de cada
    // divisa va aparte, porque pueden no coincidir.
    fecha: fechas.length ? fechas[fechas.length - 1] : null,
    tipoInforme: TIPO_INFORME,
    divisas,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Para la pantalla
// ─────────────────────────────────────────────────────────────────────────

// Las divisas ordenadas por lo POSICIONADAS que están, en valor absoluto.
//
// ⚠️ Por valor absoluto y no por valor, igual que en `correlacion.js` y en
// `tasas.js`: un −16 % y un +16 % están igual de posicionados, solo cambia
// hacia qué lado. Ordenar por valor dejaría abajo del todo justo las más
// vendidas, que son tan interesantes como las más compradas.
export function divisasOrdenadas(cot) {
  const divisas = cot?.divisas
  if (!divisas || typeof divisas !== 'object') return []
  return Object.entries(divisas)
    .map(([divisa, d]) => ({ divisa, ...d }))
    .filter((d) => d.fondosPct != null)
    .sort((a, b) => Math.abs(b.fondosPct) - Math.abs(a.fondosPct))
}

// ¿Cuántos días tiene el dato? Devuelve `null` si la fecha no se entiende —
// «no lo sé», no 0.
//
// ⚠️ ESTO NO ES PARANOIA Y NO ES UN FALLO CUANDO SALE ALTO. El informe se
// publica los viernes con datos del martes, así que **lo normal es entre 3 y
// 10 días**. Lo que no sería normal es que llevara meses parado porque el
// publicador se rompió y nadie se enteró.
export function diasDelDato(fecha, ahora = new Date()) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const ms = ahora.getTime() - new Date(fecha + 'T00:00:00Z').getTime()
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.floor(ms / 86_400_000))
}

// ⚠️ El índice del dólar NO es comparable con las otras siete, y la pantalla
// tiene que poder decirlo: las siete son la divisa CONTRA EL DÓLAR, y esta es
// el dólar contra una cesta. Un «+10 % comprado» no significa lo mismo en las
// dos filas.
export function esIndice(divisa) {
  return divisa === 'USD'
}
