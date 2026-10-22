// ¿Nos deja el robots.txt pedir esto? La parte que DECIDE, aparte y pura.
//
// Bajar un robots.txt es lo fácil; lo que puede estar mal es INTERPRETARLO, y
// un fallo aquí no se ve: devuelve un veredicto perfectamente creíble. Por eso
// vive fuera de `sonda-sentimiento.mjs` y tiene pruebas sin internet
// (`scripts/prueba-sentimiento.mjs`).
//
// ⚠️ robots.txt NO es lo mismo que las condiciones de uso. Un robots.txt
// permisivo NO autoriza nada; uno que lo prohíbe SÍ es un «no» explícito. O
// sea que esto sirve para DESCARTAR, nunca para aprobar.
//
// ⚠️ Ante cualquier duda dice «no se sabe», nunca «permitido». Es la misma
// asimetría que `yaCorrioHoy` (ante la duda, correr) y `esSombra` (ante la
// duda, no avisar): equivocarse hacia «no se sabe» cuesta que una persona lo
// mire; al revés cuesta pedir algo que nos habían dicho que no.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ DEVUELVE UNA FICHA `{ veredicto, porque }`, NO UNA PALABRA
// ─────────────────────────────────────────────────────────────────────────
// Y los tres veredictos posibles se EXPORTAN, para que nadie los vuelva a
// escribir a mano. No es manía de orden: el 2026-10-22 la sonda de la
// volatilidad comparaba el resultado de esta función contra la palabra
// `'prohibido'` — que ni siquiera es uno de los tres valores — así que su
// guardia **nunca podía saltar**. No falló nada: imprimió `[object Object]`
// en el log y siguió pidiendo.
//
// Es la familia de siempre en este proyecto (el umbral de fuerza escrito a
// mano en nueve sitios, `ATR_REVERSION` en dos), con la consecuencia más
// cara posible aquí: una comprobación que no puede morder es exactamente lo
// mismo que no tener comprobación.
export const PROHIBE = '⛔ LO PROHÍBE'
export const NO_PROHIBE = 'no lo prohíbe'
export const NO_SE_SABE = 'no se sabe'

export function decidirConRobots(textoRobots, url) {
  if (typeof textoRobots !== 'string' || !textoRobots.trim()) {
    return { veredicto: NO_SE_SABE, porque: 'no hay robots.txt legible' }
  }

  let u
  try {
    u = new URL(url)
  } catch {
    return { veredicto: NO_SE_SABE, porque: 'la dirección no se entiende' }
  }

  // Quedarse solo con los bloques de `User-agent: *`. Un archivo puede tener
  // varios y mezclarlos daría el veredicto de OTRO robot.
  //
  // ⚠️ Varios `User-agent` seguidos comparten el mismo bloque de reglas, así
  // que `dentro` no se apaga hasta que llega una regla de verdad. Sin esto,
  // un `User-agent: Googlebot` + `User-agent: *` + `Disallow: /` se leería
  // como que no nos afecta.
  const lineas = textoRobots.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim())
  let agentes = []
  let leyendoAgentes = false
  const reglas = []
  for (const l of lineas) {
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(l)
    if (!m) continue
    const campo = m[1].toLowerCase()
    const valor = m[2].trim()
    if (campo === 'user-agent') {
      if (!leyendoAgentes) agentes = []
      agentes.push(valor)
      leyendoAgentes = true
      continue
    }
    leyendoAgentes = false
    if (campo === 'allow' || campo === 'disallow') {
      if (agentes.includes('*')) reglas.push({ campo, valor })
    }
  }

  // La regla que gana es la de prefijo MÁS LARGO, que es como se resuelve de
  // verdad. Coger la primera que coincida daría el veredicto contrario en
  // cuanto hubiera un `Allow` más específico dentro de un `Disallow` amplio.
  //
  // ⚠️ Un `Disallow:` VACÍO significa «no prohíbo nada» y no debe entrar en la
  // comparación: como cadena vacía sería el prefijo de todo y lo prohibiría
  // todo — justo lo contrario de lo que dice.
  const ruta = u.pathname + u.search
  let mejor = null
  for (const r of reglas) {
    if (!r.valor) continue
    const patron = r.valor.replace(/\*$/, '')
    if (!ruta.startsWith(patron)) continue
    if (!mejor || patron.length > mejor.patron.length) mejor = { ...r, patron }
  }

  if (!mejor) return { veredicto: NO_PROHIBE, porque: `ninguna regla de "User-agent: *" toca ${ruta}` }
  if (mejor.campo === 'allow') return { veredicto: NO_PROHIBE, porque: `Allow: ${mejor.valor}` }
  return { veredicto: PROHIBE, porque: `Disallow: ${mejor.valor}` }
}

