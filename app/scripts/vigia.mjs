// Vigía diario del barrido de swing.
//
// Hermano del de Nestor Forex Intradía, con una diferencia de fondo: aquí
// corre UNA VEZ AL DÍA, no cada hora. Trabaja con velas diarias, así que
// revisarlas cada hora sería pedir lo mismo veinticuatro veces.
//
// Hace tres cosas:
//   1. Anota las señales NUEVAS respecto a la revisión anterior. Ese archivo
//      ES el historial: sin él no hay forma de decir si la app acierta.
//   2. Manda un aviso al celular de quien los tenga activados.
//   3. Publica el barrido ya calculado, que es lo que lee la app.
//
// Lo tercero merece explicación. Antes la app pedía los precios ella misma a
// Frankfurter, que es gratis e ilimitado. Twelve Data no lo es: 8 consultas
// por minuto y 800 al día. Si cada persona que abre la app pidiera los 14
// pares, con un puñado de miembros se acabaría la cuota, y con dos abriéndola
// a la vez fallaría. Así que la consulta se hace UNA vez al día aquí, y la
// app lee el resultado. Sale igual de fresco —las velas diarias cambian una
// vez al día— y aguanta los miembros que hagan falta.
//
// Los datos NO se guardan en esta rama: van a la rama `datos`, para que el
// historial del código no quede sepultado bajo un commit diario.

import { fileURLToPath } from 'node:url'
import { computarBarrido, derivarVista } from '../src/lib/marketCalc.js'
import { leerLlave, obtenerVelas } from './lib/velas.mjs'
import {
  compararConAnterior,
  escribir,
  esSombra,
  leerEstado,
  leerJsonl,
  separarSombra,
  yaCorrioHoy,
} from './lib/vigia-nucleo.mjs'
import { resolver, resumir } from './lib/resolver.mjs'
// La CUARTA regla en la sombra, desde el 2026-09-20. Viene del indicador que
// Néstor escribió para el concurso de TradingView, pero con sus tres señas de
// identidad quitadas: es una ruptura de estructura a secas. Ver la cabecera de
// `lib/lss-sombra.mjs` y el listón en `lib/preregistro-lss.mjs`, escrito antes
// de que se anotara ni una operación.
import { setupsLSS } from './lib/lss-sombra.mjs'
import { armarBarrido } from './lib/barrido-publicado.mjs'

const DATOS = process.env.VIGIA_DATOS || fileURLToPath(new URL('../../datos-local', import.meta.url))
const ESTADO = `${DATOS}/estado/vigia.json`
const LOG_SENALES = `${DATOS}/historial/senales.jsonl`
const LOG_CORRIDAS = `${DATOS}/historial/corridas.jsonl`
// El barrido ya calculado, que es lo que lee la app. Ver el comentario de
// abajo sobre por qué la app no pide los precios ella misma.
const BARRIDO = `${DATOS}/estado/barrido.json`
const LOG_RESULTADOS = `${DATOS}/historial/resultados.jsonl`

const ahora = new Date()

// ⚠️ ESTO VA ANTES DE PEDIR NADA, y ese es todo el truco.
//
// Desde el 2026-09-07 el vigía lo intenta TRES veces al día (15:50, 16:20 y
// 16:50 UTC) porque el reloj de GitHub se salta corridas: el viernes 5 no
// corrió ninguna vez y ese día de historial se perdió. Ver el comentario de
// `yaCorrioHoy` para el porqué y para por qué la duda se resuelve corriendo.
//
// Para que tres intentos sigan siendo UNA corrida al día, el segundo y el
// tercero se salen aquí si el primero ya hizo el trabajo — antes de
// `obtenerVelas`, así que en un día normal los dos sobrantes no gastan ni un
// crédito de Twelve Data ni tardan más de un segundo.
//
// Solo se aplica a los intentos automáticos: el workflow pone esta variable
// únicamente cuando el disparo es `schedule`. Lanzarlo a mano SIEMPRE corre,
// que es lo que uno quiere cuando le da al botón.
const estadoPrevio = leerEstado(ESTADO)
if (process.env.VIGIA_SOLO_SI_FALTA === '1' && yaCorrioHoy(estadoPrevio, ahora)) {
  console.log('---VIGIA-INICIO---')
  console.log(`Hoy ya corrió (${estadoPrevio.actualizadoEl}). Este intento no hace nada.`)
  console.log('---VIGIA-FIN---')
  process.exit(0)
}

