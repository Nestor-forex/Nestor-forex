// EL PROGRAMA QUE HACE SONAR LOS AVISOS QUE PROGRAMA CADA PERSONA.
//
// Correr con: node scripts/mandar-avisos.mjs [--aplicar]
//
// Sin `--aplicar` **no escribe en Firestore ni manda ninguna notificación**:
// mira, cuenta y dice qué habría hecho. Igual que el robot de vencimientos, y
// por el mismo motivo: el botón de lanzar a mano tiene que servir para mirar
// sin miedo. La corrida automática siempre aplica.
//
// ⚠️ AQUÍ NO HAY NINGUNA DECISIÓN. Todas —a quién se le manda, qué se marca y
// en qué orden— están en `lib/avisos-usuario.mjs`, con su prueba. Este archivo
// solo baja los tres archivos, abre Firestore y pasa las dos funciones que
// hablan con el mundo. Es la lección del 2026-09-02: lo que vive dentro de un
// guion que necesita red y credenciales es lo único que no se puede comprobar.

import webpush from 'web-push'
import { crearT } from '../src/lib/i18n/crearT.js'
import { VAPID_PUBLICA } from '../src/lib/push/vapid.js'
import { abrir, leerCuentaDeServicio } from './lib/firestore-rest.mjs'
import { armarNotificacion, datosPorPar, mandarATodos } from './lib/avisos-usuario.mjs'
import { mandarInteligentes } from './lib/avisos-inteligentes.mjs'
import { EDAD_MAXIMA_PRECIO_MIN } from '../src/lib/alertas.js'

const APLICAR = process.argv.includes('--aplicar')

const RAW = 'https://raw.githubusercontent.com/Nestor-forex'
const FUENTES = {
  mt5: `${RAW}/Nestor-forex/datos/estado/mt5.json`,
  swing: `${RAW}/Nestor-forex/datos/estado/barrido.json`,
  intradia: `${RAW}/Nestor-forex-intradia/datos/estado/barrido.json`,
  // Para los avisos inteligentes: el calendario y las muestras de spread que
  // publica el puente. Todo de la rama `datos` de Swing.
  calendario: `${RAW}/Nestor-forex/datos/estado/calendario.json`,
  spreads: (fecha) => `${RAW}/Nestor-forex/datos/spreads/${fecha}.jsonl`,
}

// Cuánto puede durar el envío entero. El límite por notificación no basta:
// cada aparato y cada aviso son una petición aparte. Al agotarse se deja de
// mandar y se anota cuántos quedaron — perder unos avisos de esta vuelta es
// mucho menos grave que atascar la cola de las siguientes, que con
// `concurrency` en `cancel-in-progress: false` es lo que pasaría.
const MS_PRESUPUESTO = Number(process.env.AVISOS_MS_PRESUPUESTO || 90_000)
const MS_POR_AVISO = Number(process.env.AVISOS_MS_POR_AVISO || 10_000)

// Los servicios de push contestan esto cuando la suscripción ya no sirve (la
// persona desinstaló la app o borró los datos del navegador).
const MUERTA = new Set([404, 410])

async function bajar(url, queEs) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: 'no-cache' })
    if (!r.ok) {
      console.log(`  ⚠️ ${queEs}: HTTP ${r.status}`)
      return null
    }
    return await r.json()
  } catch (e) {
    console.log(`  ⚠️ ${queEs}: ${e?.message || e}`)
    return null
  }
}

async function bajarLineas(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: 'no-cache' })
    if (!r.ok) return []
    const out = []
    for (const l of (await r.text()).split('\n')) {
      try {
        const j = JSON.parse(l)
        if (j && j.s && typeof j.s === 'object') out.push(j.s)
      } catch {
        // una línea a medio escribir no tumba el resto
      }
    }
    return out
  } catch {
    return []
  }
}

console.log(`\nAvisos de los usuarios — ${APLICAR ? 'APLICANDO' : 'solo mirar'}\n`)

