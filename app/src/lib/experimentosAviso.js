// LOS EXPERIMENTOS DE ESTA APP QUE PUEDEN AVISAR AL ADMINISTRADOR (Swing).
//
// PRIMO: la lista es distinta en cada app. Aquí, las señales de la app, las
// ventas que están en pausa y las cuatro reglas de la sombra. La cuenta de qué
// está activado vive en `avisosExperimento.js`, que es GEMELO.
//
// ⚠️ `claveDeSenal` RECONOCE CADA SEÑAL POR LO QUE ES, y lo que no reconoce
// devuelve null —y entonces no avisa—. Una regla nueva no puede empezar a sonar
// en el celular de nadie hasta que alguien venga a escribirla aquí. Es la misma
// forma de escribir que `esSombra`: olvidarse de encender algo retrasa un aviso;
// olvidarse de apagarlo manda lo que nadie decidió probar.
import { VENTAS_PAUSADAS } from './reglas.js'

export const OPCIONES = [
  { clave: 'caida', etiqueta: 'avisosExp.op.caida' },
  { clave: 'app', etiqueta: 'avisosExp.op.app' },
  { clave: 'pausadas', etiqueta: 'avisosExp.op.pausadas' },
  { clave: 'reversion', etiqueta: 'avisosExp.op.reversion' },
  { clave: 'bollinger', etiqueta: 'avisosExp.op.bollinger' },
  { clave: 'ruptura', etiqueta: 'avisosExp.op.ruptura' },
]

// Lo que se mandaba antes de los interruptores (2026-11-14): solo «comprar la
// caída». Vale mientras el administrador no haya tocado ninguno.
export const DEFECTO = ['caida']

// Las que son señales DE LA APP. Por aquí solo suenan mientras los avisos de la
// app estén en pausa: si se reactivan, ya le llegan por el camino normal y por
// aquí sonarían dos veces.
export const DE_LA_APP = new Set(['app'])

const POR_TIPO = { reversion: 'reversion', caida: 'caida', bollinger: 'bollinger', lss: 'ruptura' }

/** A qué interruptor pertenece una señal del vigía, o null si a ninguno. */
export function claveDeSenal(s) {
  if (!s) return null
  // Las de la app: sin `tipo` o con `tendencia`. Con las ventas en pausa, una
  // venta de la app es otra cosa (se anota pero no se propone), así que tiene
  // su propio interruptor — el mismo criterio que `esSombra` del vigía.
  if (!s.tipo || s.tipo === 'tendencia') return VENTAS_PAUSADAS && s.lado === 'VENTA' ? 'pausadas' : 'app'
  return POR_TIPO[s.tipo] ?? null
}
