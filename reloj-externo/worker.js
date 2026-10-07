// EL RELOJ DE FUERA — un Cloudflare Worker que pulsa los botones de GitHub.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ EXISTE
// ─────────────────────────────────────────────────────────────────────────
// Medido el 2026-10-06 sobre 30 días: de 162 corridas programadas con hora
// fija en las dos apps, CERO llegaron a tiempo. Retraso mediano de 3 a 7
// horas, en los seis horarios distintos que se probaron. Los que deberían
// mirar cada hora cubren el 18-29 % de las horas.
//
// Y lo que SÍ funciona, medido también: `workflow_dispatch` arranca en 7-10
// segundos, y la espera en cola es 0 s en las 600 corridas de las dos apps.
// O sea que todo el retraso está en que GitHub decida CREAR la corrida, y eso
// solo le pasa a `schedule`.
//
// Así que esto no arregla el reloj de GitHub: lo SUSTITUYE por el de
// Cloudflare, que sí dispara, y usa la puerta que sí responde al instante.
//
// ⚠️ LOS CRONES DE GITHUB SE QUEDAN PUESTOS, y es a propósito. Si Cloudflare
// falla —y su documentación dice que los cron triggers no se reintentan ni
// avisan— volvemos al 21 % de hoy, no a cero. Un suelo, no un reemplazo.
//
// ⚠️⚠️ Y POR ESO LOS GUIONES NECESITAN EL GUARDIÁN DE LA HORA. Con dos relojes
// pulsando el mismo botón, el vigía de Intradía correría hasta 47 veces al día
// (24 de aquí + 23 de GitHub) = 329 créditos de los 800, en vez de 168. El
// guardián está en `app/scripts/lib/vigia-nucleo.mjs` de Intradía
// (`yaCorrioEstaHora`) y es lo que hace que dos relojes cuesten lo mismo que
// uno. Ver la nota de CLAUDE.md: la primera vez escribí que ese guardián
// SOBRABA, y era cierto **con un solo reloj**. Con dos, hace falta.
//
// ─────────────────────────────────────────────────────────────────────────
// ESTE ARCHIVO VIVE EN EL REPOSITORIO A PROPÓSITO
// ─────────────────────────────────────────────────────────────────────────
// La mitad de Python del puente de MT5 se guardó solo en el computador de
// Néstor y se perdió — está escrito en CLAUDE.md con fecha. No se repite: lo
// que se pega en el panel de Cloudflare se pega DESDE AQUÍ, y si algún día
// hay que rehacerlo, está aquí.
//
// ⚠️ NO LLEVA NINGÚN TOKEN DENTRO, y los dos repositorios son PÚBLICOS. El
// token va como SECRETO de Cloudflare (`NF_ACTIONS_TOKEN`), que es cifrado y
// no se puede volver a leer desde su panel. Los pasos con clics están en
// `reloj-externo/README.md`.
//
// ⚠️ Y NO IMPORTA NADA. Tiene que poder pegarse entero en el editor de
// Cloudflare, así que no puede depender de ningún otro archivo. Por eso la
// LISTA DE PROGRAMAS vive aquí y los demás la importan de aquí —
// `app/scripts/medir-puntualidad.mjs` entre ellos— en vez de tener cada uno su
// copia. Una sola lista escrita a mano; dos copias se separarían en silencio,
// que es el fallo que este proyecto lleva meses cerrando.

