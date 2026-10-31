// ¿SUENAN LOS AVISOS DEL USUARIO, Y SOLO LOS QUE DEBEN? Sin internet.
//
// Correr con: node scripts/prueba-avisos-usuario.mjs
//
// ─────────────────────────────────────────────────────────────────────────
// QUÉ VIGILA, Y POR QUÉ ESO Y NO OTRA COSA
// ─────────────────────────────────────────────────────────────────────────
// La decisión de «¿suena?» ya tiene su propia prueba (`prueba-alertas.mjs`).
// Aquí lo que se comprueba es la PLOMERÍA, que es donde están los fallos que
// no dan ningún error:
//
//   1. que la lista de avisos se pueda LEER de Firestore. Antes del
//      2026-10-31, `planchar` no conocía `arrayValue`, así que el campo
//      `avisos` **desaparecía**: el programa habría leído cero avisos para
//      todo el mundo y habría terminado en verde diciendo «nada que mandar».
//   2. que un aviso de indicador sin `app` NO dispare, porque «RSI 30» no es
//      lo mismo en velas diarias que en velas de una hora;
//   3. que cada app se juzgue con SU frescura de barrido;
//   4. que se marque ANTES de mandar — al revés, un fallo al escribir haría
//      sonar el mismo aviso cada 15 minutos para siempre;
//   5. y que esto NO herede la pausa de las señales, que es de otra cosa.

import { readFileSync } from 'node:fs'
import { crearT } from '../src/lib/i18n/crearT.js'
import { etiquetar, planchar } from './lib/firestore-rest.mjs'
import {
  APPS,
  EDAD_BARRIDO_MIN,
  agruparPorApp,
  appDe,
  armarNotificacion,
  datosPorPar,
  mandarATodos,
  prepararEnvios,
} from './lib/avisos-usuario.mjs'

let mal = 0
const comprobar = (que, cond) => {
  console.log(`${cond ? '  OK  ' : '  MAL '} ${que}`)
  if (!cond) mal++
}

const AHORA = new Date('2026-10-31T12:00:00.000Z')
const haceMin = (m) => new Date(AHORA.getTime() - m * 60_000).toISOString()

// Un barrido de mentira con 20 cierres que sí dan bandas (una serie plana no
// daría ninguna y `posicionDe` devolvería null, que es lo correcto pero no
// probaría nada).
const serie = Array.from({ length: 20 }, (_, i) => 1.1 + Math.sin(i / 2) * 0.01)
const barridoDe = (generadoEl, rsi, c) => ({
  generadoEl,
  pares: [{ name: 'EUR/USD', c, rsiV: rsi, serie20: serie, dec: 5 }],
})

const MT5 = {
  actualizadoEl: haceMin(5),
  pares: { 'EUR/USD': { bid: 1.1161, ask: 1.1162 }, 'EUR/GBP': { bid: 0.868, ask: 0.8682 } },
}

console.log('\n1. ⚠️⚠️ LA LISTA DE AVISOS SE PUEDE LEER Y ESCRIBIR EN FIRESTORE')
// El fallo que esto caza no daba error: devolvía un documento SIN el campo.
{
  const avisos = [
    { id: 'a1', par: 'EUR/USD', tipo: 'precio', lado: 'sube', nivel: 1.115, activa: true, app: 'swing', veces: 2 },
    { id: 'a2', par: 'EUR/USD', tipo: 'rsi', lado: 'abajo', nivel: 30, activa: false, disparadaEl: null },
  ]
  const ida = etiquetar({ nombre: 'Néstor', avisos, seguimiento: ['EUR/USD'] })
  comprobar('una lista se escribe como arrayValue', 'arrayValue' in ida.avisos)
  comprobar('y cada aviso como mapValue', 'mapValue' in ida.avisos.arrayValue.values[0])
  const vuelta = planchar(ida)
  // ⚠️ Se guarda en una variable con guarda en vez de leer `vuelta.avisos[0]`
  // directo: con el fallo puesto, el campo NO EXISTE, y entonces la prueba se
  // moriría con un error de JavaScript en la primera línea en vez de decir, una
  // por una, las siete cosas que dejan de cumplirse. Una prueba que se cae no
  // explica nada.
  const leidos = Array.isArray(vuelta.avisos) ? vuelta.avisos : []
  comprobar('vuelve siendo una lista', Array.isArray(vuelta.avisos) && leidos.length === 2)
  comprobar('con los campos dentro', leidos[0]?.id === 'a1' && leidos[0]?.par === 'EUR/USD')
  comprobar('los números enteros vuelven enteros', leidos[0]?.veces === 2)
  comprobar('los decimales vuelven decimales', leidos[0]?.nivel === 1.115)
  comprobar('el booleano vuelve booleano', leidos[1]?.activa === false)
  // ⚠️ `rearmar` escribe `disparadaEl: null` a propósito: es «este aviso no ha
  // sonado». Tirar el campo lo haría indistinguible de «nunca se escribió».
  comprobar('un null vuelve siendo null, no se tira', leidos[1] && leidos[1].disparadaEl === null)
  comprobar('la vuelta entera es idéntica', JSON.stringify(leidos) === JSON.stringify(avisos))
  comprobar('la lista de seguimiento también', JSON.stringify(vuelta.seguimiento) === JSON.stringify(['EUR/USD']))
  // Una lista vacía no es lo mismo que ninguna lista.
  comprobar('una lista vacía sigue siendo una lista', Array.isArray(planchar(etiquetar({ a: [] })).a))
  // ⚠️ El ORDEN de las ramas de `etiquetar`: una fecha es un objeto, así que si
  // la rama genérica fuera antes se guardaría como un mapa vacío.
  comprobar('una fecha no se convierte en un mapa', 'timestampValue' in etiquetar({ d: new Date(0) }).d)
}

