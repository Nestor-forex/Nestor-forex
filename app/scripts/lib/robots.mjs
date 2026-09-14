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

export function decidirConRobots(textoRobots, url) {
  if (typeof textoRobots !== 'string' || !textoRobots.trim()) {
    return { veredicto: 'no se sabe', porque: 'no hay robots.txt legible' }
  }

  let u
  try {
    u = new URL(url)
  } catch {
    return { veredicto: 'no se sabe', porque: 'la dirección no se entiende' }
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

  if (!mejor) return { veredicto: 'no lo prohíbe', porque: `ninguna regla de "User-agent: *" toca ${ruta}` }
  if (mejor.campo === 'allow') return { veredicto: 'no lo prohíbe', porque: `Allow: ${mejor.valor}` }
  return { veredicto: '⛔ LO PROHÍBE', porque: `Disallow: ${mejor.valor}` }
}

