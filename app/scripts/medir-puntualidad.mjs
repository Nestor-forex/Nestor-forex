// ¿LLEGAN A SU HORA LOS PROGRAMAS? — el guion que lo lanza.
//
// Lee la API de Actions de las DOS apps y mide, programa por programa, cuánto
// tarda GitHub en disparar cada cron. No gasta un crédito de Twelve Data y no
// escribe nada en ninguna rama.
//
// Correr con: Actions → «¿Llegan a su hora los programas?» → Run workflow.
// O a mano:   node scripts/medir-puntualidad.mjs      (necesita GH_TOKEN)
//
// ─────────────────────────────────────────────────────────────────────────
// PARA QUÉ SIRVE, Y NO ES CURIOSIDAD
// ─────────────────────────────────────────────────────────────────────────
// Un cron que llega cinco horas tarde NO FALLA: el workflow sale verde, el
// archivo se publica y nadie se entera. Este guion es lo único que convierte
// ese problema invisible en un número.
//
// Y es la vara con la que se mide si un arreglo funcionó. Cuando se ponga un
// reloj de fuera que llame a `workflow_dispatch`, la pregunta «¿ya va mejor?»
// se contesta con esto y no con una impresión.
//
// ⚠️ LA LISTA DE PROGRAMAS VA ESCRITA A MANO, igual que GEMELOS y PRIMOS, y por
// el mismo motivo: calcularla leyendo los `.yml` sería más cómodo y dejaría de
// avisar en cuanto alguien añadiera un programa nuevo — saldría solo de la
// lista y la medición seguiría «bien». Una medición que se adapta a lo que
// encuentra no mide nada.

import { horasCubiertas, juzgar, resumir, retrasoEnMinutos } from './lib/puntualidad.mjs'

// ⚠️⚠️ NO SE MANDA NINGÚN TOKEN, Y ES UNA DECISIÓN, NO UN OLVIDO.
//
// Los dos repositorios son PÚBLICOS, así que la API de Actions se lee sin
// credencial — comprobado con `curl`: HTTP 200 sin token. Entonces mandar uno
// solo añade formas de fallar, y ya falló:
//
// 📌 La primera versión cogía `process.env.GITHUB_TOKEN`, y en el entorno donde
// se programa esa variable viene puesta con un valor de relleno de 14
// caracteres que NO es un token de GitHub. Resultado: 401 en los diez
// programas, y el guion dijo «✓ ninguno está inservible» — o sea que el
// arreglo de un problema invisible era él mismo invisible al fallar.
//
// Sin token tampoco hace falta un secreto en el workflow, que es una pieza
// menos que mantener en los dos repositorios.
//
// ⚠️ El límite de la API sin credencial son 60 peticiones por hora por IP. Esto
// gasta una por programa y página (≤ 20), y corre una vez al día.
const DIAS = Number(process.env.PUNTUALIDAD_DIAS || 30)

// Qué programa pide qué hora. `cada` marca los que deberían mirar todas las
// horas: en ésos lo que importa no es el retraso sino cuántas horas distintas
// se cubren al día.
const PROGRAMAS = [
  { repo: 'Nestor-forex', wf: 'vigia.yml', nombre: 'Swing · vigía', horas: ['15:50', '16:20', '16:50'] },
  { repo: 'Nestor-forex', wf: 'reporte-diario.yml', nombre: 'Swing · reporte diario', horas: ['15:55'] },
  { repo: 'Nestor-forex', wf: 'tasas.yml', nombre: 'Swing · tasas', horas: ['06:20'] },
  { repo: 'Nestor-forex', wf: 'cot.yml', nombre: 'Swing · COT', horas: ['07:20'] },
  { repo: 'Nestor-forex', wf: 'oro.yml', nombre: 'Swing · oro', horas: ['07:50'] },
  { repo: 'Nestor-forex', wf: 'calendario.yml', nombre: 'Swing · calendario', cada: 4 },
  { repo: 'Nestor-forex-intradia', wf: 'vigia.yml', nombre: 'Intradía · vigía', cada: 1 },
  { repo: 'Nestor-forex-intradia', wf: 'publicar-barrido.yml', nombre: 'Intradía · publicador', cada: 1 },
  { repo: 'Nestor-forex-intradia', wf: 'reporte-diario.yml', nombre: 'Intradía · reporte diario', horas: ['13:00'] },
  { repo: 'Nestor-forex-intradia', wf: 'calendario.yml', nombre: 'Intradía · calendario', cada: 4 },
]