console.log('\n2. ⚠️ DE QUÉ APP ES UN AVISO — enumerado, nunca por descarte')
comprobar('swing', appDe({ app: 'swing' }) === 'swing')
comprobar('intradia', appDe({ app: 'intradia' }) === 'intradia')
comprobar('sin campo → null', appDe({}) === null)
comprobar('una app inventada → null, no se acepta', appDe({ app: 'futuros' }) === null)
comprobar('las dos apps y nada más', APPS.length === 2)
{
  const g = agruparPorApp([{ app: 'swing', id: 1 }, { app: 'intradia', id: 2 }, { id: 3 }, null, 'basura'])
  comprobar('cada app con los suyos', g.swing.length === 1 && g.intradia.length === 1)
  comprobar('los que no lo dicen van a SU montón, no repartidos', g.sinApp.length === 1 && g.sinApp[0].id === 3)
  comprobar('la basura no entra en ninguno', g.swing.length + g.intradia.length + g.sinApp.length === 3)
}

console.log('\n3. Los datos de cada par')
{
  const d = datosPorPar(MT5, barridoDe(haceMin(30), 28, 1.08))
  comprobar('el precio sale del puente', d['EUR/USD'].bid === 1.1161 && d['EUR/USD'].ask === 1.1162)
  comprobar('con la hora a la que se tomó', d['EUR/USD'].precioEl === MT5.actualizadoEl)
  comprobar('el RSI sale del barrido', d['EUR/USD'].rsi === 28)
  comprobar('el %B se calcula de los 20 cierres', typeof d['EUR/USD'].posB === 'number')
  comprobar('con la hora del barrido', d['EUR/USD'].tecnicoEl === haceMin(30))
  // Un par que está en el puente y no en el barrido: tiene precio y no tiene
  // indicadores. Es el caso de los 4 pares que solo usa Intradía.
  comprobar('un par sin barrido tiene precio', d['EUR/GBP'].bid === 0.868)
  comprobar('…y no tiene RSI', d['EUR/GBP'].rsi === undefined)
  // Sin barrido ninguno, los dos campos técnicos no existen.
  const s = datosPorPar(MT5, null)
  comprobar('sin barrido: precio sí, indicadores no', s['EUR/USD'].bid === 1.1161 && s['EUR/USD'].rsi === undefined)
  // ⚠️ `posicionDe` devuelve null —nunca 0— con una serie plana, y entonces el
  // campo no se pone: un 0 diría «está justo en la media», que es afirmar.
  const plana = datosPorPar(MT5, { generadoEl: haceMin(1), pares: [{ name: 'EUR/USD', c: 1.1, rsiV: 50, serie20: Array(20).fill(1.1) }] })
  comprobar('con la serie plana no hay %B, y no es 0', !('posB' in plana['EUR/USD']))
}

