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
//
// ⚠️⚠️ PERO LA LISTA NO ES DE ESTE ARCHIVO: es la del reloj de fuera, y se
// importa de allí. El motivo es un error real. La primera versión tenía su
// propia copia y decía que el reporte de Swing era a las **15:55** cuando su
// cron dice **15:30**, así que midió 25 minutos MENOS de retraso del que había
// — un número bien calculado describiendo otra cosa, que es la familia de fallo
// que este proyecto lleva meses coleccionando. Dos copias de la misma lista se
// separan en silencio; una sola, comprobada contra los `.yml` por
// `prueba-reloj-externo.mjs`, no puede.
//
// El reloj de fuera es el dueño de la lista porque es el único archivo que NO
// puede importar nada: se pega entero en el panel de Cloudflare.

import { PROGRAMAS } from '../../reloj-externo/worker.js'
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

// ⚠️⚠️ SE MIDEN DOS COSAS, Y LA SEGUNDA ES LA QUE DECIDE.
//
//   · `solo schedule` — el reloj de GitHub a secas. Es el DIAGNÓSTICO: de aquí
//     salió el «cero de 162 a tiempo».
//   · `todas` — las corridas por cualquier vía, incluidas las que pulsa el
//     reloj de fuera. Es lo que de verdad le pasa al dato que Néstor abre, así
//     que es la que manda el veredicto.
//
// Sin la segunda esta herramienta NO PODRÍA ver si el arreglo funcionó: el
// reloj de fuera dispara por `workflow_dispatch`, así que mirando solo
// `schedule` el número seguiría siendo igual de malo para siempre, con la app
// ya arreglada. Es el agujero de «una medición que no mide lo que dice medir»,
// y aquí habría salido justo en el momento de comprobar el arreglo.
//
// ⚠️ `todas` incluye los lanzamientos A MANO. Mientras el reloj de fuera no
// esté puesto, ese número puede estar halagado por las pruebas de una sesión.
const esquemaDe = (p, corridasUsadas, etiqueta) => {
  if (p.mide === 'cobertura') {
    const cob = horasCubiertas(corridasUsadas.map((c) => c.created_at))
    if (!cob) return null
    const deberia = 24 / p.cadaHoras
    const pct = (100 * cob.mediaHorasPorDia) / deberia
    console.log(
      `    ${etiqueta.padEnd(16)} ${corridasUsadas.length} corridas en ${cob.dias} días · ` +
        `HORAS DISTINTAS al día ${cob.mediaHorasPorDia.toFixed(1)} de ${deberia} ` +
        `(${pct.toFixed(0)} %) · peor día ${cob.peorDia}`
    )
    return { veredicto: pct >= 85 ? 'aTiempo' : pct >= 50 ? 'tarde' : 'inservible', porque: `${pct.toFixed(0)} % de cobertura` }
  }

  // Los de hora fija: lo que decide es el RETRASO. Con varias entradas se
  // mide cada corrida contra la entrada MÁS CERCANA por debajo, que es la que
  // la disparó.
  const res = resumir(
    corridasUsadas.map((c) => {
      const ds = p.programado.map((h) => retrasoEnMinutos(h, c.created_at)).filter((d) => d !== null)
      return ds.length ? Math.min(...ds) : null
    })
  )
  if (!res) return null
  console.log(
    `    ${etiqueta.padEnd(16)} ${res.n} corridas · retraso mediana ${res.mediana} min · p90 ${res.p90} · ` +
      `máx ${res.max} · a tiempo ${res.aTiempo} de ${res.n}`
  )
  return juzgar(res)
}