async function corridas(repo, wf) {
  const salida = []
  for (let p = 1; p <= 3; p++) {
    const url = `https://api.github.com/repos/Nestor-forex/${repo}/actions/workflows/${wf}/runs?per_page=100&page=${p}`
    const r = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'NestorForex-puntualidad' },
    })
    if (!r.ok) {
      // Un programa que todavía no existe en ese repositorio da 404, y eso no
      // es un fallo de la medición: es un dato. Se dice y se sigue.
      if (r.status === 404) return { error: `no existe en ${repo}` }
      return { error: `HTTP ${r.status}` }
    }
    const j = await r.json()
    const lote = j.workflow_runs || []
    salida.push(...lote)
    if (lote.length < 100) break
  }
  return { corridas: salida }
}

const hace = (dias) => new Date(Date.now() - dias * 864e5).toISOString()

console.log(`
══════════════════════════════════════════════════════════════════════════
  ¿LLEGAN A SU HORA LOS PROGRAMAS DE LAS DOS APPS?
  Ventana: los últimos ${DIAS} días · medido el ${new Date().toISOString().slice(0, 16)}Z
══════════════════════════════════════════════════════════════════════════

  Se mide el retraso entre la hora PEDIDA en el cron y la hora a la que
  GitHub CREÓ la corrida. La espera en cola está medida en 0 s sobre 600
  corridas, así que lo que sale aquí es entero del reloj de GitHub.
`)

const desde = hace(DIAS)
const veredictos = []

for (const p of PROGRAMAS) {
  const { corridas: cs, error } = await corridas(p.repo, p.wf)
  if (error) {
    console.log(`\n  ${p.nombre}\n    ⚠️ no se pudo mirar: ${error}`)
    veredictos.push({ nombre: p.nombre, veredicto: 'noSePudoMirar' })
    continue
  }
  const prog = cs.filter((c) => c.event === 'schedule' && c.created_at >= desde)

  console.log(`\n  ${p.nombre}`)

  if (!prog.length) {
    console.log('    ⚠️ ninguna corrida programada en la ventana — no se puede juzgar')
    veredictos.push({ nombre: p.nombre, veredicto: 'noSePudoMirar' })
    continue
  }

  if (p.cada) {
    // Los de cada hora (o cada 4): lo que decide es la COBERTURA.
    const cob = horasCubiertas(prog.map((c) => c.created_at))
    const deberia = 24 / p.cada
    console.log(`    pedido: cada ${p.cada} h → ${deberia} veces al día`)
    console.log(`    corridas en ${cob.dias} días: ${prog.length}  (${(prog.length / cob.dias).toFixed(1)} al día)`)
    console.log(`    HORAS DISTINTAS cubiertas al día: ${cob.mediaHorasPorDia.toFixed(1)} de ${deberia}` +
      `   ·  el peor día: ${cob.peorDia}`)
    const pct = (100 * cob.mediaHorasPorDia) / deberia
    const v = pct >= 85 ? 'aTiempo' : pct >= 50 ? 'tarde' : 'inservible'
    console.log(`    → ${v.toUpperCase()}  (cubre el ${pct.toFixed(0)} % de lo que debería)`)
    veredictos.push({ nombre: p.nombre, veredicto: v, detalle: `${pct.toFixed(0)} % de cobertura` })
    continue
  }

  // Los de hora fija: lo que decide es el RETRASO. Con varias entradas se
  // mide cada corrida contra la entrada MÁS CERCANA por debajo, que es la que
  // la disparó.
  const retrasos = prog.map((c) => {
    const ds = p.horas.map((h) => retrasoEnMinutos(h, c.created_at)).filter((d) => d !== null)
    return ds.length ? Math.min(...ds) : null
  })
  const res = resumir(retrasos)
  const j = juzgar(res)
  if (res) {
    console.log(`    pedido a las ${p.horas.join(', ')} UTC  ·  ${res.n} corridas`)
    console.log(`    retraso: mediana ${res.mediana} min  ·  p90 ${res.p90} min  ·  máximo ${res.max} min`)
    console.log(`    a tiempo (≤15 min): ${res.aTiempo} de ${res.n}  ·  más de 2 h: ${res.masDeDosHoras} de ${res.n}`)
  }
  console.log(`    → ${j.veredicto.toUpperCase()}  (${j.porque})`)
  veredictos.push({ nombre: p.nombre, veredicto: j.veredicto, detalle: j.porque })
}

