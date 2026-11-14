// SONDA DE QWEN — los tres modelos con datos reales de la app (2026-11-14).
//
// ─────────────────────────────────────────────────────────────────────────
// PARA QUÉ
// ─────────────────────────────────────────────────────────────────────────
// Antes de elegir el modelo de Qwen hay que MEDIR, no adivinar. El más barato
// puede fallar justo en lo que importa (respetar el formato, no tocar los
// números de la app, no decir «compra» al explicar una noticia) y el más caro
// puede no notarse. Esto le hace las MISMAS preguntas a los tres —Flash, Plus y
// Max— con los datos publicados de hoy, y mide:
//   · si responde, y en qué dirección de Alibaba;
//   · cuánto tarda;
//   · cuántos tokens gasta y cuánto cuesta, con los precios leídos el 2026-11-13;
//   · si cumple las reglas (`src/lib/qwenValidar.js`, las mismas que usará la app).
//
// Las instrucciones NO están aquí: se importan de `puente-qwen/worker.js`, que
// es lo que recibirán los suscriptores. Medir otras sería medir otra cosa.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LO QUE QUEDA ESCRITO ANTES DE VER NINGUNA RESPUESTA
// ─────────────────────────────────────────────────────────────────────────
//   1. ESTO NO MIDE SI QWEN ACIERTA EL MERCADO. Mide si obedece y cuánto
//      cuesta. Si acierta se sabrá con la medición diaria a la vista, con
//      150 operaciones resueltas, no con 36 respuestas de un día.
//   2. Las DIRECCIONES de los planes que audita las elige la sonda, fijas, para
//      tener casos que auditar. No son señales de nadie.
//   3. SIN INTERNET: la búsqueda web cuesta 1 centavo por llamada y aquí no
//      hace falta para medir el formato.
//   4. Con tan pocas respuestas, un 100 % y un 80 % de formato correcto no se
//      distinguen. Lo que sí se ve es un modelo que falla casi siempre.
//
// ⚠️ GASTA DINERO DE VERDAD, poco: unas 36 consultas, del orden de 50
// centavos. Lleva un TOPE: si lo gastado pasa de `TOPE_USD`, para.

import { DIRECCIONES, MODELOS, TAREAS, AVISO_FINAL, VERSION, mensajesDe, preguntarQwen } from '../../puente-qwen/worker.js'
import { analisisParaQwen, leerJson, validarExplica, validarAudita, validarSentimiento, costeDe } from '../src/lib/qwenValidar.js'
import { derivarVista } from '../src/lib/marketCalc.js'
import { armarAnalisis, HERRAMIENTAS } from '../src/lib/analizador.js'
import { explicacionEvento } from '../src/lib/explicacion.js'
import { monedasDe } from '../src/lib/pairs.js'

const RAIZ = 'https://raw.githubusercontent.com/Nestor-forex/Nestor-forex/datos/estado'
export const TOPE_USD = 2

// Por millón de tokens, región Singapur, leídos en qwencloud.com el
// 2026-11-13. El Plus va con el precio NORMAL, no con el 20 % de descuento,
// que puede ser temporal. Ver `notas/qwen-conversacion.md`.
export const PRECIOS = Object.freeze({
  flash: { entrada: 0.15, salida: 0.47, cache: 0.016 },
  plus: { entrada: 0.4, salida: 1.6, cache: 0.08 },
  max: { entrada: 2, salida: 6, cache: 0.25 },
})

// Un perfil de prueba, no el de nadie.
const PERFIL = { capital: 1000, riesgoPct: 1, limiteDiarioPct: 3, maxPerdidasSeguidas: 3 }
const PLANES = [
  { par: 'EUR/USD', lado: 'COMPRA' },
  { par: 'USD/JPY', lado: 'VENTA' },
  { par: 'GBP/CAD', lado: 'COMPRA' },
]
const PARES_SENTIMIENTO = ['EUR/USD', 'USD/CAD']

