import { useIdioma } from '../lib/i18n'
import TarjetaPlegable from './TarjetaPlegable'
import { correlOrdenada, diasDelOro } from '../lib/oro'
import { useOro } from '../lib/useOro'

// EL ORO (XAU/USD), Y SU CORRELACIÓN MEDIDA CON LOS 14 PARES.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LA DECISIÓN QUE DA SENTIDO A TODA LA TARJETA
// ─────────────────────────────────────────────────────────────────────────
// **El precio del oro, solo, sería la primera tarjeta decorativa de esta app.**
// «Oro 4.131, +0,4 % hoy» no dice nada sobre ningún par, y lo que pasa cuando
// un número no dice nada es que cada uno le pone el significado que ya traía:
// «el oro sube → hay miedo → compro francos». Eso es una afirmación sobre el
// mercado que NADIE ha medido aquí.
//
// Por eso la tarjeta no la afirma: la MIDE. La correlación del oro con cada
// par sale del mismo motor, la misma ventana de 60 sesiones y la misma
// disciplina que la correlación entre pares. Si el oro y el USD/CHF se mueven
// juntos, el número lo dice; si no, también.
//
// ⚠️ NADA DEVUELVE UN VEREDICTO. No dice comprar ni vender, ni «refugio», ni
// «riesgo». El oro como FILTRO cambiaría las señales y tendría que pasar por
// el banco de pruebas con su listón escrito antes, como el COT — que se midió
// y suspendió. Hay una comprobación en `prueba-oro.mjs` que falla si aparece
// un veredicto.
//
// ⚠️ EL PRECIO NO SE PINTA DE VERDE NI DE ROJO. Que el oro suba no es bueno ni
// malo para quien opera Forex: depende del par y del lado. El color afirmaría
// algo que el dato no dice. Misma decisión que en `Correlacion.jsx`, `Tasas` y
// `Cot`, y la regla general de este proyecto — **antes de pintar algo de
// color, preguntarse qué afirma ese color.**
//
// ⚠️ LAS CORRELACIONES NEGATIVAS SE PINTAN IGUAL DE GRANDES, con su etiqueta
// propia. Un −0,9 dice lo mismo de fuerte que un +0,9; solo cambia hacia qué
// lado. Empequeñecerlas sería esconder la mitad de la información.
//
// ⚠️ Y CADA CORRELACIÓN LLEVA SU NÚMERO DE DÍAS. El oro y los pares vienen de
// dos consultas distintas y sus calendarios no coinciden, así que una fila
// puede salir de 60 días comunes y otra de 45. Sin decirlo, las dos se leen
// igual de sólidas.
//
// Va plegada por defecto, como el glosario, la correlación, las tasas y el
// COT: es contexto, no lo primero que se viene a mirar.

const P = { margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }
const PIE = { margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }

// Con signo explícito. `−` es el signo menos de verdad (U+2212), no un guion:
// en la tipografía de la app tiene el mismo ancho que el `+` y la columna no
// baila.
const pct = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(100 * x).toFixed(2) + ' %'
const conSigno = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(2)