console.log('\n4. ⚠️⚠️ UN AVISO DE INDICADOR SIN `app` NO SUENA, aunque el nivel esté tocado')
// «RSI 30» es el RSI de velas DIARIAS en Swing y el de velas de UNA HORA en
// Intradía. Sin saber de dónde viene habría que adivinar qué pidió la persona,
// y adivinar hacia el lado que SUENA es un aviso falso.
{
  const datos = {
    swing: datosPorPar(MT5, barridoDe(haceMin(30), 25, 1.08)),
    intradia: datosPorPar(MT5, barridoDe(haceMin(30), 25, 1.08)),
    soloPrecio: datosPorPar(MT5, null),
  }
  const rsiSinApp = { id: 'r', par: 'EUR/USD', tipo: 'rsi', lado: 'abajo', nivel: 30, activa: true }
  const precioSinApp = { id: 'p', par: 'EUR/USD', tipo: 'precio', lado: 'sube', nivel: 1.1, activa: true }

  const soloRsi = prepararEnvios([rsiSinApp], datos, { ahora: AHORA })
  comprobar('el de RSI sin app NO dispara', soloRsi.envios.length === 0)
  comprobar('…y se CUENTA, no desaparece en silencio', soloRsi.sinApp === 1)
  comprobar('…y no se le toca nada en la ficha', soloRsi.cambios === 0)

  // El mismo aviso CON app sí dispara: así se ve que lo que lo paraba era la
  // falta del campo y no otra cosa.
  const conApp = prepararEnvios([{ ...rsiSinApp, app: 'swing' }], datos, { ahora: AHORA })
  comprobar('con app sí dispara', conApp.envios.length === 1)

  // ⚠️ El de PRECIO sí suena sin app: el bid y el ask salen del puente de MT5,
  // que es uno y el mismo para las dos apps. Ahí no hay nada que adivinar.
  const precio = prepararEnvios([precioSinApp], datos, { ahora: AHORA })
  comprobar('el de PRECIO sin app SÍ dispara', precio.envios.length === 1)
  comprobar('…y no cuenta como saltado', precio.sinApp === 0)
}

console.log('\n5. ⚠️ CADA APP CON SU FRESCURA DE BARRIDO')
// Swing publica dos veces al día e Intradía una vez por hora: un barrido de
// tres horas es normal allá y es viejo acá. Copiar el número de la hermana es
// la lección de `barridoSwap`.
comprobar('las dos tienen su umbral', EDAD_BARRIDO_MIN.swing > 0 && EDAD_BARRIDO_MIN.intradia > 0)
comprobar('y NO son el mismo', EDAD_BARRIDO_MIN.swing !== EDAD_BARRIDO_MIN.intradia)
comprobar('el de Swing es mucho mayor', EDAD_BARRIDO_MIN.swing > EDAD_BARRIDO_MIN.intradia * 5)
{
  // ⚠️ El umbral de Swing sale de `HORAS_VIEJO` de su `useMarketData.js`, que
  // es con el que la PANTALLA pinta el aviso de «foto vieja». Si los dos se
  // separaran, la app diría que el dato está fresco y el aviso no sonaría. Se
  // lee como TEXTO porque ese archivo usa hooks de React y no se puede
  // importar desde Node.
  const txt = readFileSync(new URL('../src/lib/useMarketData.js', import.meta.url), 'utf8')
  const m = /HORAS_VIEJO\s*=\s*(\d+)/.exec(txt)
  comprobar('se encontró HORAS_VIEJO en useMarketData.js', Boolean(m))
  comprobar(
    `el umbral de Swing (${EDAD_BARRIDO_MIN.swing} min) es el HORAS_VIEJO de la pantalla (${m?.[1]} h)`,
    Number(m?.[1]) * 60 === EDAD_BARRIDO_MIN.swing
  )
}
{
  // Un barrido de 3 horas: vale en Swing, no vale en Intradía. MISMO aviso,
  // mismo nivel, mismos datos — solo cambia de qué app dice ser.
  const viejo = barridoDe(haceMin(180), 25, 1.08)
  const datos = { swing: datosPorPar(MT5, viejo), intradia: datosPorPar(MT5, viejo), soloPrecio: datosPorPar(MT5, null) }
  const base = { par: 'EUR/USD', tipo: 'rsi', lado: 'abajo', nivel: 30, activa: true }
  comprobar(
    'barrido de 3 h: en Swing dispara',
    prepararEnvios([{ ...base, id: 's', app: 'swing' }], datos, { ahora: AHORA }).envios.length === 1
  )
  comprobar(
    'barrido de 3 h: en Intradía NO dispara',
    prepararEnvios([{ ...base, id: 'i', app: 'intradia' }], datos, { ahora: AHORA }).envios.length === 0
  )
}