async function bajar(nombre) {
  try {
    const r = await fetch(`${RAIZ}/${nombre}`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

function textoCot(cot, divisa) {
  const d = cot?.divisas?.[divisa]
  if (!d) return `${divisa}: NO DISPONIBLE`
  const pct = Number.isFinite(d.fondosPct) ? d.fondosPct.toFixed(1) : '?'
  return `${divisa}: los fondos especulativos (leveraged money) tienen un neto de ${pct} % del interés abierto (${d.fondosNeto} contratos), cambio semanal ${d.cambioNeto}, informe del ${d.f}`
}

/** Los casos de la sonda, armados con lo publicado hoy. */
export function armarCasos({ barrido, calendario, noticias, cot, tasas }) {
  const casos = []
  const vista = derivarVista(barrido, { incluirReversion: true })
  const fichas = vista?.fichas ?? []

  const ev = (calendario?.eventos ?? []).find((e) => e.f && e.p) ?? calendario?.eventos?.[0]
  if (ev) {
    const datos = { tipo: 'calendario', titulo: ev.t, divisa: ev.c, fecha: ev.d, ...explicacionEvento(ev) }
    casos.push({ id: `explica · calendario · ${ev.c} ${ev.t}`, tarea: 'explica', datos })
  }
  const nt = noticias?.noticias?.[0]
  if (nt) {
    casos.push({ id: `explica · noticia · ${nt.f}`, tarea: 'explica', datos: { tipo: 'noticia', titulo: nt.t, fuente: nt.f, divisas: nt.div, fecha: nt.d } })
  }

  for (const { par, lado } of PLANES) {
    const ficha = fichas.find((f) => f.name === par)
    if (!ficha) continue
    const crudo = armarAnalisis({
      ficha,
      lado,
      metodo: 'app',
      herramientas: HERRAMIENTAS,
      perfil: PERFIL,
      ratesUSD: barrido.ratesUSD,
      calendario,
      tasas: tasas?.tasas ?? null,
      monedasDe,
    })
    if (!crudo.niveles) continue
    // Con los números como se ven en pantalla: ver `analisisParaQwen`.
    const analisis = analisisParaQwen(crudo)
    const prompt = {
      par,
      direccion: lado === 'COMPRA' ? 'Largo' : 'Corto',
      entrada: analisis.precio,
      sl: analisis.niveles.sl,
      tp1: analisis.niveles.tp,
      tp2: 'no hay (la app da un solo objetivo)',
      cuenta: `$${PERFIL.capital}`,
      riesgo: `${PERFIL.riesgoPct}%`,
    }
    casos.push({ id: `audita · ${par} ${lado}`, tarea: 'audita', datos: { prompt, analisis: { ...analisis, perfil: PERFIL } }, analisis })
  }

  for (const par of PARES_SENTIMIENTO) {
    const [b, q] = par.split('/')
    const ficha = fichas.find((f) => f.name === par)
    const prompt = {
      par,
      minorista: 'NO DISPONIBLE en la app',
      cot: `${textoCot(cot, b)} · ${textoCot(cot, q)}`,
      materias: 'NO DISPONIBLE en la app',
    }
    const r1 = (x, n) => (Number.isFinite(x) ? Number(x.toFixed(n)) : null)
    const contexto = ficha
      ? { precio: r1(ficha.precio, ficha.dec), tendencia: ficha.tend, rsi: r1(ficha.rsi, 1), fuerza_0_a_10: { [b]: r1(ficha.fuerzaB, 1), [q]: r1(ficha.fuerzaQ, 1) } }
      : null
    casos.push({ id: `sentimiento · ${par}`, tarea: 'sentimiento', datos: { prompt, contexto } })
  }
  return casos
}

/** Comprueba una respuesta según su tarea. */
export function juzgar(caso, texto) {
  if (caso.tarea === 'explica') {
    const v = validarExplica(texto, caso.datos, AVISO_FINAL)
    return { ...v, envoltorio: false }
  }
  const { obj, envoltorio } = leerJson(texto)
  const v = caso.tarea === 'audita' ? validarAudita(obj, caso.analisis) : validarSentimiento(obj)
  return { ...v, envoltorio, obj }
}

const mediana = (xs) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : null
}

async function main() {
  const llave = process.env.QWEN_KEY
  if (!llave) {
    console.error('✗ Falta el secreto QWEN_KEY. Ver puente-qwen/README.md.')
    process.exit(1)
  }
  console.log(`Sonda de Qwen · instrucciones ${VERSION}\n`)

  const [barrido, calendario, noticias, cot, tasas] = await Promise.all(
    ['barrido.json', 'calendario.json', 'noticias.json', 'cot.json', 'tasas.json'].map(bajar)
  )
  if (!barrido) {
    console.error('✗ No se pudo bajar barrido.json: sin datos de la app no hay nada que medir.')
    process.exit(1)
  }
  const casos = armarCasos({ barrido, calendario, noticias, cot, tasas })
  console.log(`Datos del barrido: ${barrido.generadoEl} · casos: ${casos.length}`)
  for (const c of casos) console.log(`  · ${c.id}`)

  // ── 1. ¿Qué dirección responde? ───────────────────────────────────────
  console.log('\n1 · La dirección de Alibaba')
  let direccion = null
  for (const d of DIRECCIONES) {
    const r = await preguntarQwen({ llave, direccion: d, modelo: MODELOS.flash, mensajes: [{ role: 'user', content: 'Responde solo: ok' }], maxTokens: 10 })
    console.log(`  ${r.ok ? '✓' : '✗'} ${d} → ${r.ok ? `responde (${r.ms} ms)` : `${r.estado} ${r.detalle}`}`)
    if (r.ok && !direccion) direccion = d
  }
  if (!direccion) {
    console.error('\n✗ Ninguna dirección respondió. Mirar el error de arriba: si dice 401, la llave está mal copiada; si dice 403, puede faltar activar el modelo.')
    process.exit(1)
  }

  // ── 2. Las preguntas ──────────────────────────────────────────────────
  console.log(`\n2 · Las preguntas (en ${direccion})`)
  const filas = []
  let gastado = 0
  fuera: for (const clave of Object.keys(MODELOS)) {
    for (const caso of casos) {
      // El «modo de pensar» solo se prueba donde hay que razonar: explicar
      // una noticia no lo necesita y lo encarecería.
      const modos = caso.tarea === 'explica' ? [false] : [false, true]
      for (const pensar of modos) {
        if (gastado > TOPE_USD) {
          console.log(`\n⚠️ Se pasó el tope de $${TOPE_USD}: se para aquí.`)
          break fuera
        }
        const r = await preguntarQwen({ llave, direccion, modelo: MODELOS[clave], mensajes: mensajesDe(caso.tarea, caso.datos), maxTokens: TAREAS[caso.tarea].maxTokens + (pensar ? 4000 : 0), pensar })
        const coste = r.ok ? costeDe(r.uso, PRECIOS[clave]) : null
        if (Number.isFinite(coste)) gastado += coste
        const j = r.ok ? juzgar(caso, r.contenido) : { ok: false, fallos: [`http_${r.estado}`], envoltorio: false }
        filas.push({ clave, pensar, caso: caso.id, tarea: caso.tarea, ok: j.ok, fallos: j.fallos, envoltorio: j.envoltorio, ms: r.ms, coste, uso: r.uso })
        console.log(`\n── ${clave}${pensar ? ' +pensar' : ''} · ${caso.id} · ${r.ms} ms · ${Number.isFinite(coste) ? `$${coste.toFixed(5)}` : 'sin coste'} · ${j.ok ? '✓ cumple' : `✗ ${j.fallos.join(', ')}`}${j.envoltorio ? ' · (JSON con envoltorio)' : ''}`)
        if (r.uso) console.log(`   tokens: entrada ${r.uso.prompt_tokens} (caché ${r.uso.prompt_tokens_details?.cached_tokens ?? 0}) · salida ${r.uso.completion_tokens} (razonando ${r.uso.completion_tokens_details?.reasoning_tokens ?? 0})`)
        console.log(r.ok ? `   ${String(r.contenido).replace(/\n/g, '\n   ').slice(0, 1200)}` : `   ${r.detalle}`)
      }
    }
  }

  // ── 3. El resumen ─────────────────────────────────────────────────────
  console.log('\n3 · Resumen por modelo (CUMPLE = respeta todas las reglas de su tarea)\n')
  console.log('modelo          tarea         n   cumple   ms mediana   $ por consulta')
  for (const clave of Object.keys(MODELOS)) {
    for (const pensar of [false, true]) {
      for (const tarea of Object.keys(TAREAS)) {
        const f = filas.filter((x) => x.clave === clave && x.pensar === pensar && x.tarea === tarea)
        if (!f.length) continue
        const ok = f.filter((x) => x.ok).length
        const costes = f.map((x) => x.coste).filter(Number.isFinite)
        const medio = costes.length ? costes.reduce((a, b) => a + b, 0) / costes.length : null
        console.log(
          `${(clave + (pensar ? ' +pensar' : '')).padEnd(15)} ${tarea.padEnd(12)} ${String(f.length).padStart(2)}   ${`${ok}/${f.length}`.padEnd(6)}   ${String(mediana(f.map((x) => x.ms)) ?? '-').padStart(8)}     ${medio == null ? '-' : medio.toFixed(5)}`
        )
      }
    }
  }
  const fallosPorCodigo = {}
  for (const f of filas) for (const c of f.fallos) fallosPorCodigo[c] = (fallosPorCodigo[c] ?? 0) + 1
  console.log(`\nFallos por motivo: ${Object.keys(fallosPorCodigo).length ? JSON.stringify(fallosPorCodigo) : 'ninguno'}`)
  console.log(`Gastado en esta sonda: $${gastado.toFixed(4)} (con los precios normales, sin el descuento del Plus)`)
  console.log('\n⚠️ Esto mide si OBEDECE y cuánto CUESTA. Si acierta el mercado lo dirá la medición diaria, no esto.')

  if (!filas.some((f) => f.ok || f.uso)) process.exit(1)
}

// Se puede importar sin que corra (la prueba lo hace).
if (import.meta.url === `file://${process.argv[1]}`) await main()
