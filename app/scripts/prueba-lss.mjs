// Comprobaciones de `src/lib/lss.js` — el NFX-LSS traducido del Pine.
//
// Sin internet y sin créditos: todo con velas inventadas a mano, diseñadas
// para que cada una aísle UNA cosa.
//
// ⚠️ Lo que más importa aquí son las tres comprobaciones que vigilan los
// fallos que tenía el Pine original y que NO se portaron. Si alguien
// «simplifica» esta lógica hacia el original, tienen que ponerse rojas.

import { pivotesConocidos, senalesLSS } from '../src/lib/lss.js'

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

// Atajo: vela a partir de máximo, mínimo y cierre.
const V = (h, l, c) => ({ h, l, c })
// Una vela plana alrededor de un precio, para rellenar.
const plana = (p) => V(p + 1, p - 1, p)

// ───────────────────────────────────────────────────────────────────────────
titulo('1. Pivotes: qué es un pivote y CUÁNDO se puede usar')

{
  // Un pico claro en el índice 3, con 2 velas más bajas a cada lado.
  const velas = [plana(10), plana(10), plana(10), V(20, 18, 19), plana(10), plana(10), plana(10)]
  const { altos } = pivotesConocidos(velas, 2)

  ok(altos[3] === null, 'en la barra del pivote todavía NO se conoce')
  ok(altos[4] === null, 'una barra después tampoco')
  ok(altos[5] === 20, 'se conoce exactamente `n` barras después (retraso de confirmación)')
  ok(altos[6] === 20, 'y se sigue conociendo después')

  // ⚠️ ESTA ES LA QUE IMPIDE MIRAR EL FUTURO. Si alguien quitara el retraso,
  // `altos[3]` valdría 20 y la regla usaría en la barra 3 un dato que en la
  // barra 3 nadie tenía. Mediría de maravilla y sería imposible de operar.
  ok(
    altos.slice(0, 5).every((x) => x === null),
    'NINGUNA barra anterior a la confirmación conoce el pivote',
  )
}

{
  // Tramo plano: no hay pivote, porque no es estrictamente mayor.
  const velas = Array.from({ length: 9 }, () => plana(10))
  const { altos, bajos } = pivotesConocidos(velas, 2)
  ok(
    altos.every((x) => x === null) && bajos.every((x) => x === null),
    'un tramo plano no produce pivotes (hace falta ser estrictamente mayor)',
  )
}

{
  const velas = [plana(10), plana(10), V(20, 18, 19), plana(10)]
  ok(pivotesConocidos(velas, 5).altos.every((x) => x === null), 'sin velas suficientes no inventa pivotes')
  ok(pivotesConocidos([], 2).altos.length === 0, 'una serie vacía no revienta')
}

// ───────────────────────────────────────────────────────────────────────────
titulo('2. La señal completa: barrido + ruptura')

// Construye el caso de manual: pivote bajo, luego pivote alto, luego una vela
// que barre el mínimo y cierra dentro, y después una que rompe el máximo.
function mercadoConSenal({ separacion = 1 } = {}) {
  const velas = [
    plana(100), plana(100),
    V(101, 90, 100), // 2 — pivote BAJO en 90
    plana(100), plana(100),
    V(110, 99, 100), // 5 — pivote ALTO en 110
    plana(100), plana(100),
    V(101, 85, 100), // 8 — BARRIDO: mecha a 85, por debajo de 90, y cierra en 100
  ]
  for (let k = 0; k < separacion - 1; k++) velas.push(plana(100))
  velas.push(V(115, 99, 112)) // RUPTURA: cierra en 112, por encima de 110
  velas.push(plana(112))
  return velas
}

