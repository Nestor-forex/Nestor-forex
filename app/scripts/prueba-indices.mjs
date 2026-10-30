// Comprobaciones del juicio de la sonda de índices. SIN INTERNET y sin gastar
// un crédito.
//
//     node scripts/prueba-indices.mjs
//
// ⚠️ Lo que se comprueba aquí NO es que el dato exista: eso lo contesta la
// sonda. Es que el VEREDICTO no pueda mentir en las dos direcciones que ya han
// mordido en este repositorio:
//
//   · aprobar una ACCIÓN creyendo que es un índice (`GOLD` y `CL` contestaron
//     200 con cinco velas válidas y eran acciones de Nueva York);
//   · decir «no existe» habiendo leído CERO (mi propio informe del 2026-09-14
//     escribió «no la publican» sin haber podido abrir una sola página).

import { readFileSync } from 'node:fs'
import {
  esIndiceDeVerdad,
  precioPlausible,
  anosDeHistoria,
  fechasComunes,
  veredicto,
  aportaAlgo,
  REDUNDANTE_DESDE,
  TIPOS_DE_ACCION,
} from './lib/indices.mjs'

let mal = 0
const comprobar = (texto, ok) => {
  console.log(`  ${ok ? '✓' : '✗'} ${texto}`)
  if (!ok) mal++
}

console.log('\n1. ⚠️ LA TRAMPA DEL ORO: una acción NO pasa por ser un 200 con velas')
{
  // Los cuatro casos REALES del 2026-09-29, con su `type` tal cual lo devolvió
  // Twelve Data.
  comprobar('`Common Stock` se rechaza (fue el caso de `CL` y `GOLD`)', !esIndiceDeVerdad({ type: 'Common Stock' }).ok)
  comprobar('`ADR` se rechaza (fue el caso de `BZ`)', !esIndiceDeVerdad({ type: 'ADR' }).ok)
  comprobar('`ETF` se rechaza (`USO` y `BNO` siguen al crudo y NO son el crudo)', !esIndiceDeVerdad({ type: 'ETF' }).ok)
  comprobar('`Index` se acepta', esIndiceDeVerdad({ type: 'Index' }).ok)
  comprobar('da igual la mayúscula (`index`)', esIndiceDeVerdad({ type: 'index' }).ok)
  // ⚠️ La asimetría: ante la duda, NO. Un `type` desconocido no se aprueba.
  comprobar('sin `type` se rechaza, no se aprueba', !esIndiceDeVerdad({}).ok)
  comprobar('`type` vacío se rechaza', !esIndiceDeVerdad({ type: '  ' }).ok)
  comprobar('un `type` que nadie ha visto todavía se RECHAZA', !esIndiceDeVerdad({ type: 'Cosa Nueva' }).ok)
  // ⚠️ Esta comprobación la escribí con la frase EQUIVOCADA («no es un índice»
  // cuando el texto dice «no un índice») y falló sobre un código correcto. Van
  // unas diez veces en este proyecto: antes de creer que algo está mal,
  // comprobar que la comprobación mide lo que dice medir.
  comprobar('y el rechazo dice POR QUÉ', /no un índice|no está en la lista|no dice/.test(esIndiceDeVerdad({ type: 'ETF' }).porque))
  // ⚠️⚠️ Y ESTA DISTINGUE LOS DOS CAMINOS, que es lo único que hace que
  // `TIPOS_DE_ACCION` no sea decorativa. Al quitar esa lista a propósito, el
  // veredicto NO cambiaba —un tipo desconocido se rechaza igual— así que la
  // comprobación de arriba seguía en verde. Lo que la lista aporta es el
  // MOTIVO en el log: «es una acción» y «no sé qué es esto» son cosas
  // distintas, y la primera cierra la pregunta mientras la segunda la abre.
  comprobar(
    'y distingue «es una acción» de «no sé qué es»',
    /no un índice/.test(esIndiceDeVerdad({ type: 'Common Stock' }).porque) &&
      /no está en la lista/.test(esIndiceDeVerdad({ type: 'Cosa Nueva' }).porque),
  )
}

console.log('\n2. El precio tiene que caer donde se espera')
{
  comprobar('el DXY a 99 es plausible', precioPlausible(99, 'dolar') === true)
  // ⚠️ El caso literal del 2026-09-29: `GOLD` devolvió 42,85 con velas válidas.
  comprobar('42,85 NO es plausible para el índice del dólar', precioPlausible(42.85, 'dolar') === false)
  comprobar('86,52 (lo que devolvió `CL`) NO es plausible para el S&P 500', precioPlausible(86.52, 'sp500') === false)
  comprobar('el S&P a 5.800 sí', precioPlausible(5800, 'sp500') === true)
  comprobar('sin rango conocido devuelve null, no `true`', precioPlausible(100, 'inventado') === null)
  comprobar('un NaN no es plausible', precioPlausible(NaN, 'dolar') === false)
}

