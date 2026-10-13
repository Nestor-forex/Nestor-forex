// SONDA: ¿se pueden medir pares con divisas emergentes?
//
//     node scripts/sonda-emergentes.mjs
//
// Pide, cuenta y ENSEÑA. No interpreta y no decide nada.
//
// Cuesta 1 crédito de Twelve Data por símbolo que responda (como mucho 8).
//
// ⚠️ SONDA PRIMERO, LECTOR DESPUÉS. Es el mismo camino del calendario, las
// tasas, el COT, el sentimiento y el oro: con la forma real delante se escribe
// lo que haga falta; nunca al revés. Cinco veces ha evitado escribir un lector
// a ciegas y las cinco ha encontrado algo que no se podía adivinar.

// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LO QUE QUEDA ESCRITO ANTES DE VER UN SOLO NÚMERO, A PROPÓSITO
// ─────────────────────────────────────────────────────────────────────────
//
// 1. **ESTA SONDA NO PUEDE CONTESTAR LA PREGUNTA QUE DECIDE.** De las tres
//    que hay que responder —¿hay datos?, ¿cuántos años?, ¿qué spread real?—
//    la sonda contesta las dos primeras y la tercera NO.
//
//    Twelve Data da precios, no spreads. El único spread real que tiene este
//    proyecto viene del puente de MT5, que publica 18 pares y **ninguno es
//    emergente**. Así que el spread solo lo puede contestar Néstor añadiendo
//    esos símbolos a su Observación del Mercado en MT5.
//
//    Y es justo el que decide: en Intradía está MEDIDO que el peaje se come
//    una ventaja entera (la mejor regla daba +0,027 sin costes y el peaje más
//    barato era 0,063 — 2,4 veces más). Un USD/TRY con 30 pips de spread
//    puede tener el doble de movimiento y aun así salir peor.
//
//    ⚠️ Por eso esta sonda NO dirá «sirve» ni «no sirve». Dirá qué hay.
//
// 2. **EL PRIOR NO ES BUENO, y conviene tenerlo escrito antes.** La
//    investigación del 2026-10-12 encontró que las reglas técnicas también se
//    evaporan en emergentes al corregir el sesgo de selección. Que un mercado
//    sea menos eficiente no quiere decir que se le pueda sacar algo DESPUÉS
//    de pagar lo que cuesta operarlo.
//
// 3. **Y una divisa emergente no es «una más».** Se devalúan a saltos, los
//    bancos centrales intervienen, y hay controles de capital. Un backtest de
//    cinco años sobre USD/TRY está dominado por una tendencia de una sola
//    dirección: cualquier regla que venda la lira sale bien, y eso no es una
//    ventaja, es haber vivido ese periodo.

const CANDIDATOS = [
  // Los tres que nombra el informe, contra el dólar.
  'USD/MXN',
  'USD/ZAR',
  'USD/TRY',
  // Dos más que suelen tener datos y menos salto que la lira.
  'USD/PLN',
  'USD/HUF',
  // Y uno contra el euro, por si el cruce se comporta distinto.
  'EUR/PLN',
]

