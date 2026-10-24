import { useT } from '../lib/i18n'
import TarjetaPlegable from './TarjetaPlegable'
import { CORTE, hayAlgoQueEnsenar, montonesDeHoy } from '../lib/corteDolarCruces'

// LAS SEÑALES DE HOY QUE CAEN EN EL MONTÓN QUE MIDE POSITIVO.
//
// Néstor, 2026-10-23: «quiero ver como señales aparte las señales que dan
// positivo como la que da +0,073 y las otras reglas o mediciones que también
// dan positivo», y «no quites nada y agrega esa otra tabla bien definida e
// identificada».
//
// ⚠️⚠️ VA EN UNA TARJETA PLEGADA, APARTE Y DEBAJO DE LAS TRES SECCIONES DE
// SEÑALES, y la posición es media decisión.
//
// Estas señales ESTÁN YA en pantalla, cada una en la sección de su regla.
// Aquí se repiten agrupadas. Si esta tarjeta fuera lo primero del tablero,
// sería lo que se lee como «lo bueno» y las secciones de arriba pasarían a
// parecer el relleno — o sea que una partición encontrada A POSTERIORI, sobre
// los mismos días con los que se encontró, acabaría mandando sobre lo que la
// app propone de verdad. Plegada, debajo, y con el aviso delante, es lo que
// es: una medición que vale la pena vigilar y que todavía no ha pasado por un
// registro hacia adelante.
//
// ⚠️ NO ES UN FILTRO. No apaga, no reordena y no puntúa ninguna señal. Quitarle
// los cruces a la app cambiaría lo que propone, y eso sería otra decisión
// —con su propio PR— que Néstor dijo expresamente que NO quiere tomar: «yo
// preferiría que no quites nada».
//
// ⚠️ LA TABLA Y LAS SEÑALES VAN JUNTAS. La tabla sola es un número que no se
// puede usar; las señales solas son una recomendación sin letra pequeña.
export default function MidePositivo({ setups = [], setupsReversion = [], setupsBollinger = [] }) {
  const t = useT()

  const grupos = montonesDeHoy({
    tendencia: setups,
    reversion: setupsReversion,
    bollinger: setupsBollinger,
  })

  // Si hoy ninguna de las tres reglas señaló nada, la tarjeta sobra: sería un
  // marco con tres «todavía nada» y una tabla que ya se puede leer en las
  // mediciones.
  if (!hayAlgoQueEnsenar(grupos)) return null

  const total = grupos.reduce((n, g) => n + g.dentro.length, 0)

  return (
    <TarjetaPlegable
      titulo={t('corte.titulo')}
      desc={t('corte.desc')}
      paraQue={t('corte.paraQue')}
      avance={t('corte.avance', { n: total })}
    >
      {/* ⚠️ ANTES DE NINGÚN NÚMERO. Aquí lo caro no es leer mal un dato: es
          creer que esta lista es lo que la app propone, o que el corte está
          confirmado. */}
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--amber)' }}>
        {t('corte.aviso')}
      </p>

      {grupos.map((g) => (
        <Grupo key={g.tipo} g={g} t={t} />
      ))}

      <p style={{ ...TEXTO, margin: 0 }}>
        {t('corte.pieCorrelacion')}
      </p>
      <p style={{ ...TEXTO, margin: 0 }}>
        {t('corte.pieFecha', { fecha: CORTE.fecha, dias: CORTE.dias })}
      </p>
    </TarjetaPlegable>
  )
}

function Grupo({ g, t }) {
  const nombre = ETIQUETA[g.tipo] ? t(ETIQUETA[g.tipo]) : g.tipo
  const monton = t(g.gana === 'dolar' ? 'corte.montonDolar' : 'corte.montonCruces')
  const fallaSenales = g.senalesMes < CORTE.pisoSenalesMes

  return (
    <div style={BLOQUE}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <Etiqueta>{nombre}</Etiqueta>
        <span style={{ fontSize: 12, color: 'var(--text)' }}>{monton}</span>
        {/* ⚠️ SOLO UNA DE LAS TRES PASÓ EL LISTÓN, y si las tres se pintaran
            igual se leerían igual. El sello va aquí arriba, antes que su
            número, por el mismo motivo por el que el aviso va antes que la
            tabla. */}
        <Sello pasa={g.pasaListon}>{t(g.pasaListon ? 'corte.pasa' : 'corte.noPasa')}</Sello>
      </div>

      {!g.pasaListon && (
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--amber)' }}>
          {fallaSenales && t('corte.porQueNoPasa', { n: g.senalesMes, piso: CORTE.pisoSenalesMes })}
          {fallaSenales && g.fallaConcentracion ? ' ' : ''}
          {g.fallaConcentracion && t('corte.yConcentracion')}
        </p>
      )}

      <div className="mono" style={TABLA}>
        <Fila t={t} clave="corte.enSuMonton" v={g.por1R} ops={g.ops} />
        <Fila t={t} clave="corte.conLos14" v={g.base} />
        <Fila t={t} clave="corte.control" v={g.control} />
        <Fila t={t} clave="corte.conSwap" v={g.conSwap} />
        <Fila t={t} clave="corte.mitades" dos={g.mitades} />
      </div>

      {/* Lo que falta es tan informativo como lo que está: sin este número, «la
          app tiene 2 señales hoy en el montón bueno» se lee como si fueran
          todas. */}
      {g.fuera > 0 && (
        <p style={{ ...TEXTO, margin: 0 }}>{t('corte.fuera', { n: g.fuera })}</p>
      )}

      {!g.dentro.length ? (
        <p style={{ ...TEXTO, margin: 0 }}>{t('corte.sinSenales')}</p>
      ) : (
        g.dentro.map((s) => <Senal key={s.name + s.lado} s={s} t={t} />)
      )}
    </div>
  )
}

