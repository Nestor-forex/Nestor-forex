// Publicar las reglas de seguridad de Firestore sin entrar a la consola.
//
// ⚠️ POR QUÉ EXISTE ESTO, que es lo que no hay que olvidar: el 2026-09-15 le
// pedí a Néstor que copiara 115 líneas del repositorio y las pegara a mano en
// la consola de Firebase. No pudo —el portapapeles no le funcionaba entre las
// dos ventanas— y estuvo media hora peleando con un paso que nunca debió ser
// suyo. **Pedirle a una persona que copie un archivo a mano es un fallo de
// diseño, no un paso del procedimiento.** Si el archivo vive en el
// repositorio, publicarlo es trabajo de una máquina.
//
// Y de paso arregla algo peor que la molestia: mientras se copiara a mano, lo
// que estaba PUBLICADO y lo que estaba en el repositorio podían separarse sin
// que nadie se enterara — el mismo fallo silencioso que este proyecto lleva
// meses persiguiendo. Ahora el repositorio es la única fuente.
//
// Aquí NO se usa la herramienta de Firebase (`firebase-tools`): son ~300 MB
// para dos llamadas HTTP. Es la misma decisión que con el COT y las tasas —
// leer la API oficial nosotros mismos cuando es suficientemente simple.
//
// La API son dos pasos y el orden importa:
//   1. CREAR un «ruleset»: sube el texto y lo valida. No cambia nada todavía.
//   2. PUBLICAR ese ruleset: lo pone en vigor.
// El paso 1 es inofensivo y es el que caza los errores de sintaxis, así que
// sirve de ensayo: se puede hacer siempre y decidir después si se publica.

// Permiso para tocar las reglas. NO es el mismo que para leer datos.
export const AMBITO_REGLAS = 'https://www.googleapis.com/auth/firebase'

// El nombre del «release» que Firestore mira para saber qué reglas rigen.
// Es fijo y lo define Google; no es un nombre que elijamos nosotros.
export const RELEASE = 'cloud.firestore'

export const rutaRulesets = (proyecto) =>
  `https://firebaserules.googleapis.com/v1/projects/${proyecto}/rulesets`

export const rutaRelease = (proyecto) =>
  `https://firebaserules.googleapis.com/v1/projects/${proyecto}/releases/${RELEASE}`

// El sobre que espera la API para crear un ruleset.
//
// ⚠️ El `name` del archivo NO es una ruta del disco: es una etiqueta que sale
// en los mensajes de error de Google. Se pone `firestore.rules` para que, si
// algo falla, el error diga el mismo nombre que el archivo del repositorio y
// no haya que adivinar de cuál habla.
export function sobreRuleset(contenido) {
  return { source: { files: [{ name: 'firestore.rules', content: contenido }] } }
}

export function sobreRelease(proyecto, rulesetName) {
  return { name: `projects/${proyecto}/releases/${RELEASE}`, rulesetName }
}

// Un vistazo a lo que se va a publicar, para poder compararlo con lo que ya
// está en vigor ANTES de tocar nada.
//
// No intenta entender las reglas —eso lo hace Google al validarlas— sino
// describirlas lo justo para que un humano reconozca si es lo que esperaba.
export function resumir(contenido) {
  const lineas = String(contenido).split('\n')
  return {
    lineas: lineas.length,
    caracteres: contenido.length,
    // Las líneas que de verdad hacen algo, sin comentarios ni huecos: es el
    // número que importa cuando se compara una versión con otra, porque los
    // comentarios cambian mucho y no cambian nada.
    conCodigo: lineas.filter((l) => l.trim() && !l.trim().startsWith('//')).length,
    version: (contenido.match(/rules_version\s*=\s*'([^']+)'/) || [])[1] ?? null,
  }
}

// ⚠️ Lo mínimo que tiene que cumplir un archivo para merecer ser publicado.
//
// Publicar unas reglas rotas no rompe la app —Google las rechaza— pero
// publicar unas reglas VACÍAS o a medias sí sería un desastre: dejaría la
// base de datos abierta o cerrada del todo. Esto no valida la sintaxis (para
// eso está Google); comprueba que no se esté publicando un archivo truncado
// o el archivo equivocado, que es el error que una máquina sí puede cometer.
export function revisar(contenido) {
  const problemas = []
  const t = String(contenido ?? '')

  if (!t.trim()) problemas.push('el archivo está vacío')
  if (!/rules_version\s*=/.test(t)) problemas.push('no dice `rules_version`: no parece un archivo de reglas')
  if (!/service\s+cloud\.firestore/.test(t)) problemas.push('no hay bloque `service cloud.firestore`')

  // Llaves descuadradas = archivo cortado por la mitad.
  const abre = (t.match(/\{/g) || []).length
  const cierra = (t.match(/\}/g) || []).length
  if (abre !== cierra) problemas.push(`las llaves no cuadran (${abre} abiertas, ${cierra} cerradas): ¿archivo cortado?`)

  // Un archivo de reglas sin una sola regla es sintácticamente válido y deja
  // la base de datos cerrada a cal y canto. Nadie lo publicaría a propósito.
  if (!/allow\s+/.test(t)) problemas.push('no hay ni una regla `allow`: esto cerraría la base de datos entera')

  return problemas
}
