// EL PREREGISTRO DE «COMPRAR LA CAÍDA».
//
// ═════════════════════════════════════════════════════════════════════════
// ESCRITO EL 2026-09-07, ANTES DE CORRER NADA.
// ═════════════════════════════════════════════════════════════════════════
//
// ⚠️ SI ESTOS NÚMEROS SE TOCAN DESPUÉS DE VER UN RESULTADO, EL PREREGISTRO NO
// VALE NADA Y ES MEJOR BORRAR EL ARCHIVO QUE DEJARLO MINTIENDO. Mover el listón
// hasta que la regla lo pase no es medir: es decidir primero y buscar el número
// después, que es exactamente lo que hace la competencia.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ HACE FALTA ESTO, Y POR QUÉ AQUÍ EN CONCRETO
// ─────────────────────────────────────────────────────────────────────────
// «Comprar la caída» apareció el 2026-09-04 como CONTROL de otra medición —el
// barrido de liquidez— y salió mejor que lo que se estaba probando: +0,09 por
// unidad de riesgo con 28,7 señales al mes, contra −0,05 de la app.
//
// Y se rechazó a propósito, porque se miró DESPUÉS de ver la tabla. Si uno mira
// veinte números y se queda con el mejor, encuentra algo bonito por casualidad.
// Este proyecto ya rechazó por lo mismo el control de la confluencia.
//
// Néstor pidió el 2026-09-07 perseguirla en serio. «En serio» significa esto:
// escribir el listón ANTES, y que el veredicto lo calcule una función y no lo
// argumente nadie.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LA LIMITACIÓN QUE ESTE ARCHIVO **NO** ARREGLA, Y HAY QUE DECIRLA
// ─────────────────────────────────────────────────────────────────────────
// Estos 1.436 días YA SE MIRARON. Volver a medir sobre ellos, aunque el listón
// esté escrito antes, sigue estando contaminado: la regla se eligió porque
// destacó en ESTOS datos.
//
// Por eso PASAR ESTO ES NECESARIO PERO NO SUFICIENTE. Lo único limpio es el
// registro hacia adelante, sobre días que nadie ha visto todavía — y por eso
// el mismo cambio la pone a anotarse en la sombra desde hoy, igual que la
// reversión desde el 2026-08-18.
//
// Y hay un dato EN CONTRA que tampoco se esconde: en Intradía la misma idea da
// −0,08 plano en los tres tamaños. No la desmiente (velas de un día y de una
// hora son cosas distintas, y esa es la regla de siempre) pero es un aviso.

export const PREREGISTRO = {
  fecha: '2026-09-07',
  regla: 'Comprar el par el día que hace mínimo de N días; vender el que hace máximo de N días.',
  ventanas: [1, 5, 10, 20],
  // La ventana que se juzga. Se fija ahora para no poder elegir después la que
  // mejor salga: eso sería el mismo troceo a posteriori con otro disfraz.
  //
  // Se elige 10 porque es la más pequeña de las dos que empataron en +0,09, y
  // entre dos resultados iguales la que da MÁS señales llega antes a tener
  // historial real, que es el cuello de botella de todo el proyecto.
  ventanaJuzgada: 10,
}

// ─────────────────────────────────────────────────────────────────────────
// LOS SEIS LISTONES. TIENEN QUE PASAR **TODOS**.
// ─────────────────────────────────────────────────────────────────────────
export const CRITERIOS = [
  {
    clave: 'positiva',
    dice: 'Gana con costes en LAS DOS MITADES del periodo',
    porque:
      'Una regla que gana en una mitad y se cae en la otra era una casualidad ' +
      'de esos meses. Es el listón que tumbó al ADX en su día.',
    juzga: (r) => r.por1R > 0 && r.mitad1 > 0 && r.mitad2 > 0,
  },
  {
    clave: 'vecinos',
    dice: 'Las ventanas vecinas también ganan',
    porque:
      'Un efecto real es ANCHO: si comprar el mínimo de 10 días funciona porque ' +
      'el precio se estiró, el de 5 y el de 20 tienen que funcionar también. Un ' +
      'pico solitario en 10, con los vecinos planos, es una curva ajustada al pasado.',
    juzga: (r) => r.vecinos.length >= 2 && r.vecinos.every((v) => v > 0),
  },
  {
    clave: 'swap',
    dice: 'Sigue ganando pagando 0,5 pips de swap por noche',
    porque:
      'El swap típico de un par mayor va de 0,2 a 1 pip. Una regla que solo gana ' +
      'con swap cero no gana en una cuenta real. La reversión aguanta 1 pip.',
    juzga: (r) => r.conSwap05 > 0,
  },
  {
    clave: 'senales',
    dice: 'Da más señales al mes que la reversión (13,5)',
    porque:
      'Si diera menos, no serviría para lo que la queremos: acortar los ~11 meses ' +
      'que faltan para tener historial real suficiente.',
    juzga: (r) => r.senalesMes > 13.5,
  },
  {
    clave: 'independiente',
    dice: 'Coincide con la reversión en menos del 20 % de sus señales',
    porque:
      'Si coincidiera mucho, no sería una segunda vía: sería la reversión con otro ' +
      'nombre, y dos medidas de lo mismo no son dos razones para creer.',
    juzga: (r) => r.solapeConReversion < 0.2,
  },
  {
    clave: 'repartida',
    dice: 'Ningún par solo aporta más del 40 % de la ganancia',
    porque:
      'Si casi todo el resultado sale de un par, no es un efecto del mercado: es ' +
      'ese par en estos cinco años. Un efecto de verdad aparece repartido, porque ' +
      'la razón que lo explica —que el precio se estira y vuelve— vale para todos.',
    juzga: (r) => r.aporteDelMejorPar < 0.4,
  },
]

/**
 * El veredicto. Se CALCULA, no se argumenta.
 *
 * @param r  { por1R, mitad1, mitad2, vecinos[], conSwap05, senalesMes,
 *             solapeConReversion, aporteDelMejorPar }
 * @returns  { aprueba, filas[] } — `filas` para poder imprimir cuál falló.
 */
export function juzgar(r) {
  const filas = CRITERIOS.map((c) => ({
    clave: c.clave,
    dice: c.dice,
    porque: c.porque,
    pasa: c.juzga(r),
  }))
  return { aprueba: filas.every((f) => f.pasa), filas }
}

// ⚠️ Y QUÉ SIGNIFICA UN APROBADO, PARA QUE NADIE LO LEA DE MÁS.
//
// «Aprueba» quiere decir: merece seguir anotándose en la sombra y volver a
// mirarla dentro de unos meses con operaciones REALES. NO quiere decir que se
// pueda encender en la app, ni que se pueda vender, ni que gane dinero.
//
// La app no cambia por un backtest. Cambió una vez por una medición y lo que se
// compró fue que HABLARA más, no que acertara — y hasta eso se escribió con su
// aviso al lado.
export const QUE_SIGNIFICA_APROBAR =
  'Merece seguir en la sombra y volver a mirarla con operaciones reales. ' +
  'NO autoriza a encenderla en la app ni a prometer nada a nadie.'
