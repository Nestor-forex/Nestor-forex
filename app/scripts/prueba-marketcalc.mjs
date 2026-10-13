// Prueba del cambio de fuente en el motor de cálculo. Sin internet:
//
//     node scripts/prueba-marketcalc.mjs
//
// Lo que más importa aquí es la primera comprobación: SIN velas reales, el
// resultado tiene que ser exactamente el de antes. Si eso se rompe, el
// cambio dejó de ser aditivo y estaría alterando la app en casos donde no
// debía.

import { computarBarrido, derivarVista, usaVaraSimetrica, ATR_REVERSION } from '../src/lib/marketCalc.js'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}
const casi = (a, b, tol = 1e-9) => Math.abs(a - b) < tol

// 80 días de precios inventados pero con forma realista: una tendencia suave
// con vaivén. Hacen falta al menos 60 para el RSI y las EMAs.
const N = 80
const fechas = Array.from({ length: N }, (_, i) => `2026-01-${String(i + 1).padStart(3, '0')}`)

const rates = {}
const rangosPar = {}
fechas.forEach((d, i) => {
  const t = i / N
  rates[d] = {
    EUR: 0.92 - t * 0.02 + Math.sin(i / 3) * 0.002,
    GBP: 0.78 - t * 0.01 + Math.sin(i / 4) * 0.002,
    JPY: 150 + t * 5 + Math.sin(i / 5) * 0.8,
    CHF: 0.88 + Math.sin(i / 6) * 0.003,
    CAD: 1.36 + Math.sin(i / 7) * 0.004,
    AUD: 1.52 + Math.sin(i / 5) * 0.005,
    NZD: 1.66 + Math.sin(i / 8) * 0.005,
  }
})

// Los rangos se arman a partir de los cierres que salen del propio barrido,
// abriéndolos un 0.4% arriba y abajo: así el ATR real tiene que salir mayor
// que el de cierre a cierre, sí o sí.
const base = computarBarrido(fechas, rates)
const NOMBRES = base.pares.map((p) => p.name)
{
  // (sin usar: se dejó la reconstrucción explícita más abajo)
  
  
  fechas.forEach((d) => {
    const fila = {}
    for (const nombre of NOMBRES) {
      // Se reconstruye el cierre de ese día con la misma fórmula del motor.
      const [b, q] = nombre.split('/')
      const px = (b === 'USD' ? 1 : rates[d][b])
      const pq = (q === 'USD' ? 1 : rates[d][q])
      const c = pq / px
      fila[nombre] = { c, h: c * 1.004, l: c * 0.996 }
    }
    rangosPar[d] = fila
  })
}

console.log('\n1. Sin velas reales: idéntico a como estaba')
{
  const a = computarBarrido(fechas, rates)
  const p = a.pares[0]

  // La fórmula vieja, escrita aquí a mano para comparar contra ella.
  const closes = p.serie20
  void closes
  const cierresPar = fechas.map((d) => {
    const [b, q] = p.name.split('/')
    return (q === 'USD' ? 1 : rates[d][q]) / (b === 'USD' ? 1 : rates[d][b])
  })
  const L = cierresPar.length - 1
  let sum = 0
  for (let i = L - 13; i <= L; i++) sum += Math.abs(cierresPar[i] - cierresPar[i - 1]) / cierresPar[i - 1]
  const atrPctViejo = (sum / 14) * 100

  comprobar(casi(p.atrPct, atrPctViejo, 1e-8), `el ATR es el de siempre (${p.atrPct.toFixed(4)}%)`)
  comprobar(
    casi(p.hi20, Math.max(...cierresPar.slice(-20))),
    'los soportes salen de los cierres, como antes'
  )
}

console.log('\n2. Con velas reales: el ATR sube y los niveles se ensanchan')
{
  const viejo = computarBarrido(fechas, rates).pares[0]
  const nuevo = computarBarrido(fechas, rates, rangosPar).pares[0]

  comprobar(nuevo.atrPct > viejo.atrPct, `el ATR real es mayor (${viejo.atrPct.toFixed(3)}% → ${nuevo.atrPct.toFixed(3)}%)`)
  comprobar(nuevo.hi20 > viejo.hi20, 'la resistencia sube al usar los máximos reales')
  comprobar(nuevo.lo20 < viejo.lo20, 'el soporte baja al usar los mínimos reales')
  comprobar(nuevo.hi10 > viejo.hi10 && nuevo.lo10 < viejo.lo10, 'lo mismo en la ventana de 10')
}

