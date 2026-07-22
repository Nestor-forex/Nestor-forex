import { useState } from 'react'

export default function Auth({ nombreApp, msg, onRegistrar, onIngresar, onEntrarAdmin }) {
  const [modo, setModo] = useState('login')
  const [logEmail, setLogEmail] = useState('')
  const [logClave, setLogClave] = useState('')
  const [regNombre, setRegNombre] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regClave, setRegClave] = useState('')
  const [pin, setPin] = useState('')

  const tabStyle = (activo) => ({
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${activo ? 'oklch(0.45 0.05 155)' : 'var(--border-strong)'}`,
    background: activo ? 'oklch(0.24 0.03 155)' : 'var(--bg-input)',
    color: 'var(--text)',
  })

  return (
    <div style={{ flex: 1, padding: '48px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div className="eyebrow" style={{ fontSize: 11 }}>
          TRADING · FX
        </div>
        <h1 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 700 }}>{nombreApp}</h1>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={tabStyle(modo === 'login')} onClick={() => setModo('login')}>
          Ingresar
        </button>
        <button style={tabStyle(modo === 'registro')} onClick={() => setModo('registro')}>
          Inscribirse
        </button>
      </div>

      {modo === 'login' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="field" type="email" placeholder="Correo" value={logEmail} onChange={(e) => setLogEmail(e.target.value)} />
          <input className="field" type="password" placeholder="Clave" value={logClave} onChange={(e) => setLogClave(e.target.value)} />
          <button className="btn btn-primary" style={{ minHeight: 50, fontSize: 16 }} onClick={() => onIngresar(logEmail, logClave)}>
            Ingresar
          </button>
        </div>
      )}

      {modo === 'registro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="field" placeholder="Nombre completo" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} />
          <input className="field" type="email" placeholder="Correo" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
          <input className="field" type="password" placeholder="Crea una clave" value={regClave} onChange={(e) => setRegClave(e.target.value)} />
          <button
            className="btn btn-primary"
            style={{ minHeight: 50, fontSize: 16 }}
            onClick={() => {
              onRegistrar(regNombre, regEmail, regClave)
              setRegNombre('')
              setRegEmail('')
              setRegClave('')
              setModo('login')
            }}
          >
            Enviar solicitud
          </button>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Tu solicitud queda pendiente hasta que Néstor la autorice.
          </p>
        </div>
      )}

      {msg && (
        <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid oklch(0.4 0.06 85)', color: 'oklch(0.8 0.1 85)', fontSize: 14, lineHeight: 1.5 }}>
          {msg}
        </div>
      )}

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Acceso del administrador</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" style={{ flex: 1 }} type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button
            className="btn-ghost"
            style={{
              padding: '0 18px',
              border: '1px solid oklch(0.45 0.05 155)',
              background: 'oklch(0.24 0.03 155)',
              color: 'oklch(0.85 0.08 155)',
              fontWeight: 600,
            }}
            onClick={() => onEntrarAdmin(pin)}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  )
}
