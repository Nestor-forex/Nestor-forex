import { useEffect, useState } from 'react'
import { resumir } from './historialCalc.js'

// De dónde salen los datos del historial.
//
// El vigía los va escribiendo en la rama `datos` del repositorio, y GitHub
// sirve esos archivos tal cual por https. Así que la app los lee directamente
// de ahí: sin base de datos, sin servidor propio y sin costo. El repositorio
// es público, así que no hace falta ninguna clave.
//
// La alternativa habría sido guardarlos en Firestore, pero eso serían miles
// de escrituras al mes para unos archivos que ya existen y que además
// conviene que sean públicos: son la prueba de si la app acierta.
const BASE = 'https://raw.githubusercontent.com/Nestor-forex/Nestor-forex/datos/historial'

const LIMITE_MS = 15_000

async function bajarJsonl(archivo) {
  const r = await fetch(`${BASE}/${archivo}`, {
    signal: AbortSignal.timeout(LIMITE_MS),
    // GitHub guarda estos archivos en caché unos minutos; con esto al menos
    // no se suma la caché del propio navegador encima.
    cache: 'no-cache',
  })

  // Todavía no existe: es lo normal hasta que aparezca la primera señal.
  if (r.status === 404) return []
  if (!r.ok) throw new Error(`HTTP ${r.status}`)

  const texto = await r.text()
  const salida = []
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue
    try {
      salida.push(JSON.parse(linea))
    } catch {
      // Línea a medias (el vigía escribía justo en ese momento): se salta.
    }
  }
  return salida
}

// ⚠️ EL RESUMEN REAL, PARA QUIEN NO NECESITA LA LISTA ENTERA (2026-09-16).
//
// El tablero completo enseña, al lado de la regla de reversión, cómo le va en
// operaciones REALES. Hasta hoy ese número estaba ESCRITO A MANO en
// `medicion.js` y se había quedado viejo: la pantalla decía «12 ops · 6–6 ·
// +117 pips» EN VERDE cuando lo real eran 18 · 7–11 · −337 en rojo. O sea que
// un experimento aparecía GANANDO mientras perdía — justo el error que este
// proyecto entero existe para no cometer.
//
// Y es la SEGUNDA vez que ese mismo bloque envejece en silencio (la primera
// está anotada dentro de `medicion.js`, con su corrección). Por eso el arreglo
// no es volver a escribirlo bien: es que nadie tenga que acordarse. Se cuenta
// en vivo con la MISMA función que usa la pestaña Historial, así que los dos
// sitios no pueden discrepar entre sí.
//
// Baja SOLO `resultados.jsonl` (18 KB) y no `senales.jsonl`: `resumir` no
// mira las señales, y el tablero no pinta ninguna lista. Y solo se baja al
// abrir el tablero completo, que es donde se enseña.
export function useResumenReal() {
  const [estado, setEstado] = useState({ cargando: true, error: '', resumen: null })

  useEffect(() => {
    let vivo = true

    bajarJsonl('resultados.jsonl')
      .then((resultados) => {
        if (vivo) setEstado({ cargando: false, error: '', resumen: resumir(resultados) })
      })
      .catch((e) => {
        if (vivo) {
          setEstado({
            cargando: false,
            error: e?.name === 'TimeoutError' ? 'tiempo' : e?.message || 'error',
            // ⚠️ `null` y no un número de respaldo. Si no se pudo contar, la
            // pantalla no enseña nada — nunca un número viejo. Los dos errores
            // no cuestan lo mismo: una fila que falta se nota y se pregunta;
            // un número inventado que favorece al experimento se cree.
            resumen: null,
          })
        }
      })

    return () => {
      vivo = false
    }
  }, [])

  return estado
}

export function useHistorial() {
  const [estado, setEstado] = useState({ cargando: true, error: '', senales: [], resultados: [] })

  useEffect(() => {
    let vivo = true

    Promise.all([bajarJsonl('senales.jsonl'), bajarJsonl('resultados.jsonl')])
      .then(([senales, resultados]) => {
        if (vivo) setEstado({ cargando: false, error: '', senales, resultados })
      })
      .catch((e) => {
        if (vivo) {
          setEstado({
            cargando: false,
            error: e?.name === 'TimeoutError' ? 'tiempo' : e?.message || 'error',
            senales: [],
            resultados: [],
          })
        }
      })

    return () => {
      vivo = false
    }
  }, [])

  return { ...estado, ...unir(estado.senales, estado.resultados) }
}

