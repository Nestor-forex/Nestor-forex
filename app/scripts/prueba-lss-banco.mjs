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

console.log(`\n${mal ? `✗ ${mal} de ${n} MAL` : `✓ las ${n} comprobaciones pasan`}\n`)
process.exit(mal ? 1 : 0)
