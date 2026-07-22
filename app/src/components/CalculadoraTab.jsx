import { useState } from 'react'
import { PAIR_NAMES } from '../lib/pairs'
import { tasasFake } from '../lib/fakeData'
import { calcularLote } from '../lib/calc'

export default function CalculadoraTab() {
  const [capital, setCapital] = useState('')
  const [riesgo, setRiesgo] = useState('')
  const [pips, setPips] = useState('')
  const [par, setPar] = useState(PAIR_NAMES[0])

  const r = calcularLote({
    capital: parseFloat(capital),
    riesgoPct: parseFloat(riesgo),
    pips: parseFloat(pips),
    par,
    tasas: tasasFake,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Calculadora de lote y riesgo</h2>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          className="field"
          type="number"
          placeholder="Capital de la cuenta (USD)"
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="field" type="number" step="0.5" placeholder="Riesgo % (1-2)" value={riesgo} onChange={(e) => setRiesgo(e.target.value)} />
          <input className="field" type="number" placeholder="Stop en pips" value={pips} onChange={(e) => setPips(e.target.value)} />
        </div>
        <select className="field" value={par} onChange={(e) => setPar(e.target.value)}>
          {PAIR_NAMES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="card mono" style={{ borderColor: 'oklch(0.32 0.05 155)', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 14 }}>
        <span style={{ color: 'var(--text-muted)' }}>Riesgo USD</span>
        <span>{r.ok ? '$' + r.riesgoUsd.toFixed(2) : '—'}</span>
        <span style={{ color: 'var(--text-muted)' }}>Valor del pip</span>
        <span>{r.pip ? '$' + r.pip.toFixed(2) + ' / lote' : '—'}</span>
        <span style={{ color: 'var(--text-muted)' }}>Lote sugerido</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{r.ok ? r.lote.toFixed(2) + ' lotes' : 'Completa los campos'}</span>
        <span style={{ color: 'var(--text-muted)' }}>Equivale a</span>
        <span style={{ color: 'var(--text-secondary)' }}>{r.ok ? `${r.mini.toFixed(1)} mini · ${r.micro.toFixed(0)} micro` : '—'}</span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Valor del pip calculado con una tasa de cambio de ejemplo (aún no conectada al mercado real), por lote estándar (100.000
        unidades). Verifica el valor exacto con tu bróker: el spread y el apalancamiento cambian el resultado real.
      </p>
    </div>
  )
}
