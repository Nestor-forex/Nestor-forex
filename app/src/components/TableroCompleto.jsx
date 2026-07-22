import { Fragment, useMemo } from 'react'
import { monedas, pares, compras, ventas, vigilancia, setups, corteFake, limitaciones } from '../lib/fakeData'
import { sesgoColor, tendColor, rsiColor, fmtDif } from '../lib/display'
import { fmtFechaHoy, sesionActiva } from '../lib/format'
import { generarReporteMd, descargarMd } from '../lib/reporte'
import BarraFuerza from './BarraFuerza'

function Chip({ children, color }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 4,
        color: 'oklch(0.15 0.01 255)',
        background: color,
      }}
    >
      {children}
    </span>
  )
}

function RazonList({ items, emptyText }) {
  if (!items.length) {
    return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{emptyText}</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it) => (
        <div key={it.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="mono" style={{ fontWeight: 600 }}>
            {it.name}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{it.razon}</span>
        </div>
      ))}
    </div>
  )
}

export default function TableroCompleto({ onVolver }) {
  const fecha = useMemo(fmtFechaHoy, [])
  const sesion = useMemo(sesionActiva, [])

  const descargar = () => {
    const md = generarReporteMd({ fecha, sesion, corte: corteFake, monedas, pares, compras, ventas, vigilancia, setups, limitaciones })
    descargarMd(md, `reporte-forex-${new Date().toISOString().slice(0, 10)}.md`)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button onClick={onVolver} className="btn-ghost" style={{ padding: '0 12px', minHeight: 36, fontSize: 13, flexShrink: 0 }}>
          ← Volver
        </button>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Barrido diario · Forex
        </div>
      </header>

      <main style={{ flex: 1, padding: '20px 18px 48px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <section>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>{fecha}</h1>
          <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div>
              Sesión activa: <span style={{ color: 'var(--text)' }}>{sesion}</span>
            </div>
            <div>{corteFake}</div>
          </div>
        </section>

        <section>
          <h2 className="section-title">Fuerza relativa por divisa</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {monedas.map((m) => (
              <BarraFuerza key={m.cod} cod={m.cod} score={m.score} />
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Promedio ponderado del cambio % de cada divisa contra las otras 7 (1d 20%, 5d 40%, 20d 40%), reescalado 0-10.
          </p>
        </section>

        <section>
          <h2 className="section-title">Pares — sesgo, tendencia y filtros</h2>
          <div style={{ overflowX: 'auto' }}>
            <div
              className="mono"
              style={{
                display: 'grid',
                gridTemplateColumns: '78px 60px 44px 64px 36px 46px',
                gap: '6px 10px',
                fontSize: 12,
                alignItems: 'center',
                minWidth: 340,
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>PAR</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>SESGO</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>DIF</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>TENDENCIA</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>RSI</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>ATR%*</span>
              {pares.map((p) => (
                <Fragment key={p.name}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: sesgoColor(p.sesgo), fontWeight: 600 }}>{p.sesgo}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{fmtDif(p.dif)}</span>
                  <span style={{ color: tendColor(p.tend) }}>{p.tend}</span>
                  <span style={{ color: rsiColor(p.rsi) }}>{p.rsi}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{p.atr.toFixed(2)}</span>
                </Fragment>
              ))}
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            * Volatilidad proxy cierre-a-cierre (tasas de referencia diarias, sin máximos/mínimos intradía).
          </p>
        </section>

        <section className="card" style={{ borderColor: 'oklch(0.32 0.05 155)' }}>
          <h2 className="section-title" style={{ color: 'var(--green)', marginBottom: 12 }}>
            Mejores para comprar
          </h2>
          <RazonList items={compras} emptyText="Hoy no hay compras con fuerza y tendencia alineadas — no forzar entradas." />
        </section>

        <section className="card" style={{ borderColor: 'oklch(0.35 0.06 25)' }}>
          <h2 className="section-title" style={{ color: 'var(--red)', marginBottom: 12 }}>
            Mejores para vender
          </h2>
          <RazonList items={ventas} emptyText="Hoy no hay ventas con fuerza y tendencia alineadas — no forzar entradas." />
        </section>

        {vigilancia.length > 0 && (
          <section className="card" style={{ borderColor: 'oklch(0.4 0.06 85)' }}>
            <h2 className="section-title" style={{ color: 'var(--amber)', marginBottom: 12 }}>
              En vigilancia
            </h2>
            <RazonList items={vigilancia} emptyText="" />
          </section>
        )}

        <section>
          <h2 className="section-title">Setups del top</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {setups.map((s) => (
              <div key={s.name + s.lado} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 16 }}>
                    {s.name}
                  </span>
                  <Chip color={s.lado === 'COMPRA' ? 'var(--green)' : 'var(--red)'}>{s.lado}</Chip>
                </div>
                <div className="mono" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Soporte</span>
                  <span>{s.sup}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Resistencia</span>
                  <span>{s.res}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Entrada</span>
                  <span>{s.entrada}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Stop-loss</span>
                  <span>{s.sl}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Take-profit</span>
                  <span>{s.tp}</span>
                  <span style={{ color: 'var(--text-muted)' }}>R/B</span>
                  <span style={{ color: s.rrOk ? 'var(--green)' : 'var(--amber)' }}>{s.rr}</span>
                </div>
                <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Invalida: {s.inval}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <strong style={{ color: 'var(--text)' }}>Riesgo:</strong> 1-2% del capital por operación. Varias posiciones en la misma
              divisa no son operaciones independientes — son una sola apuesta con más tamaño.
            </div>
            <div>
              <strong style={{ color: 'var(--text)' }}>Limitaciones:</strong> {limitaciones}
            </div>
            <div>Análisis educativo, no asesoría financiera personalizada. Operar Forex conlleva riesgo de pérdida.</div>
          </div>
          <button
            onClick={descargar}
            className="mono"
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '10px 18px',
              borderRadius: 6,
              border: '1px solid oklch(0.45 0.05 155)',
              background: 'oklch(0.24 0.03 155)',
              color: 'oklch(0.85 0.08 155)',
              cursor: 'pointer',
            }}
          >
            ↓ Descargar reporte .md
          </button>
        </section>
      </main>
    </div>
  )
}