console.log('\n3. El gráfico sigue dibujando cierres, no máximos')
{
  const nuevo = computarBarrido(fechas, rates, rangosPar).pares[0]
  const [b, q] = nuevo.name.split('/')
  const cierres = fechas.map((d) => (q === 'USD' ? 1 : rates[d][q]) / (b === 'USD' ? 1 : rates[d][b]))

  comprobar(nuevo.serie20.length === 20, 'son 20 puntos')
  comprobar(
    casi(nuevo.serie20.at(-1), cierres.at(-1)),
    'el último punto es el CIERRE, no el máximo del día'
  )
  comprobar(nuevo.serie20.at(-1) < nuevo.hi20, 'y por tanto queda por debajo de la resistencia')
}

console.log('\n4. Lo demás no se movió')
{
  const viejo = computarBarrido(fechas, rates)
  const nuevo = computarBarrido(fechas, rates, rangosPar)

  comprobar(casi(nuevo.pares[0].c, viejo.pares[0].c), 'el precio actual es el mismo')
  comprobar(casi(nuevo.pares[0].e20, viejo.pares[0].e20), 'la EMA20 es la misma (va sobre cierres)')
  comprobar(casi(nuevo.pares[0].rsiV, viejo.pares[0].rsiV), 'el RSI es el mismo (va sobre cierres)')
  comprobar(
    JSON.stringify(nuevo.esc) === JSON.stringify(viejo.esc),
    'la fuerza relativa de las divisas no cambia'
  )
  comprobar(nuevo.pares.length === 14, 'siguen siendo los 14 pares')
}

// La pausa de las ventas es una decisión con dinero detrás: las ventas
// perdían −0,30 por unidad de riesgo y se llevaban el 87% de lo perdido. Si
// alguien la desactivara sin querer al tocar `derivarVista`, la app volvería a
// proponer operaciones que sabemos que pierden. Esto lo impide en silencio.
console.log('\n5. Las ventas están en pausa (ver src/lib/reglas.js)')
{
  const data = computarBarrido(fechas, rates, rangosPar)

  const normal = derivarVista(data, { thr: 0 })
  comprobar(normal.ventas.length === 0, 'el barrido no propone ninguna venta')
  comprobar(
    normal.setups.every((s) => s.lado === 'COMPRA'),
    'y ningún setup es de venta'
  )
  comprobar(normal.compras.length >= 0 && Array.isArray(normal.monedas), 'lo demás del barrido sigue saliendo')

  // Pero el banco de pruebas SÍ tiene que poder verlas, o no habría forma de
  // comprobar si algún día se arreglan y la pausa se volvería permanente sin
  // que nadie lo decidiera.
  const midiendo = derivarVista(data, { thr: 0, incluirVentas: true })
  comprobar(midiendo.ventas.length > 0, `midiendo sí aparecen (${midiendo.ventas.length}): la pausa es reversible`)
  comprobar(
    midiendo.setups.some((s) => s.lado === 'VENTA'),
    'y con sus setups, para poder volver a medirlas'
  )
}

