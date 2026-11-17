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

3. CADA 5 MINUTOS el precio (era 15 hasta el 2026-11-17) y cada 15 la muestra
   de spreads. Cada corrida deja un commit en GitHub, y uno cada pocos segundos
   serian miles al dia; ademas GitHub sirve el archivo con 5 minutos de cache,
   asi que publicar mas a menudo no lo haria llegar antes.

4. AHORA MANDA EL SWAP (2026-11-17): cuanto cobra o paga esta cuenta por dejar
   la operacion abierta de noche, en pips. Lo usa el modo practica.

5. Y EL PRECIO AL SEGUNDO (2026-11-17, lo pidio Nestor con el plan de pago de
   Firebase). Ademas de lo de arriba, cada segundo escribe el BID y el ASK de
   los 18 pares en Firestore (el documento `vivo/precios`), y las apps lo
   escuchan. Solo escribe si el precio cambio: con el mercado quieto o cerrado
   no gasta nada. Si esto falla, lo de los 5 minutos sigue igual: las apps
   pasan solas a esa foto y lo dicen en pantalla.

   Para entrar en Firestore usa UNA CUENTA PROPIA DEL PUENTE (no la de Nestor,
   no la llave maestra de Firebase). Su contrasena va en un archivo
   `firebase_puente.txt` al lado de este guion, que NO se sube a ninguna parte.
   Sin ese archivo, el puente funciona como antes, cada 5 minutos.

─────────────────────────────────────────────────────────────────────────
LO QUE HACE FALTA PARA QUE FUNCIONE
─────────────────────────────────────────────────────────────────────────

  · MetaTrader 5 ABIERTO y con la sesion iniciada a mano.
  · Los pares que se quieran, en la Observacion del Mercado de MT5: MT5 solo
    entrega precio de los simbolos que esten ahi.
  · Un permiso de GitHub para poder escribir. Ver TOKEN mas abajo.
  · pip install MetaTrader5 requests
  · Para el precio al segundo: el archivo `firebase_puente.txt` (ver arriba).

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

# Cada cuantos minutos se publica el PRECIO (estado/mt5.json).
#
# ⚠️ 2026-11-17: bajo de 15 a 5. Nestor vio el precio de las apps con atraso y
# pidio, con razon, que con el puente encendido el precio fuera el de MT5 y no
# uno de hace un cuarto de hora. Menos de 5 no sirve de nada: GitHub sirve el
# archivo con una cache de 5 minutos, asi que publicar cada minuto no haria que
# llegara antes a los telefonos.
CADA_MINUTOS = 5

# Cada cuantas vueltas se guarda una MUESTRA de spreads (spreads/<fecha>.jsonl).
# Para medir basta una cada 15 minutos, como antes: 3 vueltas de 5.
MUESTRA_CADA_VUELTAS = 3

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


# ─────────────────────────────────────────────────────────────────────────
# EL PRECIO AL SEGUNDO (Firestore)
# ─────────────────────────────────────────────────────────────────────────
# Cada cuantos segundos se mira el precio y, si cambio, se escribe.
PRECIO_CADA_SEGUNDOS = 1

PROYECTO_FIREBASE = "nestor-forex"
# ⚠️ Esta llave NO es secreta: es la que usa la app web para hablar con
# Firebase y ya esta publicada en `app/.env.production`. Firebase la documenta
# como segura de publicar. Lo que protege el documento son las REGLAS de
# Firestore, que solo dejan escribir a la cuenta del puente.
FIREBASE_API_KEY = "AIzaSyBbIOnRPd8mmmBsmitm1orl6WXsdZfPgE8"
# La cuenta propia del puente. El correo tambien esta en `firestore.rules`; sin
# la contrasena no sirve de nada.
CORREO_PUENTE = "puente-mt5@nestor-forex.firebaseapp.com"
DOC_VIVO = (
    f"https://firestore.googleapis.com/v1/projects/{PROYECTO_FIREBASE}"
    "/databases/(default)/documents/vivo/precios"
)


def leer_clave_firebase():
    """
    La contrasena de la cuenta del puente.

    ⚠️ NUNCA SE ESCRIBE AQUI DENTRO, por lo mismo que el permiso de GitHub: este
    archivo esta en un repositorio publico. Se busca en la variable de entorno
    NF_PUENTE_CLAVE o en `firebase_puente.txt` al lado de este guion, que el
    `.gitignore` de esta carpeta no deja subir.
    """
    c = os.environ.get("NF_PUENTE_CLAVE", "").strip()
    if c:
        return c
    archivo = Path(__file__).with_name("firebase_puente.txt")
    if archivo.exists():
        return archivo.read_text(encoding="utf-8").strip()
    return ""


class SesionFirebase:
    """Entra con la cuenta del puente y renueva el permiso antes de que caduque."""

    def __init__(self, clave):
        self.clave = clave
        self.http = requests.Session()
        self.id_token = None
        self.refresh = None
        self.caduca = 0.0

    def _guardar(self, id_token, refresh, segundos):
        self.id_token = id_token
        self.refresh = refresh
        # Se renueva 5 minutos antes de que caduque (dura una hora).
        self.caduca = time.time() + max(60, int(segundos) - 300)

    def entrar(self):
        r = self.http.post(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
            params={"key": FIREBASE_API_KEY},
            json={"email": CORREO_PUENTE, "password": self.clave, "returnSecureToken": True},
            timeout=20,
        )
        if r.status_code != 200:
            # ⚠️ No se imprime la respuesta entera: no lleva la contrasena, pero
            # tampoco hace falta. Basta el motivo.
            motivo = r.json().get("error", {}).get("message", r.status_code) if r.content else r.status_code
            raise RuntimeError(f"Firebase no dejo entrar a la cuenta del puente ({motivo})")
        d = r.json()
        self._guardar(d["idToken"], d["refreshToken"], d.get("expiresIn", 3600))

    def token(self):
        if self.id_token and time.time() < self.caduca:
            return self.id_token
        if self.refresh:
            r = self.http.post(
                "https://securetoken.googleapis.com/v1/token",
                params={"key": FIREBASE_API_KEY},
                data={"grant_type": "refresh_token", "refresh_token": self.refresh},
                timeout=20,
            )
            if r.status_code == 200:
                d = r.json()
                self._guardar(d["id_token"], d["refresh_token"], d.get("expires_in", 3600))
                return self.id_token
        self.entrar()
        return self.id_token


def leer_bid_ask():
    """Solo el BID y el ASK de cada simbolo: lo minimo, para poder hacerlo cada segundo."""
    pares = {}
    for symbol in SYMBOLS:
        tick = mt5.symbol_info_tick(symbol)
        if tick is None or not tick.bid or not tick.ask:
            continue
        pares[con_barra(symbol)] = (float(tick.bid), float(tick.ask))
    return pares


def escribir_vivo(sesion, pares, ahora):
    """
    Escribe `vivo/precios` entero. Las reglas de Firestore solo aceptan los
    campos `actualizadoEl` (texto) y `pares` (como mucho 30).
    """
    campos_pares = {
        par: {"mapValue": {"fields": {"bid": {"doubleValue": b}, "ask": {"doubleValue": a}}}}
        for par, (b, a) in pares.items()
    }
    cuerpo = {
        "fields": {
            "actualizadoEl": {"stringValue": ahora.isoformat()},
            "pares": {"mapValue": {"fields": campos_pares}},
        }
    }
    r = sesion.http.patch(
        DOC_VIVO,
        headers={"Authorization": f"Bearer {sesion.token()}"},
        json=cuerpo,
        timeout=10,
    )
    if r.status_code == 401:
        # El permiso caduco antes de tiempo: se fuerza uno nuevo en la proxima.
        sesion.caduca = 0
    if r.status_code != 200:
        raise RuntimeError(f"Firestore respondio {r.status_code}: {r.text[:200]}")


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

        # EL SWAP de esta cuenta, en PIPS POR NOCHE (2026-11-17). Lo usa el
        # modo practica para descontar lo que cuesta dejar la operacion abierta
        # de noche: Nestor pidio cuentas reales, sin nada hipotetico.
        #
        # ⚠️ Solo se manda si MT5 lo da en PUNTOS, que es lo normal. En otros
        # modos (dinero, porcentaje) el numero significa otra cosa, y mandarlo
        # como pips seria un dato bien leido de una cosa distinta. Entonces no
        # se manda y la app dice "sin dato".
        info = mt5.symbol_info(symbol)
        if info is not None and getattr(info, "swap_mode", None) == mt5.SYMBOL_SWAP_MODE_POINTS and info.point:
            fila["swapLargo"] = round(float(info.swap_long) * float(info.point) / pip, 3)
            fila["swapCorto"] = round(float(info.swap_short) * float(info.point) / pip, 3)
            # Que dia cobra el triple: 0 = domingo ... 6 = sabado.
            fila["swap3"] = int(info.swap_rollover3days)

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


