// MANDAR AL CELULAR LOS AVISOS QUE PROGRAMÓ CADA PERSONA.
//
// Esto es la PIEZA 3 de la herramienta que Néstor pidió el 2026-10-30. Las dos
// primeras ya estaban: `src/lib/alertas.js` DECIDE si un aviso suena y
// `src/components/MisAvisos.jsx` deja programarlo. Hasta hoy la pantalla
// programaba avisos y **no sonaba ninguno**, porque nadie leía el precio y
// mandaba la notificación. Esto es ese programa.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ ESTO NO ES EL VIGÍA, Y LA DIFERENCIA ES LA QUE MANDA SOBRE TODO
// ─────────────────────────────────────────────────────────────────────────
// `push-envio.mjs` manda las SEÑALES de la app: las decide la app, van a todos
// los suscriptores de esa app, y están **en pausa** mientras las reglas se
// revisan (`AVISOS_PAUSADOS`).
//
// Esto manda el aviso que una persona se puso A SÍ MISMA. Por eso:
//
//   · **NO pasa por `AVISOS_PAUSADOS`.** Esa pausa existe porque las señales
//     de la app no están validadas; aquí el nivel lo puso la persona y no hay
//     nada nuestro que validar. Dejarlo en pausa sería no mandar nunca lo que
//     alguien pidió expresamente, por un motivo que no le aplica.
//   · **NO filtra por app.** `push-envio.mjs` solo escribe a los aparatos con
//     `app === 'swing'`, y hace bien: una señal de Swing no es de Intradía. Un
//     aviso, en cambio, es **de la PERSONA**, así que va a todos sus aparatos
//     — se lo puso donde se lo puso.
//   · **NO lleva filtro de R/B** ni de ninguna otra clase. Un aviso no es una
//     oportunidad que haya que juzgar: es un hecho que alguien pidió saber.
//
// ⚠️ VIVE SOLO EN SWING, como el robot de vencimientos y por el mismo motivo:
// las DOS apps comparten la colección `users` del mismo proyecto de Firebase,
// así que dos programas mandando los mismos avisos sonarían dos veces. Lee los
// barridos de las dos (son públicos) para poder juzgar un aviso de RSI con la
// temporalidad que le corresponda.
//
// No gasta un crédito de Twelve Data: lee tres archivos ya publicados.

import { mensajeDe, queMandar } from '../../src/lib/alertas.js'
import { posicionDe } from '../../src/lib/bollinger.js'

// Las dos apps que pueden haber creado un aviso.
export const APPS = Object.freeze(['swing', 'intradia'])

// ⚠️⚠️ CUÁNTO PUEDE TENER EL BARRIDO PARA QUE UN AVISO DE INDICADOR SUENE.
//
// No es el mismo número en las dos apps y copiarlo sería el fallo de
// `barridoSwap`: el barrido de Swing se publica **dos veces al día** y el de
// Intradía **una vez por hora**, así que un dato de tres horas es normal allá
// y es viejo acá.
//
// Los dos salen de `HORAS_VIEJO` de `useMarketData.js` de cada app, que es el
// umbral con el que la propia pantalla pinta el aviso ámbar de «foto vieja».
// Si el celular y la pantalla usaran umbrales distintos, la app diría que el
// dato está fresco y el aviso no sonaría, o al revés.
//
// ⚠️ El de Intradía va ESCRITO A MANO y no hay forma de evitarlo: su
// `useMarketData.js` vive en el otro repositorio y esta prueba corre sin red.
// Es la misma situación que los 4 pares de Intradía en `prueba-mt5.mjs`. El de
// Swing sí se comprueba contra su archivo, leyéndolo como texto.
export const EDAD_BARRIDO_MIN = Object.freeze({ swing: 26 * 60, intradia: 2 * 60 })

/**
 * De qué app es un aviso, o `null` si no lo dice.
 *
 * ⚠️⚠️ UN AVISO SIN APP NO PUEDE DISPARAR POR INDICADOR, y es deliberado.
 *
 * «RSI 30» no significa lo mismo en las dos apps: en Swing es el RSI de velas
 * DIARIAS y en Intradía el de velas de UNA HORA. Un aviso que no dice de dónde
 * viene no se puede juzgar sin adivinar qué pidió la persona — y adivinar en
 * la dirección que SUENA es exactamente el aviso falso que
 * `EDAD_MAXIMA_PRECIO_MIN` existe para impedir, colado por otra puerta.
 *
 * Los de PRECIO sí suenan: el bid y el ask salen del puente de MT5, que es uno
 * y el mismo para las dos apps, así que ahí no hay nada que adivinar.
 *
 * Esto solo afecta a los avisos creados ANTES del 2026-10-31, que es cuando se
 * empezó a guardar el campo. Volver a crearlos lo arregla.
 */
export function appDe(aviso) {
  return APPS.includes(aviso?.app) ? aviso.app : null
}

/**
 * Agrupa los avisos de una persona por la app que los creó.
 *
 * La clave `null` es el grupo de los que no lo dicen. Se devuelve aparte —en
 * vez de repartirlos a una app por descarte— porque es la quinta vez que una
 * condición escrita por descarte se traga en silencio lo que vino después
 * (`esSombra`, `ventasPausadas`, `esDeLaApp`, `filasOtras`, la regla de
 * Firestore). Aquí lo que viene después es un aviso viejo, y su sitio es su
 * propio montón contado en el registro.
 */
export function agruparPorApp(avisos) {
  const grupos = { swing: [], intradia: [], sinApp: [] }
  for (const a of Array.isArray(avisos) ? avisos : []) {
    if (!a || typeof a !== 'object') continue
    const app = appDe(a)
    grupos[app ?? 'sinApp'].push(a)
  }
  return grupos
}

/**
 * Lo que `estadoDe` necesita de cada par: el precio del puente y, si hay
 * barrido, el RSI y el %B de ESA app.
 *
 * ⚠️ Cuando no hay barrido —o el aviso no dice de qué app es— los dos campos
 * técnicos salen `undefined` A PROPÓSITO, y no hay ningún caso especial que
 * escribir: `estadoDe` ya devuelve `sinDato` ante un valor que no es finito.
 * La asimetría sale del motor que ya existe en vez de de una condición nueva
 * que alguien pudiera olvidar.
 *
 * @param mt5     lo que publica el puente: { actualizadoEl, pares: { 'EUR/USD': {bid, ask} } }
 * @param barrido lo que publica el vigía de esa app, o null
 */
export function datosPorPar(mt5, barrido) {
  const salida = {}
  const precioEl = typeof mt5?.actualizadoEl === 'string' ? mt5.actualizadoEl : null
  const tecnicoEl = typeof barrido?.generadoEl === 'string' ? barrido.generadoEl : null

  for (const [par, v] of Object.entries(mt5?.pares || {})) {
    salida[par] = { bid: Number(v?.bid), ask: Number(v?.ask), precioEl }
  }

  for (const p of barrido?.pares || []) {
    if (!p?.name) continue
    const fila = salida[p.name] || (salida[p.name] = { precioEl })
    fila.rsi = p.rsiV
    // El %B no viaja en el barrido: se calcula de los 20 cierres que sí
    // viajan. `posicionDe` devuelve `null` —nunca 0— cuando no se puede.
    const pb = posicionDe(p)
    if (pb !== null) fila.posB = pb
    fila.tecnicoEl = tecnicoEl
  }

  return salida
}

/**
 * Qué hay que mandarle a UNA persona en esta vuelta.
 *
 * Devuelve `{ envios, avisos, cambios, sinApp }`:
 *   · `envios`  → [{ aviso, estado, motivo }] listos para notificar
 *   · `avisos`  → la lista COMPLETA ya marcada, para guardarla de una vez
 *   · `cambios` → cuántos se marcaron (0 = no hay que escribir nada)
 *   · `sinApp`  → cuántos avisos de indicador se saltaron por no decir su app
 */
