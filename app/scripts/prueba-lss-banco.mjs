// El adaptador del NFX-LSS al banco de pruebas de SWING, de punta a punta.
//
// PRIMO, no gemelo: cada app arma sus velas de forma distinta y su resolver
// espera campos distintos (aquí `cierre`, en intradía `vela`). Por eso el
// adaptador y su comprobación van separados de `prueba-lss.mjs`, que sí es
// idéntico en las dos porque solo prueba la lógica pura.
//
// ⚠️ ESTE ARCHIVO EXISTE POR UN ERROR REAL. Al escribir la sección del banco
// llamé a `barridoSwap` con los nombres de campo equivocados y le pasé al
// resolver las fechas en el sitio que no era. El lint NO ve ninguna de las dos
// cosas: habrían reventado DESPUÉS de descargar las velas, con los créditos
// del día ya gastados. Aquí se ejercitan las MISMAS llamadas que hace el
// banco, con datos de mentira que cuestan cero.

let mal = 0
let n = 0
const ok = (cond, que) => {
  n++
  if (!cond) {
    mal++
    console.log(`  MAL — ${que}`)
  }
}
const titulo = (t) => console.log(`\n${t}`)

// ───────────────────────────────────────────────────────────────────────────
titulo('El adaptador al banco de pruebas, de punta a punta')

// ⚠️ ESTE BLOQUE EXISTE POR UN ERROR REAL. Al escribir la sección del banco
// llamé a `barridoSwap` con los nombres de campo equivocados (`conNoche`,
// `mediaNoches`, `niveles`) cuando devuelve `{ total, mediana, media, filas }`.
// El lint NO ve eso: habría reventado DESPUÉS de descargar las velas, con los
// créditos del día ya gastados. Aquí se ejercitan las mismas llamadas con
// datos de mentira, que cuestan cero.

