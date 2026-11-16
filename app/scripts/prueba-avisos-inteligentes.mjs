// LOS AVISOS INTELIGENTES, sin internet ni credenciales.
//
// Correr con: node scripts/prueba-avisos-inteligentes.mjs
//
// Vigila lo que puede hacer sonar un celular de más o de menos: qué noticias,
// qué parejas y qué spreads avisan; que nadie reciba lo que no encendió; que
// se marque ANTES de mandar y que, si la marca falla, no se mande.

import { readFileSync } from 'node:fs'
import {
  CORREL_DIAS,
  NOTICIA_MIN,
  SPREAD_MIN_LECTURAS,
  avisosParaPersona,
  divisasDeLista,
  mediana,
  mensajeInteligente,
  noticiasQueAvisan,
  parejasQueAvisan,
  podarMarcas,
  spreadsQueAvisan,
  tiposEncendidos,
  yaAvisado,
} from '../src/lib/avisosInteligentes.js'
import { mandarInteligentes } from './lib/avisos-inteligentes.mjs'
import { crearT } from '../src/lib/i18n/crearT.js'

let mal = 0
const comprobar = (que, cond) => {
  console.log(`${cond ? '  OK  ' : '  MAL '} ${que}`)
  if (!cond) mal++
}

const AHORA = new Date('2026-11-16T13:00:00Z')
const enMin = (m) => new Date(AHORA.getTime() + m * 60_000).toISOString()

console.log('\n1. Arrancan apagados y solo vale lo que se entiende')
comprobar('sin el campo, ninguno encendido', tiposEncendidos({}).length === 0)
comprobar('una clave rara no enciende nada', tiposEncendidos({ avisosInt: ['loQueSea'] }).length === 0)
comprobar('lee los que sí existen', JSON.stringify(tiposEncendidos({ avisosInt: ['spread', 'noticias'] })) === JSON.stringify(['noticias', 'spread']))

console.log('\n2. Noticias')
{
  const ev = [
    { t: 'CPI m/m', c: 'USD', d: enMin(20), i: 'alto' },
    { t: 'PMI', c: 'USD', d: enMin(20), i: 'medio' },
    { t: 'Retail', c: 'JPY', d: enMin(10), i: 'alto' },
    { t: 'GDP', c: 'EUR', d: enMin(NOTICIA_MIN + 5), i: 'alto' },
    { t: 'Ya pasó', c: 'EUR', d: enMin(-5), i: 'alto' },
  ]
  const n = noticiasQueAvisan(ev, divisasDeLista(['EUR/USD']), AHORA)
  comprobar('solo impacto ALTO de tus divisas, dentro de la ventana', n.length === 1 && n[0].titulo === 'CPI m/m')
  comprobar('lo que ya empezó no avisa', !n.some((x) => x.titulo === 'Ya pasó'))
  comprobar('una divisa que no es tuya no avisa', !n.some((x) => x.divisa === 'JPY'))
  comprobar('dice cuántos minutos faltan', n[0].minutos === 20)
  comprobar('una fecha ilegible se salta', noticiasQueAvisan([{ t: 'x', c: 'USD', d: 'ayer', i: 'alto' }], ['USD'], AHORA).length === 0)
}

console.log('\n3. Correlación')
{
  const correl = { 'EUR/USD|GBP/USD': 0.9, 'EUR/USD|USD/CHF': -0.85, 'EUR/USD|USD/JPY': -0.5, 'AUD/USD|NZD/USD': 0.95, 'EUR/USD|NZD/CAD': null }
  const p = parejasQueAvisan(correl, ['EUR/USD', 'GBP/USD', 'USD/CHF', 'USD/JPY', 'NZD/CAD'])
  comprobar('avisa las de |r| ≥ 0,8, también las negativas', p.length === 2 && p.some((x) => x.r === -0.85))
  comprobar('las dos tienen que estar en TU lista', !p.some((x) => x.a === 'AUD/USD'))
  comprobar('null no es «se parecen»', !p.some((x) => x.b === 'NZD/CAD'))
  comprobar('sin mapa no revienta', parejasQueAvisan(null, ['EUR/USD']).length === 0)
}

console.log('\n4. Spread')
{
  const hist = Array.from({ length: SPREAD_MIN_LECTURAS }, () => ({ 'EUR/USD': 1, 'GBP/USD': 1.5 }))
  const s = spreadsQueAvisan({ 'EUR/USD': 2.4, 'GBP/USD': 2 }, hist, ['EUR/USD', 'GBP/USD'], '2026-11-16')
  comprobar('avisa el que está al doble o más de su mediana', s.length === 1 && s[0].par === 'EUR/USD')
  comprobar('con pocas lecturas se calla', spreadsQueAvisan({ 'EUR/USD': 9 }, hist.slice(0, 3), ['EUR/USD'], 'x').length === 0)
  comprobar('un par que no es tuyo no avisa', spreadsQueAvisan({ 'USD/JPY': 9 }, hist, ['EUR/USD'], 'x').length === 0)
  comprobar('la mediana de [1,3,2,10] es 2,5', mediana([1, 3, 2, 10]) === 2.5)
  comprobar('mediana vacía es null, no 0', mediana([]) === null)
}