console.log(`

══════════════════════════════════════════════════════════════════════════
  RESUMEN
══════════════════════════════════════════════════════════════════════════
`)
const cuenta = {}
for (const v of veredictos) cuenta[v.veredicto] = (cuenta[v.veredicto] || 0) + 1
for (const v of veredictos) console.log(`  ${v.veredicto.padEnd(14)} ${v.nombre}`)
console.log(`\n  ${Object.entries(cuenta).map(([k, n]) => `${k}: ${n}`).join(' · ')}`)

console.log(`
  ⚠️ «noSePudoMirar» NO es «llega puntual». Si un programa sale así, lo que
     dice es que no había corridas que medir — no que vaya bien.

  📌 Lo que este número NO contesta: si el dato publicado es correcto. Un
     barrido que llega cinco horas tarde sigue estando bien calculado y bien
     rotulado. Lo que mide esto es si llega CUANDO HACE FALTA, que es otra
     pregunta y es la que Néstor hizo.
`)

// ⚠️⚠️ SI NO SE PUDO MIRAR NI UNO, LA MEDICIÓN FALLA. No es un detalle: es el
// fallo que este guion ya cometió al estrenarse.
//
// La primera versión devolvió `noSePudoMirar` en los DIEZ programas (un token
// de relleno daba 401) y aun así imprimió «✓ ninguno está inservible» y salió
// con 0. O sea que la herramienta escrita para hacer visible un problema
// invisible era, al fallar, indistinguible de «todo va bien».
//
// Es exactamente el agujero de `veredictoBusqueda` del 2026-09-14, cuando un
// informe mío escribió «no la publican» habiendo leído CERO páginas. **Sin
// nada mirado no hay veredicto.**
const sinMirar = veredictos.filter((v) => v.veredicto === 'noSePudoMirar')
if (sinMirar.length === veredictos.length) {
  console.log(`  ✗ NO SE PUDO MIRAR NINGUNO de los ${veredictos.length} programas.`)
  console.log('    Eso NO quiere decir que lleguen puntuales: quiere decir que esta')
  console.log('    medición no vio nada. Revisar si la API respondió.\n')
  process.exit(1)
}

// Y después, el rojo por lo que de verdad se vino a medir.
//
// ⚠️ Un `noSePudoMirar` SUELTO no pone en rojo, a propósito: un programa recién
// añadido sin corridas todavía no es un fallo, y hacer fallar la medición por
// eso enseñaría a ignorarla. Lo que no puede pasar es que fallen TODOS en
// silencio, y eso es lo que acaba de cerrarse arriba.
const malos = veredictos.filter((v) => v.veredicto === 'inservible')
if (malos.length) {
  console.log(`  ✗ ${malos.length} programa(s) INSERVIBLE(S) por retraso: ${malos.map((v) => v.nombre).join(', ')}\n`)
  process.exit(1)
}
console.log(`  ✓ ninguno está inservible (${sinMirar.length} sin poder mirar).\n`)
