// LOS EXPERIMENTOS DE ESTA APP QUE PUEDEN AVISAR AL CELULAR (Swing).
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

// Lo que vale mientras alguien no ha tocado ningún interruptor.
//
// ⚠️ DESDE EL 2026-11-15 LOS VEN TODOS LOS MIEMBROS, y un suscriptor que no
// toca nada NO recibe ninguno: encenderlo tiene que ser una decisión suya,
// leída la advertencia de que no son señales. Solo el administrador conserva lo
// que recibía antes de los interruptores (solo «comprar la caída»).
export const DEFECTO_ADMIN = ['caida']
export const DEFECTO_MIEMBRO = []
export const defectoPara = (esAdmin) => (esAdmin ? DEFECTO_ADMIN : DEFECTO_MIEMBRO)

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