def una_vuelta(token, con_muestra=True):
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
        # ⚠️ De quien es este spread. Va DENTRO del archivo para que el dato
        # diga su propio origen aunque alguien lo lea fuera de la app: es una
        # cuenta real del desarrollador, NO la del suscriptor. Quien tenga otro
        # broker vera numeros que no son los suyos, y tiene derecho a saberlo.
        #
        # 📌 NO SE NOMBRA AL BROKER, y lo pidio Nestor el 2026-10-30: «mejor
        # que diga que el precio es del broker que usan las apps o el
        # desarrollador». Lo honesto es decir que NO es el tuyo, y eso se dice
        # entero sin nombrar a una empresa en un repositorio publico.
        #
        # ⚠️ Y LA PANTALLA YA NO LEE ESTE CAMPO: usa su propia frase traducida.
        # El motivo es que esto es texto en espanol y la app esta en 13
        # idiomas, asi que un suscriptor en coreano leia una frase en espanol.
        # Aqui se queda como documentacion del origen DENTRO del archivo.
        "cuenta": "cuenta real del desarrollador de las apps",
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
    if not con_muestra:
        return
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

    # El precio al segundo, si esta la contrasena de la cuenta del puente.
    sesion = None
    clave = leer_clave_firebase()
    if not clave:
        print("Precio al segundo: APAGADO (falta firebase_puente.txt). Se sigue cada 5 minutos.")
    else:
        sesion = SesionFirebase(clave)
        try:
            sesion.entrar()
            print(f"Precio al segundo: ENCENDIDO (cada {PRECIO_CADA_SEGUNDOS} s, solo si cambia).")
        except Exception as e:
            print(f"Precio al segundo: no se pudo encender — {e}")
            print("  Se sigue cada 5 minutos y se reintenta solo.")
    print("Deja esta ventana abierta. Para parar: cierra la ventana.")

    vuelta = 0
    proxima_publicacion = 0.0
    ultimo_enviado = None
    escrituras_minuto = 0
    proximo_resumen = time.time() + 60
    esperar_hasta = 0.0  # tras un fallo de Firestore, una pausa antes de reintentar
    while True:
        inicio = time.time()

        # 1. Cada 5 minutos: el archivo de la rama `datos` (con swap y actividad).
        if inicio >= proxima_publicacion:
            print(f"\n{datetime.now().strftime('%H:%M:%S')} — leyendo MT5…")
            try:
                una_vuelta(token, con_muestra=(vuelta % MUESTRA_CADA_VUELTAS == 0))
            except Exception as e:
                # ⚠️ Un fallo NO para el puente. Si se cae internet un minuto, la
                # vuelta siguiente lo arregla sola. Pararse dejaria a la app sin
                # datos hasta que alguien se diera cuenta.
                print(f"  [ERROR] {e}")
            vuelta += 1
            proxima_publicacion = inicio + CADA_MINUTOS * 60

        # 2. Cada segundo: el precio en Firestore, solo si cambio.
        if sesion is not None and inicio >= esperar_hasta:
            try:
                pares = leer_bid_ask()
                if pares and pares != ultimo_enviado:
                    escribir_vivo(sesion, pares, datetime.now(timezone.utc))
                    ultimo_enviado = pares
                    escrituras_minuto += 1
            except Exception as e:
                print(f"  [ERROR precio al segundo] {e}")
                print("  Se reintenta en un minuto. Mientras, las apps usan la foto de cada 5 minutos.")
                esperar_hasta = inicio + 60

        if sesion is not None and time.time() >= proximo_resumen:
            print(f"  precio al segundo: {escrituras_minuto} escrituras en el ultimo minuto")
            escrituras_minuto = 0
            proximo_resumen = time.time() + 60

        if sesion is None:
            time.sleep(max(1.0, proxima_publicacion - time.time()))
        else:
            time.sleep(max(0.05, PRECIO_CADA_SEGUNDOS - (time.time() - inicio)))


if __name__ == "__main__":
    main()
