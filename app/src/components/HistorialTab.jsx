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
  const { cargando, error, filas, resumen } = useHistorial()

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

      {!filas.length ? (
        <div className="card">
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
            {t('historial.vacio')}
          </div>
          <p style={{ ...TEXTO, margin: 0 }}>{t('historial.vacioLargo')}</p>
        </div>
      ) : (
        <>
          <Resumen resumen={resumen} t={t} />
          <MedicionLarga t={t} locale={locale} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filas.map((f) => (
              <Fila key={`${f.id}@${f.vistoEl}`} f={f} t={t} locale={locale} />
            ))}
          </div>
        </>
      )}
      {!filas.length && <MedicionLarga t={t} locale={locale} />}
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
          {abierto ? '▾' : '▸'}
        </span>
      </button>

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

          <p style={{ ...TEXTO, margin: 0 }}>{t('medicion.queSignifica')}</p>
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
      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
        {valor}
      </div>
    </div>
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
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)' }}>
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
        <div className="mono" style={{ fontSize: 13.5, fontWeight: 700 }}>
          {f.par} {t('lado.' + f.lado)}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLOR[estado] }}>
          {t('historial.' + estado)}
          {typeof f.pips === 'number' && (
            <span className="mono" style={{ marginInlineStart: 6 }}>
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

const TEXTO = { fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }
