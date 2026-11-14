// EL PUENTE DE QWEN — un Cloudflare Worker entre las apps y Qwen (2026-11-14).
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ EXISTE
// ─────────────────────────────────────────────────────────────────────────
// La app corre en el teléfono de cada suscriptor, y todo lo que lleva dentro
// lo puede leer cualquiera. Si la llave de Qwen fuera en la app, cualquiera
// podría sacarla y gastar a cuenta de Néstor — el mismo agujero que se cerró
// con Twelve Data el 2026-09-03. Así que la app NO habla con Qwen: habla con
// este puente, y el puente es el único que tiene la llave.
//
// Lo que hace, en este orden, en cada pregunta:
//   1. Comprueba que quien pregunta tiene sesión en la app (su token de
//      Firebase) y que su ficha dice `aprobado`. Lo pregunta a Firestore CON
//      EL TOKEN DE LA PERSONA: las reglas solo dejan leer la ficha propia, así
//      que si el token es falso Firestore contesta que no, y no hace falta
//      ninguna llave más aquí.
//   2. Cuenta sus consultas del día: 5 por suscripción (decisión de Néstor,
//      2026-11-14). Quien quiera más se las pide al desarrollador.
//   3. Arma la consulta con las instrucciones de ESTE archivo — la app solo
//      manda la tarea y los datos, nunca las instrucciones — y se la pasa a
//      Qwen.
//
// ─────────────────────────────────────────────────────────────────────────
// ESTE ARCHIVO VIVE EN EL REPOSITORIO A PROPÓSITO, Y NO IMPORTA NADA
// ─────────────────────────────────────────────────────────────────────────
// Se pega entero en el editor de Cloudflare, igual que el reloj. Las
// instrucciones de Qwen (los prompts) viven AQUÍ y la sonda las importa de
// aquí: dos copias de las instrucciones se separarían en silencio, y entonces
// lo que se mide no sería lo que reciben los suscriptores.
//
// ⚠️ NO LLEVA NINGUNA LLAVE DENTRO, y el repositorio es PÚBLICO. La llave va
// como SECRETO de Cloudflare (`QWEN_KEY`). Los pasos con clics están en
// `puente-qwen/README.md`.
//
// ⚠️ CADA VERSIÓN DE LAS INSTRUCCIONES LLEVA NÚMERO Y FECHA (`VERSION`). Las
// instrucciones se pueden cambiar cuando no den resultado —lo decidió Néstor—
// pero los resultados de cada versión se cuentan APARTE: sumar los de antes y
// los de después da un número que no describe a ninguna de las dos.

export const VERSION = 'v1 · 2026-11-14'

// ─────────────────────────────────────────────────────────────────────────
// LO QUE NO CAMBIA ENTRE CONSULTAS
// ─────────────────────────────────────────────────────────────────────────
export const PROYECTO_FIREBASE = 'nestor-forex'
// El mismo correo que `firestore.rules` y `firebase.js`: ya es público ahí.
export const CORREO_ADMIN = 'nesdian2204@gmail.com'

// Solo estas dos páginas pueden llamar al puente desde un navegador. El resto
// del mundo recibe la respuesta sin el permiso de CORS y el navegador la tira.
export const ORIGENES = ['https://nestor-forex.github.io', 'http://localhost:5173', 'http://localhost:4173']

export const LIMITE_DIARIO = 5
// El administrador prueba la app mucho más que nadie; con 5 no podría.
export const LIMITE_ADMIN = 50
// Un techo para TODA la cuenta en un día, por encima del de cada persona. Si
// algo se pone a repetir (un fallo en la app, alguien con muchas cuentas), esto
// corta antes de que llegue el tope de gasto de Alibaba.
export const TECHO_DIARIO_TOTAL = 400

// Colombia no cambia la hora en el año: el día se cuenta en su hora (UTC−5),
// que es la de Néstor y la de casi todos los suscriptores que se esperan. Con
// UTC el contador se reiniciaría a las 7 de la tarde.
export const DESFASE_HORAS = -5

export const MODELOS = Object.freeze({
  flash: 'qwen3.8-flash',
  plus: 'qwen3.7-plus',
  max: 'qwen3.8-max',
})

// La primera es la que se vio en la ficha de cada modelo en qwencloud.com; la
// segunda, la que trae la documentación de Model Studio. La sonda dice cuál
// responde de verdad, y la que no, se quita.
export const DIRECCIONES = [
  'https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1',
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
]

