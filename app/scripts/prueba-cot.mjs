// Comprobaciones del COT (posiciones institucionales). SIN INTERNET.
//
//     node scripts/prueba-cot.mjs
//
// Las filas de mentira NO están inventadas de cabeza: son las REALES que
// devolvió la sonda del 2026-09-14 para el informe del 2026-09-08, con los
// números tal cual y en TEXTO, que es como los manda Socrata. Eso importa:
// medio archivo existe para no tratar `"0"` y `""` como la misma cosa.

import {
  COLUMNAS,
  CONJUNTO,
  CONTRATOS,
  CONTRATOS_MUERTOS,
  CONTRATOS_QUE_SON_CRUCES,
  TIPO_INFORME,
  diasDelDato,
  divisasOrdenadas,
  esIndice,
  leerFilas,
  neto,
  num,
  pctDelInteres,
  prepararCot,
} from '../src/lib/cot.js'

let hechas = 0
let fallos = 0
const ok = (cond, que) => {
  hechas++
  if (cond) return true
  fallos++
  console.error(`  ✗ ${que}`)
  return false
}

// Filas REALES del informe del 2026-09-08, en texto como las manda Socrata.
const fila = (nombre, fecha, oi, fl, fc, gl, gc, cl, cs) => ({
  market_and_exchange_names: nombre,
  report_date_as_yyyy_mm_dd: `${fecha}T00:00:00.000`,
  open_interest_all: oi,
  lev_money_positions_long: fl,
  lev_money_positions_short: fc,
  asset_mgr_positions_long: gl,
  asset_mgr_positions_short: gc,
  change_in_lev_money_long: cl,
  change_in_lev_money_short: cs,
})

const REALES = [
  fila('EURO FX - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '942464', '94808', '128093', '510186', '233715', '-376', '-6778'),
  fila('JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '499635', '81760', '130858', '120000', '90000', '1200', '900'),
  fila('BRITISH POUND - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '318608', '69336', '34709', '80000', '60000', '500', '300'),
  fila('SWISS FRANC - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '153683', '9132', '22572', '20000', '30000', '100', '250'),
  fila('CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '334861', '28941', '84389', '70000', '90000', '-200', '400'),
  fila('AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '455468', '87978', '38199', '90000', '50000', '900', '100'),
  fila('NZ DOLLAR - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '125978', '11595', '28945', '15000', '25000', '50', '150'),
  fila('USD INDEX - ICE FUTURES U.S.', '2026-09-08', '57858', '15338', '9152', '8000', '6000', '300', '100'),
]

console.log('1. La fuente y el tipo de informe están fijados, no adivinados')
{
  ok(CONJUNTO === 'udgc-27he', `el conjunto debe ser udgc-27he y es ${CONJUNTO}`)
  // ⚠️ Esta es de las que más valen del archivo. `TFF_All` mezcla `FutOnly` y
  // `Combined`, y no fijarlo devuelve uno de los dos AL AZAR sin fallar. Si
  // alguien borra el filtro, esto lo canta.
  ok(TIPO_INFORME === 'FutOnly', `el informe debe ser FutOnly y es ${TIPO_INFORME}`)
  ok(COLUMNAS.includes('open_interest_all'), 'se pide el interés abierto')
  ok(COLUMNAS.includes('report_date_as_yyyy_mm_dd'), 'se pide la fecha del dato')
  ok(COLUMNAS.length < 20, `se piden pocas columnas, no las 87 (son ${COLUMNAS.length})`)
}

console.log('2. Los ocho contratos son los VIVOS, no los muertos')
{
  ok(Object.keys(CONTRATOS).length === 8, `ocho divisas, hay ${Object.keys(CONTRATOS).length}`)

  // ⚠️ LA COMPROBACIÓN QUE MÁS FALTA HACE DE TODO EL ARCHIVO.
  // Tres de los ocho nombres se escribieron mal la primera vez, leyendo la
  // lista del histórico. Un contrato muerto NO da error: devuelve su último
  // dato, de hace años, sin avisar. Esto es lo único que impide que alguien
  // «corrija» un nombre de memoria dentro de seis meses.
  for (const [muerto, porque] of Object.entries(CONTRATOS_MUERTOS)) {
    ok(
      !Object.values(CONTRATOS).includes(muerto),
      `«${muerto}» está MUERTO (${porque}) y se ha colado en CONTRATOS`,
    )
  }

  // Y los cruces tampoco: son contratos distintos y minúsculos.
  for (const cruce of CONTRATOS_QUE_SON_CRUCES) {
    ok(!Object.values(CONTRATOS).includes(cruce), `«${cruce}» es un CRUCE y se ha colado en CONTRATOS`)
  }

  ok(CONTRATOS.NZD === 'NZ DOLLAR - CHICAGO MERCANTILE EXCHANGE', `el NZD es NZ DOLLAR, y está como «${CONTRATOS.NZD}»`)
  ok(CONTRATOS.USD === 'USD INDEX - ICE FUTURES U.S.', `el USD es USD INDEX, y está como «${CONTRATOS.USD}»`)
  ok(new Set(Object.values(CONTRATOS)).size === 8, 'ningún contrato repetido')
}

console.log('3. `num` distingue el vacío del cero')
{
  // ⚠️ `Number('')` es 0, y un 0 aquí sería una afirmación («no tienen nada»)
  // en vez de un hueco. Misma trampa que en tasas.js.
  ok(num('') === null, 'el texto vacío es null, NO 0')
  ok(num('   ') === null, 'solo espacios es null, NO 0')
  ok(num(null) === null, 'null es null')
  ok(num(undefined) === null, 'undefined es null')
  ok(num('0') === 0, 'el texto «0» sí es 0')
  ok(num(0) === 0, 'el número 0 sí es 0')
  ok(num('942464') === 942464, 'un entero en texto se convierte')
  ok(num('-6778') === -6778, 'un negativo en texto se convierte')
  ok(num('hola') === null, 'un texto que no es número es null')
  ok(num(Infinity) === null, 'infinito es null')
  ok(num(NaN) === null, 'NaN es null')
}

console.log('4. `neto` y `pctDelInteres` dicen «no lo sé» en vez de inventar')
{
  ok(neto(10, 4) === 6, '10 largos menos 4 cortos son 6')
  ok(neto(4, 10) === -6, 'al revés sale negativo')
  ok(neto(null, 4) === null, 'sin largos es null, NO 0')
  ok(neto(10, null) === null, 'sin cortos es null, NO 0')
  ok(neto(5, 5) === 0, 'igualados sí es 0 de verdad')

  ok(pctDelInteres(50, 200) === 25, '50 sobre 200 es 25 %')
  ok(pctDelInteres(-50, 200) === -25, 'el negativo se conserva')
  ok(pctDelInteres(null, 200) === null, 'sin neto es null')
  ok(pctDelInteres(50, null) === null, 'sin interés abierto es null')
  // Dividir entre cero daría Infinity y se pintaría como un porcentaje enorme.
  ok(pctDelInteres(50, 0) === null, 'con interés abierto 0 es null, NO Infinity')
  ok(pctDelInteres(50, -3) === null, 'con interés abierto negativo es null')
  ok(pctDelInteres(0, 200) === 0, 'un neto de 0 sí da 0 %')
}

console.log('5. Se leen las ocho divisas con sus números reales')
{
  const d = leerFilas(REALES)
  ok(Object.keys(d).length === 8, `ocho divisas, salieron ${Object.keys(d).length}`)
  ok(d.EUR.interes === 942464, `el interés abierto del euro es 942464 y salió ${d.EUR.interes}`)
  ok(d.EUR.fondosNeto === 94808 - 128093, `el neto del euro es ${94808 - 128093} y salió ${d.EUR.fondosNeto}`)
  ok(d.EUR.fondosNeto < 0, 'los fondos están NETOS CORTOS en el euro')
  ok(d.AUD.fondosNeto > 0, 'los fondos están NETOS LARGOS en el aussie')
  ok(Math.abs(d.AUD.fondosPct - 10.93) < 0.05, `el aussie debía dar ~10,93 % y dio ${d.AUD.fondosPct?.toFixed(2)}`)
  ok(Math.abs(d.CAD.fondosPct + 16.56) < 0.05, `el loonie debía dar ~−16,56 % y dio ${d.CAD.fondosPct?.toFixed(2)}`)
  ok(d.EUR.f === '2026-09-08', `la fecha se recorta a día: salió «${d.EUR.f}»`)
  ok(d.EUR.cambioNeto === -376 - -6778, `el cambio semanal del euro es ${-376 - -6778} y salió ${d.EUR.cambioNeto}`)
  ok(d.EUR.gestorasNeto === 510186 - 233715, 'también se lee el neto de las gestoras')
}

console.log('6. Un contrato que no es de los nuestros se IGNORA')
{
  // ⚠️ Si un cruce se colara, la pantalla enseñaría el EUR/JPY creyendo que es
  // el euro. Y el cruce es minúsculo, así que el porcentaje saldría disparado.
  const conCruces = [
    ...REALES,
    fila(CONTRATOS_QUE_SON_CRUCES[0], '2026-09-08', '23252', '33', '842', '0', '0', '0', '0'),
    fila('WHEAT-SRW - CHICAGO BOARD OF TRADE', '2026-09-08', '400000', '1', '2', '0', '0', '0', '0'),
    fila('ALUM EUR UNPAID - COMMODITY EXCHANGE INC.', '2026-09-08', '8884', '1', '2', '0', '0', '0', '0'),
  ]
  const d = leerFilas(conCruces)
  ok(Object.keys(d).length === 8, `siguen siendo ocho, salieron ${Object.keys(d).length}`)
  ok(d.EUR.interes === 942464, 'el euro sigue siendo el euro, no el cruce ni el aluminio')
  ok(d.JPY.interes === 499635, 'el yen sigue siendo el yen')
}

console.log('7. Un contrato MUERTO no se lee aunque venga en la respuesta')
{
  const conMuertos = [
    ...REALES,
    // El nombre viejo con datos viejos, que es exactamente lo que pasaría al
    // preguntar por él: responde, con una fecha de hace años.
    fila('NEW ZEALAND DOLLAR - CHICAGO MERCANTILE EXCHANGE', '2019-05-07', '99999', '99999', '1', '0', '0', '0', '0'),
    fila('U.S. DOLLAR INDEX - ICE FUTURES U.S.', '2019-05-07', '99999', '99999', '1', '0', '0', '0', '0'),
  ]
  const d = leerFilas(conMuertos)
  ok(d.NZD.f === '2026-09-08', `el NZD debe quedarse con el dato de 2026, y salió ${d.NZD.f}`)
  ok(d.NZD.interes === 125978, 'el NZD conserva su interés abierto real')
  ok(d.USD.f === '2026-09-08', `el USD debe quedarse con el dato de 2026, y salió ${d.USD.f}`)
}

console.log('8. Con varias semanas se queda con la MÁS RECIENTE, venga como venga')
{
  const desordenadas = [
    fila('EURO FX - CHICAGO MERCANTILE EXCHANGE', '2026-08-25', '1', '10', '0', '0', '0', '0', '0'),
    fila('EURO FX - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '942464', '94808', '128093', '0', '0', '0', '0'),
    fila('EURO FX - CHICAGO MERCANTILE EXCHANGE', '2026-09-01', '2', '20', '0', '0', '0', '0', '0'),
  ]
  const d = leerFilas(desordenadas)
  // ⚠️ A propósito con las filas DESORDENADAS: el lector no debe confiar en
  // que `$order DESC` ponga la buena primero. Misma decisión que en tasas.js.
  ok(d.EUR.f === '2026-09-08', `debía quedarse con la del 8 y se quedó con la del ${d.EUR.f}`)
  ok(d.EUR.interes === 942464, 'y con sus números, no con los de otra semana')
}

console.log('9. Una divisa que falta una semana conserva su último dato')
{
  // Es el motivo por el que se piden varias semanas y no solo la última.
  const sinYenEstaSemana = REALES.filter((f) => !f.market_and_exchange_names.startsWith('JAPANESE')).concat([
    fila('JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE', '2026-09-01', '480000', '80000', '120000', '0', '0', '0', '0'),
  ])
  const d = leerFilas(sinYenEstaSemana)
  ok(d.JPY != null, 'el yen no desaparece de la pantalla')
  ok(d.JPY.f === '2026-09-01', `y enseña SU fecha (${d.JPY.f}), que es la vieja`)
}

console.log('10. Filas rotas: se saltan sin tumbar el resto')
{
  const rotas = [
    ...REALES,
    { market_and_exchange_names: 'EURO FX - CHICAGO MERCANTILE EXCHANGE' }, // sin fecha
    { report_date_as_yyyy_mm_dd: '2026-09-08T00:00:00.000' }, // sin contrato
    fila('EURO FX - CHICAGO MERCANTILE EXCHANGE', 'no-es-fecha', '1', '1', '1', '0', '0', '0', '0'),
    null,
    'esto no es una fila',
  ]
  const d = leerFilas(rotas)
  ok(Object.keys(d).length === 8, `siguen las ocho, salieron ${Object.keys(d).length}`)
  ok(d.EUR.interes === 942464, 'el euro conserva su fila buena')
  ok(Object.keys(leerFilas(null)).length === 0, 'con null devuelve {} sin reventar')
  ok(Object.keys(leerFilas('hola')).length === 0, 'con un texto devuelve {} sin reventar')
  ok(Object.keys(leerFilas([])).length === 0, 'con lista vacía devuelve {}')
}

console.log('11. Una fila SIN números da null, no ceros')
{
  const vacia = [fila('EURO FX - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '', '', '', '', '', '', '')]
  const d = leerFilas(vacia)
  ok(d.EUR != null, 'la fila se lee igual: tiene contrato y fecha')
  ok(d.EUR.interes === null, 'el interés abierto es null, NO 0')
  ok(d.EUR.fondosNeto === null, 'el neto es null, NO 0')
  ok(d.EUR.fondosPct === null, 'el porcentaje es null, NO 0')
  ok(d.EUR.cambioNeto === null, 'el cambio semanal es null, NO 0')
}

console.log('12. Lo que se publica')
{
  const publicado = prepararCot(REALES, new Date('2026-09-14T02:00:00Z'))
  ok(publicado.fecha === '2026-09-08', `la fecha del informe es 2026-09-08 y salió ${publicado.fecha}`)
  ok(publicado.tipoInforme === 'FutOnly', 'el tipo de informe viaja DENTRO del archivo')
  ok(Object.keys(publicado.divisas).length === 8, 'van las ocho divisas')
  ok(typeof publicado.actualizadoEl === 'string', 'lleva cuándo se bajó')

  // ⚠️ El archivo lo baja cada miembro cada vez que abre la app. Si alguien
  // mete aquí las 87 columnas o varias semanas de filas, esto lo canta.
  const kb = JSON.stringify(publicado).length / 1024
  ok(kb < 3, `el archivo publicado debe pesar menos de 3 KB y pesa ${kb.toFixed(2)} KB`)

  // Y que sobreviva al viaje por JSON, que es como lo lee el navegador.
  const ida = JSON.parse(JSON.stringify(publicado))
  ok(ida.divisas.EUR.fondosNeto === publicado.divisas.EUR.fondosNeto, 'pasa por JSON sin perder nada')

  const vacio = prepararCot([], new Date('2026-09-14T02:00:00Z'))
  ok(vacio.fecha === null, 'sin filas, la fecha es null y no una inventada')
  ok(Object.keys(vacio.divisas).length === 0, 'sin filas, no hay divisas')
}

console.log('13. El orden es por valor ABSOLUTO')
{
  const cot = prepararCot(REALES)
  const orden = divisasOrdenadas(cot)
  ok(orden.length === 8, `ocho filas, salieron ${orden.length}`)
  ok(orden[0].divisa === 'CAD', `la más posicionada es el CAD (−16,6 %) y salió ${orden[0].divisa}`)
  // ⚠️ Y ESTA es la que comprueba lo que dice comprobar: la primera tiene que
  // ser NEGATIVA. Si se ordenara por valor y no por valor absoluto, arriba
  // saldría la más comprada y las más vendidas caerían al final —justo las que
  // más interesan— y la prueba pasaría igual si solo mirara «está ordenada».
  ok(orden[0].fondosPct < 0, 'la primera es NEGATIVA: se ordena por tamaño, no por signo')
  const abs = orden.map((d) => Math.abs(d.fondosPct))
  ok(
    abs.every((v, i) => i === 0 || abs[i - 1] >= v),
    'va de mayor a menor en valor absoluto',
  )
  ok(divisasOrdenadas(null).length === 0, 'con null devuelve lista vacía')
  ok(divisasOrdenadas({}).length === 0, 'con un objeto vacío devuelve lista vacía')
}

console.log('14. Una divisa sin porcentaje no sale en la lista')
{
  const cot = prepararCot([fila('EURO FX - CHICAGO MERCANTILE EXCHANGE', '2026-09-08', '', '', '', '', '', '', '')])
  ok(divisasOrdenadas(cot).length === 0, 'una fila sin números no se pinta como si fuera 0 %')
}

console.log('15. La edad del dato')
{
  const ahora = new Date('2026-09-14T02:00:00Z')
  ok(diasDelDato('2026-09-08', ahora) === 6, `del 8 al 14 son 6 días, salió ${diasDelDato('2026-09-08', ahora)}`)
  ok(diasDelDato('2026-09-14', ahora) === 0, 'el mismo día son 0')
  // Nunca negativo: una fecha futura no debe salir como «hace −3 días».
  ok(diasDelDato('2026-09-20', ahora) === 0, 'una fecha futura da 0, no un negativo')
  ok(diasDelDato('no-es-fecha', ahora) === null, 'una fecha ilegible es null, NO 0')
  ok(diasDelDato(null, ahora) === null, 'sin fecha es null')
  ok(diasDelDato(20260908, ahora) === null, 'un número no cuela como fecha')
}

console.log('16. El índice del dólar va marcado aparte')
{
  // ⚠️ Las siete son la divisa CONTRA EL DÓLAR; el USD es el dólar contra una
  // cesta. Un «+10 % comprado» no significa lo mismo en las dos filas, así que
  // la pantalla tiene que poder distinguirlas.
  ok(esIndice('USD') === true, 'el USD es un índice')
  ok(esIndice('EUR') === false, 'el euro no')
  ok(Object.keys(CONTRATOS).filter(esIndice).length === 1, 'solo uno de los ocho es índice')
}

console.log('17. Aquí NO se decide comprar ni vender')
{
  // ⚠️ El COT está en la lista de FILTROS, no de información: cambiaría las
  // señales y no ha pasado por el banco de pruebas. Esta comprobación existe
  // para que, si algún día alguien añade un veredicto, tenga que venir aquí a
  // borrarla — o sea, a propósito y no de pasada.
  const d = leerFilas(REALES).EUR
  const prohibidas = ['lado', 'senal', 'señal', 'compra', 'venta', 'direccion', 'dirección']
  for (const k of prohibidas) {
    ok(!(k in d), `el COT no devuelve «${k}»: es información, no un filtro`)
  }
}

console.log('')
if (fallos) {
  console.error(`✗ ${fallos} de ${hechas} comprobaciones fallaron.`)
  process.exit(1)
}
console.log(`✓ todo bien (${hechas} comprobaciones).`)
