"""
PUENTE DE NESTOR FOREX: de MetaTrader 5 a las apps.

Lee los precios de MT5 en el computador de Nestor y los PUBLICA en la rama
`datos` de GitHub, de donde las apps los leen.

    python bridge_mt5.py

─────────────────────────────────────────────────────────────────────────
QUE CAMBIO RESPECTO A LA VERSION ANTERIOR, Y POR QUE
─────────────────────────────────────────────────────────────────────────

1. AHORA MANDA EL SPREAD, que era lo que faltaba. La version anterior mandaba
   velas (maximo, minimo, cierre, tick_volume) pero NO el precio de compra y el
   de venta, y el spread sale justo de la diferencia entre esos dos. O sea que
   el dato por el que existe este puente no viajaba.

2. YA NO HAY SERVIDOR. Antes hacia POST a un servidor propio en Render. Ese
   servidor tenia dos agujeros que nadie decidio (cualquiera podia mandarle
   precios falsos, y cualquier web podia leerlo), no guardaba historial —una
   variable en memoria que se borra al reiniciar— y habia que pagarlo y
   vigilarlo. Ahora se escribe en la rama `datos`, exactamente igual que el
   vigia publica `barrido.json`:

       estado/mt5.json          lo ultimo, para la pantalla
       spreads/<fecha>.jsonl    una muestra por corrida, para medir

   Sin servidor no hay agujeros que tapar.

3. CADA 15 MINUTOS, no cada 15 segundos. Antes era una peticion a un servidor;
   ahora cada corrida deja un commit en GitHub, y uno cada 15 segundos serian
   miles al dia. El spread no cambia tanto como para eso.

─────────────────────────────────────────────────────────────────────────
LO QUE HACE FALTA PARA QUE FUNCIONE
─────────────────────────────────────────────────────────────────────────

  · MetaTrader 5 ABIERTO y con la sesion iniciada a mano.
  · Los pares que se quieran, en la Observacion del Mercado de MT5: MT5 solo
    entrega precio de los simbolos que esten ahi.
  · Un permiso de GitHub para poder escribir. Ver TOKEN mas abajo.
  · pip install MetaTrader5 requests

⚠️ ESTE GUION NO SABE NI LA CONTRASENA NI EL NUMERO DE CUENTA DEL BROKER.
`mt5.initialize()` se llama SIN argumentos: se engancha al MT5 que ya esta
abierto. Y solo LEE (`symbol_info_tick`, `copy_rates_from_pos`): no abre, no
cierra y no modifica ninguna operacion. Aunque alguien se hiciera con este
archivo entero, no podria tocar el dinero de nadie.
"""

import base64
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
import MetaTrader5 as mt5

# ─────────────────────────────────────────────────────────────────────────
# LO QUE SE PUEDE CAMBIAR SIN SABER PROGRAMAR
# ─────────────────────────────────────────────────────────────────────────

REPO = "Nestor-forex/Nestor-forex"
RAMA = "datos"

# Cada cuantos minutos se publica.
CADA_MINUTOS = 15

# Los simbolos a vigilar. Son los 14 pares de Swing mas los 4 que solo usa
# Intradia, para que un solo puente sirva a las dos apps.
#
# ⚠️ ESTA LISTA SE EQUIVOCO EL 2026-09-08, Y CONVIENE SABER POR QUE.
# Los 4 de Intradia se escribieron DE MEMORIA y salieron dos mal: iban EURJPY
# y CADJPY, que no usa ninguna de las dos apps, y faltaban NZDJPY y AUDNZD,
# que Intradia si usa. Nada fallo —el puente publico 18 pares y parecia
# correcto— pero eran 18 pares equivocados: Intradia se habria quedado sin
# precio en dos de los suyos y Nestor tenia dos simbolos abiertos en MT5 para
# nada. Salieron de comparar con `src/lib/pairs.js` de cada repositorio.
#
# La lista de verdad esta en `app/src/lib/pairs.js` de las dos apps, y
# `app/scripts/prueba-mt5.mjs` (bloque 7) compara esta contra aquella y falla
# si vuelven a separarse. Al tocar esta lista, correr esa prueba.
#
# ⚠️ Si un simbolo NO esta en la Observacion del Mercado de MT5, MT5 no da su
# precio y el puente lo salta con un aviso. No es un error del puente.
SYMBOLS = [
    # los 14 de Swing
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD",
    "EURCHF", "EURCAD", "EURNZD", "GBPCAD", "GBPJPY", "NZDCHF", "NZDCAD",
    # los 4 que ademas usa Intradia
    "AUDJPY", "NZDJPY", "AUDNZD", "EURGBP",
]

# ─────────────────────────────────────────────────────────────────────────
# EL PERMISO DE GITHUB
# ─────────────────────────────────────────────────────────────────────────
# ⚠️ NUNCA SE ESCRIBE AQUI DENTRO. Este archivo esta en un repositorio PUBLICO:
# cualquiera puede leerlo. Un permiso escrito aqui estaria a la vista del
# mundo entero, que es exactamente el agujero que ya cerramos con la llave de
# Twelve Data.
#
# Se busca en dos sitios, en este orden:
#   1. La variable de entorno NF_TOKEN.
#   2. Un archivo `token.txt` al lado de este guion.
#
# El archivo es lo mas facil para Windows y no hay que tocar nada del sistema.
# Ese archivo NO se sube a ninguna parte: vive solo en el computador de Nestor.
def leer_token():
    t = os.environ.get("NF_TOKEN", "").strip()
    if t:
        return t
    archivo = Path(__file__).with_name("token.txt")
    if archivo.exists():
        return archivo.read_text(encoding="utf-8").strip()
    return ""


API = "https://api.github.com"


def pip_de(symbol):
    """Cuanto vale un pip en ese par. El yen usa 2 decimales, el resto 4."""
    return 0.01 if "JPY" in symbol.upper() else 0.0001


def con_barra(symbol):
    """'EURUSD' -> 'EUR/USD', que es como los nombran las apps."""
    return f"{symbol[:3]}/{symbol[3:6]}"


def leer_mt5():
    """Lee todos los simbolos. Devuelve lo que se pudo leer y lo que no."""
    datos = {}
    saltados = []
    for symbol in SYMBOLS:
        tick = mt5.symbol_info_tick(symbol)
        if tick is None or not tick.bid or not tick.ask:
            saltados.append(symbol)
            continue

        pip = pip_de(symbol)
        fila = {
            "bid": float(tick.bid),
            "ask": float(tick.ask),
            # El spread se calcula aqui, del bid y el ask, y NO se coge el que
            # reporta MT5: MT5 lo da en "puntos", que en un broker de 5 digitos
            # son diez veces un pip. Sacarlo de la resta deja siempre la misma
            # unidad que usa el resto del proyecto.
            "spread": round((float(tick.ask) - float(tick.bid)) / pip, 2),
        }

        # El tick volume, que es el otro dato que no teniamos. Sale de la vela
        # diaria en curso.
        #
        # ⚠️ Esto NO es volumen real: es cuantas VECES cambio el precio en ese
        # rato, segun ESTE broker. En Forex no existe un volumen real porque no
        # hay una bolsa central que lo apunte. Va rotulado como lo que es.
        velas = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_D1, 0, 1)
        if velas is not None and len(velas) > 0:
            fila["ticks"] = int(velas[0]["tick_volume"])

        datos[con_barra(symbol)] = fila
    return datos, saltados


def publicar(token, ruta, contenido, mensaje):
    """
    Escribe un archivo en la rama `datos` usando la API de GitHub.

    Se usa la API y no `git` porque asi no hace falta tener el repositorio
    clonado en el computador de Nestor ni configurar nada de git en Windows.
    """
    url = f"{API}/repos/{REPO}/contents/{ruta}"
    cabeceras = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }

    # Para reemplazar un archivo que ya existe, GitHub pide el "sha" del que
    # habia. Si no existe todavia, se crea.
    sha = None
    previo = requests.get(url, headers=cabeceras, params={"ref": RAMA}, timeout=30)
    if previo.status_code == 200:
        sha = previo.json().get("sha")

    cuerpo = {
        "message": mensaje,
        "content": base64.b64encode(contenido.encode("utf-8")).decode("ascii"),
        "branch": RAMA,
    }
    if sha:
        cuerpo["sha"] = sha

    r = requests.put(url, headers=cabeceras, json=cuerpo, timeout=30)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"GitHub respondio {r.status_code}: {r.text[:300]}")


def leer_publicado(token, ruta):
    """Lee un archivo de la rama `datos`, o devuelve '' si no existe."""
    url = f"{API}/repos/{REPO}/contents/{ruta}"
    cabeceras = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.raw"}
    r = requests.get(url, headers=cabeceras, params={"ref": RAMA}, timeout=30)
    return r.text if r.status_code == 200 else ""


