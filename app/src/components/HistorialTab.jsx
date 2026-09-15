import { useState } from 'react'
import { useIdioma } from '../lib/i18n'
import { useHistorial } from '../lib/useHistorial'
import { MEDICION } from '../lib/medicion'
import { fmtFecha } from '../lib/format'

// La pantalla que responde la única pregunta que importa: ¿esto acierta?
//
// Los datos salen de la rama `datos` del repositorio, donde el vigía va
// anotando cada señal y, cuando el precio llega al objetivo o al stop, cómo
// terminó. Ver `lib/useHistorial.js`.

const COLOR = {
  ganada: 'var(--green)',
  perdida: 'var(--red)',
  abierta: 'var(--text-muted)',
  caducada: 'var(--text-muted)',
}

export default function HistorialTab() {
  const { t, locale } = useIdioma()
  const { cargando, error, filas, filasReversion, filasTodas, resumen } = useHistorial()

  if (cargando) return <Aviso>{t('historial.cargando')}</Aviso>
  if (error) return <Aviso ambar>{t('historial.error')}</Aviso>

  return (
    <>
      <div>
        <h2 className="section-title" style={{ marginBottom: 4 }}>
          {t('historial.titulo')}
        </h2>
        <p style={{ ...TEXTO, margin: 0 }}>{t('historial.intro')}</p>
      </div>

      {!filasTodas.length ? (
        <div className="card">
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
            {t('historial.vacio')}
          </div>
          <p style={{ ...TEXTO, margin: 0 }}>{t('historial.vacioLargo')}</p>
        </div>
      ) : (
        <>
          {/* ⚠️ LOS NÚMEROS VAN POR REGLA, Y ESO NO SE MEZCLA NUNCA.
              Las filas sí se juntan abajo —Néstor quiere leer la historia
              seguida— pero cada porcentaje tiene que seguir respondiendo SU
              pregunta. Un promedio de las dos reglas no responde ninguna: la
              app acierta más y pierde, la reversión acierta menos y gana; el
              punto medio no describe a ninguna de las dos. */}
          {/* ⚠️ ESTE BLOQUE NECESITA SU PROPIO TÍTULO, y el motivo está medido.
              Los otros dos experimentos sí lo llevaban, así que el primero se
              leía como «el total de todo» cuando en realidad cuenta SOLO las
              señales que la app propuso: deja fuera las dos reglas de sombra y
              las ventas pausadas. El 2026-09-15, un operador externo leyendo
              esta pantalla confundió el número con otra cosa — y confundirlo
              es gratis mientras el bloque no diga de quién es. */}
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t('historial.appTitulo')}</div>
          <Resumen resumen={resumen} t={t} />

          {resumen.reversion.total > 0 && (
            <div style={{ ...BLOQUE_EXPERIMENTO }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t('historial.reversionTitulo')}</span>
                <Etiqueta>{t('historial.esReversion')}</Etiqueta>
              </div>
              <Resumen resumen={{ todas: resumen.reversion }} t={t} />
              <p style={{ ...TEXTO, margin: 0 }}>{t('historial.reversionIntro')}</p>
            </div>
          )}

          {/* La tercera regla, desde el 2026-09-07. Su bloque es idéntico al de
              la reversión y eso es a propósito: son dos experimentos con el
              mismo estatus, y darle a uno más presencia que al otro sería
              sugerir que uno vale más antes de que ninguno haya demostrado
              nada. Aparece solo cuando tiene algo resuelto que enseñar. */}
          {resumen.caida.total > 0 && (
            <div style={{ ...BLOQUE_EXPERIMENTO }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t('historial.caidaTitulo')}</span>
                <Etiqueta>{t('historial.esCaida')}</Etiqueta>
              </div>
              <Resumen resumen={{ todas: resumen.caida }} t={t} />
              <p style={{ ...TEXTO, margin: 0 }}>{t('historial.caidaIntro')}</p>
            </div>
          )}

          <MedicionLarga t={t} locale={locale} />

          {/* Una sola lista, en orden de fecha. Cada reversión lleva su
              etiqueta: sin ella, dos reglas OPUESTAS se leerían como si fueran
              lo mismo, que es el único error grave posible en esta pantalla. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filasTodas.map((f) => (
              <Fila key={`${f.id}@${f.vistoEl}`} f={f} t={t} locale={locale} />
            ))}
          </div>

          {/* ⚠️⚠️ ESTE PIE NO ES UN ADORNO LEGAL: dice por dónde cojea el
              número que se acaba de leer, y cojea por los DOS lados.

              · OPTIMISTA en los costes. Los pips salen del objetivo y el stop
                que puso la app (`resolver.mjs`: «pips: ganada ? pipBeneficio :
                −pipRiesgo»), sin restar spread ni swap. En una cuenta real eso
                pesa: en el informe de Néstor del 2026-09-14 hay una sola
                operación con −23 dólares SOLO de swap.
              · PESIMISTA en el orden. Si un mismo día se toca el stop y el
                objetivo se cuenta como PERDIDA, porque la vela diaria no
                guarda cuál pasó primero.

              Enseñar el porcentaje sin decir estas dos cosas sería justo lo
              que esta app dice no hacer. Va DESPUÉS de los números y no antes
              —al revés que en la actividad o en las tasas— porque aquí no es
              una advertencia sobre cómo leer el dato: es la letra pequeña de
              cómo está calculado, y delante de la tabla estorbaría sin que
              nadie supiera todavía de qué habla. */}
          <p style={{ ...TEXTO, margin: 0 }}>{t('historial.pie')}</p>
        </>
      )}
      {!filasTodas.length && <MedicionLarga t={t} locale={locale} />}
    </>
  )
}

