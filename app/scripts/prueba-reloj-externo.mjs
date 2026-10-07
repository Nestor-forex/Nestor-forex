// Comprueba que la lista de programas del RELOJ DE FUERA coincide con los
// crones de verdad de los dos repositorios.
//
//     node scripts/prueba-reloj-externo.mjs /ruta/al/otro/repo
//
// o, si la otra app está clonada al lado de esta:
//
//     node scripts/prueba-reloj-externo.mjs
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ QUÉ VIGILA, Y POR QUÉ HACE FALTA QUE ALGUIEN LO VIGILE
// ─────────────────────────────────────────────────────────────────────────
// El reloj de fuera llama a `POST /actions/workflows/{archivo}/dispatches`. Si
// el archivo se renombra, GitHub devuelve **404** y el Worker deja de pulsar
// ese programa. Nada se rompe, nada sale en rojo en los repositorios, y el
// único síntoma es que ese dato empieza a llegar tarde otra vez — justo el
// problema invisible que el reloj venía a arreglar.
//
// Y la lista también lleva LA HORA de cada programa, que es con la que la
// herramienta de puntualidad mide el retraso. Una hora mal escrita no falla:
// devuelve un retraso creíble y equivocado.
//
// 📌 ESTO NO ES HIPOTÉTICO. Al estrenar esta prueba cazó dos errores míos ya
// escritos: el reporte diario de Swing figuraba a las **15:55** cuando su cron
// dice **15:30** (o sea que la medición publicada entendía 25 minutos menos de
// retraso del real), y los dos calendarios figuraban al minuto 10 cuando su
// cron es `0 */4 * * *`. Los números estaban bien calculados y describían otra
// cosa: la familia de fallo de siempre.
//
// ⚠️ NO LEE YAML DE VERDAD. Saca las líneas `- cron: '...'` como TEXTO, que es
// lo único que hace falta y no mete ninguna librería. Si algún día un workflow
// escribe sus crones de otra forma, esta prueba lo dirá no encontrando ninguno
// — que es fallar, no pasar en verde.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PROGRAMAS, toca } from '../../reloj-externo/worker.js'

let fallos = 0
const comprobar = (que, cond) => {
  console.log(`${cond ? '  OK  ' : '  MAL '} ${que}`)
  if (!cond) fallos++
}

// ────────────────────────────────────────────────────────────────────────
// Dónde están los dos repositorios
// ────────────────────────────────────────────────────────────────────────
// Misma disciplina que `prueba-gemelos.mjs`: si se pasa una ruta a mano se usa
// ESA y ninguna otra, y si no vale se falla. Una prueba que se busca la vida
// cuando le das un dato equivocado es peor que una que falla.
const esteRepo = fileURLToPath(new URL('../../', import.meta.url))
const conRaya = (p) => (p.endsWith('/') ? p : p + '/')
const esRepo = (p) => existsSync(p + '.github/workflows')

const aMano = process.argv[2] || process.env.OTRO_REPO
let otroRepo

if (aMano) {
  // Se acepta tanto la raíz del repositorio como su carpeta `app/`, porque
  // `gemelos.yml` pasa la segunda.
  const c = conRaya(aMano)
  otroRepo = esRepo(c) ? c : esRepo(conRaya(c + '..')) ? conRaya(c + '..') : null
  if (!otroRepo) {
    console.error(`En "${c}" no hay ningún repositorio: falta .github/workflows`)
    process.exit(2)
  }
} else {
  const CANDIDATOS = ['../../../nestor-forex-intradia/', '../../../Nestor-forex/', '../../../nestor-forex/'].map((c) =>
    fileURLToPath(new URL(c, import.meta.url))
  )
  otroRepo = CANDIDATOS.find((c) => esRepo(c) && c !== esteRepo)
  if (!otroRepo) {
    console.error('No encontré el otro repositorio. Pásale la ruta:')
    console.error('    node scripts/prueba-reloj-externo.mjs /ruta/al/otro/repo')
    console.error('\nBuscado en:')
    for (const c of CANDIDATOS) console.error('  ·', c)
    // ⚠️ Salida 2 y NO 0. «No se pudo mirar» no es «pasa»: es la mitad de la
    // comprobación que no se hizo, y dejarla en verde sería el agujero de
    // `veredictoBusqueda`.
    process.exit(2)
  }
}

// Cuál es cuál. Se decide por `src/lib/identidad.js`, que es el único archivo
// del proyecto cuyo trabajo es decir qué app es esto — no por el nombre de la
// carpeta, que se renombra.
//
// 📌 El primer intento buscaba la palabra «intradía» dentro de `vigia.yml`, y
// SE EQUIVOCÓ DE APP: el vigía de Swing nombra a su hermana en un comentario.
// La prueba dio 16 fallos y ninguno era de la lista — es el recordatorio de
// siempre: antes de creerse que algo está mal, comprobar que la herramienta
// está mirando lo que dice mirar.
const idDe = (raiz) => {
  const t = readFileSync(raiz + 'app/src/lib/identidad.js', 'utf8')
  const m = /export const APP = '([a-z]+)'/.exec(t)
  return m && m[1]
}
const NOMBRE_REPO = { swing: 'Nestor-forex', intradia: 'Nestor-forex-intradia' }
const RAICES = {}
for (const raiz of [esteRepo, otroRepo]) {
  const repo = NOMBRE_REPO[idDe(raiz)]
  if (!repo) {
    console.error(`No pude saber qué app es "${raiz}": falta el APP de app/src/lib/identidad.js`)
    process.exit(2)
  }
  RAICES[repo] = raiz
}

console.log(`\nRepositorios:`)
for (const [nombre, raiz] of Object.entries(RAICES)) console.log(`  ${nombre.padEnd(24)} ${raiz}`)

comprobar('se encontraron los DOS repositorios, no dos veces el mismo', Object.keys(RAICES).length === 2)
if (Object.keys(RAICES).length !== 2) {
  console.log('\n✗ sin los dos repositorios no hay nada que comparar.\n')
  process.exit(2)
}

// ────────────────────────────────────────────────────────────────────────
// Leer los crones de verdad
// ────────────────────────────────────────────────────────────────────────
// Devuelve, por archivo, la lista de { hhmm, dias } que pide su cron, más si
// tiene `workflow_dispatch` (sin eso, el pulso del reloj daría 404).
function cronesDe(raiz, archivo) {
  const texto = readFileSync(`${raiz}.github/workflows/${archivo}`, 'utf8')
  const entradas = []
  for (const linea of texto.split('\n')) {
    const m = /^\s*-\s*cron:\s*['"]([^'"]+)['"]/.exec(linea)
    if (!m) continue
    const [min, hor, , , dow] = m[1].trim().split(/\s+/)
    entradas.push({ min, hor, dow })
  }
  return { entradas, tieneBoton: /^\s*workflow_dispatch:/m.test(texto) }
}

// El campo de día de la semana de un cron, como lista de números.
function diasDe(dow) {
  if (dow === '*') return [0, 1, 2, 3, 4, 5, 6]
  const salida = new Set()
  for (const trozo of dow.split(',')) {
    const r = /^(\d)-(\d)$/.exec(trozo)
    if (r) {
      for (let d = Number(r[1]); d <= Number(r[2]); d++) salida.add(d)
    } else if (/^\d$/.test(trozo)) {
      salida.add(Number(trozo))
    } else {
      return null // algo que esta prueba no entiende: mejor fallar que suponer
    }
  }
  return [...salida].sort()
}

const dosCifras = (n) => String(n).padStart(2, '0')

console.log('\n1. Cada programa de la lista existe, y tiene botón de lanzar a mano')
for (const p of PROGRAMAS) {
  const raiz = RAICES[p.repo]
  const ruta = `${raiz}.github/workflows/${p.wf}`
  const existe = existsSync(ruta)
  comprobar(`${p.repo} · ${p.wf} existe`, existe)
  if (!existe) continue
  // ⚠️ Sin `workflow_dispatch` el `dispatches` del reloj devuelve 404 y el
  // programa deja de pulsarse EN SILENCIO.
  comprobar(`${p.repo} · ${p.wf} tiene workflow_dispatch`, cronesDe(raiz, p.wf).tieneBoton)
}