{
  const velas = mercadoConSenal()
  const s = senalesLSS(velas, { swingLen: 2, sweepWindow: 10, rr: 2 })

  ok(s.length === 1, `sale exactamente una señal (salieron ${s.length})`)
  const x = s[0] || {}
  ok(x.lado === 'COMPRA', 'es de COMPRA (se barrió abajo y se rompió arriba)')
  ok(x.i === 9, 'en la barra de la ruptura, no en la del barrido')
  ok(x.iSweep === 8, 'y recuerda en qué barra fue el barrido')
  ok(x.entrada === 112, 'la entrada es el cierre de la ruptura')

  // ⚠️ LA DECISIÓN DE NÉSTOR: el stop en la MECHA del barrido (85), no en el
  // pivote (90). Si alguien lo devuelve al pivote, esta se pone roja.
  ok(x.sl === 85, `el stop va en el mínimo de la vela barrida, no en el pivote (salió ${x.sl})`)
  ok(x.tp === 112 + (112 - 85) * 2, 'el objetivo está a `rr` veces el riesgo')
  ok(x.evento === 'BOS', 'sin tendencia previa contraria, el evento es BOS')
}

{
  // La misma ruptura, pero el barrido queda FUERA de la ventana.
  const velas = mercadoConSenal({ separacion: 12 })
  ok(senalesLSS(velas, { swingLen: 2, sweepWindow: 10, rr: 2 }).length === 0, 'fuera de la ventana no hay señal')
  ok(
    senalesLSS(velas, { swingLen: 2, sweepWindow: 20, rr: 2 }).length === 1,
    'y con la ventana más ancha, la misma ruptura sí da señal',
  )
}

{
  // Sin barrido ninguno: la ruptura sola no basta… salvo que se apague la exigencia.
  const velas = [
    plana(100), plana(100),
    V(101, 90, 100),
    plana(100), plana(100),
    V(110, 99, 100),
    plana(100), plana(100), plana(100),
    V(115, 99, 112),
    plana(112),
  ]
  ok(senalesLSS(velas, { swingLen: 2, sweepWindow: 10 }).length === 0, 'sin barrido no hay señal')
  ok(
    senalesLSS(velas, { swingLen: 2, sweepWindow: 10, exigirSweep: false }).length === 1,
    'con `exigirSweep: false` la ruptura sola sí señala (la fila de control)',
  )
}

// ───────────────────────────────────────────────────────────────────────────
titulo('3. En qué se aparta del Pine original, y por qué')

{
  // 📌 AQUÍ ME EQUIVOQUÉ Y LA PRUEBA LO DESTAPÓ.
  //
  // Afirmé que `ta.crossover(close, lastSwingHigh)` tenía un fallo: que al
  // aparecer un pivote más bajo que el precio, el nivel caería por debajo del
  // cierre y el cruce se dispararía solo. Escribí una comprobación para ello
  // y, al romper el código a propósito, **NO se puso roja** — o sea que no
  // medía nada.
  //
  // El motivo es estructural y ahora se comprueba de frente: un pivote en la
  // barra `p` se confirma en `p + n`, y exige que `p+1 … p+n` tengan máximos
  // MÁS BAJOS. Como `p+n` es una de ellas, su cierre queda por debajo del
  // nivel recién nacido. **El nivel nunca aparece ya rebasado.**
  const velas = []
  let precio = 100
  // Mercado al azar pero repetible, para que esto no dependa de la suerte.
  let semilla = 12345
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < 400; i++) {
    precio += (azar() - 0.5) * 20
    velas.push(V(precio + azar() * 10, precio - azar() * 10, precio))
  }

  const { altos, bajos } = pivotesConocidos(velas, 3)
  let cambios = 0
  let yaRebasado = 0
  for (let i = 1; i < velas.length; i++) {
    if (altos[i] !== null && altos[i] !== altos[i - 1]) {
      cambios++
      if (velas[i].c > altos[i]) yaRebasado++
    }
    if (bajos[i] !== null && bajos[i] !== bajos[i - 1]) {
      cambios++
      if (velas[i].c < bajos[i]) yaRebasado++
    }
  }
  ok(cambios > 20, `el mercado de prueba mueve el nivel bastantes veces (${cambios})`)
  ok(yaRebasado === 0, `un nivel recién confirmado NUNCA nace ya rebasado (${yaRebasado} casos)`)
}

