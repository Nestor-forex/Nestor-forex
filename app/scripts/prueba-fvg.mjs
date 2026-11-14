// Prueba del FVG (brecha de valor justo) y de su listón. Sin internet:
//
//     node scripts/prueba-fvg.mjs
//
// Lo que se comprueba son las formas en que esto puede MENTIR sin fallar:
//
//   1. dibujar un hueco donde no lo hay (tamaño cero, o un dato roto);
//   2. llamar «abierto» a un hueco que el precio ya tocó, o al revés;
//   3. mirar el futuro: un hueco cerrado HOY no puede «volver a tocarse» hoy;
//   4. que la candidata y el control dejen de ser el mismo disparo con lados
//      opuestos y nadie lo note;
//   5. que una vela a medias forme un hueco en el Analizador;
//   6. y que el listón dé un verde sobre un grupo vacío.

import { readFileSync } from 'node:fs'
import { estadoDe, huecoQueDispara, huecosDe, huecosVivos, ordenPorFVG, reglaFVG } from './lib/fvg.mjs'
import {
  EXIGE_CONTROL_PEOR,
  FECHA_DEL_LISTON,
  LECTURA_CANDIDATA,
  LECTURA_CONTROL,
  MIN_OPS,
  PARAMS_JUZGADA,
  QUE_HACER,
  juzgar,
} from './lib/preregistro-fvg.mjs'

let fallos = 0
const comprobar = (que, bien) => {
  console.log(`${bien ? '  OK  ' : '  MAL '} ${que}`)
  if (!bien) fallos++
}

console.log('\n1. Detectar el hueco, contra casos hechos a mano')
{
  // Velas: 0) 1.00-1.10  1) 1.08-1.30 (la grande)  2) 1.15-1.35
  // Mínimo de la vela 3 (1.15) > máximo de la vela 1 (1.10): hueco alcista 1.10-1.15.
  const H = [1.1, 1.3, 1.35]
  const L = [1.0, 1.08, 1.15]
  const h = huecosDe(H, L)
  comprobar('un hueco alcista', h.length === 1 && h[0].tipo === 'alcista')
  comprobar('sus bordes son 1.10 y 1.15', h[0]?.abajo === 1.1 && h[0]?.arriba === 1.15)
  comprobar('lo confirma la vela 3 (k = 2)', h[0]?.k === 2)

  // El espejo bajista.
  const hb = huecosDe([2.0, 1.95, 1.7], [1.8, 1.6, 1.5])
  comprobar('un hueco bajista: máx de la vela 3 (1.7) < mín de la vela 1 (1.8)', hb.length === 1 && hb[0].tipo === 'bajista')
  comprobar('sus bordes son 1.7 y 1.8', hb[0]?.abajo === 1.7 && hb[0]?.arriba === 1.8)

  // ⚠️ Tamaño cero NO es un hueco.
  comprobar('mínimo de la vela 3 IGUAL al máximo de la vela 1 → sin hueco', huecosDe([1.1, 1.3, 1.35], [1.0, 1.08, 1.1]).length === 0)
  // ⚠️ Un dato roto no forma hueco.
  comprobar('un NaN no forma hueco', huecosDe([NaN, 1.3, 1.35], [1.0, 1.08, 1.15]).length === 0)
  comprobar('series de distinto largo → nada', huecosDe([1, 2, 3], [1, 2]).length === 0)
  comprobar('sin datos → lista vacía, no revienta', Array.isArray(huecosDe(null, null)))
}

