// Prueba de la correlación entre pares. Sin internet:
//
//     node scripts/prueba-correlacion.mjs
//
// Lo que se comprueba no es «que dé un número», sino las cuatro formas en que
// un cálculo de correlación puede MENTIR sin fallar:
//
//   1. calcularla sobre el precio en vez de sobre los cambios diarios (da
//      números altísimos y falsos),
//   2. devolver 0 cuando en realidad no se puede calcular (0 significa «no se
//      parecen»; no saberlo es otra cosa),
//   3. tratar una correlación negativa como si fuera baja (−0,9 es tan
//      peligroso como +0,9 para el riesgo),
//   4. y contar la misma pareja dos veces por leerla en otro orden.

import {
  CORREL_ALTA,
  VENTANA_CORREL,
  cambiosDiarios,
  claveCorrel,
  correlDe,
  matrizCorrelacion,
  paresQueVanJuntos,
  pearson,
} from '../src/lib/correlacion.js'

let fallos = 0
const comprobar = (que, bien) => {
  console.log(`${bien ? '  OK  ' : '  MAL '} ${que}`)
  if (!bien) fallos++
}
const cerca = (a, b, tol = 0.02) => a != null && Math.abs(a - b) <= tol

console.log('\n1. Los cambios diarios, que es sobre lo que se calcula todo')
{
  comprobar('de 4 cierres salen 3 cambios', cambiosDiarios([100, 110, 121, 133.1]).length === 3)
  comprobar('y valen lo que deben (+10 %)', cerca(cambiosDiarios([100, 110])[0], 0.1, 1e-9))
  comprobar('una serie de un solo punto no da cambios', cambiosDiarios([100]).length === 0)
  // Un cero partiría la serie entera con divisiones infinitas.
  comprobar('un cero por medio se salta en vez de contaminar', cambiosDiarios([100, 0, 50]).every(Number.isFinite))
  comprobar('y un hueco (null) también', cambiosDiarios([100, null, 50]).every(Number.isFinite))
}

console.log('\n2. Pearson: los tres casos que tienen que salir exactos')
{
  const a = [1, 2, 3, 4, 5]
  comprobar('idénticas → +1', cerca(pearson(a, a), 1, 1e-9))
  comprobar('opuestas → −1', cerca(pearson(a, [5, 4, 3, 2, 1]), -1, 1e-9))
  // Este es el que evita el autoengaño: sin relación tiene que dar ~0.
  comprobar('sin relación → cerca de 0', Math.abs(pearson([1, 2, 3, 4], [3, 1, 4, 2])) < 0.5)
}

console.log('\n3. Cuando NO se puede saber, dice que no se sabe (y no cero)')
{
  // ⚠️ El fallo que esto evita: devolver 0 significaría «estos dos pares no se
  // parecen», y el usuario abriría los dos creyendo que diversifica. «No lo
  // sé» y «no se parecen» no son lo mismo.
  comprobar('una serie plana → null, no 0', pearson([1, 1, 1, 1], [1, 2, 3, 4]) === null)
  comprobar('las dos planas → null', pearson([2, 2, 2], [5, 5, 5]) === null)
  comprobar('un solo punto → null', pearson([1], [1]) === null)
  comprobar('listas vacías → null', pearson([], []) === null)
}

console.log('\n4. Sobre PRECIOS daría un número falso; sobre cambios, el verdadero')
{
  // Dos pares que suben los dos a lo largo del periodo pero cuyo día a día va
  // al revés. Correlacionar los precios diría «se mueven juntos»; los cambios
  // diarios dicen la verdad, que es lo contrario.
  const subeYBaja = []
  const bajaYSube = []
  let x = 100
  let y = 100
  for (let i = 0; i < 60; i++) {
    const golpe = i % 2 === 0 ? 1 : -1
    x *= 1 + 0.01 * golpe + 0.004 // sube en el largo plazo
    y *= 1 - 0.01 * golpe + 0.004 // también sube, pero el día a día es opuesto
    subeYBaja.push(x)
    bajaYSube.push(y)
  }

  const porPrecio = pearson(subeYBaja, bajaYSube)
  const porCambios = pearson(cambiosDiarios(subeYBaja), cambiosDiarios(bajaYSube))

  comprobar(`sobre precios saldría ALTA y positiva (${porPrecio?.toFixed(2)})`, porPrecio > 0.8)
  comprobar(`sobre cambios sale negativa, que es lo cierto (${porCambios?.toFixed(2)})`, porCambios < -0.8)
  comprobar('o sea que la diferencia entre los dos métodos es enorme', Math.abs(porPrecio - porCambios) > 1.5)
}

console.log('\n5. La matriz: una entrada por pareja, no dos')
{
  const serie = (n, semilla) => {
    const out = []
    let v = 1
    for (let i = 0; i < n; i++) {
      v *= 1 + 0.004 * Math.sin(i * 0.7 + semilla)
      out.push(v)
    }
    return out
  }
  const pares = [
    { name: 'EUR/USD', serie: serie(120, 0) },
    { name: 'GBP/USD', serie: serie(120, 0.05) }, // casi igual que el primero
    { name: 'USD/JPY', serie: serie(120, 3.1) }, // desfasado medio ciclo
  ]
  const m = matrizCorrelacion(pares)

  comprobar('3 pares → 3 parejas (no 9, no 6)', Object.keys(m).length === 3)
  comprobar('la clave va en orden alfabético', 'EUR/USD|GBP/USD' in m)
  comprobar('y no está la del orden contrario', !('GBP/USD|EUR/USD' in m))
  comprobar('leerla en cualquier orden da lo mismo', correlDe(m, 'GBP/USD', 'EUR/USD') === correlDe(m, 'EUR/USD', 'GBP/USD'))
  comprobar('un par consigo mismo es 1', correlDe(m, 'EUR/USD', 'EUR/USD') === 1)
  comprobar('un par que no existe da null', correlDe(m, 'EUR/USD', 'XXX/YYY') === null)

  comprobar('las dos series casi iguales salen muy correlacionadas', correlDe(m, 'EUR/USD', 'GBP/USD') > 0.9)
  comprobar('y la desfasada sale negativa', correlDe(m, 'EUR/USD', 'USD/JPY') < -0.5)

  comprobar('los valores van redondeados a 2 decimales', Object.values(m).every((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9))
  comprobar('y ninguno se sale de [−1, 1]', Object.values(m).every((v) => v >= -1 && v <= 1))
}

console.log('\n6. Las parejas que van juntas — incluidas las NEGATIVAS')
{
  // ⚠️ Lo que vigila este bloque: que una correlación de −0,9 NO se cuele como
  // «baja». Dos pares opuestos abren y cierran la misma apuesta, y el usuario
  // se queda pagando los dos spreads para nada.
  const m = {
    'AUD/USD|NZD/USD': 0.93,
    'EUR/USD|USD/CHF': -0.91,
    'EUR/USD|GBP/USD': 0.75,
    'GBP/JPY|USD/CAD': 0.12,
  }
  const filas = paresQueVanJuntos(m)

  comprobar('las tres altas entran y la baja no', filas.length === 3)
  comprobar('la negativa fuerte SÍ está en la lista', filas.some((f) => f.a === 'EUR/USD' && f.b === 'USD/CHF'))
  comprobar('y viene marcada como que NO van juntas', filas.find((f) => f.b === 'USD/CHF').juntos === false)
  comprobar('el orden va por tamaño, sin importar el signo', Math.abs(filas[0].r) >= Math.abs(filas[1].r))
  comprobar('la más fuerte de todas es la primera', filas[0].r === 0.93)

  const soloDos = paresQueVanJuntos(m, { soloEstos: ['AUD/USD', 'NZD/USD'] })
  comprobar('filtrando por las señales de hoy queda solo la suya', soloDos.length === 1)
  comprobar('sube el mínimo → salen menos', paresQueVanJuntos(m, { minimo: 0.92 }).length === 1)
}

console.log('\n7. Los dos números que se pueden discutir están con nombre y valor')
{
  // Si algún día se cambian, que sea moviendo estas constantes y no un número
  // suelto escondido dentro de una condición.
  comprobar(`la ventana son ${VENTANA_CORREL} sesiones`, VENTANA_CORREL === 60)
  comprobar(`el umbral de «van juntos» es ${CORREL_ALTA}`, CORREL_ALTA === 0.7)
  comprobar('la clave se arma igual desde fuera', claveCorrel('B/B', 'A/A') === 'A/A|B/B')
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'La correlación mide lo que dice medir.')
process.exit(fallos ? 1 : 0)
