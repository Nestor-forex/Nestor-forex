// Prueba de la lógica del vigía: qué cuenta como señal nueva y qué no.
//
// Corre sin internet y sin gastar cuota de Twelve Data, con señales
// inventadas. Es la parte que no se puede comprobar mirando una corrida real
// (si ese día no hay señales, no se prueba nada), y es justo de la que
// dependen los avisos: un fallo aquí significa o avisos repetidos cada hora,
// o ningún aviso nunca.
//
// Correr con: node scripts/prueba-vigia.mjs

import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compararConAnterior, escribir, esSombra, idDe, leerEstado, separarSombra } from './lib/vigia-nucleo.mjs'

const dir = mkdtempSync(join(tmpdir(), 'vigia-'))
const ESTADO = join(dir, 'estado/vigia.json')

const setup = (name, lado, tipo = 'tendencia') => ({ name, lado, tipo })
const guardar = (actuales) => escribir(ESTADO, JSON.stringify({ senales: actuales.map((x) => x.id) }, null, 2))

let fallos = 0
const comprobar = (que, condicion) => {
  console.log(`${condicion ? '  OK  ' : '  MAL '} ${que}`)
  if (!condicion) fallos++
}

// ---------------------------------------------------------------- escenarios

console.log('\n1. Primera corrida: todo es nuevo (no hay estado previo)')
const r1 = compararConAnterior([setup('EUR/USD', 'COMPRA'), setup('USD/JPY', 'VENTA')], leerEstado(ESTADO))
comprobar('las 2 señales cuentan como nuevas', r1.nuevas.length === 2)
guardar(r1.actuales)

console.log('\n2. Misma foto una hora después: nada nuevo')
const r2 = compararConAnterior([setup('EUR/USD', 'COMPRA'), setup('USD/JPY', 'VENTA')], leerEstado(ESTADO))
comprobar('sigue habiendo 2 señales activas', r2.actuales.length === 2)
comprobar('ninguna es nueva (no se repite el aviso)', r2.nuevas.length === 0)
guardar(r2.actuales)

console.log('\n3. Aparece una tercera: solo esa es nueva')
const r3 = compararConAnterior(
  [setup('EUR/USD', 'COMPRA'), setup('USD/JPY', 'VENTA'), setup('GBP/CHF', 'COMPRA')],
  leerEstado(ESTADO)
)
comprobar('solo 1 nueva', r3.nuevas.length === 1)
comprobar('y es GBP/CHF', r3.nuevas[0].s.name === 'GBP/CHF')
guardar(r3.actuales)

console.log('\n4. El mismo par cambia de lado: es una señal distinta')
const r4 = compararConAnterior([setup('EUR/USD', 'VENTA')], leerEstado(ESTADO))
comprobar('EUR/USD VENTA cuenta como nueva aunque ya hubo EUR/USD COMPRA', r4.nuevas.length === 1)
guardar(r4.actuales)

console.log('\n5. Una señal desaparece y vuelve: cuenta como nueva otra vez')
guardar(compararConAnterior([], leerEstado(ESTADO)).actuales) // hora sin nada
const r5 = compararConAnterior([setup('EUR/USD', 'VENTA')], leerEstado(ESTADO))
comprobar('es una oportunidad de entrada distinta, así que vuelve a avisar', r5.nuevas.length === 1)

console.log('\n6. El mismo par en modo rango no es el mismo que en tendencia')
const r6 = compararConAnterior([setup('EUR/USD', 'COMPRA', 'tendencia'), setup('EUR/USD', 'COMPRA', 'rango')], { senales: [] })
comprobar('se distinguen por tipo', new Set(r6.actuales.map((x) => x.id)).size === 2)

console.log('\n7. Estado estropeado o inexistente: no tumba el vigía')
comprobar('archivo que no existe → arranca de cero', leerEstado(join(dir, 'no-existe.json')).senales.length === 0)
escribir(join(dir, 'roto.json'), '{esto no es json')
comprobar('archivo corrupto → arranca de cero', leerEstado(join(dir, 'roto.json')).senales.length === 0)

console.log('\n8. Lo que se guarda se vuelve a leer igual')
const guardado = JSON.parse(readFileSync(ESTADO, 'utf8'))
comprobar('el estado en disco tiene los ids esperados', guardado.senales.every((x) => typeof x === 'string'))
comprobar('el id se arma como par|lado|tipo', idDe(setup('EUR/USD', 'COMPRA')) === 'EUR/USD|COMPRA|tendencia')

