// Prueba del Ichimoku y de su listón. Sin internet:
//
//     node scripts/prueba-ichimoku.mjs
//
// Lo que se comprueba son las formas en que esto puede mentir sin fallar:
//   1. la nube calculada HOY en vez de hace 26 velas (otro indicador con el
//      mismo nombre);
//   2. dar líneas con menos velas de las que hacen falta;
//   3. que la candidata y el control dejen de ser el mismo disparo al revés;
//   4. que el listón dé un verde sobre un grupo vacío;
//   5. que el guion mida con otra cosa de la que dice.

import { readFileSync } from 'node:fs'
import { DESPLAZAMIENTO, KIJUN, SENKOU_B, TENKAN, ichimokuEn, ordenPorIchimoku, reglaIchimoku } from '../src/lib/ichimoku.js'
import { DISPARO_CANDIDATO, FECHA_DEL_LISTON, LECTURA_CANDIDATA, LECTURA_CONTROL, MIN_OPS, QUE_HACER, juzgar } from './lib/preregistro-ichimoku.mjs'

let fallos = 0
const comprobar = (que, bien) => {
  console.log(`${bien ? '  OK  ' : '  MAL '} ${que}`)
  if (!bien) fallos++
}
const cerca = (a, b, tol = 1e-9) => a != null && Math.abs(a - b) <= tol

console.log('\n1. Los periodos son los estándar')
comprobar('9 · 26 · 52 y desplazamiento 26', TENKAN === 9 && KIJUN === 26 && SENKOU_B === 52 && DESPLAZAMIENTO === 26)

console.log('\n2. Las líneas, contra cuentas a mano')
{
  // Una serie que sube de 1 en 1: máximo = i + 1, mínimo = i.
  const H = Array.from({ length: 120 }, (_, i) => i + 1)
  const L = Array.from({ length: 120 }, (_, i) => i)
  const i = 100
  const x = ichimokuEn(H, L, i)
  // Tenkan: velas 92..100 → máx 101, mín 92 → 96.5
  comprobar('Tenkan = (máx + mín de 9 velas) / 2 = 96.5', cerca(x.tenkan, 96.5))
  // Kijun: velas 75..100 → máx 101, mín 75 → 88
  comprobar('Kijun = (máx + mín de 26 velas) / 2 = 88', cerca(x.kijun, 88))
  // ⚠️ La nube de la vela 100 se calculó en la 74.
  // Tenkan(74) = (75 + 66)/2 = 70.5 · Kijun(74) = (75 + 49)/2 = 62 · senA = 66.25
  comprobar('⚠️ Senkou A en la vela 100 sale de la vela 74 (66.25), no de la 100', cerca(x.senA, 66.25))
  // Senkou B(74): velas 23..74 → (75 + 23)/2 = 49
  comprobar('Senkou B en la vela 100 sale de la vela 74 (49)', cerca(x.senB, 49))
  comprobar('techo y suelo de la nube', cerca(x.techo, 66.25) && cerca(x.suelo, 49))
  comprobar('con menos de 77 velas antes → null', ichimokuEn(H, L, 70) === null && ichimokuEn(H, L, 77) !== null)
  comprobar('un dato roto → null, no líneas inventadas', ichimokuEn(H.map((v, k) => (k === 95 ? NaN : v)), L, 100) === null)
}

