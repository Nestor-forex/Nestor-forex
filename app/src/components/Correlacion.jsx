import { useState } from 'react'
import { useT } from '../lib/i18n'

// PARES QUE SE MUEVEN JUNTOS.
//
// Contesta una sola pregunta, y es de riesgo, no de dirección: «si abro estos
// dos a la vez, ¿son dos apuestas o una del doble de tamaño?».
//
// ⚠️ DOS DECISIONES DE DISEÑO QUE NO SON ADORNO:
//
// 1. NO ES UNA MATRIZ. Con 14 pares serían 91 casillas, ilegibles en un
//    teléfono y sin ninguna jerarquía: el que va a 0,02 ocuparía lo mismo que
//    el que va a 0,95. Se enseña la LISTA de los que pasan el umbral, ordenada
//    por tamaño, que es exactamente lo que hay que mirar antes de abrir dos.
//
// 2. LAS NEGATIVAS SE ENSEÑAN IGUAL DE GRANDES, y con su propia etiqueta. Dos
//    pares a −0,9 abren y cierran la misma apuesta: se pagan los dos spreads
//    para quedar en nada. Pintarlas más pequeñas por «ser negativas» sería
//    esconder la mitad del riesgo.
//
// Va plegada por defecto, como el glosario: es contexto, no lo primero que se
// mira al abrir el tablero.
export default function Correlacion({ correlaciones = [] }) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)

  // Sin datos no se pinta NADA — ni un título ni un «no hay nada». Un barrido
  // viejo, de antes de que esto existiera, no trae `correl`, y una tarjeta
  // vacía haría pensar que la app está rota. Ver el comentario de
  // `derivarVista` sobre por qué aquí la ausencia no revienta.
  if (!correlaciones.length) return null

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          background: 'none',
          border: 'none',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: 13.5,
          fontWeight: 600,
          minHeight: 44,
          textAlign: 'left',
        }}
      >
        <span>{t('correl.titulo', { n: correlaciones.length })}</span>
        <span style={{ color: 'var(--text-muted)' }}>{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('correl.intro')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {correlaciones.map(({ a, b, r, juntos }) => (
              <div
                key={`${a}|${b}`}
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
                  {/* `dir="ltr"` fijo: los nombres de par son códigos, y en
                      árabe se dibujarían al revés. Mismo error que ya pasó con
                      el gráfico y con el clima. */}
                  <div className="mono" dir="ltr" style={{ fontSize: 12.5, fontWeight: 700 }}>
                    {a} · {b}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {juntos ? t('correl.juntos') : t('correl.opuestos')}
                  </div>
                </div>
                {/* El número entero, con su signo. No se pinta de verde ni de
                    rojo a propósito: aquí ninguno de los dos lados es «bueno»
                    —los dos son el mismo riesgo— y el color sugeriría lo
                    contrario. */}
                <div
                  className="mono"
                  dir="ltr"
                  style={{ fontSize: 15, fontWeight: 700, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                >
                  {r > 0 ? '+' : '−'}
                  {Math.abs(r).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('correl.pie')}
          </p>
        </div>
      )}
    </div>
  )
}