{
  // Y la consecuencia práctica: congelar el nivel o compararlo al estilo del
  // Pine da EXACTAMENTE las mismas rupturas. Si alguien cambia el significado
  // del nivel, esto se pone rojo.
  const velas = []
  let precio = 100
  let semilla = 99991
  const azar = () => ((semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < 600; i++) {
    precio += (azar() - 0.5) * 20
    velas.push(V(precio + azar() * 10, precio - azar() * 10, precio))
  }

  const n = 3
  const { altos, bajos } = pivotesConocidos(velas, n)
  const congelado = []
  const estiloPine = []
  for (let i = 1; i < velas.length; i++) {
    const a = altos[i]
    const b = bajos[i]
    if (a !== null && velas[i - 1].c <= a && velas[i].c > a) congelado.push(`A${i}`)
    if (b !== null && velas[i - 1].c >= b && velas[i].c < b) congelado.push(`B${i}`)
    // Como el Pine: el cierre de ayer contra el nivel de AYER.
    const aPrev = altos[i - 1]
    const bPrev = bajos[i - 1]
    if (a !== null && aPrev !== null && velas[i - 1].c <= aPrev && velas[i].c > a) estiloPine.push(`A${i}`)
    if (b !== null && bPrev !== null && velas[i - 1].c >= bPrev && velas[i].c < b) estiloPine.push(`B${i}`)
  }
  ok(congelado.length > 10, `el mercado produce rupturas de sobra (${congelado.length})`)
  ok(
    congelado.join(',') === estiloPine.join(','),
    `congelar el nivel da las mismas rupturas que el estilo Pine (${congelado.length} vs ${estiloPine.length})`,
  )

  // ⚠️ Y AHORA SE ATA AL MÓDULO. Las dos listas de arriba se calculan aquí
  // mismo, así que por sí solas no vigilan `lss.js` — comprobarían su propia
  // aritmética aunque el módulo hiciera cualquier otra cosa. Esto exige que
  // cada señal REAL caiga en una de esas rupturas.
  const marcas = new Set(congelado)
  const reales = senalesLSS(velas, { swingLen: n, sweepWindow: 9999, exigirSweep: false })
  const huerfanas = reales.filter((x) => !marcas.has((x.lado === 'COMPRA' ? 'A' : 'B') + x.i))
  ok(reales.length > 5, `el módulo saca señales en ese mercado (${reales.length})`)
  ok(huerfanas.length === 0, `toda señal cae en una ruptura de la lista (${huerfanas.length} huérfanas)`)
}

{
  // ⚠️ ESTO SÍ ES UN FALLO DEL PINE, y está comprobado: allí la condición del
  // barrido lleva dentro `showLiquidity`, que es una casilla VISUAL. Al
  // desmarcarla el contador no se reinicia nunca y el indicador deja de dar
  // señales para siempre, sin decir por qué. Aquí la lógica no recibe ninguna
  // opción de dibujo; si alguien le añade una, tendrá que borrar esta.
  const velas = mercadoConSenal()
  const conTodo = senalesLSS(velas, { swingLen: 2, sweepWindow: 10 })
  const otraVez = senalesLSS(velas, { swingLen: 2, sweepWindow: 10, mostrarBarridos: false })
  ok(
    JSON.stringify(conTodo) === JSON.stringify(otraVez),
    'una opción de dibujo no cambia las señales (no existe tal opción)',
  )
}

{
  // ⚠️ Y ESTO TAMBIÉN: el Pine pone el stop en el pivote, que por definición
  // está POR ENCIMA del mínimo de la vela que acaba de barrerlo. Aquí va en la
  // mecha, como dice la guía de Néstor y como él decidió el 2026-09-18.
  const velas = mercadoConSenal()
  const s = senalesLSS(velas, { swingLen: 2, sweepWindow: 10 })
  for (const x of s) {
    const mecha = velas[x.iSweep]
    ok(
      x.lado === 'COMPRA' ? x.sl <= mecha.l : x.sl >= mecha.h,
      'el stop queda al otro lado de la mecha barrida, no dentro',
    )
  }
}

titulo('4. BOS contra CHoCH')

{
  // Primero rompe arriba (queda alcista) y luego rompe abajo: eso es CHoCH.
  const velas = [
    plana(100), plana(100),
    V(101, 90, 100), // pivote bajo 90
    plana(100), plana(100),
    V(110, 99, 100), // pivote alto 110
    plana(100), plana(100),
    V(101, 85, 100), // barrido abajo
    V(115, 99, 112), // ruptura arriba → alcista
    V(116, 111, 112), V(116, 111, 112),
    V(130, 111, 112), // pivote alto nuevo
    V(116, 111, 112), V(116, 111, 112),
    V(140, 111, 112), // barrido arriba (mecha sobre 130, cierra debajo)
    // ⚠️ El cierre tiene que quedar ESTRICTAMENTE por debajo del pivote bajo
    // (85). La primera versión de esta prueba cerraba justo en 85 y no rompía
    // nada — el fallo era del mercado inventado, no de la lógica.
    V(113, 78, 80), // ruptura abajo
    plana(80),
  ]
  const s = senalesLSS(velas, { swingLen: 2, sweepWindow: 10 })
  const compra = s.find((x) => x.lado === 'COMPRA')
  const venta = s.find((x) => x.lado === 'VENTA')
  ok(!!compra && compra.evento === 'BOS', 'la primera ruptura, sin tendencia previa, es BOS')
  ok(!!venta && venta.evento === 'CHoCH', 'la que gira la tendencia es CHoCH')
}

// ───────────────────────────────────────────────────────────────────────────
titulo('5. Cosas que no pueden pasar nunca')

{
  const velas = mercadoConSenal()
  for (const rr of [0.5, 1, 1.5, 2, 3]) {
    const s = senalesLSS(velas, { swingLen: 2, sweepWindow: 10, rr })
    for (const x of s) {
      const riesgo = x.lado === 'COMPRA' ? x.entrada - x.sl : x.sl - x.entrada
      const premio = x.lado === 'COMPRA' ? x.tp - x.entrada : x.entrada - x.tp
      ok(riesgo > 0, `el riesgo es positivo (rr ${rr})`)
      ok(Math.abs(premio / riesgo - rr) < 1e-9, `el objetivo respeta el ratio ${rr}`)
      ok(
        x.lado === 'COMPRA' ? x.sl < x.entrada && x.tp > x.entrada : x.sl > x.entrada && x.tp < x.entrada,
        `stop y objetivo en los lados correctos (rr ${rr})`,
      )
    }
  }
}

{
  // Series degeneradas: no debe reventar ninguna.
  ok(senalesLSS([], { swingLen: 2 }).length === 0, 'serie vacía')
  ok(senalesLSS([plana(1)], { swingLen: 2 }).length === 0, 'una sola vela')
  ok(senalesLSS(Array.from({ length: 50 }, () => plana(100)), { swingLen: 2 }).length === 0, 'mercado plano, cero señales')
}

{
  // Más sensibilidad = pivotes más frecuentes = no menos señales.
  const velas = mercadoConSenal()
  const corto = senalesLSS(velas, { swingLen: 2, sweepWindow: 10 }).length
  const largo = senalesLSS(velas, { swingLen: 8, sweepWindow: 10 }).length
  ok(largo <= corto, 'con pivotes más exigentes no salen más señales que con pivotes sensibles')
}


// ───────────────────────────────────────────────────────────────────────────
titulo('6. El adaptador al banco de pruebas, de punta a punta')

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