console.log('\n6. Lo que se marca en la ficha después de mandar')
{
  const datos = { swing: datosPorPar(MT5, barridoDe(haceMin(30), 25, 1.08)), intradia: {}, soloPrecio: datosPorPar(MT5, null) }
  const nuevo = { id: 'n', par: 'EUR/USD', tipo: 'precio', lado: 'sube', nivel: 1.1, activa: true, app: 'swing' }
  const esperando = { id: 'e', par: 'EUR/USD', tipo: 'precio', lado: 'sube', nivel: 9, activa: true, app: 'swing' }
  const r = prepararEnvios([nuevo, esperando], datos, { ahora: AHORA })
  comprobar('solo se manda el que toca', r.envios.length === 1 && r.envios[0].aviso.id === 'n')
  comprobar('se marca uno solo', r.cambios === 1)
  const marcado = r.avisos.find((a) => a.id === 'n')
  comprobar('con la hora del disparo', marcado.disparadaEl === AHORA.toISOString())
  comprobar('y la de la última vez que sonó', marcado.sonadaEl === AHORA.toISOString())
  comprobar('contando una vez', marcado.veces === 1)
  // ⚠️ El que no se manda NO se toca. Marcarlo lo esconderí­a para siempre.
  comprobar('el que espera queda igual que estaba', r.avisos.find((a) => a.id === 'e') === esperando)
  comprobar('la lista mantiene el orden y el tamaño', r.avisos.length === 2)
}

console.log('\n7. Los recordatorios suman en el contador, no lo reinician')
{
  // Ya sonó hace 20 minutos, nadie lo ha visto: toca el primer recordatorio.
  const yaSono = {
    id: 'y',
    par: 'EUR/USD',
    tipo: 'precio',
    lado: 'sube',
    nivel: 1.1,
    activa: true,
    app: 'swing',
    disparadaEl: haceMin(20),
    sonadaEl: haceMin(20),
    veces: 1,
  }
  const datos = { swing: datosPorPar(MT5, null), intradia: {}, soloPrecio: datosPorPar(MT5, null) }
  const r = prepararEnvios([yaSono], datos, { ahora: AHORA })
  comprobar('se manda como recordatorio', r.envios.length === 1 && r.envios[0].motivo === 'recordatorio')
  const m = r.avisos[0]
  comprobar('el contador sube a 2', m.veces === 2)
  comprobar('se apunta cuándo volvió a sonar', m.sonadaEl === AHORA.toISOString())
  // ⚠️ La hora del PRIMER disparo no se toca: de ella sale el techo de 90
  // minutos que impide recordar algo de ayer.
  comprobar('la hora del primer disparo NO se mueve', m.disparadaEl === haceMin(20))

  // Visto por la persona: se acabaron los recordatorios. Es la condición que
  // puso Néstor.
  comprobar(
    'si ya lo vio, no se recuerda',
    prepararEnvios([{ ...yaSono, vistoEl: haceMin(1) }], datos, { ahora: AHORA }).envios.length === 0
  )
}

console.log('\n8. El texto de la notificación')
{
  const t = crearT('es')
  const dato = datosPorPar(MT5, null)['EUR/USD']
  const aviso = { id: 'x', par: 'EUR/USD', tipo: 'precio', lado: 'sube', nivel: 1.1, app: 'swing' }
  const n = armarNotificacion(t, { aviso, estado: { valor: 1.1161, edad: 5 }, motivo: 'nuevo' }, dato)
  comprobar('el título nombra el par', n.titulo.includes('EUR/USD'))
  comprobar('el cuerpo dice el nivel y los dos precios', n.cuerpo.includes('1.1') && n.cuerpo.includes('1.1162'))
  comprobar('no sale ninguna clave sin traducir', !n.titulo.includes('misAvisos.') && !n.cuerpo.includes('misAvisos.'))

  // ⚠️ Un RECORDATORIO lleva OTRO título. Con el mismo, el segundo aviso se
  // leería como que el precio volvió a tocar el nivel — y `tocaRepetir` no
  // vuelve a mirar el precio justo para no afirmar eso.
  const rec = armarNotificacion(t, { aviso, estado: null, motivo: 'recordatorio' }, dato)
  comprobar('el recordatorio se distingue del primero', rec.titulo !== n.titulo)
  comprobar('y también nombra el par', rec.titulo.includes('EUR/USD'))
  comprobar('los dos títulos tienen texto de verdad', n.titulo.length > 6 && rec.titulo.length > 6)

  // Las dos claves en los 13 idiomas. Un `t()` de una clave que no existe no
  // da error: sale en blanco, y el aviso llegaría sin título.
  const idiomas = ['es', 'en', 'de', 'fr', 'pt', 'it', 'zh', 'ja', 'ru', 'ar', 'tr', 'hi', 'ko']
  const faltan = idiomas.filter((i) => {
    const ti = crearT(i)
    return !ti('misAvisos.notiTitulo', { par: 'X' }) || !ti('misAvisos.notiTituloRecordatorio', { par: 'X' })
  })
  comprobar(`los 13 idiomas tienen los dos títulos (faltan ${faltan.length})`, faltan.length === 0)
  comprobar('y el par entra dentro en todos', idiomas.every((i) => crearT(i)('misAvisos.notiTitulo', { par: 'ZZZ' }).includes('ZZZ')))
}

