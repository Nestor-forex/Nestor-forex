import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;

let liveMarketData = {};

// Endpoint para el Frontend (React)
app.get('/api/signals', (req, res) => {
    if (Object.keys(liveMarketData).length === 0) {
        res.json({ estado: "Esperando datos de MetaTrader..." });
    } else {
        res.json(liveMarketData);
    }
});

// Endpoint para recibir los datos de Python (bridge_mt5.py)
app.post("/api/mt5/update", (req, res) => {
    const { symbol, timeframe, candles, currentPrice } = req.body;

    if (!symbol) {
        return res.status(400).json({ error: "Símbolo inválido" });
    }

    const key = timeframe ? `${symbol} (${timeframe})` : symbol;

    liveMarketData[key] = {
        symbol,
        timeframe: timeframe || "M15",
        currentPrice: currentPrice || 0,
        candles: candles || [],
        updatedAt: new Date().toISOString()
    };

    res.json({ status: "success", message: `Datos guardados para ${key}` });
});

app.listen(PORT, () => {
    console.log(`Servidor de Nestor Forex listo en el puerto ${PORT}`);
});
