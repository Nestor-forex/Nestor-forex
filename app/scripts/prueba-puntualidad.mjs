// Prueba de las cuentas de puntualidad. Sin internet y sin gastar cuota.
//
// Correr con: node scripts/prueba-puntualidad.mjs

import {
  A_TIEMPO_MIN,
  INUTIL_MIN,
  horasCubiertas,
  juzgar,
  resumir,
  retrasoEnMinutos,
} from './lib/puntualidad.mjs'

let fallos = 0
const comprobar = (que, cond) => {
  console.log(`${cond ? '  OK  ' : '  MAL '} ${que}`)
  if (!cond) fallos++
}

console.log('\n1. El retraso, en el caso normal')
comprobar('pedido 06:20, disparó 06:20 → 0 min', retrasoEnMinutos('06:20', '2026-10-06T06:20:00Z') === 0)
comprobar('pedido 06:20, disparó 06:35 → 15 min', retrasoEnMinutos('06:20', '2026-10-06T06:35:00Z') === 15)
comprobar('pedido 06:20, disparó 11:42 → 322 min', retrasoEnMinutos('06:20', '2026-10-06T11:42:00Z') === 322)
comprobar('pedido 07:20, disparó 16:09 → 529 min', retrasoEnMinutos('07:20', '2026-10-06T16:09:00Z') === 529)

console.log('\n2. ⚠️ El cron que se pasa de MEDIANOCHE')
// Es el caso que un resto a pelo convierte en un número negativo enorme, y
// con él la mediana de todo el programa se iría al otro lado.
comprobar(
  'pedido 23:00, disparó a las 02:00 del día siguiente → 180 min, no −1260',
  retrasoEnMinutos('23:00', '2026-10-07T02:00:00Z') === 180
)
comprobar(
  'pedido 22:00, disparó a las 03:30 del siguiente → 330 min',
  retrasoEnMinutos('22:00', '2026-10-07T03:30:00Z') === 330
)

console.log('\n3. ⚠️ Y el que dispara un poco ANTES de la hora')
// GitHub a veces se adelanta unos segundos. Eso es puntual, no «casi un día
// de retraso», así que el guardia del día no puede activarse aquí.
comprobar('pedido 06:20, disparó 06:18 → −2 min (no +1438)', retrasoEnMinutos('06:20', '2026-10-06T06:18:00Z') === -2)
comprobar('pedido 06:20, disparó 05:30 → −50 min', retrasoEnMinutos('06:20', '2026-10-06T05:30:00Z') === -50)
comprobar(
  'y a las 3 horas antes SÍ se lee como el cron de ayer llegando tarde',
  retrasoEnMinutos('06:20', '2026-10-06T03:00:00Z') === 1240
)

console.log('\n4. Lo que no se entiende devuelve null, nunca 0')
// Misma asimetría que `pearson`: «no lo sé» y «llegó puntual» no son lo mismo,
// y un 0 aquí diría que todo va bien.
comprobar('hora mal escrita → null', retrasoEnMinutos('6h20', '2026-10-06T06:20:00Z') === null)
comprobar('hora imposible → null', retrasoEnMinutos('25:00', '2026-10-06T06:20:00Z') === null)
comprobar('minuto imposible → null', retrasoEnMinutos('06:99', '2026-10-06T06:20:00Z') === null)
comprobar('fecha ilegible → null', retrasoEnMinutos('06:20', 'ayer por la tarde') === null)
comprobar('nada → null', retrasoEnMinutos(null, null) === null)

console.log('\n5. El resumen')
const r = resumir([0, 5, 10, 300, 400, 500])
comprobar('cuenta las 6', r.n === 6)
// ⚠️ CON UN NÚMERO PAR DE CORRIDAS SE TOMA EL DE ARRIBA DE LOS DOS DEL MEDIO
// (300 aquí, no el promedio 155), y eso es a propósito. Equivocarse hacia «hay
// más retraso del que hay» cuesta que alguien mire un log; equivocarse hacia
// «va bien» cuesta justo lo que esta herramienta existe para cazar. Es la misma
// asimetría que el resolver contando como PERDIDA el día que toca stop y
// objetivo.
//
// 📌 Y esta comprobación nació MAL: yo había escrito 400, que no es ninguna de
// las dos definiciones. La prueba me lo cantó. Es la lección de siempre — la
// prueba tiene que exigir lo que de verdad quiere exigir.
comprobar(`mediana ${r.mediana} (el de arriba de los dos del medio)`, r.mediana === 300)
comprobar(`a tiempo (≤15) son 3`, r.aTiempo === 3)
comprobar('más de dos horas son 3', r.masDeDosHoras === 3)
comprobar('el máximo es 500', r.max === 500)
comprobar('los null se descartan', resumir([10, null, 20, undefined, NaN]).n === 2)
comprobar('⚠️ lista vacía → null, no un resumen de ceros', resumir([]) === null)
comprobar('⚠️ solo basura → null', resumir([null, NaN]) === null)

console.log('\n6. El veredicto se CALCULA, y sus bordes exactos')
comprobar('sin resumen → noSePudoMirar', juzgar(null).veredicto === 'noSePudoMirar')
comprobar(`mediana ${A_TIEMPO_MIN} → aTiempo (el borde cuenta como bueno)`, juzgar(resumir([A_TIEMPO_MIN])).veredicto === 'aTiempo')
comprobar(`mediana ${A_TIEMPO_MIN + 1} → tarde`, juzgar(resumir([A_TIEMPO_MIN + 1])).veredicto === 'tarde')
comprobar(`mediana ${INUTIL_MIN} → tarde (el borde todavía no es inservible)`, juzgar(resumir([INUTIL_MIN])).veredicto === 'tarde')
comprobar(`mediana ${INUTIL_MIN + 1} → inservible`, juzgar(resumir([INUTIL_MIN + 1])).veredicto === 'inservible')

console.log('\n6b. ⚠️ Decide la MEDIANA, no el peor caso')
// Un día malo no condena un programa; que la mitad de los días llegue tarde,
// sí. Si esto mirara el máximo, cualquier programa saldría inservible por una
// sola corrida mala y el aviso dejaría de significar algo.
comprobar(
  'nueve puntuales y una de 8 horas → sigue siendo aTiempo',
  juzgar(resumir([1, 2, 3, 4, 5, 6, 7, 8, 9, 480])).veredicto === 'aTiempo'
)
comprobar(
  'la mitad tarde de verdad → inservible',
  juzgar(resumir([300, 320, 340, 360, 380])).veredicto === 'inservible'
)

console.log('\n7. ⚠️⚠️ La cobertura cuenta HORAS DISTINTAS, no corridas')
// Es la comprobación central de este archivo. Con los retrasos, varias
// entradas de cron se amontonan en la misma hora y `concurrency` cancela las
// pendientes: diez corridas pueden cubrir cinco horas. Contar corridas diría
// que todo va bien.
const amontonadas = [
  '2026-10-05T09:05:00Z',
  '2026-10-05T09:31:00Z',
  '2026-10-05T09:58:00Z',
  '2026-10-05T14:02:00Z',
  '2026-10-05T14:40:00Z',
]
const c1 = horasCubiertas(amontonadas)
comprobar('5 corridas en un día', c1.dias === 1)
comprobar(`pero solo 2 horas distintas (son ${c1.mediaHorasPorDia})`, c1.mediaHorasPorDia === 2)

const repartidas = ['2026-10-05T09:05:00Z', '2026-10-05T11:31:00Z', '2026-10-05T14:02:00Z', '2026-10-05T18:40:00Z']
comprobar('4 corridas repartidas → 4 horas distintas', horasCubiertas(repartidas).mediaHorasPorDia === 4)

const dosDias = ['2026-10-05T09:00:00Z', '2026-10-05T11:00:00Z', '2026-10-06T09:00:00Z']
const c2 = horasCubiertas(dosDias)
comprobar('dos días: media de 1,5 horas al día', c2.dias === 2 && c2.mediaHorasPorDia === 1.5)
comprobar('y el peor día es 1', c2.peorDia === 1)
comprobar('desde y hasta en orden', c2.desde === '2026-10-05' && c2.hasta === '2026-10-06')
comprobar('⚠️ sin corridas → null, no una cobertura de cero', horasCubiertas([]) === null)
comprobar('fechas ilegibles se saltan sin tumbar la cuenta', horasCubiertas(['no es fecha', '2026-10-05T09:00:00Z']).dias === 1)

console.log('\n8. Los números REALES del 2026-10-06, como caso de regresión')
// Las horas crudas leídas de la API ese día para `tasas` de Swing, pedido a
// las 06:20 UTC. Si algún día esto deja de dar «inservible», o el reloj de
// GitHub se arregló o esta cuenta se rompió — y conviene saber cuál.
const tasasReal = [
  '2026-10-06T13:21:14Z',
  '2026-10-05T14:45:12Z',
  '2026-10-04T12:24:54Z',
  '2026-10-03T11:42:21Z',
  '2026-10-02T12:39:39Z',
  '2026-10-01T13:20:47Z',
  '2026-09-30T12:38:38Z',
  '2026-09-29T12:56:41Z',
  '2026-09-28T13:59:53Z',
  '2026-09-27T12:06:00Z',
]
const rTasas = resumir(tasasReal.map((c) => retrasoEnMinutos('06:20', c)))
const jTasas = juzgar(rTasas)
console.log(`       mediana real: ${rTasas.mediana} min (${(rTasas.mediana / 60).toFixed(1)} h) · ${rTasas.masDeDosHoras} de ${rTasas.n} con más de 2 h`)
comprobar('las 10 corridas reales dan INSERVIBLE', jTasas.veredicto === 'inservible')
comprobar('ninguna de las 10 llegó a tiempo', rTasas.aTiempo === 0)
comprobar('la mediana real pasa de 5 horas', rTasas.mediana > 300)

console.log(fallos === 0 ? `\n✓ todo bien (${fallos === 0 ? 'sin fallos' : ''}).\n` : `\n✗ ${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
