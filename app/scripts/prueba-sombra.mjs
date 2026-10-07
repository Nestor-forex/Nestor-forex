// Prueba del contador de las reglas de la sombra. Sin internet.
//
// Correr con: node scripts/prueba-sombra.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { OPS_PARA_CREER, confianza } from '../src/lib/sombra.js'
import { margen } from '../src/lib/diagnostico.js'

let fallos = 0
const comprobar = (que, cond) => {
  console.log(`${cond ? '  OK  ' : '  MAL '} ${que}`)
  if (!cond) fallos++
}

console.log('\n1. ⚠️ El número y el LISTÓN no pueden separarse')
// El listón vive en `scripts/` y no se puede importar desde el navegador, así
// que la única forma de que no envejezcan por separado es compararlos. Es la
// lección de las etiquetas «(hoy)» del banco de pruebas y la de
// `medicion.queSignifica`, que dijo «55 %» durante meses porque nadie lo leía
// del sitio donde vive.
{
  const liston = readFileSync(fileURLToPath(new URL('./lib/preregistro-lss.mjs', import.meta.url)), 'utf8')
  const m = liston.match(/\(r\.ops \?\? 0\) >= (\d+)/)
  comprobar('el listón sigue teniendo un mínimo de operaciones escrito', m !== null)
  comprobar(`y coincide con OPS_PARA_CREER (${OPS_PARA_CREER} = ${m?.[1]})`, m !== null && Number(m[1]) === OPS_PARA_CREER)
}

console.log('\n2. Las cuentas, en el caso normal')
{
  const c = confianza(18)
  comprobar('18 operaciones → faltan 132', c.faltan === OPS_PARA_CREER - 18)
  comprobar(`y el margen es ±${c.margen} puntos`, c.margen === margen(18))
  comprobar('no es suficiente', c.suficiente === false)
}
{
  const c = confianza(OPS_PARA_CREER)
  comprobar(`${OPS_PARA_CREER} operaciones → ya es suficiente`, c.suficiente === true)
  comprobar('y no faltan', c.faltan === 0)
}
comprobar('por encima del listón tampoco faltan (no sale negativo)', confianza(400).faltan === 0)

console.log('\n3. ⚠️ Lo que de verdad hace falta decir: con pocas, el margen tapa el número')
// Es el argumento entero. Con 18 operaciones el margen es tan grande que un
// 39 % y un 60 % son el mismo número, y eso es lo que la pantalla tiene que
// hacer visible en vez de un «no te lo creas» sin cifras.
{
  const pocas = confianza(18).margen
  const bastantes = confianza(OPS_PARA_CREER).margen
  comprobar(`con 18 el margen (±${pocas}) es mayor que con ${OPS_PARA_CREER} (±${bastantes})`, pocas > bastantes)
  comprobar(`y con 18 pasa de ±20 puntos (es ±${pocas})`, pocas > 20)
  comprobar(`con ${OPS_PARA_CREER} baja de ±10 (es ±${bastantes})`, bastantes < 10)
}

console.log('\n4. ⚠️ Ante la duda NO se afirma nada')
// Un `{faltan: 150}` inventado sobre un dato que no existe afirmaría que la
// regla no lleva ninguna operación, y eso no se sabe. La pantalla no pinta.
comprobar('sin dato → null', confianza(undefined) === null)
comprobar('null → null', confianza(null) === null)
comprobar('texto → null', confianza('18') === null)
comprobar('NaN → null', confianza(NaN) === null)
comprobar('negativo → null', confianza(-3) === null)

console.log('\n5. Cero operaciones SÍ es un dato, y se dice')
// Distinto del caso de arriba: «llevo 0» es información (la regla arrancó y
// todavía no ha resuelto ninguna), «no lo sé» no lo es.
{
  const c = confianza(0)
  comprobar('0 operaciones → no es null', c !== null)
  comprobar('faltan las 150', c.faltan === OPS_PARA_CREER)
  comprobar('y el margen es null, no 0 (un 0 diría «exacto»)', c.margen === null)
}

console.log('\n6. Los dos textos existen en los 13 idiomas, y son FUNCIONES')
// Un `t()` sin clave NO da error: sale en blanco. Así que una mitad traducida y
// la otra no sería peor que nada — y lo peor es que no se vería compilando.
{
  const idiomas = ['es', 'en', 'de', 'fr', 'pt', 'it', 'zh', 'ja', 'ru', 'ar', 'tr', 'hi', 'ko']
  for (const l of idiomas) {
    const d = (await import(`../src/lib/i18n/textos/${l}.js`)).default
    const a = d?.sombra?.aviso
    const m = d?.sombra?.margen
    const ok =
      typeof a === 'function' &&
      typeof m === 'function' &&
      // ⚠️ Y que USEN los huecos: una frase traducida que se olvide del número
      // deja el aviso sin la única cosa que lo hace útil. Se comprueba con dos
      // valores distintos a propósito, para que no valga con escribirlos a
      // mano dentro del texto.
      String(a({ ops: 18, meta: 150 })).includes('18') &&
      String(a({ ops: 18, meta: 150 })).includes('150') &&
      String(m({ ops: 18, m: 23 })).includes('18') &&
      String(m({ ops: 18, m: 23 })).includes('23')
    comprobar(`${l}: sombra.aviso y sombra.margen, con sus números dentro`, ok)
  }
}

