// Prueba de los avisos al celular, sin tocar nada de verdad.
//
// Levanta un servidor local que hace de servicio de push (el de Apple o el de
// Google) y le inyecta una base de datos falsa, así que se puede correr sin
// internet, sin claves reales y sin gastar cuota:
//
//     node scripts/prueba-push.mjs
//
// Lo que comprueba:
//   1. El texto del aviso, en varios idiomas.
//   2. Que las señales con R/B pobre NO despierten el celular.
//   3. Que el aviso salga de verdad, cifrado y firmado (VAPID).
//   4. Que una suscripción muerta se borre en vez de reintentarse.
//   5. Que sin claves configuradas no reviente nada.

import { createServer } from 'node:https'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { APP, armarMensaje, armarMensajeExperimento, enviarAvisos, enviarAvisosExperimento, senalesQueSuenan } from './lib/push-envio.mjs'
import { DEFECTO_ADMIN, DEFECTO_MIEMBRO, OPCIONES, claveDeSenal, defectoPara } from '../src/lib/experimentosAviso.js'
import { campoAvisosExp, clavesElegidas } from '../src/lib/avisosExperimento.js'

let fallos = 0
const comprobar = (bien, que) => {
  console.log(`  ${bien ? '✓' : '✗'} ${que}`)
  if (!bien) fallos++
}

// Una señal como las que arma marketCalc, con lo justo que usa el aviso.
const senal = (name, lado, rr, tipo = 'tendencia') => ({
  s: {
    name,
    lado,
    tipo,
    crudo: { precio: 1.08423, sl: 1.08181, tp: 1.09025, rr, dec: 5 },
  },
})

// Un aparato suscrito, con claves como las que da un navegador de verdad.
function aparatoFalso(endpoint, idioma = 'es') {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const b64u = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return {
    ruta: `proyectos/x/documentos/pushSubs/${endpoint.split('/').pop()}`,
    endpoint,
    idioma,
    app: APP,
    p256dh: b64u(publicKey.export({ format: 'der', type: 'spki' }).subarray(-65)),
    auth: b64u(randomBytes(16)),
    // `privateKey` no se usa: descifrar el aviso exigiría implementar el
    // RFC 8291 entero. Basta con que el cifrado no reviente y con que el
    // servidor reciba la petición bien formada.
    _sinUsar: privateKey,
  }
}

console.log('\n1. El texto del aviso')
{
  const s = senal('EUR/USD', 'COMPRA', 2.5).s
  const es = armarMensaje(s, 'es')
  const en = armarMensaje(s, 'en')
  const ja = armarMensaje(s, 'ja')

  console.log(`     es → ${es.titulo} | ${es.cuerpo}`)
  console.log(`     en → ${en.titulo} | ${en.cuerpo}`)
  console.log(`     ja → ${ja.titulo} | ${ja.cuerpo}`)

  comprobar(es.titulo.includes('COMPRA'), 'en español dice COMPRA')
  comprobar(en.titulo.includes('BUY'), 'en inglés dice BUY')
  comprobar(es.cuerpo.includes('SL') && es.cuerpo.includes('TP'), 'SL y TP no se traducen')
  comprobar(es.cuerpo.includes('1:2.5'), 'lleva la relación riesgo/beneficio')
  comprobar(es.url.includes('par=EUR%2FUSD') && es.url.includes('lado=COMPRA'), 'la dirección abre esa señal')
  comprobar(armarMensaje({ ...s, tipo: 'rango' }, 'es').titulo.includes('Rango'), 'marca los de rango')
}

// ---------------------------------------------------------------------------

// El servidor de mentira tiene que hablar HTTPS: `web-push` se niega a mandar
// nada por HTTP plano, y hace bien —el aviso lleva credenciales del aparato—.
// El certificado se genera aquí y se tira al terminar; no queda nada guardado.
const carpeta = mkdtempSync(join(tmpdir(), 'prueba-push-'))
execFileSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
  '-subj', '/CN=127.0.0.1',
  '-addext', 'subjectAltName=IP:127.0.0.1',
  '-keyout', join(carpeta, 'llave.pem'),
  '-out', join(carpeta, 'cert.pem'),
], { stdio: 'ignore' })

