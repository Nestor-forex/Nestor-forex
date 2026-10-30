import { useT } from '../lib/i18n'
import TarjetaPlegable from './TarjetaPlegable'
import { TOPE_BARRA_COMPRESION } from '../lib/marketCalc'

// ¿ESTÁ EL PAR APRETADO O SUELTO? Y los niveles del último movimiento.
//
// ─────────────────────────────────────────────────────────────────────────
// POR QUÉ EXISTE Y QUÉ ENTRÓ DE LO QUE NÉSTOR PIDIÓ
// ─────────────────────────────────────────────────────────────────────────
// Pidió «patrones de gráfico (triángulos, canales, cuñas, Fibonacci)». De esa
// lista entra lo que se puede MEDIR sin ponerle nombre a un dibujo, y el
// motivo de lo que queda fuera está medido en este mismo proyecto: el NFX-LSS
// ES reconocimiento de patrones y midió −0,08 en velas diarias, −0,14 en H1 y
// −0,16 en M15; y su barrido de liquidez marcó las señales PEORES, no las
// mejores. Un nombre como «triángulo ascendente» lleva además la dirección
// DENTRO, que es el error del código de divisa en rojo del calendario.
//
// ⚠️⚠️ POR QUÉ LA COMPRESIÓN IMPORTA DE VERDAD, Y NO ES UN ADORNO: el stop de
// esta app sale del ATR (`lo10 − 0,5 × ATR`). Un par con el movimiento
// estrechado tiene el ATR bajo, así que el stop sale MÁS CORTO de lo normal
// para ese par — y el coste de entrar, que es fijo en pips, pesa más sobre un
// stop corto. Eso es aritmética, no una opinión, y tiene precedente con fecha:
// el 2026-08-09 los stops salían de 12 pips en USD/CAD, un par que se mueve 40
// en un día tranquilo.
//
// ⚠️ ES INFORMACIÓN Y NO DECIDE NADA en esta app: no aparece en `clasificar`,
// ni en `mkSetup`, ni en ningún filtro. (En la app hermana SÍ decide las
// señales de rango, y su tarjeta lo dice — presentarlas igual afirmaría algo
// falso en una de las dos.) Si algún día decide aquí, va al banco de pruebas
// con su listón escrito antes: van NUEVE familias medidas y nueve que no pasan.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️ LO QUE NO HAY QUE ABLANDAR
// ─────────────────────────────────────────────────────────────────────────
//
// 1. **NADA SE PINTA DE VERDE NI DE ROJO.** Que un par esté apretado no es
//    bueno ni malo: depende de qué se vaya a hacer con él. Misma decisión que
//    `Correlacion.jsx`, `Tasas.jsx` y la columna de actividad — antes de
//    pintar algo de color, preguntarse qué afirma ese color. El ámbar sí se
//    usa, y solo para avisar de que el número de al lado pide cuidado.
//
// 2. **EL NÚMERO VA SIEMPRE AL LADO DE LA ETIQUETA.** Los cortes que deciden
//    si algo es «muy apretado» o «normal» son de PRESENTACIÓN: desde el
//    2026-10-30 salen de los percentiles de 2.496 observaciones medidas (p10 ·
//    p25 · p90, ver `UMBRALES_COMPRESION`), así que la palabra dice QUÉ TAN
//    RARO es el valor — nunca qué hacer con él. Antes eran números redondos
//    elegidos a mano y dos de las cuatro etiquetas casi no salían nunca. El
//    número sigue al lado por la misma razón de siempre: una palabra sola se
//    leería como un veredicto.
//
// 3. **FIBONACCI SON NIVELES Y NADA MÁS.** Sin flechas, sin color por lado,
//    sin objetivos y sin decir qué hacer al llegar. Lo que el precio haga en
//    un retroceso es justo lo que nadie ha medido aquí.
//
// 4. **NINGÚN PATRÓN CON NOMBRE.** Ni triángulo, ni cuña, ni canal. Ver arriba.
export default function Compresion({ pares = [] }) {
  const t = useT()

  // Sin pares no se pinta nada. Pasa con un barrido viejo, de antes de que el
  // vigía publicara el campo: una tarjeta vacía se leería como un olvido.
  if (!pares.length) return null

  return (
    <TarjetaPlegable
      titulo={t('compr.titulo', { n: pares.length })}
      desc={t('compr.desc')}
      paraQue={t('compr.paraQue')}
    >
      {/* ⚠️ EL AVISO VA ANTES DE CUALQUIER NÚMERO. Aquí lo caro es leer «muy
          apretado» como «va a estallar hacia arriba»: la compresión no tiene
          dirección ninguna. Mismo criterio que las tasas, el COT y la
          actividad — lo primero que se lee es lo que se recuerda. */}
      <p style={{ ...TEXTO, margin: 0, color: 'var(--amber)' }}>{t('compr.aviso')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 11 }}>
        {pares.map((p) => (
          <Fila key={p.name} p={p} t={t} />
        ))}
      </div>

      <p style={{ ...TEXTO, margin: '11px 0 0', color: 'var(--text-muted)' }}>{t('compr.pie')}</p>
    </TarjetaPlegable>
  )
}