// La reversión es la idea de la app AL REVÉS: compra lo débil en vez de lo
// fuerte. Midió mejor que la app sobre 5 años, pero encenderla la convertiría
// en otro producto, y esa decisión no es de un backtest. Si se colara
// encendida, la app empezaría a proponer justo lo contrario de lo que dice
// proponer, sin que nadie lo hubiera decidido.
console.log('\n6. La reversión está apagada y no se pisa con las señales de siempre')
{
  const data = computarBarrido(fechas, rates, rangosPar)

  const normal = derivarVista(data, { thr: 0 })
  comprobar(!normal.reversiones?.length, 'la app no propone ninguna reversión')
  comprobar(
    normal.setups.every((s) => s.tipo !== 'reversion'),
    'y ningún setup es de reversión'
  )

  // Encendida sí aparecen, y encenderla no puede tocar lo que ya había: solo
  // añade una lista.
  const midiendo = derivarVista(data, { thr: 0, incluirVentas: true, incluirReversion: true })
  const conVentas = derivarVista(data, { thr: 0, incluirVentas: true })
  // ⚠️ LAS REVERSIONES YA NO VIVEN EN `setups`, y esta comprobación falló el
  // 2026-09-05 justo por eso — que es exactamente su trabajo.
  //
  // Antes iban dentro de `setups` con `tipo: 'reversion'`. Al enseñarlas en el
  // tablero hubo que sacarlas a `setupsReversion`: `TableroCompleto` pinta
  // `setups` entero, así que dejarlas ahí las habría mezclado con las señales
  // normales en la misma tabla, y son reglas OPUESTAS.
  const revs = midiendo.setupsReversion
  comprobar(revs.length > 0, `encendida sí aparecen (${revs.length}): se puede medir`)
  comprobar(
    revs.every((s) => s.tipo === 'reversion'),
    'y todas las de esa lista son de reversión'
  )
  // La lista de la app no puede haberse movido ni un elemento: encender la
  // reversión AÑADE una lista aparte, no cambia la que ya existía.
  comprobar(
    midiendo.setups.length === conVentas.setups.length &&
      midiendo.setups.every((s) => s.tipo !== 'reversion'),
    'encenderla no toca ninguna de las señales que ya daba'
  )

  // Una reversión compra cuando `dif` es muy NEGATIVA y la app compra cuando
  // es muy POSITIVA: son condiciones opuestas sobre el mismo número, así que
  // el mismo par no puede salir en las dos listas con el mismo lado.
  const yaEstaban = new Set(conVentas.setups.map((s) => `${s.name}|${s.lado}`))
  const choques = revs.filter((s) => yaEstaban.has(`${s.name}|${s.lado}`))
  comprobar(choques.length === 0, `ninguna reversión repite par y lado de otra señal (${choques.length} choques)`)

  // El stop y el objetivo van a la misma distancia a propósito: es la
  // geometría con la que se midió. Si alguien la cambiara, lo que el vigía
  // anote en la sombra dejaría de ser comparable con la medición.
  const simetricas = revs.every((s) => {
    const c = s.crudo
    return Math.abs(Math.abs(c.tp - c.precio) - Math.abs(c.precio - c.sl)) < 1e-9
  })
  comprobar(simetricas, 'sus niveles son 1:1, como la vara con la que se midió')
  comprobar(
    revs.every((s) => (s.lado === 'COMPRA' ? s.crudo.sl < s.crudo.precio : s.crudo.sl > s.crudo.precio)),
    'y el stop cae del lado que le toca'
  )
}

// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ «COMPRAR LA CAÍDA» LLEVA LA VARA CON LA QUE SE MIDIÓ (2026-10-12)
// ─────────────────────────────────────────────────────────────────────────
// EL FALLO QUE ESTO FIJA, y es el peor de su familia hasta hoy:
//
// La regla se APROBÓ midiéndola con la vara simétrica de `geometrias.mjs`
// (`simetrica`: stop y objetivo a 1,5 ATR a cada lado, R/B 1:1). El vigía la
// ANOTÓ dos meses con la geometría de la app: R/B 1:6,70 de mediana, stop a
// medio ATR del precio y objetivo a 237 pips. Dos estrategias distintas con el
// mismo nombre, y el listón de una juzgando a la otra.
//
// La causa: `mkSetup` elegía la vara con `tipo === 'reversion'`, o sea POR
// DESCARTE. «comprar la caída» no es reversión, así que se llevó la de la app
// sin que nada fallara. Es el sexto caso de esa familia en el proyecto.
//
// 📌 Y el propio repositorio tenía el diagnóstico escrito PARA ESTA REGLA, en
// el comentario de `simetrica`: «al comprar un par que viene cayendo, el
// mínimo reciente queda pegado al precio y el máximo de 20 días lejísimos, así
// que la geometría de la app infla sola el resultado». El mínimo de 10 días ES
// el de hoy por definición de la regla, así que el stop salía a medio ATR —
// que el mismo archivo mide acertando el 15 %. El real fue el 10 %.
console.log('\n7. ⚠️ «Comprar la caída» usa la vara simétrica, no la de la app')
{
  // ⚠️ MERCADO PROPIO, Y FORZADO A PROPÓSITO. Con el mercado de arriba salen
  // CERO setups de caída —comprobado— y la prueba habría pasado comparando dos
  // listas vacías, que es el agujero que este repo ya documentó dos veces. Así
  // que la última vela hunde el EUR de golpe: eso hace mínimo nuevo de 10 días
  // Y deja el cierre por debajo del suelo, que es lo que la regla pide.
  const M = 80
  const fs = Array.from({ length: M }, (_, i) => `2026-02-${String(i + 1).padStart(3, '0')}`)
  const rs = {}
  fs.forEach((d, i) => {
    rs[d] = {
      EUR: 0.92 + Math.sin(i / 6) * 0.004 - (i === M - 1 ? 0.05 : 0),
      GBP: 0.78 + Math.sin(i / 4) * 0.002,
      JPY: 150 + Math.sin(i / 5) * 0.8,
      CHF: 0.88 + Math.sin(i / 7) * 0.003,
      CAD: 1.36 + Math.sin(i / 9) * 0.004,
      AUD: 1.52 + Math.sin(i / 5) * 0.005,
      NZD: 1.66 + Math.sin(i / 8) * 0.005,
    }
  })
  const b0 = computarBarrido(fs, rs)
  const rp = {}
  fs.forEach((d) => {
    const fila = {}
    for (const nombre of b0.pares.map((x) => x.name)) {
      const [bb, qq] = nombre.split('/')
      const c = (qq === 'USD' ? 1 : rs[d][qq]) / (bb === 'USD' ? 1 : rs[d][bb])
      fila[nombre] = { c, h: c * 1.004, l: c * 0.996 }
    }
    rp[d] = fila
  })
  const datos = computarBarrido(fs, rs, rp)
  const vista = derivarVista(datos, { thr: 0, incluirCaida: true, incluirVentas: true, incluirReversion: true })

  // La guarda de siempre: sin esto, un mercado que no produjera señales dejaría
  // todo lo de abajo pasando en verde sin mirar nada.
  comprobar(vista.setupsCaida.length > 0, `el mercado forzado produce setups de caída (${vista.setupsCaida.length})`)

  const todos1a1 = vista.setupsCaida.every((s) => {
    const c = s.crudo
    return Math.abs(Math.abs(c.tp - c.precio) - Math.abs(c.precio - c.sl)) < 1e-9
  })
  comprobar(todos1a1, 'sus niveles son 1:1, la vara con la que se aprobó la regla')

  // Y el tamaño exacto, no solo la simetría: 1,5 ATR, que es lo que pide
  // `simetrica` en `geometrias.mjs`. Sin esto, un 1:1 a cualquier distancia
  // pasaría — y la distancia es justo lo que decide cuántas veces se toca.
  const atrExacto = vista.setupsCaida.every((s) => {
    const c = s.crudo
    return Math.abs(Math.abs(c.precio - c.sl) - ATR_REVERSION * c.atrAbs) < 1e-9
  })
  comprobar(atrExacto, `el riesgo es exactamente ${ATR_REVERSION} × ATR`)

  // ⚠️ LA QUE DE VERDAD MUERDE: con la geometría de la app el stop saldría del
  // mínimo de 10 días —que en esta regla es el de HOY— así que a medio ATR, y
  // el objetivo lejísimos. Si alguien devuelve el descarte, esto salta.
  const comoLaApp = vista.setupsCaida.filter((s) => {
    const c = s.crudo
    return Math.abs(Math.abs(c.precio - c.sl) - 0.5 * c.atrAbs) < 1e-6 || c.rr > 1.5
  })
  comprobar(comoLaApp.length === 0, `ninguna lleva ya la geometría de la app (${comoLaApp.length} la llevan)`)

  // El aviso de «R/B bajo» tampoco se le pone: su 1:1 es deliberado, igual que
  // en la reversión. Marcarlo en ámbar diría que está mal lo que hace a
  // propósito — el fallo que ya se cazó en navegador con las reversiones.
  comprobar(
    vista.setupsCaida.every((s) => s.rrOk === true),
    'y no se le marca el R/B como bajo: su 1:1 es deliberado'
  )

  // La frontera, por si alguien amplía la lista sin pensar: la regla de la app
  // NO lleva vara simétrica, y una regla que nadie ha inventado tampoco.
  comprobar(
    !usaVaraSimetrica('tendencia') && usaVaraSimetrica('reversion') && usaVaraSimetrica('caida'),
    'la lista de reglas con vara simétrica está enumerada, no por descarte'
  )
  comprobar(!usaVaraSimetrica('loQueVengaManana'), '⚠️ y un tipo que nadie ha inventado NACE con la geometría de la app')
}