export default function Oro() {
  // Sin `locale`: aquí no se formatea ningún número con él, a propósito. Ver el
  // comentario del pie, abajo.
  const { t } = useIdioma()
  const datos = useOro()

  // Sin datos no se pinta NADA — ni título ni «no hay nada». Mismo criterio
  // que la correlación, el calendario, las tasas y el COT: una tarjeta vacía
  // hace pensar que la app está rota.
  if (typeof datos?.precio !== 'number') return null

  const filas = correlOrdenada(datos)
  const dias = diasDelOro(datos.fecha)

  return (
    <TarjetaPlegable
      sigla={'XAU/USD'}
      titulo={t('oro.titulo')}
      desc={t('oro.desc')}
      paraQue={t('oro.paraQue')}
    >
      {/* ⚠️ EL AVISO VA PRIMERO, ANTES DE NINGÚN NÚMERO. Igual que en `Tasas`,
          `Cot` y la columna de actividad: lo primero que se lee es lo que se
          recuerda, así que lo primero que se dice tiene que ser lo que más
          caro sale ignorar. Aquí lo caro es leer el oro como una señal. */}
      <div
        style={{
          padding: '10px 12px',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          fontSize: 12.5,
          lineHeight: 1.55,
          color: 'var(--text-secondary)',
        }}
      >
        {t('oro.aviso')}
      </div>

      {/* ── El precio ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span
          className="mono"
          dir="ltr"
          style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {datos.precio.toFixed(2)}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t('oro.dolares')}</span>
      </div>

      <div style={{ display: 'flex', gap: 18, fontSize: 12.5 }}>
        <Cambio etiqueta={t('oro.enUnDia')} v={datos.cambio1} />
        <Cambio etiqueta={t('oro.enVeinteDias')} v={datos.cambio20} />
      </div>

      <p style={P}>{t('oro.intro')}</p>

      {/* ── La correlación con los pares ────────────────────────────── */}
      {filas.length > 0 ? (
        <div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              marginBottom: 8,
            }}
          >
            {t('oro.cabeceraCorrel')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filas.map((c) => (
              <Fila key={c.par} c={c} t={t} />
            ))}
          </div>
        </div>
      ) : (
        // ⚠️ Aquí SÍ se dice que no hay nada, al revés que con la tarjeta
        // entera. El motivo es que la tarjeta ya está abierta y enseñando un
        // precio: dejar el hueco en silencio se leería como que la app se
        // olvidó de algo. Y «ningún par se mueve con el oro» es un dato.
        <p style={P}>{t('oro.sinCorrel')}</p>
      )}

      {/* ⚠️⚠️ `dias` VA COMO NÚMERO PELADO, NO FORMATEADO CON EL LOCALE, y la
          primera versión lo tenía al revés «por el fallo del COT». Se vio
          leyendo el árabe de verdad en el navegador:

            بيانات 2026-09-26 — منذ ٣ يومًا

          La fecha es una cadena ISO —`2026-09-26`, siempre en cifras
          latinas— y el `toLocaleString` sacaba el `٣` en árabo-índicas. **Dos
          sistemas de dígitos en la misma frase**, que es literalmente el fallo
          del COT del 2026-09-14, provocado por lo que se puso para evitarlo.
          En el mismo renglón van además `−1`, `+1` y `0`, latinos los tres.

          📌 La regla, entonces, no es «localizar siempre» ni «nunca»: es
          **mirar qué más hay en la frase**. Donde el vecino es un
          `toLocaleDateString`, se localiza; donde es una fecha ISO, no. */}
      <p style={PIE}>{t('oro.pie', { fecha: datos.fecha ?? '', dias: dias ?? 0 })}</p>
    </TarjetaPlegable>
  )
}

function Cambio({ etiqueta, v }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{etiqueta}</div>
      {/* Neutro a propósito. Ver la cabecera del archivo: que el oro suba no
          es bueno ni malo para quien opera Forex. */}
      <div
        className="mono"
        dir="ltr"
        style={{ fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}
      >
        {/* Un `—` y no un 0 cuando no se pudo calcular: un cero diría «no se
            movió», que es una afirmación. */}
        {v == null ? '—' : pct(v)}
      </div>
    </div>
  )
}

function Fila({ c, t }) {
  // La etiqueta dice hacia qué lado, con palabras, en vez de dejar que el
  // signo lo diga solo. Misma idea que en `Correlacion.jsx`.
  const etiqueta = c.r > 0 ? t('oro.juntos') : t('oro.alReves')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        {/* `dir="ltr"` fijo: es un código, y en árabe se dibujaría al revés.
            Es el error que ya mordió siete veces en este repositorio. */}
        <div className="mono" dir="ltr" style={{ fontSize: 12.5, fontWeight: 700 }}>
          {c.par}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {/* ⚠️ Los días van dentro de una frase traducida, así que el número
              se aísla con `<bdi>` en vez de forzarle `ltr` al renglón entero:
              es la lección del calendario en árabe, donde forzarlo despegaba
              el `%` del número y partía «24.5K» en dos. */}
          {etiqueta} · <bdi>{t('oro.sobreDias', { n: c.n })}</bdi>
        </div>
      </div>
      <div
        className="mono"
        dir="ltr"
        style={{
          fontSize: 15,
          fontWeight: 700,
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
          // Neutro a propósito. Ver la cabecera del archivo.
          color: 'var(--text-secondary)',
        }}
      >
        {conSigno(c.r)}
      </div>
    </div>
  )
}