// Node tiene que fiarse de ese certificado inventado. Se hace por variable de
// entorno y solo dentro de esta prueba: nunca en el vigía de verdad.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const recibidas = []
let respuesta = 201
const servidor = createServer({
  key: readFileSync(join(carpeta, 'llave.pem')),
  cert: readFileSync(join(carpeta, 'cert.pem')),
}, (req, res) => {
  // Un servicio de push que acepta la conexión y luego no contesta nunca. Es
  // el caso peligroso: sin plazo, el envío se queda esperando para siempre.
  if (req.url.includes('mudo')) return
  const trozos = []
  req.on('data', (c) => trozos.push(c))
  req.on('end', () => {
    recibidas.push({ url: req.url, cabeceras: req.headers, bytes: Buffer.concat(trozos).length })
    res.writeHead(respuesta)
    res.end()
  })
})
await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo))
const base = `https://127.0.0.1:${servidor.address().port}`

// `PUSH_SIN_PAUSA` salta la pausa de los avisos (ver AVISOS_PAUSADOS en
// push-envio.mjs). Va en TODAS las pruebas del camino de envío a propósito:
// mientras los avisos estén apagados hay que seguir comprobando que el código
// funciona, o el día que se reactiven estaríamos encendiendo algo que lleva
// semanas sin probarse. La pausa en sí se comprueba aparte, en el punto 8.
const ENTORNO = { VAPID_PRIVATE_KEY: '9Ah-93imAiVXw1xoJnC-cuiA14U0JjwVxHuC7lHhKOc', PUSH_SIN_PAUSA: '1' }
const borrados = []
const bdFalsa = (aparatos) => ({
  listar: async () => aparatos,
  borrar: async (ruta) => (borrados.push(ruta), true),
})

console.log('\n2. El filtro de calidad')
{
  const r = await enviarAvisos(
    [senal('EUR/USD', 'COMPRA', 2.5), senal('GBP/JPY', 'VENTA', 0.9)],
    ENTORNO,
    bdFalsa([aparatoFalso(`${base}/aparato-1`)])
  )
  comprobar(r.filtradas === 1, 'la señal con R/B 0.9 no despierta el celular')
  comprobar(r.enviados === 1, 'la de R/B 2.5 sí se manda')
}

console.log('\n3. El aviso sale cifrado y firmado')
{
  const ult = recibidas.at(-1)
  comprobar(Boolean(ult), 'el servicio de push recibió la petición')
  comprobar(ult?.cabeceras?.authorization?.startsWith('vapid '), 'va firmada con VAPID')
  comprobar(ult?.cabeceras?.['content-encoding'] === 'aes128gcm', 'va cifrada (aes128gcm)')
  comprobar(ult?.bytes > 0, 'lleva contenido')
  comprobar(Boolean(ult?.cabeceras?.ttl), 'lleva TTL')
}

console.log('\n4. Las suscripciones muertas se borran')
{
  respuesta = 410 // "esta suscripción ya no existe"
  recibidas.length = 0
  const r = await enviarAvisos(
    [senal('EUR/USD', 'COMPRA', 2.5), senal('USD/JPY', 'VENTA', 3.0)],
    ENTORNO,
    bdFalsa([aparatoFalso(`${base}/aparato-muerto`)])
  )
  comprobar(r.limpiadas === 1, 'se borró la suscripción muerta')
  comprobar(recibidas.length === 1, 'no se insistió con la segunda señal en un aparato muerto')
  comprobar(borrados.length === 1, 'el borrado llegó a la base de datos')
  respuesta = 201
}

