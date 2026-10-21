// Prueba de la volatilidad implícita. Sin internet:
//
//     node scripts/prueba-volatilidad.mjs
//
// Lo que se comprueba no es «que dé un número», sino las formas en que esto
// puede MENTIR sin fallar:
//
//   1. anualizar dividiendo entre los días en vez de entre su RAÍZ — da un
//      número plausible y siete veces menor, y la conclusión sale al revés;
//   2. devolver 0 cuando no se puede calcular, que afirma que el mercado no
//      espera ningún movimiento;
//   3. aceptar una fuente por responder 200, que es la trampa del oro
//      (`GOLD` devolvió velas válidas de una acción de Nueva York);
//   4. y dar un veredicto sin haber leído una sola fuente, que es decir «no
//      existe» cuando lo que pasó es «no se pudo mirar».

import {
  DIAS_MERCADO_ANIO,
  IV_MAX_PLAUSIBLE,
  IV_MIN_PLAUSIBLE,
  movimientoEsperado,
  movimientoEsperadoPips,
  plausibleIV,
  veredictoSonda,
} from './lib/volatilidad.mjs'

let fallos = 0
const comprobar = (q, ok) => {
  if (!ok) fallos++
  console.log(`  ${ok ? 'OK  ' : 'MAL '} ${q}`)
}
const casi = (a, b, tol = 0.01) => Number.isFinite(a) && Math.abs(a - b) < tol

console.log('\n1. LA ANUALIZACIÓN VA CON RAÍZ')
{
  // Un año entero devuelve la volatilidad anual tal cual. Es el ancla: si
  // esto no se cumple, la escala está mal de raíz.
  comprobar('un año entero devuelve la IV anual', casi(movimientoEsperado({ ivAnualPct: 10, dias: DIAS_MERCADO_ANIO }), 10))

  // 10 % anual a 5 días = 10·√(5/252) = 1,409 %
  const cinco = movimientoEsperado({ ivAnualPct: 10, dias: 5 })
  comprobar('10 % anual a 5 días son 1,41 %', casi(cinco, 1.409))

  // ⚠️⚠️ LA COMPROBACIÓN QUE DE VERDAD IMPORTA: que NO sea la cuenta lineal.
  // Dividir entre 252 en vez de entre √252 daría 0,198 % — plausible y falso.
  const lineal = 10 * (5 / DIAS_MERCADO_ANIO)
  comprobar('…y NO son los 0,20 % de la cuenta lineal', !casi(cinco, lineal, 0.5) && cinco > lineal * 5)

  // 10 % anual a 1 día = 10/√252 = 0,63 %
  comprobar('10 % anual a 1 día son 0,63 %', casi(movimientoEsperado({ ivAnualPct: 10, dias: 1 }), 0.63))

  // Cuadruplicar el plazo DUPLICA el movimiento esperado, no lo cuadruplica.
  // Es la firma de la raíz, y se comprueba aparte porque es la propiedad que
  // se pierde si alguien «simplifica» la fórmula.
  const d5 = movimientoEsperado({ ivAnualPct: 8, dias: 5 })
  const d20 = movimientoEsperado({ ivAnualPct: 8, dias: 20 })
  comprobar('4× el plazo da 2× el movimiento (no 4×)', casi(d20 / d5, 2, 0.02))

  // Y es lineal en la volatilidad: doble IV, doble movimiento.
  comprobar(
    'doble volatilidad da doble movimiento',
    casi(movimientoEsperado({ ivAnualPct: 20, dias: 12 }) / movimientoEsperado({ ivAnualPct: 10, dias: 12 }), 2)
  )
}

console.log('\n2. ANTE LA DUDA, `null` — NUNCA 0')
{
  // Un 0 diría «el mercado no espera que se mueva», que es una afirmación.
  comprobar('sin volatilidad → null', movimientoEsperado({ dias: 5 }) === null)
  comprobar('sin días → null', movimientoEsperado({ ivAnualPct: 10 }) === null)
  comprobar('volatilidad 0 → null', movimientoEsperado({ ivAnualPct: 0, dias: 5 }) === null)
  comprobar('volatilidad negativa → null', movimientoEsperado({ ivAnualPct: -8, dias: 5 }) === null)
  comprobar('días 0 → null', movimientoEsperado({ ivAnualPct: 10, dias: 0 }) === null)
  comprobar('días negativos → null', movimientoEsperado({ ivAnualPct: 10, dias: -3 }) === null)
  comprobar('NaN dentro → null', movimientoEsperado({ ivAnualPct: NaN, dias: 5 }) === null)
  comprobar('texto en vez de número → null', movimientoEsperado({ ivAnualPct: '10', dias: 5 }) === null)
  comprobar('sin nada en absoluto no revienta', movimientoEsperado() === null)
  comprobar('sin nada en absoluto no revienta (pips)', movimientoEsperadoPips() === null)
}

