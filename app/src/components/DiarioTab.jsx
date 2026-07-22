import { useState } from 'react'
import { PAIR_NAMES } from '../lib/pairs'

export default function DiarioTab({ trades, onGuardar, onBorrar }) {
  const [par, setPar] = useState(PAIR_NAMES[0])
  const [dir, setDir] = useState('Compra')
  const [lote, setLote] = useState('')
  const [pl, setPl] = useState('')
  const [nota, setNota] = useState('')

  const wins = trades.filter((t) => t.pl > 0).length
  const plTot = trades.reduce((a, t) => a + t.pl, 0)
  const statWin = trades.length ? ((wins / trades.length) * 100).toFixed(0) : '—'
  const statPl = (plTot >= 0 ? '+' : '') + plTot.toFixed(0)

  const guardar = () => {
    const loteNum = parseFloat(lote)
    const plNum = parseFloat(pl)
    if (!isFinite(loteNum) || !isFinite(plNum)) return
    onGuardar({ par, dir, lote: loteNum, pl: plNum, nota: nota.trim(), fecha: new Date().toISOString().slice(0, 10) })
    setLote('')
    setPl('')
    setNota('')
  }

  const stat = (valor, label, color) => (
    <div className="card" style={{ textAlign: 'center', padding: 10 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color }}>
        {valor}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Diario de operaciones</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {stat(String(trades.length), 'Operaciones', 'var(--text)')}
        {stat(statWin === '—' ? '—' : statWin + '%', '% ganadas', 'var(--text)')}
        {stat(statPl, 'P/L (USD)', plTot >= 0 ? 'var(--green)' : 'var(--red)')}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select className="field" style={{ minHeight: 46, fontSize: 14 }} value={par} onChange={(e) => setPar(e.target.value)}>
            {PAIR_NAMES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select className="field" style={{ minHeight: 46, fontSize: 14 }} value={dir} onChange={(e) => setDir(e.target.value)}>
            <option>Compra</option>
            <option>Venta</option>
          </select>
          <input
            className="field"
            style={{ minHeight: 46, fontSize: 14 }}
            type="number"
            step="0.01"
            placeholder="Lote (ej. 0.10)"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
          />
          <input
            className="field"
            style={{ minHeight: 46, fontSize: 14 }}
            type="number"
            step="0.01"
            placeholder="Resultado USD (±)"
            value={pl}
            onChange={(e) => setPl(e.target.value)}
          />
        </div>
        <input
          className="field"
          style={{ minHeight: 46, fontSize: 14 }}
          placeholder="Notas (setup, qué aprendiste…)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        <button className="btn btn-primary" onClick={guardar}>
          Guardar operación
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...trades].reverse().map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{t.par}</span>
                <span style={{ color: t.dir === 'Compra' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{t.dir}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {t.lote} lote · {t.fecha}
                </span>
              </div>
              {t.nota && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 3 }}>{t.nota}</div>}
            </div>
            <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: t.pl >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {(t.pl >= 0 ? '+' : '') + t.pl.toFixed(2)}
            </span>
            <button
              onClick={() => onBorrar(trades.length - 1 - i)}
              style={{ minWidth: 44, minHeight: 44, borderRadius: 8, border: '1px solid var(--border-strong)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {trades.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aún no has registrado operaciones.</div>}
    </div>
  )
}