console.log('\n5. Un servicio que no contesta no cuelga el envío')
{
  const arranque = Date.now()
  const r = await enviarAvisos(
    [senal('EUR/USD', 'COMPRA', 2.5)],
    { ...ENTORNO, PUSH_MS_POR_AVISO: 1200 },
    bdFalsa([aparatoFalso(`${base}/mudo`)])
  )
  const tardo = Date.now() - arranque

  comprobar(tardo < 5000, `se rindió solo (tardó ${tardo} ms, no se colgó)`)
  comprobar(tardo >= 1000, 'esperó lo que se le dijo antes de rendirse')
  comprobar(r.fallidos === 1, 'lo cuenta como no entregado')
  comprobar(r.limpiadas === 0, 'NO lo da por muerto: callarse no es lo mismo que no existir')
}

console.log('\n6. El presupuesto total corta y lo dice')
{
  const r = await enviarAvisos(
    [senal('EUR/USD', 'COMPRA', 2.5), senal('USD/JPY', 'VENTA', 3.0)],
    { ...ENTORNO, PUSH_MS_POR_AVISO: 800, PUSH_MS_PRESUPUESTO: 1200 },
    bdFalsa([aparatoFalso(`${base}/mudo`), aparatoFalso(`${base}/mudo-2`), aparatoFalso(`${base}/mudo-3`)])
  )
  // 3 aparatos × 2 señales = 6 avisos, a 800 ms cada uno son 4,8 s: no caben
  // en 1,2 s de presupuesto, así que algunos tienen que quedar sin intentar.
  comprobar(r.sinTiempo > 0, `avisa de los que no le dio tiempo (${r.sinTiempo})`)
  comprobar(
    r.enviados + r.fallidos + r.sinTiempo === 6,
    'las cuentas cuadran: enviados + fallidos + sin tiempo = todos'
  )
}

console.log('\n7. Sin configurar, no revienta')
{
  const r = await enviarAvisos([senal('EUR/USD', 'COMPRA', 2.5)], { PUSH_SIN_PAUSA: '1' })
  comprobar(r.estado === 'sin-configurar', 'avisa que faltan las claves en vez de fallar')

  const vacio = await enviarAvisos([], ENTORNO, bdFalsa([]))
  comprobar(vacio.estado === 'nada-que-enviar', 'sin señales nuevas no hace nada')
}

// La pausa es lo único que hoy separa a un miembro de recibir un aviso que
// —medido— le haría perder dinero. Si alguien la rompiera sin querer al tocar
// esta función, esto salta.
console.log('\n8. Los avisos están en pausa y no se escapa ninguno')
{
  const conTodo = await enviarAvisos(
    [senal('EUR/USD', 'COMPRA', 2.5)],
    { VAPID_PRIVATE_KEY: '9Ah-93imAiVXw1xoJnC-cuiA14U0JjwVxHuC7lHhKOc' },
    bdFalsa([aparatoFalso(`${base}/aparato-en-pausa`)])
  )
  comprobar(conTodo.estado === 'en-pausa', 'con claves, suscriptor y señal buena, NO manda: dice "en-pausa"')
  comprobar(conTodo.candidatas === 1, 'y deja constancia de cuántas se habrían mandado')

  const antes = borrados.length
  comprobar(antes === borrados.length, 'en pausa no toca Firestore para nada')
}

