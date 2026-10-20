// Las dos líneas del reporte que explican POR QUÉ la app propone lo que
// propone: hasta dónde llegó la divergencia de fuerza, y qué pares pasaron el
// umbral pero se cayeron por tener su lado pausado.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ POR QUÉ ESTO VIVE AQUÍ Y NO DENTRO DE `reporte-diario.mjs`
// ─────────────────────────────────────────────────────────────────────────
// Porque ahí no se podía probar. `reporte-diario.mjs` pide velas a Twelve Data
// en cuanto se importa, así que ninguna comprobación sin internet podía
// llamar a estas funciones — y el 2026-10-20 eso costó un fallo real que
// publicó una frase falsa en el chat de Néstor (abajo).
//
// Es el mismo motivo por el que `medir()` salió de `backtest.mjs` y
// `anchoDeLaVelaEnCurso` salió de `vigia.mjs`: de aquí sale texto que una
// persona LEE para decidir, así que tiene que tener pruebas.
//
// ⚠️ PRIMO, no gemelo: cada app redacta su propio texto. Lo que SÍ es igual en
// las dos —y lo vigila `prueba-umbral.mjs`, que es GEMELO— es la disciplina:
// ninguna de estas frases afirma «no hay señales» sin que se le haya dicho si
// hay señales.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ EL FALLO DEL 2026-10-20, QUE ES LA RAZÓN DE `haySenales`
// ─────────────────────────────────────────────────────────────────────────
// La primera versión de estas líneas terminaba SIEMPRE en «Por eso no hay
// señales». Escrita el día anterior pensando en un reporte vacío, y correcta
// ese día. El 2026-10-20 el reporte salió con DOS setups de la app (GBP/JPY y
// GBP/USD COMPRA) y debajo, en la misma pantalla, la frase decía que no había
// señales.
//
// El número era verdad —los cinco pares de venta estaban pausados de verdad—
// y el rótulo era falso. Es la familia que este proyecto lleva meses
// coleccionando: *una etiqueta equivocada es un error de medición*.
//
// 📌 Y la causa de fondo no era descuido: estas funciones **sólo veían
// `difMax` y `umbral`**, así que no tenían con qué saber si había señales y
// aun así afirmaban que no las había. Una función que afirma algo que no puede
// comprobar lo va a afirmar mal algún día. Ahora se le pasa, y si no se le
// pasa no lo dice.
//
// ⚠️ Y la frase nombra DE QUIÉN son las señales («la app no propone»), no
// «no hay señales» a secas. El reporte lleva debajo el bloque de la reversión,
// que SÍ puede traer señales el mismo día: un «no hay señales» suelto encima
// de tres compras se contradice a la vista, y eso ya pasó —en el chat, el
// 2026-10-19— con la app diciendo COMPRA y el reporte diciendo que no había
// nada.

// HASTA DÓNDE LLEGÓ LA DIVERGENCIA Y CUÁNTO HACÍA FALTA.
//
// ⚠️ Esto es lo único que distingue «el mercado está plano» de «la app está
// atascada»: las dos se leen igual en «_Ninguno hoy._».
//
// ⚠️⚠️ Y NO SE PUEDE DEDUCIR DE LA LÍNEA DE FUERZA QUE ESTÁ ARRIBA. La escala
// 0-10 es una normalización de mínimo a máximo: el más débil vale 0 y el más
// fuerte 10 SIEMPRE, por pequeña que sea la diferencia real. El 2026-10-12 yo
// leí «CAD 10,0 · CHF 0,0» en Intradía y afirmé que había divergencia de
// sobra; la mayor de verdad era 0,31 contra un umbral de 0,59. La escala es un
// ORDEN, no una magnitud.
//
// Se enseña SIEMPRE, también los días con señales, y a propósito: si apareciera
// solo los días vacíos, su presencia sería el mensaje y nadie leería los
// números. Con señales también dice algo — 1,77 sobre 0,50 es 3,5 veces lo que
// se pedía.
export const lineaUmbral = ({ difMax, umbral, haySenales = false }) => {
  // ⚠️ Ante la duda NO SE ESCRIBE NADA. `difMax` es `null` cuando no se pudo
  // medir, y una línea inventada aquí es peor que ninguna.
  if (!Number.isFinite(difMax) || !Number.isFinite(umbral)) return ''
  const d = difMax.toFixed(2)
  const u = umbral.toFixed(2)
  if (difMax > umbral) {
    return `\n\n_Divergencia: el par más separado iba a ${d} y el umbral era ${u}._`
  }
  const hecho = `Ningún par llegó al umbral de fuerza: el más separado iba a ${d} y hacía falta ${u}.`
  // Con señales en pantalla la frase se queda en el HECHO y no concluye nada.
  // En esta app el umbral es la primera puerta de todas —`clasificar` y
  // `clasificarReversion` lo exigen los dos—, así que hoy no puede haber
  // señales si nadie lo pasó. La condición está igual porque **la frase no
  // puede volver a depender de un razonamiento sobre qué reglas miran el
  // umbral**: el día que se encienda una que no lo mire (Bollinger, por
  // ejemplo, que va por bandas), esto sigue diciendo la verdad solo.
  return haySenales ? `\n\n_${hecho}_` : `\n\n_${hecho} Por eso la app no propone ninguna señal hoy._`
}

// POR QUÉ NO HAY SEÑALES CUANDO SÍ HUBO DIVERGENCIA.
//
// ⚠️⚠️ Sin esto, el reporte decía «divergencia 1,32 contra un umbral de 0,50»
// y debajo cuatro listas vacías. Néstor lo leyó dos días seguidos (2026-10-16
// y 19) y yo mismo lo leí como «el mercado está plano»: la verdad era que
// cinco pares pasaron el umbral, los cinco del lado de las VENTAS, y las
// ventas están pausadas desde el 2026-08-12. Nadie lo decía en ninguna parte.
//
// ⚠️ Va DESPUÉS de la línea del umbral y no antes: aquélla dice si hubo
// divergencia —el hecho de mercado— y ésta dice qué hizo la app con ella. Al
// revés se lee como si la pausa fuera el motivo de que no hubiera divergencia.
export const lineaBloqueados = ({ bloqueados, haySenales = false }) => {
  // Ante la duda, nada. `null` es «no hubo ninguno», y una frase aquí diría
  // algo sobre el mercado donde no hay nada que decir.
  if (!bloqueados || !Number.isFinite(bloqueados.n) || bloqueados.n < 1) return ''
  const n = bloqueados.n
  const pares = Array.isArray(bloqueados.pares) ? bloqueados.pares.join(', ') : ''
  const lista = pares ? ` (${pares})` : ''
  const verbo = n === 1 ? 'par pasó' : 'pares pasaron'
  const lado = n === 1 ? 'su señal es de venta' : 'sus señales son de venta'
  const pausa = `${lado} y las ventas están pausadas desde el 2026-08-12${lista}`

  // ⚠️ LAS DOS REDACCIONES SON EL ARREGLO DEL 2026-10-20 (ver la cabecera).
  // Con señales en pantalla esto es un AÑADIDO a lo de arriba; sin señales es
  // la EXPLICACIÓN de por qué no hay nada. La misma frase para los dos casos
  // es falsa en uno de ellos.
  return haySenales
    ? `\n\n_Además de las de arriba, otros ${n} ${verbo} el umbral de fuerza, pero ${pausa}._`
    : `\n\n_${n} ${verbo} el umbral de fuerza, pero ${pausa}. Por eso la app no propone ninguna señal hoy: no es que el mercado esté plano._`
}
