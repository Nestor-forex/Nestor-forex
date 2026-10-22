// LA VOLATILIDAD IMPLÍCITA, Y QUÉ SE PUEDE DEDUCIR DE ELLA
//
// Escrito el 2026-10-21, ANTES de ver un solo dato. Lo pidió Néstor:
// «estudiar la volatilidad de las opciones a ver si sirve para saber cuál es
// el horizonte de las apps».
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO PRIMERO: EL HORIZONTE DE LAS APPS YA ESTÁ MEDIDO
// ─────────────────────────────────────────────────────────────────────────
//
// Cuánto duran las operaciones NO es una pregunta abierta. Está medido sobre
// el propio banco de pruebas:
//
//   · Swing, vara neutra 1:1 .............. 5 días de mediana
//   · Swing, geometría real de la app ..... 12 días las ganadas, 13 las perdidas
//   · Intradía ............................ 9 h de mediana, 17,9 de media
//
// Así que esto NO viene a contestar «cuánto duran». Viene a contestar otra
// cosa, que es la que no tiene respuesta: **en ese horizonte ya conocido,
// ¿el objetivo que pone la app está dentro de lo que el mercado espera
// moverse, o está más lejos?** Si está más lejos, el objetivo no se alcanza
// casi nunca y el problema no es el acierto: es la distancia.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LA TRAMPA DE LA ANUALIZACIÓN, que es por la que este archivo existe
// ─────────────────────────────────────────────────────────────────────────
//
// La volatilidad implícita se cotiza SIEMPRE en porcentaje ANUAL. Para saber
// cuánto es eso en 5 días hay que dividir por la RAÍZ del número de periodos,
// no por el número de periodos:
//
//     correcto:    σ_5d = σ_anual · √(5/252)   →   10 % anual = 1,41 % en 5 días
//     equivocado:  σ_5d = σ_anual · (5/252)    →   10 % anual = 0,20 % en 5 días
//
// **El equivocado da un número perfectamente plausible y SIETE VECES menor.**
// Un 0,20 % en 5 días sobre EUR/USD son 23 pips, que suena a un día tranquilo;
// el real son 163. Con el número malo, el objetivo de la app parecería
// imposible siempre y la conclusión sería la contraria de la verdadera.
//
// Es la misma familia que el ATR de cierre a cierre del 2026-08-09 y que los
// dos informes de `TFF_All`: un dato bien calculado que describe otra cosa.
// Por eso la cuenta vive AQUÍ, con pruebas, y no dentro de la sonda.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ Y LO QUE LA VOLATILIDAD IMPLÍCITA NO DICE
// ─────────────────────────────────────────────────────────────────────────
//
//   1. **No dice la dirección.** Dice cuánto, no hacia dónde. Igual que la
//      actividad del puente de MT5.
//   2. **No es un máximo: es UNA desviación típica.** El precio se queda
//      dentro de ese margen ~68 % de las veces, así que una de cada tres se
//      sale. Leerlo como «no se va a mover más de X» es el error caro.
//   3. **Es lo que el mercado ESPERA, no lo que pasó.** Suele salir por
//      encima de la volatilidad que después se realiza (el vendedor de la
//      opción cobra por el riesgo), así que como medida de «cuánto se va a
//      mover» tiende a ser generosa.
//   4. **Un índice de volatilidad es de UN par.** EVZ es del euro, JYVIX del
//      yen, BPVIX de la libra. Ninguno habla de EUR/NZD ni de GBP/CAD.
//      Aplicarle a los 14 pares el número del euro sería inventar doce.
//
// ⚠️ SERÍA INFORMACIÓN, NO UN FILTRO. No apagaría ni una señal. Si algún día
// se quisiera «no operar cuando la volatilidad implícita esté alta», eso es un
// filtro y va al banco de pruebas con su listón escrito antes — van **ocho
// familias de filtros medidas y ocho fallando**.

/** Días de MERCADO en un año. El convenio del sector para anualizar. */
export const DIAS_MERCADO_ANIO = 252