const { fechas, rates, rangosPar } = await obtenerVelas(leerLlave())
const data = computarBarrido(fechas, rates, rangosPar)
// ⚠️ `incluirVentas` va encendido AQUÍ y solo aquí.
//
// Las ventas están pausadas: la app no las propone y nadie recibe aviso de
// ellas (ver `src/lib/reglas.js`). Pero si el vigía tampoco las anotara, no
// volveríamos a tener ni un dato nuevo sobre ellas y la pausa se volvería
// permanente sin que nadie lo decidiera — la única prueba disponible sería
// el backtest de siempre, sobre los mismos 219 días, para siempre.
//
// Así que se anotan en la sombra: se marcan con `sombra: true` y de ahí en
// adelante no existen para nadie. Solo acumulan operaciones reales hacia
// adelante, que es exactamente lo que hará falta el día que haya que decidir
// si vuelven.
//
// La app (`derivarVista` sin este parámetro) sigue sin darlas.
// `incluirVentas` para que la pausa pueda terminar con datos, e
// `incluirReversion` para ver correr en paralelo la regla contraria. Las dos
// se anotan en la sombra: no se enseñan, no se avisan, solo acumulan.
const vista = derivarVista(data, {
  thr: 0.5,
  topN: 3,
  incluirVentas: true,
  incluirReversion: true,
  // Desde el 2026-09-07. Tercera regla en la sombra: no se enseña, no avisa,
  // solo acumula operaciones reales para poder juzgarla algún día con datos
  // que nadie ha mirado todavía.
  incluirCaida: true,
})

// ⚠️ LAS DOS LISTAS, JUNTAS Y A PROPÓSITO.
//
// Hasta el 2026-09-05 las reversiones venían dentro de `vista.setups` y esto
// era `vista.setups` a secas. Al enseñarlas en la app hubo que separarlas allí
// (si no, se habrían mezclado con las señales normales en la misma tabla), y
// eso dejó este renglón a un paso de romper el historial EN SILENCIO: seguiría
// corriendo, seguiría anotando, y las reversiones simplemente dejarían de
// existir sin un solo error.
//
// El historial es lo único de este proyecto que no se puede recuperar: si un
// día no se anota, ese día se perdió para siempre. Por eso van juntas aquí y
// hay una comprobación que exige que este archivo lea las dos.
// La cuarta de sombra. Se genera aparte de `derivarVista` a propósito: usa las
// velas crudas (`rangosPar`) en vez del barrido ya calculado, que es
// exactamente como las lee el banco de pruebas. Así lo que se anota y lo que se
// midió no pueden separarse.
//
// ⚠️ REVIENTA si le faltan las velas, en vez de devolver cero señales. Una
// lista vacía se lee como «hoy no hubo señales» y es indistinguible de «llevo
// ocho meses sin anotar nada».
//
// ⚠️⚠️ Y SE ENVUELVE, que es la decisión que importa de todo este bloque.
//
// `setupsLSS` revienta si le faltan las velas, y eso está bien DENTRO de la
// función. Pero aquí arriba las consecuencias no son simétricas:
//
//   · si revienta y se deja reventar, MUERE EL VIGÍA ENTERO, y el historial de
//     la app —lo único de este proyecto que no se puede recuperar— pierde el
//     día para siempre;
//   · si se captura, lo que se pierde es un día de un experimento SIN VALIDAR,
//     que solo retrasa una decisión.
//
// Los dos errores no cuestan lo mismo, así que la condición no puede ser
// simétrica. Es la misma forma de escribir que `yaCorrioHoy` y `esSombra`.
//
// Y NO se pierde en silencio: el fallo se imprime en el log con todas las
// letras. Lo que no puede pasar es que una regla en observación tire abajo el
// registro de la que sí está en producción.
let setupsRuptura = []
try {
  setupsRuptura = setupsLSS(fechas, rangosPar, data.pares)
} catch (e) {
  console.error(
    '⚠️ «Ruptura de estructura sola» NO se pudo calcular hoy y NO se anotó: ' +
      (e?.message || e) +
      '\n   El resto del vigía sigue: el historial de la app es lo único irrecuperable.'
  )
}

const todosLosSetups = [
  ...vista.setups,
  ...vista.setupsReversion,
  ...vista.setupsCaida,
  ...setupsRuptura,
]