console.log('\n2. El estado: abierto, tocado o relleno — se mide con la MECHA')
{
  const hueco = { tipo: 'alcista', k: 2, abajo: 1.1, arriba: 1.15, tam: 0.05 }
  const H = [1.1, 1.3, 1.35, 1.4, 1.38]
  comprobar('sin tocar → abierto', estadoDe(hueco, H, [1.0, 1.08, 1.15, 1.2, 1.18])?.estado === 'abierto')
  comprobar('una mecha que entra sin atravesar → tocado', estadoDe(hueco, H, [1.0, 1.08, 1.15, 1.2, 1.12])?.estado === 'tocado')
  comprobar('una mecha que lo cruza entero → relleno', estadoDe(hueco, H, [1.0, 1.08, 1.15, 1.2, 1.09])?.estado === 'relleno')
  comprobar('tocar EXACTAMENTE el borde de arriba NO es entrar', estadoDe(hueco, H, [1.0, 1.08, 1.15, 1.2, 1.15])?.estado === 'abierto')
  comprobar('el índice de la primera vela que lo tocó', estadoDe(hueco, H, [1.0, 1.08, 1.15, 1.12, 1.13])?.j === 3)
  // Bajista.
  const hb = { tipo: 'bajista', k: 2, abajo: 1.7, arriba: 1.8, tam: 0.1 }
  comprobar('bajista: un máximo que entra → tocado', estadoDe(hb, [2, 1.95, 1.7, 1.75], [1.8, 1.6, 1.5, 1.55])?.estado === 'tocado')
  comprobar('bajista: un máximo que lo cruza → relleno', estadoDe(hb, [2, 1.95, 1.7, 1.81], [1.8, 1.6, 1.5, 1.55])?.estado === 'relleno')
}

console.log('\n3. El disparo: el PRIMER regreso, y sin mirar el futuro')
{
  // Hueco alcista 1.10-1.15 confirmado en la vela 2; las velas 3 y 4 no lo
  // tocan; HOY (vela 5) su mínimo entra y cierra dentro.
  const H = [1.1, 1.3, 1.35, 1.4, 1.38, 1.3]
  const L = [1.0, 1.08, 1.15, 1.2, 1.18, 1.12]
  const d = huecoQueDispara(H, L, 1.14, 0.05)
  comprobar('dispara el hueco alcista', d?.tipo === 'alcista' && d?.k === 2)

  // ⚠️ Si ya se había tocado ayer, no es el primer regreso.
  const L2 = [1.0, 1.08, 1.15, 1.2, 1.13, 1.12]
  comprobar('tocado AYER → hoy no dispara', huecoQueDispara(H, L2, 1.14, 0.05) === null)

  // ⚠️ Cerrar atravesándolo entero → no hay señal.
  comprobar('hoy cierra por debajo del borde de abajo → no dispara', huecoQueDispara(H, L, 1.09, 0.05) === null)

  // ⚠️ Un hueco cerrado HOY no puede volver a tocarse hoy.
  const Hhoy = [1.1, 1.3, 1.35]
  const Lhoy = [1.0, 1.08, 1.15]
  // (Esto se cumple POR CONSTRUCCIÓN: el mínimo de la vela 3 ES el borde de
  // arriba, así que la propia vela no puede «entrar». Se deja escrito para que
  // nadie lo dé por una comprobación que muerde: no muerde, y no hace falta.)
  comprobar('un hueco que se cierra HOY no dispara hoy (por construcción)', huecoQueDispara([1.0, ...Hhoy], [0.9, ...Lhoy], 1.3, 0.05) === null)

  // Fuera de la ventana no cuenta.
  const lejos = [...H.slice(0, 3), ...Array(25).fill(1.4), 1.3]
  const lejosL = [...L.slice(0, 3), ...Array(25).fill(1.2), 1.12]
  comprobar('un hueco de hace más de 20 velas no dispara', huecoQueDispara(lejos, lejosL, 1.14, 0.05, { ventana: 20 }) === null)

  // Tamaño mínimo.
  comprobar('con tamaño mínimo 2 ATR un hueco de 0.05 con ATR 0.05 no dispara', huecoQueDispara(H, L, 1.14, 0.05, { minATR: 2 }) === null)
  comprobar('con tamaño mínimo y ATR desconocido → null, no «pasa»', huecoQueDispara(H, L, 1.14, null, { minATR: 0.25 }) === null)
}