/**
 * Rango en el que una volatilidad implícita de divisas mayores es creíble, en
 * porcentaje anual.
 *
 * ⚠️ NO es decoración: es el guardia contra la trampa del oro del 2026-09-29,
 * cuando `GOLD` y `CL` respondieron 200 con cinco velas perfectamente válidas
 * **de acciones de Nueva York**. Un número fuera de este rango no se publica:
 * se dice que la fuente no sirve.
 *
 * Las referencias: un par mayor tranquilo ronda el 5-8 % anual; en tensión
 * sube a 12-15 %; en marzo de 2020 el EVZ tocó ~17 % y en 2008 pasó de 25 %.
 * Por debajo de 1 % no existe en divisas, y por encima de 60 % tampoco.
 */
export const IV_MIN_PLAUSIBLE = 1
export const IV_MAX_PLAUSIBLE = 60

/** ¿Es creíble este número como volatilidad implícita anual de un par mayor? */
export function plausibleIV(x) {
  return Number.isFinite(x) && x >= IV_MIN_PLAUSIBLE && x <= IV_MAX_PLAUSIBLE
}

/**
 * Cuánto espera moverse el precio en `dias` días de mercado, en PORCENTAJE,
 * según una volatilidad implícita anual.
 *
 * Devuelve `null` —nunca 0— cuando no se puede calcular. Un 0 diría «el
 * mercado no espera que se mueva», que es una afirmación. Misma decisión que
 * `pearson`, `difMax` y `edadEnMinutos`.
 */
export function movimientoEsperado({ ivAnualPct, dias } = {}) {
  if (!Number.isFinite(ivAnualPct) || ivAnualPct <= 0) return null
  if (!Number.isFinite(dias) || dias <= 0) return null
  // ⚠️ RAÍZ. Ver la trampa de la anualización arriba.
  return ivAnualPct * Math.sqrt(dias / DIAS_MERCADO_ANIO)
}

/**
 * Lo mismo en PIPS, que es la unidad en la que la app pone sus niveles.
 *
 * `pip` es el valor de un pip en unidades de precio: 0,0001 en casi todos los
 * pares y 0,01 en los que llevan yen. No se adivina — se pasa.
 */
export function movimientoEsperadoPips({ ivAnualPct, dias, precio, pip } = {}) {
  const pct = movimientoEsperado({ ivAnualPct, dias })
  if (pct === null) return null
  if (!Number.isFinite(precio) || precio <= 0) return null
  if (!Number.isFinite(pip) || pip <= 0) return null
  return ((pct / 100) * precio) / pip
}

/**
 * EL VEREDICTO DE LA SONDA. Lo calcula esto, no lo argumenta nadie.
 *
 * ⚠️⚠️ SIN FUENTES LEÍDAS NO HAY VEREDICTO. Devuelve `'noSePudoMirar'`, que
 * NO es lo mismo que «no existe»:
 *
 *   «pedí cuatro fuentes y ninguna trae el dato»  → un hallazgo
 *   «no pude abrir ninguna»                       → nada
 *
 * Las dos se escriben igual y significan lo contrario. Ya mordió el
 * 2026-09-14, cuando mi propio informe escribió «no la publican» habiendo
 * leído CERO páginas; de ahí salió `veredictoBusqueda` y esta es la misma
 * asimetría.
 *
 * @param fuentes [{ nombre, respondio, iv, pares }]
 */
export function veredictoSonda(fuentes) {
  const lista = Array.isArray(fuentes) ? fuentes : []
  const leidas = lista.filter((f) => f?.respondio === true)
  if (!leidas.length) {
    return {
      veredicto: 'noSePudoMirar',
      sirven: [],
      dice: 'NO SE PUDO MIRAR: ninguna fuente respondió. Eso no dice que el dato no exista.',
    }
  }
  // Sirve la que responde Y trae un número creíble. Responder 200 no basta:
  // es exactamente la trampa del oro.
  const sirven = leidas.filter((f) => plausibleIV(f.iv))
  if (!sirven.length) {
    return {
      veredicto: 'ningunaSirve',
      sirven: [],
      dice: `${leidas.length} fuente(s) respondieron y NINGUNA trajo una volatilidad creíble. Esto sí es un hallazgo.`,
    }
  }
  return {
    veredicto: 'hayCandidata',
    sirven: sirven.map((f) => f.nombre),
    dice:
      `${sirven.length} fuente(s) sirven. ⚠️ Cubren ${
        new Set(sirven.flatMap((f) => f.pares || [])).size
      } par(es) de los 14 de Swing: lo que no cubran NO se rellena con el número de otro par.`,
  }
}
