import { useIdioma } from '../lib/i18n'
import AvisoSombra from './AvisoSombra'
import { MEDICION } from '../lib/medicion'
import { MIN_OPS_COMPARAR, compararReglas } from '../lib/historialCalc'
import { margen } from '../lib/diagnostico'
import { fmtFecha } from '../lib/format'

// «COMPRAR LA CAÍDA», EN SU PROPIO RENGLÓN Y DESTACADA (2026-11-14).
//
// Néstor lo pidió así:
//
//   > quiero que esa medida de comprar lo que se cayó la pongamos en un renglón
//   > aparte pero destacable […] que me diga que esa medida es la que por ahora
//   > está dando mejores resultados y por supuesto con sus % de aciertos y
//   > desaciertos, sus operaciones, todo lo que ya tiene y lo que le puedas
//   > agregar de información importante y relevante.
//
// ⚠️⚠️ «VA PRIMERA» LO CALCULA LA APP, NO LO ESCRIBE NADIE. El día que esta
// tarjeta se escribió (2026-11-14) era verdad: 25 operaciones con la geometría
// aprobada, +0,12 por unidad de riesgo, la única regla en positivo del registro
// real. Escrito a mano, el día que otra la pasara la frase seguiría diciéndolo
// — es lo que le pasó a `medicion.queSignifica`, que dijo «55 %» durante
// meses. Por eso la etiqueta sale de `compararReglas`, y si deja de ir primera
// la etiqueta se va sola y la tabla de abajo dice quién va.
//
// ⚠️⚠️ «VA PRIMERA» NO QUIERE DECIR «FUNCIONA». Con 25 operaciones el acierto
// puede moverse ±20 puntos solo por casualidad, y el 50 % que hace falta para
// empatar está dentro. Por eso el aviso de las 150 operaciones va pegado justo
// debajo del número, y por eso el texto dice «es un experimento» antes de nada.
//
// ⚠️ LA COMPARACIÓN VA EN UNIDADES DE RIESGO, NUNCA EN PIPS. La app pone stops
// de ~150 pips y esta regla de ~80: comparar pips premiaría a la de stops más
// grandes sin decir nada de cuál acierta más.
//
// ⚠️ ES SOLO DE SWING. «Comprar la caída» se midió en Intradía y allí pierde
// plano (−0,08 en los tres tamaños): no corre allí y esta tarjeta no existe.