function Senal({ s, t }) {
  // Los números SIN FORMATEAR salen de `crudo`, igual que en la pantalla de
  // detalle. Los campos de arriba (`s.sl`, `s.rr`…) son texto ya armado con su
  // coletilla de idioma dentro, así que no se pueden volver a formatear aquí.
  const c = s?.crudo || {}

  return (
    <div className="card" style={{ padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* ⚠️ `ltr` fijo: el código de par y BUY/SELL son jerga invariante, no
          idioma. Sin esto, en árabe «EUR/USD BUY» se dibuja al revés — el
          error que ya mordió siete veces en este repositorio. */}
      <span className="mono" dir="ltr" style={{ fontSize: 13.5, fontWeight: 700 }}>
        {s.name} {t('lado.' + s.lado)}
      </span>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {/* Los rótulos se REUSAN de `setup.*`, que ya existen en los 13
            idiomas: inventar claves nuevas para lo mismo las dejaría
            separarse el día que alguien tradujera una y no la otra. */}
        <Nivel t={t} clave="setup.entrada" v={c.precio} />
        <Nivel t={t} clave="setup.stopLoss" v={c.sl} />
        <Nivel t={t} clave="setup.takeProfit" v={c.tp} />
        <Nivel t={t} clave="setup.rb" v={c.rr} rb />
      </div>

      {/* ⚠️ EL AVISO DE R/B BAJO VIAJA CON LA SEÑAL, y salió MIRANDO LA
          CAPTURA: las dos señales de la app aparecían aquí con «1 : 0.56» a
          secas, o sea arriesgando el doble de lo que buscan, mientras en su
          propia sección de arriba sí llevan el «⚠ por debajo de 1:1.5».
          Quien leyera solo esta tarjeta —que es justo la que las presenta como
          «el grupo que mide bien»— no vería el defecto.

          Se usa `rrOk`, que es el MISMO campo que decide el aviso allá arriba,
          y el MISMO texto (`calc_barrido.rbBajo`): dos copias de esta
          condición se separarían sin que fallara nada. Las reglas de vara
          simétrica traen `rrOk: true` a propósito, así que su 1:1 deliberado
          no se marca como defecto. */}
      {s.rrOk === false && (
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: 'var(--amber)' }}>
          {t('calc_barrido.rbBajo').trim()}
        </p>
      )}
    </div>
  )
}

function Nivel({ t, clave, v, rb }) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const texto = rb ? `1 : ${v.toFixed(2)}` : String(Number(v.toFixed(5)))

  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{t(clave)}</div>
      {/* `ltr` fijo: es un número suelto, no una frase traducida. */}
      <div className="mono" dir="ltr" style={{ fontSize: 12.5, fontWeight: 600 }}>
        {texto}
      </div>
    </div>
  )
}

// Una fila de la tabla: su rótulo traducido y su número.
//
// ⚠️ El signo SÍ se pinta de color aquí, al contrario que en `Correlacion.jsx`
// y en el COT, y la diferencia no es un descuido: esto es dinero por unidad de
// riesgo, así que el verde y el rojo dicen exactamente lo que el número dice.
// Allí el color habría AFIRMADO algo que el dato no decía. Misma elección que
// la fila del banco de pruebas de la reversión.
function Fila({ t, clave, v, ops, dos }) {
  const num = (x) =>
    typeof x === 'number' && Number.isFinite(x)
      ? `${x >= 0 ? '+' : ''}${x.toFixed(3)}`
      : null

  const contenido = dos
    ? dos.map(num).filter(Boolean).join(' · ')
    : num(v)

  // Ante la duda no se pinta nada, nunca un 0: un cero diría «no gana ni
  // pierde», que es una afirmación. Misma asimetría que `pearson`.
  if (!contenido) return null

  const color = dos
    ? 'var(--text)'
    : v >= 0
      ? 'var(--green)'
      : 'var(--red)'

  return (
    <>
      <span style={{ color: 'var(--text-muted)' }}>{t(clave)}</span>
      <span dir="ltr">
        <strong style={{ color }}>{contenido}</strong>
        {typeof ops === 'number' ? (
          <span style={{ color: 'var(--text-muted)' }}> · {ops} {t('corte.ops')}</span>
        ) : null}
      </span>
    </>
  )
}

function Sello({ pasa, children }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '.06em',
        padding: '1px 5px',
        borderRadius: 3,
        color: pasa ? 'var(--green)' : 'var(--text-muted)',
        border: `1px solid ${pasa ? 'var(--green)' : 'var(--border)'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function Etiqueta({ children }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '.06em',
        padding: '1px 5px',
        borderRadius: 3,
        color: 'var(--amber)',
        border: '1px solid var(--amber)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

// Las etiquetas se REUSAN de las del Historial, para que la misma regla no
// tenga dos nombres distintos en la misma app. `tendencia` no tiene etiqueta
// allí —son las señales de la app— así que usa el título de su bloque.
const ETIQUETA = {
  tendencia: 'historial.appTitulo',
  reversion: 'historial.esReversion',
  bollinger: 'historial.esBollinger',
}

const BLOQUE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingTop: 12,
  borderTop: '1px solid rgba(255,255,255,.10)',
}

const TABLA = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '6px 12px',
  alignItems: 'baseline',
  fontSize: 12,
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 6,
}

const TEXTO = { fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }
