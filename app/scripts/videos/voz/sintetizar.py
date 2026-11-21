# Convierte en audio los textos de `textos.json` con Piper (2026-11-21).
#
# Corre en GitHub Actions (workflow «Generar la voz de los videos»): desde las
# sesiones de programación no se pueden bajar los modelos de voz. Para cada voz
# de VOCES y cada texto sin audio, deja `<voz>/<id>.ogg`. Lo que ya existe no se
# vuelve a generar. Una voz que no se pueda bajar se salta con un aviso.
#
# Piper es gratis y corre sin internet una vez bajado el modelo. ⚠️ Cada voz
# tiene su propia licencia (ver el MODEL_CARD de cada una en el repositorio de
# voces de Piper): antes de usar una en los videos que se publican, leerla.
import json
import os
import subprocess
import sys
import urllib.request
import wave

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es'
VOCES = {
    'es_MX-ald-medium': 'es_MX/ald/medium',
    'es_MX-claude-high': 'es_MX/claude/high',
    'es_AR-daniela-high': 'es_AR/daniela/high',
}
MODELOS = os.path.join(os.environ.get('RUNNER_TEMP', '/tmp'), 'voces')


def bajar(voz, ruta):
    os.makedirs(MODELOS, exist_ok=True)
    onnx = os.path.join(MODELOS, voz + '.onnx')
    for ext in ('.onnx', '.onnx.json'):
        dest = os.path.join(MODELOS, voz + ext)
        if not os.path.exists(dest):
            urllib.request.urlretrieve(f'{BASE}/{ruta}/{voz}{ext}', dest)
    return onnx


def sintetizar(modelo, texto, wav):
    with wave.open(wav, 'wb') as f:
        if hasattr(modelo, 'synthesize_wav'):
            modelo.synthesize_wav(texto, f)
        else:
            modelo.synthesize(texto, f)


def main():
    from piper import PiperVoice

    textos = json.load(open(os.path.join(AQUI, 'textos.json'), encoding='utf-8'))
    hechos = 0
    for voz, ruta in VOCES.items():
        carpeta = os.path.join(AQUI, voz)
        faltan = [x for x in textos if not os.path.exists(os.path.join(carpeta, x['id'] + '.ogg'))]
        if not faltan:
            print(f'{voz}: nada que hacer')
            continue
        try:
            modelo = PiperVoice.load(bajar(voz, ruta))
        except Exception as e:  # una voz que no se pueda bajar no tumba a las otras
            print(f'⚠ {voz}: no se pudo bajar ({e})')
            continue
        os.makedirs(carpeta, exist_ok=True)
        for x in faltan:
            wav = os.path.join(MODELOS, x['id'] + '.wav')
            sintetizar(modelo, x['texto'], wav)
            ogg = os.path.join(carpeta, x['id'] + '.ogg')
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libopus', '-b:a', '32k', ogg], check=True)
            hechos += 1
            print(f'{voz}: {x["id"]}  {x["texto"]}')
    print(f'Audios nuevos: {hechos}')
    if hechos == 0 and not any(os.path.isdir(os.path.join(AQUI, v)) for v in VOCES):
        sys.exit('No se generó ningún audio.')


if __name__ == '__main__':
    main()