export default function ReglaDestacada({ resumen, filas }) {
  const { t, locale } = useIdioma()
  const c = resumen?.caida
  const vieja = resumen?.caidaVieja
  const lista = Array.isArray(filas) ? filas : []
  // Con la geometría aprobada: las de la vara vieja no cuentan para nada.
  const nuevas = lista.filter((f) => f.vara === 'simetrica')
  const abiertas = nuevas.filter((f) => f.resultado === 'abierta')

  // Sin nada que contar no se pinta: una tarjeta destacada vacía se leería
  // como que la regla está rota.
  if (!c?.total && !abiertas.length && !vieja?.total) return null

  const { filas: comparacion, lider } = compararReglas(resumen.porRiesgo)
  const vaPrimera = lider === 'caida'
  const pr = resumen.porRiesgo?.caida?.porRiesgo
  const dias = mediana(nuevas.filter((f) => f.resultado === 'ganada' || f.resultado === 'perdida').map((f) => f.dias))
  const ultima = nuevas.map((f) => f.cierre || f.vistoEl?.slice(0, 10)).filter(Boolean).sort().at(-1)
  const bt = MEDICION.caida

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        border: '1.5px solid var(--cta)',
        background: 'color-mix(in oklch, var(--cta) 7%, var(--bg-card, transparent))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{t('destacada.titulo')}</span>
        <Pastilla color="var(--amber)">{t('destacada.experimento')}</Pastilla>
        {vaPrimera && (
          <Pastilla relleno color="var(--cta)">
            {t('destacada.vaPrimera')}
          </Pastilla>
        )}
      </div>

      {/* El aviso va ANTES de los números: aquí lo caro no es leer mal un dato,
          es creer que una regla en pruebas es una señal para copiar. */}
      <p style={{ ...TEXTO, margin: 0, color: 'var(--amber)' }}>{t('destacada.aviso')}</p>
      <p style={{ ...TEXTO, margin: 0 }}>{t('destacada.queHace')}</p>
      {vaPrimera && <p style={{ ...TEXTO, margin: 0 }}>{t('destacada.porQuePrimera')}</p>}

      <Etiqueta>{t('destacada.registroReal')}</Etiqueta>
      {c?.total ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
          <Dato valor={`${c.acierto}%`} sub={`±${margen(c.total)}`} etiqueta={t('destacada.acierto')} />
          <Dato valor={c.ganadas} etiqueta={t('destacada.ganadas')} />
          <Dato valor={c.perdidas} etiqueta={t('destacada.perdidas')} />
          <Dato valor={c.total} etiqueta={t('destacada.operaciones')} />
          <Dato
            valor={`${c.pips >= 0 ? '+' : ''}${c.pips}`}
            etiqueta={t('destacada.pips')}
            color={c.pips >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          <Dato
            valor={pr === null || pr === undefined ? '—' : `${pr >= 0 ? '+' : ''}${pr.toFixed(2)}`}
            etiqueta={t('destacada.porRiesgo')}
            color={pr === null || pr === undefined ? undefined : pr >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          <Dato valor="50%" etiqueta={t('destacada.equilibrio')} />
          <Dato valor={abiertas.length} etiqueta={t('destacada.abiertas')} />
          <Dato valor={dias === null ? '—' : dias} etiqueta={t('destacada.dias')} />
        </div>
      ) : (
        <p style={{ ...TEXTO, margin: 0 }}>{t('destacada.sinJuzgar')}</p>
      )}
      <AvisoSombra ops={c?.total ?? 0} />

      {/* LO QUE ESTÁ HACIENDO AHORA: las operaciones abiertas con sus niveles.
          Es lo que Néstor pidió para seguirla en demo a la par que la app. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t('destacada.abiertasTitulo')}</div>
        {abiertas.length ? (
          abiertas.map((f) => <Abierta key={`${f.id}@${f.vistoEl}`} f={f} t={t} locale={locale} />)
        ) : (
          <p style={{ ...TEXTO, margin: 0 }}>{t('destacada.sinAbiertas')}</p>
        )}
        {ultima && (
          <p style={{ ...TEXTO, margin: 0, color: 'var(--text-muted)', fontSize: 11.5 }}>
            {t('destacada.ultima', { fecha: fmtFecha(ultima, locale) })}
          </p>
        )}
      </div>

      {/* CONTRA LAS DEMÁS. Va la tabla entera y no solo la etiqueta de arriba,
          para que «va primera» se pueda comprobar con los números a la vista. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t('destacada.comparaTitulo')}</div>
        {comparacion.map((f) => (
          <div
            key={f.regla}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}
          >
            <span style={{ ...TEXTO, flex: 1, fontWeight: f.regla === 'caida' ? 700 : 400 }}>
              {t('destacada.regla.' + f.regla)}
            </span>
            <span className="mono" dir="ltr" style={{ fontSize: 12.5, textAlign: 'right' }}>
              {f.porRiesgo === null ? (
                '—'
              ) : (
                <strong style={{ color: f.porRiesgo >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {f.porRiesgo >= 0 ? '+' : ''}
                  {f.porRiesgo.toFixed(2)}
                </strong>
              )}{' '}
              <span style={{ color: 'var(--text-muted)' }}>
                · {f.total} {t('destacada.ops')}
              </span>
            </span>
          </div>
        ))}
        {comparacion.some((f) => !f.comparable) && (
          <p style={{ ...TEXTO, margin: 0, color: 'var(--text-muted)', fontSize: 11.5 }}>
            {t('destacada.pocas', { n: MIN_OPS_COMPARAR })}
          </p>
        )}
        <p style={{ ...TEXTO, margin: 0, color: 'var(--text-muted)', fontSize: 11.5 }}>{t('destacada.comparaNota')}</p>
      </div>

      {/* EL BACKTEST, rotulado como tal y con sus DOS números. Mezclarlo con el
          registro real sin decir de cuál es cada número es el error que este
          proyecto lleva meses corrigiendo. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Etiqueta>BACKTEST</Etiqueta>
        <p style={{ ...TEXTO, margin: 0 }}>
          {t('destacada.backtest', {
            ops: bt.operaciones,
            acierto: bt.acierto,
            valor: `${bt.porRiesgo >= 0 ? '+' : ''}${bt.porRiesgo.toFixed(3)}`,
            swap: `${bt.conSwap >= 0 ? '+' : ''}${bt.conSwap.toFixed(3)}`,
            fecha: fmtFecha(MEDICION.fecha, locale),
          })}
        </p>
      </div>

      {vieja?.total > 0 && (
        <p style={{ ...TEXTO, margin: 0, color: 'var(--text-muted)' }}>
          {t('historial.caidaVieja', { n: vieja.total, acierto: vieja.acierto, pips: vieja.pips })}
        </p>
      )}
    </div>
  )
}

function mediana(xs) {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  return v[Math.floor(v.length / 2)]
}

function Abierta({ f, t, locale }) {
  const dec = decimales(f.precio)
  const fmt = (x) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(dec) : '—')
  return (
    <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <span className="mono" dir="ltr" style={{ fontSize: 13, fontWeight: 700 }}>
          {f.par} {t('lado.' + f.lado)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {fmtFecha(f.cierre || f.vistoEl?.slice(0, 10), locale)}
        </span>
      </div>
      {/* Los niveles van en un solo bloque `ltr`: son datos, no frase. En
          árabe, sueltos dentro de una fila `rtl`, se dibujarían al revés. */}
      <div className="mono" dir="ltr" style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3 }}>
        {t('setup.entrada')} {fmt(f.precio)} · SL {fmt(f.sl)} · TP {fmt(f.tp)} · R/B 1:{f.rr}
      </div>
    </div>
  )
}

// Cuántos decimales enseñar: los mismos con los que el vigía anotó el precio
// (5 en la mayoría, 3 en los pares con yen). Se deduce del precio porque la
// línea del historial no guarda `dec`.
function decimales(precio) {
  if (typeof precio !== 'number' || !Number.isFinite(precio)) return 5
  return precio >= 20 ? 3 : 5
}

function Dato({ valor, sub, etiqueta, color }) {
  return (
    <div>
      <div className="mono" dir="ltr" style={{ fontSize: 17, fontWeight: 700, color: color || 'var(--text)' }}>
        {valor}
        {sub && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginInlineStart: 3 }}>{sub}</span>}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{etiqueta}</div>
    </div>
  )
}

function Pastilla({ children, color, relleno }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '.06em',
        padding: '2px 6px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
        border: `1px solid ${color}`,
        color: relleno ? 'var(--cta-tinta)' : color,
        background: relleno ? color : 'transparent',
      }}
    >
      {children}
    </span>
  )
}

function Etiqueta({ children }) {
  return (
    <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-muted)' }}>
      {children}
    </span>
  )
}

const TEXTO = { fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }
