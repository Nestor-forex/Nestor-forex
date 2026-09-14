// El VEREDICTO de buscar una página dentro de los sitemaps de un sitio.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ POR QUÉ ESTO EXISTE, Y ES UN FALLO REAL QUE YA OCURRIÓ (2026-09-14)
// ─────────────────────────────────────────────────────────────────────────
// La primera versión de la búsqueda imprimía, al no encontrar nada:
//
//     ⚠️ NINGUNA página con esas palabras en su dirección.
//        …pero sí que no la publican abiertamente.
//
// Y lo imprimió sobre AvaTrade **habiendo leído CERO páginas**: sus cinco
// sitemaps devolvieron 403 uno detrás de otro. O sea que el informe afirmaba
// «no la publican» cuando lo que había pasado es **que no se pudo mirar**.
//
// Las dos cosas se escriben igual en la salida y significan lo contrario:
//
//   · «miré 40.000 páginas y ninguna coincide»  → es un hallazgo
//   · «no pude abrir ni una»                    → no es nada
//
// Es la misma familia que ya está anotada en CLAUDE.md: **una etiqueta
// equivocada es un error de medición**, y **una comprobación que se adapta a
// lo que encuentra no comprueba nada**. Por eso el veredicto se calcula aquí,
// aparte, y tiene pruebas sin internet.
//
// ⚠️ La regla que no hay que ablandar: **sin páginas leídas NO hay veredicto.**
// Ante la duda, «no se pudo mirar» — nunca «no existe». Misma asimetría que
// `yaCorrioHoy` (ante la duda, correr) y `decidirConRobots` (ante la duda, «no
// se sabe»).

export function veredictoBusqueda({ leidos = 0, fallidos = 0, paginas = 0, encontradas = [], pendientes = 0 } = {}) {
  const hallazgos = [...new Set(Array.isArray(encontradas) ? encontradas : [])]

  // ⚠️ ESTO VA PRIMERO. Si no se leyó ni una página, no hay nada que concluir,
  // por muchos archivos que se hayan intentado.
  if (paginas <= 0) {
    return {
      estado: 'no-se-pudo',
      hallazgos: [],
      texto:
        `✗ NO SE PUDO MIRAR: 0 páginas leídas (${fallidos} de ${leidos} archivos fallaron).\n` +
        '   Esto NO dice nada sobre si la página existe. Solo dice que el sitio\n' +
        '   no nos dejó abrir su índice.',
    }
  }

  if (!hallazgos.length) {
    return {
      estado: 'sin-coincidencias',
      hallazgos: [],
      texto:
        `⚠️ Ninguna de las ${paginas} páginas leídas lleva esas palabras en su dirección.\n` +
        (pendientes > 0
          ? `   ⚠️ Y quedaron ${pendientes} archivos sin leer por el tope: la búsqueda NO fue completa.\n`
          : '') +
        '   Aun siendo completa, NO demuestra que no exista: puede estar dentro de\n' +
        '   la cuenta o llamarse de otra forma. Solo dice que no la anuncian ahí.',
    }
  }

  return {
    estado: 'hay-candidatas',
    hallazgos,
    texto: `✓ ${hallazgos.length} páginas que podrían ser (de ${paginas} leídas):`,
  }
}