// `estadoPrevio` se leyó arriba, para el guardián de los tres intentos. Se
// reutiliza aquí a propósito: volver a leerlo daría lo mismo, pero dos
// lecturas del mismo archivo invitan a que algún día una de las dos se quede
// atrás.
const { actuales, nuevas } = compararConAnterior(todosLosSetups, estadoPrevio)

// Cuáles pueden llegar a un celular y cuáles solo se anotan. La regla está en
// `vigia-nucleo.mjs`, con su prueba: es la promesa de que una regla pausada
// no le llega a nadie, y eso no puede depender de que este archivo esté bien
// escrito hoy.
const { visibles: nuevasVisibles, sombra: nuevasSombra } = separarSombra(nuevas)

// Una línea por señal nueva, con los niveles tal como se los daríamos a
// Néstor. Es lo que después se compara contra lo que hizo el precio.
for (const { id, s } of nuevas) {
  const c = s.crudo
  escribir(
    LOG_SENALES,
    JSON.stringify({
      id,
      vistoEl: ahora.toISOString(),
      // El día de cierre con el que se calculó, no la fecha de hoy: si el
      // mercado no cotizó (fin de semana o festivo), son distintas y
      // confundirlas desalinearía el historial con los precios.
      cierre: data.ultima,
      par: s.name,
      lado: s.lado,
      // El `|| 'tendencia'` va aquí igual que en `idDe`: swing no tiene modo
      // rango, así que sus setups no traen `tipo` y sin esto quedaría `null`
      // en el historial para siempre.
      tipo: s.tipo || 'tendencia',
      // Solo va cuando es verdad: así las líneas ya escritas del historial se
      // siguen leyendo igual (sin el campo = no es de sombra) y no hay que
      // reescribir nada.
      ...(esSombra(s) ? { sombra: true } : {}),
      precio: c.precio,
      sl: c.sl,
      tp: c.tp,
      rr: Number(c.rr.toFixed(2)),
      pipRiesgo: Math.round(c.pipRiesgo),
      pipBeneficio: Math.round(c.pipBeneficio),
      rsi: c.rsi,
      atrPct: c.atrPct != null ? Number(c.atrPct.toFixed(3)) : null,
      tend: c.tend,
      // ⚠️⚠️ LO QUE UNA REGLA APUNTA ADEMÁS DE LOS NIVELES (2026-09-22).
      //
      // Esta lista de campos se escribió cuando todas las señales eran de la
      // app y todas tenían exactamente los mismos datos. Una regla nueva puede
      // traer en `crudo` algo que ninguna otra tiene, y hasta hoy ESO SE
      // PERDÍA EN SILENCIO: `lss-sombra.mjs` calcula `huboSweep` —si la
      // ruptura vino después de un barrido de liquidez— y lo documenta como
      // «anotado desde el primer día», y sin embargo no llegaba al historial.
      // Nada fallaba: el campo simplemente no salía en la línea escrita.
      //
      // Lo cazó Néstor preguntando por qué no marcamos las dos clases de
      // ruptura para poder verlas. Se arregla el 2026-09-22, con CERO señales
      // `lss` anotadas todavía, así que no se ha perdido ni una.
      //
      // Va con el mismo patrón que `sombra`: solo se escribe cuando existe, de
      // modo que las 81 líneas ya escritas se siguen leyendo igual y no hay
      // que reescribir nada.
      //
      // 📌 Y es el mismo fallo de familia que este archivo colecciona: una
      // lista que ENUMERA lo que conoce se traga en silencio lo que venga
      // después. La diferencia con `filasOtras` es que aquí no se puede poner
      // un cajón genérico sin volcar `crudo` entero —que lleva objetos que no
      // deben ir al historial—, así que lo que hay es esta nota y la
      // comprobación de `prueba-vigia.mjs` que exige que `huboSweep` viaje.
      ...(c.huboSweep !== undefined ? { huboSweep: c.huboSweep } : {}),
      ...(c.evento !== undefined ? { evento: c.evento } : {}),
    }) + '\n',
    true
  )
}

escribir(
  LOG_CORRIDAS,
  JSON.stringify({
    en: ahora.toISOString(),
    cierre: data.ultima,
    total: actuales.length,
    nuevas: nuevas.length,
    disparo: process.env.GITHUB_EVENT_NAME || 'local',
  }) + '\n',
  true
)

escribir(
  ESTADO,
  JSON.stringify(
    { actualizadoEl: ahora.toISOString(), cierre: data.ultima, senales: actuales.map((x) => x.id) },
    null,
    2
  ) + '\n'
)

