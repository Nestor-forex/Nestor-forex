@echo off
title Puente Nestor Forex - MT5
color 0A

REM ---------------------------------------------------------------------
REM UN SOLO CLIC PARA CONECTAR MT5 CON LAS APPS.
REM
REM Lo pidio Nestor el 2026-09-08: "me gustaria que desarrollemos un solo
REM clic para eso, de manera que yo todos los dias con un solo clic ya
REM quede conectado mt5 con las apps".
REM
REM ⚠️ NO ES EL "Iniciar_Ecosistema.bat" VIEJO. Aquel arrancaba tres cosas:
REM el servidor de Render (que ya se apago), el puente y una copia local de
REM la app. Hoy solo hace falta el puente: publica directo en GitHub y las
REM apps lo leen de ahi.
REM
REM `%~dp0` significa "la carpeta donde esta este archivo", asi que funciona
REM aunque muevas la carpeta de sitio o crees un acceso directo en el
REM escritorio. Sin eso, un acceso directo abriria la carpeta equivocada.
REM ---------------------------------------------------------------------

cd /d "%~dp0"

echo ========================================================
echo   PUENTE NESTOR FOREX  -  MetaTrader 5
echo ========================================================
echo.
echo   Antes de seguir, comprueba:
echo     1. MetaTrader 5 ABIERTO y con tu cuenta iniciada.
echo     2. Los pares en la Observacion del Mercado.
echo.
echo   Deja esta ventana abierta. Publica cada 15 minutos.
echo   Para parar: cierra esta ventana.
echo.
echo ========================================================
echo.

REM Comprobaciones ANTES de arrancar, para que un fallo tonto se explique
REM solo en vez de salir como un error de Python que no dice nada.

if not exist "bridge_mt5.py" (
  echo [ERROR] No encuentro bridge_mt5.py en esta carpeta:
  echo         %~dp0
  echo.
  echo Este archivo .bat tiene que estar en la MISMA carpeta que el puente.
  echo.
  pause
  exit /b 1
)

if not exist "token.txt" (
  echo [ERROR] No encuentro token.txt en esta carpeta.
  echo.
  echo Es el permiso de GitHub. Tiene que llamarse token.txt y estar
  echo justo al lado de bridge_mt5.py.
  echo.
  echo OJO: si lo guardaste con el Bloc de notas sin elegir "Todos los
  echo archivos", Windows lo habra llamado token.txt.txt y no vale.
  echo.
  pause
  exit /b 1
)

python bridge_mt5.py

REM Si se llega aqui es que el puente se detuvo. El `pause` deja la ventana
REM abierta para poder LEER el motivo: sin el, la ventana se cerraria sola y
REM el error se perderia — que es justo cuando mas falta hace verlo.
echo.
echo ========================================================
echo   EL PUENTE SE DETUVO. Mira arriba el motivo.
echo ========================================================
pause
