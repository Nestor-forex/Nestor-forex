// PRUEBA DEL PUENTE DE QWEN Y DE LAS REGLAS — sin internet, sin llave y sin
// gastar un centavo (2026-11-14).
//
// Qwen, Firestore y el contador de Cloudflare son DOBLES de mentira. Lo que se
// comprueba es lo que decide si alguien puede gastar a cuenta de Néstor y si lo
// que contesta Qwen se puede enseñar:
//   · que el puente no atiende a quien no tiene sesión ni está aprobado;
//   · que cuenta 5 al día y devuelve la consulta si Qwen falla;
//   · que solo deja llamar desde las dos apps;
//   · que las reglas cazan a un Qwen que cambia un número o dice «compra».

import { readFileSync } from 'node:fs'
import * as puente from '../../puente-qwen/worker.js'
import { analisisParaQwen, leerJson, validarExplica, validarAudita, validarSentimiento, costeDe, DIRECCION } from '../src/lib/qwenValidar.js'
import { PRECIOS, juzgar } from './sonda-qwen.mjs'
import es from '../src/lib/i18n/textos/es.js'

let fallos = 0
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) fallos++
}

// ── Dobles ────────────────────────────────────────────────────────────────
function kv() {
  const m = new Map()
  return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v) }
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const AHORA = Date.parse('2026-11-14T15:00:00Z')
function token({ uid = 'abcdefghij12345', email = 'socio@example.com', aud = 'nestor-forex', exp = AHORA / 1000 + 3600 } = {}) {
  return `${b64({ alg: 'RS256' })}.${b64({ aud, iss: `https://securetoken.google.com/${aud}`, exp, user_id: uid, email })}.firma`
}
function sse(contenido, uso = { prompt_tokens: 100, completion_tokens: 20 }) {
  const trozos = [contenido.slice(0, 5), contenido.slice(5)]
  return trozos.map((t) => `data: ${JSON.stringify({ model: 'qwen3.7-plus', choices: [{ delta: { content: t } }] })}`).join('\n\n') + `\n\ndata: ${JSON.stringify({ choices: [], usage: uso })}\n\ndata: [DONE]\n`
}
/** Un fetch de mentira: Firestore contesta la ficha, Qwen contesta `respuesta`. */
function falsoFetch({ estado = 'aprobado', firestoreStatus = 200, qwenStatus = 200, respuesta = 'hola' } = {}) {
  const llamadas = []
  const f = async (url, init) => {
    llamadas.push({ url, init })
    if (url.includes('firestore.googleapis.com')) {
      return new Response(JSON.stringify({ fields: { estado: { stringValue: estado } } }), { status: firestoreStatus })
    }
    if (url.includes('/chat/completions')) return new Response(qwenStatus === 200 ? sse(respuesta) : 'error de Qwen', { status: qwenStatus })
    return new Response('?', { status: 404 })
  }
  f.llamadas = llamadas
  return f
}
const ORIGEN = 'https://nestor-forex.github.io'
function pedido(cuerpo = { tarea: 'explica', datos: { titulo: 'CPI' } }, { tok = token(), origen = ORIGEN, method = 'POST' } = {}) {
  return new Request('https://puente.example/', {
    method,
    headers: { origin: origen, authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(cuerpo) : undefined,
  })
}

// ── 1 · El archivo se puede pegar entero en Cloudflare ───────────────────
console.log('\n1 · El puente no importa nada')
const codigo = readFileSync(new URL('../../puente-qwen/worker.js', import.meta.url), 'utf8')
ok(!/^\s*import\s/m.test(codigo), 'worker.js no tiene ningún import (se pega entero en Cloudflare)')
ok(!/sk-[A-Za-z0-9]{10,}/.test(codigo), 'worker.js no lleva ninguna llave escrita')
ok(typeof puente.default?.fetch === 'function', 'exporta el `fetch` que Cloudflare llama')

// ── 2 · Las instrucciones ─────────────────────────────────────────────────
console.log('\n2 · Las instrucciones')
ok(puente.AVISO_FINAL === es.explica.noEsSenal, 'la frase final es la MISMA que `explica.noEsSenal` de la app')
ok(puente.PROMPT_4.includes("Dame un veredicto final: 'APROBADO', 'APROBADO CON AJUSTES' o 'RECHAZADO'"), 'el Prompt 4 conserva el veredicto tal cual')
ok(puente.PROMPT_3.includes('puntuación de convicción del 1 al 10'), 'el Prompt 3 conserva la convicción del 1 al 10')
ok(/v\d+ · \d{4}-\d{2}-\d{2}/.test(puente.VERSION), `las instrucciones llevan número y fecha (${puente.VERSION})`)
ok(puente.SISTEMA_EXPLICA.includes(puente.AVISO_FINAL), 'la explicación pide terminar con la frase exacta')
ok(puente.mensajesDe('inventada', {}) === null, 'una tarea que no existe no arma ningún mensaje')
const m4 = puente.mensajesDe('audita', { prompt: { par: 'EUR/USD', direccion: 'Largo' }, analisis: { par: 'EUR/USD' } })
ok(m4[0].role === 'system' && m4[0].content === puente.SISTEMA_AUDITA, 'las instrucciones salen del puente, no de quien pregunta')
ok(!/\{\w+\}/.test(m4[1].content), 'no queda ningún {hueco} sin rellenar')
ok(m4[1].content.includes('Take Profit 2 (Objetivo final): no hay'), 'lo que falta se dice «no hay», no se deja el hueco')
ok(puente.rellenar('{a}-{b}', { a: 0, b: '' }) === '0-no hay', 'un 0 se rellena como 0 y un vacío como «no hay»')

// ── 3 · Leer a Qwen ───────────────────────────────────────────────────────
console.log('\n3 · Leer la respuesta de Qwen')
const j = puente.juntarSSE(sse('hola mundo', { prompt_tokens: 7, completion_tokens: 3 }))
ok(j.contenido === 'hola mundo', 'junta los trozos en orden')
ok(j.uso?.prompt_tokens === 7, 'saca el recuento de tokens del final')
const conPensar = 'data: ' + JSON.stringify({ choices: [{ delta: { reasoning_content: 'pienso' } }] }) + '\ndata: ' + JSON.stringify({ choices: [{ delta: { content: 'ok' } }] })
ok(puente.juntarSSE(conPensar).razonamiento === 'pienso' && puente.juntarSSE(conPensar).contenido === 'ok', 'separa lo que razona de lo que contesta')
ok(puente.juntarSSE('data: {roto\ndata: [DONE]').contenido === '', 'una línea rota no revienta nada')
const r1 = await puente.preguntarQwen({ llave: 'x', direccion: 'https://q', modelo: 'm', mensajes: [], fetchFn: falsoFetch({ respuesta: 'listo' }) })
ok(r1.ok && r1.contenido === 'listo', 'una consulta buena devuelve el texto')
const r2 = await puente.preguntarQwen({ llave: 'x', direccion: 'https://q', modelo: 'm', mensajes: [], fetchFn: falsoFetch({ qwenStatus: 401 }) })
ok(!r2.ok && r2.estado === 401, 'un 401 de Qwen se devuelve como fallo, sin lanzar')
const r3 = await puente.preguntarQwen({ llave: 'x', direccion: 'https://q', modelo: 'm', mensajes: [], fetchFn: async () => { throw new Error('sin red') } })
ok(!r3.ok && r3.estado === 0, 'sin red tampoco lanza')
const fEnv = falsoFetch()
await puente.preguntarQwen({ llave: 'x', direccion: 'https://q', modelo: 'qwen3.7-plus', mensajes: [], pensar: true, fetchFn: fEnv })
const enviado = JSON.parse(fEnv.llamadas[0].init.body)
ok(enviado.stream === true && enviado.stream_options?.include_usage === true, 'pide la respuesta continua y el recuento de tokens al final')
ok(enviado.enable_thinking === true && enviado.temperature <= 0.2, 'el modo de pensar se pide explícito, y la temperatura va baja (0,1-0,2, como dijo Qwen)')

// ── 4 · Quién pregunta ────────────────────────────────────────────────────
console.log('\n4 · El token')
ok(puente.leerToken(token(), AHORA)?.uid === 'abcdefghij12345', 'un token de este proyecto da el uid')
ok(puente.leerToken(token({ aud: 'otro-proyecto' }), AHORA) === null, 'un token de OTRO proyecto no vale')
ok(puente.leerToken(token({ exp: AHORA / 1000 - 1 }), AHORA) === null, 'un token caducado no vale')
ok(puente.leerToken(token({ uid: '../../x' }), AHORA) === null, 'un uid con caracteres raros no vale (va dentro de una dirección)')
ok(puente.leerToken('basura', AHORA) === null && puente.leerToken(null, AHORA) === null, 'basura no vale')
ok(puente.diaLocal(Date.parse('2026-11-15T03:00:00Z')) === '2026-11-14', 'el día se cuenta en la hora de Colombia (a las 22:00 de Bogotá sigue siendo el 14)')

// ── 5 · La puerta ─────────────────────────────────────────────────────────
console.log('\n5 · La puerta')
const env = () => ({ QWEN_KEY: 'llave-de-prueba', CUENTAS: kv() })
const at = (req, e, f) => puente.atender(req, e, { fetchFn: f ?? falsoFetch(), ahoraMs: AHORA })
ok((await at(pedido(), { CUENTAS: kv() })).status === 503, 'sin llave no atiende a nadie, y lo dice (503)')
ok((await at(pedido(), { QWEN_KEY: 'x' })).status === 503, 'sin contador tampoco (503)')
ok((await at(pedido(undefined, { tok: 'nada' }), env())).status === 401, 'sin sesión: 401')
ok((await at(pedido(), env(), falsoFetch({ firestoreStatus: 403 }))).status === 401, 'si Firestore no da la ficha (token falso): 401')
ok((await at(pedido(), env(), falsoFetch({ estado: 'pendiente' }))).status === 403, 'una ficha pendiente: 403')
ok((await at(pedido(), env(), falsoFetch({ estado: 'retirado' }))).status === 403, 'una ficha retirada: 403')
ok((await at(pedido({ tarea: 'borrarTodo' }), env())).status === 400, 'una tarea que no existe: 400')
ok((await at(pedido({ tarea: 'explica', datos: { x: 'a'.repeat(30000) } }), env())).status === 413, 'datos enormes: 413')

const e1 = env()
const fq = falsoFetch({ respuesta: 'texto de Qwen' })
const resp = await at(pedido(), e1, fq)
const cuerpo = await resp.json()
ok(resp.status === 200 && cuerpo.texto === 'texto de Qwen', 'una persona aprobada recibe la respuesta')
ok(cuerpo.usadas === 1 && cuerpo.limite === 5, 'y sabe cuántas lleva de cuántas (1 de 5)')
const llamadaQwen = fq.llamadas.find((l) => l.url.includes('chat/completions'))
ok(llamadaQwen?.init.headers.authorization === 'Bearer llave-de-prueba', 'la llave va solo en la llamada a Qwen')
const fsLlamada = fq.llamadas.find((l) => l.url.includes('firestore'))
ok(fsLlamada?.init.headers.authorization === `Bearer ${token()}`, 'la ficha se lee CON el token de la persona')
ok(resp.headers.get('access-control-allow-origin') === ORIGEN, 'deja leer la respuesta a la app')

const r403 = await at(pedido(undefined, { origen: 'https://malo.example' }), env())
ok(!r403.headers.get('access-control-allow-origin'), 'a otra página no le da permiso de CORS')

const e2 = env()
for (let i = 0; i < 5; i++) await at(pedido(), e2)
const sexta = await at(pedido(), e2)
ok(sexta.status === 429 && (await sexta.json()).codigo === 'limiteDiario', 'la sexta del día: 429 «límite diario»')
const otroDia = await puente.atender(pedido(undefined, { tok: token({ exp: AHORA / 1000 + 3 * 86400 }) }), e2, { fetchFn: falsoFetch(), ahoraMs: AHORA + 24 * 3600 * 1000 })
ok(otroDia.status === 200, 'al día siguiente vuelve a tener 5')

const e3 = env()
const malQwen = await at(pedido(), e3, falsoFetch({ qwenStatus: 500 }))
ok(malQwen.status === 502, 'si Qwen falla: 502')
ok([...e3.CUENTAS.m.entries()].filter(([k]) => k.startsWith('u:')).every(([, v]) => v === '0'), 'y la consulta se DEVUELVE al contador (no se cobra lo que no llegó)')

const eAdmin = env()
for (let i = 0; i < 6; i++) await at(pedido(undefined, { tok: token({ email: puente.CORREO_ADMIN }) }), eAdmin)
ok(eAdmin.CUENTAS.m.get(`u:abcdefghij12345:2026-11-14`) === '6', `el administrador pasa de 5 (su límite es ${puente.LIMITE_ADMIN})`)

const eTecho = env()
eTecho.CUENTAS.m.set('t:2026-11-14', String(puente.TECHO_DIARIO_TOTAL))
ok((await at(pedido(), eTecho)).status === 429, 'con el techo de toda la cuenta lleno, nadie más (429)')

ok((await puente.atender(pedido(undefined, { method: 'OPTIONS' }), env())).status === 204, 'el «¿puedo?» del navegador (OPTIONS) contesta 204')

// ── 6 · Las reglas sobre lo que contesta Qwen ────────────────────────────
console.log('\n6 · Las reglas')
const A = puente.AVISO_FINAL
const buena = `El Core PPI mide los precios que cobran los productores, sin comida ni energía. Lo previsto (0.3%) es MÁS BAJO que lo anterior (0.7%). Lo que mueve el precio es la sorpresa. ${A}`
const datosCal = { previsto: '0.3%', anterior: '0.7%' }
ok(validarExplica(buena, datosCal, A).ok, 'una explicación buena cumple')
ok(validarExplica(`El dólar se va a fortalecer. ${A}`, {}, A).fallos.includes('direccion'), '«fortalecer» se caza')
ok(validarExplica(`Conviene comprar euros. ${A}`, {}, A).fallos.includes('direccion'), '«comprar» se caza')
ok(!validarExplica(buena, datosCal, A).fallos.includes('direccion'), 'el aviso final dice «comprar o vender» y NO cuenta como dirección')
ok(validarExplica('Una explicación sin aviso.', {}, A).fallos.includes('sinAviso'), 'sin la frase final no cumple')
ok(validarExplica(buena.replace('0.3%', '0.4%'), datosCal, A).fallos.includes('cambia_previsto'), 'si cambia lo previsto, se caza')
ok(validarExplica(`**Título**\n${buena}`, datosCal, A).fallos.includes('formato'), 'con negritas o títulos no cumple (va en texto plano)')
ok(validarExplica(`${'palabra '.repeat(200)}${A}`, {}, A).fallos.includes('largo'), 'demasiado larga no cumple')
ok(DIRECCION.test('subirá') && DIRECCION.test('bajarán') && !DIRECCION.test('más bajo'), '«subirá» y «bajarán» se cazan; «más bajo» no')

const crudo = { par: 'EUR/USD', dec: 4, precio: 1.10247, niveles: { sl: 1.098682569512187, tp: 1.12734, pipRiesgo: 37.87, pipBeneficio: 248.7, rr: 6.5664 }, lote: { lote: 0.026403, riesgoUsd: 10, valorPip: 10 }, herramientas: { pivote: { p: 1.10682333, r1: 1.1090567 }, rsi: { v: 31.52 } } }
const an = analisisParaQwen(crudo)
ok(an.niveles.sl === 1.0987 && an.precio === 1.1025, 'a Qwen se le mandan los precios como en PANTALLA (4 decimales en EUR/USD)')
ok(an.lote.lote === 0.03 && an.niveles.rr === 6.57, 'el lote y el R/B con dos decimales')
ok(an.herramientas.pivote.p === 1.1068, 'el pivote (que es un objeto) también se redondea')
ok(analisisParaQwen(null) === null, 'sin análisis no revienta')

const buenaA = { veredicto: 'RECHAZADO', rr_tp1: 6.57, rr_tp2: null, lote: 0.03, stop_logico: 'no', tp_realista: 'dudoso', cumple_perfil: true, numeros_usados: { entrada: 1.1025, sl: 1.0987, tp1: 1.1273 }, justificacion: 'El stop es más corto que el ATR.' }
ok(validarAudita(buenaA, an).ok, 'una auditoría que usa los números de la app cumple')
ok(validarAudita({ ...buenaA, numeros_usados: { ...buenaA.numeros_usados, sl: 1.0950 } }, an).fallos.includes('cambia_sl'), 'si cambia el Stop-loss, se caza')
ok(validarAudita({ ...buenaA, lote: 0.1 }, an).fallos.includes('cambia_lote'), 'si cambia el lote, se caza')
ok(validarAudita({ ...buenaA, rr_tp1: 3 }, an).fallos.includes('cambia_rr'), 'si cambia el R/B, se caza')
ok(validarAudita({ ...buenaA, veredicto: 'COMPRAR' }, an).fallos.includes('veredicto'), 'un veredicto que no es de los tres no cumple')
ok(validarAudita(null, an).fallos.includes('sinJson'), 'sin JSON no cumple')
const jpy = analisisParaQwen({ dec: 2, precio: 159.77, niveles: { sl: 160.67, tp: 156.07, rr: 4.13 }, lote: { lote: 0.02 } })
ok(validarAudita({ ...buenaA, rr_tp1: 4.13, lote: 0.02, numeros_usados: { entrada: 159.774, sl: 160.67, tp1: 156.07 } }, jpy).ok, 'en el yen, medio pip son 0,005 (159.774 vale)')
ok(validarAudita({ ...buenaA, rr_tp1: 4.13, lote: 0.02, numeros_usados: { entrada: 159.79, sl: 160.67, tp1: 156.07 } }, jpy).fallos.includes('cambia_entrada'), 'y dos pips de diferencia, no')

ok(leerJson('{"a":1}').envoltorio === false, 'JSON limpio: sin envoltorio')
const env2 = leerJson('```json\n{"a":1}\n```')
ok(env2.obj?.a === 1 && env2.envoltorio === true, 'JSON dentro de ```: se lee, pero se marca el envoltorio')
ok(leerJson('no hay json').obj === null, 'sin JSON: null')

const buenaS = { trampa_minorista: 'sin dato', flujo_institucional: 'confirma', conviccion: 6, datos_que_faltan: ['posicionamiento minorista'], justificacion: 'Los fondos están cortos en EUR.' }
ok(validarSentimiento(buenaS).ok, 'un sentimiento que dice que le falta el dato minorista cumple')
ok(validarSentimiento({ ...buenaS, trampa_minorista: 'si' }).fallos.includes('inventaMinorista'), 'si afirma una trampa minorista sin tener el dato, se lo inventó')
ok(validarSentimiento({ ...buenaS, conviccion: 11 }).fallos.includes('conviccion'), 'una convicción de 11 no cumple')
ok(validarSentimiento({ ...buenaS, conviccion: 6.5 }).fallos.includes('conviccion'), 'ni una de 6,5 (tiene que ser entera)')
ok(validarSentimiento({ ...buenaS, datos_que_faltan: [] }).fallos.includes('noDiceQueFalta'), 'si no dice qué le falta, no cumple')

// ── 7 · El coste ──────────────────────────────────────────────────────────
console.log('\n7 · El coste')
const c = costeDe({ prompt_tokens: 1_000_000, completion_tokens: 1_000_000, prompt_tokens_details: { cached_tokens: 500_000 } }, PRECIOS.plus)
ok(Math.abs(c - (0.5 * 0.4 + 0.5 * 0.08 + 1.6)) < 1e-9, 'lo repetido (caché) se cobra a su precio y no al normal')
ok(costeDe(null, PRECIOS.plus) === null, 'sin recuento de tokens: null, no 0')
ok(Object.keys(PRECIOS).join() === Object.keys(puente.MODELOS).join(), 'hay precio para cada modelo del puente, y ninguno de más')
ok(PRECIOS.plus.entrada === 0.4 && PRECIOS.plus.salida === 1.6, 'el Plus va con el precio NORMAL, no con el descuento que puede ser temporal')

// ── 8 · La sonda juzga con las mismas reglas ─────────────────────────────
console.log('\n8 · La sonda')
ok(juzgar({ tarea: 'explica', datos: datosCal }, buena).ok, 'la sonda da por buena una explicación buena')
ok(juzgar({ tarea: 'audita', analisis: an }, '```json\n' + JSON.stringify(buenaA) + '\n```').envoltorio === true, 'y avisa del envoltorio en el JSON')
const sondaTexto = readFileSync(new URL('./sonda-qwen.mjs', import.meta.url), 'utf8')
ok(/from '\.\.\/\.\.\/puente-qwen\/worker\.js'/.test(sondaTexto), 'la sonda toma las instrucciones del puente, no de una copia')
ok(/analisisParaQwen\(crudo\)/.test(sondaTexto), 'la sonda manda el análisis redondeado, como la pantalla')
ok(/TOPE_USD/.test(sondaTexto) && /break fuera/.test(sondaTexto), 'la sonda lleva tope de gasto y para del todo al pasarlo')

console.log(fallos ? `\n✗ ${fallos} comprobación(es) fallaron` : '\n✓ todo bien')
process.exit(fallos ? 1 : 0)