console.log('\n3. LOS PIPS, CON EL PIP PASADO Y NO ADIVINADO')
{
  // EUR/USD a 1,16 con 8 % anual a 5 días: 8·√(5/252) = 1,127 % → 0,01308 de
  // precio → 131 pips con pip = 0,0001.
  const p = movimientoEsperadoPips({ ivAnualPct: 8, dias: 5, precio: 1.16, pip: 0.0001 })
  comprobar('EUR/USD: 8 % anual a 5 días ≈ 131 pips', casi(p, 130.7, 1))

  // ⚠️ El yen lleva pip = 0,01. Con el pip de los demás saldría 100 veces
  // mayor, o sea un número absurdo que nadie leería como error de unidad.
  const jpy = movimientoEsperadoPips({ ivAnualPct: 8, dias: 5, precio: 150, pip: 0.01 })
  comprobar('USD/JPY: 8 % anual a 5 días ≈ 169 pips', casi(jpy, 169, 1))
  const jpyMal = movimientoEsperadoPips({ ivAnualPct: 8, dias: 5, precio: 150, pip: 0.0001 })
  comprobar('…y con el pip equivocado sale 100 veces mayor', casi(jpyMal / jpy, 100, 1))

  comprobar('sin precio → null', movimientoEsperadoPips({ ivAnualPct: 8, dias: 5, pip: 0.0001 }) === null)
  comprobar('sin pip → null', movimientoEsperadoPips({ ivAnualPct: 8, dias: 5, precio: 1.16 }) === null)
  comprobar('pip 0 → null', movimientoEsperadoPips({ ivAnualPct: 8, dias: 5, precio: 1.16, pip: 0 }) === null)
  comprobar('precio 0 → null', movimientoEsperadoPips({ ivAnualPct: 8, dias: 5, precio: 0, pip: 0.0001 }) === null)
}

console.log('\n4. ⚠️ EL RANGO PLAUSIBLE — LA TRAMPA DEL ORO')
{
  comprobar('8 % es creíble', plausibleIV(8))
  comprobar('el mínimo justo es creíble', plausibleIV(IV_MIN_PLAUSIBLE))
  comprobar('el máximo justo es creíble', plausibleIV(IV_MAX_PLAUSIBLE))
  comprobar('0,2 % no es una volatilidad de divisas', !plausibleIV(0.2))
  comprobar('200 % tampoco', !plausibleIV(200))
  // El 42,85 con el que `GOLD` se hizo pasar por oro cae DENTRO del rango de
  // una volatilidad, así que el rango solo no basta — por eso la sonda mira
  // además los metadatos de la fuente. Se comprueba para que quede escrito
  // que el guardia tiene un límite conocido.
  comprobar('⚠️ 42,85 (el precio de la acción «GOLD») cae dentro: el rango NO basta solo', plausibleIV(42.85))
  comprobar('un negativo no es creíble', !plausibleIV(-8))
  comprobar('NaN no es creíble', !plausibleIV(NaN))
  comprobar('texto no es creíble', !plausibleIV('8'))
}

console.log('\n5. ⚠️⚠️ SIN FUENTES LEÍDAS NO HAY VEREDICTO')
{
  const nada = veredictoSonda([])
  comprobar('lista vacía → noSePudoMirar', nada.veredicto === 'noSePudoMirar')
  comprobar('…y lo dice con esas palabras', /NO SE PUDO MIRAR/.test(nada.dice))
  comprobar('…y aclara que eso NO dice que no exista', /no dice que el dato no exista/.test(nada.dice))

  comprobar('nada en absoluto → noSePudoMirar', veredictoSonda().veredicto === 'noSePudoMirar')
  comprobar('texto en vez de lista → noSePudoMirar', veredictoSonda('hola').veredicto === 'noSePudoMirar')

  // Las que NO respondieron no cuentan como leídas, por muchas que sean.
  const ninguna = veredictoSonda([
    { nombre: 'a', respondio: false },
    { nombre: 'b', respondio: false },
    { nombre: 'c', respondio: false },
  ])
  comprobar('tres que no respondieron siguen siendo cero leídas', ninguna.veredicto === 'noSePudoMirar')
}