// Lo medido sobre cinco años, dentro de la app.
//
// Va colapsado porque no es lo que se mira todos los días, pero va SIEMPRE —
// también cuando el historial está vacío, que es justo cuando alguien nuevo
// necesita saber sobre qué se apoya lo que está leyendo.
//
// ⚠️ EL ORDEN DE LAS DOS FILAS ES DELIBERADO. Primero el 55% de acierto y
// después el «por cada dólar arriesgado, se pierden 3 centavos». Puesto al
// revés, el acierto se lee como la conclusión y es exactamente el número con
// el que se engaña la gente en este sector: con el objetivo más cerca que el
// stop se acierta mucho y se pierde igual.
function MedicionLarga({ t, locale }) {
  const [abierto, setAbierto] = useState(false)
  const { app, neutra, reversion } = MEDICION

  const signo = (x) => (x >= 0 ? '+' : '') + x.toFixed(2)
  const color = (x) => (x >= 0 ? 'var(--green)' : 'var(--red)')

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: 'none',
          border: 'none',
          padding: 0,
          minHeight: 32,
          cursor: 'pointer',
          color: 'var(--text)',
          fontSize: 13.5,
          fontWeight: 600,
          textAlign: 'start',
        }}
      >
        <span>{t('medicion.titulo')}</span>
        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {abierto ? '▲' : '▼'}
        </span>
      </button>

      {/* ⚠️ EL ADELANTO, VISIBLE CON LA TARJETA CERRADA. Este es el mejor
          argumento que tiene la app —enseñar el propio número siendo malo— y
          estaba escondido detrás de un título que parecía un encabezado más.
          Un operador externo que revisó la app con lupa el 2026-09-15 ni
          siquiera supo que se podía abrir.

          Los dos números SALEN de `MEDICION`, no escritos a mano: `queSignifica`
          llevaba «55 %» a mano y llevaba desde el 2026-09-05 diciendo un número
          que no era el de ninguna de las dos filas. El código que usa el valor
          se actualiza solo; el texto que lo describe, no — salvo que lo lea. */}
      {/* ⚠️ EL NÚMERO VA SIN SIGNO Y LA FRASE SOLO SALE SI SE PIERDE, y las dos
          cosas son el mismo arreglo. La frase dice «pierde», así que pasarle el
          valor con su signo daba «pierde −0.03» — un doble negativo que se lee
          como lo contrario de lo que pasa. Eso no lo ve un build: salió al
          mirarlo en el navegador.

          Y si algún día la app midiera POSITIVO, esta frase diría algo falso,
          así que entonces no se pinta. Equivocarse hacia «no se enseña un
          adelanto» cuesta un adelanto; hacia «se afirma que pierde cuando gana»
          cuesta la credibilidad, que es lo único que este proyecto vende. Los
          dos errores no valen lo mismo, así que la condición no es simétrica —
          misma forma que `esSombra` y `yaCorrioHoy`. */}
      {!abierto && app.porRiesgo < 0 && (
        <p style={{ ...TEXTO, margin: 0 }}>
          {t('medicion.avance', {
            acierto: app.acierto,
            valor: Math.abs(app.porRiesgo).toFixed(2),
          })}
        </p>
      )}

      {abierto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ ...TEXTO, margin: 0 }}>
            {t('medicion.intro', {
              dias: MEDICION.dias,
              desde: fmtFecha(MEDICION.desde, locale),
              hasta: fmtFecha(MEDICION.hasta, locale),
            })}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Linea
              t={t}
              nombre={t('medicion.laApp')}
              ops={app.operaciones}
              acierto={app.acierto}
              valor={signo(app.porRiesgo)}
              color={color(app.porRiesgo)}
            />
            <Linea
              t={t}
              nombre={t('medicion.varaNeutra')}
              ops={neutra.operaciones}
              acierto={neutra.acierto}
              valor={signo(neutra.porRiesgo)}
              color={color(neutra.porRiesgo)}
            />
            <Linea
              t={t}
              nombre={t('medicion.reversion')}
              ops={reversion.operaciones}
              acierto={reversion.acierto}
              valor={signo(reversion.porRiesgo)}
              color={color(reversion.porRiesgo)}
            />
          </div>

          {/* Lee el acierto de MEDICION en vez de llevarlo escrito. Ver el
              comentario del adelanto, arriba: así lo hacen `hoySi` y las
              etiquetas «(hoy)» del banco de pruebas, por la misma razón. */}
          <p style={{ ...TEXTO, margin: 0 }}>
            {t('medicion.queSignifica', { acierto: app.acierto })}
          </p>
          <p style={{ ...TEXTO, margin: 0 }}>{t('medicion.porQueLoContamos')}</p>
          <p style={{ ...TEXTO, margin: 0, color: 'var(--text-muted)', fontSize: 11.5 }}>
            {t('medicion.fechado', { fecha: fmtFecha(MEDICION.fecha, locale) })}
          </p>
        </div>
      )}
    </div>
  )
}