// ── Bollinger a secas: la quinta de sombra (2026-10-13) ──────────────────
//
// Lo que esto vigila es el fallo del 2026-10-12 repetido: si la regla se
// anotara con la geometría de la APP en vez de con la vara simétrica, su
// listón preregistrado estaría juzgando a otra estrategia y no habría forma de
// notarlo — salvo mirando el R/B del historial meses después.
{
  console.log('\nBollinger, la quinta de sombra')

  comprobar(
    usaVaraSimetrica('bollinger'),
    '⚠️⚠️ `bollinger` lleva la VARA SIMÉTRICA, que es con la que se midió'
  )

  const vista = derivarVista(base, { thr: 0 })
  comprobar(Array.isArray(vista.setupsBollinger), '`derivarVista` devuelve `setupsBollinger`')

  // ⚠️ No se exige que HAYA señales: con 14 pares dentro de sus bandas, cero
  // es la respuesta correcta del mercado (pasó el 2026-10-13 en producción).
  // Lo que se exige es que las que salgan lleven la geometría buena.
  for (const s of vista.setupsBollinger) {
    comprobar(s.tipo === 'bollinger', `${s.name} lleva tipo 'bollinger'`)
    comprobar(casi(s.crudo.rr, 1, 1e-6), `${s.name} tiene R/B 1:1 (vara simétrica), no la de la app`)
    comprobar(
      casi(s.crudo.pipRiesgo, s.crudo.pipBeneficio, 1e-6),
      `${s.name}: el stop y el objetivo están a la misma distancia`
    )
  }

  // Y la que de verdad cierra el agujero: forzar un par fuera de banda y exigir
  // que la señal salga CON la vara simétrica. Sin esto, un mercado inventado
  // que no dispara ninguna señal dejaría el bloque entero pasando en verde
  // sobre una lista vacía — el fallo que ya está documentado en
  // `prueba-barrido-publicado.mjs`.
  const forzado = JSON.parse(JSON.stringify(base))
  const victima = forzado.pares[0]
  const serie = victima.serie20
  // Un precio muy por debajo de su banda inferior: la lectura de reversión
  // tiene que decir COMPRA.
  const minimo = Math.min(...serie)
  victima.c = minimo * 0.9
  serie[serie.length - 1] = victima.c
  const vf = derivarVista(forzado, { thr: 0 })
  const señal = vf.setupsBollinger.find((x) => x.name === victima.name)
  comprobar(!!señal, `un par empujado fuera de su banda SÍ da señal (${victima.name})`)
  if (señal) {
    comprobar(señal.lado === 'COMPRA', 'por debajo de la banda → COMPRA (lectura de reversión)')
    comprobar(casi(señal.crudo.rr, 1, 1e-6), '…y con R/B 1:1, la vara con la que se aprobó')
    const atr = victima.atrAbs
    comprobar(
      casi(Math.abs(señal.crudo.precio - señal.crudo.sl), ATR_REVERSION * atr, 1e-9),
      `…y el stop a ${ATR_REVERSION} × ATR exactos`
    )
  }
}

console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(fallos ? 1 : 0)
