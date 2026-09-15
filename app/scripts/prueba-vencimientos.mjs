// Prueba del robot de vencimientos. Sin internet:
//
//     node scripts/prueba-vencimientos.mjs
//
// ⚠️ LO QUE SE COMPRUEBA AQUÍ NO ES QUE CIERRE — eso es la parte fácil— sino
// que NO cierre a quien no debe. Este robot le quita el acceso a gente que
// paga: equivocarse hacia el lado de cerrar de más cuesta un cliente, y
// encerrar al administrador deja la app sin nadie que pueda reabrir nada.
//
// Por eso la mitad de las comprobaciones son de lo que NO tiene que pasar.

import { readFileSync } from 'node:fs'
import {
  DIAS_CICLO,
  DIAS_GRACIA,
  adminDeEnv,
  adminDeReglas,
  decidir,
  diasEntre,
  diasRestantes,
  esFechaISO,
  extender,
  porVencer,
} from './lib/vencimientos.mjs'
import { etiquetar, planchar } from './lib/firestore-rest.mjs'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

const ADMIN = 'nesdian2204@gmail.com'
const HOY = '2026-09-15'
const u = (p) => ({ uid: p.uid ?? 'u1', email: p.email ?? 'a@b.c', nombre: p.nombre ?? 'Alguien', estado: 'aprobado', ...p })
const cerrados = (usuarios, hoy = HOY) => decidir({ usuarios, hoy, adminEmail: ADMIN }).cerrar.map((c) => c.uid)

console.log('\n1. Leer fechas: la forma no basta, tiene que EXISTIR')
{
  comprobar(esFechaISO('2026-09-15') === true, 'una fecha normal vale')
  comprobar(esFechaISO('2028-02-29') === true, '2028 es bisiesto, así que su 29 de febrero existe')
  // El fallo que un patrón solo no ve: `new Date('2026-02-31')` no falla, lo
  // convierte en marzo sin avisar. Un vencimiento corrido tres días no se ve.
  comprobar(esFechaISO('2026-02-31') === false, 'el 31 de febrero NO existe, aunque tenga la forma buena')
  comprobar(esFechaISO('2026-02-29') === false, 'y el 29 de febrero de un año normal (2026) tampoco')
  comprobar(esFechaISO('2026-13-01') === false, 'no hay mes 13')
  comprobar(esFechaISO('15/09/2026') === false, 'el formato de Colombia no se acepta: sería ambiguo con el de EE. UU.')
  comprobar(esFechaISO('2026-9-5') === false, 'sin los ceros delante tampoco, porque rompería el orden alfabético')
  comprobar(esFechaISO(20260915) === false, 'un número no es una fecha')
  comprobar(esFechaISO(null) === false && esFechaISO(undefined) === false, 'ni null ni undefined revientan')
}

console.log('\n2. Contar días')
{
  comprobar(diasEntre('2026-09-15', '2026-09-18') === 3, 'tres días adelante son +3')
  comprobar(diasEntre('2026-09-18', '2026-09-15') === -3, 'y tres atrás son −3')
  comprobar(diasEntre('2026-09-15', '2026-09-15') === 0, 'el mismo día es 0')
  // Los dos lados del bisiesto, porque contar de más y contar de menos son
  // errores distintos y solo uno de los dos se nota.
  comprobar(diasEntre('2028-02-28', '2028-03-01') === 2, 'en año bisiesto, del 28 de febrero al 1 de marzo hay 2 días')
  comprobar(diasEntre('2026-02-28', '2026-03-01') === 1, 'y en uno normal, solo 1')
  comprobar(diasEntre('2026-12-31', '2027-01-01') === 1, 'y el cambio de año')
  // El cambio de hora de verano mueve el reloj una hora en medio mundo. Si
  // esto se calculara en hora local, un mes de 30 días saldría de 29,96 y al
  // redondear hacia abajo daría 29: un día de acceso regalado o robado según
  // la dirección. En UTC no hay cambio de hora que valga.
  comprobar(diasEntre('2026-03-01', '2026-03-31') === 30, 'el cambio de hora de verano no descuadra el conteo')
  comprobar(diasEntre('mañana', '2026-09-15') === null, 'una fecha ilegible da null, no un número inventado')
}

console.log('\n3. A quién SÍ se le cierra')
{
  const vencidoDeSobra = u({ uid: 'viejo', venceEl: '2026-08-01' })
  comprobar(cerrados([vencidoDeSobra]).join() === 'viejo', 'a quien venció hace mes y medio, sí')

  const d = decidir({ usuarios: [vencidoDeSobra], hoy: HOY, adminEmail: ADMIN })
  comprobar(d.cerrar[0].diasVencido === 45, 'y se dice cuántos días lleva vencido (45), no solo que venció')
  comprobar(d.cerrar[0].email === 'a@b.c' && d.cerrar[0].nombre === 'Alguien', 'con nombre y correo, para que el log diga a quién')
}

console.log('\n4. ⚠️ A quién NO se le cierra, que es lo que de verdad importa')
{
  // ⚠️ EL DÍA DEL ESTRENO NINGUNA FICHA TIENE FECHA, ni la de Néstor. Si
  // «sin fecha» contara como vencido, la primera corrida echaría a todos los
  // miembros de las DOS apps a la vez. Es el fallo más caro posible aquí.
  comprobar(cerrados([u({ uid: 'sinfecha' })]).length === 0, 'sin fecha NO se cierra (si no, la primera corrida echa a todo el mundo)')
  comprobar(cerrados([u({ uid: 'nula', venceEl: null })]).length === 0, 'con la fecha en null tampoco')
  comprobar(cerrados([u({ uid: 'vacia', venceEl: '' })]).length === 0, 'ni con la fecha vacía')

  // ⚠️ Y hay que exigir que lo atrape ESTE guardia y no el siguiente.
  //
  // Al romper el de «sin fecha» a propósito, la comprobación de arriba seguía
  // pasando: caía en el de «fecha ilegible», que también deja entrar. Seguro
  // sí, pero entonces el día del estreno saldría una alarma por CADA miembro
  // —ninguno tiene fecha todavía— y una alarma que salta siempre se ignora
  // desde el segundo día. «No tiene fecha» y «tiene una fecha mala» son
  // cosas distintas y tienen que contarse distinto.
  const sinFecha = decidir({ usuarios: [u({ uid: 'sinfecha' })], hoy: HOY, adminEmail: ADMIN })
  comprobar(sinFecha.intactos[0].motivo === 'sinFecha', 'y el motivo es «sinFecha», no «fechaIlegible»')
  comprobar(sinFecha.avisos.length === 0, 'no tener fecha todavía NO es una alarma: el día del estreno no la tiene nadie')

  comprobar(cerrados([u({ uid: 'basura', venceEl: 'el mes que viene' })]).length === 0, 'una fecha que no se entiende NO cierra: sería cerrar por un error nuestro')
  comprobar(cerrados([u({ uid: 'imposible', venceEl: '2026-02-31' })]).length === 0, 'y una fecha imposible tampoco')

  comprobar(cerrados([u({ uid: 'pend', estado: 'pendiente', venceEl: '2020-01-01' })]).length === 0, 'a quien está pendiente no hay que sacarlo: no ha entrado')
  comprobar(cerrados([u({ uid: 'ret', estado: 'retirado', venceEl: '2020-01-01' })]).length === 0, 'ni a quien ya está retirado')
}

console.log('\n5. ⚠️ El administrador NUNCA se cierra')
{
  // Si el robot lo encierra, se queda sin poder aprobar ni reabrir a nadie
  // —tampoco a sí mismo— y la app no tiene otra puerta de vuelta.
  comprobar(cerrados([u({ uid: 'admin', email: ADMIN, venceEl: '2019-01-01' })]).length === 0, 'aunque su ficha diga que venció en 2019')
  comprobar(cerrados([u({ uid: 'admin', email: ADMIN.toUpperCase(), venceEl: '2019-01-01' })]).length === 0, 'aunque el correo esté en MAYÚSCULAS')
  comprobar(cerrados([u({ uid: 'admin', email: `  ${ADMIN} `, venceEl: '2019-01-01' })]).length === 0, 'aunque venga con espacios alrededor')

  const d = decidir({ usuarios: [u({ uid: 'admin', email: ADMIN, venceEl: '2019-01-01' })], hoy: HOY, adminEmail: ADMIN })
  comprobar(d.intactos[0].motivo === 'admin', 'y el motivo queda escrito, no se confunde con «sin fecha»')
}

console.log('\n6. ⚠️ El día de margen, que es la defensa contra el huso horario')
{
  comprobar(DIAS_GRACIA === 1, 'hay UN día de margen')
  // A las 19:00 de Colombia del día 15, en UTC ya es el 16. Sin margen, quien
  // pagó ese mismo día se quedaría fuera esa tarde.
  comprobar(cerrados([u({ uid: 'hoy', venceEl: HOY })]).length === 0, 'quien vence HOY sigue dentro')
  comprobar(cerrados([u({ uid: 'ayer', venceEl: '2026-09-14' })]).length === 0, 'y quien venció AYER también, por el huso horario')
  comprobar(cerrados([u({ uid: 'anteayer', venceEl: '2026-09-13' })]).join() === 'anteayer', 'pero anteayer ya no: el margen es de un día, no indefinido')
  comprobar(cerrados([u({ uid: 'futuro', venceEl: '2027-01-01' })]).length === 0, 'y a quien le queda medio año, claro que no')
}

console.log('\n7. Los avisos: lo raro se canta, no se traga')
{
  const d = decidir({
    usuarios: [u({ uid: 'malo', venceEl: 'ayer por la tarde' }), u({ uid: 'bueno', venceEl: '2027-01-01' })],
    hoy: HOY,
    adminEmail: ADMIN,
  })
  comprobar(d.avisos.length === 1 && d.avisos[0].uid === 'malo', 'una fecha ilegible deja aviso')
  comprobar(d.avisos[0].codigo === 'fechaIlegible', 'con un código, no una frase en español (esto también se lee desde un log)')
  comprobar(d.avisos[0].venceEl === 'ayer por la tarde', 'y se enseña el valor tal cual, para poder arreglarlo')
  // Sin esto, una ficha mal escrita se queda abierta para siempre en silencio.
  comprobar(d.cerrar.length === 0 && d.intactos.length === 2, 'pero no cierra a nadie por ello')
}

console.log('\n8. Nadie se pierde por el camino')
{
  const lista = [
    u({ uid: 'a', venceEl: '2026-01-01' }),
    u({ uid: 'b', venceEl: '2027-01-01' }),
    u({ uid: 'c' }),
    u({ uid: 'd', estado: 'pendiente' }),
    u({ uid: 'admin', email: ADMIN }),
  ]
  const d = decidir({ usuarios: lista, hoy: HOY, adminEmail: ADMIN })
  comprobar(d.cerrar.length + d.intactos.length === lista.length, 'cada ficha acaba en cerrar o en intacta, ninguna en el limbo')
  const uids = [...d.cerrar, ...d.intactos].map((x) => x.uid).sort().join()
  comprobar(uids === 'a,admin,b,c,d', 'y son exactamente las mismas fichas que entraron')
  comprobar(decidir({ usuarios: [], hoy: HOY, adminEmail: ADMIN }).cerrar.length === 0, 'una lista vacía no revienta')
}

console.log('\n9. Un «hoy» que no vale es un error, no un día cualquiera')
{
  // Aquí SÍ hay que reventar, al revés que con la fecha de un usuario: si el
  // día de referencia está mal, TODAS las decisiones salen mal a la vez.
  // Seguir adelante sería cerrar medio mundo por una variable mal puesta.
  let rebento = false
  try { decidir({ usuarios: [], hoy: 'hoy', adminEmail: ADMIN }) } catch { rebento = true }
  comprobar(rebento, 'si el día de referencia no se entiende, el robot se para en seco')

  let rebento2 = false
  try { decidir({ usuarios: [], hoy: undefined, adminEmail: ADMIN }) } catch { rebento2 = true }
  comprobar(rebento2, 'y sin día de referencia, igual')
}

console.log('\n10. Avisar ANTES de cerrar, no después')
{
  const lista = [
    u({ uid: 'manana', venceEl: '2026-09-16' }),
    u({ uid: 'en3', venceEl: '2026-09-18' }),
    u({ uid: 'en10', venceEl: '2026-09-25' }),
    u({ uid: 'yaVencio', venceEl: '2026-09-01' }),
    u({ uid: 'pendiente', estado: 'pendiente', venceEl: '2026-09-16' }),
  ]
  const p = porVencer(lista, HOY, 3)
  comprobar(p.map((x) => x.uid).join() === 'manana,en3', 'salen los que vencen dentro de 3 días o menos')
  comprobar(p[0].dias === 1 && p[1].dias === 3, 'ordenados por lo que les queda, el más urgente primero')
  comprobar(!p.some((x) => x.uid === 'yaVencio'), 'el que ya venció no está: para ése el aviso llega tarde')
  comprobar(!p.some((x) => x.uid === 'pendiente'), 'ni quien no está aprobado')
  comprobar(porVencer(lista, 'ayer').length === 0, 'y con un día ilegible devuelve lista vacía en vez de reventar')
}

console.log('\n11. Los días que quedan, tal como los verá Néstor en pantalla')
{
  comprobar(diasRestantes('2026-09-20', HOY) === 5, 'faltan 5 días')
  comprobar(diasRestantes(HOY, HOY) === 0, 'vence hoy = 0')
  comprobar(diasRestantes('2026-09-10', HOY) === -5, 'venció hace 5 = −5')
  comprobar(diasRestantes(undefined, HOY) === null, 'sin fecha, «no lo sé» y no un cero que parezca «vence hoy»')
}

console.log('\n11b. «+1 mes»: correr la fecha sin castigar a quien paga temprano')
{
  comprobar(DIAS_CICLO === 30, 'un ciclo son 30 días (todos iguales, sin febreros de 28)')
  comprobar(extender('2026-09-20', HOY) === '2026-10-20', 'a quien le quedan 5 días se le suman 30 A SU FECHA, no a hoy')
  // Si se sumara desde hoy, pagar con cinco días de antelación costaría cinco
  // días de suscripción. Sería cobrarle por ser puntual.
  comprobar(extender('2026-09-20', HOY) !== extender(null, HOY), 'y eso NO es lo mismo que empezar de cero hoy')
  comprobar(extender('2026-08-01', HOY) === '2026-10-15', 'a quien ya venció, el ciclo le arranca HOY (no se le regala lo perdido)')
  comprobar(extender(null, HOY) === '2026-10-15', 'y a quien no tenía fecha, también desde hoy')
  comprobar(extender('basura', HOY) === '2026-10-15', 'una fecha ilegible se trata como «no tenía»: no hereda el error')
  comprobar(extender(HOY, HOY) === '2026-10-15', 'quien vence justo hoy empieza el ciclo hoy')
  comprobar(extender('2026-09-20', 'ayer') === null, 'sin un hoy válido devuelve null en vez de una fecha inventada')
  comprobar(extender('2026-02-20', '2026-02-01') === '2026-03-22', 'cruzar de mes sale bien')
  comprobar(extender('2026-12-20', '2026-12-01') === '2027-01-19', 'y cruzar de año también')
}