const LLAVE = process.env.TWELVEDATA_KEY || ''
if (!LLAVE) {
  console.error('✗ Falta TWELVEDATA_KEY. El workflow tiene que pasarla:')
  console.error('    env:\n      TWELVEDATA_KEY: ${{ secrets.TWELVEDATA_KEY }}')
  process.exit(1)
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

console.log('\n╔════════════════════════════════════════════════════════════════════╗')
console.log('║  SONDA: ¿HAY DATOS DE PARES EMERGENTES?                           ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')
console.log('⚠️  Esta sonda NO puede contestar lo del spread, que es lo que decide.')
console.log('    Ver la cabecera del archivo. Contesta qué datos hay y cuántos.')
console.log('')

const filas = []

for (const simbolo of CANDIDATOS) {
  // El plan gratuito da 8 créditos por minuto. Con 6 símbolos de uno en uno y
  // una pausa corta no se llega al límite, pero la pausa está igual: un 429
  // aquí no se ve venir, faltarían filas y la tabla parecería decir que esos
  // símbolos no existen.
  await pausa(9000)

  const url =
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(simbolo)}` +
    `&interval=1day&outputsize=5000&apikey=${LLAVE}`

  let j
  try {
    const r = await fetch(url)
    j = await r.json()
  } catch (e) {
    filas.push({ simbolo, estado: 'no se pudo pedir', detalle: e?.message || String(e) })
    continue
  }

  // ⚠️ UN 200 NO QUIERE DECIR QUE HAYA DATOS. Twelve Data contesta 200 con un
  // `status: "error"` dentro, y ya mordió: el 2026-09-14 Myfxbook devolvió 200
  // con `{"error":true}` y el 2026-09-29 `GOLD` devolvió 200 con cinco velas
  // perfectamente válidas **de una acción de Nueva York**.
  if (j?.status === 'error' || j?.code) {
    filas.push({ simbolo, estado: 'rechazado', detalle: j?.message || `código ${j.code}` })
    continue
  }

  const velas = Array.isArray(j?.values) ? j.values : []
  if (!velas.length) {
    filas.push({ simbolo, estado: 'sin velas', detalle: JSON.stringify(j).slice(0, 120) })
    continue
  }

  // ⚠️ Y SE MIRA EL `type`, que es como se caza la trampa del oro. Un símbolo
  // que devuelve velas válidas puede ser otra cosa: `WTI` resultó ser «W&T
  // Offshore Inc.» y `BZ` una empresa china de reclutamiento.
  const meta = j?.meta || {}
  const tipo = meta.type || '(sin type)'
  const esDivisa = /currency|forex/i.test(tipo)

  // Las velas vienen de más nueva a más vieja.
  const nueva = velas[0]?.datetime
  const vieja = velas.at(-1)?.datetime
  const dias = (new Date(nueva) - new Date(vieja)) / 86400000
  const anios = dias / 365.25

  // Cuánto se mueve, para poder comparar el spread CUANDO se tenga.
  const rangos = velas
    .slice(0, 200)
    .map((v) => (Number(v.high) - Number(v.low)) / Number(v.close))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  const rangoMediano = rangos.length ? rangos[Math.floor(rangos.length / 2)] : null

  filas.push({
    simbolo,
    estado: 'responde',
    tipo,
    esDivisa,
    velas: velas.length,
    desde: vieja,
    hasta: nueva,
    anios,
    rangoMediano,
    moneda: `${meta.currency_base || '?'} → ${meta.currency_quote || '?'}`,
  })
}

// ── Lo que se encontró ────────────────────────────────────────────────────

console.log('RESPUESTA DE CADA SÍMBOLO')
console.log('')
console.log('símbolo    estado      type                       velas   años   rango diario')
console.log('─'.repeat(84))
for (const f of filas) {
  if (f.estado !== 'responde') {
    console.log(`${f.simbolo.padEnd(10)} ${f.estado.padEnd(12)} ${(f.detalle || '').slice(0, 56)}`)
    continue
  }
  const rango = f.rangoMediano === null ? '    —' : `${(f.rangoMediano * 100).toFixed(2)}%`
  console.log(
    `${f.simbolo.padEnd(10)} ${'responde'.padEnd(12)} ${f.tipo.padEnd(26)} ` +
      `${String(f.velas).padStart(5)}  ${f.anios.toFixed(1).padStart(5)}  ${rango.padStart(8)}`
  )
}
console.log('─'.repeat(84))

const sirven = filas.filter((f) => f.estado === 'responde' && f.esDivisa)
const impostores = filas.filter((f) => f.estado === 'responde' && !f.esDivisa)

console.log('')
if (impostores.length) {
  console.log('⚠️  RESPONDEN PERO NO SON DIVISAS — la trampa del oro, otra vez:')
  for (const f of impostores) console.log(`    ${f.simbolo}: type «${f.tipo}», ${f.moneda}`)
  console.log('')
}

console.log(`Símbolos que SON divisas y traen velas: ${sirven.length} de ${CANDIDATOS.length}`)
for (const f of sirven) {
  console.log(`  ${f.simbolo}: ${f.velas} velas, ${f.anios.toFixed(1)} años (${f.desde} → ${f.hasta})`)
}

// ── El veredicto, que NO dice si sirve ────────────────────────────────────

console.log('')
console.log('╔════════════════════════════════════════════════════════════════════╗')
console.log('║  QUÉ SE PUEDE DECIR CON ESTO, Y QUÉ NO                            ║')
console.log('╚════════════════════════════════════════════════════════════════════╝')
console.log('')

if (!sirven.length) {
  // ⚠️ Sin símbolos leídos NO hay veredicto. «No pude mirar» y «no existe» se
  // escriben igual y significan lo contrario — el fallo de la sonda de
  // sentimiento del 2026-09-14, que escribió «no la publican» habiendo leído
  // cero páginas.
  console.log('NO SE PUDO MIRAR: ningún símbolo emergente devolvió velas de divisa.')
  console.log('Eso NO quiere decir que no existan: quiere decir que por aquí no se vieron.')
  console.log('Mirar en el log si el plan gratuito los rechaza, que es lo que le pasa')
  console.log('a `WTI/USD` («available starting with the Grow plan»).')
} else {
  const corto = sirven.filter((f) => f.anios < 4)
  console.log(`✅ HAY DATOS en ${sirven.length} símbolo(s), y se pueden medir.`)
  if (corto.length) {
    console.log('')
    console.log(`⚠️  Pero ${corto.length} trae(n) menos de 4 años, así que NO se pueden partir en`)
    console.log('    dos mitades con sentido — y «gana en las dos mitades» es el criterio')
    console.log('    que separa un efecto real de una casualidad en todos los listones de')
    console.log('    este proyecto.')
  }
  console.log('')
  console.log('❌ LO QUE SIGUE SIN SABERSE, Y ES LO QUE DECIDE: EL SPREAD.')
  console.log('   Twelve Data da precios, no spreads. El puente de MT5 publica 18 pares')
  console.log('   y ninguno es emergente.')
  console.log('')
  console.log('   Para saberlo, Néstor tiene que añadir esos símbolos a la Observación')
  console.log('   del Mercado de su MT5 y dejar que el puente los publique unos días.')
  console.log('   Hasta entonces, medir una regla sobre estos pares daría un número')
  console.log('   sin el peaje que de verdad lo decide — y este proyecto ya tiene')
  console.log('   medido que ese peaje se come ventajas enteras.')
  console.log('')
  console.log('   El rango diario de arriba es la mitad que SÍ se puede comparar:')
  console.log('   si un par se mueve un 1,5 % al día, un spread de 30 pips pesa muy')
  console.log('   distinto que en EUR/USD moviéndose un 0,5 %.')
}
console.log('')
