// ¿SIRVE MOVER EL STOP A BREAKEVEN? — la simulación, pura y sin red.
//
// El listón está en `preregistro-breakeven.mjs`, escrito antes que esto.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ NO SE REUSA `resolver` + `medir`
// ─────────────────────────────────────────────────────────────────────────
// `resolver` devuelve dos desenlaces —ganada o perdida— y `medir` cobra
// `pipBeneficio` o `pipRiesgo` según cuál sea. Breakeven añade un TERCERO: la
// operación sale al precio de entrada, o sea 0 pips de precio, y aun así paga
// spread y swap.
//
// ⚠️ Y LO QUE DE VERDAD OBLIGA A ESCRIBIRLO APARTE es que el resultado SIN
// breakeven tiene que salir de **este mismo código** con el breakeven apagado.
// Si la línea de comparación viniera de `resolver`+`medir` y la de breakeven de
// aquí, cualquier diferencia de dos décimas entre las dos implementaciones se
// leería como «breakeven mejora». Se compara lo mismo contra lo mismo cambiando
// una sola cosa.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LA REGLA DEL ORDEN DENTRO DE UNA VELA, QUE ES LA QUE DECIDE
// ─────────────────────────────────────────────────────────────────────────
// Una vela diaria guarda máximo, mínimo y cierre. **No dice el orden.** Así que
// si en la misma vela el precio llega al nivel de armado Y vuelve a la entrada,
// no se sabe qué pasó primero.
//
// Se elige el PEOR CASO para quien opera, igual que `EMPATE_CUENTA_COMO` del
// resolver: **el armado no cuenta hasta la vela SIGUIENTE**. Si el precio sube,
// arma y se derrumba dentro de la misma vela, breakeven NO salva esa operación.
//
// Eso hace que breakeven salga peor de lo que saldría con datos de minuto, y es
// a propósito: un número que se equivoca a favor propio no sirve para decidir
// si arriesgar dinero.
//
// Y con el breakeven YA armado, dentro de una vela se mira primero la salida
// adversa (el precio de entrada) y solo después el objetivo. Misma asimetría.

import { costeEnPips, SPREAD_PIPS } from './costes.mjs'
import { nochesEntre } from './rejilla-diaria.mjs'

// Los tres desenlaces posibles.
export const GANADA = 'ganada'
export const PERDIDA = 'perdida'
export const BREAKEVEN = 'breakeven'

// Resuelve UNA señal con (o sin) breakeven y devuelve el desenlace.
//
// `armarEn` en veces el riesgo; `null` o `0` apaga el breakeven por completo,
// y entonces esto se comporta exactamente como `resolver`.
//
// Devuelve `null` si no se puede juzgar (par desconocido, señal fuera de la
// serie, sigue viva). ⚠️ `null` significa «no se sabe», nunca «empató»: meter
// una no resuelta en el cubo de breakeven inflaría el resultado con
// operaciones que todavía no han pasado nada.
export function resolverUna(s, data, { armarEn = null, porNombre = null } = {}) {
  // ⚠️ `data.pares` es un ARRAY, no un objeto indexado por nombre. La primera
  // versión de esto hacía `data.pares[s.par]` y devolvía `undefined` SIEMPRE,
  // o sea que todas las señales salían «sin juzgar» y la tabla habría quedado
  // vacía. Es el mismo tropiezo que ya costó varias veces en los bancos de
  // pruebas: antes de creerse un resultado, comprobar que el lector lee.
  const mapa = porNombre ?? new Map((data.pares ?? []).map((p) => [p.name, p]))
  const par = mapa.get(s.par)
  if (!par || !Array.isArray(par.highs) || !Array.isArray(par.lows)) return null

  const dia = s.cierre
  if (!dia) return null
  const i0 = data.fechas.indexOf(dia)
  // La entrada es al CIERRE del día de la señal, así que el primer día que
  // cuenta es el siguiente. Si el día no está en la serie, no hay nada que
  // mirar.
  if (i0 === -1) return null

  const compra = s.lado === 'COMPRA'
  const entrada = s.precio
  const riesgoPrecio = Math.abs(entrada - s.sl)
  if (!(riesgoPrecio > 0)) return null

  // El nivel que arma el breakeven, en precio.
  const usaBE = typeof armarEn === 'number' && armarEn > 0
  const nivelArmado = compra ? entrada + armarEn * riesgoPrecio : entrada - armarEn * riesgoPrecio

  let armado = false

  for (let i = i0 + 1; i < data.fechas.length; i++) {
    const alto = par.highs[i]
    const bajo = par.lows[i]
    if (!Number.isFinite(alto) || !Number.isFinite(bajo)) return null

    // Con el breakeven ya armado, el stop está en la entrada y se comprueba
    // ANTES del objetivo (peor caso).
    if (usaBE && armado) {
      const tocaEntrada = compra ? bajo <= entrada : alto >= entrada
      if (tocaEntrada) return { resultado: BREAKEVEN, velaFinal: data.fechas[i], indiceFinal: i }
      const tocaObjetivo = compra ? alto >= s.tp : bajo <= s.tp
      if (tocaObjetivo) return { resultado: GANADA, velaFinal: data.fechas[i], indiceFinal: i }
      continue
    }

    // Sin armar: el stop original primero, luego el objetivo. Igual que
    // `resolver`.
    const tocaStop = compra ? bajo <= s.sl : alto >= s.sl
    if (tocaStop) return { resultado: PERDIDA, velaFinal: data.fechas[i], indiceFinal: i }
    const tocaObjetivo = compra ? alto >= s.tp : bajo <= s.tp
    if (tocaObjetivo) return { resultado: GANADA, velaFinal: data.fechas[i], indiceFinal: i }

    // Y solo al final de la vela se mira si quedó armado para la SIGUIENTE.
    // ⚠️ Este orden ES la regla del peor caso. Moverlo arriba del `tocaStop`
    // haría que breakeven salvara operaciones que se derrumbaron en la misma
    // vela en que subieron, y eso no se puede saber con máximo y mínimo.
    if (usaBE) {
      const llego = compra ? alto >= nivelArmado : bajo <= nivelArmado
      if (llego) armado = true
    }
  }

  return null // sigue viva
}

