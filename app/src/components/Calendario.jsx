import { useState } from 'react'
import { useIdioma } from '../lib/i18n'
import { ALTO, FERIADO, MEDIO, agruparPorDia, estaViejo, horasHasta, masUrgente, proximos } from '../lib/calendario'

// EL CALENDARIO ECONÓMICO.
//
// Contesta una pregunta que la app no sabía contestar: **¿va a pasar algo hoy
// que mueva el precio?** Un barrido perfecto no sirve de nada si hay Fed en
// tres horas y nadie lo sabía.
//
// ⚠️ ES INFORMACIÓN, NO UN FILTRO. No apaga ni una señal, no cambia el stop y
// no toca el objetivo. Si algún día alguien quiere que sí, eso es otra cosa y
// tiene que pasar por el banco de pruebas antes. Ver `lib/calendario.js`.
//
// ─────────────────────────────────────────────────────────────────────────
// TRES DECISIONES DE DISEÑO QUE NO SON ADORNO
// ─────────────────────────────────────────────────────────────────────────
//
// 1. EL AVISO VA EN EL TÍTULO, NO SOLO DENTRO. La tarjeta está plegada, y
//    nadie abre una tarjeta plegada para ver si hay algo que no sabe que hay.
//    Así que el título mismo dice «USD en 3 h» cuando viene algo de alto
//    impacto. Es la idea del número de parejas en el título de la correlación,
//    llevada un paso más allá porque aquí la urgencia es el dato.
//
// 2. LA HORA ES LA DEL TELÉFONO DE QUIEN MIRA. No la de Néstor, ni UTC. Un
//    suscriptor en España y otro en Colombia tienen que ver cada uno su hora
//    para el mismo evento. Un calendario con la hora equivocada es peor que no
//    tener calendario, porque se cree.
//
// 3. EL COLOR VA POR IMPACTO, NO POR DIRECCIÓN. Rojo NO significa «malo para
//    el precio» —el calendario no sabe hacia dónde se va a mover— sino «esto
//    mueve mucho». Es la decisión OPUESTA a la de `SetupDetalle`, donde el
//    color va por lo que significa en plata. Aquí no significa nada en plata:
//    significa cuánto puede saltar.

const COLOR = {
  [ALTO]: 'oklch(0.7 0.16 25)', // rojo: salta mucho
  [MEDIO]: 'var(--amber)',
  [FERIADO]: 'var(--text-muted)', // media sesión: menos liquidez, no un dato
}
const colorDe = (i) => COLOR[i] || 'var(--text-secondary)'

export default function Calendario({ cal, ahora = new Date() }) {
  const { t, locale } = useIdioma()
  const [abierto, setAbierto] = useState(false)

  const eventos = proximos(cal, ahora)

  // Sin nada que enseñar no se pinta NADA — ni el título, ni un «no hay
  // eventos». Misma decisión que en la tarjeta de correlación: un barrido de
  // antes de que esto existiera no puede dejar una tarjeta huérfana que haga
  // pensar que la app está rota.
  if (!eventos.length) return null

  const urgente = masUrgente(eventos)
  const horas = urgente ? horasHasta(urgente, ahora) : null
  const viejo = estaViejo(cal, ahora)

  const hora = (iso) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

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
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span>{t('calendario.titulo', { n: eventos.length })}</span>
          {/* El aviso, visible SIN abrir. Solo aparece si de verdad viene algo
              de alto impacto: si saltara por cualquier cosa, dejaría de
              leerse a la semana. */}
          {urgente && (
            <span style={{ fontSize: 11.5, fontWeight: 500, color: COLOR[ALTO] }}>
              <span dir="ltr">{urgente.c}</span> · {t('calendario.aviso', { h: horas })}
            </span>
          )}
        </span>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('calendario.intro')}
          </p>

          {/* Un archivo viejo se DELATA. Sin esto, un publicador averiado se
              vería igual que una semana tranquila y nadie sabría por qué. Es
              el mismo criterio del aviso «Sin conexión — mostrando el barrido
              guardado del [fecha]» que ya existe. */}
          {viejo && (
            <div
              style={{
                padding: '10px 12px',
                border: '1px solid var(--amber)',
                borderRadius: 6,
                color: 'var(--amber)',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {t('calendario.viejo')}
            </div>
          )}

          {agruparPorDia(eventos, locale).map((grupo) => (
            <div key={grupo.clave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                {grupo.fecha.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>

              {grupo.eventos.map((ev) => (
                <div
                  key={`${ev.d}|${ev.c}|${ev.t}`}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {/* La hora NO lleva `dir` fijo a propósito. La arma
                      `toLocaleTimeString` con el idioma, así que en árabe sale
                      «١٠:١٣ م» con sus propias cifras y su propio marcador de
                      tarde: forzarle `ltr` sería enmendarle la plana al
                      formateador del navegador, que sabe más que nosotros.
                      Solo se fija la dirección de lo que NO es idioma. */}
                  <span
                    className="mono"
                    style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {hora(ev.d)}
                  </span>

                  {/* El código de divisa SÍ va fijo en `ltr`: 'USD' es un
                      código, no una palabra, y en árabe se dibujaría al revés.
                      Es el mismo error que ya mordió tres veces aquí (el
                      gráfico, el clima y la correlación). */}
                  <span
                    className="mono"
                    dir="ltr"
                    style={{ fontSize: 11.5, fontWeight: 700, color: colorDe(ev.i), flexShrink: 0, width: 34 }}
                  >
                    {ev.c}
                  </span>

                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 12.5, lineHeight: 1.4 }}>{ev.t}</span>
                    {/* Pronóstico y anterior solo cuando los hay. La mitad de
                        los eventos no los traen, y una línea vacía debajo de
                        cada uno sería ruido.
                        ⚠️ ESTA LÍNEA MEZCLA PALABRA TRADUCIDA Y NÚMERO, y por
                        eso NO puede llevar `dir` fijo. La primera versión le
                        puso `dir="ltr"` a todo el renglón y en árabe salió
                        roto: el `%` se despegaba del número y «24.5K» se
                        partía en dos, con la «K» en un renglón y el «24.5» en
                        el siguiente. Solo se aísla el VALOR, con `<bdi>`, que
                        es justo lo que hace esa etiqueta: separar un trozo del
                        sentido de lectura de alrededor sin imponerle uno. */}
                    {(ev.f || ev.p) && (
                      <span
                        className="mono"
                        style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}
                      >
                        {ev.f ? <>{t('calendario.previsto')} <bdi>{ev.f}</bdi></> : null}
                        {ev.f && ev.p ? '  ·  ' : ''}
                        {ev.p ? <>{t('calendario.anterior')} <bdi>{ev.p}</bdi></> : null}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}

          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('calendario.pie')}
          </p>
        </div>
      )}
    </div>
  )
}