// Junta cada señal con su resultado, si ya lo tiene, y las ordena de la más
// reciente a la más vieja.
export function unir(senales, resultados) {
  const porClave = new Map(resultados.map((r) => [r.clave, r]))

  const conResultado = (s) => {
    const r = porClave.get(`${s.id}@${s.vistoEl}`)
    return { ...s, resultado: r?.resultado || 'abierta', pips: r?.pips, exacto: r?.exacto }
  }
  const masNuevaPrimero = (a, b) => (a.vistoEl < b.vistoEl ? 1 : -1)

  // Las señales que la app SÍ propone. Las de sombra quedan fuera: el vigía
  // las anota para acumular datos reales, pero nadie recibió aviso de ellas y
  // mezclarlas aquí las haría leer como recomendaciones.
  const filas = senales.filter((s) => !s.sombra).map(conResultado).sort(masNuevaPrimero)

  // ⚠️ LA REVERSIÓN VA EN SU PROPIA LISTA, y esto es lo que Néstor pidió ver:
  // poder distinguir cuál es cuál. Hasta el 2026-09-05 sus operaciones se
  // guardaban pero no se veían en ninguna pantalla — solo salía el número del
  // banco de pruebas, que es historia simulada, no lo que va pasando de verdad.
  //
  // Se filtra por `tipo`, NO por `sombra`: en la sombra también están las
  // ventas pausadas, que son otro experimento distinto. Filtrar por sombra
  // habría mezclado los dos.
  const filasReversion = senales
    .filter((s) => s.tipo === 'reversion')
    .map(conResultado)
    .sort(masNuevaPrimero)

  // ⚠️ UNA SOLA LISTA, EN ORDEN DE FECHA, con las reversiones etiquetadas.
  //
  // Néstor lo pidió así después de ver las dos listas separadas: quiere leer
  // la historia como pasó —un renglón detrás de otro— y que cada reversión
  // diga que lo es, en vez de tener que saltar entre dos bloques.
  //
  // Lo que SÍ sigue separado son los NÚMEROS: los porcentajes de arriba van
  // por regla, cada uno con el suyo. Mezclar las filas es cómodo; mezclar los
  // promedios haría que ninguno respondiera su pregunta. Son dos cosas
  // distintas y solo una de ellas es peligrosa.
  // Y la tercera, «comprar la caída», desde el 2026-09-07. Sin esta lista sus
  // señales no aparecerían en NINGUNA pantalla: no están en `filas` (son
  // sombra) y no son reversión. Se habrían anotado durante meses sin que
  // Néstor pudiera ver ni una.
  const filasCaida = senales.filter((s) => s.tipo === 'caida').map(conResultado).sort(masNuevaPrimero)

  // Y la cuarta, «ruptura de estructura sola», desde el 2026-09-21. Mismo
  // motivo exacto que la de arriba, y conviene ver que es la TERCERA vez que
  // este descuido aparece en el proyecto (`caida` en el tablero, `retroceso`
  // en Intradía): un experimento nuevo no termina cuando el vigía lo anota,
  // termina cuando se puede VER. Sin esta línea sus señales no saldrían en
  // ninguna pantalla y nadie lo notaría, porque nada falla.
  const filasRuptura = senales.filter((s) => s.tipo === 'lss').map(conResultado).sort(masNuevaPrimero)

  // ⚠️⚠️ EL CAJÓN DE LO QUE NADIE HA INVENTADO TODAVÍA, y es la pieza que
  // faltaba las TRES veces que este fallo mordió.
  //
  // Las listas de arriba ENUMERAN los tipos conocidos. Eso significa que una
  // regla de sombra nueva —la que se añada el mes que viene— se anotaría
  // durante meses sin salir en ninguna pantalla, exactamente como pasó con
  // «comprar la caída» y con el «retroceso» de Intradía. Y no falla nada: la
  // lista simplemente no la incluye y nadie lo nota.
  //
  // Con esto, un `tipo` desconocido APARECE (sin etiqueta bonita, pero
  // aparece) en vez de desaparecer. Equivocarse hacia «sale una fila rara»
  // cuesta una fila rara; hacia «no sale» cuesta meses de registro invisible.
  // ⚠️ `'tendencia'` va en la lista de conocidos y NO es un descuido: una señal
  // de sombra con ese tipo es una VENTA PAUSADA —una señal de la propia app
  // que se anota pero no se propone—, ya tiene su cubo en `resumir()` y a
  // propósito no se lista: puesta entre las demás se leería como una
  // recomendación que la app nunca hizo. Lo mismo las señales viejas sin
  // `tipo`. Aquí solo cae lo que de verdad no conoce nadie.
  const CONOCIDOS = new Set(['tendencia', 'reversion', 'caida', 'lss'])
  const filasOtras = senales
    .filter((s) => s.sombra && s.tipo && !CONOCIDOS.has(s.tipo))
    .map(conResultado)
    .sort(masNuevaPrimero)

  const filasTodas = [
    ...filas,
    ...filasReversion,
    ...filasCaida,
    ...filasRuptura,
    ...filasOtras,
  ].sort(masNuevaPrimero)

  return {
    filas,
    filasReversion,
    filasCaida,
    filasRuptura,
    filasOtras,
    filasTodas,
    resumen: resumir(resultados),
  }
}
