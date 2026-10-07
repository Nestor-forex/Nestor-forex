// EL LISTÓN DE «MOVER EL STOP A BREAKEVEN», ESCRITO ANTES DE MEDIRLO.
//
// Fecha de redacción: 2026-10-07. La primera corrida de `medir-breakeven.mjs`
// es posterior a este archivo, y el historial de commits lo demuestra.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ ESTO EXISTE ANTES QUE LA MEDICIÓN
// ─────────────────────────────────────────────────────────────────────────
// Néstor preguntó el 2026-10-07 si vale la pena mover el stop a breakeven, y la
// respuesta honesta en ese momento fue «no se puede saber»: el historial real
// anota ganada o perdida, y **no anota cuánto a favor llegó una operación antes
// de irse al stop**. Sin ese dato, cualquier número sobre breakeven sería
// inventado. El banco de pruebas sí tiene las velas, así que se puede medir.
//
// ⚠️ Y SE MIDE CON EL LISTÓN ESCRITO ANTES porque breakeven es, de todas las
// ideas de este proyecto, la que más fácil se cuela sin medir. Suena a sentido
// común: «si ya vas ganando, no dejes que se te ponga en contra». Casi todo el
// mundo lo da por bueno sin un número. En este archivo hay **diez mecanismos
// convincentes documentados que resultaron falsos al medirlos**, y éste tiene
// la forma exacta de los diez.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE BREAKEVEN HACE DE VERDAD, Y QUE NO ES LO QUE PARECE
// ─────────────────────────────────────────────────────────────────────────
// La mitad que todo el mundo ve: una operación que iba ganando y se da la
// vuelta deja de costar 1 riesgo y pasa a costar ~0. Eso es cierto.
//
// La mitad que casi nadie cuenta: **una operación que habría GANADO puede
// quedarse en 0.** Si el precio llega al nivel de armado, se da la vuelta hasta
// la entrada y DESPUÉS sigue hasta el objetivo, breakeven te saca justo antes
// de que pasara lo bueno. Breakeven no quita riesgo gratis: lo cambia por
// objetivos perdidos.
//
// Así que la pregunta medible no es «¿evita pérdidas?» —claro que sí— sino
// **¿evita más pérdida de la que cuesta en objetivos?**
//
// ⚠️ Y breakeven NO sale a cero: sale a cero de PRECIO. El spread se paga igual
// y el swap de las noches que estuvo abierta también. En veces el riesgo eso es
// un número pequeño y negativo, nunca 0. La medición lo cobra.
//
// ─────────────────────────────────────────────────────────────────────────
// LA DECISIÓN QUE HAY QUE FIJAR ANTES, PORQUE DECIDE EL RESULTADO
// ─────────────────────────────────────────────────────────────────────────
// Una vela diaria solo guarda máximo, mínimo y cierre. **No dice el orden.**
// Así que cuando una misma vela llega al nivel de armado Y vuelve a la entrada,
// no se sabe qué pasó primero.
//
// Se elige, como en `EMPATE_CUENTA_COMO` del resolver, **el peor caso para
// quien opera**: el armado NO cuenta hasta la vela SIGUIENTE. O sea que si el
// precio sube, arma y se derrumba en la misma vela, breakeven NO salva esa
// operación.
//
// ⚠️ Esto hace que breakeven salga PEOR de lo que saldría con datos de minuto.
// Es a propósito y por el mismo motivo de siempre: un número que se equivoca a
// favor propio no sirve para decidir si arriesgar dinero. Si con esta vara
// breakeven igual gana, gana de verdad.
//
// ─────────────────────────────────────────────────────────────────────────
// EL LISTÓN
// ─────────────────────────────────────────────────────────────────────────
// Seis criterios, todos obligatorios. El veredicto lo CALCULA `juzgar()`, no lo
// argumenta nadie.

export const FECHA_REDACCION = '2026-10-07'

// Cuánto a favor tiene que moverse el precio para armar el breakeven, en veces
// el riesgo. Se barren varios a propósito: un solo nivel ganador entre muchos
// perdedores es curva ajustada, no hallazgo.
export const NIVELES_ARMADO = [0.25, 0.5, 0.75, 1.0, 1.5]

// La mejora mínima en el resultado por unidad de riesgo. Es el MISMO umbral que
// el del cambio de rejilla, y por el mismo motivo: con ~1.800 operaciones el
// error típico de cada media ronda 0,024, así que por debajo de 0,02 no se
// distingue una mejora de un reparto afortunado.
export const MEJORA_MINIMA = 0.02

// Cuántos de los niveles barridos tienen que mejorar. Más de la mitad.
export const NIVELES_QUE_DEBEN_MEJORAR = 3

// El swap al que tiene que seguir mejorando. Breakeven acorta las operaciones
// que saca antes, así que **se beneficia de que el swap suba** — por eso este
// criterio es suave a propósito: no se le exige aguantar 1 pip como a la
// reversión, solo que la mejora no dependa de un swap concreto.
export const SWAP_DE_CONTROL = 0.5

