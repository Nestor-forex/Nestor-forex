// ¿LLEGAN A SU HORA LOS PROGRAMAS DE LAS DOS APPS? — las cuentas puras.
//
// ─────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE
// ─────────────────────────────────────────────────────────────────────────
// Néstor, el 2026-10-06: «veo que continúa el mismo problema con lo de GitHub
// que va a seguir enviando reportes retardados, eso no nos sirve así… no
// podemos dar un barrido con horas de retraso, eso sería irresponsable».
//
// Tenía razón, y lo medido ese día era PEOR de lo que yo le había contado:
//
//   · una entrada de cron que dispara CADA HORA → dispara el 21 % de las veces
//     (110 de 528 en 22 días hábiles), y cuando dispara llega ~29 min tarde;
//   · una entrada que dispara UNA VEZ AL DÍA → dispara casi siempre y llega
//     entre CINCO y OCHO HORAS tarde. Todos los días. A cualquier hora.
//
// Ejemplos crudos de ese día, leídos de la API de Actions:
//   `tasas` pedido a las 06:20 UTC → disparó a 11:42, 12:06, 12:24, 12:39,
//   12:56, 13:21, 13:59, 14:45 en días seguidos.
//   `cot` pedido a las 07:20 UTC → 12:37, 13:16, 13:51, 14:07, 14:15, 16:09.
//
// ⚠️ Y LO QUE ESO DESCARTA, que era el arreglo más barato posible: **mover el
// cron a otra hora NO sirve.** Se midió a las 06:20, 07:20, 07:50 y 13:00 y
// las cuatro llegan igual de tarde. No es una ventana de carga: es el
// comportamiento del reloj.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ POR QUÉ ESTO EXISTE COMO HERRAMIENTA Y NO COMO UNA NOTA
// ─────────────────────────────────────────────────────────────────────────
// Porque el problema es INVISIBLE. Un cron que llega cinco horas tarde no
// falla: el workflow sale verde, el archivo se publica y nadie se entera. El
// único síntoma es que Néstor abre la app a media mañana y ve el dato de ayer
// — y eso se confunde con mil cosas.
//
// Y porque cualquier arreglo que se intente (un reloj de fuera que llame a
// `workflow_dispatch`) hay que PODER COMPROBAR. Sin esto, «parece que ya va
// mejor» sería una impresión, y este proyecto lleva meses aprendiendo que una
// impresión convincente no es un resultado.
//
// Separado del guion que lo lanza para que se pueda probar sin red.

// `schedule` da la hora a la que GitHub CREÓ la corrida, que es lo que se
// quiere medir: el retraso del reloj, no el de la cola. (La espera en cola
// está medida en 0 s sobre 600 corridas de las dos apps, así que el retraso
// que se ve es entero del reloj.)
//
// ⚠️ UN CRON PUEDE LLEGAR TAN TARDE QUE PASE DE MEDIANOCHE. Un `0 23 * * *`
// que dispara a las 02:00 del día siguiente llevaría 3 horas de retraso, no
// −21. Por eso el ajuste da la vuelta al día cuando el resultado sale muy
// negativo — y el umbral no es 0 sino −120 minutos, porque GitHub también
// dispara ocasionalmente unos SEGUNDOS ANTES de la hora pedida y eso no es
// «un día de retraso».
const VUELTA_DIA = 24 * 60
const ADELANTO_TOLERADO = 120

