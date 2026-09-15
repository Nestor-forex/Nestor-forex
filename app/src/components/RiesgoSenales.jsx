import { useT } from '../lib/i18n'

// LAS SEÑALES DE HOY QUE SON LA MISMA APUESTA.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ EXISTE, Y POR QUÉ NO LA CUBRÍA YA LA TARJETA DE CORRELACIÓN
// ─────────────────────────────────────────────────────────────────────────
// Un operador con experiencia probó la app (2026-09-15) y el único hueco real
// que encontró fue éste: «no hay un chequeo de correlación entre las señales
// simultáneas como el que armé yo a mano hoy». Tenía razón, y el dato ya
// estaba calculado y publicado desde el 2026-09-08 — la app lo tenía y no se
// lo ponía delante.
//
// Lo que había NO servía para esto, y son tres cosas distintas:
//
//   · La tarjeta de Correlación enseña el MAPA del mercado: las 91 parejas
//     posibles, plegada, sin saber qué señala la app hoy.
//   · El aviso del Diario mira si dos operaciones ABIERTAS comparten una
//     divisa. Es una regla de dedo y se le escapa el caso clásico —AUD/USD y
//     NZD/USD no comparten ninguna y se mueven casi igual—, y además llega
//     cuando la operación ya está abierta.
//   · Esto mira las señales de HOY, antes de abrir nada, y con la DIRECCIÓN
//     delante.
//
// ⚠️ LA DIRECCIÓN ES LA MITAD DEL ASUNTO. «EUR/USD y USD/CHF van a −0,83» es
// verdad y no dice nada por sí solo: si la app dice comprar los dos, se anulan;
// si dice comprar uno y vender el otro, es una sola apuesta del doble. El
// cálculo está en `riesgoEntreSenales` y ahí está la tabla de los cuatro casos.
//
// ⚠️ ES INFORMACIÓN, NO UN FILTRO. No apaga ninguna señal, no las reordena y
// no las puntúa. Apagar señales por correlación cambiaría lo que la app
// propone y tendría que pasar por el banco de pruebas con su listón escrito
// antes, igual que el COT. Aquí solo se enseña un número que ya existía.
export default function RiesgoSenales({ riesgo = [] }) {
  const t = useT()

  // ⚠️ SIN NADA QUE DECIR NO SE PINTA NADA — ni el título, ni un «hoy no hay
  // parejas». Y aquí eso importa más que en las otras tarjetas: lo normal es
  // que NO haya conflicto, así que una tarjeta permanente diciendo «todo bien»
  // se volvería parte del decorado y dejaría de leerse justo el día que sí
  // tenga algo. Que aparezca sea la señal.
  //
  // Un barrido viejo sin `correl` llega aquí como lista vacía y desaparece
  // solo, igual que la tarjeta de correlación.
  if (!riesgo.length) return null

  return (
    <div
      className="card"
      style={{
        // Ámbar, como el aviso de riesgo correlacionado del Diario: es la
        // misma familia de aviso y conviene que se reconozcan entre sí.
        // El ámbar aquí afirma «mira esto antes de abrir», no «esto es malo»
        // — la app no sabe si la operación va a salir bien.
        borderColor: 'var(--amber)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>
        {t('riesgoSenales.titulo', { n: riesgo.length })}
      </div>

      <p style={{ ...TEXTO, margin: 0 }}>{t('riesgoSenales.intro')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {riesgo.map(({ a, ladoA, b, ladoB, efectivo, mismaApuesta }) => (
          <div
            key={`${a}${ladoA}|${b}${ladoB}`}
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
              {/* ⚠️ `dir="ltr"` fijo. Par y COMPRA/VENTA son jerga invariante,
                  no idioma: en árabe «EUR/USD BUY» se dibujaría al revés. Es
                  el error que ya mordió seis veces en este repositorio. */}
              <div className="mono" dir="ltr" style={{ fontSize: 12.5, fontWeight: 700 }}>
                {a} {t('lado.' + ladoA)} · {b} {t('lado.' + ladoB)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {mismaApuesta ? t('riesgoSenales.dobla') : t('riesgoSenales.anula')}
              </div>
            </div>

            {/* El número NO se pinta de verde ni de rojo, misma decisión que en
                `Correlacion.jsx`: ninguno de los dos casos es «bueno» —doblar
                el riesgo y pagar dos spreads para nada son los dos malos de
                maneras distintas— y el color afirmaría lo contrario. */}
            <div
              className="mono"
              dir="ltr"
              style={{
                fontSize: 15,
                fontWeight: 700,
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {efectivo > 0 ? '+' : '−'}
              {Math.abs(efectivo).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <p style={{ ...TEXTO, margin: 0, color: 'var(--text-muted)', fontSize: 11.5 }}>
        {t('riesgoSenales.pie')}
      </p>
    </div>
  )
}

const TEXTO = { fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }
