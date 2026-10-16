// Prueba de la tarjeta «lo que señalaron las reglas en pruebas». Sin internet:
//
//     node scripts/prueba-senales-sombra.mjs
//
// Las formas en que esta pantalla puede MENTIR sin que falle nada, y que esto
// vigila:
//
//   1. **enseñar una señal vieja como si fuera de hoy**. El vigía corre de
//      lunes a viernes y el reloj de GitHub ya se comió días enteros, así que
//      lo último anotado puede ser de hace tres días. Por eso se agrupa por el
//      día de la VELA y se enseña la fecha, y por eso la palabra «hoy» no
//      aparece en ningún texto;
//   2. **esconder una regla que no ha señalado**, que es cómo se fabrica un
//      espejismo: en pantalla quedaría solo lo que parece estar pasando algo;
//   3. **meter una señal sin tasa publicada en uno de los dos montones del
//      carry**, o sea leer un hueco de datos como un hecho sobre el mercado;
//   4. **perder el aviso de que esto NO es lo que la app propone**, que es lo
//      único que separa esta tarjeta de una lista de recomendaciones.

import { readFileSync } from 'node:fs'
import { REGLAS_SOMBRA, diaDe, hayAlgoQueEnsenar, senalesDelUltimoDia } from '../src/lib/senalesSombra.js'
import { carryDeSenal } from '../src/lib/carrySenal.js'
import { esVaraVieja } from '../src/lib/historialCalc.js'
import { monedasDe } from '../src/lib/pairs.js'
import { UMBRAL_NEUTRO } from '../src/lib/tasas.js'

let fallos = 0
const ok = (bien, que) => {
  console.log(`  ${bien ? 'OK  ' : 'MAL '} ${que}`)
  if (!bien) fallos++
}

const senal = (x) => ({ id: `${x.par}|${x.lado}|${x.tipo}`, vistoEl: `${x.cierre}T15:20:00.000Z`, sombra: true, ...x })

console.log('\n1. La lista de reglas va A MANO, y «tendencia» NO está')
{
  ok(Object.isFrozen(REGLAS_SOMBRA), 'está congelada: no se le añade nada en caliente')
  for (const r of ['reversion', 'caida', 'lss', 'bollinger']) {
    ok(REGLAS_SOMBRA.includes(r), `incluye \`${r}\``)
  }
  // ⚠️ Una señal de sombra con tipo 'tendencia' es una VENTA PAUSADA — una
  // señal de la propia app que se anota pero no se propone. Puesta entre los
  // experimentos se leería como una regla nueva que la app nunca tuvo.
  ok(!REGLAS_SOMBRA.includes('tendencia'), '⚠️ NO incluye `tendencia`: eso son ventas pausadas, no un experimento')
}

console.log('\n2. El día sale de la VELA, no de cuándo corrió el vigía')
{
  // El vigía puede correr a las 20:30 UTC juzgando la vela del día anterior.
  // Agrupar por `vistoEl` pondría esa señal en el día equivocado.
  ok(diaDe({ cierre: '2026-10-09', vistoEl: '2026-10-10T02:00:00.000Z' }) === '2026-10-09', 'manda `cierre` sobre `vistoEl`')
  ok(diaDe({ vistoEl: '2026-10-10T02:00:00.000Z' }) === '2026-10-10', 'sin `cierre` se cae a `vistoEl` (líneas viejas)')
  ok(diaDe({}) === null, 'sin ninguna de las dos devuelve null')
  ok(diaDe({ cierre: 'basura' }) === null, 'con basura dentro devuelve null, no una fecha inventada')
}

console.log('\n3. Cada regla trae las señales de SU último día')
{
  const lista = [
    senal({ par: 'EUR/USD', lado: 'COMPRA', tipo: 'reversion', cierre: '2026-10-09' }),
    senal({ par: 'GBP/JPY', lado: 'VENTA', tipo: 'reversion', cierre: '2026-10-13' }),
    senal({ par: 'AUD/USD', lado: 'COMPRA', tipo: 'reversion', cierre: '2026-10-13' }),
    senal({ par: 'USD/CAD', lado: 'VENTA', tipo: 'caida', cierre: '2026-10-06' }),
  ]
  const g = senalesDelUltimoDia(lista)
  const rev = g.find((x) => x.tipo === 'reversion')
  const cai = g.find((x) => x.tipo === 'caida')

  ok(g.length === REGLAS_SOMBRA.length, 'devuelve SIEMPRE las cuatro reglas')
  ok(rev.fecha === '2026-10-13' && rev.senales.length === 2, 'la reversión trae sus 2 del 13, no la del 9')
  // ⚠️ Cada regla tiene SU fecha. Si una señaló el 13 y otra el 6, enseñar las
  // dos bajo el mismo día sería falso — y es justo lo que pasaría agrupando
  // por «el último día de todas».
  ok(cai.fecha === '2026-10-06' && cai.senales.length === 1, '⚠️ «comprar la caída» conserva SU día (el 6), no el de la reversión')
  ok(rev.senales[0].par === 'AUD/USD', 'ordenadas por par: dos cargas dan la misma lista')
}

console.log('\n4. ⚠️ Una regla sin señales SIGUE SALIENDO')
{
  const g = senalesDelUltimoDia([senal({ par: 'EUR/USD', lado: 'COMPRA', tipo: 'reversion', cierre: '2026-10-13' })])
  const boll = g.find((x) => x.tipo === 'bollinger')
  ok(!!boll, 'Bollinger aparece aunque no haya anotado nada')
  ok(boll.senales.length === 0 && boll.fecha === null, '…vacía y SIN fecha inventada')
  // Esconderla dejaría en pantalla solo lo que parece estar pasando algo, que
  // es cómo se fabrica un espejismo. Misma decisión que los grupos con n = 0
  // de `Diagnostico`.
  ok(g.filter((x) => !x.senales.length).length === 3, 'las otras tres también salen, vacías')
}

console.log('\n5. Sin NADA anotado, la tarjeta entera no se pinta')
{
  ok(hayAlgoQueEnsenar(senalesDelUltimoDia([])) === false, 'con el historial vacío no hay nada que enseñar')
  ok(hayAlgoQueEnsenar(senalesDelUltimoDia(null)) === false, 'con `null` tampoco revienta')
  ok(
    hayAlgoQueEnsenar(senalesDelUltimoDia([senal({ par: 'EUR/USD', lado: 'COMPRA', tipo: 'lss', cierre: '2026-10-13' })])) === true,
    'con una sola señal sí'
  )
  // Las señales de la app NO son de la sombra: si solo hubiera de ésas, la
  // tarjeta no debe aparecer.
  const soloApp = [{ par: 'EUR/USD', lado: 'COMPRA', cierre: '2026-10-13', vistoEl: '2026-10-13T15:20:00.000Z' }]
  ok(hayAlgoQueEnsenar(senalesDelUltimoDia(soloApp)) === false, '⚠️ con solo señales de la app (sin `tipo`) no se pinta')
}

console.log('\n6. ⚠️⚠️ El carry: sin tasa NO se inventa un montón')
{
  const tasas = { USD: { v: 3.875, f: '2026-10-01' }, JPY: { v: 1.0, f: '2026-10-01' } }
  const comprarUSDJPY = { par: 'USD/JPY', lado: 'COMPRA' }
  const venderUSDJPY = { par: 'USD/JPY', lado: 'VENTA' }

  // USD paga 3,875 y JPY 1,0: comprar USD/JPY deja largo del que más paga.
  ok(carryDeSenal(comprarUSDJPY, tasas, monedasDe) === 'aFavor', 'comprar el par de tasa alta → a favor')
  ok(carryDeSenal(venderUSDJPY, tasas, monedasDe) === 'enContra', 'venderlo → en contra')

  // ⚠️ `null` y NUNCA 'neutro' ni 'enContra'. Un hueco de datos metido en un
  // montón se leería como un hecho sobre el mercado — el cubo `sinDato` del
  // banco existe por lo mismo.
  ok(carryDeSenal({ par: 'EUR/CHF', lado: 'COMPRA' }, tasas, monedasDe) === null, '⚠️ sin tasas para ese par → null, no un montón')
  ok(carryDeSenal(comprarUSDJPY, null, monedasDe) === null, 'sin tasas en absoluto → null')
  ok(carryDeSenal({ lado: 'COMPRA' }, tasas, monedasDe) === null, 'sin par → null')
  ok(carryDeSenal({ par: 'USD/JPY' }, tasas, monedasDe) === null, 'sin lado → null')

  // La banda neutra se REUSA de `tasas.js`, no se reinventa aquí.
  const casi = { USD: { v: 2.0, f: 'x' }, JPY: { v: 2.0 - UMBRAL_NEUTRO / 2, f: 'x' } }
  ok(carryDeSenal(comprarUSDJPY, casi, monedasDe) === 'neutro', `dentro de la banda (${UMBRAL_NEUTRO}) → neutro`)
  const justo = { USD: { v: 2.0, f: 'x' }, JPY: { v: 2.0 - UMBRAL_NEUTRO * 2, f: 'x' } }
  ok(carryDeSenal(comprarUSDJPY, justo, monedasDe) === 'aFavor', 'fuera de la banda sí se moja')
}

console.log('\n7. ⚠️ El aviso de que esto NO se propone, y que no dice «hoy»')
{
  const es = JSON.parse(
    JSON.stringify(
      Object.fromEntries(
        Object.entries((await import('../src/lib/i18n/textos/es.js')).default.sombraSenales).filter(
          ([, v]) => typeof v === 'string'
        )
      )
    )
  )
  ok(/NO ES LO QUE LA APP PROPONE/.test(es.aviso), 'el aviso dice que esto no es lo que la app propone')
  ok(/EN OBSERVACI[ÓO]N/i.test(es.aviso), '…y que están en observación')
  ok(/no dice cu[áa]l operar/i.test(es.paraQue), 'el «para qué» dice expresamente que no recomienda ninguna')

  // ⚠️ «Hoy» es la palabra que esta pantalla no puede decir: el vigía corre de
  // lunes a viernes y ya perdió días enteros, así que lo último anotado puede
  // ser de la semana pasada. La fecha de cada grupo lo dice sin afirmar nada.
  const todo = Object.values(es).join(' ')
  ok(!/\bhoy\b/i.test(todo), '⚠️ la palabra «hoy» NO aparece en ningún texto de la tarjeta')

  // Y lo que el pie SÍ tiene que seguir diciendo, escrito en `sonda-tasas.mjs`
  // antes de ver ningún dato: la diferencia de tasas no es el swap.
  ok(/NO es el swap/i.test(es.pieCarry), 'el pie sigue diciendo que la diferencia de tasas NO es el swap')
}

console.log('\n8. ⚠️ La pantalla NO da veredictos ni consejos')
{
  const fuente = readFileSync(new URL('../src/components/SenalesSombra.jsx', import.meta.url), 'utf8')
  // Misma idea que en `cot.js` y en `Diagnostico`: añadir un consejo obliga a
  // venir a borrar esta comprobación a mano, o sea a propósito.
  const prohibido = /\b(recomend|sugerimos|te sugiere|deber[ií]as operar|la mejor se[ñn]al)\b/i
  ok(!prohibido.test(fuente), 'no hay ninguna palabra de consejo en el componente')

  // Y el aviso va ANTES de cualquier número: aquí lo caro no es leer mal un
  // dato, es creer que esta lista es lo que la app propone.
  const iAviso = fuente.indexOf("sombraSenales.aviso")
  const iGrupos = fuente.indexOf('grupos.map')
  ok(iAviso > 0 && iGrupos > 0 && iAviso < iGrupos, '⚠️ el aviso se pinta ANTES que las señales')
}

console.log('\n8b. ⚠️⚠️ El aviso de «geometría vieja» marca SOLO «comprar la caída»')
{
  // 📌 SALIÓ MIRANDO LA CAPTURA. La primera versión marcaba cualquier regla de
  // vara simétrica a la que le faltara el campo `vara`, y eso ponía el aviso
  // sobre las REVERSIONES —que siempre se anotaron bien, con R/B 1:1 real en
  // el historial—. El campo se empezó a escribir para todas el 2026-10-13, así
  // que su ausencia no distingue nada por sí sola: la única regla que estuvo
  // mal anotada fue la caída.
  ok(esVaraVieja({ tipo: 'caida' }) === true, 'una caída sin `vara` SÍ se marca')
  ok(esVaraVieja({ tipo: 'caida', vara: 'simetrica' }) === false, '…y con la vara buena NO')
  ok(esVaraVieja({ tipo: 'reversion' }) === false, '⚠️ una reversión vieja NO se marca: siempre estuvo bien')
  ok(esVaraVieja({ tipo: 'lss' }) === false, 'la ruptura tampoco')
  ok(esVaraVieja({ tipo: 'bollinger' }) === false, 'Bollinger tampoco: nació con el campo puesto')
  ok(esVaraVieja(null) === false && esVaraVieja(undefined) === false, 'sin señal no revienta')

  // Y la pantalla usa ESA función, no una copia: si marcara distinto del
  // resumen, la misma señal saldría de dos maneras en la misma pestaña.
  const comp = readFileSync(new URL('../src/components/SenalesSombra.jsx', import.meta.url), 'utf8')
  ok(/import \{ esVaraVieja \} from '\.\.\/lib\/historialCalc'/.test(comp), 'la pantalla IMPORTA la condición en vez de repetirla')
}

console.log('\n9. ⚠️ Bollinger está en la lista del Historial, con su etiqueta')
{
  // El agujero que esto cierra: al poner Bollinger en la sombra (2026-10-13)
  // se le dio su cubo de porcentajes y NADIE lo añadió a `unir()`. No fallaba
  // nada —caía en `filasOtras`, el cajón escrito para que no desapareciera—
  // pero salía SIN ETIQUETA, o sea indistinguible de una señal de la app.
  const hist = readFileSync(new URL('../src/lib/useHistorial.js', import.meta.url), 'utf8')
  ok(/filasBollinger/.test(hist), '`unir()` tiene su propia lista de Bollinger')
  ok(/CONOCIDOS = new Set\(\[[^\]]*'bollinger'/.test(hist), '…y está entre los tipos CONOCIDOS, para no caer en el cajón')

  const tab = readFileSync(new URL('../src/components/HistorialTab.jsx', import.meta.url), 'utf8')
  ok(/f\.tipo === 'bollinger' && <Etiqueta>/.test(tab), 'cada fila de Bollinger lleva su etiqueta en la lista')
  // Y la tarjeta nueva está montada: sin esto se habría escrito entera sin que
  // nadie la viera, que es el fallo de `Correlacion` del 2026-10-07.
  ok(/<SenalesSombra senales=\{senales\}/.test(tab), 'la tarjeta está montada y recibe las señales')
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'Las señales de la sombra se enseñan sin afirmar de más.')
process.exit(fallos ? 1 : 0)