export function retrasoEnMinutos(programadoHHMM, creadoISO) {
  if (typeof programadoHHMM !== 'string' || typeof creadoISO !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(programadoHHMM.trim())
  if (!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (hh > 23 || mm > 59) return null

  const t = new Date(creadoISO)
  if (Number.isNaN(t.getTime())) return null

  const minutosDelDia = t.getUTCHours() * 60 + t.getUTCMinutes()
  let d = minutosDelDia - (hh * 60 + mm)
  if (d < -ADELANTO_TOLERADO) d += VUELTA_DIA
  return d
}

// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ CON VARIAS ENTRADAS DE CRON, CUÁL DE ELLAS DISPARÓ LA CORRIDA
// ─────────────────────────────────────────────────────────────────────────
//
// Un programa puede tener varias horas pedidas: el vigía de Swing tiene tres
// (15:50, 16:20 y 16:50 UTC). Una corrida suelta no dice de cuál viene, así
// que hay que atribuirla, y la atribución cambia el número que se imprime.
//
// 📌 LA PRIMERA VERSIÓN USABA `Math.min` DE TODOS LOS RETRASOS, y eso no es
// «la entrada más cercana»: es la que da el número más NEGATIVO. El 2026-10-22
// el reloj de fuera pulsó el vigía a las 15:20 y salió **−90 min** (medido
// contra las 16:50, la entrada más lejana) cuando lo honesto es **−30**, que
// es lo que se adelantó a la primera hora pedida. El veredicto era correcto
// —llegar antes de la hora es puntual de sobra— pero el número describía otra
// cosa, que es la familia de fallo que este proyecto lleva meses
// coleccionando. Y el comentario del guion decía «la entrada MÁS CERCANA por
// debajo», que no era lo que hacía.
//
// La regla, que es la que de verdad describe lo que pasó:
//
//   · si alguna entrada queda EN o ANTES de la corrida (retraso ≥ 0), la
//     disparó la ÚLTIMA de ésas → el MENOR de los retrasos no negativos;
//   · si la corrida llegó antes que TODAS (todos negativos), es el reloj de
//     fuera adelantándose, y lo que se dice es cuánto se adelantó a la
//     primera → el MAYOR, o sea el menos negativo.
//
// ⚠️ Para una corrida genuinamente tarde las dos reglas coinciden (con todos
// los retrasos positivos, `Math.min` ya era el menor), así que esto NO toca
// ningún número de los días malos: solo arregla los adelantos y los casos
// mezclados. Tiene comprobación propia.
export function retrasoMasProbable(programados, creadoISO) {
  const ds = (Array.isArray(programados) ? programados : [])
    .map((h) => retrasoEnMinutos(h, creadoISO))
    .filter((d) => d !== null)
  if (!ds.length) return null
  const noNegativos = ds.filter((d) => d >= 0)
  return noNegativos.length ? Math.min(...noNegativos) : Math.max(...ds)
}

// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ UNA CORRIDA POR DÍA, LA MÁS TEMPRANA — Y ESTO ARREGLA UN FALLO REAL
// ─────────────────────────────────────────────────────────────────────────
//
// La primera versión resumía TODAS las corridas juntas, y con el reloj de
// fuera puesto eso es una pregunta mal hecha. El reloj nuevo NO apaga el de
// GitHub: los dos disparan, así que cada día hay dos corridas del mismo
// programa — la del reloj, puntual, y la de GitHub, cinco horas tarde.
//
// Preguntando «¿qué tan tarde llega la corrida MEDIANA?» con una puntual y
// una tarde cada día, la del medio es siempre la tarde:
//
//     `tasas`, 22 de octubre de 2026
//       06:20:50  ← el reloj de fuera, clavado
//       11:56:55  ← GitHub, 5 h 36 min tarde
//       mediana de las dos = la tarde  →  INSERVIBLE
//
// O sea que ese número **no podía ponerse verde nunca**, con el arreglo ya
// funcionando y el dato llegando a su hora todos los días. Y encima el
// informe decía «o su token caducó, o dejó de pulsar», que habría mandado a
// Néstor a buscar a Cloudflare un problema que no existía.
//
// Es la familia que este proyecto lleva meses coleccionando: un número bien
// calculado que describe otra cosa de la que dice describir.
//
// La pregunta buena es **«¿llegó el dato a su hora ESE DÍA?»**, y para eso
// solo cuenta la corrida más temprana: una vez publicado el barrido a las
// 06:20, que GitHub lo vuelva a publicar a las 11:56 no le quita nada a
// nadie.
//
// ⚠️ SE AGRUPA POR EL DÍA QUE LE TOCABA, NO POR EL DÍA EN QUE LLEGÓ. Se
// resta el retraso a la hora de creación, así que una corrida de las 19:20
// que dispara a la 01:20 cuenta en el día anterior, que es al que pertenece.
// Agrupar por el día de llegada la movería de día y dejaría un día sin
// corrida y otro con dos.
export function mejorPorDia(items) {
  const porDia = new Map()
  for (const it of Array.isArray(items) ? items : []) {
    const r = it?.retraso
    if (typeof r !== 'number' || !Number.isFinite(r)) continue
    const t = new Date(it?.creadoISO)
    if (Number.isNaN(t.getTime())) continue
    const dia = new Date(t.getTime() - r * 60000).toISOString().slice(0, 10)
    const antes = porDia.get(dia)
    if (antes === undefined || r < antes) porDia.set(dia, r)
  }
  return [...porDia.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([dia, retraso]) => ({ dia, retraso }))
}

// Las cuentas de una lista de retrasos. Devuelve `null` —no 0— cuando no hay
// nada que resumir: «no se pudo mirar» y «llega puntual» no son lo mismo, que
// es la misma asimetría que `pearson` y `yaCorrioHoy`.
export function resumir(retrasos) {
  const v = retrasos.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const pct = (p) => v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))]
  return {
    n: v.length,
    mediana: pct(50),
    p90: pct(90),
    max: v[v.length - 1],
    masDeDosHoras: v.filter((x) => x > 120).length,
    aTiempo: v.filter((x) => x <= 15).length,
  }
}

// ⚠️ EL VEREDICTO SE CALCULA, NO SE ARGUMENTA — igual que en los preregistros.
//
// Y los umbrales no son de gusto, salen de para qué sirve cada cosa:
//
//   · 15 minutos es «a tiempo». El barrido de Swing se calcula sobre la vela
//     del día; un cuarto de hora no cambia ninguna decisión.
//   · 120 minutos es el listón que separa «tarde» de «inútil». Dos horas
//     después, quien abrió la app a su hora ya se fue.
//
// El veredicto mira la MEDIANA y no el peor caso: un día malo pasa, pero si la
// mitad de los días llega tarde, es el sistema.
export const A_TIEMPO_MIN = 15
export const INUTIL_MIN = 120

// ⚠️⚠️ Y LA MEDIANA SOLA NO BASTA PARA CAZAR UN RELOJ MUERTO.
//
// Con una ventana de 30 días, si el reloj de fuera dejara de pulsar hoy, los
// días buenos que ya están dentro sostendrían la mediana durante dos semanas:
// la herramienta escrita para avisar de ese fallo tardaría quince días en
// avisar. Y el fallo es plausible y silencioso — el token de GitHub que usa
// el reloj CADUCA, y el día que caduque todo vuelve a llegar tarde sin que
// nada falle.
//
// Por eso se mira además la RACHA: cuántos días seguidos, contando desde el
// más reciente, no llegó a su hora. Tres días seguidos no es mala suerte.
//
// ⚠️ Se cuentan días CON CORRIDA, no días de calendario, así que un fin de
// semana en el que el programa no corre no rompe la racha ni la alarga.
export const RACHA_MALA = 3

export function rachaMala(porDia) {
  const v = Array.isArray(porDia) ? porDia : []
  let n = 0
  for (let i = v.length - 1; i >= 0; i--) {
    const r = v[i]?.retraso
    if (typeof r !== 'number' || !Number.isFinite(r) || r > A_TIEMPO_MIN) n++
    else break
  }
  return n
}

export function juzgar(res, racha = 0) {
  if (!res) return { veredicto: 'noSePudoMirar', porque: 'no hay corridas programadas que medir' }
  // La racha manda sobre la mediana, y solo en esta dirección: puede condenar
  // a un programa que la ventana todavía da por bueno, nunca salvar a uno que
  // la ventana da por malo. Equivocarse hacia «mira esto» cuesta abrir un log;
  // al revés cuesta justo lo que esta herramienta existe para cazar.
  if (racha >= RACHA_MALA) {
    return {
      veredicto: 'inservible',
      porque: `los últimos ${racha} días con corrida NO llegaron a su hora — esto apunta al reloj de fuera, no a la ventana`,
    }
  }
  if (res.mediana <= A_TIEMPO_MIN) {
    return { veredicto: 'aTiempo', porque: `la mitad de las corridas llega en ${res.mediana} min o menos` }
  }
  if (res.mediana <= INUTIL_MIN) {
    return { veredicto: 'tarde', porque: `mediana de ${res.mediana} min — llega, pero ya no a su hora` }
  }
  return {
    veredicto: 'inservible',
    porque: `mediana de ${Math.round(res.mediana / 60)} h de retraso · ${res.masDeDosHoras} de ${res.n} corridas con más de dos horas`,
  }
}