console.log('\n3. La historia y el cruce de fechas no inventan números')
{
  comprobar('anosDeHistoria([]) es null, no 0', anosDeHistoria([]) === null)
  comprobar('con una sola fecha es null', anosDeHistoria(['2026-01-01']) === null)
  comprobar('con fechas ilegibles es null', anosDeHistoria(['x', 'y']) === null)
  const a = anosDeHistoria(['2016-10-30', '2026-10-30'])
  comprobar(`diez años dan ${a?.toFixed(1)}`, Math.abs(a - 10) < 0.05)
  // ⚠️ El cruce por FECHA, no por posición. Dos series desplazadas un día
  // comparadas por posición darían una correlación creíble de días distintos.
  const c = fechasComunes(['2026-01-01', '2026-01-02', '2026-01-05'], ['2026-01-02', '2026-01-05', '2026-01-06'])
  comprobar(`comparte 2 fechas (${c.n})`, c.n === 2)
  comprobar('las nombra en orden', c.comunes.join() === '2026-01-02,2026-01-05')
  comprobar('la fracción es sobre la serie más corta', Math.abs(c.fraccion - 2 / 3) < 1e-9)
  comprobar('tolera la hora pegada a la fecha', fechasComunes(['2026-01-02 00:00:00'], ['2026-01-02']).n === 1)
  comprobar('sin nada común la fracción es 0 y no null', fechasComunes(['2026-01-01'], ['2026-02-01']).n === 0)
}

console.log('\n4. ⚠️⚠️ SIN FICHAS LEÍDAS NO HAY VEREDICTO')
{
  // Los dos casos se escriben igual y significan lo contrario. Es el agujero
  // de `veredictoBusqueda`.
  comprobar('con la lista vacía dice «no se pudo mirar»', veredicto([]).estado === 'noSePudoMirar')
  comprobar('con null también', veredicto(null).estado === 'noSePudoMirar')
  comprobar(
    'y NUNCA dice que no exista',
    !/no exist|ninguno sirve/i.test(veredicto([]).texto.replace(/NO dice que no exista/i, '')),
  )
  const noRespondieron = [{ simbolo: 'DXY', respondio: false }, { simbolo: 'DX', respondio: false }]
  comprobar('dos que no respondieron siguen siendo «no se pudo mirar»', veredicto(noRespondieron).estado === 'noSePudoMirar')
  // Y la contraria: habiendo leído, sí se puede concluir.
  const soloAcciones = [{ simbolo: 'GOLD', respondio: true, esIndice: false, velas: 0 }]
  comprobar('habiendo leído una acción, dice «ninguno sirve»', veredicto(soloAcciones).estado === 'ningunoSirve')
  const bueno = [
    { simbolo: 'GOLD', respondio: true, esIndice: false, velas: 0 },
    { simbolo: 'DXY', respondio: true, esIndice: true, precioOk: true, velas: 3000 },
  ]
  const vb = veredicto(bueno)
  comprobar('con uno bueno dice que hay candidatos y lo NOMBRA', vb.estado === 'hayCandidatos' && vb.sirven.join() === 'DXY')
  // Un índice de verdad con precio implausible no sirve: es la segunda red.
  const raro = [{ simbolo: 'DXY', respondio: true, esIndice: true, precioOk: false, velas: 3000 }]
  comprobar('un índice con precio implausible NO sirve', veredicto(raro).estado === 'ningunoSirve')
}

console.log('\n5. ⚠️ «Aporta algo» mira el VALOR ABSOLUTO, y la duda no es un no')
{
  comprobar('−0,96 es tan redundante como +0,96', aportaAlgo(-0.96).aporta === false && aportaAlgo(0.96).aporta === false)
  comprobar('0,42 sí aporta', aportaAlgo(0.42).aporta === true)
  comprobar(`el borde exacto (${REDUNDANTE_DESDE}) cuenta como redundante`, aportaAlgo(REDUNDANTE_DESDE).aporta === false)
  comprobar('un pelo por debajo aporta', aportaAlgo(REDUNDANTE_DESDE - 0.001).aporta === true)
  // ⚠️ `null` es «no se pudo calcular», que NO es «no aporta». Misma decisión
  // que `pearson` devolviendo null en vez de 0.
  comprobar('null es null, ni true ni false', aportaAlgo(null).aporta === null)
  comprobar('NaN también', aportaAlgo(NaN).aporta === null)
  comprobar('y lo dice con esas palabras', /ni «aporta» ni «no aporta»/.test(aportaAlgo(null).texto))
}

console.log('\n6. La sonda está cableada a este juicio, no a una copia')
{
  const s = readFileSync(new URL('./sonda-indices.mjs', import.meta.url), 'utf8')
  comprobar('importa el juicio en vez de reimplementarlo', /from '\.\/lib\/indices\.mjs'/.test(s))
  comprobar('usa `esIndiceDeVerdad`', /esIndiceDeVerdad\(/.test(s))
  comprobar('usa `veredicto(`', /veredicto\(fichas\)/.test(s))
  // ⚠️ La correlación va sobre CAMBIOS DIARIOS, no sobre el nivel. Está medido
  // en este repositorio que el método malo da +0,99 donde el bueno da −1,00.
  comprobar('correlaciona cambios diarios', /pearson\(cambiosDiarios\(/.test(s))
  // ⚠️ Y la fuerza del dólar NO se reimplementa: se le pide a `computarBarrido`.
  comprobar('la fuerza del dólar sale de `computarBarrido`', /computarBarrido\(trozo/.test(s) && /\.raw\.USD/.test(s))
  // ⚠️ La llave nunca se imprime: los dos repositorios son públicos.
  comprobar('tiene un filtro que tapa la llave en los mensajes', /replaceAll\(LLAVE/.test(s))
  comprobar('y lo usa al imprimir errores', /sinLlave\(/.test(s))
  // Y que no se le haya colado una lista de tipos propia.
  comprobar(
    'no lleva su propia lista de tipos de acción',
    !TIPOS_DE_ACCION.some((t) => new RegExp(`'${t}'`, 'i').test(s)),
  )
}

console.log('')
if (mal) {
  console.log(`✗ ${mal} comprobación(es) MAL.`)
  process.exit(1)
}
console.log('✓ Todo bien.')
