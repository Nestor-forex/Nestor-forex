@echo off
title Ecosistema Nestor Forex - Inicio Automatico
color 0A

echo [1/3] Iniciando Servidor Backend (Node.js)...
cd /d "C:\Users\nesdi\OneDrive\Documents\nestor-forex-backend"
start cmd /k "node server.js"

timeout /t 3 > nul

echo [2/3] Iniciando Puente Python (MT5 + AvaTrade)...
cd /d "C:\Users\nesdi\OneDrive\Documents\nestor-forex-bridge"
start cmd /k "python bridge_mt5.py"

timeout /t 3 > nul

echo [3/3] Iniciando Aplicacion Web (Swing / Rango / Intradia)...
:: Cambia la ruta de abajo por la app que quieras abrir hoy (ej: nestor-forex-rango o nestor-forex-swing)
cd /d "C:\Users\nesdi\OneDrive\Documents\nestor-forex-swing"
start cmd /k "npm run dev"

echo.
echo ========================================================
echo   ¡Ecosistema iniciado con exito!
echo   Revisa las ventanas negras que se acaban de abrir.
echo ========================================================
pause