// Juzgar las señales de días anteriores: ¿llegaron a su objetivo o a su stop?
// Va DESPUÉS de anotar las nuevas (así una recién vista ya entra en la cuenta)
// y ANTES de los avisos, porque esto sí escribe en disco y los avisos no.
//
// Solo "ganada" y "perdida" son definitivas. Una "caducada" NO cierra el caso:
// significa "hoy no pude juzgarla", y eso puede cambiar mañana. Tratarla como
// definitiva fue justo lo que dejó el historial de swing en cero — las 8
// señales quedaron marcadas caducada por un error de nombre de campo y ya
// nunca se volvían a mirar, ni siquiera después de arreglarlo.
const previos = leerJsonl(LOG_RESULTADOS)
const yaJuzgadas = new Set(previos.filter((r) => r.resultado !== 'caducada').map((r) => r.clave))
const { resultados, abiertas, caducadas } = resolver(leerJsonl(LOG_SENALES), data, yaJuzgadas)

// Una caducada que ya estaba anotada no se vuelve a escribir: si no, cada
// corrida añadiría una línea repetida por cada señal vieja, para siempre.
const caducadasPrevias = new Set(previos.filter((r) => r.resultado === 'caducada').map((r) => r.clave))
for (const r of resultados) {
  if (r.resultado === 'caducada' && caducadasPrevias.has(r.clave)) continue
  escribir(LOG_RESULTADOS, JSON.stringify(r) + '\n', true)
}

// El barrido que va a leer la app. Se publica lo justo para que pueda pintar
// sus pantallas: `derivarVista` se sigue ejecutando en el navegador, porque
// necesita el idioma de cada persona y eso aquí no se sabe.
//
// No se guardan las 300 fechas ni las series completas —solo `serie20`, que
// es lo que dibuja el gráfico—: el archivo lo baja cada miembro cada vez que
// abre la app, así que conviene que pese poco.
//
// ⚠️ `highs` y `lows` COMPLETOS se quitan a propósito. Son 300 números por par
// y solo los necesita el resolver, que corre aquí mismo.
//
// 📌 CORRECCIÓN DEL 2026-09-22, y el número viejo bloqueaba decisiones. Aquí
// decía que dejarlos dentro llevaría el archivo «de 9 KB a más de medio mega».
// Medido sobre el archivo REAL de producción, con los decimales y las
// magnitudes de cada par:
//
//     hoy publicado ......... 11,3 KB
//     + 20 días de máx/mín .. 14,4 KB   (+3,1)
//     + 30 días ............. 15,7 KB   (+4,5)
//     + los 300 completos ... 52,6 KB   (+41,4)
//
// O sea que «medio mega» estaba inflado unas DIEZ VECES. Con medio mega ni se
// discutía; con 41 KB la pregunta pasa a ser si aporta algo — y para los 300
// hoy la respuesta sigue siendo NO, pero por un motivo que no es el tamaño:
// solo los necesita «comprar la caída», que corre en la sombra y NO se enseña
// hasta pasar su listón. El vigía no los necesita publicados para anotarla:
// los tiene en la mano cuando corre.
//
// Lo que SÍ se publica desde hoy son `altos20` y `bajos20` —los máximos y
// mínimos de los mismos 20 días que ya viajaban como cierres— para que la
// pantalla de detalle dibuje el recorrido de cada día. Son los +3,1 KB.
//
// ⚠️ Y esto NO gasta un crédito más de Twelve Data: el vigía ya se baja los
// 300 extremos todos los días. Lo único que cambia es que deja de tirarlos.
//
// 📌 QUÉ se publica vive ahora en `lib/barrido-publicado.mjs`, no aquí. No es
// orden: estando en línea dentro de este guion **no había forma de probarlo
// sin arrancar el vigía entero**, que necesita red y créditos — y por eso Swing
// llevaba desde el 2026-08-09 publicando sin una sola comprobación, mientras la
// app hermana sí la tenía desde el 2026-09-02.
escribir(BARRIDO, JSON.stringify(armarBarrido(data, ahora)) + '\n')

// Avisos al celular. Va al FINAL y aislado, igual que en la app hermana: para
// cuando llegamos aquí el historial ya está escrito en disco, así que ni un
// fallo de red ni una clave mal puesta pueden costarnos esos datos, que son
// los que no se pueden recuperar después. El `import` es dinámico por lo
// mismo: si faltara `web-push`, el vigía tiene que seguir anotando igual.
let avisos = { estado: 'sin-senales-nuevas' }
if (nuevasVisibles.length) {
  try {
    const { enviarAvisos } = await import('./lib/push-envio.mjs')
    // `nuevasVisibles` y no `nuevas`: las de sombra ya quedaron anotadas
    // arriba y de aquí en adelante no existen. Se filtra en el sitio de la
    // llamada, no dentro de `enviarAvisos`, para que quien lea esta línea vea
    // que lo que sale hacia los celulares no es lo mismo que lo que se guarda.
    avisos = await enviarAvisos(nuevasVisibles)
  } catch (e) {
    avisos = { estado: 'error', detalle: e.message }
  }
}

console.log('---VIGIA-INICIO---')
console.log(`Corrida: ${ahora.toISOString()}`)
console.log(`Última vela diaria: ${data.ultima}`)
console.log(
  `Señales activas: ${actuales.length} · nuevas en esta revisión: ${nuevas.length}` +
    (nuevasSombra.length ? ` (${nuevasSombra.length} en sombra, no se avisan)` : '')
)
if (nuevas.length) {
  for (const { s } of nuevas) {
    const c = s.crudo
    console.log(
      `  • ${s.name} ${s.lado}${esSombra(s) ? ' [SOMBRA]' : ''} — entrada ${c.precio.toFixed(c.dec)}, SL ${c.sl.toFixed(c.dec)}, TP ${c.tp.toFixed(c.dec)} (R/B 1:${c.rr.toFixed(1)})`
    )
  }
} else {
  console.log('  (nada nuevo respecto a la revisión anterior)')
}
const resumen = resumir(leerJsonl(LOG_RESULTADOS))
console.log(
  `Señales juzgadas en esta revisión: ${resultados.length}` +
    ` · siguen abiertas: ${abiertas}` +
    (caducadas ? ` · caducadas: ${caducadas}` : '')
)
if (resumen.todas.total) {
  console.log(
    `Historial: ${resumen.todas.ganadas}/${resumen.todas.total} acertadas` +
      ` (${resumen.todas.acierto}%), ${resumen.todas.pips >= 0 ? '+' : ''}${resumen.todas.pips} pips`
  )
}
// Las de sombra van en su propia línea y NUNCA sumadas a las de arriba: si se
// mezclaran, el porcentaje que mira Néstor incluiría ventas que la app dejó
// de proponerle. Esta línea es el contador de la espera: es el dato que hará
// falta el día que haya que decidir si las ventas vuelven.
//
// ⚠️ Y VAN EN DOS LÍNEAS, NO EN UNA. Hasta el 2026-09-05 esto imprimía el cubo
// `sombra` entero bajo la etiqueta «Ventas en sombra», y esa etiqueta era
// FALSA: dentro había 12 reversiones y 4 ventas. El promedio de dos
// experimentos distintos no responde ninguna de las dos preguntas, y encima
// llevaba el nombre de solo uno de ellos.
const linea = (etiqueta, c) => {
  if (!c.total) return
  console.log(
    `${etiqueta}: ${c.ganadas}/${c.total} (${c.acierto}%), ${c.pips >= 0 ? '+' : ''}${c.pips} pips`
  )
}
linea('Ventas en sombra (pausadas, se miden pero no se avisan)', resumen.ventasPausadas)
linea('Reversión en paralelo (la regla contraria a la app)', resumen.reversion)
// `resumir` devuelve este cubo desde el 2026-09-07 y aquí no lo imprimía
// nadie: la regla se habría anotado durante meses sin aparecer en el log de
// ninguna corrida. Es el mismo descuido que ya se cazó en `filasTodas`.
linea('«Comprar la caída» en paralelo (también en la sombra)', resumen.caida)
// ⚠️ Y ésta, desde el 2026-09-20. Se imprime aquí porque NO se enseña en
// ninguna pantalla de la app —lo pidió Néstor y es lo correcto: su estado es
// «en observación»—, y una regla que no se puede ver en ningún sitio se pasa
// meses anotándose sin que nadie lo note. Ya ocurrió dos veces.
linea('«Ruptura de estructura sola» en paralelo (en observación, sin validar)', resumen.ruptura)
// El cajón de lo que nadie ha inventado todavía. Si algún día sale un número
// aquí, es que hay una regla anotándose que ningún desglose nombra.
linea('Tipos que este log no conoce (revisar si sale algo)', resumen.otros)
console.log(`Avisos al celular: ${JSON.stringify(avisos)}`)
console.log('---VIGIA-FIN---')