// Cuántas HORAS DISTINTAS del día vio un programa que debería mirar cada hora.
//
// ⚠️⚠️ ES LO QUE HAY QUE CONTAR, Y NO «CUÁNTAS CORRIDAS HUBO». Está escrito en
// el PR del 2026-10-06: si los retrasos amontonan varias entradas de cron en la
// misma hora, `concurrency` las pone en cola y GitHub cancela la pendiente, así
// que diez corridas pueden cubrir cinco horas. Para el historial lo que vale es
// cuántas horas distintas se miraron, porque una señal que vive una hora solo
// queda anotada si alguien miró ESA hora.
// ⚠️⚠️ Y SOLO SE PROMEDIAN DÍAS COMPLETOS. Esto se arregló el 2026-10-30
// porque la herramienta dio una falsa alarma: decía que el vigía de Intradía
// cubría «19,0 de 24 horas (79 %)» cuando los días completos cubrían **24 de
// 24**. Dos artefactos la hundían, y ninguno era de las apps:
//
//   · `corridas()` trae como mucho 3 páginas = 300 corridas, y ese vigía deja
//     ~43 al día, así que el día MÁS VIEJO de la ventana llega a medias. La
//     herramienta lo contaba como un día de verdad con dos horas («peor día 2»).
//   · y el día de HOY va a medias por definición: a las 10 de la mañana no
//     puede haber mirado 24 horas.
//
// 📌 Es el tercer artefacto de medición de ese mismo día, y el patrón es
// siempre el mismo: un número bien calculado que describe otra cosa de la que
// dice describir. Antes de creer que una app está mal, comprobar que la
// herramienta mide lo que dice medir.
//
// ⚠️ Quitar días hace que el número salga MEJOR, que es la dirección
// peligrosa: esta herramienta existe para cazar un reloj muerto. Por eso el
// día de hoy NO se tira en silencio — se devuelve aparte en `hoy`, medido
// contra las horas que de verdad han transcurrido, así que un reloj que muera
// esta mañana se sigue viendo. Y los días omitidos se NOMBRAN en el informe:
// un descarte que no se dice es un descarte en el que nadie puede confiar.
// ⚠️⚠️ Y EL TERCER ARTEFACTO, EL MÁS TONTO: LOS FINES DE SEMANA. El vigía de
// Intradía corre de lunes a viernes, pero las corridas que GitHub dispara con
// cinco horas de retraso el viernes por la noche **caen en sábado**, así que
// aparecía un «sábado con 2 horas de 24» que era puro desbordamiento. Medido el
// 2026-10-30: los cinco días hábiles iban a 24 de 24 y el sábado a 2, y de ahí
// salía el «85 %». Por eso ahora se le pasan los días que al programa le TOCA
// correr —los mismos que `worker.js` tiene en su `dias`— y los demás se nombran
// y se dejan fuera. Contar como «cobertura perdida» un día en que el programa
// no debe correr es medir otra cosa.
export function horasCubiertas(creadosISO, { truncado = false, ahora = new Date(), diasQueToca = null } = {}) {
  const porDia = new Map()
  for (const iso of creadosISO) {
    const t = new Date(iso)
    if (Number.isNaN(t.getTime())) continue
    const dia = t.toISOString().slice(0, 10)
    if (!porDia.has(dia)) porDia.set(dia, new Set())
    porDia.get(dia).add(t.getUTCHours())
  }
  if (!porDia.size) return null

  const todos = [...porDia.keys()].sort()
  const omitidos = []

  // El día de hoy, aparte y contra las horas transcurridas.
  const diaDeHoy = ahora.toISOString().slice(0, 10)
  let hoy = null
  if (porDia.has(diaDeHoy)) {
    hoy = { dia: diaDeHoy, horas: porDia.get(diaDeHoy).size, deLasPosibles: ahora.getUTCHours() + 1 }
    omitidos.push(`${diaDeHoy} (hoy, va a medias)`)
  }

  // Los días en que al programa no le toca correr.
  let completos = todos.filter((d) => d !== diaDeHoy)
  if (Array.isArray(diasQueToca) && diasQueToca.length) {
    const noToca = completos.filter((d) => !diasQueToca.includes(new Date(`${d}T12:00:00Z`).getUTCDay()))
    if (noToca.length) omitidos.push(`${noToca.join(', ')} (no le toca correr)`)
    completos = completos.filter((d) => !noToca.includes(d))
  }

  // El más viejo, solo si la descarga se quedó corta: ahí no falta cobertura,
  // falta archivo.
  if (truncado && completos.length > 1) {
    omitidos.push(`${completos[0]} (la descarga se quedó corta)`)
    completos.shift()
  }

  if (!completos.length) return { dias: 0, omitidos, hoy, mediaHorasPorDia: null, peorDia: null }

  const cuentas = completos.map((d) => porDia.get(d).size)
  return {
    dias: completos.length,
    desde: completos[0],
    hasta: completos[completos.length - 1],
    mediaHorasPorDia: cuentas.reduce((a, b) => a + b, 0) / cuentas.length,
    peorDia: Math.min(...cuentas),
    omitidos,
    hoy,
  }
}
