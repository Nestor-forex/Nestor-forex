import { useMemo } from 'react'

const W = 300
const H = 600
const BASE_Y = 520
const TOP_Y = 60

const TICKER_VALORES = ['70.111', '48.991', '31.010', '1.205', '2.87', '65,10', '20.399', '6.93', '139', '3.011', '11.20', '1.63']

const BOLSAS = [
  { nombre: 'NYSE', abierta: true },
  { nombre: 'NASDAQ', abierta: true },
  { nombre: 'LSE', abierta: false },
  { nombre: 'TSE', abierta: false },
  { nombre: 'SSE', abierta: false },
  { nombre: 'Euronext', abierta: false },
  { nombre: 'HKEX', abierta: true },
]

function generarEscena() {
  const n = 24
  const precios = []
  let p = 50
  for (let i = 0; i < n; i++) {
    const d = Math.sin(i * 2.7 + 1) * 14 + Math.sin(i * 0.9) * 8
    p = Math.max(6, Math.min(150, p + d))
    precios.push(p)
  }
  const min = Math.min(...precios)
  const max = Math.max(...precios)
  const escala = (v) => BASE_Y - ((v - min) / (max - min)) * (BASE_Y - TOP_Y - 40)

  const gap = W / n
  const velas = precios.map((precio, i) => {
    const prev = i === 0 ? precio : precios[i - 1]
    const y1 = escala(precio)
    const y2 = escala(prev)
    const yTop = Math.min(y1, y2)
    const yBot = Math.max(yTop + 8, Math.max(y1, y2))
    const cx = gap * i + gap / 2
    const mecha = Math.abs(Math.sin(i * 1.3)) * 18 + 6
    return {
      x: cx,
      yTop,
      yBot,
      wickTop: yTop - mecha * 0.4,
      wickBot: yBot + mecha * 0.5,
      up: precio >= prev,
      pct: prev ? ((precio - prev) / prev) * 100 : 0,
    }
  })

  const etiquetas = velas
    .filter((_, i) => i % 6 === 3)
    .map((v) => ({
      x: v.x,
      y: v.up ? v.wickTop - 20 : v.wickBot + 28,
      up: v.up,
      texto: `${v.pct >= 0 ? '+' : ''}${v.pct.toFixed(2)}`,
    }))

  const lineaBlanca = precios.map((precio, i) => ({ x: gap * i + gap / 2, y: escala(precio) - 4 }))

  const lineaAmbar = precios.map((_, i, arr) => {
    const desde = Math.max(0, i - 3)
    const ventana = arr.slice(desde, i + 1)
    const prom = ventana.reduce((a, b) => a + b, 0) / ventana.length
    return { x: gap * i + gap / 2, y: escala(prom) - 4 }
  })

  const ticker = []
  const cols = 6
  const rows = 6
  let idx = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitterX = Math.sin(idx * 3.3 + 1) * 14
      const jitterY = Math.cos(idx * 2.1 + 2) * 16
      ticker.push({
        x: (c + 0.5) * (W / cols) + jitterX,
        y: (r + 0.5) * (340 / rows) + jitterY + 10,
        valor: TICKER_VALORES[idx % TICKER_VALORES.length],
      })
      idx++
    }
  }

  return { velas, lineaBlanca, lineaAmbar, ticker, etiquetas }
}

function puntos(pts) {
  return pts.map((p) => `${p.x},${p.y}`).join(' ')
}

export default function Splash({ nombreApp, onEntrar }) {
  const { velas, lineaBlanca, lineaAmbar, ticker, etiquetas } = useMemo(generarEscena, [])

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 15% -5%, oklch(0.3 0.09 175 / 0.4), transparent 45%), ' +
            'radial-gradient(55% 40% at 30% 42%, oklch(0.32 0.11 310 / 0.3), transparent 70%), ' +
            'radial-gradient(120% 100% at 85% 10%, oklch(0.24 0.07 155 / 0.18), transparent 55%), ' +
            'oklch(0.08 0.008 255)',
        }}
      />

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.85 }}
      >
        <g fontFamily="'IBM Plex Mono', monospace" fontSize="11" fill="oklch(0.72 0.05 190)" opacity="0.3">
          {ticker.map((t, i) => (
            <text key={i} x={t.x} y={t.y}>
              {t.valor}
            </text>
          ))}
        </g>

        {velas.map((v, i) => (
          <g key={i}>
            <line
              x1={v.x}
              x2={v.x}
              y1={v.wickTop}
              y2={v.wickBot}
              stroke={v.up ? 'oklch(0.72 0.13 155)' : 'oklch(0.62 0.15 25)'}
              strokeWidth="2"
            />
            <rect
              x={v.x - 4.5}
              y={v.yTop}
              width="9"
              height={Math.max(v.yBot - v.yTop, 6)}
              rx="1.5"
              fill={v.up ? 'oklch(0.72 0.13 155)' : 'oklch(0.62 0.15 25)'}
            />
          </g>
        ))}

        <polyline
          points={puntos(lineaAmbar)}
          fill="none"
          stroke="oklch(0.75 0.13 85)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
        <polyline
          points={puntos(lineaBlanca)}
          fill="none"
          stroke="oklch(0.78 0.11 210)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        {lineaBlanca.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="2.6" fill="oklch(0.78 0.11 210)" opacity="0.9" />
        ))}

        <g fontFamily="'IBM Plex Mono', monospace" fontSize="11" fontWeight="600">
          {etiquetas.map((e, i) => (
            <g key={i} opacity="0.85">
              <circle
                cx={e.x - 26}
                cy={e.y - 4}
                r="2.5"
                fill="none"
                stroke={e.up ? 'oklch(0.72 0.13 155)' : 'oklch(0.62 0.15 25)'}
                strokeWidth="1.5"
              />
              <text x={e.x} y={e.y} textAnchor="middle" fill={e.up ? 'oklch(0.72 0.13 155)' : 'oklch(0.62 0.15 25)'}>
                {e.texto}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, oklch(0.09 0.01 255) 0%, oklch(0.09 0.01 255 / 0.3) 40%, oklch(0.09 0.01 255 / 0.92) 78%, oklch(0.09 0.01 255) 100%)',
        }}
      />

      <div
        className="mono"
        style={{
          position: 'relative',
          margin: '18px 16px 0',
          padding: '13px 18px',
          borderRadius: 18,
          background: 'oklch(0.18 0.02 250 / 0.65)',
          border: '1px solid oklch(0.4 0.03 250 / 0.5)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '7px 16px',
          fontSize: 11.5,
          letterSpacing: '0.04em',
          color: 'var(--text-secondary)',
        }}
      >
        {BOLSAS.map((b) => (
          <span key={b.nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: b.abierta ? 'var(--green)' : 'var(--red)',
              }}
            />
            {b.nombre}
          </span>
        ))}
      </div>

      <div style={{ position: 'relative', padding: '0 28px 56px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.1, fontWeight: 800, letterSpacing: '0.02em' }}>{nombreApp}</h1>
        <button
          className="btn"
          style={{
            marginTop: 4,
            width: '100%',
            minHeight: 54,
            fontSize: 17,
            fontWeight: 700,
            borderRadius: 999,
            border: 'none',
            color: 'oklch(0.18 0.03 200)',
            background: 'linear-gradient(90deg, oklch(0.8 0.12 210), var(--green))',
          }}
          onClick={onEntrar}
        >
          Entrar
        </button>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Accede a tu cuenta</p>
      </div>
    </div>
  )
}