console.log('\n2. ⚠️ Las horas escritas en la lista son las del cron de verdad')
for (const p of PROGRAMAS) {
  const raiz = RAICES[p.repo]
  if (!existsSync(`${raiz}.github/workflows/${p.wf}`)) continue
  const { entradas } = cronesDe(raiz, p.wf)
  comprobar(`${p.repo} · ${p.wf} tiene al menos un cron`, entradas.length > 0)
  if (!entradas.length) continue

  if (p.programado === 'cada') {
    // Los de cada hora: o 24 entradas (una por hora) o un `*` en la hora.
    const porHora = new Set()
    let hayComodin = false
    for (const e of entradas) {
      if (e.hor.includes('*')) hayComodin = true
      else if (/^\d{1,2}$/.test(e.hor)) porHora.add(Number(e.hor))
    }
    comprobar(
      `${p.wf} de ${p.repo}: la lista dice «cada hora» y el cron cubre las 24 (${porHora.size} entradas${hayComodin ? ' + comodín' : ''})`,
      hayComodin || porHora.size === 24
    )
    const minutos = new Set(entradas.map((e) => e.min))
    comprobar(
      `${p.wf} de ${p.repo}: la lista dice minuto ${p.minuto} y el cron también`,
      minutos.size === 1 && Number([...minutos][0]) === p.minuto
    )
  } else {
    // Hora fija: cada 'HH:MM' de la lista tiene que salir del cron, y cada
    // entrada del cron tiene que estar en la lista. Las DOS direcciones: si
    // solo se comprobara una, un cron nuevo no se enteraría nadie.
    const delCron = new Set()
    for (const e of entradas) {
      if (e.hor.includes('*')) {
        const paso = Number((/\*\/(\d+)/.exec(e.hor) || [])[1] || 1)
        for (let h = 0; h < 24; h += paso) delCron.add(`${dosCifras(h)}:${dosCifras(Number(e.min))}`)
      } else {
        delCron.add(`${dosCifras(Number(e.hor))}:${dosCifras(Number(e.min))}`)
      }
    }
    const deLaLista = new Set(p.programado)
    const faltan = [...delCron].filter((x) => !deLaLista.has(x))
    const sobran = [...deLaLista].filter((x) => !delCron.has(x))
    comprobar(
      `${p.wf} de ${p.repo}: la lista dice [${p.programado.join(' ')}] y el cron [${[...delCron].sort().join(' ')}]` +
        (faltan.length ? ` ← FALTAN ${faltan.join(' ')}` : '') +
        (sobran.length ? ` ← SOBRAN ${sobran.join(' ')}` : ''),
      !faltan.length && !sobran.length
    )
  }

  // Los días de la semana, que deciden si se pulsa un sábado.
  const dias = diasDe(entradas[0].dow)
  comprobar(
    `${p.wf} de ${p.repo}: días [${p.dias.join('')}] y el cron [${(dias || []).join('')}]`,
    dias !== null && JSON.stringify(dias) === JSON.stringify([...p.dias].sort())
  )
}

console.log('\n3. ⚠️⚠️ Ningún programa PROGRAMADO de los dos repositorios se queda fuera de la lista')
// Es la comprobación que impide el olvido. Un workflow nuevo con `schedule:`
// que nadie añada a la lista no sale en la medición de puntualidad y no lo
// pulsa el reloj — y eso parecería una decisión en vez de un descuido. Para
// quedarse fuera del pulso hay que escribirlo en la lista con su
// `noPulsaPorque`, que es la misma disciplina que GEMELOS y PRIMOS.
let mirados = 0
for (const [repo, raiz] of Object.entries(RAICES)) {
  for (const archivo of readdirSync(raiz + '.github/workflows').filter((f) => f.endsWith('.yml'))) {
    const { entradas } = cronesDe(raiz, archivo)
    if (!entradas.length) continue // solo a mano: no hay reloj que medir
    mirados++
    comprobar(`${repo} · ${archivo} está en la lista`, PROGRAMAS.some((p) => p.repo === repo && p.wf === archivo))
  }
}
// ⚠️ La guarda de siempre: sin esto, un cambio que hiciera que no se leyera
// ningún cron dejaría este bloque en verde sin haber mirado nada.
comprobar(`se miraron programas de verdad (${mirados})`, mirados >= 15)

