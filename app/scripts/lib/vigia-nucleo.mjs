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
    return {
      senales: Array.isArray(e.senales) ? e.senales : [],
      // Cuándo corrió el vigía por última vez. Lo usa `yaCorrioHoy` para que
      // los tres intentos del día no hagan el trabajo tres veces.
      actualizadoEl: typeof e.actualizadoEl === 'string' ? e.actualizadoEl : null,
    }
  } catch {
    // Primera corrida, o archivo estropeado: se arranca de cero. Que no haya
    // estado previo no puede tumbar el vigía.
    return { senales: [], actualizadoEl: null }
  }
}

// ────────────────────────────────────────────────────────────────────────
// LOS TRES INTENTOS DEL DÍA (desde el 2026-09-07)
//
// El reloj de GitHub no es de fiar: se salta corridas enteras sin avisar. El
// viernes 5 de septiembre de 2026 el vigía de swing NO CORRIÓ, y ese día se
// perdió para siempre — el historial vale porque registra lo que la app dijo
// ESE día, así que no se puede rellenar después sin inventarlo.
//
// Arreglo: en vez de un intento al día, tres (15:50, 16:20 y 16:50 UTC). Para
// que sigan siendo UNA corrida al día y no tres, cada uno mira antes si el
// vigía ya corrió hoy y, si sí, se sale sin gastar ni un crédito de Twelve
// Data. En un día normal solo trabaja el primero.
//
// ⚠️ ESCRITA POR EL LADO SEGURO, IGUAL QUE `esSombra`. Ante cualquier duda
// —no hay estado, la fecha no se entiende, el archivo está roto— devuelve
// `false`, o sea CORRE. Equivocarse hacia correr cuesta 14 créditos de los 800
// del día y no cambia el historial (si no hay señales nuevas, no se anota
// nada). Equivocarse hacia saltarse cuesta un día de historial que no vuelve.
//
// Se compara el DÍA en UTC, que es el mismo huso en el que están escritos los
// crones. En hora local podría cambiar de día a mitad de la tanda.
export function yaCorrioHoy(estado, ahora) {
  const previo = estado?.actualizadoEl
  if (typeof previo !== 'string') return false
  const d = new Date(previo)
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === ahora.toISOString().slice(0, 10)
}

// ────────────────────────────────────────────────────────────────────────
// LA VENTANA DEL DÍA (desde el 2026-11-12)
//
// `yaCorrioHoy` decide si un intento SOBRA. No decidía si llega a su HORA, y
// eso rompió un día de historial sin dar un solo error:
//
//   · El 2026-11-09 un cron de GitHub de las 15:50 UTC llegó con ocho horas
//     de retraso, a las 00:18 UTC del día 10. Para el reloj mundial ya era
//     día 10, así que no había corrido «hoy» y trabajó — sobre una vela del
//     día 10 recién empezada. Y lo apuntó como la corrida del día.
//   · El pulso bueno del día 10, a las 15:20 UTC, vio esa marca y se saltó.
//     El historial de ese día salió de una vela con dos horas de vida.
//
// Y había un segundo caso que nadie había mirado: LA VELA DIARIA NO CAMBIA
// DE FECHA A MEDIANOCHE. Medido sobre lo publicado, aunque se pide con
// `timezone=UTC`: a las 19:30 UTC la última vela todavía es la del día, y a
// las 20:48 UTC ya es la del día SIGUIENTE (2026-11-02 y 2026-11-09). El
// 2026-10-08 el vigía corrió a las 20:50 UTC y anotó la vela del día 9. O sea
// que un intento atrasado que llegue por la noche anota la vela de MAÑANA con
// minutos de vida, y el día de hoy no se anota nunca.
//
// Arreglo: los intentos automáticos solo trabajan entre las 15:00 y las 19:00
// UTC. Ahí caen el pulso del reloj de fuera (15:20), los tres crones de
// GitHub (15:50, 16:20, 16:50) y la revisión diaria que lo lanza si no corrió
// (17:40). Fuera de la ventana el intento se sale sin pedir precios.
//
// ⚠️ LA ASIMETRÍA DE SIEMPRE, PERO AQUÍ VA AL REVÉS, Y POR UNA RAZÓN MEDIDA.
// `yaCorrioHoy` resuelve la duda CORRIENDO porque saltarse cuesta un día. Aquí
// correr fuera de hora cuesta MÁS que saltarse: no solo anota una lectura
// mala, sino que la apunta como la del día y bloquea la buena. Y saltarse
// casi nunca cuesta el día, porque dentro de la ventana hay cinco intentos
// independientes. Lanzarlo a mano con la casilla `forzar` se salta la ventana
// entera, que es el camino previsto para recuperar un día.
//
// ⚠️ `hasta` NO PUEDE PASAR DE LAS 19:00. El cambio de vela se ha visto desde
// las 19:30 en adelante; la media hora de margen es a propósito. Hay una
// comprobación que falla si alguien lo estira.
export const VENTANA_VIGIA_UTC = Object.freeze({ desde: 15, hasta: 19 })

