// ¿A quién hay que cerrarle la puerta hoy?
//
// Ésta es la mitad PENSANTE del robot de vencimientos: aquí no hay red, ni
// Firestore, ni reloj del sistema. Entran una lista de fichas y una fecha, y
// sale a quién cerrar y por qué. Así se comprueba entera sin tocarle la
// cuenta a nadie (`prueba-vencimientos.mjs`, sin internet).
//
// El candado de la app NO se construye aquí: ya existe. `useAuthUser.js` deja
// entrar solo si `users/{uid}.estado === 'aprobado'`. Esto solo cambia quién
// gira la llave — hoy la gira Néstor a mano en la pestaña Miembros.
//
// ⚠️ LAS DOS APPS COMPARTEN LA MISMA COLECCIÓN `users` (mismo proyecto de
// Firebase). Una fecha de vencimiento vale para Swing Y para Intradía a la
// vez; no existe «vence solo en una». Si algún día se quieren cobros
// separados, eso es un campo nuevo y una decisión nueva, no un retoque.

// ⚠️ LAS CUENTAS DE FECHAS NO ESTÁN AQUÍ: viven en `src/lib/vencimientos.js`
// porque la pantalla de Miembros también las necesita, y dos copias de una
// cuenta de días es la forma más fácil de que un día digan cosas distintas.
// Aquí solo se reexportan para que el robot y su prueba las tengan a mano.
export {
  DIAS_CICLO,
  DIAS_GRACIA,
  diasEntre,
  diasRestantes,
  esFechaISO,
  extender,
  hoyUTC,
} from '../../src/lib/vencimientos.js'

import { DIAS_GRACIA, diasRestantes, esFechaISO } from '../../src/lib/vencimientos.js'

// La decisión completa, sin efectos: quién se cierra, quién no y por qué.
//
// `usuarios`: [{ uid, email, nombre, estado, venceEl }]
// `hoy`: 'YYYY-MM-DD' en UTC
// `adminEmail`: el correo del administrador, en minúsculas
export function decidir({ usuarios = [], hoy, adminEmail = '', diasGracia = DIAS_GRACIA }) {
  if (!esFechaISO(hoy)) throw new Error(`«hoy» no es una fecha válida: ${JSON.stringify(hoy)}`)

  const cerrar = []
  const avisos = []
  const intactos = []
  const admin = String(adminEmail).trim().toLowerCase()

  for (const u of usuarios) {
    const correo = String(u?.email ?? '').trim().toLowerCase()
    const quien = { uid: u?.uid, email: correo, nombre: u?.nombre ?? '' }

    // ⚠️ EL ADMINISTRADOR NUNCA SE CIERRA, pase lo que pase en su ficha.
    //
    // No es un privilegio: es la única puerta de vuelta. Aprobar y reabrir
    // cuentas solo lo puede hacer él desde la pestaña Miembros, así que un
    // robot que lo encierre deja la app sin nadie que pueda abrir nada — ni
    // él mismo. Es la clase de fallo que no se arregla con otro robot.
    if (admin && correo === admin) {
      intactos.push({ ...quien, motivo: 'admin' })
      continue
    }

    // Quien ya no está dentro no hay que sacarlo.
    if (u?.estado !== 'aprobado') {
      intactos.push({ ...quien, motivo: 'noAprobado', estado: u?.estado })
      continue
    }

    // ⚠️ SIN FECHA NO SE CIERRA A NADIE.
    //
    // El día que esto se estrene, NINGUNA ficha tiene `venceEl` — ni la de
    // Néstor. Si «sin fecha» significara «vencido», la primera corrida
    // echaría a todos los miembros de las dos apps de golpe. «No lo sé» y
    // «se le acabó» no son lo mismo, igual que `pearson` devuelve null y no
    // cero en `correlacion.js`.
    if (u?.venceEl === undefined || u?.venceEl === null || u?.venceEl === '') {
      intactos.push({ ...quien, motivo: 'sinFecha' })
      continue
    }

    // ⚠️ UNA FECHA QUE NO SE ENTIENDE TAMPOCO CIERRA — pero SÍ se canta.
    //
    // Cerrar por basura sería cerrar por un error nuestro. Pero callarlo
    // sería peor: una ficha con la fecha mal escrita se quedaría abierta
    // para siempre sin que nadie se entere, que es justo el fallo silencioso
    // que este proyecto lleva meses persiguiendo. Ante la duda, se deja
    // entrar y se avisa.
    if (!esFechaISO(u.venceEl)) {
      avisos.push({ ...quien, codigo: 'fechaIlegible', venceEl: u.venceEl })
      intactos.push({ ...quien, motivo: 'fechaIlegible' })
      continue
    }

    const dias = diasRestantes(u.venceEl, hoy)
    if (dias >= -diasGracia) {
      intactos.push({ ...quien, motivo: 'alDia', venceEl: u.venceEl, dias })
      continue
    }

    cerrar.push({ ...quien, venceEl: u.venceEl, diasVencido: -dias })
  }

  return { cerrar, avisos, intactos }
}

// El correo del administrador, sacado del texto de `.env.production`.
//
// Se lee de ahí —y no se escribe a mano en el robot— porque ése es el mismo
// sitio del que lo saca la app. Una tercera copia sería una tercera cosa que
// se desincroniza el día que Néstor cambie de correo, y la consecuencia de
// que se desincronice es que el guardia que impide encerrar al
// administrador deje de reconocerlo.
export function adminDeEnv(textoEnv = '') {
  const m = String(textoEnv).match(/^VITE_ADMIN_EMAIL=(.*)$/m)
  return (m?.[1] ?? '').trim().toLowerCase()
}

// Y el mismo correo tal como está escrito en `firestore.rules`, para poder
// comprobar que los dos dicen lo mismo.
export function adminDeReglas(textoReglas = '') {
  const m = String(textoReglas).match(/request\.auth\.token\.email\s*==\s*'([^']+)'/)
  return (m?.[1] ?? '').trim().toLowerCase()
}

// Quién está a punto de vencer, para avisar antes y no después.
// Devuelve los aprobados con fecha válida a los que les quedan `<= dias`.
export function porVencer(usuarios = [], hoy, dias = 3) {
  if (!esFechaISO(hoy)) return []
  return usuarios
    .filter((u) => u?.estado === 'aprobado' && esFechaISO(u?.venceEl))
    .map((u) => ({ uid: u.uid, email: u.email, nombre: u.nombre, venceEl: u.venceEl, dias: diasRestantes(u.venceEl, hoy) }))
    .filter((u) => u.dias >= 0 && u.dias <= dias)
    .sort((a, b) => a.dias - b.dias)
}
