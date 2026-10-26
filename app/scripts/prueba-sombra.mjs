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

  // ⚠️⚠️ LOS CUBOS QUE NO LLEVAN AVISO, CON EL MOTIVO ESCRITO.
  //
  // La lista va A MANO, igual que PRIMOS en `gemelos.mjs` y que `NO_SE_PASAN`
  // en `prueba-cableado.mjs`, y por la misma razón: lo que no esté en ninguna
  // de las dos listas es un descuido y tiene que fallar. Si se excluyera «todo
  // lo que no tenga aviso», un experimento nuevo al que se le olvidara el
  // aviso saldría en positivo sin nada al lado — que es justo lo que este
  // archivo entero existe para impedir.
  const SIN_AVISO = {
    caidaVieja:
      'NO es un experimento vivo: son las operaciones que «comprar la caída» anotó hasta el 2026-10-12 con una geometría que no era la aprobada. Su número no va camino de 150 porque ese registro está cerrado, así que un aviso de «faltan N» sería falso. Lo que necesita es la frase que dice por qué no cuentan, y la tiene.',
  }

  for (const r of reglas) {
    if (r in SIN_AVISO) continue
    comprobar(
      `\`${r}\` enseña su número CON el aviso`,
      PANTALLA.includes(`<AvisoSombra ops={resumen.${r}.total} />`)
    )
  }

  // Y al revés: una excusa que ya no corresponde a nada tiene que irse, o la
  // lista acabaría siendo un cajón de nombres muertos que no protegen nada.
  const excusasMuertas = Object.keys(SIN_AVISO).filter((k) => !reglas.includes(k))
  comprobar(
    excusasMuertas.length === 0 ? 'ningún motivo escrito sobra' : `motivos de algo que ya no se pinta: ${excusasMuertas.join(', ')}`,
    excusasMuertas.length === 0
  )
  for (const [k, porque] of Object.entries(SIN_AVISO)) console.log(`       sin aviso a propósito · ${k}: ${porque.slice(0, 70)}…`)

  // ⚠️ Pero SÍ tiene que decir por qué no cuentan, y en los 13 idiomas. Sin
  // esa frase, 29 operaciones aparecerían en pantalla sin que nada explicara
  // que no suman — peor que esconderlas, porque se leerían como que sí.
  comprobar(
    'la pantalla pinta el texto que explica la geometría vieja',
    /t\('historial\.caidaVieja'/.test(PANTALLA)
  )
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
//
// Y el 2026-10-13 volvió a morder por otra cara, cazado MIRANDO LA CAPTURA:
// `reversionIntro` decía «son DOS experimentos distintos… ninguna de las DOS
// preguntas» y `caidaIntro` «ninguna de las TRES preguntas». Escritos cuando
// esas eran las cuentas; con Bollinger ya son cuatro reglas en la sombra, así
// que los 13 idiomas afirmaban un número falso. Ninguna prueba lo veía.
//
// La frase ya no cuenta nada. Los ORDINALES («la tercera regla») se quedan a
// propósito: identifican a una regla y no cambian al añadir otra.
{
  const es = (await import('../src/lib/i18n/textos/es.js')).default.historial
  const prohibido = /muy pocas operaciones|pocas operaciones/
  const cuenta = /\b(dos|tres|cuatro|cinco)\s+(experimentos?|preguntas?|reglas?)\b|ninguna de las (dos|tres|cuatro|cinco)\b/i
  // ⚠️ La lista va con `bollingerIntro` dentro. Al añadirlo el 2026-10-13 se
  // quedó fuera, así que el texto nuevo nacía sin vigilar — el agujero de
  // siempre: una lista a mano a la que nadie añade lo que viene después.
  for (const k of ['reversionIntro', 'caidaIntro', 'rupturaIntro', 'bollingerIntro']) {
    comprobar(`\`${k}\` no afirma a mano cuántas operaciones lleva`, !prohibido.test(es[k]))
    comprobar(`\`${k}\` tampoco cuenta a mano cuántos experimentos o preguntas hay`, !cuenta.test(es[k]))
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

console.log('\n10. ⚠️⚠️ «Qué es esta app»: el listón se LEE y no se promete nada')
// La tarjeta que dice que nada de lo que se ve es una señal para copiar. Lo
// pidió Néstor y lo que se vigila aquí son las tres formas en que ese texto se
// puede echar a perder sin que falle nada:
//
//   · que alguien escriba el 150 a mano (es `medicion.queSignifica` otra vez,
//     que dijo «55 %» durante meses en los 13 idiomas);
//   · que diga «CUANDO alguno pase su listón» en vez de «SI» — van nueve
//     familias medidas y nueve que no pasan, así que el «cuando» prometería un
//     resultado que puede no existir;
//   · y que la tarjeta exista y no esté enchufada en ninguna pantalla, que es
//     el fallo que dejó la correlación y el cruce de riesgo meses sin pintarse.
{
  const comp = readFileSync(fileURLToPath(new URL('../src/components/QueEsEstaApp.jsx', import.meta.url)), 'utf8')
  comprobar('la tarjeta importa OPS_PARA_CREER en vez de escribir el número', /OPS_PARA_CREER/.test(comp))
  // Se mira solo el JSX, no los comentarios: la cabecera explica POR QUÉ el
  // listón son 150 y nombrarlo ahí es documentación, no un número duplicado.
  const codigo = comp.replace(/^\s*\/\/.*$/gm, '')
  comprobar('y no lleva el listón escrito a mano en el código', !new RegExp(`\\b${OPS_PARA_CREER}\\b`).test(codigo))

  const es = (await import('../src/lib/i18n/textos/es.js')).default.queEs
  comprobar('`queEs.liston` es una función (o sea, lee el número)', typeof es.liston === 'function')
  comprobar('y mete dentro el que se le pasa', es.liston({ meta: 777 }).includes('777'))

  comprobar('`queEs.avance` sigue diciendo que no es para copiar', /copiar/i.test(es.avance))
  // ⚠️ Lo que NO puede decir. «Cuando alguno pase» da por hecho que alguno
  // pasará; «si alguno pasa» no.
  comprobar(
    '`queEs.privilegio` dice SI alguno pasa, nunca CUANDO',
    /\bsi alguno pasa\b/i.test(es.privilegio) && !/\bcuando (alguno|alguna|pase|pasen)\b/i.test(es.privilegio),
  )

  const barrido = readFileSync(fileURLToPath(new URL('../src/components/BarridoTab.jsx', import.meta.url)), 'utf8')
  comprobar('está enchufada en la pestaña Barrido', /<QueEsEstaApp\s*\/>/.test(barrido))
}

console.log(fallos === 0 ? '\n✓ todo bien.\n' : `\n✗ ${fallos} comprobación(es) fallaron.\n`)
process.exit(fallos === 0 ? 0 : 1)