// ─────────────────────────────────────────────────────────────────────────
// LAS INSTRUCCIONES
// ─────────────────────────────────────────────────────────────────────────
// La frase final de toda explicación. Es la MISMA que `explica.noEsSenal` de
// `app/src/lib/i18n/textos/es.js` — la prueba comprueba que no se separen.
export const AVISO_FINAL =
  'Esto no es una señal ni una recomendación de comprar o vender. Es información para que entiendas la noticia: la decisión de operar es solo tuya.'

export const SISTEMA_COMUN = `Eres el asistente de las apps Nestor Forex (Swing e Intradía), apps de INFORMACIÓN para operar Forex.
Reglas que no se rompen nunca:
1. Los números los pone la app. Están en DATOS. No cambies ninguno, no inventes precios, niveles, tasas ni porcentajes, y si falta un dato di que falta.
2. No ejecutas operaciones ni das señales para copiar. La decisión es siempre de la persona.
3. Los términos de trading no se traducen: RSI, ATR, EMA, Stop-loss, Take-profit, Pip, Spread, R/B, COT, Forex.
4. Hablas con personas que pueden ser principiantes: frases cortas y sin jerga sin explicar.`

export const SISTEMA_EXPLICA = `${SISTEMA_COMUN}
Tu tarea: explicar en palabras sencillas una noticia o un dato del calendario económico que la persona no entiende.
- Escribe en español, en un solo bloque de texto plano (sin títulos, sin listas, sin negritas), de 120 palabras como mucho.
- Di qué es el dato o la noticia, por qué lo mira un banco central y qué significa cada sigla del nombre.
- Si DATOS trae lo previsto y lo anterior, di solo si lo previsto es MÁS ALTO, MÁS BAJO o IGUAL que lo anterior, con los dos números tal cual. Explica que lo que suele mover el precio es la SORPRESA: la diferencia entre lo que sale y lo previsto.
- PROHIBIDO decir hacia dónde puede ir el precio o la divisa: nada de comprar, vender, alcista, bajista, fortalecer, debilitar, subirá, bajará ni parecidos. Solo si un dato sale alto o bajo.
- Termina SIEMPRE con esta frase exacta, sin cambiarle nada: "${AVISO_FINAL}"`

// ⚠️ PROMPT 4 TAL CUAL, como lo decidió Néstor el 2026-11-14 (está copiado de
// `notas/qwen-conversacion.md`). Lo único que se le añade son los datos de la
// app y el formato de la respuesta, que hace falta para poder MEDIRLO.
export const PROMPT_4 = `Actúa como un Auditor de Riesgo y Gestión de Capital de una mesa de dinero (prop firm). Voy a ejecutar una operación y necesito que audites y estructures mi plan.
Datos de entrada: Par: {par} · Dirección: {direccion} · Precio de entrada planeado: {entrada} · Nivel de Stop Loss (Invalidación lógica): {sl} · Nivel de Take Profit 1 (Liquidez parcial): {tp1} · Nivel de Take Profit 2 (Objetivo final): {tp2} · Tamaño de mi cuenta: {cuenta} · Riesgo máximo por operación que permito: {riesgo}.
Tu tarea: Calcula el Ratio Riesgo/Beneficio (R:R) para TP1 y TP2. Calcula el tamaño de la posición exacta en lotes (asumiendo un valor estándar de pip para ese par) para que la pérdida máxima sea exactamente el {riesgo} de la cuenta. Usa el intérprete de código para este cálculo si es necesario. Evalúa críticamente el plan: ¿El Stop Loss está en un lugar lógico de invalidación o es demasiado ajustado para el ruido del par? ¿El TP es realista en el contexto del rango diario promedio (ATR)? Dame un veredicto final: 'APROBADO', 'APROBADO CON AJUSTES' o 'RECHAZADO', con una breve justificación.`

export const SISTEMA_AUDITA = `${SISTEMA_COMUN}
Vas a auditar un plan de operación. La app YA calculó el R/B, el lote y el riesgo en dólares con el perfil de la persona: están en DATOS. Úsalos tal cual; si tu cuenta te diera otra cosa, usa el de la app y dilo en "justificacion".
Además del veredicto, di si el plan cumple las reglas del propio perfil de la persona (riesgo por operación y el freno del día que trae DATOS).
Responde SOLO con un objeto JSON, sin texto antes ni después y sin \`\`\`, con exactamente estas claves:
{"veredicto": "APROBADO" | "APROBADO CON AJUSTES" | "RECHAZADO",
 "rr_tp1": número, "rr_tp2": número o null,
 "lote": número,
 "stop_logico": "si" | "no" | "dudoso",
 "tp_realista": "si" | "no" | "dudoso",
 "cumple_perfil": true | false,
 "numeros_usados": {"entrada": número, "sl": número, "tp1": número},
 "justificacion": "texto en español de 60 palabras como mucho"}`