console.log('\n9. ⚠️⚠️ EL BUCLE DE VERDAD, CON FIRESTORE Y EL PUSH DE MENTIRA')
// No se lee el texto del programa: se CORRE el bucle con dos funciones falsas
// y se cuenta qué pasó. Para eso se sacó del guion — dentro necesitaba
// credenciales y red en cuanto se importaba.
{
  const datos = { swing: datosPorPar(MT5, barridoDe(haceMin(30), 25, 1.08)), intradia: {}, soloPrecio: datosPorPar(MT5, null) }
  const aviso = (id) => ({ id, par: 'EUR/USD', tipo: 'precio', lado: 'sube', nivel: 1.1, activa: true, app: 'swing' })
  const aparato = (ruta) => ({ ruta, uid: 'u1', endpoint: 'e' + ruta, idioma: 'es' })

  const correr = async (fichas, subsPorUid, opciones = {}) => {
    const mandados = []
    const escritos = []
    const r = await mandarATodos({
      fichas,
      subsPorUid,
      datos,
      ahora: AHORA,
      aplicar: true,
      enviar: async (sub, envio) => {
        mandados.push(`${sub.ruta}:${envio.aviso.id}`)
        return opciones.respuesta?.(sub) ?? 'ok'
      },
      marcar: async (ruta, avisos) => {
        if (opciones.marcarFalla) throw new Error('no se pudo')
        escritos.push({ ruta, avisos })
      },
      ...opciones.extra,
    })
    return { r, mandados, escritos }
  }

  // El caso normal: dos aparatos, un aviso → suena en los dos.
  {
    const { r, mandados, escritos } = await correr(
      [{ id: 'u1', ruta: 'users/u1', estado: 'aprobado', avisos: [aviso('a')] }],
      new Map([['u1', [aparato('s1'), aparato('s2')]]])
    )
    comprobar('suena en los dos aparatos de la persona', r.enviados === 2 && mandados.length === 2)
    comprobar('y la ficha se escribe UNA vez', escritos.length === 1)
    comprobar('con el aviso ya marcado', escritos[0].avisos[0].disparadaEl === AHORA.toISOString())
  }

  // ⚠️ Quien no está aprobado no recibe nada. El candado de la app es
  // `estado === 'aprobado'` y el robot de vencimientos lo cierra solo; mandarle
  // avisos sería darle el producto por una puerta de atrás.
  for (const estado of ['pendiente', 'retirado', undefined]) {
    const { r, mandados, escritos } = await correr(
      [{ id: 'u1', ruta: 'users/u1', estado, avisos: [aviso('a')] }],
      new Map([['u1', [aparato('s1')]]])
    )
    comprobar(`estado «${estado}»: no se manda ni se marca`, r.enviados === 0 && !mandados.length && !escritos.length)
  }

  // ⚠️ SIN APARATO NO SE MARCA. Marcarlo lo esconderí­a detrás de un «ya sonó»
  // de algo que nunca llegó.
  {
    const { r, escritos } = await correr([{ id: 'u1', ruta: 'users/u1', estado: 'aprobado', avisos: [aviso('a')] }], new Map())
    comprobar('sin aparatos: se cuenta y NO se marca', r.sinAparato === 1 && !escritos.length)
    comprobar('…y no se cuenta como enviado', r.enviados === 0)
  }

  // ⚠️⚠️ SI NO SE PUDO MARCAR, NO SE MANDA. Es la comprobación central del
  // archivo: mandar sin marca haría sonar el mismo aviso cada 15 minutos para
  // siempre, porque `veces` tampoco subiría. Un aviso perdido es acotado; esto
  // no lo es.
  {
    const { r, mandados } = await correr(
      [{ id: 'u1', ruta: 'users/u1', estado: 'aprobado', avisos: [aviso('a')] }],
      new Map([['u1', [aparato('s1')]]]),
      { marcarFalla: true }
    )
    comprobar('la marca falla → NO se manda nada', mandados.length === 0 && r.enviados === 0)
    comprobar('…y se dice cuántos quedaron sin mandar', r.noSeMarco === 1)
  }

  // Un aparato muerto se apunta para borrarlo y no se insiste con él.
  {
    const { r, mandados } = await correr(
      [{ id: 'u1', ruta: 'users/u1', estado: 'aprobado', avisos: [aviso('a'), { ...aviso('b'), par: 'EUR/USD' }] }],
      new Map([['u1', [aparato('s1'), aparato('s2')]]]),
      { respuesta: (s) => (s.ruta === 's1' ? 'muerta' : 'ok') }
    )
    comprobar('la suscripción muerta se apunta', r.muertas.length === 1 && r.muertas[0] === 's1')
    comprobar('no se insiste con ella en el segundo aviso', mandados.filter((x) => x.startsWith('s1')).length === 1)
    comprobar('y la viva recibe los dos avisos', mandados.filter((x) => x.startsWith('s2')).length === 2)
  }

  // Sin presupuesto no se manda nada y se dice cuántos quedaron. Perder unos
  // avisos de esta vuelta es mejor que atascar la cola de las siguientes.
  {
    const { r, mandados } = await correr(
      [{ id: 'u1', ruta: 'users/u1', estado: 'aprobado', avisos: [aviso('a')] }],
      new Map([['u1', [aparato('s1')]]]),
      { extra: { seAcabaEn: Date.now() - 1 } }
    )
    comprobar('sin tiempo: no se manda y se cuenta', mandados.length === 0 && r.sinTiempo === 1)
  }

  // En seco no se escribe ni se manda, pero sí se cuenta lo que habría pasado.
  {
    let toco = false
    const r = await mandarATodos({
      fichas: [{ id: 'u1', ruta: 'users/u1', estado: 'aprobado', avisos: [aviso('a')] }],
      subsPorUid: new Map([['u1', [aparato('s1')]]]),
      datos,
      ahora: AHORA,
      aplicar: false,
      enviar: async () => ((toco = true), 'ok'),
      marcar: async () => ((toco = true), undefined),
    })
    comprobar('en seco no se toca nada de fuera', toco === false)
    comprobar('…y aun así dice qué habría mandado', r.candidatos === 1 && r.enviados === 1)
  }
}