// ─────────────────────────────────────────────────────────────────────────
// LOS PROGRAMAS PROGRAMADOS DE LAS DOS APPS
// ─────────────────────────────────────────────────────────────────────────
// Están TODOS, también los que el reloj NO pulsa, con el motivo escrito. Esa
// segunda mitad es documentación pura y vale tanto como la primera: evita que
// alguien añada un pulso que no debería existir, y hace que un programa nuevo
// no pueda quedarse fuera sin que nadie lo decida.
//
// ⚠️ VA ESCRITA A MANO, igual que GEMELOS y PRIMOS, y por el mismo motivo:
// calcularla leyendo los `.yml` sería más cómodo y dejaría de avisar en cuanto
// alguien renombrara un workflow — un `dispatches` a un nombre que ya no
// existe devuelve 404 y no rompe nada visible.
//
// ⚠️ Y `programado` / `minuto` / `dias` SE COMPRUEBAN contra los `.yml` reales
// de los dos repositorios por `app/scripts/prueba-reloj-externo.mjs`. No es
// adorno: al estrenar esa prueba cazó que aquí decía que el reporte de Swing
// era a las 15:55 cuando su cron dice **15:30**, y la medición de puntualidad
// llevaba ese mismo error dentro — 25 minutos de retraso menos del real.
//
// Las horas son UTC, las mismas que llevan los crones, para que las dos listas
// se puedan comparar de un vistazo. Colombia es UTC−5.
//
// ⚠️ `dias` son los días de la semana que pide el cron, 0=domingo … 6=sábado
// como `getUTCDay`. Lanzar el vigía un sábado gastaría créditos sin mercado.
// Los calendarios SÍ corren el fin de semana, porque el feed cubre la semana en
// curso y el lunes por la mañana haría falta (está razonado en
// `calendario.yml`).
//
// ⚠️ LA REGLA PARA DECIDIR SI SE PULSA: solo se pulsa lo que es INOFENSIVO
// CORRER DOS VECES EN LA MISMA HORA, porque GitHub sigue pulsando también. Lo
// que no cumpla eso se queda fuera aunque llegue tarde.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ `minutoPulso`: POR QUÉ CADA PROGRAMA TIENE SU MINUTO (desde 2026-10-07)
// ─────────────────────────────────────────────────────────────────────────
// La primera versión de este reloj tenía UN SOLO cron (`20 * * * *`) y pulsaba
// todo lo de la hora en serie, o sea en el mismo segundo. Funcionó, y por eso
// mismo rompió algo:
//
//   15:20:51  Intradía · vigía .............  7 créditos  ✓
//   15:20:53  Intradía · publicador ........  7 créditos  ✓
//   15:20:54  Swing · vigía ................ 14 créditos  ✗ HTTP 429
//   15:20:56  Swing · reporte ..............  7 créditos  ✓
//
// **35 consultas en 5 segundos contra un límite de 8 por minuto.** Las DOS apps
// comparten la misma llave de Twelve Data, así que comparten el límite. El que
// murió fue el vigía de Swing, que es justo el que escribe el historial — lo
// único irrecuperable del proyecto. Reintentó tres veces con 65 s de espera y
// las tres le dijeron no.
//
// 📌 Antes no pasaba porque el reloj de GitHub era tan errático que nunca
// coincidían. **Al llegar puntuales, coinciden por diseño.** El arreglo de una
// cosa destapó un fallo que la avería anterior tapaba.
//
// Así que el cron de Cloudflare pasa a ser `* * * * *` (cada minuto) y cada
// programa dice en qué minuto se pulsa. Los que piden precios van separados
// 3 minutos, que es de sobra: cada guion pide 7 de golpe y espera 65 s antes de
// la siguiente tanda, así que su segunda tanda cae ~1,1 min después.
//
// ⚠️ SI EL CRON DE CLOUDFLARE SE QUEDA EN `20 * * * *` esto NO se rompe en
// silencio, y es a propósito: en el minuto 20 va el **vigía de Swing** —el más
// importante y el que falló— más todos los que no gastan créditos. O sea que
// sin tocar nada el fallo reportado ya queda arreglado, y lo que se perdería
// son los otros pulsos, que `puntualidad.yml` canta al día siguiente nombrando
// uno por uno. Los crones de GitHub siguen puestos como suelo.
const HABILES = [1, 2, 3, 4, 5]
const TODOS = [0, 1, 2, 3, 4, 5, 6]

// Los minutos de los programas que PIDEN PRECIOS, separados 3 minutos. El 20
// es el primero a propósito (ver arriba: es el único minuto que seguro se
// invoca, porque es el cron que ya existía).
const M_VIGIA_SWING = 20
const M_VIGIA_INTRADIA = 23
const M_PUBLICADOR_INTRADIA = 26
const M_PUBLICADOR_SWING = 29
const M_REPORTE_SWING = 32
const M_REPORTE_INTRADIA = 35
const M_ORO_SWING = 38

// Y el minuto de todo lo que NO gasta créditos de Twelve Data: calendarios
// (ForexFactory), tasas (BIS) y COT (CFTC). Pueden ir todos juntos porque no
// comparten ninguna cuota con nadie.
const M_SIN_CREDITOS = 20

export const PROGRAMAS = [
  // ───────────────────────────────────────────────────────────────────────
  // Intradía: los dos que miran CADA HORA. Son los que el reloj de GitHub
  // dejaba en el 18 % y el 29 % de cobertura, y los que más se juegan — cada
  // hora que no se mira es una hora de historial que no vuelve.
  // ───────────────────────────────────────────────────────────────────────
  {
    repo: 'Nestor-forex-intradia',
    wf: 'vigia.yml',
    nombre: 'Intradía · vigía',
    programado: 'cada',
    minuto: 20,
    dias: HABILES,
    mide: 'cobertura',
    cadaHoras: 1,
    pulsar: 'cada',
    creditos: 7,
    minutoPulso: M_VIGIA_INTRADIA,
  },
  {
    repo: 'Nestor-forex-intradia',
    wf: 'publicar-barrido.yml',
    nombre: 'Intradía · publicador del barrido',
    programado: 'cada',
    minuto: 5,
    dias: HABILES,
    mide: 'cobertura',
    cadaHoras: 1,
    pulsar: 'cada',
    creditos: 7,
    minutoPulso: M_PUBLICADOR_INTRADIA,
  },

  // ───────────────────────────────────────────────────────────────────────
  // Swing: el vigía trabaja UNA VEZ AL DÍA.
  // ───────────────────────────────────────────────────────────────────────
  {
    repo: 'Nestor-forex',
    wf: 'vigia.yml',
    nombre: 'Swing · vigía',
    programado: ['15:50', '16:20', '16:50'],
    dias: HABILES,
    mide: 'retraso',
    // ⚠️ SE PULSA UNA VEZ Y NO TRES. Sus tres intentos existen porque el reloj
    // de GitHub falla; aquí el reloj sí dispara, así que uno basta — y si éste
    // fallara, los tres de GitHub siguen puestos como suelo. `yaCorrioHoy` se
    // encarga de que el que llegue segundo no gaste un crédito.
    pulsar: ['15:50'],
    creditos: 14,
    // ⚠️ EL MINUTO 20 ES SUYO A PROPÓSITO. Es el que murió con el 429 del
    // 2026-10-07 y el que escribe el historial, así que se queda con el único
    // minuto que seguro se invoca aunque nadie toque el cron de Cloudflare.
    minutoPulso: M_VIGIA_SWING,
  },
  {
    repo: 'Nestor-forex',
    wf: 'publicar-barrido.yml',
    nombre: 'Swing · publicar el barrido',
    programado: ['11:20', '19:20'],
    dias: HABILES,
    mide: 'retraso',
    // ⚠️ SÍ se pulsa, y cumple la regla de arriba: correrlo dos veces en la
    // misma hora es INOFENSIVO — reescribe el mismo archivo y no toca el
    // historial ni manda avisos. Y aun así lleva `yaCorrioEstaHora`, porque
    // repetir cuesta 14 créditos y aquí no son gratis como en Intradía.
    //
    // Las dos horas son las que arreglan la queja de Néstor del 2026-10-07: el
    // barrido tiene que estar puesto a las 6:20 am de Colombia, cuando él abre
    // la app, y refrescarse otra vez por la tarde.
    pulsar: ['11:20', '19:20'],
    creditos: 14,
    minutoPulso: M_PUBLICADOR_SWING,
  },
  {
    repo: 'Nestor-forex',
    wf: 'reporte-diario.yml',
    nombre: 'Swing · reporte diario',
    // 10:30 a. m. en Colombia. ⚠️ Aquí decía 15:55 y era FALSO: lo cazó la
    // prueba al compararlo con el `.yml`.
    programado: ['15:30'],
    dias: HABILES,
    mide: 'retraso',
    pulsar: ['15:30'],
    creditos: 7,
    minutoPulso: M_REPORTE_SWING,
  },

  // ───────────────────────────────────────────────────────────────────────
  // Los diarios que no son urgentes pero sí deberían llegar a su hora.
  // ───────────────────────────────────────────────────────────────────────
  {
    repo: 'Nestor-forex',
    wf: 'tasas.yml',
    nombre: 'Swing · tasas',
    programado: ['06:20'],
    dias: TODOS,
    mide: 'retraso',
    pulsar: ['06:20'],
    // Lee el BIS, no Twelve Data: no gasta créditos.
    minutoPulso: M_SIN_CREDITOS,
  },
  {
    repo: 'Nestor-forex',
    wf: 'cot.yml',
    nombre: 'Swing · COT',
    programado: ['07:20'],
    dias: TODOS,
    mide: 'retraso',
    pulsar: ['07:20'],
    // Lee la CFTC: no gasta créditos.
    minutoPulso: M_SIN_CREDITOS,
  },
  {
    repo: 'Nestor-forex',
    wf: 'oro.yml',
    nombre: 'Swing · oro',
    programado: ['07:50'],
    dias: HABILES,
    mide: 'retraso',
    pulsar: ['07:50'],
    // 1 el oro + 14 los 14 pares de la correlación. Es el que más gasta y el
    // que más tarda (tres tandas), así que va ÚLTIMO.
    creditos: 15,
    minutoPulso: M_ORO_SWING,
  },
  {
    repo: 'Nestor-forex-intradia',
    wf: 'reporte-diario.yml',
    nombre: 'Intradía · reporte diario',
    programado: ['13:00'],
    dias: HABILES,
    mide: 'retraso',
    pulsar: ['13:00'],
    creditos: 7,
    minutoPulso: M_REPORTE_INTRADIA,
  },
  {
    repo: 'Nestor-forex-intradia',
    wf: 'tasas.yml',
    nombre: 'Intradía · tasas',
    programado: ['06:20'],
    dias: TODOS,
    mide: 'retraso',
    pulsar: ['06:20'],
    minutoPulso: M_SIN_CREDITOS,
  },

  // ───────────────────────────────────────────────────────────────────────
  // Los calendarios, cada 4 horas y TODOS los días. ⚠️ Aquí decía minuto 10 y
  // su cron es `0 */4 * * *`: minuto 0.
  // ───────────────────────────────────────────────────────────────────────
  {
    repo: 'Nestor-forex',
    wf: 'calendario.yml',
    nombre: 'Swing · calendario',
    programado: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    dias: TODOS,
    mide: 'cobertura',
    cadaHoras: 4,
    pulsar: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    // Lee ForexFactory: no gasta créditos.
    minutoPulso: M_SIN_CREDITOS,
  },
  {
    repo: 'Nestor-forex-intradia',
    wf: 'calendario.yml',
    nombre: 'Intradía · calendario',
    programado: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    dias: TODOS,
    mide: 'cobertura',
    cadaHoras: 4,
    pulsar: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    // Lee ForexFactory: no gasta créditos.
    minutoPulso: M_SIN_CREDITOS,
  },

  // ───────────────────────────────────────────────────────────────────────
  // LOS QUE EL RELOJ NO PULSA, CON EL MOTIVO. No sobra: sin esta mitad, un
  // programa nuevo se quedaría fuera por olvido y parecería una decisión.
  // ───────────────────────────────────────────────────────────────────────
  {
    repo: 'Nestor-forex',
    wf: 'respaldo-historial.yml',
    nombre: 'Swing · respaldo del historial',
    programado: ['04:20'],
    dias: [0],
    mide: 'retraso',
    pulsar: null,
    noPulsaPorque:
      'Compara la copia de hoy con la de la semana pasada y se pone en rojo si ' +
      'algo encogió. Correrlo dos veces el mismo día lo dejaría comparando la ' +
      'copia de hoy contra la copia de hoy, y esa alarma vigila lo ÚNICO ' +
      'irrecuperable del proyecto. Un retraso de horas no le hace nada; ' +
      'tocarle la lógica de comparación, sí.',
  },
  {
    repo: 'Nestor-forex-intradia',
    wf: 'respaldo-historial.yml',
    nombre: 'Intradía · respaldo del historial',
    programado: ['04:20'],
    dias: [0],
    mide: 'retraso',
    pulsar: null,
    noPulsaPorque:
      'El mismo motivo que el de Swing: correrlo dos veces el mismo día lo ' +
      'dejaría comparando la copia de hoy contra la copia de hoy.',
  },
  {
    repo: 'Nestor-forex',
    wf: 'vencimientos.yml',
    nombre: 'Swing · cerrar vencidos',
    programado: ['05:40'],
    dias: TODOS,
    mide: 'retraso',
    pulsar: null,
    noPulsaPorque:
      'Lleva un día de gracia (`DIAS_GRACIA = 1`), así que un retraso de horas ' +
      'no le cuesta el acceso a nadie. Y es el único programa que ESCRIBE en ' +
      'Firestore: no se le añade un segundo disparador por comodidad.',
  },
  {
    repo: 'Nestor-forex',
    wf: 'gemelos.yml',
    nombre: 'Swing · gemelos',
    programado: ['06:40'],
    dias: TODOS,
    mide: 'retraso',
    pulsar: null,
    noPulsaPorque:
      'Es una comprobación, no un dato que alguien abra. Que el aviso de que ' +
      'las dos apps se separaron llegue cinco horas tarde no cambia nada.',
  },
  {
    repo: 'Nestor-forex-intradia',
    wf: 'gemelos.yml',
    nombre: 'Intradía · gemelos',
    programado: ['06:40'],
    dias: TODOS,
    mide: 'retraso',
    pulsar: null,
    noPulsaPorque: 'El mismo motivo que el de Swing: es una comprobación y su retraso no cuesta nada.',
  },
  {
    repo: 'Nestor-forex',
    wf: 'puntualidad.yml',
    nombre: 'Swing · puntualidad',
    programado: ['04:35'],
    dias: TODOS,
    mide: 'retraso',
    pulsar: null,
    noPulsaPorque:
      'Mide los últimos 30 días, así que la hora a la que corra no cambia su ' +
      'resultado. Es el único programa del proyecto al que su propio retraso ' +
      'no le afecta — está escrito en su propio `.yml`.',
  },
]

