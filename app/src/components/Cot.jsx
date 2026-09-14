import { useState } from 'react'
import { useIdioma } from '../lib/i18n'
import { diasDelDato, divisasOrdenadas, esIndice } from '../lib/cot'
import { useCot } from '../lib/useCot'

// LO QUE TIENEN COMPRADO O VENDIDO LOS GRANDES OPERADORES (el COT de la CFTC).
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠️⚠️ LAS DECISIONES QUE NO HAY QUE ABLANDAR
// ─────────────────────────────────────────────────────────────────────────
//
// **1. EL AVISO VA PRIMERO, ANTES DE NINGÚN NÚMERO.** Igual que en `Tasas.jsx`
//    y en la columna de actividad: lo primero que se lee es lo que se recuerda,
//    así que lo primero que se dice tiene que ser lo que más caro sale ignorar.
//    Aquí lo caro es leer esto como «compra lo que compran los grandes».
//
// **2. NADA SE PINTA DE VERDE NI DE ROJO.** Que los fondos estén comprados en
//    una divisa no es «bueno»: depende de hacia dónde vaya a operar quien mira,
//    y encima media industria lee un extremo como continuación y la otra media
//    como vuelta. El color afirmaría algo que el dato no dice. Misma decisión
//    que en `Correlacion.jsx` y en `Tasas.jsx`, y la regla general de este
//    proyecto — **antes de pintar algo de color, preguntarse qué afirma ese
//    color**.
//
// **3. EL SIGNO SE CODIFICA CON LA POSICIÓN, NO CON EL COLOR.** La barra sale
//    del centro hacia la derecha si están comprados y hacia la izquierda si
//    están vendidos. La posición dice «hacia qué lado» sin decir «esto es
//    bueno», que es exactamente lo que hace falta.
//
// **4. LA FECHA DEL INFORME VA SIEMPRE VISIBLE.** El COT se publica los
//    viernes con los datos del MARTES anterior, así que lo normal es que tenga
//    entre 3 y 10 días. Sin la fecha delante, un dato de hace diez días se lee
//    como de hoy. Medido: el 2026-09-14 el informe más reciente era del
//    2026-09-08.
//
// **5. EL DÓLAR LLEVA SU PROPIA NOTA.** Las otras siete son la divisa CONTRA
//    EL DÓLAR; el USD es el índice del dólar contra una cesta, y encima cotiza
//    en ICE y es un contrato pequeño. «+10 % comprado» no significa lo mismo
//    en esa fila que en las demás.
//
// Va plegada por defecto, como el glosario, la correlación y las tasas: es
// contexto, no lo primero que se viene a mirar.

const P = { margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }
const PIE = { margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }

// Hasta dónde llega la barra. **Es una decisión de dibujo, no un umbral
// medido**, y por eso el número de al lado es el dato y la barra solo sirve
// para comparar de un vistazo (lo dice el pie).
//
// ⚠️ Se usa una escala FIJA y no «el mayor de hoy», al revés que en la columna
// de actividad. Allí todos los números son del mismo instante y lo único que
// interesa es cuál destaca. Aquí no: con una escala relativa, una semana en la
// que nadie estuviera posicionado seguiría enseñando una barra llena, y eso
// diría «esta divisa está muy posicionada» cuando la verdad es que ninguna lo
// está. La escala fija deja las semanas tranquilas con barras cortas, que es
// lo honesto.
const TOPE_BARRA = 25

// Con signo explícito. `−` es el signo menos de verdad (U+2212), no un guion:
// en la tipografía de la app tiene el mismo ancho que el `+` y la columna no
// baila.
const conSigno = (n, dec = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(dec)

// ⚠️ ENTERO PELADO, SIN SEPARADOR DE MILES. Y no es pereza:
//
//   · con `toLocaleString('en-US')` salía «+13,302» justo al lado de un
//     «−16.6 %». En español esa coma es el DECIMAL, así que «13,302» se lee
//     «trece coma tres cero dos» — dos convenciones distintas en la misma
//     fila, y el número grande pareciendo pequeño;
//   · y con `toLocaleString(locale)` el árabe sacaría cifras árabo-índicas
//     mientras el porcentaje de al lado va en cifras latinas.
//
// Es exactamente la decisión que ya se tomó en la columna de actividad, y por
// las mismas dos razones. Se vio MIRANDO la captura, no en las comprobaciones.
const enteroConSigno = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n)

export default function Cot() {
  const { t, locale } = useIdioma()
  const [abierto, setAbierto] = useState(false)
  const datos = useCot()

  // Sin datos no se pinta NADA — ni título ni «no hay nada». Mismo criterio que
  // la correlación, el calendario y las tasas: una tarjeta vacía hace pensar
  // que la app está rota.
  const filas = divisasOrdenadas(datos)
  if (!filas.length) return null

  const dias = diasDelDato(datos.fecha)
  const fecha = datos.fecha
    ? new Date(datos.fecha + 'T00:00:00Z').toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : ''

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
        <span>{t('cot.titulo')}</span>
        <span style={{ color: 'var(--text-muted)' }}>{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ⚠️ EL AVISO VA PRIMERO. Ver la cabecera del archivo: no es
              maquetación, es la única forma de que se lea. */}
          <div
            style={{
              padding: '10px 12px',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
            }}
          >
            {t('cot.aviso')}
          </div>

          <p style={P}>{t('cot.intro')}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filas.map((d) => (
              <Fila key={d.divisa} d={d} t={t} />
            ))}
          </div>

          {/* ⚠️ `dias` va formateado con el locale, no como número pelado.
              En árabe, `toLocaleDateString` saca la fecha en cifras
              árabo-índicas («٨ سبتمبر ٢٠٢٦») y un número de JavaScript sale en
              latinas: en la captura se veía «٨ سبتمبر ٢٠٢٦ (قبل 6 يوماً)», dos
              sistemas de dígitos en la MISMA frase.
              La regla que sale de aquí, y que ya estaba implícita en el resto
              de la app: dentro de una frase traducida, los números siguen al
              idioma; en las columnas de datos (el % y los contratos) van en
              cifras latinas, `mono` y `ltr` fijo, como los precios. */}
          <p style={PIE}>{t('cot.pie', { fecha, dias: (dias ?? 0).toLocaleString(locale) })}</p>
        </div>
      )}
    </div>
  )
}

function Fila({ d, t }) {
  const pct = d.fondosPct
  const etiqueta = pct > 0 ? t('cot.comprados') : pct < 0 ? t('cot.vendidos') : t('cot.igualados')

  return (
    <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          {/* `dir="ltr"` fijo: es un código, y en árabe se dibujaría al revés.
              Es el error que ya mordió cuatro veces en este repo. */}
          <span className="mono" dir="ltr" style={{ fontSize: 12.5, fontWeight: 700 }}>
            {d.divisa}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginInlineStart: 8 }}>
            {etiqueta}
          </span>
        </div>
        <span
          className="mono"
          dir="ltr"
          style={{
            fontSize: 15,
            fontWeight: 700,
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
            // Neutro a propósito. Ver la cabecera del archivo.
            color: 'var(--text-secondary)',
          }}
        >
          {conSigno(pct)} %
        </span>
      </div>

      <Barra pct={pct} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          marginTop: 4,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        {/* ⚠️ La nota del dólar, que no es un adorno: esa fila mide otra cosa
            que las demás. */}
        <span>{esIndice(d.divisa) ? t('cot.indice') : ''}</span>
        <span className="mono" dir="ltr" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          {d.cambioNeto == null
            ? ''
            : d.cambioNeto === 0
              ? t('cot.sinCambio')
              : t('cot.cambio', { n: enteroConSigno(d.cambioNeto) })}
        </span>
      </div>
    </div>
  )
}

// La barra sale del CENTRO: a la derecha si están comprados, a la izquierda si
// están vendidos.
//
// ⚠️ Va en `dir="ltr"` fijo. En árabe, una barra que «sale hacia la derecha»
// heredaría la dirección del texto y saldría hacia el otro lado, o sea que
// diría lo contrario. Es exactamente el error del gráfico, el clima, la
// correlación y el calendario, que ya mordió cuatro veces.
function Barra({ pct }) {
  const ancho = Math.min(100, (Math.abs(pct) / TOPE_BARRA) * 100)
  const positivo = pct > 0

  return (
    <div
      dir="ltr"
      style={{
        position: 'relative',
        height: 8,
        margin: '9px 0 3px',
        background: 'var(--border)',
        borderRadius: 4,
        // `visible` a propósito: la marca del cero SOBRESALE del riel por
        // arriba y por abajo. Ver el porqué justo aquí debajo.
        overflow: 'visible',
      }}
    >
      {/* ⚠️ LA MARCA DEL CERO, y sobresale del riel a propósito.
          La primera versión la dibujaba DENTRO, de 1 px y en un tono apenas
          distinto del riel: en la captura no se veía, así que no había forma
          de saber desde dónde sale la barra — y una barra sin referencia no
          dice nada. Es la misma lección que la barrita de actividad, donde el
          riel invisible la hacía parecer un subrayado del número.
          Sobresaliendo se lee como un eje y no como un trozo de barra. */}
      <div
        style={{
          position: 'absolute',
          left: 'calc(50% - 0.5px)',
          top: -4,
          bottom: -4,
          width: 1,
          background: 'var(--text-muted)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          // Del centro hacia un lado o hacia el otro.
          left: positivo ? '50%' : `calc(50% - ${ancho / 2}%)`,
          width: `${ancho / 2}%`,
          background: 'var(--text-muted)',
          borderRadius: 4,
        }}
      />
    </div>
  )
}