console.log('\n9. Las ventas pausadas se anotan pero NUNCA salen hacia un celular')
{
  // Las ventas están pausadas porque se midió que perdían (−0,30 por unidad
  // de riesgo, el 87% de todo lo perdido). El vigía las sigue anotando para
  // que la pausa tenga un final posible: sin datos nuevos, no habría con qué
  // decidir nunca si vuelven. Pero no pueden llegarle a nadie.
  //
  // Si esto se rompiera no habría ningún síntoma visible: simplemente
  // empezarían a salir avisos de operaciones que la app ya no propone.
  const nuevas = [
    { id: 'a', s: setup('EUR/USD', 'COMPRA') },
    { id: 'b', s: setup('GBP/USD', 'VENTA') },
    { id: 'c', s: setup('USD/JPY', 'VENTA') },
  ]
  const { visibles, sombra } = separarSombra(nuevas)

  comprobar('las dos ventas quedan apartadas', sombra.length === 2)
  comprobar('y ninguna aparece entre las que se avisan', !visibles.some((x) => x.s.lado === 'VENTA'))
  comprobar('la compra sí se avisa', visibles.length === 1 && visibles[0].id === 'a')
  comprobar('ninguna se pierde por el camino', visibles.length + sombra.length === nuevas.length)
  comprobar('es el lado lo que manda', esSombra(setup('AUD/USD', 'VENTA')) === true)
  comprobar('y una compra nunca es sombra', esSombra(setup('AUD/USD', 'COMPRA')) === false)
  comprobar('un setup sin lado no revienta', esSombra({}) === false)
}

console.log('\n10. Las reversiones tampoco salen hacia un celular')
{
  // La reversión es la idea de la app al revés. Corre en la sombra mientras
  // se decide si vale, así que no puede avisarle a nadie — ni siquiera el día
  // que las ventas se reactiven y dejen de ser sombra por su cuenta.
  const nuevas = [
    { id: 'a', s: setup('EUR/USD', 'COMPRA') },
    { id: 'b', s: setup('GBP/USD', 'COMPRA', 'reversion') },
    { id: 'c', s: setup('USD/JPY', 'VENTA', 'reversion') },
  ]
  const { visibles, sombra } = separarSombra(nuevas)
  comprobar('las dos reversiones quedan apartadas', sombra.length === 2)
  comprobar('solo se avisa la compra normal', visibles.length === 1 && visibles[0].id === 'a')
  comprobar('una reversión de COMPRA también es sombra', esSombra(setup('X/Y', 'COMPRA', 'reversion')) === true)
}

console.log('\n11. El vigía sigue anotando las reversiones tras separarlas de la app')
{
  // ⚠️ ESTA ES LA COMPROBACIÓN MÁS IMPORTANTE DEL ARCHIVO, y existe por un
  // fallo que estuvo a un renglón de pasar.
  //
  // El 2026-09-05 las reversiones se sacaron de `vista.setups` a una lista
  // propia (`setupsReversion`), porque al enseñarlas en la app se habrían
  // mezclado con las señales normales en la misma tabla. Pero el vigía leía
  // `vista.setups` a secas: con ese cambio habría dejado de anotarlas **sin
  // dar un solo error**. Seguiría corriendo, seguiría publicando, y el
  // historial de la reversión simplemente dejaría de crecer.
  //
  // Y ese historial es lo único de este proyecto que NO se puede recuperar:
  // un día que no se anota, se perdió. Ya lleva 12 operaciones resueltas
  // (6 ganadas, 6 perdidas, +117 pips) y es el número que decidirá si la
  // regla se enciende de verdad algún día.
  //
  // Se comprueba leyendo el archivo del vigía, no llamándolo: arrancarlo pide
  // internet y credenciales. Es tosco a propósito — lo que hay que garantizar
  // es que ese renglón no vuelva a quedarse con una sola lista.
  const fuente = readFileSync(new URL('./vigia.mjs', import.meta.url), 'utf8')
  const juntaLasDos =
    fuente.includes('vista.setups') && fuente.includes('vista.setupsReversion')
  comprobar('el vigía lee las DOS listas, no solo la de la app', juntaLasDos)
  comprobar(
    'y lo que compara no es `vista.setups` a secas',
    /compararConAnterior\(\s*(?!vista\.setups\s*,)/.test(fuente)
  )

  // Y que `derivarVista` de verdad las separe: si volvieran a `setups`, la
  // tabla del tablero las pintaría como señales normales.
  comprobar(
    'derivarVista devuelve `setupsReversion` como lista propia',
    readFileSync(new URL('../src/lib/marketCalc.js', import.meta.url), 'utf8').includes(
      'setupsReversion'
    )
  )
}

console.log(fallos === 0 ? '\nTodas las comprobaciones pasaron.\n' : `\n${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
