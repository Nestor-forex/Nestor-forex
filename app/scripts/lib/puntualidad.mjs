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
export function horasCubiertas(creadosISO) {
  const porDia = new Map()
  for (const iso of creadosISO) {
    const t = new Date(iso)
    if (Number.isNaN(t.getTime())) continue
    const dia = t.toISOString().slice(0, 10)
    if (!porDia.has(dia)) porDia.set(dia, new Set())
    porDia.get(dia).add(t.getUTCHours())
  }
  if (!porDia.size) return null
  const dias = [...porDia.keys()].sort()
  const cuentas = dias.map((d) => porDia.get(d).size)
  return {
    dias: dias.length,
    desde: dias[0],
    hasta: dias[dias.length - 1],
    mediaHorasPorDia: cuentas.reduce((a, b) => a + b, 0) / cuentas.length,
    peorDia: Math.min(...cuentas),
  }
}
