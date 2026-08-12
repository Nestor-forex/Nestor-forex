import { useState } from 'react'
import { useIdioma } from '../lib/i18n'
import { useMT5Quotes } from '../lib/useMT5Quotes'

// Precios en vivo del bróker, vía el puente de MetaTrader 5.
//
// Arranca apagada a propósito. Son 30 peticiones por minuto: para quien no
// tenga el puente encendido —que hoy es todo el mundo menos el computador
// donde corre MT5— serían 30 fallos por minuto sin ningún beneficio. Se
// enciende cuando se quiere ver, y se apaga sola al salir de la pestaña.
//
// La otra mitad del archivo es explicar el caso de "no conecta", que va a ser
// el más común. Un error a secas dejaría a Néstor sin saber si es culpa del
// puente, del celular o de la app, y aquí la causa casi siempre es la misma y
// tiene explicación: 127.0.0.1 es "este mismo aparato".

export default function CotizacionesVivo() {
  const { t } = useIdioma()
  const [encendido, setEncendido] = useState(false)
  const { quotes, estado, actualizadoEl, base } = useMT5Quotes({ activo: encendido })

  const filas = Object.values(quotes)
  const local = /127\.0\.0\.1|localhost/.test(base)

  return (
    <div className="card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t('vivo.titulo')}</div>
          {encendido && estado === 'ok' && (
            <span className="mono" style={{ fontSize: 11, color: 'var(--green)' }}>
              ● {t('vivo.enVivo')}
            </span>
          )}
        </div>

        <p style={TEXTO}>{t('vivo.desc')}</p>

        {!encendido && (
          <button className="btn btn-primary" onClick={() => setEncendido(true)} style={{ padding: '0 16px' }}>
            {t('vivo.conectar')}
          </button>
        )}

        {encendido && estado === 'conectando' && <p style={TEXTO}>{t('vivo.conectando')}</p>}

        {encendido && estado === 'sin-puente' && (
          <div style={{ padding: 12, border: '1px solid var(--amber)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...TEXTO, color: 'var(--amber)', fontWeight: 600 }}>{t('vivo.sinPuente')}</div>
            <p style={TEXTO}>{t('vivo.sinPuenteQue', { url: base })}</p>
            {local && <p style={TEXTO}>{t('vivo.sinPuenteLocal')}</p>}
          </div>
        )}

        {encendido && estado === 'error' && (
          <div style={{ padding: 12, border: '1px solid oklch(0.62 0.13 25)', borderRadius: 8, color: 'oklch(0.8 0.1 25)', fontSize: 12.5, lineHeight: 1.55 }}>
            {t('vivo.error')}
          </div>
        )}

        {encendido && filas.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '6px 10px', fontSize: 12.5, alignItems: 'center' }}>
              <span style={CABECERA}>{t('vivo.par')}</span>
              <span style={{ ...CABECERA, textAlign: 'right' }}>{t('vivo.bid')}</span>
              <span style={{ ...CABECERA, textAlign: 'right' }}>{t('vivo.ask')}</span>
              <span style={{ ...CABECERA, textAlign: 'right' }}>{t('vivo.spread')}</span>
              {filas.map((q) => (
                <Fila key={q.par} q={q} />
              ))}
            </div>
            <p style={{ ...TEXTO, fontSize: 11.5, color: 'var(--text-muted)' }}>
              {t('vivo.pie')}
              {actualizadoEl ? ` · ${actualizadoEl.toLocaleTimeString()}` : ''}
            </p>
          </>
        )}

        {encendido && (
          <button className="btn-ghost" onClick={() => setEncendido(false)}>
            {t('vivo.desconectar')}
          </button>
        )}
      </div>
    </div>
  )
}

function Fila({ q }) {
  return (
    <>
      <span className="mono" style={{ fontWeight: 600 }}>
        {q.par}
      </span>
      <span className="mono" style={{ textAlign: 'right' }}>
        {q.bid.toFixed(q.dec)}
      </span>
      <span className="mono" style={{ textAlign: 'right' }}>
        {q.ask.toFixed(q.dec)}
      </span>
      {/* El spread se pinta en ámbar cuando pasa de 3 pips: por encima de ahí
          se come una parte seria de un objetivo corto, y conviene verlo antes
          de entrar, no después. */}
      <span className="mono" style={{ textAlign: 'right', color: q.spread > 3 ? 'var(--amber)' : 'var(--text-secondary)' }}>
        {q.spread.toFixed(1)}
      </span>
    </>
  )
}

const TEXTO = {
  margin: 0,
  fontSize: 12.5,
  color: 'var(--text-secondary)',
  lineHeight: 1.55,
}

const CABECERA = {
  fontSize: 10.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
}