function Fila({ p, t }) {
  const apretado = p.nivel === 'muy' || p.nivel === 'algo'

  return (
    <div
      style={{
        padding: '9px 11px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        {/* ⚠️ `ltr` fijo en el código del par: es jerga invariante y en árabe
            se dibujaría al revés. La regla de siempre — se fija la dirección
            solo de lo que NO es idioma. */}
        <span className="mono" dir="ltr" style={{ fontWeight: 600, fontSize: 13 }}>
          {p.name}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t(`compr.nivel.${p.nivel}`)}</span>
        {/* El número, SIEMPRE. Ver la regla 2 de la cabecera. */}
        <span className="mono" dir="ltr" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          ×{p.compresion.toFixed(2)}
        </span>
      </div>

      <Barra valor={p.compresion} />

      <div style={{ ...TEXTO, color: 'var(--text-secondary)' }}>
        {t('compr.recorrido', { atr: p.atrPips.toFixed(0) })}
        {Number.isFinite(p.posicion) && ` · ${t('compr.posicion', { pct: Math.round(p.posicion * 100) })}`}
        {Number.isFinite(p.estrechas) && p.estrechas > 0 && ` · ${t('compr.seguidas', { n: p.estrechas })}`}
      </div>

      {/* El aviso del stop. Sale solo cuando el par está apretado, porque es
          cuando dice algo: si saliera siempre, dejaría de leerse justo el día
          que importa. Mismo criterio que `RiesgoSenales`. */}
      {apretado && (
        <p style={{ ...TEXTO, margin: 0, color: 'var(--amber)' }}>{t('compr.avisoStop')}</p>
      )}

      {p.fib && <Fib fib={p.fib} dec={p.dec} precio={p.precio} t={t} />}
    </div>
  )
}

// La barra. ESCALA FIJA y no «el mayor de hoy»: con escala relativa, un día en
// que todos los pares estuvieran normales seguiría enseñando una barra llena.
// Es la misma decisión que en `Cot.jsx` y la contraria a la columna de
// actividad, donde lo que se compara son los pares entre sí.
//
// La marca del 1 (el movimiento normal) SOBRESALE del riel: sin una referencia
// visible, una barra no dice nada — la lección de la barrita de actividad y de
// la marca del cero del COT.
function Barra({ valor }) {
  const frac = Math.max(0, Math.min(1, valor / TOPE_BARRA_COMPRESION))
  const uno = 1 / TOPE_BARRA_COMPRESION
  return (
    <div dir="ltr" style={{ position: 'relative', height: 8, width: '100%' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg-input)',
          borderRadius: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${frac * 100}%`,
          // Neutro a propósito: ver la regla 1.
          background: 'var(--text-muted)',
          borderRadius: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${uno * 100}%`,
          top: -2,
          bottom: -2,
          width: 2,
          marginLeft: -1,
          background: 'var(--text-secondary)',
        }}
      />
    </div>
  )
}

function Fib({ fib, dec, precio, t }) {
  return (
    <div style={{ marginTop: 2 }}>
      <div style={{ ...TEXTO, color: 'var(--text-muted)' }}>
        {t('compr.fibDe', { desde: fib.desde.toFixed(dec), hasta: fib.hasta.toFixed(dec) })}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {fib.niveles.map((n) => {
          // El nivel más cercano al precio de ahora se marca, porque es el
          // único de los cinco que dice algo hoy. NO se dice qué hacer con él.
          const cerca =
            Math.min(...fib.niveles.map((x) => Math.abs(x.precio - precio))) ===
            Math.abs(n.precio - precio)
          return (
            <span
              key={n.ratio}
              className="mono"
              dir="ltr"
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 5,
                border: `1px solid ${cerca ? 'var(--text-secondary)' : 'var(--border)'}`,
                color: cerca ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {(n.ratio * 100).toFixed(1).replace('.0', '')}% {n.precio.toFixed(dec)}
            </span>
          )
        })}
      </div>
    </div>
  )
}

const TEXTO = { fontSize: 12, lineHeight: 1.45 }