console.log('\n4. ⚠️ Candidata y control: el MISMO disparo, lados opuestos')
{
  const p = {
    highs: [1.1, 1.3, 1.35, 1.4, 1.38, 1.3],
    lows: [1.0, 1.08, 1.15, 1.2, 1.18, 1.12],
    c: 1.14,
    atrAbs: 0.05,
  }
  comprobar('la candidata está fijada en continuación', LECTURA_CANDIDATA === 'continuacion')
  comprobar('el control está fijado en contra', LECTURA_CONTROL === 'contra')
  comprobar('continuación compra el regreso a un hueco alcista', reglaFVG({ lectura: 'continuacion' })(p) === 'COMPRA')
  comprobar('el control vende ese MISMO regreso', reglaFVG({ lectura: 'contra' })(p) === 'VENTA')
  comprobar('sin disparo, las dos devuelven null', reglaFVG()({ ...p, c: 1.09 }) === null && reglaFVG({ lectura: 'contra' })({ ...p, c: 1.09 }) === null)
  comprobar('el orden es el tamaño del hueco en ATR (0.05/0.05 = 1)', Math.abs(ordenPorFVG()(p) - 1) < 1e-9)
  comprobar('sin disparo el orden es 0, no revienta', ordenPorFVG()({ ...p, c: 1.09 }) === 0)

  // ⚠️ Los dos lados a la vez → sin señal.
  const hAlc = [1.1, 1.3, 1.35]
  const lAlc = [1.0, 1.08, 1.15]
  // Construir un caso con un alcista y un bajista vivos y tocados hoy a la vez.
  const H = [1.1, 1.3, 1.35, 1.4, 1.6, 1.5, 1.3, 1.6]
  const L = [1.0, 1.08, 1.15, 1.2, 1.5, 1.45, 1.25, 1.12]
  // bajista: vela 4 (L 1.5) vs vela 6 (H 1.3): 1.3 < 1.5 → hueco 1.3-1.5
  const hs = huecosDe(H, L, { hasta: 6 })
  const hayDos = hs.some((h) => h.tipo === 'alcista') && hs.some((h) => h.tipo === 'bajista')
  comprobar('(el caso tiene un hueco de cada lado)', hayDos && hAlc.length === lAlc.length)
  comprobar('si hoy se tocan los dos lados, no hay señal', huecoQueDispara(H, L, 1.4, 0.05) === null)
}

console.log('\n5. Lo que enseña el Analizador: los huecos VIVOS')
{
  const H = [1.1, 1.3, 1.35, 1.4, 1.38]
  const L = [1.0, 1.08, 1.15, 1.2, 1.12]
  const v = huecosVivos(H, L)
  comprobar('el hueco tocado sigue vivo (no se rellenó)', v?.length === 1 && v[0].estado === 'tocado')
  comprobar('lleva cuántas velas atrás se formó', v?.[0]?.velasAtras === 2)
  const relleno = huecosVivos(H, [1.0, 1.08, 1.15, 1.2, 1.05])
  comprobar('un hueco rellenado ya no sale', Array.isArray(relleno) && relleno.length === 0)

  // ⚠️ Una vela a medias NO puede ser la vela 3.
  const Hm = [1.1, 1.3, 1.35]
  const Lm = [1.0, 1.08, 1.15]
  comprobar('sin vela en curso, la última vela confirma el hueco', huecosVivos(Hm, Lm)?.length === 1)
  comprobar('con vela en curso, la última vela NO confirma ningún hueco', huecosVivos(Hm, Lm, { velaEnCurso: true })?.length === 0)
  // ⚠️ «No lo sé» no es «no hay».
  comprobar('sin datos → null (no lo sé), no []', huecosVivos(null, null) === null)
  comprobar('con un NaN dentro → null, no huecos inventados', huecosVivos([1.1, NaN, 1.35], [1.0, 1.08, 1.15]) === null)
  comprobar('ordenados del más reciente al más viejo', (() => {
    const HH = [1.1, 1.3, 1.35, 1.5, 1.7, 1.75]
    const LL = [1.0, 1.08, 1.15, 1.4, 1.55, 1.6]
    const vv = huecosVivos(HH, LL)
    return vv.length >= 2 && vv.every((x, i) => i === 0 || vv[i - 1].k > x.k)
  })())
}