def una_vuelta(token):
    ahora = datetime.now(timezone.utc)
    datos, saltados = leer_mt5()

    # ⚠️ SI NO SE LEYO NADA, NO SE PUBLICA.
    #
    # Escribir un archivo vacio machacaria el bueno de la vuelta anterior, y en
    # pantalla se veria igual que "el mercado esta tranquilo". Es el mismo
    # peligro que vigila la copia de seguridad del historial: lo grave no es
    # que algo desaparezca, es que encoja en silencio.
    if not datos:
        print("  [!] MT5 no dio precio de NINGUN simbolo. No se publica nada.")
        print("      Revisa que MT5 este abierto y que los pares esten en la")
        print("      Observacion del Mercado.")
        return

    if saltados:
        print(f"  [i] Sin precio (¿faltan en la Observacion del Mercado?): {', '.join(saltados)}")

    # 1. Lo ultimo, para la pantalla.
    estado = {
        "actualizadoEl": ahora.isoformat(),
        # ⚠️ De quien es este spread. Va DENTRO del archivo para que la app no
        # tenga que acordarse: es la cuenta de Nestor en AvaTrade, no la del
        # suscriptor. Un suscriptor con otro broker vera numeros que no son los
        # suyos, y tiene derecho a saberlo.
        "cuenta": "AvaTrade (cuenta de Nestor)",
        "pares": datos,
    }
    publicar(
        token,
        "estado/mt5.json",
        json.dumps(estado, ensure_ascii=False),
        f"MT5 {ahora.strftime('%Y-%m-%d %H:%M UTC')}",
    )
    print(f"  [OK] estado/mt5.json — {len(datos)} pares")

    # 2. Una muestra por corrida, para poder MEDIR.
    #
    # Sin esto el dato se evapora en cada vuelta y seguiriamos con la tabla
    # `SPREAD_PIPS` escrita a mano, que es de donde salen TODOS los numeros del
    # banco de pruebas. Con muestras a distintas horas deja de ser una
    # suposicion.
    #
    # ⚠️ Va en `spreads/`, LEJOS de `historial/`. El historial de senales es lo
    # unico irreparable del proyecto y ningun guion nuevo tiene por que
    # escribir cerca de el.
    dia = ahora.strftime("%Y-%m-%d")
    ruta_muestras = f"spreads/{dia}.jsonl"
    linea = json.dumps(
        {"t": ahora.isoformat(), "s": {p: v["spread"] for p, v in datos.items()}},
        ensure_ascii=False,
    )
    anterior = leer_publicado(token, ruta_muestras)
    publicar(
        token,
        ruta_muestras,
        (anterior.rstrip("\n") + "\n" + linea + "\n").lstrip("\n"),
        f"Spreads {ahora.strftime('%Y-%m-%d %H:%M UTC')}",
    )
    print(f"  [OK] {ruta_muestras}")

    medio = sum(v["spread"] for v in datos.values()) / len(datos)
    print(f"  spread medio ahora: {medio:.2f} pips")


def main():
    token = leer_token()
    if not token:
        print("FALTA EL PERMISO DE GITHUB.")
        print("Crea un archivo llamado token.txt al lado de este guion y pega")
        print("dentro el permiso. Nada mas: solo esa linea.")
        print("(O define la variable de entorno NF_TOKEN.)")
        return

    if not mt5.initialize():
        print("No se pudo abrir MetaTrader 5. Asegurate de tenerlo abierto.")
        return
    print("Conectado a MetaTrader 5.")
    print(f"Publicando en {REPO}, rama {RAMA}, cada {CADA_MINUTOS} minutos.")
    print("Deja esta ventana abierta. Para parar: cierra la ventana.")

    while True:
        print(f"\n{datetime.now().strftime('%H:%M:%S')} — leyendo MT5…")
        try:
            una_vuelta(token)
        except Exception as e:
            # ⚠️ Un fallo NO para el puente. Si se cae internet un minuto, la
            # vuelta siguiente lo arregla sola. Pararse dejaria a la app sin
            # datos hasta que alguien se diera cuenta.
            print(f"  [ERROR] {e}")
        time.sleep(CADA_MINUTOS * 60)


if __name__ == "__main__":
    main()