{
  const { senalesLSSBanco } = await import('./lib/lss-banco.mjs')
  const { medir, barridoSwap } = await import('./lib/backtest-nucleo.mjs')

  // Un mercado inventado con forma de barrido + ruptura, repetido, para dos
  // pares: uno con yen (2 decimales) y uno sin (4).
  const PARES_PRUEBA = ['EUR/USD', 'USD/JPY']
  const fechas = []
  const rangosPar = {}
  const base = { 'EUR/USD': 1.1, 'USD/JPY': 150 }

  let semilla = 7
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

  for (let i = 0; i < 300; i++) {
    const f = `2024-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
    fechas.push(f)
    rangosPar[f] = {}
    for (const par of PARES_PRUEBA) {
      const esc = par === 'USD/JPY' ? 1 : 0.007
      // Onda + ruido: produce pivotes de verdad y mechas que los perforan.
      const c = base[par] + Math.sin(i / 7) * 12 * esc + (azar() - 0.5) * 6 * esc
      rangosPar[f][par] = { h: c + azar() * 4 * esc, l: c - azar() * 4 * esc, c }
    }
  }

  const senales = senalesLSSBanco(fechas, rangosPar, {
    swingLen: 3,
    sweepWindow: 10,
    rr: 2,
    calentamiento: 20,
    pares: PARES_PRUEBA,
  })

  ok(senales.length > 5, `el adaptador saca señales del mercado inventado (${senales.length})`)
  ok(
    senales.every((s) => s.tipo === 'lss'),
    'todas llevan `tipo: lss` — sin eso chocarían con las claves de la app',
  )
  ok(
    new Set(senales.map((s) => `${s.id}@${s.vistoEl}`)).size === senales.length,
    'no hay dos señales con la misma clave',
  )
  ok(
    senales.every((s) => s.pipRiesgo >= 1 && s.pipBeneficio >= 1),
    'ninguna operación con riesgo o beneficio de cero pips',
  )
  ok(
    senales.every((s) => Math.abs(s.rr - 2) < 1e-9),
    'el ratio que llega al banco es el pedido',
  )
  ok(
    senales.every((s) => (s.lado === 'COMPRA' ? s.sl < s.precio && s.tp > s.precio : s.sl > s.precio && s.tp < s.precio)),
    'stop y objetivo en los lados correctos',
  )
  // Orden cronológico: el corte en dos mitades cuenta con ello.
  ok(
    senales.every((s, i) => i === 0 || senales[i - 1].vistoEl <= s.vistoEl),
    'salen en orden de fecha',
  )
  // El calentamiento: ninguna señal antes de la barra que se pidió.
  ok(
    senales.every((s) => fechas.indexOf(s.vistoEl) >= 20),
    'ninguna señal dentro del calentamiento',
  )

  // ── Y ahora las MISMAS llamadas que hace el banco ──────────────────────
  // La forma que espera el resolver: `fechas` en la RAÍZ (no dentro de cada
  // par) y, por par, `highs` y `lows`. La primera versión de esta prueba las
  // puso dentro de cada par y reventó con «Cannot read properties of
  // undefined» — o sea que el banco de pruebas tampoco sabía la forma. Mejor
  // descubrirlo aquí que después de gastar los créditos.
  const data = {
    fechas,
    pares: PARES_PRUEBA.map((name) => ({
      name,
      dec: name.includes('JPY') ? 2 : 4,
      highs: fechas.map((f) => rangosPar[f][name].h),
      lows: fechas.map((f) => rangosPar[f][name].l),
    })),
  }
  const { resolver } = await import('./lib/resolver.mjs')
  const { resultados } = resolver(senales, data)
  const porClave = new Map(resultados.map((r) => [r.clave, r]))

  const juzgadas = resultados.filter((r) => r.resultado === 'ganada' || r.resultado === 'perdida')
  ok(juzgadas.length > 0, `el resolver juzga señales del LSS (${juzgadas.length} de ${resultados.length})`)

  const m = medir(senales, porClave, { conSpread: true })
  ok(Number.isFinite(m.porRiesgo ?? 0), '`medir` devuelve un número, no basura')
  ok(m.total === juzgadas.length, 'el total de `medir` cuadra con lo que juzgó el resolver')

  // ⚠️ La llamada que estaba mal escrita. Se comprueban los campos EXACTOS.
  const b = barridoSwap(senales, porClave)
  ok(typeof b.total === 'number', '`barridoSwap` devuelve `total`')
  ok(typeof b.mediana === 'number' && typeof b.media === 'number', 'y `mediana` y `media`')
  ok(Array.isArray(b.filas) && b.filas.length > 0, 'y `filas` (NO `niveles`)')
  ok(
    b.filas.every((f) => typeof f.nivel === 'number' && f.medicion && typeof f.costeMedio === 'number'),
    'cada fila trae `nivel`, `medicion` y `costeMedio` (NO `etiqueta` ni `acierto` sueltos)',
  )
}

// ───────────────────────────────────────────────────────────────────────────
titulo('4. La salida por estructura contraria (v1.1)')

const { medirEstructura } = await import('./lib/lss-banco.mjs')

// ⚠️ Esta medida NO pasa por `resolver` ni por `medir`, porque la salida ocurre
// a un precio que no se sabía de antemano. Por eso hace falta comprobarla con
// un caso donde el resultado se pueda calcular a mano: si `medirEstructura`
// tuviera un signo al revés, daría un número perfectamente creíble.
{
  const fechas = []
  const rangosPar = {}
  const PAR = 'EUR/USD'
  // Mercado a mano: entrada en la 1 a 1.1000, stop en 1.0900 (100 pips de
  // riesgo), y salida en la 4 a 1.1050 → +50 pips = +0.5 veces el riesgo.
  const velas = [
    { h: 1.1010, l: 1.0990, c: 1.1000 }, // 0 — señal
    { h: 1.1030, l: 1.0995, c: 1.1020 }, // 1
    { h: 1.1040, l: 1.1000, c: 1.1030 }, // 2
    { h: 1.1060, l: 1.1010, c: 1.1050 }, // 3 — salida
  ]
  velas.forEach((v, i) => {
    const f = `2026-01-0${i + 1}`
    fechas.push(f)
    rangosPar[f] = { [PAR]: v }
  })

  const base = {
    id: `${PAR}|COMPRA|lss`,
    vistoEl: fechas[0],
    cierre: fechas[0],
    par: PAR,
    lado: 'COMPRA',
    tipo: 'lss',
    precio: 1.1,
    sl: 1.09,
    tp: 1.13,
    pipRiesgo: 100,
    pipBeneficio: 300,
    salida: fechas[3],
  }

  const m = medirEstructura([base], fechas, rangosPar)
  ok(m.total === 1, `la operación se juzga (total ${m.total})`)
  ok(m.ganadas === 1, 'sale en positivo, así que cuenta como ganada')
  ok(Math.abs(m.porRiesgo - 0.5) < 1e-9, `+50 pips sobre 100 de riesgo son +0.5 por 1R (salió ${m.porRiesgo})`)
  ok(Math.abs(m.pips - 50) < 0.5, `y 50 pips (salió ${m.pips})`)
  ok(m.diasMedios === 3, 'tardó 3 velas')
  ok(m.equilibrio === undefined, 'NO devuelve «hace falta para empatar»: aquí esa cuenta no existe')
}

{
  // El mismo mercado pero en VENTA: el signo tiene que darse la vuelta. Si
  // alguien invierte la resta, esta comprobación es la que lo canta.
  const fechas = []
  const rangosPar = {}
  const PAR = 'EUR/USD'
  const velas = [
    { h: 1.1010, l: 1.0990, c: 1.1000 },
    { h: 1.1030, l: 1.0995, c: 1.1020 },
    { h: 1.1040, l: 1.1000, c: 1.1030 },
    { h: 1.1060, l: 1.1010, c: 1.1050 },
  ]
  velas.forEach((v, i) => {
    const f = `2026-01-0${i + 1}`
    fechas.push(f)
    rangosPar[f] = { [PAR]: v }
  })
  const m = medirEstructura(
    [{ id: 'x', vistoEl: fechas[0], cierre: fechas[0], par: PAR, lado: 'VENTA', precio: 1.1, sl: 1.11, tp: 1.07, pipRiesgo: 100, pipBeneficio: 300, salida: fechas[3] }],
    fechas,
    rangosPar,
  )
  ok(m.total === 1, 'la venta también se juzga')
  ok(Math.abs(m.porRiesgo + 0.5) < 1e-9, `vendiendo, subir 50 pips es −0.5 por 1R (salió ${m.porRiesgo})`)
  ok(m.ganadas === 0, 'y NO cuenta como ganada')
}

{
  // ⚠️ EL STOP MANDA, Y SE COMPRUEBA PRIMERO. Aquí la vela 2 toca el stop y la
  // 3 habría salido en positivo. Tiene que contar como perdida de 1 riesgo.
  const fechas = []
  const rangosPar = {}
  const PAR = 'EUR/USD'
  const velas = [
    { h: 1.1010, l: 1.0990, c: 1.1000 },
    { h: 1.1030, l: 1.0995, c: 1.1020 },
    { h: 1.1040, l: 1.0880, c: 1.1030 }, // toca 1.0900
    { h: 1.1060, l: 1.1010, c: 1.1050 },
  ]
  velas.forEach((v, i) => {
    const f = `2026-01-0${i + 1}`
    fechas.push(f)
    rangosPar[f] = { [PAR]: v }
  })
  const m = medirEstructura(
    [{ id: 'x', vistoEl: fechas[0], cierre: fechas[0], par: PAR, lado: 'COMPRA', precio: 1.1, sl: 1.09, tp: 1.13, pipRiesgo: 100, pipBeneficio: 300, salida: fechas[3] }],
    fechas,
    rangosPar,
  )
  ok(m.porRiesgo === -1, `tocar el stop antes de la salida es exactamente −1 (salió ${m.porRiesgo})`)
  ok(m.ganadas === 0, 'y no es ganada')
}

{
  // ⚠️ LA MÁS IMPORTANTE: sin salida conocida NO se juzga. Contar como ganada
  // una operación que sigue abierta al final de la serie sería el autoengaño
  // clásico — y aquí es fácil que pase, porque no tocó el stop.
  const fechas = ['2026-01-01', '2026-01-02']
  const rangosPar = {
    '2026-01-01': { 'EUR/USD': { h: 1.101, l: 1.099, c: 1.1 } },
    '2026-01-02': { 'EUR/USD': { h: 1.2, l: 1.15, c: 1.18 } },
  }
  const sinSalida = { id: 'x', vistoEl: fechas[0], cierre: fechas[0], par: 'EUR/USD', lado: 'COMPRA', precio: 1.1, sl: 1.09, tp: 1.13, pipRiesgo: 100, pipBeneficio: 300, salida: null }
  const m = medirEstructura([sinSalida], fechas, rangosPar)
  ok(m.total === 0, 'una señal sin salida conocida no entra en el total')
  ok(m.sinJuzgar === 1, 'queda SIN JUZGAR, ni ganada ni perdida')
  ok(m.porRiesgo === null, 'y sin nada que medir devuelve null, no 0')
}

{
  // Los costes se descuentan con la MISMA tabla que el resto del banco, y el
  // swap castiga a las que se quedan colgadas. Si no, esta regla saldría mejor
  // que las demás solo por no pagar lo que pagan las otras.
  const fechas = []
  const rangosPar = {}
  const PAR = 'EUR/USD'
  for (let i = 0; i < 31; i++) {
    const f = `2026-01-${String(i + 1).padStart(2, '0')}`
    fechas.push(f)
    rangosPar[f] = { [PAR]: { h: 1.101 + i * 0.0001, l: 1.099, c: 1.1 + i * 0.0001 } }
  }
  const larga = { id: 'x', vistoEl: fechas[0], cierre: fechas[0], par: PAR, lado: 'COMPRA', precio: 1.1, sl: 1.09, tp: 1.13, pipRiesgo: 100, pipBeneficio: 300, salida: fechas[30] }
  const sinCostes = medirEstructura([larga], fechas, rangosPar)
  const conSpread = medirEstructura([larga], fechas, rangosPar, { conSpread: true })
  const conSwap = medirEstructura([larga], fechas, rangosPar, { conSpread: true, swapPipsNoche: 0.5 })
  ok(sinCostes.porRiesgo > conSpread.porRiesgo, 'el spread resta')
  ok(conSpread.porRiesgo > conSwap.porRiesgo, 'y el swap resta más en una operación de 30 velas')
}

// ───────────────────────────────────────────────────────────────────────────
titulo('5. LAS MISMAS LLAMADAS QUE HACE LA SECCIÓN v1.1 DEL BANCO')

// ⚠️ Éste es el bloque que justifica el archivo entero. El lint NO ve una
// opción mal escrita ni un campo que no existe: reventarían DESPUÉS de
// descargar las velas, con los créditos del día gastados. Ya pasó tres veces.
// Aquí se ejercita, sobre un mercado inventado, CADA llamada nueva que la
// sección de la v1.1 hace de verdad.
{
  const { senalesLSSBanco: gen, medirEstructura: mest } = await import('./lib/lss-banco.mjs')
  const { medir: med } = await import('./lib/backtest-nucleo.mjs')
  const { resolver: res } = await import('./lib/resolver.mjs')

  const PP = ['EUR/USD', 'USD/JPY']
  const fs = []
  const rp = {}
  const bs = { 'EUR/USD': 1.1, 'USD/JPY': 150 }
  let sem = 7
  const az = () => ((sem = (sem * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < 300; i++) {
    const f = `2024-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
    fs.push(f)
    rp[f] = {}
    for (const par of PP) {
      const esc = par === 'USD/JPY' ? 1 : 0.007
      const c = bs[par] + Math.sin(i / 7) * 12 * esc + (az() - 0.5) * 6 * esc
      rp[f][par] = { h: c + az() * 4 * esc, l: c - az() * 4 * esc, c }
    }
  }
  const data = {
    fechas: fs,
    pares: PP.map((name) => ({
      name,
      dec: name.includes('JPY') ? 2 : 4,
      esCruce: false,
      highs: fs.map((f) => rp[f][name].h),
      lows: fs.map((f) => rp[f][name].l),
    })),
  }

  const OP = { calentamiento: 40, swingLen: 4, sweepWindow: 8, pares: PP }

  // 5a — el modo informativo y la etiqueta ⚡
  const inf = gen(fs, rp, { ...OP, rr: 1, exigirSweep: false })
  const est = gen(fs, rp, { ...OP, rr: 1, exigirSweep: true })
  ok(inf.length > 0, `el modo informativo saca señales (${inf.length})`)
  ok(inf.length >= est.length, 'y nunca menos que el estricto')
  ok(inf.every((x) => typeof x.huboSweep === 'boolean'), 'todas traen `huboSweep`, que es lo que separa el ⚡')
  ok(est.every((x) => x.huboSweep === true), 'en modo estricto, TODAS tuvieron barrido reciente por definición')
  ok(inf.some((x) => !x.huboSweep), 'y en informativo hay alguna SIN barrido — si no, la comparación no diría nada')

  // 5b — el colchón de ATR, con las cinco opciones que el banco pide
  let anterior = null
  for (const b of [0, 0.15, 0.3, 0.5, 1]) {
    const ss = gen(fs, rp, { ...OP, rr: 1, exigirSweep: false, slBufferAtr: b })
    const { resultados } = res(ss, data)
    const m = med(ss, new Map(resultados.map((r) => [r.clave, r])), { conSpread: true })
    ok(Number.isFinite(m.porRiesgo ?? 0), `con colchón ${b}× el banco devuelve un número`)
    // El riesgo medio tiene que CRECER con el colchón. Si no crece, el colchón
    // no se está aplicando y la tabla compararía cinco filas idénticas.
    const riesgoMedio = ss.reduce((a, x) => a + x.pipRiesgo, 0) / (ss.length || 1)
    if (anterior !== null) ok(riesgoMedio >= anterior, `el riesgo medio no baja al ensanchar el colchón (${b}×)`)
    anterior = riesgoMedio
  }

  // 5c — la salida por estructura, tal cual la llama el banco
  const porEst = gen(fs, rp, { ...OP, exigirSweep: false, slBufferAtr: 0.15, rr: 1 })
  const me = mest(porEst, fs, rp, { conSpread: true })
  ok(me.total > 0, `la salida por estructura juzga operaciones (${me.total})`)
  ok(me.diasMedios !== null, '`diasMedios` existe — el banco lo imprime con .toFixed()')
  ok(me.equilibrio === undefined, 'y NO trae `equilibrio`: el banco imprime «n/a» a propósito')
  ok(me.sinJuzgar >= 0, '`sinJuzgar` existe — el banco lo imprime')
  // Las dos mitades, que es lo que el banco parte
  const corte = fs[Math.floor((40 + fs.length) / 2)]
  const m1 = mest(porEst.filter((x) => x.vistoEl < corte), fs, rp, { conSpread: true })
  const m2 = mest(porEst.filter((x) => x.vistoEl >= corte), fs, rp, { conSpread: true })
  ok(m1.total + m2.total === me.total, 'las dos mitades suman el total: ninguna señal se pierde ni se cuenta dos veces')
  for (const nivel of [0.25, 0.5, 1]) {
    const ms = mest(porEst, fs, rp, { conSpread: true, swapPipsNoche: nivel })
    ok(Number.isFinite(ms.porRiesgo ?? 0), `con ${nivel} de swap devuelve un número`)
  }
  // Y que el swap de verdad castigue: si no, la salida por estructura saldría
  // mejor que las demás solo por no pagar lo que pagan ellas.
  const sinSwap = mest(porEst, fs, rp, { conSpread: true })
  const conSwap = mest(porEst, fs, rp, { conSpread: true, swapPipsNoche: 1 })
  ok(conSwap.porRiesgo < sinSwap.porRiesgo, 'pagar el swap empeora el resultado, como en el resto del banco')
}

