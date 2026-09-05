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
function unir(senales, resultados) {
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

  return { filas, filasReversion, resumen: resumir(resultados) }
}