console.log('\n10. ⚠️ ESTO NO HEREDA LA PAUSA DE LAS SEÑALES DE LA APP')
{
  const guion = readFileSync(new URL('./mandar-avisos.mjs', import.meta.url), 'utf8')
  const motor = readFileSync(new URL('./lib/avisos-usuario.mjs', import.meta.url), 'utf8')

  // ⚠️ `AVISOS_PAUSADOS` para las SEÑALES de la app, que no están validadas. Un
  // aviso que la persona se puso a sí misma no tiene nada nuestro que validar,
  // así que esa pausa no le aplica — y si se colara, nadie recibiría nunca lo
  // que pidió y el motivo estaría escrito en otro archivo.
  for (const [nombre, txt] of [['el guion', guion], ['el motor', motor]]) {
    comprobar(`${nombre} no importa la pausa de las señales`, !/from '.*push\/pausa/.test(txt))
    comprobar(`${nombre} no importa el enviador de señales`, !/from '.*push-envio/.test(txt))
  }

  // Y no filtra las suscripciones por app: un aviso es de la PERSONA, así que
  // va a todos sus aparatos. Es la decisión contraria a `push-envio.mjs`.
  comprobar('el guion no filtra los aparatos por app', !/s\.app === |\.app === APP/.test(guion))
}

console.log('')
if (mal) {
  console.log(`✗ ${mal} comprobación(es) MAL.\n`)
  process.exit(1)
}
console.log('✓ todo bien.\n')