// ───────────────────────────────────────────────────────────────────────────
titulo('6. Que NINGÚN guion use los nombres de `barridoSwap` de la app hermana')

// ⚠️ `barridoSwap` DEVUELVE COSAS DISTINTAS EN CADA APP, y no por capricho de
// quien las nombró: es una diferencia sobre el MERCADO.
//
//   · Aquí, en Swing, cada vela ES un día, así que las noches salen solas de
//     `diasTardados` y el barrido devuelve `mediana` y `media`.
//   · En Intradía una vela es una hora, así que las noches hay que contarlas
//     por los cortes reales de las 22:00 UTC —depende de la hora de ENTRADA—
//     y el barrido devuelve `cruzaron` y `mediaNoches`.
//
// Copiar esa línea de la app hermana no es un descuido de escritura: es
// traerse una suposición sobre el mercado que aquí es falsa. Y no falla: el
// campo sale `undefined` y se imprime tal cual en medio de una tabla.
//
// ⚠️ ESTO YA MORDIÓ DOS VECES EL MISMO DÍA (2026-09-20), en Intradía y en dos
// archivos distintos: tumbó la tabla del M15 (112 créditos) y después la del
// banco normal (28 créditos y 37 minutos). Las dos veces murió en el último
// bloque, con los créditos del día ya gastados.
//
// 📌 Y el guardia se escribió SOLO EN INTRADÍA. Swing se quedó un día sin él,
// que es exactamente el agujero de los PRIMOS: `gemelos.mjs` vigila los
// archivos idénticos, y a los primos no los vigila nadie. Éste es el espejo:
// allí se prohíben los campos de aquí, aquí los de allí.
{
  const { readdirSync, readFileSync } = await import('fs')
  const dir = new URL('./', import.meta.url)
  // Este mismo archivo queda fuera, y no por comodidad: lleva `b.cruzaron` y
  // `b.mediaNoches` escritos DENTRO, en el propio patrón que busca. Sin
  // excluirlo se marcaría a sí mismo y la prueba fallaría siempre, que es la
  // forma más rápida de que alguien la desactive por pesada.
  const YO = 'prueba-lss-banco.mjs'
  const guiones = readdirSync(dir)
    .filter((f) => f.endsWith('.mjs') && f !== YO)
    .map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])
    .filter(([, src]) => src.includes('barridoSwap('))

  // Guarda contra una prueba que se adapta a lo que encuentra: si nadie llama
  // ya a `barridoSwap`, el bucle no entraría y esto quedaría en verde sin
  // haber mirado ni un archivo.
  ok(
    guiones.length >= 2,
    `hay guiones que llaman a \`barridoSwap\` (${guiones.length}); si no, esta prueba no comprueba nada`
  )

  for (const [nombre, src] of guiones) {
    for (const campo of ['cruzaron', 'mediaNoches']) {
      ok(
        !new RegExp(`\\bb\\.${campo}\\b`).test(src),
        `${nombre} NO usa \`b.${campo}\` — ése es el nombre de Intradía y aquí sale undefined`
      )
    }
  }
}

console.log(`\n${mal ? `✗ ${mal} de ${n} MAL` : `✓ las ${n} comprobaciones pasan`}\n`)
process.exit(mal ? 1 : 0)
