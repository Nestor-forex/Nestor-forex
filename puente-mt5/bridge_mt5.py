import time
import requests
import MetaTrader5 as mt5

# Configuración del servidor local que acabamos de e                    SERVER
SERVER_URL = "https://nestor-forex-backend.onrender.com/api/mt5/update"
URL_SERVIDOR = "https://nestor-forex-backend.onrender.com/api/mt5/update"
url = "https://nestor-forex-backend.onrender.com/api/mt5/update"
# Pares a monitorear
SYMBOLS = ["USDJPY", "GBPCAD", "USDCAD", "EURUSD", "GBPUSD"]

def initialize_mt5():
    if not mt5.initialize():
        print("Error al inicializar MT5. Asegúrate de tener MetaTrader 5 abierto.")
        return False
    print("Conexión exitosa con MetaTrader 5 (AvaTrade).")
    return True

def get_candles(symbol, timeframe, count=200):
    rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, count)
    if rates is None or len(rates) == 0:
        return []

    candles = []
    for rate in rates:
        candles.append({
            "high": float(rate['high']),
            "low": float(rate['low']),
            "close": float(rate['close']),
            "volume": float(rate['tick_volume'])
        })
    return candles

def send_data_to_server(symbol, timeframe_str, candles, current_price):
    payload = {
        "symbol": symbol,
        "timeframe": timeframe_str,
        "candles": candles,
        "currentPrice": current_price
    }
    try:
        response = requests.post(SERVER_URL, json=payload)
        if response.status_code == 200:
            print(f"[OK] Datos de {symbol} ({timeframe_str}) enviados al nuevo servidor.")
        else:
            print(f"[Error] Servidor respondió con código: {response.status_code}")
    except Exception as e:
        print(f"[Error de conexión] No se pudo contactar al servidor: {e}")

def main():
    if not initialize_mt5():
        return

    print("Iniciando puente de datos Nestor Forex hacia el nuevo servidor...")

    while True:
        for symbol in SYMBOLS:
            tick = mt5.symbol_info_tick(symbol)
            if tick is None:
                continue

            current_price = tick.ask

            # Obtener velas M15 para Intradía
            candles_m15 = get_candles(symbol, mt5.TIMEFRAME_M15, count=50)
            if candles_m15:
                send_data_to_server(symbol, "M15", candles_m15, current_price)

            # Obtener velas D1 para Swing
            candles_d1 = get_candles(symbol, mt5.TIMEFRAME_D1, count=200)
            if candles_d1:
                send_data_to_server(symbol, "D1", candles_d1, current_price)

            candles_h4 = get_candles(symbol, mt5.TIMEFRAME_H4)
            send_data_to_server(symbol, "H4", candles_h4, current_price)

        # Esperar 15 segundos antes de actualizar nuevamente
        time.sleep(15)

if __name__ == "__main__":
    main()