console.log('\n7. ⚠️ NINGUNA regla de la sombra se enseña sin su aviso')
// ─────────────────────────────────────────────────────────────────────────
// Esta es la que de verdad protege lo que Néstor pidió, y mira la RAÍZ y no
// el síntoma: la lista de reglas NO va escrita a mano, se saca de la propia
// pantalla. Así una regla de sombra que se añada mañana —y van cuatro— no
// puede aparecer en positivo sin el aviso al lado. Si se añadiera sin él, no
// fallaría nada: se vería un porcentaje bonito y nadie se enteraría.
{
  const PANTALLA = readFileSync(fileURLToPath(new URL('../src/components/HistorialTab.jsx', import.meta.url)), 'utf8')

  comprobar('la pantalla importa `AvisoSombra`', /import AvisoSombra from '\.\/AvisoSombra'/.test(PANTALLA))

  // Los bloques de experimento se pintan con `resumen.<regla>.total > 0`.
  const reglas = [...new Set([...PANTALLA.matchAll(/resumen\.(\w+)\.total > 0/g)].map((m) => m[1]))]
  // La guarda de siempre: sin esto, un cambio de forma en la pantalla dejaría
  // la lista vacía y esta comprobación pasaría en verde sin mirar nada.
  comprobar(`se encontraron las reglas de la sombra de la pantalla (${reglas.join(', ')})`, reglas.length >= 3)

  for (const r of reglas) {
    comprobar(
      `\`${r}\` enseña su número CON el aviso`,
      PANTALLA.includes(`<AvisoSombra ops={resumen.${r}.total} />`)
    )
  }
}

console.log('\n8. ⚠️ Los textos de cada regla ya NO escriben el conteo a mano')
// El 2026-10-07 `rupturaIntro` decía «lleva muy pocas operaciones y su número
// todavía no significa nada» en los 13 idiomas. Era verdad, y es una frase a
// mano sobre un número que cambia todos los días: el día que la regla llegue a
// 150 operaciones seguiría diciéndolo, y nadie vendría a quitarla. Ahora ese
// dato lo dice `AvisoSombra`, que lo LEE y desaparece solo.
//
// Es la misma lección que `medicion.queSignifica`, que dijo «55 %» durante
// meses, y que las etiquetas «(hoy)» del banco de pruebas.
{
  const es = (await import('../src/lib/i18n/textos/es.js')).default.historial
  const prohibido = /muy pocas operaciones|pocas operaciones/
  for (const k of ['reversionIntro', 'caidaIntro', 'rupturaIntro']) {
    comprobar(`\`${k}\` no afirma a mano cuántas operaciones lleva`, !prohibido.test(es[k]))
  }
  // Y lo que SÍ tiene que seguir diciendo: que está sin validar. Eso no es un
  // número, no envejece, y es lo que el aviso NO dice.
  comprobar('`rupturaIntro` sigue diciendo que está en observación', /EN OBSERVACIÓN/.test(es.rupturaIntro))
}

console.log('\n9. ⚠️⚠️ El aviso NO afirma el signo del resultado')
// La primera versión decía «Mide en positivo, pero todavía NO se puede tomar
// como señal». Con el historial REAL delante eso era FALSO: la reversión iba al
// 32 % con −519 pips y «comprar la caída» al 10 % con −757, y la frase se
// pintaba justo encima de esos números.
//
// Néstor tenía razón sobre el BANCO DE PRUEBAS; el registro real hacia adelante
// va en contra, que es por lo que estas reglas están en la sombra. El aviso dice
// lo único cierto en los dos casos. Que no vuelva a afirmar un signo.
{
  const a = (await import('../src/lib/i18n/textos/es.js')).default.sombra.aviso({ ops: 31, meta: 150 })
  const m = (await import('../src/lib/i18n/textos/es.js')).default.sombra.margen({ ops: 31, m: 18 })
  const signo = /positivo|negativo|gana\b|pierde\b|a favor|rentable/i
  comprobar('`sombra.aviso` no dice si el resultado es bueno o malo', !signo.test(a))
  comprobar('`sombra.margen` tampoco', !signo.test(m))
}

console.log(fallos === 0 ? '\n✓ todo bien.\n' : `\n✗ ${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
