export default function MiembrosTab({ usuarios, onAprobar, onRetirar }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Miembros</h2>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Aprueba las solicitudes para dar acceso, o retira a cualquiera cuando quieras. La lista vive en este dispositivo.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {usuarios.map((u) => (
          <div key={u.email} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{u.nombre}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                {u.email} · <span style={{ color: u.estado === 'aprobado' ? 'var(--green)' : 'var(--amber)' }}>{u.estado}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              {u.estado === 'pendiente' && (
                <button
                  onClick={() => onAprobar(u.email)}
                  style={{ minHeight: 44, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--green)', color: 'oklch(0.15 0.01 255)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Aprobar
                </button>
              )}
              <button
                onClick={() => onRetirar(u.email, u.nombre)}
                style={{ minHeight: 44, padding: '0 14px', borderRadius: 8, border: '1px solid oklch(0.45 0.08 25)', background: 'none', color: 'oklch(0.7 0.12 25)', fontSize: 13, cursor: 'pointer' }}
              >
                Retirar
              </button>
            </div>
          </div>
        ))}
      </div>

      {usuarios.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin solicitudes todavía. Comparte la app para que se inscriban.</div>}
    </div>
  )
}