console.log('\n5. Una sola vez')
{
  const noticia = { tipo: 'noticias', clave: 'noticia|USD|x|CPI' }
  comprobar('lo ya avisado no vuelve a sonar', yaAvisado({ [noticia.clave]: AHORA.toISOString() }, noticia, AHORA))
  const pareja = { tipo: 'correlacion', clave: 'correl|A|B' }
  const hace8 = new Date(AHORA.getTime() - (CORREL_DIAS + 1) * 86_400_000).toISOString()
  comprobar('la correlación vuelve a sonar pasada la semana', !yaAvisado({ [pareja.clave]: hace8 }, pareja, AHORA))
  comprobar('podar deja fuera las marcas viejas', Object.keys(podarMarcas({ viejo: '2026-01-01T00:00:00Z', nuevo: AHORA.toISOString() }, AHORA)).join() === 'nuevo')
}

console.log('\n6. Por persona')
{
  const ctx = { eventos: [{ t: 'CPI', c: 'USD', d: enMin(15), i: 'alto' }], correl: {}, spreadActual: {}, spreadHistorico: [], hoyISO: '2026-11-16' }
  comprobar('sin encender nada, no suena', avisosParaPersona({ seguimiento: ['EUR/USD'] }, ctx, AHORA).length === 0)
  comprobar('sin lista de pares, no suena', avisosParaPersona({ avisosInt: ['noticias'] }, ctx, AHORA).length === 0)
  comprobar('encendido y con lista, suena', avisosParaPersona({ avisosInt: ['noticias'], seguimiento: ['EUR/USD'] }, ctx, AHORA).length === 1)
}

console.log('\n7. El envío: marca antes, y sin marca no manda')
{
  const ctx = { eventos: [{ t: 'CPI', c: 'USD', d: enMin(15), i: 'alto' }], correl: {}, spreadActual: {}, spreadHistorico: [], hoyISO: '2026-11-16' }
  const ficha = (id, extra = {}) => ({ id, ruta: `projects/p/databases/(default)/documents/users/${id}`, estado: 'aprobado', avisosInt: ['noticias'], seguimiento: ['EUR/USD'], ...extra })
  const subs = new Map([['a', [{ ruta: 'r1', idioma: 'es' }]], ['b', [{ ruta: 'r2' }]], ['c', [{ ruta: 'r3' }]]])
  const orden = []
  const enviados = []
  const r = await mandarInteligentes({
    fichas: [ficha('a'), ficha('b'), ficha('c', { estado: 'retirado' }), ficha('d')],
    subsPorUid: subs,
    contexto: ctx,
    aplicar: true,
    t: (i) => crearT(i),
    ahora: AHORA,
    marcar: async (ruta) => {
      orden.push(`marcar ${ruta.split('/').pop()}`)
      return !ruta.endsWith('/b')
    },
    enviar: async (s, m) => {
      orden.push(`enviar ${s.ruta}`)
      enviados.push(m)
      return 'ok'
    },
  })
  comprobar('marca ANTES de enviar', orden.indexOf('marcar a') < orden.indexOf('enviar r1'))
  comprobar('si la marca falla, NO se manda', !orden.includes('enviar r2') && r.noSeMarco === 1)
  comprobar('un retirado no recibe nada', !orden.includes('enviar r3'))
  comprobar('sin aparato no se marca', !orden.includes('marcar d') && r.sinAparato === 1)
  comprobar('el mensaje dice que NO es una señal', /no es una señal/i.test(enviados[0]?.cuerpo || ''))
  const seco = []
  await mandarInteligentes({ fichas: [ficha('a')], subsPorUid: subs, contexto: ctx, aplicar: false, t: crearT, ahora: AHORA, marcar: async () => seco.push(1), enviar: async () => seco.push(2) })
  comprobar('en seco no marca ni manda', seco.length === 0)
}

console.log('\n8. Lo que no se puede colar')
{
  const es = crearT('es')
  for (const a of [
    { tipo: 'noticias', divisa: 'USD', titulo: 'CPI', minutos: 20 },
    { tipo: 'correlacion', a: 'EUR/USD', b: 'GBP/USD', r: 0.9 },
    { tipo: 'spread', par: 'EUR/USD', actual: 2.4, normal: 1 },
  ]) {
    const m = mensajeInteligente(a)
    const txt = `${es(m.titulo[0], m.titulo[1])} ${es(m.cuerpo[0], m.cuerpo[1])}`
    comprobar(`${a.tipo}: el texto existe y no dice comprar, vender ni cerrar`, txt.length > 10 && !/compr|vend|cierr|cerrar/i.test(txt))
  }
  const ui = readFileSync(new URL('../src/components/AvisosInteligentes.jsx', import.meta.url), 'utf8')
  comprobar('la pantalla lleva su «para qué sirve»', /paraQue=\{t\('intel\.paraQue'\)\}/.test(ui))
  comprobar('la pantalla lee los umbrales, no los escribe', /NOTICIA_MIN, CORREL_UMBRAL, SPREAD_FACTOR/.test(ui))
  const env = readFileSync(new URL('./mandar-avisos.mjs', import.meta.url), 'utf8')
  comprobar('el programa de avisos llama a los inteligentes', /mandarInteligentes\(/.test(env))
  comprobar('el spread solo vale con la foto del puente fresca', /edadMt5 <= EDAD_MAXIMA_PRECIO_MIN/.test(env))
}

if (mal) {
  console.log(`\n✗ ${mal} comprobación(es) MAL.\n`)
  process.exit(1)
}
console.log('\n✓ todo bien.\n')
