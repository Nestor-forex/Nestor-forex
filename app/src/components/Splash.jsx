import { useMemo } from 'react'

function generarVelas() {
  let p = 50
  const velas = []
  for (let i = 0; i < 26; i++) {
    const d = Math.sin(i * 2.7 + 1) * 14 + Math.sin(i * 0.9) * 8
    const up = d >= 0
    velas.push({
      cuerpo: 10 + Math.abs(d),
      mecha: 4 + Math.abs(Math.sin(i * 1.3)) * 10,
      mechaB: 4 + Math.abs(Math.cos(i * 1.7)) * 10,
      mb: Math.max(0, p + d),
      color: up ? 'oklch(0.62 0.11 155)' : 'oklch(0.55 0.11 25)',
    })
    p = Math.max(6, Math.min(150, p + d))
  }
  return velas
}

export default function Splash({ nombreApp, onEntrar }) {
  const velas = useMemo(generarVelas, [])

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 10px 120px', opacity: 0.55 }}>
        {velas.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: v.mb }}>
            <div style={{ width: 2, height: v.mecha, background: v.color }} />
            <div style={{ width: '100%', height: v.cuerpo, background: v.color, borderRadius: 1 }} />
            <div style={{ width: 2, height: v.mechaB, background: v.color }} />
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, oklch(0.13 0.015 255) 0%, oklch(0.13 0.015 255 / 0.35) 40%, oklch(0.13 0.015 255 / 0.92) 78%, oklch(0.13 0.015 255) 100%)',
        }}
      />
      <div style={{ position: 'relative', padding: '0 28px 56px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="eyebrow">TRADING · FX</div>
        <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.05, fontWeight: 700, letterSpacing: '0.02em' }}>{nombreApp}</h1>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Barrido diario del mercado, diario de operaciones y gestión de riesgo. Acceso solo para miembros autorizados.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 12, minHeight: 52, fontSize: 16 }} onClick={onEntrar}>
          Entrar
        </button>
      </div>
    </div>
  )
}
