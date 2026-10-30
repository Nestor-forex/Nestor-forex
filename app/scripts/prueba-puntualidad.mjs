// Prueba de las cuentas de puntualidad. Sin internet y sin gastar cuota.
//
// Correr con: node scripts/prueba-puntualidad.mjs

import {
  A_TIEMPO_MIN,
  INUTIL_MIN,
  RACHA_MALA,
  horasCubiertas,
  juzgar,
  mejorPorDia,
  rachaMala,
  resumir,
  retrasoEnMinutos,
  retrasoMasProbable,
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

console.log('\n7b. ⚠️⚠️ SOLO SE PROMEDIAN DÍAS COMPLETOS (la falsa alarma del 2026-10-30)')
{
  // El caso REAL: el vigía de Intradía cubría 24 de 24 horas los días
  // completos, y la herramienta decía «19,0 (79 %)» porque contaba como día
  // de verdad (a) el más viejo, que la descarga de 3 páginas dejó a medias, y
  // (b) el de hoy, que por definición va a medias.
  const ahora = new Date('2026-10-30T10:30:00Z')
  const hs = (dia, cuantas) =>
    Array.from({ length: cuantas }, (_, h) => `${dia}T${String(h).padStart(2, '0')}:23:00Z`)

  const serie = [
    ...hs('2026-10-27', 2), // el más viejo, a medias por la descarga
    ...hs('2026-10-28', 24),
    ...hs('2026-10-29', 24),
    ...hs('2026-10-30', 11), // hoy, a medias por el reloj
  ]

  const malo = horasCubiertas(serie) // como antes: sin avisar de nada
  comprobar(
    `sin los avisos sale hundido (${malo.mediaHorasPorDia.toFixed(1)} de 24)`,
    malo.mediaHorasPorDia < 20,
  )

  const bueno = horasCubiertas(serie, { truncado: true, ahora })
  comprobar(
    `con los avisos sale 24 de 24 (${bueno.mediaHorasPorDia})`,
    bueno.mediaHorasPorDia === 24 && bueno.dias === 2,
  )
  comprobar('el peor día completo también es 24', bueno.peorDia === 24)
  // ⚠️ Quitar días MEJORA el número, así que los omitidos se NOMBRAN: un
  // descarte que no se dice es un descarte en el que nadie puede confiar.
  comprobar(
    'y NOMBRA los dos días que dejó fuera',
    bueno.omitidos.length === 2 &&
      bueno.omitidos.some((o) => o.includes('2026-10-30') && /hoy/.test(o)) &&
      bueno.omitidos.some((o) => o.includes('2026-10-27') && /corta/.test(o)),
  )
  // El de hoy no se tira en silencio: se devuelve aparte y medido contra las
  // horas transcurridas, para que un reloj que muera esta mañana se siga viendo.
  comprobar(
    'hoy va aparte, contra las horas transcurridas (11 de 11)',
    bueno.hoy.horas === 11 && bueno.hoy.deLasPosibles === 11,
  )

  // ⚠️⚠️ LA QUE DE VERDAD IMPORTA: quitar días NO puede tapar un fallo real.
  const roto = [
    ...hs('2026-10-27', 2),
    ...hs('2026-10-28', 6),
    ...hs('2026-10-29', 5),
    ...hs('2026-10-30', 2),
  ]
  const vr = horasCubiertas(roto, { truncado: true, ahora })
  comprobar(
    `un reloj que de verdad falla SIGUE saliendo mal (${vr.mediaHorasPorDia.toFixed(1)} de 24)`,
    vr.mediaHorasPorDia < 12,
  )

  // Sin `truncado` el día más viejo NO se tira: ahí sí es cobertura perdida.
  const sinTruncar = horasCubiertas(serie, { truncado: false, ahora })
  comprobar(
    'si la descarga NO se quedó corta, el día más viejo cuenta',
    sinTruncar.dias === 3 && sinTruncar.peorDia === 2,
  )

  // Y el caso límite: si lo único que hay es hoy, no hay nada que juzgar.
  const soloHoy = horasCubiertas(hs('2026-10-30', 11), { truncado: false, ahora })
  comprobar('solo hoy → no hay día completo que medir, y lo dice', soloHoy.mediaHorasPorDia === null)

  // ⚠️ EL TERCER ARTEFACTO: el SÁBADO. Las corridas que GitHub dispara con
  // horas de retraso el viernes por la noche caen en sábado, y aparecía un
  // «sábado con 2 horas de 24» en un programa que corre de lunes a viernes.
  const HABILES = [1, 2, 3, 4, 5]
  const conSabado = [
    ...hs('2026-10-26', 24), // lunes
    ...hs('2026-10-27', 24), // martes
    ...['2026-10-24T00:10:00Z', '2026-10-24T01:40:00Z'], // sábado: desbordamiento del viernes
    ...hs('2026-10-23', 24), // viernes
  ]
  const conS = horasCubiertas(conSabado, { truncado: false, ahora })
  comprobar(
    `contando el sábado sale hundido (${conS.mediaHorasPorDia.toFixed(1)} de 24)`,
    conS.mediaHorasPorDia < 20,
  )
  const sinS = horasCubiertas(conSabado, { truncado: false, ahora, diasQueToca: HABILES })
  comprobar(
    `sin el sábado sale 24 de 24 (${sinS.mediaHorasPorDia})`,
    sinS.mediaHorasPorDia === 24 && sinS.dias === 3,
  )
  comprobar(
    'y NOMBRA el sábado que dejó fuera',
    sinS.omitidos.some((o) => o.includes('2026-10-24') && /no le toca/.test(o)),
  )
  // ⚠️ La contraria: a un programa que SÍ corre los siete días no se le quita
  // nada. Sin esto, `diasQueToca` podría tirar días de verdad.
  const TODOS = [0, 1, 2, 3, 4, 5, 6]
  comprobar(
    'a uno que corre los 7 días no se le quita el sábado',
    horasCubiertas(conSabado, { truncado: false, ahora, diasQueToca: TODOS }).dias === 4,
  )
  comprobar(
    'y sin decirle qué días le tocan, tampoco se le quita nada',
    horasCubiertas(conSabado, { truncado: false, ahora }).dias === 4,
  )
}

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

// ─────────────────────────────────────────────────────────────────────────
console.log('\n9. ⚠️⚠️ UNA CORRIDA POR DÍA: LA MÁS TEMPRANA')
// ─────────────────────────────────────────────────────────────────────────
// El fallo que esto arregla, con los datos REALES del 22 de octubre de 2026:
// el reloj de fuera pulsó `tasas` a las 06:20:50 —clavado, pedido a las
// 06:20— y GitHub la disparó otra vez a las 11:56:55. Las dos corridas son
// del mismo día y del mismo programa.
//
// Resumiéndolas juntas, la mediana de dos valores toma el de arriba (es la
// asimetría del bloque 5), o sea la TARDE. Así que el número decía
// «inservible» con el dato llegando puntual todos los días, y no podía
// ponerse verde nunca.
{
  const dia = (iso, retraso) => ({ creadoISO: iso, retraso })

  // El caso real, tal cual.
  const reales = [dia('2026-10-22T06:20:50Z', 0), dia('2026-10-22T11:56:55Z', 336)]
  const porDia = mejorPorDia(reales)
  comprobar('las dos corridas del mismo día se quedan en UNA', porDia.length === 1)
  comprobar('y la que queda es la TEMPRANA (0 min), no la tarde', porDia[0].retraso === 0)
  comprobar(
    '⚠️ con el método viejo esto daba INSERVIBLE; ahora da aTiempo',
    juzgar(resumir(reales.map((r) => r.retraso))).veredicto === 'inservible' &&
      juzgar(resumir(porDia.map((d) => d.retraso))).veredicto === 'aTiempo'
  )

  // ⚠️ SE AGRUPA POR EL DÍA QUE LE TOCABA, NO POR EL DE LLEGADA. Una corrida
  // pedida a las 19:20 que dispara a la 01:20 del día siguiente pertenece al
  // día anterior; agrupándola por su día de llegada dejaría un día sin
  // corrida y el siguiente con dos, o sea movería el problema de sitio.
  const cruzaMedianoche = mejorPorDia([dia('2026-10-23T01:20:00Z', 360)])
  comprobar('una corrida que cruza medianoche cuenta en el día que le tocaba', cruzaMedianoche[0].dia === '2026-10-22')

  // Días distintos NO se mezclan.
  const dosDias = mejorPorDia([dia('2026-10-21T06:20:00Z', 0), dia('2026-10-22T11:56:00Z', 336)])
  comprobar('dos días distintos siguen siendo dos', dosDias.length === 2)
  comprobar('y vienen ordenados del más viejo al más nuevo', dosDias[0].dia < dosDias[1].dia)

  // Lo de siempre: nada que mirar NO es «va bien».
  comprobar('sin nada que agrupar → lista vacía', mejorPorDia([]).length === 0)
  comprobar('lo que no se entiende se descarta, no cuenta como 0', mejorPorDia([dia('ayer', 5), dia('2026-10-22T06:20:00Z', null)]).length === 0)
  comprobar('⚠️ y una lista vacía sigue dando noSePudoMirar, no aTiempo', juzgar(resumir(mejorPorDia([]).map((d) => d.retraso))).veredicto === 'noSePudoMirar')
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n10. ⚠️⚠️ LA RACHA: un reloj muerto no puede tardar 15 días en verse')
// ─────────────────────────────────────────────────────────────────────────
// Con una ventana de 30 días, si el reloj de fuera dejara de pulsar hoy, los
// días buenos que ya están dentro sostendrían la mediana durante dos
// semanas. O sea que la herramienta escrita para avisar de ese fallo
// tardaría quince días en avisar — y el fallo es plausible y silencioso,
// porque el token de GitHub que usa el reloj CADUCA.
{
  const d = (dia, retraso) => ({ dia, retraso })

  comprobar('sin días → racha 0', rachaMala([]) === 0)
  comprobar('todo puntual → racha 0', rachaMala([d('2026-10-20', 0), d('2026-10-21', 2), d('2026-10-22', 1)]) === 0)
  comprobar(
    'los dos últimos tarde → racha 2',
    rachaMala([d('2026-10-20', 0), d('2026-10-21', 300), d('2026-10-22', 310)]) === 2
  )
  comprobar(
    '⚠️ la racha se cuenta desde el final: un día malo ANTIGUO no cuenta',
    rachaMala([d('2026-10-20', 999), d('2026-10-21', 0), d('2026-10-22', 1)]) === 0
  )
  comprobar(`el borde: ${A_TIEMPO_MIN} min todavía es puntual`, rachaMala([d('2026-10-22', A_TIEMPO_MIN)]) === 0)
  comprobar(`y ${A_TIEMPO_MIN + 1} ya no`, rachaMala([d('2026-10-22', A_TIEMPO_MIN + 1)]) === 1)

  // ⚠️ LO QUE DE VERDAD IMPORTA: la racha condena aunque la ventana larga
  // esté llena de días buenos. Es el reloj recién muerto.
  const buenos = Array.from({ length: 20 }, () => 0)
  const resBueno = resumir([...buenos, 300, 300, 300])
  comprobar('23 días con 20 buenos → la mediana sola diría aTiempo', juzgar(resBueno).veredicto === 'aTiempo')
  comprobar(
    `⚠️ pero con ${RACHA_MALA} días seguidos tarde → INSERVIBLE`,
    juzgar(resBueno, RACHA_MALA).veredicto === 'inservible'
  )
  comprobar('y el motivo dice que apunta al reloj, no a la ventana', /reloj de fuera/.test(juzgar(resBueno, RACHA_MALA).porque))
  comprobar(`${RACHA_MALA - 1} días seguidos todavía NO condena`, juzgar(resBueno, RACHA_MALA - 1).veredicto === 'aTiempo')

  // ⚠️ Y SOLO CONDENA, NUNCA SALVA: una racha de 0 no puede rescatar a un
  // programa que la ventana da por malo. Equivocarse hacia «mira esto» cuesta
  // abrir un log; al revés cuesta lo que esta herramienta existe para cazar.
  comprobar('racha 0 no salva a quien la mediana condena', juzgar(resumir([300, 320, 340]), 0).veredicto === 'inservible')
  comprobar('y sin pasarle racha se comporta igual que antes', juzgar(resumir([300, 320, 340])).veredicto === 'inservible')
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n11. ⚠️⚠️ CON VARIAS ENTRADAS, CUÁL DE ELLAS DISPARÓ LA CORRIDA')
// ─────────────────────────────────────────────────────────────────────────
// El fallo que esto arregla, con el caso REAL del vigía de Swing: tiene tres
// horas pedidas (15:50, 16:20 y 16:50 UTC) y el reloj de fuera lo pulsa a las
// 15:20. `Math.min` de los tres retrasos elegía el más NEGATIVO —la entrada
// más LEJANA— y salía −90 min cuando lo honesto es −30, que es lo que se
// adelantó a la primera hora pedida.
//
// El veredicto no cambiaba (llegar antes de la hora es puntual de sobra), pero
// el número impreso describía otra cosa. Y el comentario del guion decía «la
// entrada MÁS CERCANA por debajo», que no era lo que hacía.
{
  const TRES = ['15:50', '16:20', '16:50']
  // Lo que hacía la versión vieja, para que la comparación sea explícita y no
  // una afirmación mía.
  const viejo = (hs, iso) => {
    const ds = hs.map((h) => retrasoEnMinutos(h, iso)).filter((d) => d !== null)
    return ds.length ? Math.min(...ds) : null
  }

  const pulso = '2026-10-22T15:20:21Z'
  comprobar('⚠️ el método viejo daba −90 (la entrada más LEJANA)', viejo(TRES, pulso) === -90)
  comprobar('y ahora da −30: lo que se adelantó a la PRIMERA hora pedida', retrasoMasProbable(TRES, pulso) === -30)
  comprobar(
    'el veredicto no cambia —los dos son puntuales—, solo el número',
    juzgar(resumir([viejo(TRES, pulso)])).veredicto === 'aTiempo' &&
      juzgar(resumir([retrasoMasProbable(TRES, pulso)])).veredicto === 'aTiempo'
  )

  // ⚠️ LO QUE NO SE PUEDE ROMPER: una corrida genuinamente tarde tiene que dar
  // el MISMO número que antes. Con todos los retrasos positivos, `Math.min` ya
  // era el menor, así que este arreglo no toca ni un día malo — y si lo
  // tocara, todos los números medidos hasta hoy dejarían de ser comparables.
  const tarde = '2026-10-22T20:34:00Z'
  comprobar('una corrida tarde de verdad: se atribuye a la última entrada por debajo (224 min)', retrasoMasProbable(TRES, tarde) === 224)
  comprobar('⚠️ y el número es IDÉNTICO al del método viejo', retrasoMasProbable(TRES, tarde) === viejo(TRES, tarde))

  // El caso mezclado, que es donde la diferencia SÍ cambia el veredicto: a las
  // 16:40 hay dos entradas ya pasadas (15:50 y 16:20) y una por venir (16:50).
  // La disparó la de 16:20, veinte minutos tarde. El método viejo leía −10 y
  // decía «se adelantó a las 16:50», que es atribuirla a una entrada que
  // todavía no había llegado.
  const mezcla = '2026-10-22T16:40:00Z'
  comprobar('⚠️ el método viejo daba −10: la atribuía a una entrada FUTURA', viejo(TRES, mezcla) === -10)
  comprobar('y ahora da +20: la disparó la de 16:20, veinte minutos tarde', retrasoMasProbable(TRES, mezcla) === 20)
  comprobar('aquí el veredicto SÍ cambia, y hacia el lado honesto', juzgar(resumir([retrasoMasProbable(TRES, mezcla)])).veredicto === 'tarde')

  // Con una sola entrada tiene que comportarse exactamente como antes: la
  // mayoría de los programas son así y sus números no pueden moverse.
  for (const iso of ['2026-10-22T06:20:00Z', '2026-10-22T06:35:00Z', '2026-10-22T11:56:55Z', '2026-10-22T06:18:00Z']) {
    comprobar(
      `con UNA entrada es idéntico a retrasoEnMinutos (${iso.slice(11, 16)})`,
      retrasoMasProbable(['06:20'], iso) === retrasoEnMinutos('06:20', iso)
    )
  }
  comprobar('justo a la hora → 0', retrasoMasProbable(TRES, '2026-10-22T16:20:00Z') === 0)

  // Lo de siempre: «no lo sé» NUNCA es 0. Un 0 aquí diría «llegó clavada».
  comprobar('sin entradas → null, no 0', retrasoMasProbable([], '2026-10-22T16:20:00Z') === null)
  comprobar('fecha ilegible → null', retrasoMasProbable(TRES, 'ayer por la tarde') === null)
  comprobar('entradas basura → null', retrasoMasProbable(['25:00', '6h20'], '2026-10-22T16:20:00Z') === null)
  comprobar('nada de nada → null', retrasoMasProbable(null, null) === null)
  comprobar(
    'una entrada mala entre dos buenas no tumba la cuenta',
    retrasoMasProbable(['no es hora', '16:20'], '2026-10-22T16:40:00Z') === 20
  )
}

console.log(fallos === 0 ? `\n✓ todo bien (${fallos === 0 ? 'sin fallos' : ''}).\n` : `\n✗ ${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
