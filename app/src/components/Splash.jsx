import { useMemo } from 'react'

const EXCHANGES = [
  ['NYSE', 13.5, 20], // horas UTC, lun-vie
  ['NASDAQ', 13.5, 20],
  ['LSE', 8, 16.5],
  ['TSE', 0, 6],
  ['SSE', 1.5, 7],
  ['EURONEXT', 7, 15.5],
  ['HKEX', 1.5, 8],
]

function bolsaAbierta(horaUTC, diaUTC, [, ini, fin]) {
  if (diaUTC === 0 || diaUTC === 6) return false
  return horaUTC >= ini && horaUTC < fin
}

// Recorte de la ilustración (globo + velas) dentro de la imagen original
// (1440x2560): solo el arte del medio, sin la fila de bolsas de arriba (esta
// app trae su propia fila con estado en vivo) ni el título/botón de abajo
// (esos se hacen con código real para que "Entrar" funcione de verdad).
const CROP_TOP = 0.075
const CROP_BOTTOM = 0.655
const IMG_ASPECT = 2560 / 1440
const CROP_HEIGHT_FRAC = CROP_BOTTOM - CROP_TOP
const CONTAINER_ASPECT = `1440 / ${Math.round(1440 * IMG_ASPECT * CROP_HEIGHT_FRAC)}`
const IMG_TOP_PCT = -(CROP_TOP / CROP_HEIGHT_FRAC) * 100

export default function Splash({ nombreApp, onEntrar }) {
  const exchangeStatus = useMemo(() => {
    const now = new Date()
    const horaUTC = now.getUTCHours() + now.getUTCMinutes() / 60
    const diaUTC = now.getUTCDay()
    return EXCHANGES.map((e) => ({ nombre: e[0], abierta: bolsaAbierta(horaUTC, diaUTC, e) }))
  }, [])

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#050708' }}>
      <div style={{ padding: '18px 16px 0' }}>
        <div
          className="mono"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px 16px',
            padding: '10px 18px',
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(230,235,245,0.85)',
            border: '1px solid #1c2a30',
            borderRadius: 999,
            background: 'rgba(10,16,18,0.6)',
          }}
        >
          {exchangeStatus.map((e) => (
            <span key={e.nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: e.abierta ? '#39d97a' : '#e5484d',
                  boxShadow: e.abierta ? '0 0 6px #39d97a' : '0 0 6px #e5484d',
                }}
              />
              {e.nombre}
            </span>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', aspectRatio: CONTAINER_ASPECT, overflow: 'hidden' }}>
        <img
          src={`${import.meta.env.BASE_URL}trading_app_ui_v2.png`}
          alt=""
          style={{ position: 'absolute', top: `${IMG_TOP_PCT}%`, left: 0, width: '100%', display: 'block' }}
        />
      </div>

      <div style={{ position: 'relative', padding: '16px 28px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: '0.03em',
            background: 'linear-gradient(120deg, #ffffff 0%, #b7f5ee 45%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {nombreApp}
        </h1>
        <p style={{ margin: 0, fontSize: 14.5, color: '#9fb0ae' }}>
          Barrido diario del mercado, diario de operaciones y gestión de riesgo.
        </p>
        <button
          style={{
            marginTop: 8,
            minHeight: 52,
            fontSize: 16,
            fontWeight: 700,
            width: '100%',
            maxWidth: 320,
            border: 'none',
            borderRadius: 999,
            color: '#04211a',
            background: 'linear-gradient(90deg, #22d3ee, #34d399)',
            cursor: 'pointer',
          }}
          onClick={onEntrar}
        >
          Entrar
        </button>
        <p style={{ margin: 0, fontSize: 12.5, color: '#5f6f6d' }}>Accede a tu cuenta</p>
      </div>
    </div>
  )
}
