// Prueba del preregistro de «comprar la caída». Sin internet:
//
//     node scripts/prueba-preregistro.mjs
//
// ⚠️ LO QUE SE COMPRUEBA AQUÍ NO ES QUE LA REGLA GANE — eso lo dirá la
// medición— sino que EL LISTÓN RECHAZA. Un preregistro que aprueba casi todo no
// es un preregistro: es una firma en blanco. Y la tentación de aflojarlo llega
// justo cuando el resultado queda a un pelo, que es el peor momento para
// discutirlo.
//
// Por eso el veredicto lo calcula `juzgar()` y no lo argumenta nadie, y por eso
// aquí se le pasan resultados inventados que fallan UN solo criterio cada vez.

import { CRITERIOS, juzgar, PREREGISTRO, QUE_SIGNIFICA_APROBAR } from './lib/preregistro.mjs'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// Un resultado que pasa TODO, con margen. De aquí se parte para romper un
// criterio cada vez.
const bueno = {
  por1R: 0.09,
  mitad1: 0.05,
  mitad2: 0.12,
  vecinos: [0.06, 0.09],
  conSwap05: 0.04,
  senalesMes: 28.7,
  solapeConReversion: 0.03,
  aporteDelMejorPar: 0.15,
}

console.log('\n1. Un resultado bueno pasa')
{
  const v = juzgar(bueno)
  comprobar(v.aprueba, 'el resultado que cumple los seis criterios aprueba')
  comprobar(v.filas.length === CRITERIOS.length, `y se juzgan los ${CRITERIOS.length} criterios, no menos`)
  comprobar(
    v.filas.every((f) => f.pasa),
    'con las seis filas en verde'
  )
}

console.log('\n2. FALLAR UNO SOLO BASTA PARA RECHAZAR')
{
  // Cada caso rompe exactamente un criterio y deja los otros cinco intactos.
  // Si alguno de estos aprobara, el listón tendría un agujero por donde se
  // colaría justo la regla que no debe pasar.
  const casos = [
    ['positiva', { ...bueno, mitad2: -0.01 }, 'gana en total pero se cae en la segunda mitad'],
    ['positiva', { ...bueno, por1R: -0.01, mitad1: 0.05, mitad2: -0.07 }, 'pierde en total'],
    ['vecinos', { ...bueno, vecinos: [-0.02, 0.09] }, 'un vecino se cae: pico solitario'],
    ['vecinos', { ...bueno, vecinos: [0.09] }, 'solo se mide UN vecino: no basta para ver la anchura'],
    ['swap', { ...bueno, conSwap05: -0.01 }, 'no aguanta medio pip de swap por noche'],
    ['senales', { ...bueno, senalesMes: 12 }, 'da menos señales que la reversión: no acorta nada'],
    ['independiente', { ...bueno, solapeConReversion: 0.35 }, 'coincide demasiado: es la reversión con otro nombre'],
    ['repartida', { ...bueno, aporteDelMejorPar: 0.55 }, 'medio resultado sale de un solo par'],
  ]

  for (const [clave, r, que] of casos) {
    const v = juzgar(r)
    const falla = v.filas.find((f) => !f.pasa)
    comprobar(!v.aprueba && falla?.clave === clave, `RECHAZA: ${que}`)
  }
}

console.log('\n3. Los bordes exactos, para que no haya duda de dónde está la raya')
{
  // Un criterio con el borde mal puesto es un criterio que no se puede
  // defender después: «pasó por poco» tiene que significar algo concreto.
  comprobar(!juzgar({ ...bueno, por1R: 0 }).aprueba, 'cero NO es ganar: por1R = 0 se rechaza')
  comprobar(!juzgar({ ...bueno, conSwap05: 0 }).aprueba, 'y cero pagando swap tampoco')
  comprobar(!juzgar({ ...bueno, senalesMes: 13.5 }).aprueba, 'empatar con la reversión en señales no basta (13,5)')
  comprobar(juzgar({ ...bueno, senalesMes: 13.6 }).aprueba, 'pero 13,6 sí pasa: la raya está donde dice')
  comprobar(!juzgar({ ...bueno, solapeConReversion: 0.2 }).aprueba, 'el 20 % de solape se rechaza; tiene que ser MENOS')
  comprobar(!juzgar({ ...bueno, aporteDelMejorPar: 0.4 }).aprueba, 'el 40 % de un par se rechaza; tiene que ser MENOS')
}

console.log('\n4. El preregistro dice lo que tiene que decir')
{
  // ⚠️ La ventana juzgada se fija ANTES. Si se pudiera elegir después, se
  // elegiría la que mejor saliera y estaríamos en el mismo sitio que al
  // principio, con más pasos.
  comprobar(
    PREREGISTRO.ventanas.includes(PREREGISTRO.ventanaJuzgada),
    `la ventana que se juzga (${PREREGISTRO.ventanaJuzgada}) está entre las que se miden`
  )
  comprobar(PREREGISTRO.fecha === '2026-09-07', 'lleva la fecha en que se escribió, antes de correr nada')

  // Y que quede escrito qué NO significa aprobar. Sin esto, un «✓ APRUEBA» en
  // pantalla se lee como permiso para encenderla en la app, que es justo lo que
  // no es.
  comprobar(
    /NO autoriza/i.test(QUE_SIGNIFICA_APROBAR),
    'y deja escrito que aprobar NO autoriza a encenderla ni a prometer nada'
  )

  // Cada criterio tiene que llevar su porqué. Un listón sin motivo escrito es
  // un número que dentro de tres meses nadie sabrá defender ni mover.
  comprobar(
    CRITERIOS.every((c) => c.porque && c.porque.length > 40),
    'los seis criterios llevan escrito POR QUÉ existen'
  )
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'El listón rechaza lo que tiene que rechazar.')
process.exit(fallos ? 1 : 0)