console.log('\n12. Los sobres con que se ESCRIBE en Firestore')
{
  // ⚠️ Esto es lo que va por el cable cuando el robot cierra una puerta. Si
  // el sobre lleva mal la etiqueta, Firestore contesta un error que no dice
  // por qué, o —peor— guarda otra cosa.
  comprobar(JSON.stringify(etiquetar({ estado: 'retirado' })) === '{"estado":{"stringValue":"retirado"}}', 'un texto va como stringValue')
  // La API pide el entero COMO TEXTO. Mandarlo como número se rechaza.
  comprobar(etiquetar({ n: 3 }).n.integerValue === '3', 'un entero va como texto dentro de integerValue')
  comprobar(etiquetar({ n: 1.5 }).n.doubleValue === 1.5, 'y un decimal como doubleValue de verdad')
  comprobar('nullValue' in etiquetar({ x: null }).x, 'null se manda explícito, que es como se borra un campo')
  comprobar(etiquetar({ b: false }).b.booleanValue === false, 'un false se manda como false, no se pierde por ser «vacío»')

  // Ida y vuelta: lo que se escribe tiene que poder volver a leerse igual.
  const original = { estado: 'retirado', venceEl: '2026-09-01', dias: 14, activo: true }
  const vuelta = planchar(etiquetar(original))
  comprobar(JSON.stringify(vuelta) === JSON.stringify(original), 'lo que se escribe vuelve a leerse idéntico')
}

console.log('\n13. ⚠️ Los DOS sitios que nombran al administrador dicen lo mismo')
{
  // El correo del administrador está escrito en `.env.production` (de donde
  // lo sacan la app y este robot) y OTRA VEZ, a mano, dentro de
  // `firestore.rules`. CLAUDE.md lleva desde el principio avisando de que si
  // cambia hay que tocar los dos — y hasta hoy nadie lo comprobaba.
  //
  // Lo que pasa si se separan: las reglas siguen dejando entrar al correo
  // viejo y el robot protege al nuevo, o al revés. En el peor caso el robot
  // deja de reconocer al administrador y le cierra la puerta al único que
  // puede volver a abrirla.
  const env = adminDeEnv(readFileSync(new URL('../.env.production', import.meta.url), 'utf8'))
  const reglas = adminDeReglas(readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'))

  comprobar(env.includes('@'), `.env.production tiene un correo de administrador (${env || 'NINGUNO'})`)
  comprobar(reglas.includes('@'), `firestore.rules también (${reglas || 'NINGUNO'})`)
  comprobar(env === reglas, 'y son EL MISMO, que es lo que nadie comprobaba hasta hoy')

  // Que sepan leer de verdad, no que devuelvan vacío y «coincidan» en nada.
  comprobar(adminDeEnv('X=1\nVITE_ADMIN_EMAIL=  A@B.CO \nY=2') === 'a@b.co', 'se leen espacios y mayúsculas sin despeinarse')
  comprobar(adminDeEnv('OTRA_COSA=x') === '', 'y si no está, devuelve vacío en vez de inventar')
  comprobar(
    adminDeReglas("&& request.auth.token.email == 'Pepe@Ejemplo.com';") === 'pepe@ejemplo.com',
    'de las reglas se saca el correo entre comillas'
  )
  comprobar(adminDeReglas('no hay nada aquí') === '', 'y si no está, vacío')
  // Anclado a `request.auth.token.email` a propósito: las reglas están llenas
  // de textos entre comillas ('aprobado', 'pendiente', los nombres de las
  // colecciones) y pescar el primero que aparezca daría un «administrador»
  // llamado «aprobado», que no coincidiría con nada y dejaría el guardia
  // apagado sin que nadie lo notara.
  comprobar(adminDeReglas("data.estado == 'aprobado'") === '', 'y no confunde un estado con un correo')
}

console.log('')
console.log(fallos ? `${fallos} comprobación(es) FALLARON` : 'El robot cierra a quien debe y —sobre todo— no cierra a quien no debe.')
process.exit(fallos ? 1 : 0)