function Linea({ t, nombre, ops, acierto, valor, color }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 10,
        paddingBottom: 6,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{nombre}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {t('medicion.pieLinea', { ops, acierto })}
        </div>
      </div>
      <div className="mono" dir="ltr" style={{ fontSize: 15, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
        {valor}
      </div>
    </div>
  )
}

// La marca que distingue una reversión de una señal normal. Vive aparte
// porque la usan dos sitios —el encabezado del resumen y cada fila— y si se
// escribiera dos veces, un día dirían cosas distintas.
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

function Resumen({ resumen, t }) {
  const { todas } = resumen

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, textAlign: 'center' }}>
        <Dato
          valor={todas.acierto === null ? '—' : `${todas.acierto}%`}
          etiqueta={t('historial.acierto')}
        />
        <Dato valor={todas.total || '—'} etiqueta={t('historial.operaciones')} />
        <Dato
          valor={todas.total ? `${todas.pips >= 0 ? '+' : ''}${todas.pips}` : '—'}
          etiqueta={t('historial.pips')}
          color={todas.total ? (todas.pips >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
        />
      </div>

      {!todas.total && <p style={{ ...TEXTO, margin: 0 }}>{t('historial.sinJuzgar')}</p>}

    </div>
  )
}

function Dato({ valor, etiqueta, color }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="mono" dir="ltr" style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)' }}>
        {valor}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{etiqueta}</div>
    </div>
  )
}

function Fila({ f, t, locale }) {
  const estado = f.resultado
  const fecha = new Date(f.vistoEl).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {/* ⚠️ `ltr` fijo: el código de par y BUY/SELL son jerga invariante,
              no idioma. Sin esto, en árabe «EUR/USD BUY» se lee al revés. */}
          <span className="mono" dir="ltr" style={{ fontSize: 13.5, fontWeight: 700 }}>
            {f.par} {t('lado.' + f.lado)}
          </span>
          {/* Solo las reversiones se marcan. Las normales se quedan como
              estaban: son la mayoría y lo excepcional es lo que hay que
              señalar, no al revés. */}
          {f.tipo === 'reversion' && <Etiqueta>{t('historial.esReversion')}</Etiqueta>}
          {f.tipo === 'caida' && <Etiqueta>{t('historial.esCaida')}</Etiqueta>}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLOR[estado] }}>
          {t('historial.' + estado)}
          {typeof f.pips === 'number' && (
            <span className="mono" dir="ltr" style={{ marginInlineStart: 6 }}>
              {f.pips >= 0 ? '+' : ''}
              {f.pips}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
        {fecha} · R/B 1:{f.rr}
      </div>
    </div>
  )
}

function Aviso({ children, ambar }) {
  return (
    <div className="card" style={ambar ? { borderColor: 'var(--amber)' } : undefined}>
      <p style={{ ...TEXTO, margin: 0 }}>{children}</p>
    </div>
  )
}

// ⚠️ LA RAYA DE ARRIBA NO ES DECORACIÓN. Con tres bloques de porcentajes
// seguidos —la app, la reversión y «comprar la caída»— y sin nada que los
// separe, los números se leen como una lista corrida y deja de verse de quién
// es cada uno. Confundir el acierto de una regla con el de otra es el único
// error grave que puede cometer esta pantalla: son reglas OPUESTAS.
//
// Se vio al revisarla en un navegador de verdad; compilando no se ve.
const BLOQUE_EXPERIMENTO = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  paddingTop: 14,
  borderTop: '1px solid rgba(255,255,255,.10)',
}

const TEXTO = { fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }
