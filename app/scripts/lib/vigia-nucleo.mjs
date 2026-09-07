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
// LA SOMBRA: cómo se mide una regla que no le llega a nadie.
//
// El vigía las ANOTA con `sombra: true`, y a partir de ahí no existen para
// nadie —ni avisos, ni pantalla de Historial, ni porcentaje de acierto—.
// Solo suman operaciones reales hacia adelante, que es lo que hará falta el
// día que haya que decidir sobre ellas.
//
// Dos cosas van en la sombra hoy:
//
//   · Las VENTAS, mientras estén pausadas. Se anotan para que la pausa pueda
//     terminar algún día con un número y no con una corazonada.
//   · Las señales de REVERSIÓN, que son la idea de la app al revés. Midieron
//     mejor que la app sobre 5 años, pero encenderlas la convertiría en otro
//     producto, y eso lo decide Néstor. Mientras tanto corren en paralelo sin
//     que nadie las vea.
//
//   · «COMPRAR LA CAÍDA» desde el 2026-09-07, por lo mismo: mide bien sobre 5
//     años pero se descubrió mirando una tabla que ya se había visto, así que
//     hasta que no acumule operaciones reales no significa nada.
//
// Lo de las ventas va atado a `VENTAS_PAUSADAS`: el día que se reactiven,
// dejan de ser sombra solas. Dos interruptores para lo mismo es como quedan
// encendidas a medias.
//
// ⚠️ Y LA REGLA ESTÁ ESCRITA AL REVÉS A PROPÓSITO: sombra es TODO lo que no
// sea la regla propia de la app.
//
// La primera versión enumeraba las de sombra (`tipo === 'reversion'`), y al
// añadir «comprar la caída» eso se convirtió en un agujero de verdad: sus
// COMPRAS no encajaban en ninguna de las dos condiciones, así que habrían
// salido como señales normales y HABRÍAN DESPERTADO EL CELULAR DE NÉSTOR con
// una regla sin probar. Se cazó antes de publicarla, pero por poco.
//
// Escrita así, una regla nueva nace en la sombra y solo sale de ella si
// alguien viene aquí a sacarla a mano. Es la diferencia entre olvidarse de
// apagar algo y olvidarse de encenderlo: el primer olvido manda avisos falsos,
// el segundo solo retrasa una decisión.
//
// (`tipo` vacío = las señales de siempre de la app: Swing no tiene modo rango
// y nunca se lo puso.)
const esDeLaApp = (s) => !s?.tipo || s.tipo === 'tendencia'

export const esSombra = (s) => (VENTAS_PAUSADAS && s?.lado === 'VENTA') || !esDeLaApp(s)

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
