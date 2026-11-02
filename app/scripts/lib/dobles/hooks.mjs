// Los hooks que redirigen las dos puertas de red a sus dobles. SOLO PARA EL
// HUMO — ningún guion de producción registra esto.
//
// Redirige por SUFIJO de la ruta resuelta y no por el texto del import: el
// guion escribe `./lib/velas.mjs` y otro módulo podría escribir
// `../lib/velas.mjs`, y las dos tienen que caer en el doble.
//
// ⚠️ Si un día se renombrara `velas.mjs` o `cot-historia.mjs`, esto dejaría de
// redirigir **en silencio** y el humo saldría a la red de verdad (o fallaría
// por falta de llave, que al menos es ruidoso). Por eso `comprobarRedirigido`
// existe y el humo la llama.
const DOBLES = [
  ['/scripts/lib/velas.mjs', './velas-dobles.mjs'],
  ['/scripts/lib/cot-historia.mjs', './cftc-dobles.mjs'],
]

const redirigidos = new Set()

export async function resolve(especificador, contexto, siguiente) {
  const r = await siguiente(especificador, contexto)

  // ⚠️ UN DOBLE QUE IMPORTA SU ORIGINAL NO SE REDIRIGE A SÍ MISMO. Sin esta
  // línea, `cftc-dobles.mjs` —que reexporta de `cot-historia.mjs` para no
  // reimplementar el indexado— caía en un ciclo: Node aborta con
  // «Detected cycle while resolving name».
  //
  // Y es lo que hace que el doble sea honesto: lo único que finge es la
  // respuesta de la red; las cuentas que importan (indexar, la disciplina de
  // fechas, el sesgo del par) son las de producción.
  if (contexto?.parentURL?.includes('/scripts/lib/dobles/')) return r

  for (const [sufijo, doble] of DOBLES) {
    if (!r.url.endsWith(sufijo)) continue
    redirigidos.add(sufijo)
    const destino = new URL(doble, import.meta.url).href
    return { ...r, url: destino, shortCircuit: true }
  }
  return r
}

// ⚠️ NO HAY FORMA DE PREGUNTARLE ESTO AL HILO PRINCIPAL: `register()` corre los
// hooks en un hilo aparte, así que un `export` de aquí no se puede leer desde
// el humo. Por eso la comprobación de «¿se redirigió de verdad?» la hacen los
// propios dobles marcando `globalThis.__DOBLES_DE_HUMO` al cargarse.
//
// La primera versión exportaba un contador desde aquí y era inútil: habría
// pasado en verde sin comprobar nada.
