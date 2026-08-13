// La parte del vigía que decide qué es una señal NUEVA, separada de la
// descarga y de los archivos para poder probarla sin internet ni cuota.
// Es la lógica de la que depende todo lo demás: si esto se equivoca, o te
// llegan avisos repetidos o no te llega ninguno.

import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { VENTAS_PAUSADAS } from '../../src/lib/reglas.js'

// Una señal es la misma si es el mismo par, el mismo lado y el mismo tipo.
// Si desaparece y vuelve más tarde cuenta como nueva a propósito: es una
// oportunidad de entrada distinta, no la misma repetida.
// El `|| 'tendencia'` es por swing: esta app no tiene modo rango, así que sus
// setups no traen `tipo`. Sin esto el identificador quedaría con la palabra
// "undefined" dentro y ensuciaría el historial para siempre.
export const idDe = (s) => `${s.name}|${s.lado}|${s.tipo || 'tendencia'}`

// ────────────────────────────────────────────────────────────────────────
// LA SOMBRA: cómo una regla pausada sigue midiéndose.
//
// Las ventas están pausadas (ver `src/lib/reglas.js`), y eso dejaba un
// agujero silencioso: si el vigía dejara de anotarlas, no volveríamos a
// tener ni un dato nuevo sobre ellas, y la pausa se volvería permanente sin
// que nadie lo hubiera decidido. La única prueba disponible sería el
// backtest de siempre, sobre los mismos 219 días, para siempre.
//
// La salida es la misma que en la app hermana: el vigía las ANOTA con
// `sombra: true`, y a partir de ahí no existen para nadie —ni avisos, ni
// pantalla de Historial, ni porcentaje de acierto—. Solo suman operaciones
// reales hacia adelante, que es lo que hará falta el día que haya que
// decidir si vuelven.
//
// Va atado a `VENTAS_PAUSADAS` y no escrito aparte: el día que las ventas se
// reactiven, dejan de ser sombra solas. Dos interruptores para lo mismo es
// como quedan encendidas a medias.
// ────────────────────────────────────────────────────────────────────────
export const esSombra = (s) => VENTAS_PAUSADAS && s?.lado === 'VENTA'

// Parte las señales nuevas en las que pueden salir hacia un celular y las que
// solo se anotan. Devuelve las dos listas en vez de filtrar por dentro para
// que en el vigía se vea, en una línea, que lo que se envía no es lo mismo
// que lo que se guarda.
export function separarSombra(nuevas) {
  return {
    visibles: nuevas.filter(({ s }) => !esSombra(s)),
    sombra: nuevas.filter(({ s }) => esSombra(s)),
  }
}

export function leerEstado(ruta) {
  try {
    const e = JSON.parse(readFileSync(ruta, 'utf8'))
    return { senales: Array.isArray(e.senales) ? e.senales : [] }
  } catch {
    // Primera corrida, o archivo estropeado: se arranca de cero. Que no haya
    // estado previo no puede tumbar el vigía.
    return { senales: [] }
  }
}

// Devuelve { actuales, nuevas } con los setups de esta revisión y cuáles no
// estaban en la anterior.
export function compararConAnterior(setups, estadoPrevio) {
  const previas = new Set(estadoPrevio.senales || [])
  const actuales = setups.map((s) => ({ id: idDe(s), s }))
  return { actuales, nuevas: actuales.filter((x) => !previas.has(x.id)) }
}

// Lee un archivo de los que se escriben una línea de JSON por vez.
//
// Una línea rota se salta en vez de tumbar la lectura entera: estos archivos
// se escriben añadiendo al final, así que un corte a mitad de escritura
// dejaría la última línea incompleta, y perder el historial completo por eso
// sería absurdo.
export function leerJsonl(ruta) {
  let bruto
  try {
    bruto = readFileSync(ruta, 'utf8')
  } catch {
    return [] // todavía no existe: primera vez
  }

  const salida = []
  for (const linea of bruto.split('\n')) {
    if (!linea.trim()) continue
    try {
      salida.push(JSON.parse(linea))
    } catch {
      // línea a medias, se ignora
    }
  }
  return salida
}

export function escribir(ruta, texto, anexar = false) {
  mkdirSync(dirname(ruta), { recursive: true })
  if (anexar) appendFileSync(ruta, texto)
  else writeFileSync(ruta, texto)
}
