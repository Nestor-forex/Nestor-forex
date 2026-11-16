// EL ENVÍO DE LOS AVISOS INTELIGENTES — solo Swing, como todo `mandar-avisos.mjs`.
//
// Las reglas de cuándo suena cada uno viven en `src/lib/avisosInteligentes.js`
// (GEMELO, el mismo que pinta los interruptores). Aquí solo está el bucle, y
// está aquí y no dentro del guion por lo mismo que `mandarATodos`: el guion
// necesita credenciales y red en cuanto se importa, y de este bucle salen las
// decisiones que pueden hacer sonar un celular de más o de menos.
//
// ⚠️ SE MARCA ANTES DE MANDAR, igual que los avisos de usuario: si la marca
// falla no se manda. Al revés, un fallo al escribir haría sonar el mismo aviso
// cada 15 minutos para siempre; así, como mucho, se pierde uno.

import { avisosParaPersona, mensajeInteligente, podarMarcas } from '../../src/lib/avisosInteligentes.js'

export async function mandarInteligentes({ fichas, subsPorUid, contexto, aplicar, seAcabaEn = Infinity, marcar, enviar, t, ahora = new Date() }) {
  const r = { personas: 0, candidatos: 0, enviados: 0, fallidos: 0, noSeMarco: 0, sinAparato: 0, sinTiempo: 0, muertas: [] }
  for (const f of Array.isArray(fichas) ? fichas : []) {
    // Solo a quien tiene la puerta abierta: mandar avisos a un retirado sería
    // darle el producto por una puerta de atrás.
    if (f?.estado !== 'aprobado' || !f.id) continue
    const avisos = avisosParaPersona(f, contexto, ahora)
    if (!avisos.length) continue
    r.personas++
    r.candidatos += avisos.length
    const subs = subsPorUid.get(f.id) || []
    // Sin aparato no se marca nada: marcar «ya avisado» algo que nunca llegó lo
    // escondería para siempre.
    if (!subs.length) {
      r.sinAparato += avisos.length
      continue
    }
    if (!aplicar) continue
    if (Date.now() > seAcabaEn) {
      r.sinTiempo += avisos.length
      continue
    }
    const marcas = podarMarcas(f.intelEnviados, ahora)
    for (const a of avisos) marcas[a.clave] = ahora.toISOString()
    let ok = false
    try {
      ok = (await marcar(f.ruta, marcas)) !== false
    } catch {
      ok = false
    }
    if (!ok) {
      r.noSeMarco += avisos.length
      continue
    }
    for (const a of avisos) {
      const m = mensajeInteligente(a)
      for (const s of subs) {
        const tt = t(s.idioma || 'es')
        const msg = {
          titulo: tt(m.titulo[0], m.titulo[1]),
          cuerpo: `${tt(m.cuerpo[0], m.cuerpo[1])} ${tt('intel.notiPie')}`,
          tag: `intel|${a.clave}`,
          url: './?tab=avisos',
          en: ahora.toISOString(),
        }
        const res = await enviar(s, msg)
        if (res === 'ok') r.enviados++
        else if (res === 'muerta') r.muertas.push(s.ruta)
        else r.fallidos++
      }
    }
  }
  return r
}