// ⚠️ PROMPT 3 TAL CUAL. El posicionamiento minorista NO lo tiene la app (se
// buscó en seis fuentes el 2026-09-14 y ninguna lo publica de forma
// utilizable): se le dice que falta, en vez de inventarlo.
export const PROMPT_3 = `Actúa como un Gestor de Fondos de Cobertura especializado en análisis de sentimiento contrarian. Evalúa el entorno de sentimiento para el par {par}.
Datos de entrada: Posicionamiento minorista (Retail Sentiment): {minorista} · Datos COT (Commitment of Traders) más recientes: {cot} · Correlación con materias primas: {materias}.
Tu tarea: Aplica la lógica contrarian: ¿El posicionamiento minorista sugiere una trampa de liquidez? Explica por qué. Evalúa si el flujo institucional (COT y correlaciones) confirma o contradice el movimiento actual del precio. Concluye con una puntuación de convicción del 1 al 10 sobre la probabilidad de una operación en la dirección del flujo institucional.`

export const SISTEMA_SENTIMIENTO = `${SISTEMA_COMUN}
Si un dato de entrada dice NO DISPONIBLE, no lo inventes: dilo y razona solo con lo que hay.
Responde SOLO con un objeto JSON, sin texto antes ni después y sin \`\`\`, con exactamente estas claves:
{"trampa_minorista": "si" | "no" | "sin dato",
 "flujo_institucional": "confirma" | "contradice" | "neutral" | "sin dato",
 "conviccion": número entero del 1 al 10,
 "datos_que_faltan": [lista de textos],
 "justificacion": "texto en español de 60 palabras como mucho"}`

export const TAREAS = Object.freeze({
  explica: { sistema: SISTEMA_EXPLICA, maxTokens: 400, formato: 'texto' },
  audita: { sistema: SISTEMA_AUDITA, maxTokens: 600, formato: 'json' },
  sentimiento: { sistema: SISTEMA_SENTIMIENTO, maxTokens: 600, formato: 'json' },
})

// Rellena {clave} con el valor; lo que falte queda como «no hay» en vez de
// como «{clave}», que Qwen leería como parte del texto.
export function rellenar(plantilla, valores) {
  return plantilla.replace(/\{(\w+)\}/g, (_, k) => {
    const v = valores?.[k]
    return v === undefined || v === null || v === '' ? 'no hay' : String(v)
  })
}

/**
 * Los mensajes que se le mandan a Qwen para una tarea. La app solo elige la
 * TAREA y manda los DATOS; las instrucciones salen de aquí. Así nadie puede
 * cambiar desde el teléfono lo que Qwen tiene prohibido.
 */
export function mensajesDe(tarea, datos) {
  const t = TAREAS[tarea]
  if (!t) return null
  const d = datos && typeof datos === 'object' ? datos : {}
  let usuario
  if (tarea === 'audita') {
    usuario = `${rellenar(PROMPT_4, d.prompt ?? {})}\n\nDATOS (los pone la app):\n${JSON.stringify(d.analisis ?? null)}`
  } else if (tarea === 'sentimiento') {
    usuario = `${rellenar(PROMPT_3, d.prompt ?? {})}\n\nDATOS (los pone la app):\n${JSON.stringify(d.contexto ?? null)}`
  } else {
    usuario = `Explícame esto en palabras sencillas.\n\nDATOS (los pone la app):\n${JSON.stringify(d)}`
  }
  return [
    { role: 'system', content: t.sistema },
    { role: 'user', content: usuario },
  ]
}

// ─────────────────────────────────────────────────────────────────────────
// HABLAR CON QWEN
// ─────────────────────────────────────────────────────────────────────────
// Siempre en modo continuo (stream): con el «modo de pensar» encendido algunos
// modelos de Qwen solo responden así, y leerlo continuo vale igual para los
// dos casos. Al final pide el recuento de tokens, que es lo que se cobra.

/** Lee una respuesta continua (SSE) de Qwen y la junta. */
export function juntarSSE(texto) {
  let contenido = ''
  let razonamiento = ''
  let uso = null
  let modelo = null
  for (const linea of String(texto).split('\n')) {
    const l = linea.trim()
    if (!l.startsWith('data:')) continue
    const cuerpo = l.slice(5).trim()
    if (!cuerpo || cuerpo === '[DONE]') continue
    let j
    try {
      j = JSON.parse(cuerpo)
    } catch {
      continue
    }
    if (j.model) modelo = j.model
    if (j.usage) uso = j.usage
    const d = j.choices?.[0]?.delta
    if (d?.content) contenido += d.content
    if (d?.reasoning_content) razonamiento += d.reasoning_content
  }
  return { contenido, razonamiento, uso, modelo }
}