// Decide qué toca en esta HORA, sin mirar el minuto. Separado del `scheduled`
// para que se pueda probar sin red ni Cloudflare:
// `prueba-reloj-externo.mjs` lo importa.
//
// ⚠️ `diaSemana` es 0=domingo … 6=sábado, como `getUTCDay`.
export function toca(programas, hora, diaSemana) {
  return programas.filter((p) => {
    if (!p.pulsar) return false
    if (!p.dias.includes(diaSemana)) return false
    if (p.pulsar === 'cada') return true
    return p.pulsar.some((hhmm) => Number(hhmm.slice(0, 2)) === hora)
  })
}

// Y lo que toca en ESTE MINUTO, que es lo que el reloj pulsa de verdad.
//
// ⚠️⚠️ ESTA FUNCIÓN ES EL ARREGLO DEL 429 del 2026-10-07. Sin ella, todo lo de
// la hora se pulsaba en el mismo segundo y las dos apps se peleaban por los 8
// créditos por minuto de la llave que COMPARTEN. El porqué entero está arriba,
// donde se definen los minutos.
//
// ⚠️ Un programa que se pulsa y NO tiene `minutoPulso` se trata como si fuera
// del minuto 20, no se descarta. Los dos errores no cuestan lo mismo: caerse al
// minuto 20 lo deja como estaba antes de este arreglo —que funcionaba, con el
// choque— mientras que descartarlo lo dejaría SIN PULSAR en silencio, que es
// justo lo que este reloj existe para evitar. Y hay una comprobación en
// `prueba-reloj-externo.mjs` que falla si alguno se queda sin minuto, para que
// este respaldo no se use nunca de verdad.
export function tocaEnEsteMinuto(programas, hora, minuto, diaSemana) {
  return toca(programas, hora, diaSemana).filter((p) => (p.minutoPulso ?? 20) === minuto)
}

async function pulsar(p, token) {
  const url = `https://api.github.com/repos/Nestor-forex/${p.repo}/actions/workflows/${p.wf}/dispatches`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // GitHub rechaza las peticiones sin User-Agent.
      'User-Agent': 'NestorForex-reloj-externo',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main' }),
  })
  // Un dispatch correcto devuelve 204 SIN CUERPO. Cualquier otra cosa es un
  // fallo y hay que poder leerlo: un 404 casi siempre significa que el
  // workflow se renombró o que al token le falta `Actions: write`, y las dos
  // cosas serían SILENCIOSAS sin este texto.
  if (r.status === 204) return { ok: true, repo: p.repo, wf: p.wf }
  const detalle = (await r.text()).slice(0, 200)
  return { ok: false, repo: p.repo, wf: p.wf, estado: r.status, detalle }
}

export default {
  // ⚠️ EL CRON DE CLOUDFLARE ES `* * * * *` (cada minuto). No es derroche: la
  // invocación de un minuto en el que no toca nada no hace ni una petición, y
  // 1.440 invocaciones al día caben de sobra en las 100.000 del plan gratuito.
  // Lo que compra es que cada programa pueda tener su propio minuto, que es el
  // arreglo del 429 — ver arriba.
  async scheduled(evento, env) {
    const t = new Date(evento.scheduledTime)
    const hora = t.getUTCHours()
    const minuto = t.getUTCMinutes()
    const pendientes = tocaEnEsteMinuto(PROGRAMAS, hora, minuto, t.getUTCDay())

    // El caso normal: en 52 de cada 60 minutos no toca nada. Se sale sin
    // pedirle nada a GitHub y sin mirar el token.
    if (!pendientes.length) return

    if (!env.NF_ACTIONS_TOKEN) {
      // ⚠️ Sin token no se pulsa nada, y hay que GRITARLO. Un Worker que no
      // hace nada en silencio es indistinguible de uno que funciona — el
      // mismo agujero que la herramienta de puntualidad tuvo al estrenarse.
      throw new Error('FALTA EL SECRETO NF_ACTIONS_TOKEN. No se pulsó nada.')
    }

    // En serie y no en paralelo, a propósito: son una docena de peticiones
    // como mucho y así el log sale en orden legible. El límite de CPU del
    // plan gratuito (10 ms) no cuenta la espera de red.
    const resultados = []
    for (const p of pendientes) resultados.push(await pulsar(p, env.NF_ACTIONS_TOKEN))

    const malos = resultados.filter((r) => !r.ok)
    for (const r of resultados) {
      console.log(r.ok ? `  ✓ ${r.repo} · ${r.wf}` : `  ✗ ${r.repo} · ${r.wf} → HTTP ${r.estado} ${r.detalle}`)
    }
    console.log(
      `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')} UTC · ` +
        `pulsados ${resultados.length - malos.length} de ${resultados.length}`
    )

    // ⚠️ Se LANZA el error cuando alguno falla. En Cloudflare eso marca la
    // invocación como fallida y aparece en su panel; sin esto, un token
    // caducado dejaría de pulsar y el panel seguiría en verde.
    if (malos.length) throw new Error(`${malos.length} programa(s) no se pudieron pulsar`)
  },

  // Una dirección para comprobar a mano que el Worker está vivo y qué haría
  // ahora mismo. NO pulsa nada: solo cuenta.
  //
  // ⚠️ NO dice si el token existe ni enseña nada de él. Que la página
  // responda no significa que el token sirva — eso solo lo dice una corrida
  // de verdad, y para eso está la herramienta de puntualidad.
  async fetch() {
    const t = new Date()
    const pendientes = toca(PROGRAMAS, t.getUTCHours(), t.getUTCDay())
    return new Response(
      `reloj externo de Nestor Forex\n` +
        `ahora: ${t.toISOString()}\n` +
        `en esta hora tocarían ${pendientes.length}, cada uno en su minuto:\n` +
        pendientes
          .slice()
          .sort((a, b) => (a.minutoPulso ?? 20) - (b.minutoPulso ?? 20))
          .map((p) => `  :${String(p.minutoPulso ?? 20).padStart(2, '0')}  ${p.repo} · ${p.wf}`)
          .join('\n') +
        `\n\nEsta página NO pulsa nada. Para saber si el reloj funciona de verdad:\n` +
        `Actions → «¿Llegan a su hora los programas?» en Nestor-forex.\n`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    )
  },
}