console.log('\n4. La lista es coherente consigo misma')
const claves = PROGRAMAS.map((p) => `${p.repo}/${p.wf}`)
comprobar('ningún programa repetido', new Set(claves).size === claves.length)
comprobar(
  'todos apuntan a uno de los dos repositorios',
  PROGRAMAS.every((p) => p.repo === 'Nestor-forex' || p.repo === 'Nestor-forex-intradia')
)
comprobar(
  'los que NO se pulsan llevan el motivo escrito',
  PROGRAMAS.filter((p) => !p.pulsar).every((p) => typeof p.noPulsaPorque === 'string' && p.noPulsaPorque.length > 40)
)
comprobar(
  'lo que se pulsa es un subconjunto de lo que pide el cron',
  PROGRAMAS.every(
    (p) => !p.pulsar || p.pulsar === 'cada' || p.pulsar.every((h) => p.programado !== 'cada' && p.programado.includes(h))
  )
)
comprobar(
  'los de cobertura dicen cada cuántas horas',
  PROGRAMAS.filter((p) => p.mide === 'cobertura').every((p) => p.cadaHoras >= 1 && 24 % p.cadaHoras === 0)
)
comprobar('hay al menos un programa que no se pulsa (la lista está completa, no es la de pulsos)', PROGRAMAS.some((p) => !p.pulsar))

console.log('\n5. ⚠️ `toca` respeta los días, y el vigía NO se pulsa en fin de semana')
// Un sábado no hay mercado: pulsar el vigía gastaría créditos para nada y
// anotaría una corrida sin señales.
const nombres = (lista) => lista.map((p) => `${p.repo}/${p.wf}`)
const sabado = toca(PROGRAMAS, 20, 6) // 6 = sábado
comprobar('sábado a las 20: no hay ni un vigía', !nombres(sabado).some((n) => n.endsWith('vigia.yml')))
comprobar('sábado a las 20: no hay publicador', !nombres(sabado).some((n) => n.endsWith('publicar-barrido.yml')))
comprobar('sábado a las 20: SÍ hay los dos calendarios', nombres(sabado).filter((n) => n.endsWith('calendario.yml')).length === 2)

const miercoles = toca(PROGRAMAS, 15, 3)
comprobar('miércoles a las 15: el vigía de Swing sí', nombres(miercoles).includes('Nestor-forex/vigia.yml'))
comprobar('miércoles a las 15: el reporte de Swing también (15:30)', nombres(miercoles).includes('Nestor-forex/reporte-diario.yml'))
comprobar(
  'miércoles a las 15: los dos de cada hora de Intradía',
  nombres(miercoles).includes('Nestor-forex-intradia/vigia.yml') &&
    nombres(miercoles).includes('Nestor-forex-intradia/publicar-barrido.yml')
)

console.log('\n5b. ⚠️ El vigía de Swing se pulsa UNA VEZ al día, no tres')
// Tiene tres entradas de cron porque el reloj de GitHub falla. Pulsarlo tres
// veces no haría daño (`yaCorrioHoy` lo para) pero sería ruido, y el día que
// ese guardián se rompiera serían 42 créditos en vez de 14.
const vigiaSwing = [15, 16].flatMap((h) => nombres(toca(PROGRAMAS, h, 3))).filter((n) => n === 'Nestor-forex/vigia.yml')
comprobar(`entre las 15 y las 16 se pulsa una sola vez (son ${vigiaSwing.length})`, vigiaSwing.length === 1)

console.log('\n6. ⚠️ Ninguna hora del día se queda con más pulsos de los que debería')
// Nada más que una cordura sobre el tamaño: si un día alguien pone todo a
// `'cada'`, esto lo canta. El plan gratuito de Cloudflare da 10 ms de CPU por
// invocación (la espera de red no cuenta), pero una docena de peticiones en
// serie sí tarda.
let maximo = 0
for (let d = 0; d <= 6; d++) for (let h = 0; h < 24; h++) maximo = Math.max(maximo, toca(PROGRAMAS, h, d).length)
console.log(`       como mucho se pulsan ${maximo} programas en una misma hora`)
comprobar('no pasa de 6 en ninguna hora', maximo <= 6)

console.log(fallos === 0 ? '\n✓ todo bien.\n' : `\n✗ ${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