export function prepararEnvios(avisos, datosPorApp, { ahora = new Date() } = {}) {
  const grupos = agruparPorApp(avisos)
  const envios = []

  for (const clave of ['swing', 'intradia', 'sinApp']) {
    if (!grupos[clave].length) continue
    const app = clave === 'sinApp' ? null : clave
    envios.push(
      ...queMandar(grupos[clave], app ? datosPorApp[app] : datosPorApp.soloPrecio, {
        ahora,
        edadMaximaTecnicoMin: app ? EDAD_BARRIDO_MIN[app] : null,
      })
    )
  }

  // Los avisos de indicador sin app que se quedaron fuera, para poder contarlos
  // en el registro. Un montón que no suena y que nadie cuenta es un montón que
  // no existe.
  const sinApp = grupos.sinApp.filter((a) => a.tipo !== 'precio' && !a.disparadaEl).length

  const iso = ahora.toISOString()
  const porId = new Map(envios.map((e) => [e.aviso.id, e]))
  let cambios = 0
  const marcados = (Array.isArray(avisos) ? avisos : []).map((a) => {
    const e = a?.id ? porId.get(a.id) : null
    if (!e) return a
    cambios++
    const veces = Number.isFinite(Number(a.veces)) ? Number(a.veces) : 0
    return e.motivo === 'nuevo'
      ? { ...a, disparadaEl: iso, sonadaEl: iso, veces: 1 }
      : { ...a, sonadaEl: iso, veces: veces + 1 }
  })

  return { envios, avisos: marcados, cambios, sinApp }
}

/**
 * Recorre las fichas y manda lo que toque. El corazón del programa.
 *
 * ⚠️⚠️ ESTO VIVE AQUÍ Y NO DENTRO DEL GUION A PROPÓSITO. Dentro del guion no se
 * podría probar: ese archivo necesita credenciales y red en cuanto se importa.
 * Y de este bucle salen las cuatro decisiones que pueden hacer sonar un
 * celular de más o de menos, que es justo lo que no puede quedar sin
 * comprobar. Es la lección del 2026-09-02 con `medir()`.
 *
 * Lo de fuera entra como funciones (`enviar`, `marcar`) para que la prueba
 * pueda contar lo que habría pasado sin tocar Firestore ni despertar a nadie.
 *
 * @param fichas      las de `users`, ya planchadas: { id, ruta, estado, avisos }
 * @param subsPorUid  Map uid → [aparatos]
 * @param datos       { swing, intradia, soloPrecio } de `datosPorPar`
 * @param enviar      async (aparato, aviso, estado, motivo, dato) → 'ok' | 'muerta' | 'fallo'
 * @param marcar      async (ruta, avisos) — escribe la ficha. Si lanza, NO se manda
 * @param aplicar     en false no se marca ni se manda: solo se cuenta
 */
