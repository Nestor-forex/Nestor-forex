@echo off
setlocal
title Puente Nestor Forex - MT5
color 0A

REM ---------------------------------------------------------------------
REM UN SOLO CLIC PARA CONECTAR MT5 CON LAS APPS.
REM
REM Lo pidio Nestor el 2026-09-08: "me gustaria que desarrollemos un solo
REM clic para eso, de manera que yo todos los dias con un solo clic ya
REM quede conectado mt5 con las apps".
REM
REM NO ES EL "Iniciar_Ecosistema.bat" VIEJO. Aquel arrancaba tres cosas:
REM el servidor de Render (que ya se apago), el puente y una copia local de
REM la app. Hoy solo hace falta el puente: publica directo en GitHub y las
REM apps lo leen de ahi.
REM
REM `%~dp0` significa "la carpeta donde esta este archivo", asi que funciona
REM aunque muevas la carpeta de sitio o crees un acceso directo en el
REM escritorio. Sin eso, un acceso directo abriria la carpeta equivocada.
REM ---------------------------------------------------------------------

REM ---------------------------------------------------------------------
REM DOS COSAS DE ESTE ARCHIVO QUE NO SON ESTILO, SON EL MOTIVO DE UN FALLO
REM REAL (2026-09-09). La primera version no abria NINGUNA ventana al hacer
REM doble clic, y las dos causas estaban aqui dentro:
REM
REM 1. SALTOS DE LINEA. El archivo se escribio en Linux, o sea con saltos
REM    de linea LF. `cmd` de Windows NO analiza bien un bloque
REM    `if ... ( ... )` de varias lineas cuando los saltos son LF: aborta el
REM    guion entero y la ventana se cierra antes de que se pueda leer nada.
REM    Se ve igual que "no abre". Ahora el archivo va en CRLF y hay un
REM    `.gitattributes` al lado que obliga a git a mantenerlo asi.
REM
REM 2. PARENTESIS. Aun con CRLF, los bloques de varias lineas son la parte
REM    mas fragil del lenguaje de los .bat. Aqui se usan ETIQUETAS y `goto`,
REM    que funcionan igual con cualquier salto de linea. Es mas largo de
REM    leer y no se rompe.
REM
REM Y por eso tampoco hay ni un caracter raro (ni emoji ni tildes): la
REM consola de Windows en espanol no usa UTF-8 por defecto y los sacaria
REM como simbolos sin sentido justo en los mensajes de error, que es cuando
REM mas falta hace entenderlos.
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

if not exist "bridge_mt5.py" goto :falta_puente
if not exist "token.txt" goto :falta_token

REM Si Python no esta instalado o no esta en el PATH, el mensaje que da
REM Windows es "no se reconoce como un comando interno o externo", que no le
REM dice nada a nadie. Mejor decirlo con palabras.
where python >nul 2>nul
if errorlevel 1 goto :falta_python

python bridge_mt5.py
goto :fin

:falta_puente
echo [ERROR] No encuentro bridge_mt5.py en esta carpeta:
echo         %~dp0
echo.
echo Este archivo .bat tiene que estar en la MISMA carpeta que el puente.
echo Si lo que pusiste en el escritorio es un ACCESO DIRECTO, esta bien:
echo el acceso directo apunta al .bat y el .bat sigue en su carpeta.
goto :fin

:falta_token
echo [ERROR] No encuentro token.txt en esta carpeta:
echo         %~dp0
echo.
echo Es el permiso de GitHub. Tiene que llamarse token.txt y estar
echo justo al lado de bridge_mt5.py.
echo.
echo OJO: si lo guardaste con el Bloc de notas sin elegir "Todos los
echo archivos", Windows lo habra llamado token.txt.txt y no vale.
goto :fin

:falta_python
echo [ERROR] Windows no encuentra Python.
echo.
echo Instalalo desde python.org y marca la casilla
echo "Add python.exe to PATH" durante la instalacion.
echo Despues hace falta cerrar y volver a abrir esta ventana.
goto :fin

:fin
REM El `pause` deja la ventana abierta para poder LEER lo que pone arriba.
REM Sin el, la ventana se cerraria sola y el motivo se perderia, que es
REM justo cuando mas falta hace verlo.
echo.
echo ========================================================
echo   EL PUENTE SE DETUVO. Mira arriba el motivo.
echo ========================================================
pause
