// Español — idioma base y única fuente de verdad de las claves.
//
// Si una clave falta en otro idioma, se cae a la de aquí (ver crearT.js), así
// que un idioma a medias degrada a español en vez de romperse.
//
// Términos que NO se traducen en ningún idioma, por ser jerga estándar de
// trading: RSI, ATR, EMA, Stop-loss, Take-profit, Pip, Spread, R/B, Forex.
// La dirección de la operación va como BUY/SELL en todos los idiomas menos el
// español, que conserva COMPRA/VENTA por ser el que Néstor ya usa.
//
// Los valores que se guardan en la base de datos (dir 'Compra'/'Venta',
// estado 'abierta'/'cerrada') NUNCA se traducen: aquí solo se traduce cómo se
// muestran. Si se tradujeran, las operaciones viejas dejarían de coincidir.

export default {
  comun: {
    salir: 'Salir',
    eyebrow: 'TRADING · FX',
    administrador: 'Administrador', idioma: 'Idioma',
  },

  splash: {
    lema: 'Barrido diario del mercado, diario de operaciones y gestión de riesgo.',
    entrar: 'Entrar',
    iniciaSesion: 'Accede a tu cuenta',
  },

  auth: {
    ingresar: 'Ingresar',
    inscribirse: 'Inscribirse',
    correo: 'Correo',
    clave: 'Clave',
    ingresando: 'Ingresando…',
    nombreCompleto: 'Nombre completo',
    creaClave: 'Crea una clave (mín. 6 caracteres)',
    enviando: 'Enviando…',
    enviarSolicitud: 'Enviar solicitud',
    notaSolicitud: 'Tu solicitud queda pendiente hasta que Néstor la autorice.',
    faltanCampos: 'Completa nombre, correo y clave.',
    faltanCredenciales: 'Escribe tu correo y tu clave.',
  },

  pendiente: {
    titulo: 'Solicitud pendiente',
    mensaje: 'Tu solicitud queda pendiente hasta que Néstor la autorice.',
    nota: 'Esta pantalla se actualiza sola: en cuanto Néstor apruebe tu solicitud, entrarás automáticamente sin tener que hacer nada más.',
    retirado: 'Tu acceso fue retirado. Escríbele a Néstor si crees que es un error.',
  },

  // La pantalla de último recurso, cuando algo falla al dibujarse.
  // La usa RedDeSeguridad.jsx, que las lee SIN pasar por React: si esta
  // clave faltara, cae al español en vez de dejar la pantalla en blanco.
  error: {
    titulo: 'La app tuvo un problema',
    cuerpo: 'Algo falló al mostrar esta pantalla. Tus datos y tus operaciones están a salvo: esto es un problema de visualización, no de tu cuenta.',
    boton: 'Recargar la app',
    detalle: 'Detalle técnico',
  },

  // VER TODOS LOS PARES O SOLO LOS MIOS.
  //
  // El contador («viendo 3 de 14») se ve SIEMPRE, tambien sin filtrar: sin
  // el, un filtro que alguien puso hace meses se lee como una app rota.
  // Y `nota` no es letra pequena — dice que el ranking de fuerza y las
  // tarjetas de informacion NO se filtran, que es la diferencia entre «esto
  // no filtra» y «esto se nos olvido filtrar».
  vista: {
    sinLista: ({ total }) => `Estás viendo los ${total} pares. Si operas solo unos cuantos, elígelos y el Barrido se queda con ésos.`,
    elegir: 'Elegir mis pares',
    viendo: ({ viendo, total }) => `Viendo ${viendo} de ${total} pares`,
    mis: ({ n }) => `Mis pares (${n})`,
    todos: ({ n }) => `Todos (${n})`,
    nota: 'El ranking de fuerza de las divisas y las tarjetas de información se quedan enteros: comparan unos pares con otros, así que recortarlos cambiaría lo que dicen.',
    vacio: 'Ninguno de tus pares está en el barrido de hoy. Toca «Todos» para verlos.',
  },

  // MIS AVISOS — la pantalla donde cada persona programa lo suyo.
  //
  // ⚠️ SE LLAMA `misAvisos` Y NO `avisos` A PROPOSITO: `avisos` ya existe mas
  // abajo y es el del interruptor de notificaciones. Al escribir esto meti un
  // segundo bloque `avisos` sin verlo, y JavaScript **se queda con el ultimo y
  // tira el otro en silencio** — habria dejado el interruptor sin textos en
  // los 13 idiomas. Hay una comprobacion en `prueba-idiomas.mjs` que ahora
  // falla si una clave de primer nivel aparece dos veces.
  //
  // ⚠️ El aviso de que esto NO son señales va PRIMERO, antes de cualquier
  // control. Aqui lo caro no es leer mal un numero: es creer que lo que suena
  // es una recomendacion de la app. Mismo criterio que en las tasas y el COT.
  misAvisos: {
    titulo: 'Mis avisos',
    aviso:
      'Esto NO son señales de la app: los niveles los pones tú. La app te avisa de que pasó lo que pediste, y no te dice qué hacer con ello.',
    desc: 'Eliges tus pares y pones tus propios niveles. Cuando el mercado llega ahí, te llega un aviso al celular.',

    seguimientoTitulo: 'Mis pares',
    seguimientoDesc: 'Toca los pares que te interesan. Después, en el Barrido, puedes ver solo ésos o verlos todos — tú eliges.',
    seguimientoVacio: 'Sin ninguno elegido se ven TODOS los pares. Elige los tuyos para quitar ruido.',
    seguimientoPie: 'Toca otra vez un par para quitarlo de la lista.',

    nuevoTitulo: 'Poner un aviso nuevo',
    campoPar: 'Par',
    campoTipo: 'De qué',
    campoLado: 'Cuándo',
    campoNivel: 'Nivel',
    tipoPrecio: 'Precio',
    tipoBanda: 'Banda de Bollinger (%B)',
    tipoRsi: 'RSI',
    lado_sube: 'si sube hasta',
    lado_baja: 'si baja hasta',
    lado_arriba: 'si llega o pasa de',
    lado_abajo: 'si llega o baja de',
    ejemplo_precio: 'por ejemplo 1.1550',
    ejemplo_banda: 'por ejemplo -1',
    ejemplo_rsi: 'por ejemplo 30',
    anadir: 'Añadir el aviso',

    listaTitulo: (v) => `Mis avisos (${v.n} de ${v.max})`,
    listaVacia: 'Todavía no has puesto ninguno.',
    frase_precio_sube: 'si el precio sube hasta',
    frase_precio_baja: 'si el precio baja hasta',
    frase_banda_arriba: 'si el %B llega o pasa de',
    frase_banda_abajo: 'si el %B llega o baja de',
    frase_rsi_arriba: 'si el RSI llega o pasa de',
    frase_rsi_abajo: 'si el RSI llega o baja de',
    estadoEsperando: 'Esperando. Todavía no ha pasado.',
    estadoApagado: 'Apagado. No va a sonar.',
    estadoSono: (v) => `Ya sonó (${v.veces} de ${v.max} veces). Vuelve a armarlo para que suene otra vez.`,
    encender: 'Encender',
    apagar: 'Apagar',
    rearmar: 'Volver a armar',
    borrar: 'Borrar',

    // ⚠️ El pie dice las tres cosas que la persona tiene derecho a saber antes
    // de fiarse de un aviso: de donde sale el precio, cada cuanto se mira y
    // que puede llegar con retraso. Callarlas lo haria mas bonito y menos
    // honesto.
    pie: 'El precio sale del bróker del desarrollador de las apps, no del tuyo, y se mira cada 15 minutos — así que un aviso puede llegar con unos minutos de diferencia. Si no lo ves, se repite a los 15 y a los 30 minutos, y se calla en cuanto abres esta pantalla.',

    // Los mensajes del aviso que llega al celular. Van como funciones porque
    // llevan numeros dentro y cada idioma ordena la frase distinto.
    msgSubio: (v) => `${v.par} subió hasta ${v.nivel}. Compra ${v.bid}, venta ${v.ask} (precio de hace ${v.minutos} min).`,
    msgBajo: (v) => `${v.par} bajó hasta ${v.nivel}. Compra ${v.bid}, venta ${v.ask} (precio de hace ${v.minutos} min).`,
    msgBandaArriba: (v) => `${v.par}: el %B llegó a ${v.valor} (pediste ${v.nivel} o más).`,
    msgBandaAbajo: (v) => `${v.par}: el %B llegó a ${v.valor} (pediste ${v.nivel} o menos).`,
    msgRsiArriba: (v) => `${v.par}: el RSI llegó a ${v.valor} (pediste ${v.nivel} o más).`,
    msgRsiAbajo: (v) => `${v.par}: el RSI llegó a ${v.valor} (pediste ${v.nivel} o menos).`,
    // El titulo de la notificacion. El de RECORDATORIO es distinto a
    // proposito: sin eso, el segundo aviso se leeria como que el precio
    // volvio a tocar el nivel, y `tocaRepetir` NO vuelve a mirar el precio.
    notiTitulo: (v) => `Tu aviso · ${v.par}`,
    notiTituloRecordatorio: (v) => `Recordatorio · ${v.par}`,

    // Lo que puede salir mal al guardar. Son CODIGOS y no frases porque los
    // decide `alertas.js`, que corre tambien fuera del navegador.
    err_vacio: 'Falta llenar el aviso.',
    err_sinPar: 'Elige un par.',
    err_parDesconocido: 'Ese par no está en esta app.',
    err_tipoDesconocido: 'Elige de qué quieres el aviso.',
    err_ladoDesconocido: 'Elige cuándo quieres que suene.',
    err_nivelNoEsNumero: 'Escribe un número en el nivel.',
    err_precioNoPositivo: 'El precio tiene que ser mayor que cero.',
    err_rsiFueraDeRango: 'El RSI va de 0 a 100.',
    err_bandaFueraDeRango: 'El %B normal va entre -3 y 3.',
    err_demasiados: 'Ya tienes el máximo de avisos. Borra uno para poner otro.',
    err_demasiadosPares: 'Demasiados pares seguidos.',
    err_sinSesion: 'No se pudo guardar: no hay sesión.',
    err_sinPermiso:
      'No se pudo guardar. Las reglas de seguridad de la base de datos todavía no permiten guardar avisos — hay que publicarlas.',
    err_noSeGuardo: 'No se pudo guardar. Prueba otra vez.',
  },

  nav: { historial: 'Historial',
    avisos: 'Avisos',
    barrido: 'Barrido',
    diario: 'Diario',
    riesgo: 'Riesgo',
    miembros: 'Miembros',
  },

  // Valores calculados que se muestran traducidos pero por dentro siguen en
  // español (son la salida de clasificar() y de tend).
  sesgo: {
    COMPRA: 'COMPRA',
    VENTA: 'VENTA',
    VIGILAR: 'VIGILAR',
    '—': '—',
  },
  tend: {
    Alcista: 'Alcista',
    Bajista: 'Bajista',
    Rango: 'Rango',
  },
  lado: {
    COMPRA: 'COMPRA',
    VENTA: 'VENTA',
  },
  direccion: {
    Compra: 'Compra',
    Venta: 'Venta',
  },

  sesion: {
    solape: 'Solape Londres-Nueva York (máxima liquidez)',
    londres: 'Londres',
    nuevaYork: 'Nueva York',
    asia: 'Asia / Sídney',
  },

  // QUÉ ES ESTA APP, Y QUÉ NO ES. Lo pidió Néstor con sus palabras: «mis apps
  // no venden, por ahora, señales para copiar, y eso quiero que las apps lo
  // dejen bien claro».
  //
  // ⚠️ `liston` es FUNCIÓN y lee el número de `OPS_PARA_CREER`: escrito a mano
  // envejecería solo en los 13 idiomas, que es lo que le pasó a
  // `medicion.queSignifica` durante meses.
  //
  // ⚠️ Y dice «SI alguno pasa su listón», nunca «cuando»: van nueve familias
  // medidas y nueve que no pasan, así que prometer el resultado sería afirmar
  // algo que todavía no existe.
  queEs: {
    titulo: 'Qué es esta app, y qué no es',
    desc: 'Información para ahorrar tiempo, no señales para copiar',
    paraQue: 'Para que sepas exactamente qué estás mirando antes de poner dinero. Se lee una vez y vale para todas las pantallas.',
    avance: 'Nada de lo que ves aquí es una señal para copiar: son experimentos en marcha, y la app te enseña cuánto les falta para que su número signifique algo.',
    informacion: 'Esta app es INFORMACIÓN. Reúne en un sitio lo que de otro modo te llevaría una hora de mirar gráficos: qué divisas están fuertes y cuáles débiles, qué noticias vienen, cuánto cuesta abrir una operación y cuánto mantenerla, qué pares se mueven juntos. Eso es lo que te ahorra tiempo y te deja decidir a tiempo cuando vas a operar.',
    experimentos: 'La dirección, el Stop-loss y el Take-profit que ves en pantalla son EXPERIMENTOS: reglas armadas con ciertas medidas e indicadores, que la app anota cada día y resuelve con precios reales para saber si funcionan o no. Están ahí para que veas cómo evolucionan, no para copiarlas.',
    liston: ({ meta }) => `Cada experimento tiene que llegar a ${meta} operaciones reales antes de que su resultado signifique algo. Con menos, un número alto y un número bajo son el mismo número — y eso lo dice la aritmética, no una opinión.`,
    quienDecide: 'Cuando un experimento llega a esas operaciones, quien decide es el desarrollador de la app: seguir midiéndolo, cambiar a otros experimentos o, si el resultado es bueno, empezar a darlo como señal. Si el resultado es malo, también se informa.',
    privilegio: 'Mientras tanto tienes el privilegio de acompañar las mediciones desde dentro: ves los mismos números que ve el desarrollador, con sus aciertos y sus fallos, el mismo día. Y si alguno pasa su listón, quien esté suscrito en ese momento tendrá esas señales gratis durante unas semanas antes de que suba el precio de la suscripción.',
    puedeQueNo: 'Y puede que ninguno lo pase. Eso también es un resultado y se cuenta igual: esta app enseña sus propios números aunque salgan malos.',
    riesgo: 'Nada de esto es asesoría financiera. Operar en Forex tiene riesgo alto y puedes perder tu dinero. Las decisiones son tuyas.',
  },
  compr: {
    titulo: ({ n }) => "Compresión y rango (§)".replace('§', n),
    desc: "Cuánto se ha estrechado el movimiento de cada par",
    paraQue: "Para saber si el par viene apretado antes de abrir. Importa porque el stop de esta app sale del ATR: si el par se ha estrechado, el stop sale más corto de lo normal y el costo de entrar pesa más sobre un stop corto. NO dice hacia dónde va a ir el precio.",
    aviso: "⚠️ Esto NO tiene dirección. Un par apretado puede soltarse hacia arriba o hacia abajo, y también puede seguir apretado semanas. Lo único que mide es cuánto se mueve ahora comparado con antes.",
    nivel: {
      muy: "Muy apretado",
      algo: "Algo apretado",
      normal: "Normal",
      ancho: "Más suelto de lo normal",
    },
    recorrido: ({ atr }) => "recorrido típico § pips".replace('§', atr),
    posicion: ({ pct }) => "el precio va al § % de su rango".replace('§', pct),
    seguidas: ({ n }) => (n === 1 ? "lleva 1 vela estrecha" : "lleva § velas estrechas seguidas".replace('§', n)),
    avisoStop: "⚠️ Con el movimiento así, el stop sale más corto de lo normal para este par: el costo de entrar pesa más.",
    fibDe: ({ desde, hasta }) => "Niveles del último movimiento, de §D a §H".replace('§D', desde).replace('§H', hasta),
    pie: "Los niveles son geometría del último movimiento, no una predicción: nadie ha medido aquí qué hace el precio al llegar a ellos. Y las palabras («muy apretado», «normal») dicen qué tan raro es el valor: los cortes salen de los percentiles de la distribución medida de este mercado — «muy apretado» es el 10 % más estrecho y «más suelto» el 10 % más ancho. El número va siempre al lado porque la palabra orienta y el número es el dato.",
  },

  barrido: {
    titulo: 'Barrido de hoy',
    tituloLargo: 'Barrido diario · Forex',
    sinConfigurar: 'Esta copia todavía no tiene configurada la fuente de precios en vivo.',
    sinConfigurarLargo:
      'Esta copia todavía no tiene configurada la fuente de precios en vivo (Twelve Data). En cuanto se agregue la llave, el barrido se calcula solo.',
    sinConexion: ({ fecha }) => `⚠ Sin conexión — mostrando el último precio guardado, del ${fecha}.`,
    descargando: 'Descargando precios…',
    descargandoLargo: 'Descargando 7 meses de precios diarios…',
    pie: 'Velas diarias reales (máximo, mínimo y cierre). Análisis educativo, no asesoría financiera.',
    verTablero: 'Ver tablero completo →',
    errorPrecios: ({ detalle }) => `No se pudieron obtener los precios en vivo (${detalle}). Revisa la conexión y recarga.`,
  },

  tablero: {
    volver: '← Volver',
    sesionActiva: 'Sesión activa:',
    fuerzaRelativa: 'Fuerza relativa por divisa',
    pares: 'Pares — precio, tendencia y filtros',
    mejoresComprar: 'Mejores para comprar',
    mejoresVender: 'Mejores para vender',
    enVigilancia: 'En vigilancia',
    setups: 'Setups del top',
    sinCompras: 'Hoy no hay compras con fuerza y tendencia alineadas — no forzar entradas.',
    sinVentas: 'Hoy no hay ventas con fuerza y tendencia alineadas — no forzar entradas.',
    // Por qué el barrido ya no sugiere ventas. Sin jerga y sin excusas: se
    // midió, no funcionaban, se quitaron.
    ventasPausadas:
      'De momento la app no sugiere ventas. Medimos las reglas sobre los últimos 10 meses de mercado y las operaciones de venta perdían dinero de forma constante, mientras que las de compra no. Preferimos no sugerirte nada antes que sugerirte algo que sabemos que pierde. El barrido sigue mostrando arriba qué divisas están débiles, que eso sí es información buena.',
    atrPorHora: ({ v }) => `ATR ${v}%`,
    riesgoTitulo: 'Riesgo:',
    riesgoTexto:
      '1-2% del capital por operación. Varias posiciones en la misma divisa no son operaciones independientes — son una sola apuesta con más tamaño.',
    limitacionesTitulo: 'Limitaciones:',
    limitaciones:
      'Velas diarias reales con máximo, mínimo y cierre: el ATR es un ATR de Wilder verdadero y los soportes y resistencias salen de los máximos y mínimos reales. Una vela por día, sin intradía. El barrido no usa tick volume ni el spread del bróker — la liquidez se estima cualitativamente. El spread REAL del bróker se muestra aparte, mientras el puente de MT5 esté encendido.',
    educativo: 'Análisis educativo, no asesoría financiera personalizada. Operar Forex conlleva riesgo de pérdida.',
    descargarMd: '↓ Descargar reporte .md',
    pieFuerza: 'Promedio ponderado del cambio % de cada divisa contra las otras 7 (1d 20%, 5d 40%, 20d 40%), reescalado 0-10.',
    pieParesGrafico: 'Gráfico y variación (%) sobre los últimos 20 cierres diarios. ATR: ATR de Wilder sobre velas diarias reales (máximo, mínimo y cierre).',
    dif: 'Dif',
    pivoteLinea: ({ p, s1, r1 }) => `Pivote ${p} · S1 ${s1} · R1 ${r1}`,
    sufijoVelas: '20d',
  },

  reversion: {
    marca: 'EXPERIMENTO',
    titulo: 'La regla contraria',
    explica:
      'Estas señales hacen lo OPUESTO a las de arriba: compran la divisa que se cayó, no la que sube. Es la única regla que ha medido positivo en este proyecto. Se muestran aparte, y a propósito, para que nunca se confundan con las señales normales.',
    ojoContrario:
      'Por eso el mismo par puede salir aquí como COMPRA y arriba como VENTA. No es un error: es exactamente lo que significa «contraria».',
    enBanco: 'En el banco de pruebas (5 años)',
    enReal: 'En operaciones reales hasta hoy',
    aviso:
      'Son muy pocas operaciones todavía. No decide nada: se enseña para que puedas seguirla mientras acumula resultados. No es una recomendación de compra ni de venta.',
    vacio: 'Hoy no hay ninguna señal de esta regla.',
  },

  // El toque de banda de Bollinger, la quinta regla en pruebas. Enseñada en
  // el tablero desde el 2026-10-20, a petición de Néstor.
  //
  // ⚠️ `explica` cuenta lo que midió CON PALABRAS y no con cifras, a
  // propósito: en este proyecto hay dos casos escritos de un número a mano que
  // se quedó viejo enseñando una pérdida como ganancia. Las cifras reales las
  // cuenta `AvisoSombra` leyendo el historial en vivo.
  bandas: {
    titulo: 'El toque de banda (Bollinger)',
    explica:
      'Estas señales NO miran la fuerza de las divisas: miran si el precio se salió de su banda normal. Compran cuando se sale por debajo y venden cuando se sale por arriba. En el banco de pruebas midió un poco a favor contando solo el spread, y EN CONTRA contando el swap de cada noche — o sea que ni su propia prueba la aprueba. Está aquí para poder seguirla, no para operarla.',
    ojoContrario:
      'Puede señalar los MISMOS pares que las señales de arriba y con la dirección al revés. No es un error: no mira lo mismo. Si ves un par repetido con el lado contrario, son dos reglas distintas opinando.',
  },

  setup: {
    soporte: 'Soporte',
    resistencia: 'Resistencia',
    entrada: 'Entrada',
    stopLoss: 'Stop-loss',
    takeProfit: 'Take-profit',
    rb: 'R/B',
    invalida: 'Invalida:',
    verDetalle: 'Ver la señal en detalle →',
    pivotes: ({ s2, s1, p, r1, r2 }) => `Pivotes de sesión — S2 ${s2} · S1 ${s1} · P ${p} · R1 ${r1} · R2 ${r2}`,
  },

  detalle: {
    encabezado: 'Detalle de la señal',
    volver: '← Volver',
    sinDatos:
      'Este setup viene de un barrido guardado antes de esta versión, así que no trae los datos del gráfico. Recarga la app para verlo completo.',
    pip2: '1 pip = 0.01',
    pip4: '1 pip = 0.0001',
    granularidad: 'una vela por día',
    graficoAria: ({ n, par, precio, sl, tp }) =>
      `Últimos ${n} cierres de ${par}. Precio ahora ${precio}, stop-loss ${sl}, objetivo ${tp}.`,
    hace: ({ n }) => `hace ${n} días`,
    sinVelas: 'cierres · sin velas',
    rangoDia: 'máx · mín · cierre',
    ahora: 'último',
    riesgoBeneficio: 'Riesgo / beneficio',
    barraAria: ({ pct }) => `El riesgo es ${pct} por ciento de la operación.`,
    riesgoPips: ({ n }) => `Riesgo ${n} pips`,
    beneficioPips: ({ n }) => `Beneficio ${n} pips`,
    rbBajo: 'Por debajo de 1:1.5 — arriesgas casi lo mismo que puedes ganar. Considera saltarte este.',
    escenarioCompra: 'Escenario de compra',
    escenarioVenta: 'Escenario de venta',
    escenarioTexto: ({ fuerte, debil, direccion, accion, precio, tp, ema }) =>
      `${fuerte} es la divisa fuerte del barrido y ${debil} va rezagada, con el par en tendencia ${direccion}. ${accion} de ${precio}, con el objetivo en ${tp}. Mejor entrada en un retroceso hacia la EMA20 (${ema}).`,
    alcista: 'alcista',
    bajista: 'bajista',
    comprarPorEncima: 'Comprar por encima',
    venderPorDebajo: 'Vender por debajo',
    nivelActual: 'actual',
    nivelSesion: 'sesión',
    nivelMax20: 'máx. 20',
    nivelMin20: 'mín. 20',
    pivote: 'Pivote',
    // Rótulos cortos dibujados dentro del gráfico: si son largos se salen.
    etqResistencia: 'RESIST.',
    etqPivote: 'PIVOTE',
    etqSoporte: 'SOPORTE',
    porQue: 'Por qué aparece',
    chipExtendido: ' · extendido',
    chipContinuacion: ' · continuación',
    chipEmas: 'EMA20/50 alineadas',
    seInvalida: ({ cond }) => `Se invalida con un ${cond}`,
    sinInvalidacion: 'Sin condición de invalidación.',
    anotar: 'Anotar en el Diario',
    copiar: 'Copiar niveles',
    copiado: 'Copiado',
    aviso:
      'Los niveles salen del barrido, no de un bróker. La app no ejecuta operaciones: “Anotar en el Diario” solo llena tu registro con estos datos para que después midas el resultado.',
    copiaEntrada: ({ v }) => `Entrada: ${v}`,
    copiaSl: ({ v }) => `Stop-loss: ${v}`,
    copiaTp: ({ v }) => `Take-profit: ${v}`,
    copiaRb: ({ v }) => `Riesgo/beneficio: 1:${v}`,
    copiaPips: ({ riesgo, beneficio }) => `Riesgo ${riesgo} pips · beneficio ${beneficio} pips`,
    notaDiario: ({ niveles }) => `Setup del barrido intradía${niveles}`,
  },

  diario: {
    titulo: 'Diario de operaciones',
    operaciones: 'Operaciones',
    ganadas: '% ganadas',
    pl: 'P/L (USD)',
    lote: 'Lote (ej. 0.10)',
    resultado: 'Resultado USD (±)',
    sigueAbierta: 'Sigue abierta (todavía sin resultado)',
    notas: 'Notas (setup, qué aprendiste…)',
    guardar: 'Guardar operación',
    riesgoConcentrado: '⚠ Riesgo concentrado',
    avisoConcentrado: ({ n, moneda, pares }) =>
      `Tienes ${n} operaciones abiertas con ${moneda} (${pares}) — no son apuestas independientes, es una sola apuesta más grande a esa divisa.`,
    cargando: 'Cargando operaciones…',
    abierta: 'Abierta',
    cerrar: 'Cerrar',
    borrar: 'Borrar',
    borrarSeguro: '¿Borrar?',
    loteSufijo: 'lote',
    vacioTitulo: 'Tu diario está vacío',
    vacioPorque: 'Apuntar lo que haces es lo que convierte esta app en algo que te dice cosas sobre TI, y no solo sobre el mercado.',
    vacioImportar: 'Importar del bróker',
    vacioSenales: 'Ver las señales de hoy',
    promptCerrar: ({ par }) => `Resultado final de ${par} (USD, usa - para pérdida):`,
  },

  importar: {
    paraQue: 'Sirve para no copiar a mano lo que tu bróker ya tiene apuntado. Entra el resultado NETO, con el swap y la comisión ya descontados, que es lo único que dice de verdad si ganaste o perdiste.',
    aviso: {
      vacio: 'El archivo está vacío.',
      sinTabla: 'No se encontró ninguna tabla en el archivo.',
      sinColumnas: 'No se reconocieron las columnas. El archivo debe traer una fila de encabezados con al menos el símbolo y el tipo de operación.',
      sinResultado: 'No se encontró la columna de resultado: las operaciones entran con 0.',
      saltadasPorPar: ({ n, pares }) => `Se saltó ${n === 1 ? 'una operación' : `${n} operaciones`} de instrumentos que esta app no analiza (oro, índices, acciones o pares fuera de los ${pares} que sigue).`,
      saltadasPorTipo: ({ n }) => `Se saltó ${n === 1 ? 'una fila que no era' : `${n} filas que no eran`} una compra ni una venta.`,
      otrasTablas: ({ n }) => `Se dejaron fuera ${n} ${n === 1 ? 'fila que estaba' : 'filas que estaban'} en otras tablas del informe (órdenes y transacciones): son la misma operación contada de otra forma.`,
      nadaAprovechable: 'Se leyeron filas, pero ninguna resultó ser una operación aprovechable.',
    },
    titulo: "Importar operaciones del bróker",
    desc: 'Sube el informe de MT4 o MT5 y tus operaciones entran solas, ya con el resultado neto.',
    explicacion: "Exporta tu historial desde MT4 («Guardar como informe detallado») o MT5 («Informe») y súbelo aquí. También sirve un CSV. Nada se guarda hasta que lo confirmes.",
    elegir: "Elegir archivo…",
    errorLeer: "No se pudo leer el archivo.",
    errorGuardar: "No se pudieron guardar todas las operaciones.",
    hecho: ({ n }) => `${n} operaciones añadidas al Diario.`,
    entran: "operaciones nuevas entrarán al Diario",
    repetidas: ({ n }) => `${n} ya estaban registradas y no se repetirán.`,
    resultadoTotal: "Resultado total (con swap y comisión):",
    yMas: ({ n }) => `…y ${n} más`,
    confirmar: ({ n }) => `Añadir las ${n}`,
    cancelar: "Cancelar",
    guardando: "Guardando…",
  },

  medicion: {
    paraQue: 'Un backtest es volver a pasar las reglas por el mercado del pasado para ver qué habrían dado. Los traders lo usan para saber si una estrategia tiene ventaja ANTES de arriesgar dinero en ella. Aquí está el nuestro, salga como salga.',
    titulo: 'Prueba sobre 5 años de mercado real',
    desc: 'Qué habría dado esta app si hubiera existido desde 2021.',
    avance: ({ acierto, valor }) => `Acierta el ${acierto}% de las veces y aun así pierde ${valor} por cada dólar arriesgado.`,
    intro: ({ dias, desde, hasta }) => `Recalculamos el barrido día a día sobre ${dias} días de mercado real (${desde} a ${hasta}), como si la app hubiera estado funcionando todo ese tiempo, y descontamos el spread de cada par y el swap de cada noche.`,
    laApp: "La app tal cual, con sus niveles",
    varaNeutra: "La misma app, con vara neutra (stop y objetivo a igual distancia)",
    reversion: "La regla de reversión (todavía apagada, corriendo en la sombra)",
    pieLinea: ({ ops, acierto }) => `${ops} operaciones · ${acierto}% acertadas`,
    queSignifica: ({ acierto }) => `El número grande es lo que se gana o se pierde por cada dólar arriesgado. Fíjate en las dos primeras filas: la app acierta el ${acierto}% y aun así pierde. Eso pasa porque el objetivo está más cerca que el stop, así que se acierta muchas veces poco y se falla pocas veces mucho. Por eso el porcentaje de acierto, solo, no dice nada.`,
    porQueLoContamos: "Te lo enseñamos porque es tu dinero. Otras apps presumen de tener un motor para medir esto y no publican el resultado; si fuera bueno, sería lo primero de su página. Usa el barrido para mirar el mercado más rápido y decidir tú, no como una orden de compra.",
    fechado: ({ fecha }) => `Medido el ${fecha}. Un mercado distinto puede cambiar estos números.`,
  },

  clima: {
    sol: "Despejado",
    solNubes: "Sol y nubes",
    nublado: "Nublado",
    niebla: "Niebla",
    tormenta: "Tormenta",
    solAyuda: "Tendencia clara y fuerza detrás, sin estirarse todavía.",
    solNubesAyuda: "Hay tendencia, pero la fuerza es floja o el movimiento ya se hizo.",
    nubladoAyuda: "Sin dirección clara: el precio va y viene.",
    nieblaAyuda: "Lateral y sin fuerza: no se ve nada, mejor no adivinar.",
    tormentaAyuda: "Movimiento muy amplio: el stop se va a poner a prueba opere lo que opere.",
  },

  calc: {
    titulo: 'Calculadora de lote y riesgo',
    capital: 'Capital de la cuenta (USD)',
    riesgoPct: 'Riesgo % (1-2)',
    stopPips: 'Stop en pips',
    riesgoUsd: 'Riesgo USD',
    valorPip: 'Valor del pip',
    porLote: '/ lote',
    loteSugerido: 'Lote sugerido',
    lotes: 'lotes',
    completa: 'Completa los campos',
    cargandoTasas: 'Cargando tasas…',
    sinTasas: 'Sin tasas disponibles',
    equivale: 'Equivale a',
    miniMicro: ({ mini, micro }) => `${mini} mini · ${micro} micro`,
    errorTasa: ({ causa }) =>
      `No se pudo obtener la tasa de cambio (${causa}). Esta calculadora la necesita para convertir el valor del pip a dólares.`,
    sinConexion: 'sin conexión',
    error: 'error',
    pie: 'Valor del pip calculado con la tasa de cambio de referencia más reciente, por lote estándar (100.000 unidades). Verifica el valor exacto con tu bróker: el spread y el apalancamiento cambian el resultado real.',
  },

  miembros: {
    titulo: 'Miembros',
    intro: 'Aprueba las solicitudes para dar acceso, o retira a cualquiera cuando quieras. Los cambios se aplican al instante para todos.',
    cargando: 'Cargando miembros…',
    aprobar: 'Aprobar',
    retirar: 'Retirar',
    confirmarRetiro: ({ nombre }) => `¿Retirar a ${nombre}?`,
    vacio: 'Sin solicitudes todavía. Comparte la app para que se inscriban.',
    estadoAprobado: 'aprobado',
    estadoPendiente: 'pendiente',
    estadoRetirado: 'retirado',
    reactivar: 'Reactivar',
    fechaVence: 'Fecha de vencimiento',
    sinVence: 'sin vencimiento',
    venceHoy: 'vence hoy',
    venceEn: ({ dias }) => `faltan ${dias} días`,
    vencioHace: ({ dias }) => `venció hace ${dias} días`,
    masCiclo: ({ dias }) => `+${dias} días`,
    venceAyuda: 'La fecha de vencimiento dice hasta cuándo puede entrar esa persona. Cada noche, un robot le cierra la puerta a quien se le pasó (con un día de margen). Sin fecha = acceso abierto, que es lo que tienen todos hoy. El botón de +30 días suma desde la fecha que ya tenía, así que renovar antes de tiempo no cuesta días. Vale para las dos apps: comparten la misma lista de miembros.',
  },

  calendario: {
    paraQue: 'Los traders lo miran para elegir la HORA de entrar: minutos antes de un dato fuerte el precio pega saltos y el spread se abre, así que es cuando más caro sale equivocarse. No dice hacia dónde se va a mover, solo cuándo va a haber sacudida.',
    titulo: ({ n }) => `Calendario económico (${n})`,
    desc: 'Noticias que pueden mover el precio',
    aviso: (v) => `${v.div}: dato importante en ${v.h} h`,
    intro: 'Datos económicos que pueden mover el precio de golpe. No cambian ninguna señal de la app: están aquí para que sepas a qué hora conviene no estar entrando a ciegas.',
    alto: 'Mueve mucho',
    medio: 'Mueve algo',
    festivo: 'Festivo',
    cat: {
      tipos: 'Tipos de interés',
      inflacion: 'Inflación',
      empleo: 'Empleo',
      crecimiento: 'Crecimiento',
      ventas: 'Ventas',
      actividad: 'Actividad de las empresas',
      comercio: 'Comercio exterior',
      discurso: 'Habla un banquero central',
      festivo: 'Festivo: menos movimiento',
    },
    cuantos: (v) => `Se muestran los ${v.n} de las próximas 48 horas. Esta semana hay ${v.total} en total.`,
    previsto: 'previsto',
    anterior: 'anterior',
    viejo: 'Este calendario lleva más de un día sin actualizarse. Puede que falte algo de lo que viene.',
    pie: 'Solo se muestran los datos de impacto alto y medio de las 8 divisas del barrido; los de impacto bajo se omiten porque taparían los que sí importan. Las horas son las de tu teléfono. Fuente: ForexFactory.',
  },
  correl: {
    paraQue: 'Los traders la miran antes de abrir dos operaciones a la vez, para no repetir la misma apuesta sin darse cuenta. Dos pares que se mueven igual no reparten el riesgo: lo duplican, y si sale mal duele el doble.',
    titulo: ({ n }) => `Correlación entre pares (${n})`,
    desc: 'Pares que se mueven casi igual',
    intro: 'Antes de abrir dos operaciones a la vez, mira si estos pares van del brazo. Si van juntos, no estás repartiendo el riesgo: estás haciendo la misma apuesta con el doble de tamaño.',
    juntos: 'Se mueven juntos',
    opuestos: 'Se mueven al revés',
    pie: 'Medido sobre los cambios de precio de las últimas 60 sesiones. De 0 a 1: mientras más cerca de 1, más se parecen. El signo menos quiere decir que van en direcciones contrarias, y eso es el mismo riesgo.',
  },
  glosario: {
    paraQue: 'Si hay una palabra de las tablas que no reconoces, búscala aquí. Son los términos que vas a encontrar en cualquier plataforma de trading, no inventos de esta app: aprenderlos te sirve dentro y fuera de aquí.',
    titulo: 'Glosario',
    desc: '¿Qué significan estos términos?',
    terminos: [
      ['Fuerza relativa', 'Qué tan fuerte o débil está una divisa comparada con las otras 7, promediando su cambio de precio reciente. Más alto = más fuerte.'],
      ['Sesgo', 'La inclinación de un par ahora mismo: si conviene más buscar compras o ventas, según qué divisa está más fuerte.'],
      ['Tendencia', 'Si el precio viene subiendo, bajando, o está lateral (sin dirección clara) en las últimas semanas.'],
      ['RSI', 'Mide si un par está "sobrecomprado" (subió muy rápido, podría corregir) o "sobrevendido" (bajó muy rápido). Va de 0 a 100; por encima de 70 o por debajo de 30 son zonas para vigilar.'],
      ['ATR%', 'Qué tanto se mueve el precio de un par en un día normal, en porcentaje. Sirve para poner un stop-loss con espacio razonable, ni muy ajustado ni muy amplio.'],
      ['EMA20 / EMA50', 'El precio promedio de los últimos 20 o 50 días, dándole más peso a los días recientes. Sirve para ver la dirección general sin el ruido de cada día suelto.'],
      ['R/B (riesgo/beneficio)', 'Cuánto se puede ganar comparado con cuánto se arriesga. Un R/B de 2 significa que la ganancia esperada es el doble de lo que se arriesga.'],
      ['Soporte / Resistencia', 'Niveles de precio donde el par ha tenido dificultad para seguir bajando (soporte) o subiendo (resistencia) en el pasado.'],
      ['Stop-loss', 'El precio donde se cierra la operación automáticamente si va en contra, para limitar la pérdida.'],
      ['Take-profit', 'El precio donde se cierra la operación automáticamente si va a favor, para asegurar la ganancia.'],
      ['Invalidación', 'La señal de que la idea de la operación ya no aplica. Si el precio la toca, lo prudente es salir aunque el stop-loss no se haya activado todavía.'],
    ],
  },

  // Textos que arma marketCalc con los números del barrido metidos dentro.
  calc_barrido: {
    reversionCompra: ({ b, fb, q, fq, rsi }) =>
      `${b} (${fb}) está por debajo de ${q} (${fq}) y el precio se estiró a la baja con RSI ${rsi}: se compra el rebote, no la tendencia.`,
    reversionVenta: ({ b, fb, q, fq, rsi }) =>
      `${b} (${fb}) está por encima de ${q} (${fq}) y el precio se estiró al alza con RSI ${rsi}: se vende la corrección, no la tendencia.`,
    razon: ({ b, fb, q, fq, rsi, extra }) => `${b} (${fb}) vs ${q} (${fq}), EMAs alineadas, RSI ${rsi}${extra}`,
    rsiExtendido: ' — RSI extendido, no perseguir, esperar retroceso',
    rsiContinuacion: ' — RSI en zona de continuación',
    vigilancia: ({ dif, favor, tend }) =>
      `Diferencial ${dif} a favor de ${favor}, pero el par sigue en ${tend} — fuerza sin confirmación técnica todavía.`,
    entrada: ({ precio, ema }) => `${precio} actual · mejor en retroceso a EMA20 (${ema})`,
    slCompra: ' (bajo el mínimo de 10 días − ½ ATR)',
    slVenta: ' (sobre el máximo de 10 días + ½ ATR)',
    rbBajo: ' ⚠ por debajo de 1:1.5',
    invalCompra: ({ sl, b }) => `cierre diario por debajo de ${sl}, o pérdida de fuerza de ${b} en el ranking.`,
    invalVenta: ({ sl, q }) => `cierre diario por encima de ${sl}, o recuperación de fuerza de ${q}.`,
    corte: ({ fecha }) => `Datos al cierre del ${fecha} · velas diarias`,
    fuenteVivo: 'Twelve Data + Capital.com (precio en vivo)',
    fuenteCierre: 'Twelve Data',
  },

  avisos: {
    // Se le dice al miembro por qué están apagados, en vez de dejar el
    // interruptor puesto y que se quede esperando un aviso que no va a llegar.
    // Sin tecnicismos y sin excusas: se probaron las reglas, no funcionaron.
    pausados: 'Avisos en pausa mientras revisamos las señales',
    pausadosPorque:
      'Medimos las reglas de la app sobre los últimos 10 meses de mercado y las señales que llegaban a avisarte no acertaban lo suficiente. Preferimos no avisarte de nada antes que avisarte de algo que te haga perder dinero. La app sigue mostrando el barrido y sigue anotando cada señal para comprobar la corrección; los avisos vuelven cuando los números lo respalden.',
    titulo: 'Avisos al celular',
    desc: 'Te avisamos apenas el vigía detecte una señal nueva, aunque tengas la app cerrada.',
    activar: 'Activar avisos',
    activando: 'Activando…',
    desactivar: 'Desactivar',
    activados: 'Avisos activados en este aparato',
    probar: 'Probar',
    pruebaTitulo: 'Aviso de prueba',
    pruebaCuerpo: 'Si ves esto, los avisos funcionan en este aparato.',
    noSoportado: 'Este navegador no puede recibir avisos. Prueba con Chrome en Android o Safari en iPhone.',
    iosSinInstalar: 'En iPhone y iPad los avisos solo llegan si la app está instalada en la pantalla de inicio. Toca Compartir y luego «Añadir a inicio», y vuelve a abrir la app desde ese ícono.',
    denegado: 'Los avisos están bloqueados para esta app. Hay que volver a permitirlos desde los ajustes del navegador o del celular.',
    fallo: 'No se pudieron activar los avisos. Inténtalo de nuevo.',
    soloEsteAparato: 'Los avisos se activan por aparato: si usas la app en el celular y en el computador, actívalos en cada uno.',
  },

  riesgoSenales: {
    titulo: ({ n }) => `Señales de hoy que no son independientes (${n})`,
    intro: 'Estas parejas se mueven casi igual, así que abrir las dos no reparte el riesgo: según la dirección de cada una, lo dobla o lo anula. No se apaga ninguna señal, la decisión es tuya.',
    dobla: 'Misma apuesta, del doble de tamaño',
    anula: 'Se anulan entre sí: pagas dos spreads para nada',
    pie: 'El número ya cuenta la dirección de cada señal: positivo se suman, negativo se restan. Medido con los cambios diarios de las últimas 60 sesiones.',
  },

  plegable: {
    paraQue: 'Para qué sirve',
    ver: 'Ver',
    cerrar: 'Cerrar',
  },

  sombra: {
    aviso: ({ ops, meta }) =>
      `Todavía NO se puede tomar como señal: lleva ${ops} de las ${meta} operaciones reales que hacen falta para creerle, salga el número como salga.`,
    margen: ({ ops, m }) =>
      `Con una muestra de ${ops}, ese porcentaje puede moverse ±${m} puntos solo por casualidad.`,
  },

// Las señales del día de las reglas que corren en pruebas. Ver
  // `components/SenalesSombra.jsx` — el aviso va ANTES de cualquier número a
  // propósito: aquí lo caro no es leer mal un dato, es creer que esta lista es
  // lo que la app propone.
  sombraSenales: {
    titulo: 'Lo que señalaron las reglas en pruebas',
    desc: 'Las cuatro reglas que el vigía anota sin proponerlas',
    paraQue: 'Para poder seguirlas día a día en vez de esperar meses a su porcentaje: qué par marcó cada una, hacia dónde y con qué niveles. NO dice cuál operar — son experimentos sin validar, y por eso van aparte de las señales de la app.',
    avance: ({ n }) => `${n} señales a la vista`,
    aviso: 'ESTO NO ES LO QUE LA APP PROPONE. Son reglas EN OBSERVACIÓN: el vigía las anota para medirlas con operaciones reales, nadie recibió aviso de ellas y ninguna ha pasado todavía su listón.',
    varaVieja: 'Geometría vieja: el stop y el objetivo no son los que se midieron al aprobar esta regla. No cuenta para su historial.',
    sinSenales: 'Esta regla todavía no ha señalado nada.',
    pieCarry: 'A favor / en contra del diferencial dice hacia qué lado juega el swap mientras la operación siga abierta. La diferencia de tasas NO es el swap: el bróker le suma un margen que no publica nadie y que además es desigual. Esto da el lado, no el número.',
    carry: {
      aFavor: 'Swap a favor',
      enContra: 'Swap en contra',
      neutro: 'Swap: apenas pesa',
    },
  },
  // El corte pares con dólar / cruces. Ver `components/MidePositivo.jsx` —
  // el aviso va ANTES de cualquier número a propósito: aquí lo caro no es
  // leer mal un dato, es creer que esta lista es lo que la app propone o que
  // el corte está confirmado.
  corte: {
    titulo: "Lo que mide positivo: pares con dólar y cruces",
    desc: "En qué grupo de pares ha medido bien cada regla, y cuáles de hoy caen ahí",
    paraQue: "Para ver si una señal de hoy cae en el grupo de pares donde su regla ha medido bien o en el que ha medido mal. NO dice cuál operar y no apaga ninguna: la app sigue proponiendo sus 14 pares igual que antes.",
    avance: ({ n }) => `${n} señales en el grupo bueno`,
    aviso: "ESTO NO ES LO QUE LA APP PROPONE NI UNA SEÑAL NUEVA: son las mismas señales de arriba, agrupadas de otra forma. Y el corte se encontró MIRANDO los resultados, sobre los mismos días, así que ningún registro hacia adelante lo ha confirmado todavía. Nada se ha encendido ni apagado.",
    montonDolar: "solo en pares con dólar",
    montonCruces: "solo en cruces (los que no llevan dólar)",
    pasa: "PASÓ EL LISTÓN",
    noPasa: "NO PASÓ EL LISTÓN",
    porQueNoPasa: ({ n, piso }) => `Deja ${n} señales al mes y el mínimo son ${piso}: aunque el número sea bueno, no hay suficientes para creerle.`,
    yConcentracion: "Y además un solo par aporta demasiado de la mejora.",
    enSuMonton: "En su grupo de pares",
    conLos14: "Con los 14 pares",
    control: "El grupo contrario (control)",
    conSwap: "Pagando swap cada noche",
    mitades: "Las dos mitades del periodo",
    ops: "ops",
    fuera: ({ n }) => `Señales de esta regla que hoy caen en el grupo que mide negativo: ${n}.`,
    sinSenales: "Hoy ninguna de sus señales cae en este grupo.",
    pieCorrelacion: "Los 7 pares con dólar se mueven casi todos juntos: está medido que cinco señales con dólar pueden ser una sola apuesta dicha cinco veces. Ganar más por operación y repartir menos el riesgo no es automáticamente mejor.",
    pieFecha: ({ fecha, dias }) => `Medido el ${fecha} sobre ${dias} días de mercado real, con el spread de cada par descontado y la vara neutra: stop y objetivo a la misma distancia.`,
  },
  historial: {
    esBollinger: 'BOLLINGER',
    bollingerTitulo: 'Historial de «el toque de banda»',
    bollingerIntro:
      'La quinta regla: entra cuando el precio se sale de su banda de Bollinger y apuesta a que vuelve. ⚠️ Está EN OBSERVACIÓN y sin validar, y hay dos cosas que hay que saber: esta versión se eligió DESPUÉS de ver los resultados de la prueba, y en esa prueba YA perdía al contar el swap de cada noche. No es una recomendación.',
    esRuptura: 'RUPTURA DE ESTRUCTURA',
    rupturaTitulo: 'Historial de «ruptura de estructura»',
    rupturaIntro:
      'La cuarta regla, que entra cuando el precio rompe el último máximo o mínimo que marcó. ⚠️ Está EN OBSERVACIÓN y sin validar. No es una recomendación — se enseña para que se pueda seguir, no para operarla.',
    rsiTitulo: "¿Van mejor las más estiradas?",
    rsiAviso: "Esto NO dice qué daría la regla con un umbral más exigente. La app se queda con los 3 mejores por lado, así que con otro umbral subirían al hueco pares que hoy no entran, en otras fechas. Esto es solo el reparto de lo que ya se anotó.",
    rsiEstiradas: ({ u }) => `Las que también pasarían con RSI ${u}`,
    rsiResto: ({ u, v }) => `Las que solo pasaron por el ${v} (RSI entre ${u} y ${v})`,
    esReversion: 'REVERSIÓN',
    esCaida: "COMPRAR LA CAÍDA",
    caidaVieja: ({ n, acierto, pips }) => `Antes de esto se anotaron ${n} operaciones con un stop y un objetivo que no eran los que se midieron al aprobar la regla. NO cuentan, y el historial de esta regla vuelve a empezar desde cero (aquéllas daban ${acierto} % y ${pips} pips). Se dejan a la vista porque ocurrieron de verdad.`,
    caidaTitulo: "Historial de «comprar la caída»",
    caidaIntro:
      "La tercera regla, que compra el par el día que toca su punto más bajo de 10 días. Va aparte porque es otro experimento distinto: mezclarla con las demás no respondería ninguna de las preguntas.",
    reversionTitulo: 'Historial de la regla contraria',
    reversionIntro:
      'Las mismas cuentas, pero de la regla que compra lo que se cayó. Van aparte a propósito: cada experimento es distinto y juntarlos no respondería ninguna de las preguntas.',
    titulo: 'Historial de señales',
    intro: 'Lo que la app propuso y qué pasó después. Los experimentos van más abajo, cada uno con su propia cuenta.',
    appTitulo: 'Las señales de la app',
    pie: 'Los pips salen del objetivo y el stop que puso la app: NO incluyen el spread ni el swap, así que en una cuenta real el resultado es algo peor. Si un mismo día se toca el stop y el objetivo cuenta como perdida, porque la vela diaria no dice cuál pasó primero. El día en que aparece la señal no cuenta: la entrada es a su cierre.',
    cargando: 'Cargando el historial…',
    error: 'No se pudo cargar el historial. Revisa la conexión.',
    vacio: 'Todavía no hay ninguna señal.',
    vacioLargo: 'El vigía revisa el mercado una vez al día y anota aquí lo que encuentra. En cuanto aparezca la primera señal, la verás.',
    acierto: 'Acierto',
    operaciones: 'Operaciones',
    pips: 'Pips netos',
    sinJuzgar: 'Sin juzgar todavía',
    ganada: 'Acertó',
    perdida: 'Falló',
    abierta: 'En curso',
    caducada: 'Sin datos',
  },

  // Precios en vivo del bróker (puente de MetaTrader 5). Ojo: Bid, Ask, Spread
  // y Pip NO se traducen en ningún idioma — son los nombres que usa cualquier
  // plataforma de trading, y cambiarlos confundiría más de lo que ayudaría.
  vivo: {
    titulo: 'Lo que cuesta abrir la operación',
    desc: (v) => `Precio de compra y de venta directo de MetaTrader 5. Es lo único que muestra el spread REAL que cobra el bróker — el barrido de arriba trabaja con velas y no lo sabe. ⚠️ Son los de ${v.cuenta}: si tu bróker es otro, tus números serán distintos.`,
    cuentaGenerica: "los de una cuenta real del desarrollador de las apps",
    cargando: 'Buscando los últimos precios…',
    sinDatos: 'Todavía no hay precios del bróker. El puente los publica solo mientras el computador donde corre MetaTrader 5 está encendido.',
    vieja: (v) => `Estos precios se tomaron hace más de ${v.h} h. El puente estaba apagado; sirven de referencia, no como precio de ahora.`,
    par: 'Par',
    bid: 'Compra',
    ask: 'Venta',
    spread: 'Spread',
    actividad: 'Actividad',
    actividadPie:
      'Actividad: cuántas veces cambió el precio hoy, según este bróker. NO dice hacia dónde ni cuánto: un par puede cambiar 8.000 veces y acabar donde empezó. Tampoco es volumen — en Forex no existe uno real, porque no hay bolsa central que lo apunte. Compara pares entre sí ahora mismo, no días entre sí: el día va a medias.',
    pie: (v) => `Spread en pips, en ámbar si pasa de 3. Tomado el ${v.hora}.`,
  },

  // De cuándo es el barrido que estás viendo. Es INFORMACIÓN, no una alarma:
  // no apaga ni cambia ninguna señal. Van como FUNCIONES porque llevan el
  // número dentro y cada idioma ordena la frase distinto.
  frescura: {
    // Lo MEDIDO, y solo donde se midió. Dice que esa parte de las señales ya
    // no se puede tomar —el precio se pasó del stop o ya llegó al objetivo—,
    // NO que la app acierte menos: el acierto no se movió en toda la tabla.
    coste: (v) => `${v.pct} de cada 100 señales de hace ${v.horas} h ya no se pueden tomar`,
    generadoMin: (v) => `Generado hace ${v.n} min`,
    generadoH: (v) => `Generado hace ${v.n} h`,
    generadoDias: (v) => `Generado hace ${v.n} ${v.n === 1 ? 'día' : 'días'}`,
  },

  tasas: {
    paraQue: 'Los traders las miran cuando una operación va a quedar abierta de un día para otro: dicen en qué pares el interés juega a tu favor noche tras noche y en cuáles en tu contra. No es la cifra exacta que te cobrará el bróker.',
    titulo: 'Tasas de interés y swap',
    desc: 'Lo que cuesta mantenerla abierta',
    aviso:
      '⚠️ Esto NO es el swap que te va a cobrar tu bróker. Es la diferencia entre las tasas de los bancos centrales, que es de donde el swap SALE. Tu bróker le suma un margen que no publica nadie y que además es desigual: en una dirección pagas y en la otra a veces cobras, pero casi nunca lo mismo. Sirve para saber el sentido y el tamaño aproximado, no la cifra.',
    intro:
      'La divisa de la izquierda del par paga esta diferencia al año respecto a la de la derecha. Cuanto más arriba, más pesa mantener esa operación abierta noche tras noche.',
    lado: {
      compra: 'Suele jugar a favor si compras',
      venta: 'Suele jugar a favor si vendes',
      neutro: 'Casi la misma tasa: apenas pesa',
    },
    cabeceraSueltas: 'Tasa de cada banco central',
    subio: (v) => `Subió desde ${v.de} % · ${v.cuando}`,
    bajo: (v) => `Bajó desde ${v.de} % · ${v.cuando}`,
    haceDias: (v) => `hace ${v.n} ${v.n === 1 ? 'día' : 'días'}`,
    haceMeses: (v) => `hace ${v.n} ${v.n === 1 ? 'mes' : 'meses'}`,
    haceAnios: (v) => `hace ${v.n} ${v.n === 1 ? 'año' : 'años'}`,
    pieTendencia:
      'La flecha dice de qué tasa viene la de hoy y cuánto lleva en ese nivel. Una divisa sin flecha no se movió dentro de la ventana que la app mira: eso no dice que su banco central esté en pausa, solo que ahí dentro no cambió.',
    pie: (v) => `Fuente: BIS (Banco de Pagos Internacionales). El BIS publica con unos días de retraso, así que la fecha de cada fila es hasta cuándo llega SU dato — no el día en que ese banco decidió. La más antigua es de hace ${v.dias} días.`,
  },

  oro: {
    paraQue: 'Los traders miran el oro porque suele moverse al revés que el dólar y porque sube cuando hay nervios en el mercado. Pero eso es una costumbre, no una ley: aquí no te lo decimos, te enseñamos el número medido de cuánto se ha movido junto a cada par en las últimas 60 sesiones, y tú decides si te sirve.',
    titulo: 'Oro',
    desc: 'Cuánto se mueve con tus pares',
    aviso: '⚠️ Esto NO es una señal. El oro no dice comprar ni vender ningún par. Lo que hay abajo es cuánto se han movido JUNTOS en los últimos tres meses — un hecho sobre el pasado, no una predicción. Y que dos cosas se muevan juntas no quiere decir que una mueva a la otra.',
    dolares: 'dólares por onza',
    enUnDia: 'En un día',
    enVeinteDias: 'En 20 días',
    intro: 'Se mide sobre el cambio de cada día, no sobre el precio, y sobre las sesiones que tienen dato en los dos. Cuanto más arriba, más se parecen sus movimientos.',
    cabeceraCorrel: 'Cuánto se mueve el oro con cada par',
    juntos: 'Se mueven juntos',
    alReves: 'Se mueven al revés',
    sobreDias: (v) => `${v.n} sesiones en común`,
    sinCorrel: 'Ningún par se ha movido de forma parecida al oro en las últimas sesiones. Eso también es un dato: hoy el oro no te dice nada sobre estos catorce.',
    pie: (v) => `Fuente: Twelve Data, precio al contado (XAU/USD), dato del ${v.fecha} — hace ${v.dias} días. El número va de −1 a +1: cerca de +1 se mueven casi igual, cerca de −1 al revés, y cerca de 0 no se parecen. Cada fila dice sobre cuántas sesiones se calculó.`,
  },

  cot: {
    paraQue: 'Los traders lo miran para saber si una apuesta ya está muy llena: cuando casi todos los grandes están del mismo lado, queda poca gente por entrar y mucha por salir. Es contexto de fondo, semanal y con retraso. No dice qué par operar ni cuándo.',
    titulo: 'Commitments of Traders',
    desc: 'Lo que tienen comprado los grandes',
    aviso: '⚠️ Esto NO dice comprar ni vender. Son posiciones en futuros del CME, una parte pequeña del mercado Forex, y llegan con días de retraso: la CFTC publica los viernes con los datos del martes anterior. Y un posicionamiento extremo unos lo leen como que la tendencia sigue y otros como que se va a dar la vuelta. No está medido cuál acierta.',
    intro: 'Cuánto tienen comprado o vendido los fondos especulativos —lo que la CFTC llama leveraged funds— en cada divisa, como porcentaje de todos los contratos abiertos. Cada divisa va contra el dólar.',
    comprados: 'Netos comprados',
    vendidos: 'Netos vendidos',
    igualados: 'Igualados',
    cambio: (v) => `${v.n} contratos esta semana`,
    sinCambio: 'Sin cambio esta semana',
    indice: 'El dólar contra una cesta, no contra una sola divisa',
    percentil: (v) => `Más comprado que en el ${v.pct} % de sus últimas ${v.n} semanas`,
    percentilVendido: (v) => `Más vendido que en el ${v.pct} % de sus últimas ${v.n} semanas`,
    esMaximo: (v) => `Lo MÁS comprado de sus últimas ${v.n} semanas`,
    esMinimo: (v) => `Lo MÁS vendido de sus últimas ${v.n} semanas`,
    piePercentil:
      'Cada porcentaje se compara con la historia de SU divisa, no con las otras siete. Eso importa porque cada divisa tiene su propia costumbre: en una que casi siempre está vendida, un número negativo puede ser lo más comprado que ha estado en tres años, mientras que ese mismo número en otra sería de lo más normal. Y un extremo no dice qué va a pasar: unos lo leen como que la tendencia sigue y otros como que se da la vuelta.',
    pie: (v) => `Fuente: CFTC, informe del ${v.fecha} (hace ${v.dias} días). Solo futuros, sin opciones. Entre 3 y 10 días de antigüedad es lo normal: se publica los viernes con los datos del martes. La barra solo sirve para comparar de un vistazo; el número es el dato.`,
  },

  diag: {
    paraQue: 'Los traders revisan sus propios números para encontrar dónde pierden sin darse cuenta: un tipo de par, una dirección o un par concreto. Con pocas operaciones no significa nada, y por eso cada porcentaje lleva su margen pegado.',
    titulo: ({ n }) => `Tus números por grupos (${n})`,
    desc: 'Tus operaciones separadas por tipo de par, por dirección y por par.',
    aviso: 'Esto cuenta lo que TÚ hiciste, nada más. No es un consejo, no dice qué operar y no tiene nada que ver con lo que la app señala.',
    ops: 'ops',
    tipo: 'Por tipo de par',
    cruces: 'Cruces (sin dólar)',
    dolar: 'Pares con dólar',
    direccion: 'Por dirección',
    pares: ({ n }) => `Por par (desde ${n} operaciones)`,
    lote: ({ min, max, distintos }) => `Lot: del ${min} al ${max}, ${distintos} tamaños distintos.`,
    pie: 'El ± es cuánto puede moverse ese porcentaje solo por azar. Con pocas operaciones es enorme: con 10 es ±31 puntos, o sea que un 40 % y un 70 % son el mismo número.',
    moneda: 'Es como tirar una moneda: si la tiras 10 veces y salen 7 caras, no está trucada — eso pasa todo el rato. Si la tiras 400 y salen 280, ahí sí pasa algo. Con tus operaciones es igual.',
  },

  estac: {
    titulo: 'Estacionalidad',
    desc: 'Cuánto se mueve el par según el calendario',
    paraQue: 'Para saber cuándo el mercado está vivo y cuándo está dormido en el par que ya elegiste. Si una hora o un día se mueve la mitad que los demás, un stop calculado para lo normal se queda ancho y el objetivo lejos. NO dice hacia dónde va a ir el precio: dice cuánto suele recorrer.',
    aviso: '⚠️ Esto mide CUÁNTO se mueve, no HACIA DÓNDE. Un par puede moverse mucho y acabar donde empezó. No elige el par: ayuda a elegir el momento del par que ya elegiste por otras razones.',
    par: 'Par',
    porDia: 'Recorrido por día de la semana',
    pieDia: (v) => `Cada día sale de ${v.n} velas. Se quitan sábados y domingos: son velas que el proveedor manda igual, con una fracción del recorrido real, y contarlas hundiría la media de los días que sí existen.`,
    porMes: 'Recorrido por mes',
    pieMes: (v) => `Cada mes sale de ${v.n} días, no de unos pocos meses. Por eso este panel sí se puede leer y el de abajo no.`,
    direccion: 'Dirección por mes',
    avisoDireccion: '⚠️ ESTA TABLA NO DECIDE NADA, y está aquí para que veas por qué. Cada mes sale de unas 14 observaciones, así que su margen es de ±26 puntos: un 70 % y un 48 % son el mismo número. Lo comprobamos con un mercado inventado al azar, sin ninguna estacionalidad dentro, y su tabla decía «febrero 71 %, julio 29 %» — 42 puntos salidos de nada. Es la tabla que te venden por ahí, y casi nadie te pone el margen al lado.',
    pieDireccion: 'Cuenta en cuántos de los meses de la serie el par cerró por encima de donde abrió. Los meses a medias no se cuentan.',
    pocosDatos: (v) => `pocos datos: ${v.n}`,
    deMeses: (v) => `subieron ${v.verdes} de ${v.n}`,
    tramo: (v) => `Datos del ${v.desde} al ${v.hasta} · ${v.n} velas`,
  },
  errores: {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Prueba en "Ingresar".',
    'auth/invalid-email': 'Ese correo no parece válido.',
    'auth/weak-password': 'La clave debe tener al menos 6 caracteres.',
    'auth/missing-password': 'Escribe una clave.',
    'auth/user-not-found': 'Correo o clave incorrectos, o aún no estás inscrito.',
    'auth/wrong-password': 'Correo o clave incorrectos, o aún no estás inscrito.',
    'auth/invalid-credential': 'Correo o clave incorrectos, o aún no estás inscrito.',
    'auth/invalid-login-credentials': 'Correo o clave incorrectos, o aún no estás inscrito.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentar.',
    'auth/network-request-failed': 'No hay conexión a internet. Revisa tu señal y vuelve a intentar.',
    generico: 'Algo salió mal. Inténtalo de nuevo.',
  },
}