export async function mandarATodos({
  fichas = [],
  subsPorUid = new Map(),
  datos,
  enviar,
  marcar,
  ahora = new Date(),
  aplicar = false,
  seAcabaEn = Infinity,
}) {
  const r = {
    fichas: fichas.length,
    conAvisos: 0,
    candidatos: 0,
    enviados: 0,
    fallidos: 0,
    sinApp: 0,
    sinAparato: 0,
    noSeMarco: 0,
    sinTiempo: 0,
  }
  const muertas = new Set()

  for (const ficha of fichas) {
    const avisos = Array.isArray(ficha?.avisos) ? ficha.avisos : []
    if (!avisos.length) continue
    r.conAvisos++

    // ⚠️ SOLO A QUIEN TIENE LA PUERTA ABIERTA. El candado de la app es
    // `estado === 'aprobado'` (`useAuthUser.js`) y el robot de vencimientos lo
    // cierra solo. Mandarle avisos a alguien retirado sería darle el producto
    // por una puerta de atrás — y encima avisos que no puede entrar a ver.
    if (ficha.estado !== 'aprobado') continue

    const { envios, avisos: marcados, cambios, sinApp } = prepararEnvios(avisos, datos, { ahora })
    r.sinApp += sinApp
    if (!envios.length) continue
    r.candidatos += envios.length

    const aparatos = (subsPorUid.get(ficha.id) || []).filter((s) => !muertas.has(s.ruta))
    // ⚠️ SIN APARATO NO SE MARCA NADA. Marcar un aviso como «ya sonó» cuando no
    // había a quién mandárselo lo escondería para siempre: la persona vería
    // «ya sonó» de algo que nunca le llegó, y para volver a armarlo tendría
    // que adivinar que eso fue lo que pasó.
    if (!aparatos.length) {
      r.sinAparato += envios.length
      continue
    }

    // ⚠️⚠️ SE MARCA ANTES DE MANDAR, Y ES LA DECISIÓN MÁS DELICADA DE AQUÍ.
    //
    // Al revés —mandar y luego marcar— un fallo al escribir dejaría el aviso
    // sin marca, y volvería a sonar en la vuelta siguiente, y en la siguiente:
    // **sin límite**, porque el contador `veces` tampoco subiría. Un celular
    // que suena cada 15 minutos para siempre es el único fallo que destruye el
    // producto, y en este proyecto está escrito que una alarma que suena sin
    // motivo enseña a ignorar todas las demás.
    //
    // Marcando antes, el peor caso es un aviso PERDIDO: la pantalla dirá «ya
    // sonó» de algo que no llegó y se arregla con un toque en «volver a
    // armar». Acotado contra ilimitado: los dos errores no valen lo mismo.
    if (aplicar && cambios) {
      try {
        await marcar(ficha.ruta, marcados)
      } catch {
        // Si no se pudo marcar, NO se manda: mandar sin marca es el camino al
        // aviso que suena para siempre.
        r.noSeMarco += envios.length
        continue
      }
    }

    for (const envio of envios) {
      const dato = (datos[envio.aviso.app] ?? datos.soloPrecio)?.[envio.aviso.par]
      for (const sub of aparatos) {
        if (muertas.has(sub.ruta)) continue
        if (Date.now() > seAcabaEn) {
          r.sinTiempo++
          continue
        }
        const res = aplicar ? await enviar(sub, envio, dato) : 'ok'
        if (res === 'muerta') muertas.add(sub.ruta)
        else if (res === 'ok') r.enviados++
        else r.fallidos++
      }
    }
  }

  return { ...r, muertas: [...muertas] }
}

/**
 * El texto de la notificación, en el idioma de quien la recibe.
 *
 * ⚠️ El cuerpo lo arma `mensajeDe` (GEMELO) como CLAVE + HUECOS, nunca como
 * frase: este programa corre en Node y no sabe el idioma de nadie. Traduce
 * quien pinta, con el idioma que esa persona guardó al suscribirse.
 *
 * ⚠️ Y un RECORDATORIO lleva otro título a propósito. Sin eso, el segundo
 * aviso se lee como que el precio volvió a tocar el nivel — una afirmación
 * falsa sobre el mercado. `tocaRepetir` no vuelve a mirar el precio justo por
 * eso, así que el texto tampoco puede insinuarlo.
 */
export function armarNotificacion(t, { aviso, estado, motivo }, dato) {
  const { clave, params } = mensajeDe(aviso, estado, dato)
  return {
    titulo: t(motivo === 'recordatorio' ? 'misAvisos.notiTituloRecordatorio' : 'misAvisos.notiTitulo', { par: aviso.par }),
    cuerpo: t(clave, params),
    // Si llegara repetido, el segundo reemplaza al primero en la bandeja en vez
    // de apilarse. Mismo criterio que los avisos de señal.
    tag: `aviso|${aviso.id}`,
    // Abre la app en la pestaña de avisos, que es donde se ve y donde el hecho
    // de abrirla **para** los recordatorios.
    url: './?tab=avisos',
    en: new Date().toISOString(),
  }
}