console.log('\n6. RESPONDER 200 NO ES TRAER EL DATO')
{
  const respondenSinDato = veredictoSonda([
    { nombre: 'a', respondio: true, iv: null },
    { nombre: 'b', respondio: true, iv: 0.0001 },
  ])
  comprobar('responden y no traen volatilidad → ningunaSirve', respondenSinDato.veredicto === 'ningunaSirve')
  // ⚠️ Y ESTO SÍ ES UN HALLAZGO, al revés que el caso de arriba. La
  // distinción es la razón de ser de esta función.
  comprobar('…y lo dice como hallazgo', /sí es un hallazgo/.test(respondenSinDato.dice))

  const buena = veredictoSonda([
    { nombre: 'evz', respondio: true, iv: 7.4, pares: ['EUR/USD'] },
    { nombre: 'rota', respondio: false },
  ])
  comprobar('una creíble → hayCandidata', buena.veredicto === 'hayCandidata')
  comprobar('…y nombra cuál sirve', buena.sirven.length === 1 && buena.sirven[0] === 'evz')

  // ⚠️ LA COBERTURA VA EN EL VEREDICTO. Un índice de volatilidad es de UN par;
  // aplicarle a los 14 el número del euro sería inventar trece.
  comprobar('…y dice cuántos pares cubre', /1 par\(es\) de los 14/.test(buena.dice))
  comprobar('…y avisa de que lo no cubierto NO se rellena', /NO se rellena/.test(buena.dice))

  const tres = veredictoSonda([
    { nombre: 'evz', respondio: true, iv: 7.4, pares: ['EUR/USD'] },
    { nombre: 'jyvix', respondio: true, iv: 9.1, pares: ['USD/JPY'] },
    { nombre: 'bpvix', respondio: true, iv: 8.2, pares: ['GBP/USD'] },
  ])
  comprobar('tres índices cubren tres pares, no catorce', /3 par\(es\) de los 14/.test(tres.dice))
}

console.log('\n7. EL CASO QUE MOTIVA TODO: ¿cabe el objetivo en el horizonte?')
{
  // Esto NO decide nada: es la cuenta que la sonda va a imprimir, comprobada
  // con los números ya medidos de Swing para que el informe no mienta.
  //
  // Objetivo típico de la app = 2 × ATR. El ATR mediano medido sobre 46
  // señales reales es 47 pips, así que el objetivo ronda los 94.
  const OBJETIVO_PIPS = 94
  // Horizonte medido de Swing con la vara neutra: 5 días.
  const esperado5 = movimientoEsperadoPips({ ivAnualPct: 8, dias: 5, precio: 1.16, pip: 0.0001 })
  comprobar('a 5 días el mercado espera ~131 pips en EUR/USD', casi(esperado5, 130.7, 1))
  comprobar('…o sea que un objetivo de 94 pips SÍ cabe en el horizonte', esperado5 > OBJETIVO_PIPS)

  // Y con la volatilidad por el suelo deja de caber. La conclusión depende del
  // número, que es justo el motivo de ir a buscarlo.
  const flojo = movimientoEsperadoPips({ ivAnualPct: 4, dias: 5, precio: 1.16, pip: 0.0001 })
  comprobar('con la volatilidad a la mitad ya no cabe', flojo < OBJETIVO_PIPS)

  // ⚠️ Y CON LA CUENTA LINEAL NO CABRÍA NUNCA: 8 % lineal a 5 días son 18
  // pips, así que el informe diría que el objetivo es inalcanzable SIEMPRE y
  // en cualquier par. Es la conclusión contraria a la verdadera, sacada de un
  // número que nadie leería como absurdo.
  const linealPips = ((8 * (5 / DIAS_MERCADO_ANIO)) / 100) * 1.16 / 0.0001
  comprobar('⚠️ la cuenta lineal daría 18 pips y la conclusión contraria', linealPips < 25 && linealPips < OBJETIVO_PIPS)
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'La volatilidad implícita se anualiza y se juzga como dice.')
process.exit(fallos ? 1 : 0)