/**
 * Una consulta a Qwen. Devuelve siempre un objeto: `{ ok: true, … }` o
 * `{ ok: false, estado, detalle }`. Nunca lanza por un fallo de Qwen, para que
 * quien llama pueda devolver la consulta al contador.
 */
export async function preguntarQwen({ llave, direccion, modelo, mensajes, maxTokens = 600, pensar = false, temperatura = 0.15, fetchFn = fetch }) {
  const t0 = Date.now()
  let r
  try {
    r = await fetchFn(`${direccion}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${llave}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        messages: mensajes,
        temperature: temperatura,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        enable_thinking: pensar,
      }),
    })
  } catch (e) {
    return { ok: false, estado: 0, detalle: `sin conexión: ${e?.message ?? e}`, ms: Date.now() - t0 }
  }
  const texto = await r.text()
  if (!r.ok) return { ok: false, estado: r.status, detalle: texto.slice(0, 300), ms: Date.now() - t0 }
  const j = juntarSSE(texto)
  return { ok: true, ...j, ms: Date.now() - t0 }
}

// ─────────────────────────────────────────────────────────────────────────
// QUIÉN PREGUNTA
// ─────────────────────────────────────────────────────────────────────────

function b64urlAJson(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = b + '='.repeat((4 - (b.length % 4)) % 4)
  return JSON.parse(atob(relleno))
}

/**
 * Lee el token de Firebase SIN fiarse de él: solo saca el uid y comprueba que
 * es de este proyecto y no ha caducado. Quien comprueba la firma de verdad es
 * Firestore en `fichaDe`, que rechaza un token falso.
 */
export function leerToken(token, ahoraMs = Date.now()) {
  if (typeof token !== 'string') return null
  const partes = token.split('.')
  if (partes.length !== 3) return null
  let p
  try {
    p = b64urlAJson(partes[1])
  } catch {
    return null
  }
  if (p.aud !== PROYECTO_FIREBASE) return null
  if (p.iss !== `https://securetoken.google.com/${PROYECTO_FIREBASE}`) return null
  if (!(typeof p.exp === 'number' && p.exp * 1000 > ahoraMs)) return null
  const uid = p.user_id || p.sub
  if (typeof uid !== 'string' || !/^[A-Za-z0-9]{10,128}$/.test(uid)) return null
  return { uid, email: typeof p.email === 'string' ? p.email.toLowerCase() : null }
}

/** La ficha de la persona, leída CON SU token. `null` si Firestore no la da. */
export async function fichaDe(uid, token, fetchFn = fetch) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROYECTO_FIREBASE}/databases/(default)/documents/users/${uid}`
  let r
  try {
    r = await fetchFn(url, { headers: { authorization: `Bearer ${token}` } })
  } catch {
    return null
  }
  if (!r.ok) return null
  const j = await r.json()
  const f = j?.fields ?? {}
  return {
    estado: f.estado?.stringValue ?? null,
    email: f.email?.stringValue?.toLowerCase() ?? null,
  }
}

/** El día de hoy en la hora de Colombia, como 'AAAA-MM-DD'. */
export function diaLocal(ahoraMs = Date.now()) {
  return new Date(ahoraMs + DESFASE_HORAS * 3600 * 1000).toISOString().slice(0, 10)
}

export function limiteDe(email) {
  return email && email === CORREO_ADMIN ? LIMITE_ADMIN : LIMITE_DIARIO
}

// ─────────────────────────────────────────────────────────────────────────
// LA PUERTA
// ─────────────────────────────────────────────────────────────────────────

function cabecerasCors(origen) {
  const h = { 'content-type': 'application/json; charset=utf-8', vary: 'origin' }
  if (ORIGENES.includes(origen)) {
    h['access-control-allow-origin'] = origen
    h['access-control-allow-headers'] = 'authorization, content-type'
    h['access-control-allow-methods'] = 'POST, OPTIONS'
  }
  return h
}

function responder(cuerpo, estado, origen) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: cabecerasCors(origen) })
}

/**
 * Atiende una pregunta. Separado de `fetch` para poder probarlo sin Cloudflare:
 * todo lo de fuera (Qwen, Firestore, el contador) entra por `env` y `fetchFn`.
 */
export async function atender(req, env, { fetchFn = fetch, ahoraMs = Date.now() } = {}) {
  const origen = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabecerasCors(origen) })
  if (req.method === 'GET') return responder({ ok: true, version: VERSION }, 200, origen)
  if (req.method !== 'POST') return responder({ ok: false, codigo: 'metodo' }, 405, origen)

  // ⚠️ Sin llave o sin contador no se atiende a nadie, y se dice. Un puente
  // que contesta «nada» en silencio se confunde con uno que funciona.
  if (!env.QWEN_KEY) return responder({ ok: false, codigo: 'sinLlave' }, 503, origen)
  if (!env.CUENTAS) return responder({ ok: false, codigo: 'sinContador' }, 503, origen)

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const quien = leerToken(token, ahoraMs)
  if (!quien) return responder({ ok: false, codigo: 'sinSesion' }, 401, origen)

  const ficha = await fichaDe(quien.uid, token, fetchFn)
  if (!ficha) return responder({ ok: false, codigo: 'sinSesion' }, 401, origen)
  const esAdmin = quien.email === CORREO_ADMIN
  if (ficha.estado !== 'aprobado' && !esAdmin) return responder({ ok: false, codigo: 'noAprobado' }, 403, origen)

  let pedido
  try {
    pedido = await req.json()
  } catch {
    return responder({ ok: false, codigo: 'pedidoRaro' }, 400, origen)
  }
  const tarea = pedido?.tarea
  if (!TAREAS[tarea]) return responder({ ok: false, codigo: 'tareaDesconocida' }, 400, origen)
  // Los datos de una consulta normal ocupan unos pocos KB. Un tope evita que
  // alguien mande un libro entero y lo pague Néstor.
  if (JSON.stringify(pedido.datos ?? null).length > 20000) return responder({ ok: false, codigo: 'datosGrandes' }, 413, origen)
  const modelo = MODELOS[pedido.modelo] ?? env.QWEN_MODELO ?? MODELOS.plus

  // ── El contador ────────────────────────────────────────────────────────
  // ⚠️ Se cuenta ANTES de preguntar y se devuelve si Qwen falla. Al revés, dos
  // preguntas a la vez podrían pasar las dos por la última consulta del día.
  // El contador de Cloudflare (KV) tarda unos segundos en ponerse de acuerdo
  // consigo mismo, así que en el peor caso alguien saca una consulta de más:
  // es aceptable, y lo que no lo sería es que le faltara una que pagó.
  const dia = diaLocal(ahoraMs)
  const claveUsuario = `u:${quien.uid}:${dia}`
  const claveTotal = `t:${dia}`
  const usadas = Number(await env.CUENTAS.get(claveUsuario)) || 0
  const total = Number(await env.CUENTAS.get(claveTotal)) || 0
  const limite = limiteDe(quien.email)
  if (usadas >= limite) return responder({ ok: false, codigo: 'limiteDiario', usadas, limite }, 429, origen)
  if (total >= TECHO_DIARIO_TOTAL) return responder({ ok: false, codigo: 'techoTotal' }, 429, origen)
  const dosDias = 2 * 24 * 3600
  await env.CUENTAS.put(claveUsuario, String(usadas + 1), { expirationTtl: dosDias })
  await env.CUENTAS.put(claveTotal, String(total + 1), { expirationTtl: dosDias })

  const r = await preguntarQwen({
    llave: env.QWEN_KEY,
    direccion: env.QWEN_DIRECCION || DIRECCIONES[0],
    modelo,
    mensajes: mensajesDe(tarea, pedido.datos),
    maxTokens: TAREAS[tarea].maxTokens,
    fetchFn,
  })

  if (!r.ok) {
    await env.CUENTAS.put(claveUsuario, String(usadas), { expirationTtl: dosDias })
    await env.CUENTAS.put(claveTotal, String(total), { expirationTtl: dosDias })
    console.log(`Qwen falló (${modelo}): ${r.estado} ${r.detalle}`)
    return responder({ ok: false, codigo: 'qwenFallo' }, 502, origen)
  }

  return responder(
    {
      ok: true,
      tarea,
      version: VERSION,
      modelo,
      texto: r.contenido,
      usadas: usadas + 1,
      limite,
      tokens: r.uso ? { entrada: r.uso.prompt_tokens ?? null, salida: r.uso.completion_tokens ?? null } : null,
    },
    200,
    origen
  )
}

export default {
  async fetch(req, env) {
    try {
      return await atender(req, env)
    } catch (e) {
      console.log(`✗ puente: ${e?.stack ?? e}`)
      return responder({ ok: false, codigo: 'interno' }, 500, req.headers.get('origin') || '')
    }
  },
}
