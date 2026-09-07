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
import {
  compararConAnterior,
  escribir,
  esSombra,
  idDe,
  leerEstado,
  separarSombra,
  yaCorrioHoy,
} from './lib/vigia-nucleo.mjs'

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

  // ⚠️ EL AGUJERO QUE ESTO CIERRA, Y QUE ESTUVO A PUNTO DE PUBLICARSE.
  //
  // Al añadir «comprar la caída» el 2026-09-07, `esSombra` enumeraba las de
  // sombra (`tipo === 'reversion'`). Sus COMPRAS no encajaban en ninguna
  // condición, así que habrían salido como señales normales y HABRÍAN
  // DESPERTADO EL CELULAR con una regla sin probar.
  comprobar('una caída de COMPRA es sombra', esSombra(setup('X/Y', 'COMPRA', 'caida')) === true)
  comprobar('y una caída de VENTA también', esSombra(setup('X/Y', 'VENTA', 'caida')) === true)

  // Y la comprobación que vale para la regla que venga MAÑANA: cualquier tipo
  // desconocido nace en la sombra. Olvidarse de encender algo solo retrasa una
  // decisión; olvidarse de apagarlo manda avisos falsos a un celular.
  comprobar(
    'un tipo que nadie ha visto todavía TAMBIÉN nace en la sombra',
    esSombra(setup('X/Y', 'COMPRA', 'lo-que-inventemos-en-2027')) === true
  )
  // Y que lo de siempre siga saliendo: si esto se volviera sombra, la app
  // dejaría de avisar de nada y tampoco daría error.
  comprobar('la señal normal de la app sigue siendo visible', esSombra(setup('X/Y', 'COMPRA', 'tendencia')) === false)
  comprobar('y una sin `tipo` también, que es como las escribe Swing', esSombra(setup('X/Y', 'COMPRA')) === false)
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

  // ⚠️ Y DESDE EL 2026-09-07 SON TRES. «Comprar la caída» también corre en la
  // sombra, y le pasa exactamente lo mismo: si el vigía deja de leer su lista,
  // su historial deja de crecer sin un solo error. Empieza de cero hoy, así que
  // cada día que no se anote es un día más de espera para poder juzgarla.
  comprobar(
    'y también la tercera, la de «comprar la caída»',
    fuente.includes('vista.setupsCaida')
  )
  comprobar(
    'y se la pide a derivarVista, que si no viene vacía',
    /incluirCaida:\s*true/.test(fuente)
  )
  comprobar(
    'y lo que compara no es `vista.setups` a secas',
    /compararConAnterior\(\s*(?!vista\.setups\s*,)/.test(fuente)
  )

  // Y que `derivarVista` de verdad las separe: si volvieran a `setups`, la
  // tabla del tablero las pintaría como señales normales.
  const calc = readFileSync(new URL('../src/lib/marketCalc.js', import.meta.url), 'utf8')
  comprobar('derivarVista devuelve `setupsReversion` como lista propia', calc.includes('setupsReversion'))
  comprobar('y `setupsCaida` como otra lista propia', calc.includes('setupsCaida'))

  // ⚠️ Y que NINGUNA de las dos de sombra se cuele en `setups`, que es lo que
  // pinta el tablero. Son reglas OPUESTAS a la de la app —una compra lo fuerte,
  // las otras lo débil— y mezclarlas en la misma tabla es justo lo que no puede
  // pasar. Ya estuvo a punto una vez.
  const setupsNormales = calc.match(/const setups = \[[\s\S]*?\n  \]/)
  comprobar(
    'y `setups` (lo que ve el tablero) NO incluye ninguna de las dos',
    !!setupsNormales && !/reversion|[Cc]aida/.test(setupsNormales[0])
  )
}

console.log('\n12. Los tres intentos del día son UNA corrida, y la duda se resuelve CORRIENDO')
{
  // El vigía lo intenta tres veces al día porque el reloj de GitHub se salta
  // corridas. Lo que se comprueba aquí es que el guardián no se pase de listo:
  // saltarse un intento de más cuesta un día de historial que no vuelve, y
  // correr de más cuesta 14 créditos de los 800 del día.
  const hoy = new Date('2026-09-07T18:40:41.039Z')

  comprobar(
    'ya corrió hoy → el segundo intento se salta',
    yaCorrioHoy({ actualizadoEl: '2026-09-07T15:52:00.000Z' }, hoy) === true
  )
  comprobar(
    'el mismo día en UTC aunque sea a otra hora: sigue siendo hoy',
    yaCorrioHoy({ actualizadoEl: '2026-09-07T00:00:00.000Z' }, hoy) === true
  )
  comprobar(
    'corrió AYER → hay que correr (es justo el caso del viernes que se perdió)',
    yaCorrioHoy({ actualizadoEl: '2026-09-04T18:33:00.000Z' }, hoy) === false
  )

  // ⚠️ El bloque que de verdad importa. Cada uno de estos es una forma de que
  // el estado no diga nada útil, y en todas la respuesta tiene que ser CORRER.
  // Si alguna devolviera `true`, un archivo raro dejaría al vigía mudo un día
  // entero sin un solo error en pantalla.
  comprobar('sin estado previo (primera corrida) → corre', yaCorrioHoy({ senales: [] }, hoy) === false)
  comprobar('estado sin la fecha dentro → corre', yaCorrioHoy({ actualizadoEl: null }, hoy) === false)
  comprobar('fecha ilegible → corre', yaCorrioHoy({ actualizadoEl: 'el martes' }, hoy) === false)
  comprobar('fecha que no es texto → corre', yaCorrioHoy({ actualizadoEl: 20260907 }, hoy) === false)
  comprobar('estado vacío del todo → corre', yaCorrioHoy(undefined, hoy) === false)

  // Y que `leerEstado` traiga de verdad el campo, porque el guardián lo lee de
  // ahí. Antes lo descartaba: sin esto, el guardián nunca se activaría y los
  // tres intentos harían el trabajo tres veces, gastando 42 créditos al día.
  escribir(ESTADO, JSON.stringify({ actualizadoEl: '2026-09-07T15:52:00.000Z', senales: ['EUR/USD|COMPRA|tendencia'] }, null, 2))
  const leido = leerEstado(ESTADO)
  comprobar('`leerEstado` conserva `actualizadoEl`', leido.actualizadoEl === '2026-09-07T15:52:00.000Z')
  comprobar('y sigue trayendo las señales de siempre', leido.senales.length === 1)
  comprobar('con lo leído del disco, el guardián se activa', yaCorrioHoy(leido, hoy) === true)

  // El workflow solo pone la variable cuando el disparo es automático. Si eso
  // se cayera, lanzarlo a mano no serviría para recuperar un día saltado —que
  // es exactamente para lo que se usa el botón.
  const wf = readFileSync(new URL('../../.github/workflows/vigia.yml', import.meta.url), 'utf8')
  comprobar('el workflow tiene los tres intentos', (wf.match(/- cron:/g) || []).length === 3)
  comprobar(
    'y el guardián solo se enciende con `schedule` (a mano siempre corre)',
    /VIGIA_SOLO_SI_FALTA:.*github\.event_name == 'schedule'/.test(wf)
  )
  // Sin `concurrency` dos intentos retrasados podrían solaparse y anotar la
  // misma señal dos veces, que es peor que no anotarla.
  comprobar('y sigue habiendo `concurrency` para que no se solapen', /concurrency:/.test(wf))
}

console.log(fallos === 0 ? '\nTodas las comprobaciones pasaron.\n' : `\n${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
