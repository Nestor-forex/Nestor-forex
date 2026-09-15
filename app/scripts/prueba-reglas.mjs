// Prueba del publicador de reglas. Sin internet:
//
//     node scripts/prueba-reglas.mjs
//
// ⚠️ Lo que se comprueba aquí es que NO se suba un archivo roto. Publicar unas
// reglas mal escritas no rompe nada (Google las rechaza), pero publicar un
// archivo TRUNCADO sí: podría dejar la base de datos de todos los suscriptores
// abierta de par en par, o cerrada del todo. Y eso es un error que una máquina
// sí puede cometer y un humano no notaría.

import { readFileSync } from 'node:fs'
import { AMBITO_REGLAS, RELEASE, resumir, revisar, rutaRelease, rutaRulesets, sobreRelease, sobreRuleset } from './lib/reglas.mjs'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

const REALES = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')

console.log('\n1. Las reglas de verdad del repositorio pasan la revisión')
{
  comprobar(revisar(REALES).length === 0, `firestore.rules está sano (${revisar(REALES).join(' · ') || 'sin problemas'})`)
  const r = resumir(REALES)
  comprobar(r.version === '2', `la versión del formato es la 2 (sale «${r.version}»)`)
  comprobar(r.lineas > 50, `tiene ${r.lineas} líneas, no es un archivo a medias`)
  comprobar(r.conCodigo > 20 && r.conCodigo < r.lineas, `${r.conCodigo} llevan código y el resto son comentarios`)
}

console.log('\n2. ⚠️ Lo que NO se puede subir')
{
  comprobar(revisar('').length > 0, 'un archivo vacío se rechaza')
  comprobar(revisar(null).length > 0, 'y uno que no existe tampoco revienta: devuelve problemas')
  comprobar(revisar('hola').length > 0, 'un texto cualquiera se rechaza')

  // El caso de verdad peligroso: el archivo bueno cortado por la mitad, que
  // es lo que pasa cuando una copia sale mal. Tiene `rules_version`, tiene
  // `service`, tiene `allow`… y le faltan llaves.
  const cortado = REALES.slice(0, Math.floor(REALES.length * 0.6))
  const p = revisar(cortado)
  comprobar(p.length > 0, 'un archivo CORTADO POR LA MITAD se rechaza')
  comprobar(p.some((x) => x.includes('llaves')), 'y se dice que el problema son las llaves, no un «error» genérico')

  // Unas reglas sintácticamente perfectas y sin una sola regla dejarían la
  // base de datos cerrada entera. Nadie lo haría a propósito; una máquina sí.
  const sinReglas = "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{d}/documents {\n  }\n}"
  comprobar(revisar(sinReglas).some((x) => x.includes('allow')), 'un archivo válido pero SIN NINGUNA regla se rechaza')
}

console.log('\n3. Los sobres que se le mandan a Google')
{
  const s = sobreRuleset('contenido de prueba')
  comprobar(s.source.files.length === 1, 'se manda un solo archivo')
  comprobar(s.source.files[0].content === 'contenido de prueba', 'con el contenido tal cual, sin tocarlo')
  // Si el nombre no coincidiera con el del repositorio, los errores de Google
  // hablarían de un archivo que nadie encontraría al ir a buscarlo.
  comprobar(s.source.files[0].name === 'firestore.rules', 'y con el mismo nombre que el archivo del repositorio')

  const rel = sobreRelease('nestor-forex', 'projects/nestor-forex/rulesets/abc123')
  comprobar(rel.name === 'projects/nestor-forex/releases/cloud.firestore', 'el release apunta a cloud.firestore')
  comprobar(rel.rulesetName === 'projects/nestor-forex/rulesets/abc123', 'y nombra la versión que se quiere poner en vigor')
}

console.log('\n4. Las direcciones, y el permiso que se pide')
{
  comprobar(rutaRulesets('nestor-forex').endsWith('/projects/nestor-forex/rulesets'), 'la de crear lleva el proyecto dentro')
  comprobar(rutaRelease('nestor-forex').endsWith(`/releases/${RELEASE}`), 'y la de publicar termina en el release de Firestore')
  comprobar(rutaRulesets('x').startsWith('https://firebaserules.googleapis.com/'), 'las dos van a firebaserules, que es otra API distinta de la de datos')
  // ⚠️ Pedir un permiso más ancho del necesario es permiso regalado: si la
  // llave se filtrara, daría acceso a más cosas de las que hace falta.
  comprobar(AMBITO_REGLAS === 'https://www.googleapis.com/auth/firebase', 'el permiso que se pide es el de Firebase, no «cloud-platform» entero')
}

console.log('\n5. El resumen sirve para comparar dos versiones de un vistazo')
{
  const a = resumir("rules_version = '2';\n// un comentario\nallow read;\n")
  comprobar(a.lineas === 4 && a.conCodigo === 2, 'cuenta aparte las líneas con código y las que son comentario')
  // Es lo que hace que añadir veinte líneas de comentarios no parezca un
  // cambio de reglas cuando se comparan dos publicaciones.
  const b = resumir("rules_version = '2';\n// uno\n// dos\n// tres\nallow read;\n")
  comprobar(a.conCodigo === b.conCodigo, 'añadir comentarios NO cambia la cuenta de líneas con código')
  comprobar(resumir('sin version').version === null, 'si no hay rules_version lo dice con null, no inventa una')
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'El publicador no sube archivos rotos.')
process.exit(fallos ? 1 : 0)