const cuenta = leerCuentaDeServicio(process.env)
const privada = (process.env.VAPID_PRIVATE_KEY || '').trim()
if (!cuenta || !privada) {
  // ⚠️ Esto NO es un fallo del programa: es que el repositorio no tiene los
  // secretos puestos. Se dice con nombre propio y se sale en verde, para que un
  // rojo signifique siempre algo que hay que arreglar.
  console.log('Sin configurar: faltan FIREBASE_SERVICE_ACCOUNT o VAPID_PRIVATE_KEY.\n')
  process.exit(0)
}

const [mt5, bSwing, bIntradia] = await Promise.all([
  bajar(FUENTES.mt5, 'estado/mt5.json'),
  bajar(FUENTES.swing, 'barrido de Swing'),
  bajar(FUENTES.intradia, 'barrido de Intradía'),
])

// ⚠️⚠️ SE PARA SOLO SI NO LLEGÓ **NINGUNA** DE LAS TRES FUENTES, y se sale en
// VERDE.
//
// La primera versión se paraba en cuanto faltaba el precio del puente, y eso
// era demasiado: el puente corre en el computador de Néstor, así que apagado
// por la noche es lo NORMAL — pero un aviso de RSI o de %B **no necesita el
// puente**, sale del barrido. Parar por falta de precio habría dejado sin sonar
// unos avisos que sí se podían juzgar, y sin decir por qué.
//
// Ahora falta lo que falte: los pares sin precio devuelven `sinDato` para los
// avisos de precio y siguen sirviendo para los de indicador. Es el motor el que
// decide, no un `return` de aquí.
//
// ⚠️ Y lo que de verdad protege de un aviso falso no es esto: es
// `EDAD_MAXIMA_PRECIO_MIN` dentro de `estadoDe`. Aunque el archivo esté, si el
// precio es viejo no dispara.
//
// Se sale en verde porque un rojo cada noche enseñaría a ignorar el workflow,
// que es justo lo que está escrito del rojo permanente de la puntualidad.
if (!mt5?.pares && !bSwing?.pares && !bIntradia?.pares) {
  console.log('\nNo llegó ninguna de las tres fuentes. No se manda nada.\n')
  process.exit(0)
}

console.log(`  precio del puente: ${mt5?.actualizadoEl || '—'} · ${Object.keys(mt5?.pares || {}).length} pares`)
console.log(`  barrido Swing:     ${bSwing?.generadoEl || '—'}`)
console.log(`  barrido Intradía:  ${bIntradia?.generadoEl || '—'}`)

const datos = {
  swing: datosPorPar(mt5, bSwing),
  intradia: datosPorPar(mt5, bIntradia),
  // Sin barrido los dos campos técnicos salen `undefined`, así que un aviso de
  // RSI o %B no puede disparar por aquí. Ver `appDe`.
  soloPrecio: datosPorPar(mt5, null),
}

webpush.setVapidDetails(`mailto:${process.env.VAPID_CONTACTO || 'nesdian2204@gmail.com'}`, VAPID_PUBLICA, privada)

const bd = await abrir(cuenta)
const fichas = await bd.listar('users')

// Los aparatos de cada persona, **SIN FILTRAR POR APP**: un aviso es de la
// persona, no de una app, así que va a todos sus aparatos — se lo puso donde se
// lo puso. Es la decisión contraria a `push-envio.mjs`, que sí filtra porque una
// señal de Swing no es de Intradía.
const subsPorUid = new Map()
for (const s of await bd.listar('pushSubs')) {
  if (!s.uid || !s.endpoint) continue
  if (!subsPorUid.has(s.uid)) subsPorUid.set(s.uid, [])
  subsPorUid.get(s.uid).push(s)
}

const resumen = await mandarATodos({
  fichas,
  subsPorUid,
  datos,
  aplicar: APLICAR,
  seAcabaEn: Date.now() + MS_PRESUPUESTO,
  marcar: (ruta, avisos) => bd.actualizar(ruta, { avisos }),
  async enviar(sub, envio, dato) {
    const mensaje = armarNotificacion(crearT(sub.idioma || 'es'), envio, dato)
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(mensaje),
        { timeout: MS_POR_AVISO }
      )
      return 'ok'
    } catch (e) {
      if (MUERTA.has(e?.statusCode)) return 'muerta'
      // El código y nada más: algunos servicios meten la dirección de envío
      // dentro del mensaje de error, y los registros de Actions son públicos.
      console.log(`  aviso no entregado (código ${e?.statusCode ?? '?'})`)
      return 'fallo'
    }
  },
})

