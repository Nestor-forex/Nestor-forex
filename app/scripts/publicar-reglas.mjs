// Publica `firestore.rules` en Firebase, desde GitHub y sin tocar la consola.
//
//     node scripts/publicar-reglas.mjs            ← valida, NO publica
//     node scripts/publicar-reglas.mjs --aplicar  ← valida y publica
//
// ⚠️ SIN `--aplicar` NO PUBLICA, igual que el robot de vencimientos y por la
// misma razón: esto decide quién puede leer y escribir en la base de datos de
// todos los suscriptores. Que lanzarlo sin querer no cambie nada.
//
// El ensayo NO es de mentira: sube el archivo a Google y deja que lo valide de
// verdad (paso 1 de la API). Lo único que no hace es ponerlo en vigor. Así un
// error de sintaxis sale en el ensayo, no después de haber publicado.

import { readFileSync } from 'node:fs'
import { leerCuentaDeServicio, pedirToken } from './lib/firestore-rest.mjs'
import { AMBITO_REGLAS, resumir, revisar, rutaRelease, rutaRulesets, sobreRelease, sobreRuleset } from './lib/reglas.mjs'

const APLICAR = process.argv.includes('--aplicar')
const RUTA = new URL('../../firestore.rules', import.meta.url)

async function main() {
  console.log(`\n📜 Publicar las reglas de Firestore`)
  console.log(APLICAR ? '   MODO: publicar de verdad' : '   MODO: solo validar (sin --aplicar no se publica)')

  const contenido = readFileSync(RUTA, 'utf8')
  const r = resumir(contenido)
  console.log(`   Archivo: ${r.lineas} líneas · ${r.conCodigo} con código · rules_version ${r.version}`)

  const problemas = revisar(contenido)
  if (problemas.length) {
    console.error('\n✗ El archivo no tiene buena pinta y NO se sube:')
    for (const p of problemas) console.error(`   · ${p}`)
    process.exit(1)
  }

  const cuenta = leerCuentaDeServicio()
  if (!cuenta) {
    console.error('✗ Falta el secreto FIREBASE_SERVICE_ACCOUNT.')
    process.exit(1)
  }
  const proyecto = cuenta.project_id
  console.log(`   Proyecto: ${proyecto}`)

  const token = await pedirToken(cuenta, AMBITO_REGLAS)
  const cabeceras = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }

  // Qué hay en vigor AHORA, antes de tocar nada. Si algo sale mal luego, este
  // identificador es el que permite volver atrás.
  const actual = await fetch(rutaRelease(proyecto), { headers: cabeceras })
  if (actual.ok) {
    const j = await actual.json()
    console.log(`   En vigor ahora: ${j.rulesetName?.split('/').pop() ?? '(desconocido)'}`)
  } else if (actual.status === 403) {
    // El fallo más probable de todos, y el que hay que explicar bien.
    console.error(`\n✗ La cuenta de servicio no tiene permiso para tocar las reglas (403).`)
    console.error(`   Es un permiso distinto al de leer datos, y hay que dárselo una vez:`)
    console.error(`   consola de Google Cloud → IAM → ${cuenta.client_email} → añadir el rol`)
    console.error(`   «Firebase Rules Admin» (roles/firebaserules.admin).`)
    process.exit(1)
  } else {
    console.log(`   (no se pudo leer lo que está en vigor: ${actual.status})`)
  }

  // Paso 1: subir y validar. Esto NO cambia nada todavía.
  const creado = await fetch(rutaRulesets(proyecto), {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify(sobreRuleset(contenido)),
  })
  if (!creado.ok) {
    console.error(`\n✗ Google rechazó el archivo (${creado.status}):`)
    console.error(await creado.text())
    process.exit(1)
  }
  const { name } = await creado.json()
  console.log(`\n✓ El archivo es válido. Versión preparada: ${name.split('/').pop()}`)

  if (!APLICAR) {
    // ⚠️ La versión preparada se queda ahí sin usar, y no pasa nada: Firebase
    // guarda los rulesets y solo rige el que esté publicado. Un ensayo no
    // deja la base de datos a medias.
    console.log('\n   (no se publicó: falta --aplicar. Las reglas en vigor siguen siendo las de antes.)\n')
    return
  }

  // Paso 2: ponerlo en vigor.
  const puesto = await fetch(rutaRelease(proyecto), {
    method: 'PATCH',
    headers: cabeceras,
    body: JSON.stringify({ release: sobreRelease(proyecto, name) }),
  })
  if (!puesto.ok) {
    console.error(`\n✗ Se validó pero no se pudo publicar (${puesto.status}):`)
    console.error(await puesto.text())
    process.exit(1)
  }

  console.log('\n✅ Reglas publicadas. Ya están en vigor.')
  console.log('   Para volver atrás: consola de Firebase → Firestore → Reglas → la lista de fechas.\n')
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`)
  process.exit(1)
})
