// El robot de vencimientos: cierra la puerta a quien se le pasó la fecha.
//
//     node scripts/cerrar-vencidos.mjs            ← solo mira y cuenta
//     node scripts/cerrar-vencidos.mjs --aplicar  ← además escribe
//
// ⚠️ SIN `--aplicar` NO ESCRIBE NADA, y es a propósito. Esto le quita el
// acceso a gente que paga: si alguien lo lanza sin saber qué hace, que no
// pase nada. Olvidarse de la bandera deja a todo el mundo dentro un día más;
// tenerla puesta por defecto y equivocarse echa clientes. Los dos errores no
// valen lo mismo, así que el valor por defecto no puede ser simétrico.
//
// ⚠️ ESTE ROBOT SOLO CIERRA. NUNCA ABRE.
//
// Abrir sigue siendo de Néstor, a mano, en la pestaña Miembros. El día que se
// enchufe la pasarela de pagos, el que lea «éste pagó» podrá abrir — y ese
// día habrá que escribirlo aquí a propósito. Mientras tanto: cerrar de más
// cuesta que alguien escriba «oye, me sacaste» y se arregle con un toque;
// abrir de más regala el producto y no se entera nadie.
//
// ⚠️ LAS DOS APPS COMPARTEN LA COLECCIÓN `users`. Este robot vive solo en
// Swing y gobierna el acceso a Swing Y a Intradía. Dos robots sobre la misma
// lista serían dos programas peleándose por la misma puerta.

import { readFileSync } from 'node:fs'
import { abrir, leerCuentaDeServicio } from './lib/firestore-rest.mjs'
import { adminDeEnv, decidir, hoyUTC, porVencer } from './lib/vencimientos.mjs'

const APLICAR = process.argv.includes('--aplicar')
const DIAS_PREAVISO = 3

// El correo del administrador sale del MISMO sitio del que lo saca la app
// (`.env.production` → `VITE_ADMIN_EMAIL`), leído como texto porque
// `firebase.js` arrastra el SDK entero y aquí no hace falta. `adminDeEnv`
// vive en la biblioteca para poder comprobarlo sin internet, y
// `prueba-vencimientos.mjs` exige además que coincida con `firestore.rules`.
const leerAdminEmail = () =>
  adminDeEnv(readFileSync(new URL('../.env.production', import.meta.url), 'utf8'))

async function main() {
  const hoy = hoyUTC()
  const admin = leerAdminEmail()

  console.log(`\n🔒 Robot de vencimientos — ${hoy} (UTC)`)
  console.log(APLICAR ? '   MODO: aplicando cambios' : '   MODO: solo mirar (sin --aplicar no se escribe nada)')

  if (!admin) {
    // Sin saber quién es el administrador, el guardia que impide encerrarlo
    // no puede actuar. Antes que arriesgarse a dejar la app sin nadie que
    // pueda abrir, no se hace nada.
    console.error('✗ No se pudo leer VITE_ADMIN_EMAIL de .env.production. Sin saber quién es el administrador, no se toca nada.')
    process.exit(1)
  }
  console.log(`   Administrador protegido: ${admin}`)

  const cuenta = leerCuentaDeServicio()
  if (!cuenta) {
    console.error('✗ Falta el secreto FIREBASE_SERVICE_ACCOUNT. Sin él no se puede leer la lista de miembros.')
    process.exit(1)
  }

  const db = await abrir(cuenta)
  const usuarios = await db.listar('users')
  console.log(`   Fichas leídas: ${usuarios.length}`)

  const { cerrar, avisos, intactos } = decidir({ usuarios: usuarios.map((u) => ({ ...u, uid: u.id })), hoy, adminEmail: admin })

  // El desglose de por qué NO se cerró a cada quien. Un robot que solo dice
  // a quién cerró deja sin explicar el caso que importa: el que no cerró.
  const porMotivo = {}
  for (const i of intactos) porMotivo[i.motivo] = (porMotivo[i.motivo] ?? 0) + 1
  console.log(`   Se quedan dentro: ${intactos.length} (${Object.entries(porMotivo).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'})`)

  const proximos = porVencer(usuarios.map((u) => ({ ...u, uid: u.id })), hoy, DIAS_PREAVISO)
  if (proximos.length) {
    console.log(`\n⏳ Vencen en ${DIAS_PREAVISO} días o menos (${proximos.length}) — avisarles ANTES de que se queden fuera:`)
    for (const p of proximos) {
      console.log(`   · ${p.nombre || '(sin nombre)'} <${p.email}> — vence ${p.venceEl}, ${p.dias === 0 ? 'HOY' : `en ${p.dias} día(s)`}`)
    }
  }

  if (!cerrar.length) {
    console.log('\n✓ Hoy no hay a quién cerrarle la puerta.')
  } else {
    console.log(`\n🔒 A cerrar: ${cerrar.length}`)
    for (const c of cerrar) {
      console.log(`   · ${c.nombre || '(sin nombre)'} <${c.email}> — venció ${c.venceEl}, hace ${c.diasVencido} días`)
    }
  }

  let escritos = 0
  let fallidos = 0
  if (APLICAR) {
    for (const c of cerrar) {
      const ficha = usuarios.find((u) => u.id === c.uid)
      try {
        // `cerradoEl` deja constancia de que esto lo hizo el robot y cuándo.
        // Sin esa marca, una cuenta cerrada es indistinguible de una que
        // retiró Néstor a mano, y eso es justo lo que habría que mirar el día
        // que alguien reclame.
        //
        // ⚠️ Se escribe 'retirado' y NO se borra la ficha: el diario de esa
        // persona vive en `users/{uid}/trades` y borrar el documento padre lo
        // dejaría encerrado para siempre (lección del 2026-09-14). Readmitirla
        // se lo devuelve entero.
        await db.actualizar(ficha.ruta, { estado: 'retirado', cerradoEl: hoy })
        escritos++
      } catch (e) {
        // Un fallo suelto no puede tumbar a los demás: si cinco vencen y la
        // segunda escritura falla, las otras tres tienen que cerrarse igual.
        fallidos++
        console.error(`   ✗ No se pudo cerrar a <${c.email}>: ${e.message}`)
      }
    }
    console.log(`\n   Cerradas de verdad: ${escritos}${fallidos ? ` · fallaron: ${fallidos}` : ''}`)
  } else if (cerrar.length) {
    console.log('\n   (no se escribió nada: falta --aplicar)')
  }

  // ⚠️ Las alarmas van al FINAL y después de haber hecho el trabajo, igual
  // que en el respaldo del historial: una alarma que impide trabajar es peor
  // que el problema que denuncia.
  if (avisos.length) {
    console.log(`\n⚠️ ${avisos.length} ficha(s) con la fecha mal escrita. NO se cerraron —cerrar por un error nuestro sería peor— pero hay que arreglarlas a mano:`)
    for (const a of avisos) console.log(`   · <${a.email}> tiene venceEl = ${JSON.stringify(a.venceEl)}`)
  }

  if (fallidos) {
    console.error('\n✗ Hubo escrituras que fallaron: alguien vencido sigue teniendo acceso.')
    process.exit(1)
  }
  if (avisos.length) process.exit(1)
  console.log('')
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`)
  process.exit(1)
})