for (const p of PROGRAMAS) {
  const { corridas: cs, error } = await corridas(p.repo, p.wf)
  const pedido = p.programado === 'cada' ? `cada hora al minuto ${p.minuto}` : `${p.programado.join(', ')} UTC`
  const sello = p.pulsar ? 'lo pulsa el reloj de fuera' : 'NO lo pulsa el reloj'

  console.log(`\n  ${p.nombre}   [${sello}]`)
  console.log(`    pedido: ${pedido}`)

  if (error) {
    console.log(`    ⚠️ no se pudo mirar: ${error}`)
    veredictos.push({ nombre: p.nombre, veredicto: 'noSePudoMirar', pulsa: !!p.pulsar })
    continue
  }

  // ⚠️ SOLO `schedule` Y `workflow_dispatch`, no todas las corridas. Un
  // workflow que además corre en cada push o en cada pull request —`gemelos`,
  // por ejemplo— tiene decenas de corridas que no tienen nada que ver con su
  // reloj, y meterlas daba una «mediana de 13 horas de retraso» que no
  // describía nada. Lo que sustituye al cron es el pulso de fuera, y ése llega
  // como `workflow_dispatch`.
  const enVentana = cs.filter((c) => c.created_at >= desde && (c.event === 'schedule' || c.event === 'workflow_dispatch'))
  const soloCron = enVentana.filter((c) => c.event === 'schedule')

  esquemaDe(p, soloCron, 'solo schedule:')
  const jTodas = esquemaDe(p, enVentana, 'TODAS:')

  if (!jTodas) {
    console.log('    ⚠️ ninguna corrida en la ventana — no se puede juzgar')
    veredictos.push({ nombre: p.nombre, veredicto: 'noSePudoMirar', pulsa: !!p.pulsar })
    continue
  }
  console.log(`    → ${jTodas.veredicto.toUpperCase()}  (${jTodas.porque})`)
  if (!p.pulsar) console.log(`    · a propósito: ${p.noPulsaPorque}`)
  veredictos.push({ nombre: p.nombre, veredicto: jTodas.veredicto, detalle: jTodas.porque, pulsa: !!p.pulsar })
}

console.log(`

══════════════════════════════════════════════════════════════════════════
  RESUMEN
══════════════════════════════════════════════════════════════════════════
`)
const cuenta = {}
for (const v of veredictos) cuenta[v.veredicto] = (cuenta[v.veredicto] || 0) + 1
for (const v of veredictos) console.log(`  ${v.veredicto.padEnd(14)} ${v.pulsa ? '·pulsado· ' : '          '}${v.nombre}`)
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
// ⚠️ SOLO PONEN EN ROJO LOS QUE EL RELOJ DE FUERA PULSA, y no es una rebaja.
// Los otros seis llegan tarde A PROPÓSITO: cada uno tiene escrito en
// `worker.js` por qué no se le añade un segundo disparador (el respaldo
// compararía su copia contra sí misma, el de vencimientos escribe en Firestore,
// los gemelos y la puntualidad no les afecta su propio retraso). Hacerlos rojos
// dejaría esta medición en rojo para siempre, y una alarma que siempre suena
// enseña a ignorarla — que es peor que no tenerla.
//
// ⚠️ Un `noSePudoMirar` SUELTO tampoco pone en rojo: un programa recién añadido
// sin corridas todavía no es un fallo. Lo que no puede pasar es que fallen
// TODOS en silencio, y eso es lo que acaba de cerrarse arriba.
const malos = veredictos.filter((v) => v.pulsa && v.veredicto === 'inservible')
if (malos.length) {
  console.log(`  ✗ ${malos.length} programa(s) que el reloj PULSA siguen INSERVIBLE(S): ${malos.map((v) => v.nombre).join(', ')}`)
  console.log('')
  console.log('    📌 SI EL RELOJ DE FUERA TODAVÍA NO ESTÁ PUESTO, ESTE ROJO ES LO ESPERADO:')
  console.log('       es verdad que llegan tarde, y se apaga solo en cuanto el reloj funcione.')
  console.log('       Los pasos están en `reloj-externo/README.md`.')
  console.log('')
  console.log('    Si YA estaba puesto: o su token caducó, o dejó de pulsar.')
  console.log('    Comprobar en Cloudflare → Workers → el worker → Logs.\n')
  process.exit(1)
}
const aPropositoTarde = veredictos.filter((v) => !v.pulsa && v.veredicto === 'inservible').length
console.log(
  `  ✓ ninguno de los que el reloj pulsa está inservible ` +
    `(${sinMirar.length} sin poder mirar · ${aPropositoTarde} tarde a propósito).\n`
)