// Las suscripciones muertas se borran para no gastar tiempo en ellas cada vuelta.
// ─────────────────────────────────────────────────────────────────────────
// AVISOS INTELIGENTES — los que la app manda sola sobre los pares de cada uno
// ─────────────────────────────────────────────────────────────────────────
const ahora = new Date()
const hoy = ahora.toISOString().slice(0, 10)
const ayer = new Date(ahora.getTime() - 86_400_000).toISOString().slice(0, 10)
const [cal, spHoy, spAyer] = await Promise.all([
  bajar(FUENTES.calendario, 'calendario'),
  bajarLineas(FUENTES.spreads(hoy)),
  bajarLineas(FUENTES.spreads(ayer)),
])
// ⚠️ El spread actual solo vale si la foto del puente es fresca: con el PC
// apagado, el último dato puede ser de ayer y avisaría de algo que ya no pasa.
const edadMt5 = mt5?.actualizadoEl ? (ahora.getTime() - new Date(mt5.actualizadoEl).getTime()) / 60_000 : Infinity
const spreadActual = {}
if (edadMt5 <= EDAD_MAXIMA_PRECIO_MIN) for (const [par, d] of Object.entries(mt5?.pares || {})) spreadActual[par] = d?.spread
const contexto = {
  eventos: Array.isArray(cal?.eventos) ? cal.eventos : [],
  correl: bSwing?.correl || null,
  spreadActual,
  spreadHistorico: [...spAyer, ...spHoy],
  hoyISO: hoy,
}
console.log(`  calendario: ${contexto.eventos.length} eventos · spreads: ${contexto.spreadHistorico.length} lecturas · puente ${Number.isFinite(edadMt5) ? Math.round(edadMt5) + ' min' : '—'}`)

const intel = await mandarInteligentes({
  fichas,
  subsPorUid,
  contexto,
  aplicar: APLICAR,
  seAcabaEn: Date.now() + MS_PRESUPUESTO,
  marcar: (ruta, intelEnviados) => bd.actualizar(ruta, { intelEnviados }),
  t: (idioma) => crearT(idioma),
  ahora,
  async enviar(sub, mensaje) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(mensaje),
        { timeout: MS_POR_AVISO }
      )
      return 'ok'
    } catch (e) {
      if (MUERTA.has(e?.statusCode)) return 'muerta'
      console.log(`  aviso inteligente no entregado (código ${e?.statusCode ?? '?'})`)
      return 'fallo'
    }
  },
})
console.log(`\n  Avisos inteligentes: ${intel.candidatos} para ${intel.personas} persona(s) · enviados ${intel.enviados}${intel.noSeMarco ? ` · sin marcar ${intel.noSeMarco}` : ''}${intel.sinAparato ? ` · sin aparato ${intel.sinAparato}` : ''}`)

let limpiadas = 0
const todasMuertas = [...new Set([...resumen.muertas, ...intel.muertas])]
if (APLICAR) for (const ruta of todasMuertas) if (await bd.borrar(ruta)) limpiadas++

console.log('')
for (const [k, v] of Object.entries({ ...resumen, muertas: resumen.muertas.length, limpiadas })) {
  if (v) console.log(`  ${k}: ${v}`)
}
if (!resumen.candidatos) console.log('  nada que mandar en esta vuelta.')
if (resumen.noSeMarco) {
  console.log(`\n  ⚠️ ${resumen.noSeMarco} aviso(s) NO se mandaron porque no se pudo marcar la ficha.`)
  console.log('     Es a propósito: mandar sin marcar haría sonar el mismo aviso cada 15 min para siempre.')
}
if (resumen.sinApp) {
  console.log(
    `\n  ⚠️ ${resumen.sinApp} aviso(s) de indicador no dicen de qué app son y NO suenan:\n` +
      '     «RSI 30» no es lo mismo en velas diarias que en velas de una hora.\n' +
      '     Son de antes del 2026-10-31; se arreglan borrándolos y volviéndolos a poner.'
  )
}
console.log('')