console.log('\n6. El listón: escrito antes, y no da verdes sobre grupos vacíos')
{
  comprobar(`fecha del listón ${FECHA_DEL_LISTON} anterior a cualquier corrida`, FECHA_DEL_LISTON === '2026-11-15')
  comprobar('la variante juzgada es la pura: ventana 20, sin tamaño mínimo', PARAMS_JUZGADA.ventana === 20 && PARAMS_JUZGADA.minATR === 0)
  comprobar('el control tiene que salir peor', EXIGE_CONTROL_PEOR === true)

  const bueno = { ops: 400, por1R: 0.05, mitad1: 0.04, mitad2: 0.06 }
  const base = { candidata: bueno, control: { ops: 400, por1R: -0.05, mitad1: -0.04, mitad2: -0.06 }, candidataSwap: { por1R: 0.02 }, meses: 40, porPar: 0.15 }
  comprobar('un caso que cumple todo PASA', juzgar(base).pasa === true)
  comprobar('sin candidata → no se pudo medir (nunca verde)', juzgar({ ...base, candidata: null }).noSePudoMedir && !juzgar({ ...base, candidata: null }).pasa)
  comprobar(`con menos de ${MIN_OPS} operaciones → no se pudo medir`, Boolean(juzgar({ ...base, candidata: { ...bueno, ops: 100 } }).noSePudoMedir))
  comprobar('sin reparto por par → no se pudo medir', Boolean(juzgar({ ...base, porPar: null }).noSePudoMedir))

  const falla = (cambio) => juzgar({ ...base, ...cambio }).pasa === false
  comprobar('muerde: no gana con costes', falla({ candidata: { ...bueno, por1R: 0.01 } }))
  comprobar('muerde: pierde una mitad', falla({ candidata: { ...bueno, mitad2: -0.01 } }))
  comprobar('muerde: no aguanta el swap', falla({ candidataSwap: { por1R: -0.01 } }))
  comprobar('muerde: pocas señales al mes', falla({ meses: 100 }))
  comprobar('muerde: el control sale igual o mejor', falla({ control: { ...base.control, por1R: 0.06 } }))
  comprobar('muerde: un par se lleva más del 40 %', falla({ porPar: 0.5 }))
  comprobar('el borde exacto del umbral (0.02) pasa', juzgar({ ...base, candidata: { ...bueno, por1R: 0.02 } }).detalle[0][1] === true)
  comprobar('lo que no autoriza ningún resultado está escrito', /NO se enciende nada/.test(QUE_HACER.pasa) && /no se vuelve a medir/.test(QUE_HACER.noPasa))
}

console.log('\n7. ⚠️ El guion de medición usa lo que dice usar')
{
  const g = readFileSync(new URL('./medir-fvg.mjs', import.meta.url), 'utf8')
  comprobar('importa la regla del FVG de la librería, no tiene su copia', /from '\.\/lib\/fvg\.mjs'/.test(g) && !/function huecosDe/.test(g))
  comprobar('importa el umbral de fuerza, no lo escribe a mano', /UMBRAL_FUERZA/.test(g) && !/thr:\s*0\.5/.test(g))
  comprobar('juzga con PARAMS_JUZGADA del listón', /reglaFVG\(\{ lectura: LECTURA_CANDIDATA, \.\.\.PARAMS_JUZGADA \}\)/.test(g))
  comprobar('el control usa el MISMO disparo (PARAMS_JUZGADA)', /reglaFVG\(\{ lectura: LECTURA_CONTROL, \.\.\.PARAMS_JUZGADA \}\)/.test(g))
  comprobar('mide con la vara NEUTRA (simetrica)', /geometria: simetrica/.test(g))
  comprobar('el veredicto sale de juzgar()', /juzgar\(\{/.test(g))
}

console.log(`\n${fallos ? `✗ ${fallos} comprobaciones fallaron` : '✓ todo bien'}`)
process.exit(fallos ? 1 : 0)