console.log('\n3. El disparo y su control')
{
  // Mercado: baja 80 velas y luego sube fuerte. Hay que encontrar el día del
  // cruce de la Tenkan sobre la Kijun.
  const cierres = [...Array.from({ length: 90 }, (_, i) => 200 - i), ...Array.from({ length: 60 }, (_, i) => 110 + i * 3)]
  const H = cierres.map((c) => c + 1)
  const L = cierres.map((c) => c - 1)
  let dia = -1
  for (let i = 80; i < cierres.length; i++) {
    const a = ichimokuEn(H, L, i - 1)
    const b = ichimokuEn(H, L, i)
    if (a && b && a.tenkan <= a.kijun && b.tenkan > b.kijun) {
      dia = i
      break
    }
  }
  comprobar('(el mercado inventado tiene un cruce al alza)', dia > 0)
  const p = (i) => ({ highs: H.slice(0, i + 1), lows: L.slice(0, i + 1), c: cierres[i], serie20: cierres.slice(i - 19, i + 1), atrAbs: 2 })
  const enCruce = p(dia)
  comprobar('el cruce solo dispara COMPRA ese día', reglaIchimoku({ disparo: 'cruce' })(enCruce) === 'COMPRA')
  comprobar('el día anterior no dispara (es un evento, no un estado)', reglaIchimoku({ disparo: 'cruce' })(p(dia - 1)) === null)
  const nube = ichimokuEn(H, L, dia)
  const fuerte = reglaIchimoku({ disparo: 'cruceFuerte' })(enCruce)
  comprobar('el cruce fuerte solo si el cierre está por encima de la nube', fuerte === (cierres[dia] > nube.techo ? 'COMPRA' : null))
  comprobar('el control opera el MISMO disparo al revés', reglaIchimoku({ disparo: 'cruce', lectura: 'contra' })(enCruce) === 'VENTA')
  comprobar('la candidata es el cruce fuerte, a favor; el control, al revés', DISPARO_CANDIDATO === 'cruceFuerte' && LECTURA_CANDIDATA === 'aFavor' && LECTURA_CONTROL === 'contra')
  comprobar('el orden es la distancia Tenkan–Kijun en ATR, y no revienta sin datos', ordenPorIchimoku()(enCruce) >= 0 && ordenPorIchimoku()({}) === 0)
  comprobar('sin velas suficientes no hay señal', reglaIchimoku()({ highs: [1, 2], lows: [0, 1], c: 1 }) === null)
}

console.log('\n4. El listón: escrito antes, y no da verdes sobre grupos vacíos')
{
  comprobar(`fecha del listón ${FECHA_DEL_LISTON}`, FECHA_DEL_LISTON === '2026-11-15')
  const bueno = { ops: 400, por1R: 0.05, mitad1: 0.04, mitad2: 0.06 }
  const base = { candidata: bueno, control: { ops: 400, por1R: -0.05, mitad1: -0.04, mitad2: -0.06 }, candidataSwap: { por1R: 0.02 }, meses: 40, porPar: 0.15 }
  comprobar('un caso que cumple todo PASA', juzgar(base).pasa === true)
  comprobar('sin candidata → no se pudo medir', Boolean(juzgar({ ...base, candidata: null }).noSePudoMedir))
  comprobar(`con menos de ${MIN_OPS} operaciones → no se pudo medir`, Boolean(juzgar({ ...base, candidata: { ...bueno, ops: 50 } }).noSePudoMedir))
  comprobar('muerde: el control sale mejor', juzgar({ ...base, control: { ...base.control, por1R: 0.09 } }).pasa === false)
  comprobar('muerde: pierde una mitad', juzgar({ ...base, candidata: { ...bueno, mitad1: -0.01 } }).pasa === false)
  comprobar('lo que pasa si no pasa: no entra en el Analizador', /NO entra en el Analizador/.test(QUE_HACER.noPasa))
}

console.log('\n5. ⚠️ El guion de medición usa lo que dice usar')
{
  const g = readFileSync(new URL('./medir-ichimoku.mjs', import.meta.url), 'utf8')
  comprobar('importa la regla de la librería', /from '\.\.\/src\/lib\/ichimoku\.js'/.test(g) && !/function ichimokuEn/.test(g))
  comprobar('juzga el disparo del listón', /disparo: DISPARO_CANDIDATO, lectura: LECTURA_CANDIDATA/.test(g))
  comprobar('el control usa el MISMO disparo', /disparo: DISPARO_CANDIDATO, lectura: LECTURA_CONTROL/.test(g))
  comprobar('vara NEUTRA y umbral importado', /geometria: simetrica/.test(g) && /UMBRAL_FUERZA/.test(g))
  comprobar('el calentamiento cubre las 77 velas que pide la nube', Number(g.match(/CALENTAMIENTO = (\d+)/)?.[1]) >= 77)
}

console.log(`\n${fallos ? `✗ ${fallos} comprobaciones fallaron` : '✓ todo bien'}`)
process.exit(fallos ? 1 : 0)