// Ningún par puede aportar más de esta fracción de la mejora total.
export const CONCENTRACION_MAXIMA = 0.4

// ─────────────────────────────────────────────────────────────────────────
// ⚠️ SI UN RESULTADO QUEDA A UN PELO, LA RESPUESTA NO ES AFLOJAR UN CRITERIO.
// Éste es el momento exacto para el que se escribió el listón antes. Lo mismo
// ya pasó con el derrumbe del lunes de Intradía: midió 1,28× contra el 1,50
// pedido, y el umbral no se tocó.
// ─────────────────────────────────────────────────────────────────────────

// `r` es { sinBE, niveles, concentracion } donde:
//   sinBE          = { porRiesgo, porRiesgo1aMitad, porRiesgo2aMitad, ops }
//   niveles        = [{ armarEn, porRiesgo, porRiesgo1aMitad, porRiesgo2aMitad,
//                       ops, porRiesgoConSwap }]
//   concentracion  = la fracción de la mejora que aporta el par que más aporta,
//                    en el mejor nivel; `null` si no se pudo calcular.
export function juzgar(r) {
  const fallos = []
  const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null)

  const base = num(r?.sinBE?.porRiesgo)
  if (base === null) return { pasa: false, fallos: ['no hay resultado SIN breakeven con el que comparar'], mejor: null }

  const niveles = Array.isArray(r.niveles) ? r.niveles : []
  if (!niveles.length) return { pasa: false, fallos: ['no se midió ningún nivel de armado'], mejor: null }

  // El mejor nivel, por resultado con costes.
  const mejor = niveles.reduce((a, b) => ((num(b.porRiesgo) ?? -Infinity) > (num(a.porRiesgo) ?? -Infinity) ? b : a))

  // 1. El mejor nivel mejora el resultado por encima del umbral.
  const mejora = num(mejor.porRiesgo) === null ? null : mejor.porRiesgo - base
  if (mejora === null || mejora < MEJORA_MINIMA) {
    fallos.push(
      `la mejor mejora es ${mejora === null ? 'n/d' : mejora.toFixed(3)} y hace falta ${MEJORA_MINIMA}`
    )
  }

  // 2. Mejora en las DOS mitades del periodo. Es el criterio que distingue una
  //    ventaja de un reparto afortunado, y el que tumbó al COT.
  const m1 = num(mejor.porRiesgo1aMitad)
  const m2 = num(mejor.porRiesgo2aMitad)
  const b1 = num(r.sinBE.porRiesgo1aMitad)
  const b2 = num(r.sinBE.porRiesgo2aMitad)
  if (m1 === null || m2 === null || b1 === null || b2 === null) {
    fallos.push('faltan las mitades: sin ellas no se puede juzgar')
  } else if (!(m1 > b1 && m2 > b2)) {
    fallos.push(
      `no mejora en las dos mitades (1ª ${m1.toFixed(3)} vs ${b1.toFixed(3)} · 2ª ${m2.toFixed(3)} vs ${b2.toFixed(3)})`
    )
  }

  // 3. No cambia el número de operaciones. Breakeven NO filtra señales: opera
  //    exactamente las mismas y solo cambia por dónde salen. Si el conteo
  //    cambiara, la medición estaría comparando dos conjuntos distintos y la
  //    comparación no significaría nada. Es una comprobación de la propia
  //    medición, no de la idea.
  if (num(mejor.ops) !== num(r.sinBE.ops)) {
    fallos.push(`opera ${mejor.ops} donde sin breakeven son ${r.sinBE.ops}: no son las mismas operaciones`)
  }

  // 4. La mejora aparece en más de la mitad de los niveles barridos.
  const mejoran = niveles.filter((n) => (num(n.porRiesgo) ?? -Infinity) - base >= MEJORA_MINIMA).length
  if (mejoran < NIVELES_QUE_DEBEN_MEJORAR) {
    fallos.push(`solo ${mejoran} de ${niveles.length} niveles mejoran, y hacen falta ${NIVELES_QUE_DEBEN_MEJORAR}`)
  }

  // 5. Sigue mejorando pagando swap.
  const conSwap = num(mejor.porRiesgoConSwap)
  const baseConSwap = num(r.sinBE.porRiesgoConSwap)
  if (conSwap === null || baseConSwap === null) {
    fallos.push('falta el barrido de swap')
  } else if (conSwap - baseConSwap < MEJORA_MINIMA) {
    fallos.push(
      `pagando ${SWAP_DE_CONTROL} de swap la mejora baja a ${(conSwap - baseConSwap).toFixed(3)}`
    )
  }

  // 6. La mejora no la aporta un solo par.
  const c = num(r.concentracion)
  if (c === null) {
    fallos.push('no se pudo medir la concentración por par')
  } else if (c > CONCENTRACION_MAXIMA) {
    fallos.push(`un solo par aporta el ${(100 * c).toFixed(0)} % de la mejora (máximo ${100 * CONCENTRACION_MAXIMA} %)`)
  }

  return { pasa: fallos.length === 0, fallos, mejor }
}