// Mide un conjunto de señales con un nivel de armado dado.
//
// Devuelve, además del resultado, el reparto de desenlaces y el aporte de cada
// par — que es lo que necesita el criterio de concentración del listón.
// ⚠️⚠️ `soloClaves` ES LA PIEZA QUE HACE JUSTA LA COMPARACIÓN, y existe por algo
// que destapó el humo sobre un mercado inventado ANTES de gastar un crédito.
//
// Breakeven puede RESOLVER una operación que sin él seguiría viva al final de
// la serie: el stop en la entrada se toca antes que el stop original. O sea que
// medir «todas las que se pueden juzgar» con y sin breakeven compara dos
// conjuntos distintos de operaciones, y la diferencia incluiría operaciones que
// solo existen en una de las dos columnas.
//
// Con `soloClaves` el guion mide las dos columnas sobre la INTERSECCIÓN: las que
// los dos métodos saben juzgar. Así la única diferencia entre las dos filas es
// el breakeven.
//
// 📌 Y conviene tener claro qué se corrigió y qué no: esto arregla una MEDICIÓN
// mal construida, descubierta con datos de mentira. No es aflojar un umbral tras
// ver un resultado real — la misma distinción que ya está escrita para
// `atrMedioGlobal` y para la mediana de Intradía.
export function medirConBreakeven(
  senales,
  data,
  { armarEn = null, swapPipsNoche = 0, tablaSpread = SPREAD_PIPS, soloClaves = null } = {}
) {
  let sumaR = 0
  let ops = 0
  const cuenta = { [GANADA]: 0, [PERDIDA]: 0, [BREAKEVEN]: 0 }
  const porPar = new Map()
  let sinJuzgar = 0

  // Se construye UNA vez y se reusa: con ~1.800 señales y 14 pares, rehacerlo
  // en cada una es trabajo de más por nada.
  const porNombre = new Map((data.pares ?? []).map((p) => [p.name, p]))

  const clavesJuzgadas = new Set()

  for (const s of senales) {
    const clave = `${s.id}@${s.vistoEl}`
    if (soloClaves && !soloClaves.has(clave)) continue
    const r = resolverUna(s, data, { armarEn, porNombre })
    if (!r) {
      sinJuzgar++
      continue
    }
    clavesJuzgadas.add(clave)
    const noches = nochesEntre(s.cierre, r.velaFinal) ?? 0
    const coste = costeEnPips(s.par, noches, swapPipsNoche, tablaSpread) / s.pipRiesgo

    // En veces el riesgo de ESA operación. Breakeven sale a cero de PRECIO, no
    // a cero de dinero: el spread y el swap se pagan igual.
    let rr
    if (r.resultado === GANADA) rr = s.pipBeneficio / s.pipRiesgo - coste
    else if (r.resultado === PERDIDA) rr = -1 - coste
    else rr = -coste

    sumaR += rr
    ops++
    cuenta[r.resultado]++
    porPar.set(s.par, (porPar.get(s.par) ?? 0) + rr)
  }

  return {
    ops,
    sinJuzgar,
    porRiesgo: ops ? sumaR / ops : null,
    neto: sumaR,
    cuenta,
    acierto: ops ? cuenta[GANADA] / ops : null,
    porPar,
    clavesJuzgadas,
  }
}

// Las claves que TODOS los métodos saben juzgar. Lo que se le pasa a
// `medirConBreakeven` como `soloClaves` para que las columnas sean comparables.
export function clavesComunes(medidas) {
  const listas = medidas.map((m) => m.clavesJuzgadas)
  if (!listas.length) return new Set()
  return new Set([...listas[0]].filter((c) => listas.every((l) => l.has(c))))
}

// La fracción de la MEJORA que aporta el par que más aporta.
//
// ⚠️ Se mide sobre la mejora (BE menos sin BE) y no sobre el resultado: lo que
// el listón pregunta es si la ventaja de breakeven viene de un solo par, no si
// un par gana mucho de por sí.
//
// Devuelve `null` cuando la mejora total no es positiva — ahí la pregunta no
// tiene sentido y un número daría la impresión de que sí.
export function concentracionDeLaMejora(conBE, sinBE) {
  const total = (conBE?.neto ?? 0) - (sinBE?.neto ?? 0)
  if (!(total > 0)) return null
  let peor = 0
  for (const [par, v] of conBE.porPar) {
    const aporte = v - (sinBE.porPar.get(par) ?? 0)
    if (aporte > peor) peor = aporte
  }
  return peor / total
}
