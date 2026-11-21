// Convierte en audio los textos de `textos.json` con las voces de Google
// Cloud Text-to-Speech (2026-11-21, MUESTRA para que Néstor elija).
//
// Piper se descartó por robótica. Esto es la misma tubería con otra voz: para
// cada voz de VOCES y cada texto sin audio deja `google-<voz>/<id>.ogg`, que es
// lo que lee `grabar.mjs --voz google-<voz>`. Lo que ya existe no se repite.
//
// Corre en GitHub Actions (workflow «Generar la voz de los videos»), con la
// llave como secreto `GOOGLE_TTS_KEY`. ⚠️ La llave va en una CABECERA, nunca en
// la dirección: una dirección se puede imprimir en un log sin querer.
//
// ⚠️ TOPE DE CARACTERES POR CORRIDA (TOPE). Google cobra por carácter: el nivel
// gratis da 1 millón al mes en las voces Chirp 3 HD y Neural2. Un `textos.json`
// gigante por error no puede gastar más que esto de una vez.
//
// ⚠️ La voz dice lo mismo que el rótulo: el texto llega ya preparado por
// `paraVoz` (voz.mjs), que solo cambia cómo se pronuncia, nunca qué se dice.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = fileURLToPath(new URL('./', import.meta.url))
const API = 'https://texttospeech.googleapis.com/v1'
// Español de Estados Unidos, que es el acento latino que ofrece Google.
// ✅ ELEGIDA (2026-11-21): Néstor oyó seis voces de hombre con la
// pronunciación «natural» y eligió Studio-B, la voz de estudio de Google
// (160 USD por millón de caracteres; nivel gratis de 100.000 al mes, a
// confirmar en la factura de Google). Los audios de las otras voces de las
// dos muestras se borraron: siguen en el historial de git.
export const VOCES = ['es-US-Studio-B']
// Tope por corrida. Por defecto 20.000; el workflow deja subirlo a mano para
// generar el curso entero de una vez, y nunca por encima de 150.000.
export const TOPE = Math.min(150000, Number(process.env.TOPE_CARACTERES) || 20000)

export const carpetaDe = (voz) => `google-${voz}`

async function pedir(ruta, cuerpo) {
  const r = await fetch(`${API}/${ruta}`, {
    method: cuerpo ? 'POST' : 'GET',
    headers: { 'X-Goog-Api-Key': process.env.GOOGLE_TTS_KEY, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const texto = await r.text()
  if (!r.ok) {
    // El mensaje de Google no lleva la llave; se corta por si acaso viene largo.
    throw new Error(`HTTP ${r.status}: ${texto.slice(0, 300)}`)
  }
  return JSON.parse(texto)
}

async function main() {
  if (!process.env.GOOGLE_TTS_KEY) {
    console.error('Falta el secreto GOOGLE_TTS_KEY en GitHub (Settings → Secrets and variables → Actions).')
    process.exit(1)
  }
  const textos = JSON.parse(readFileSync(join(AQUI, 'textos.json'), 'utf8'))

  // Qué voces de español latino hay de verdad, para no pedir una que no existe.
  const { voices = [] } = await pedir('voices?languageCode=es-US')
  const hay = new Set(voices.map((v) => v.name))
  console.log(`Voces es-US que ofrece Google: ${voices.length}`)
  for (const v of voices) console.log(`  ${v.name} · ${v.ssmlGender}`)

  let gastados = 0
  let hechos = 0
  for (const voz of VOCES) {
    if (!hay.has(voz)) {
      console.log(`⚠ ${voz}: Google no la ofrece; se salta.`)
      continue
    }
    const carpeta = join(AQUI, carpetaDe(voz))
    mkdirSync(carpeta, { recursive: true })
    for (const x of textos) {
      const ogg = join(carpeta, `${x.id}.ogg`)
      if (existsSync(ogg)) continue
      if (gastados + x.texto.length > TOPE) {
        console.log(`⚠ Tope de ${TOPE} caracteres en esta corrida: se para aquí.`)
        break
      }
      const { audioContent } = await pedir('text:synthesize', {
        input: { text: x.texto },
        voice: { languageCode: 'es-US', name: voz },
        audioConfig: { audioEncoding: 'MP3' },
      })
      const mp3 = join(tmpdir(), `${x.id}.mp3`)
      writeFileSync(mp3, Buffer.from(audioContent, 'base64'))
      // Mismo formato que los demás audios de la tubería: Opus, una pista.
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', mp3, '-ac', '1', '-c:a', 'libopus', '-b:a', '32k', ogg])
      gastados += x.texto.length
      hechos++
      console.log(`${voz}: ${x.id}  ${x.texto}`)
    }
  }
  console.log(`Audios nuevos: ${hechos} · caracteres gastados: ${gastados}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