export function dentroDeVentana(ahora, ventana = VENTANA_VIGIA_UTC) {
  const h = ahora.getUTCHours()
  return h >= ventana.desde && h < ventana.hasta
}

// Y LA SEGUNDA DEFENSA, DESPUÉS de pedir los precios: ¿la última vela es la
// de HOY? Si no, el intento no anota nada.
//
// La ventana debería bastar. Esto existe por si el proveedor adelanta un día
// el cambio de vela y deja de pasar a las 19:30: entonces la ventana dejaría
// pasar una vela de mañana, y esto la para. Y por el caso contrario —una
// vela de AYER a mitad de la tarde—, que significaría volver a anotar una
// fecha que ya tiene su lectura.
//
// ⚠️ Una fecha que no se entiende devuelve `false` (sí trabaja): aquí no se
// sabe nada, y saltarse por no saber sería el error caro de `yaCorrioHoy`.
export function velaDeOtroDia(ultima, ahora) {
  if (typeof ultima !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ultima)) return false
  return ultima !== ahora.toISOString().slice(0, 10)
}

// ────────────────────────────────────────────────────────────────────────
// Y EL MISMO GUARDIÁN, PERO POR HORA (desde el 2026-10-07)
//
// Lo usa `publicar-barrido.mjs`, que corre DOS VECES AL DÍA y no una. Hacen
// falta los dos porque son dos preguntas distintas:
//
//   · `yaCorrioHoy`    → el VIGÍA. Trabaja una vez al día: el segundo intento
//                        del mismo día no debe hacer nada.
//   · `yaCorrioEstaHora` → el PUBLICADOR. Trabaja dos veces al día, así que
//                        «hoy» le sobraría la segunda. Lo que no puede es
//                        repetir la MISMA hora, y eso pasa porque hay DOS
//                        relojes pulsando el botón (los crones de GitHub y el
//                        reloj de fuera en Cloudflare).
//
// Sin esto, cada publicación costaría 14 créditos dos veces: 56 al día en vez
// de 28.
//
// ⚠️ La marca de tiempo NO sale de un archivo de estado —el publicador no
// tiene— sino del `generadoEl` que el propio barrido lleva dentro. Por eso
// recibe un TEXTO y no un objeto de estado, al revés que `yaCorrioHoy`.
//
// ⚠️ Misma asimetría, resuelta hacia el mismo lado: ante cualquier duda
// devuelve `false`, o sea PUBLICA. Publicar de más cuesta 14 créditos de los
// 800 y reescribe el mismo archivo; saltarse de más deja la app con el barrido
// viejo, que es justo lo que esto viene a arreglar.
export function yaCorrioEstaHora(marcaISO, ahora) {
  if (typeof marcaISO !== 'string') return false
  const d = new Date(marcaISO)
  if (Number.isNaN(d.getTime())) return false
  // Hasta la HORA (`slice(0, 13)` deja `2026-10-07T11`), no hasta el día.
  return d.toISOString().slice(0, 13) === ahora.toISOString().slice(0, 13)
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

// ────────────────────────────────────────────────────────────────────────
// EL SESGO DEL COT, ANOTADO EN CADA SEÑAL (desde el 2026-11-06)
//
// Néstor lo pidió con estas palabras: «Has que el vigía anote el sesgo del
// COT». Sale de lo que el listón de la segunda vuelta autorizaba y nada más:
// anotar el dato para que la pregunta sea re-respondible con días que nadie
// ha mirado.
//
// ⚠️⚠️ ESTO NO ENCIENDE NADA, Y NO PUEDE. No apaga ni una señal, no las
// reordena, no las puntúa y no cambia a quién le suena el celular. El COT
// como FILTRO se midió DOS veces y suspendió las dos; la segunda vuelta dejó
// un candidato que SOBREVIVE a sus descartes, y sobrevivir no es aprobar —
// su veredicto limpio saldría del registro hacia adelante, que es
// exactamente lo que esto empieza a escribir.
//
// ⚠️ POR QUÉ AQUÍ NO HAY DISCIPLINA DE FECHA. En el banco de pruebas hay que
// mirar hacia atrás y descartar los informes que ese día no se habían
// publicado todavía; aquí se lee el `cot.json` del día, que solo puede
// contener lo que la CFTC ya hizo público. El futuro no existe.
// ────────────────────────────────────────────────────────────────────────

// Lee el `cot.json` publicado. Devuelve `null` ante cualquier problema.
//
// ⚠️ UN FALLO AQUÍ NO PUEDE TUMBAR EL VIGÍA, y los dos errores no valen lo
// mismo: sin anotación se pierde un dato de un experimento sin validar; si el
// vigía muere, el historial de la app —lo único irrecuperable del proyecto—
// pierde el día entero. Misma razón por la que `setupsLSS` va dentro de un
// `try`.
export function leerCotPublicado(ruta) {
  try {
    const c = JSON.parse(readFileSync(ruta, 'utf8'))
    if (!c || typeof c !== 'object') return null
    if (!c.divisas || typeof c.divisas !== 'object') return null
    return c
  } catch {
    return null
  }
}