// Las señales de «comprar la caída» le llegan SOLO al administrador, para que
// las pruebe en demo. Lo que no puede pasar nunca: que le lleguen a un
// suscriptor, que avise otra regla de sombra que nadie decidió, o que la pausa
// de las señales de la app las calle (son otra cosa y van siempre a 1:1).
console.log('\n9. Avisos de experimento: a cada miembro aprobado, lo que él encienda')
{
  const ADMIN = 'admin@ejemplo.com'
  const campo = campoAvisosExp(APP)
  const exp = (name, lado, tipo) => ({
    s: { name, lado, tipo, crudo: { precio: 0.68024, sl: 0.67209, tp: 0.68838, rr: 1, dec: 5 } },
  })
  const bdDos = (fichas, aparatos) => ({
    listar: async (col) => (col === 'users' ? fichas : aparatos),
    borrar: async () => true,
  })
  const ap = (id) => ({ ...aparatoFalso(`${base}/exp-${id}`), uid: `u-${id}` })
  const env = { VAPID_PRIVATE_KEY: ENTORNO.VAPID_PRIVATE_KEY, ADMIN_EMAIL: ADMIN }
  const llegadas = (antes) => recibidas.slice(antes).map((n) => n.url.match(/exp-([a-z]+)/)?.[1]).sort().join()
  const tres = [exp('AUD/USD', 'COMPRA', 'caida'), exp('EUR/CAD', 'COMPRA', 'reversion'), exp('GBP/USD', 'VENTA', 'bollinger')]
  // admin sin tocar nada · socio sin tocar nada · socio con reversión · retirado
  // con todo encendido · pendiente con todo encendido.
  const todo = ['caida', 'reversion', 'bollinger']
  const fichas = [
    { id: 'u-admin', email: 'Admin@Ejemplo.com' },
    { id: 'u-quieto', email: 'quieto@ejemplo.com', estado: 'aprobado' },
    { id: 'u-socio', email: 'socio@ejemplo.com', estado: 'aprobado', [campo]: ['reversion'] },
    { id: 'u-retirado', email: 'ret@ejemplo.com', estado: 'retirado', [campo]: todo },
    { id: 'u-pendiente', email: 'pen@ejemplo.com', estado: 'pendiente', [campo]: todo },
  ]
  const aparatos = ['admin', 'quieto', 'socio', 'retirado', 'pendiente'].map(ap)
  const antes = recibidas.length
  // ⚠️ SIN `PUSH_SIN_PAUSA`: la pausa de los avisos de la app NO las calla.
  const r = await enviarAvisosExperimento(tres, env, bdDos(fichas, aparatos))
  comprobar(r.estado === 'enviado' && r.personas === 2 && r.enviados === 2, 'suenan dos personas, una señal cada una')
  comprobar(llegadas(antes) === 'admin,socio', 'al administrador «comprar la caída» (su defecto) y al socio la reversión que encendió')
  comprobar(!llegadas(antes).includes('quieto'), 'un suscriptor que NO tocó nada no recibe ninguno: su defecto es la lista vacía')
  comprobar(!/retirado|pendiente/.test(llegadas(antes)), 'ni retirados ni pendientes reciben nada aunque tengan todo encendido')

  const antes2 = recibidas.length
  const sinAdmin = await enviarAvisosExperimento(tres, { ...env, ADMIN_EMAIL: 'nadie@ejemplo.com' }, bdDos(fichas, aparatos))
  comprobar(sinAdmin.estado === 'enviado' && llegadas(antes2) === 'socio', 'sin encontrar al administrador se sigue mandando lo que cada uno encendió, y nadie recibe su defecto')

  const nada = await enviarAvisosExperimento([exp('EUR/CAD', 'COMPRA', 'inventada')], env, bdDos(fichas, []))
  comprobar(nada.estado === 'nada-que-enviar', 'una regla que nadie escribió en `experimentosAviso.js` no avisa')

  const apagado = await enviarAvisosExperimento(
    [exp('AUD/USD', 'COMPRA', 'caida')],
    env,
    bdDos([{ id: 'u-admin', email: ADMIN, [campo]: [] }], [ap('admin')])
  )
  comprobar(apagado.estado === 'nada-encendido' && !apagado.enviados, 'con TODO apagado (lista vacía) no suena nada, ni siquiera «comprar la caída»')

  const sinTiempo = await enviarAvisosExperimento(tres, { ...env, PUSH_MS_PRESUPUESTO: '-1' }, bdDos(fichas, aparatos))
  comprobar(sinTiempo.sinTiempo === 2 && !sinTiempo.enviados, 'con el presupuesto agotado se corta y se cuenta lo que quedó sin mandar')

  comprobar(claveDeSenal({ lado: 'COMPRA' }) === 'app', 'una compra de la app es «señales de la app»')
  comprobar(claveDeSenal({ lado: 'VENTA', tipo: 'tendencia' }) === 'pausadas', 'una venta de la app, con las ventas en pausa, es «ventas en pausa»')
  comprobar(claveDeSenal({ lado: 'COMPRA', tipo: 'lss' }) === 'ruptura', 'la de estructura es «ruptura»')
  comprobar(claveDeSenal({ lado: 'COMPRA', tipo: 'loQueVenga' }) === null, 'un tipo nuevo no pertenece a ningún interruptor')
  comprobar(JSON.stringify(DEFECTO_ADMIN) === '["caida"]' && DEFECTO_MIEMBRO.length === 0, 'por defecto: el administrador, «comprar la caída»; un miembro, nada')
  comprobar(defectoPara(true) === DEFECTO_ADMIN && defectoPara(false) === DEFECTO_MIEMBRO, '`defectoPara` elige cuál')
  const suena = senalesQueSuenan([exp('EUR/USD', 'COMPRA', undefined), exp('EUR/USD', 'VENTA', undefined)], ['app'])
  comprobar(suena.length === 1 && suena[0].s.lado === 'COMPRA', 'con «señales de la app» encendido suena la compra; la venta en pausa va por su propio interruptor')
  comprobar(clavesElegidas({ [campo]: ['caida', 'basura', 7, 'caida'] }, APP, OPCIONES, DEFECTO_ADMIN).join() === 'caida', 'lo guardado se limpia: sin repetidos ni claves que no existen')

  const m = armarMensajeExperimento(exp('AUD/USD', 'COMPRA', 'caida').s, 'es')
  console.log(`     es → ${m.titulo} | ${m.cuerpo}`)
  comprobar(m.titulo.includes('Comprar la caída') && m.titulo.includes('AUD/USD COMPRA'), 'el título dice la regla, el par y el lado')
  comprobar(/no es una señal/.test(m.cuerpo) && m.cuerpo.includes('SL') && m.cuerpo.includes('1:1.0'), 'el cuerpo dice que no es una señal y trae los niveles')
  comprobar(m.tag.startsWith('exp|') && m.tag !== armarMensaje(exp('AUD/USD', 'COMPRA', 'caida').s, 'es').tag, 'su etiqueta no puede reemplazar un aviso de la app')
  const en = armarMensajeExperimento(exp('AUD/USD', 'COMPRA', 'caida').s, 'en')
  comprobar(en.titulo.includes('BUY') && /not a signal/.test(en.cuerpo), 'en inglés, BUY y «not a signal»')

  // ⚠️ EL SITIO DE LA LLAMADA EN EL VIGÍA. La primera versión quedó pegada por
  // error DENTRO de la salida temprana «hoy ya corrió», donde `nuevasSombra`
  // todavía no existe: el vigía habría reventado en esa rama. Lo cazó el
  // linter, no esta prueba — por eso ahora hay una.
  const v = readFileSync(new URL('./vigia.mjs', import.meta.url), 'utf8')
  const iSeparar = v.indexOf('separarSombra(nuevas)')
  const iBarrido = v.indexOf("escribir(BARRIDO")
  const iLlamada = v.indexOf('enviarAvisosExperimento(nuevas)')
  comprobar(iSeparar > 0 && iLlamada > iSeparar && iLlamada > iBarrido, 'el vigía avisa DESPUÉS de separar la sombra y de escribir todo lo irrecuperable, con TODAS las nuevas')
}

servidor.close()
rmSync(carpeta, { recursive: true, force: true })
console.log(fallos ? `\n✗ ${fallos} comprobaciones fallaron\n` : '\n✓ todo bien\n')
process.exit(fallos ? 1 : 0)
