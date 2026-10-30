// English. Technical terms stay untranslated: RSI, ATR, EMA, Stop-loss,
// Take-profit, Pip, Spread, R/B, Forex. Direction shows as BUY/SELL.

export default {
  comun: { salir: 'Sign out', eyebrow: 'TRADING · FX', administrador: 'Administrator', idioma: 'Language' },

  splash: {
    lema: 'Daily market scan, trading journal and risk management.',
    entrar: 'Enter',
    iniciaSesion: 'Access your account',
  },

  auth: {
    ingresar: 'Sign in',
    inscribirse: 'Sign up',
    correo: 'Email',
    clave: 'Password',
    ingresando: 'Signing in…',
    nombreCompleto: 'Full name',
    creaClave: 'Create a password (min. 6 characters)',
    enviando: 'Sending…',
    enviarSolicitud: 'Send request',
    notaSolicitud: 'Your request stays pending until Néstor approves it.',
    faltanCampos: 'Fill in name, email and password.',
    faltanCredenciales: 'Enter your email and password.',
  },

  pendiente: {
    titulo: 'Request pending',
    mensaje: 'Your request stays pending until Néstor approves it.',
    nota: 'This screen updates on its own: as soon as Néstor approves your request, you will be let in automatically without doing anything else.',
    retirado: 'Your access was revoked. Write to Néstor if you think this is a mistake.',
  },

  // La pantalla de último recurso, cuando algo falla al dibujarse.
  // La usa RedDeSeguridad.jsx, que las lee SIN pasar por React: si esta
  // clave faltara, cae al español en vez de dejar la pantalla en blanco.
  error: {
    titulo: 'Something went wrong',
    cuerpo: 'This screen failed to load. Your data and your trades are safe — this is a display problem, not an account problem.',
    boton: 'Reload the app',
    detalle: 'Technical details',
  },

  nav: { historial: 'History', barrido: 'Scan', diario: 'Journal', riesgo: 'Risk', miembros: 'Members' },

  sesgo: { COMPRA: 'BUY', VENTA: 'SELL', VIGILAR: 'WATCH', '—': '—' },
  tend: { Alcista: 'Uptrend', Bajista: 'Downtrend', Rango: 'Range' },
  lado: { COMPRA: 'BUY', VENTA: 'SELL' },
  direccion: { Compra: 'Buy', Venta: 'Sell' },

  sesion: {
    solape: 'London-New York overlap (peak liquidity)',
    londres: 'London',
    nuevaYork: 'New York',
    asia: 'Asia / Sydney',
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
    titulo: 'What this app is, and what it is not',
    desc: 'Information to save you time, not signals to copy',
    paraQue: 'So you know exactly what you are looking at before you put money on it. Read it once; it applies to every screen.',
    avance: 'Nothing you see here is a signal to copy: these are experiments in progress, and the app shows you how far they still are from meaning anything.',
    informacion: 'This app is INFORMATION. It gathers in one place what would otherwise take you an hour of staring at charts: which currencies are strong and which are weak, what news is coming, what it costs to open a trade and what it costs to hold it, which pairs move together. That is what saves you time and lets you decide in time when you are about to trade.',
    experimentos: 'The direction, the Stop-loss and the Take-profit you see on screen are EXPERIMENTS: rules built from certain measures and indicators, which the app records every day and settles against real prices to find out whether they work or not. They are there so you can watch them evolve, not so you can copy them.',
    liston: ({ meta }) => `Each experiment has to reach ${meta} real trades before its result means anything. With fewer, a high number and a low number are the same number — and that is arithmetic, not an opinion.`,
    quienDecide: 'When an experiment reaches those trades, the person who decides is the app developer: keep measuring it, switch to other experiments, or — if the result is good — start giving it as a signal. If the result is bad, you are told that too.',
    privilegio: 'In the meantime you have the privilege of following the measurements from the inside: you see the same numbers the developer sees, hits and misses alike, on the same day. And if any of them clears its bar, whoever is subscribed at that moment will get those signals free for a few weeks before the subscription price goes up.',
    puedeQueNo: 'And it may be that none of them clears it. That is a result too and it gets reported the same way: this app shows its own numbers even when they look bad.',
    riesgo: 'None of this is financial advice. Trading Forex carries high risk and you can lose your money. The decisions are yours.',
  },
  compr: {
    titulo: ({ n }) => "Compression and range (§)".replace('§', n),
    desc: "How much each pair’s movement has narrowed",
    paraQue: "To know whether a pair comes in tight before you open. It matters because this app’s stop comes from the ATR: if the pair has narrowed, the stop lands shorter than usual and the cost of entering weighs more on a short stop. It does NOT say which way price will go.",
    aviso: "⚠️ This has NO direction. A tight pair can break upward or downward, and it can also stay tight for weeks. All it measures is how much it moves now compared with before.",
    nivel: {
      muy: "Very tight",
      algo: "Somewhat tight",
      normal: "Normal",
      ancho: "Looser than usual",
    },
    recorrido: ({ atr }) => "typical range § pips".replace('§', atr),
    posicion: ({ pct }) => "price sits at §% of its range".replace('§', pct),
    seguidas: ({ n }) => (n === 1 ? "1 narrow candle so far" : "§ narrow candles in a row".replace('§', n)),
    avisoStop: "⚠️ With movement like this the stop lands shorter than usual for this pair: the cost of entering weighs more.",
    fibDe: ({ desde, hasta }) => "Levels of the last move, from §D to §H".replace('§D', desde).replace('§H', hasta),
    pie: "The levels are geometry of the last move, not a prediction: nobody here has measured what price does when it reaches them. And the words (“very tight”, “normal”) say how unusual the value is: the cut-offs come from the percentiles of this market's measured distribution — “very tight” is the tightest 10 % and “looser” the widest 10 %. The number is always next to them because the word orients and the number is the data.",
  },

  barrido: {
    titulo: "Today's scan",
    tituloLargo: 'Daily scan · Forex',
    sinConfigurar: 'This copy does not have the live price source configured yet.',
    sinConfigurarLargo:
      'This copy does not have the live price source configured yet (Twelve Data). As soon as the key is added, the scan runs on its own.',
    sinConexion: ({ fecha }) => `⚠ Offline — showing the last saved price, from ${fecha}.`,
    descargando: 'Downloading prices…',
    descargandoLargo: 'Downloading 7 months of daily prices…',
    pie: 'Real daily candles (high, low and close). Educational analysis, not financial advice.',
    verTablero: 'See full dashboard →',
    errorPrecios: ({ detalle }) => `Live prices could not be fetched (${detalle}). Check your connection and reload.`,
  },

  tablero: {
    ventasPausadas:
      'For now the app does not suggest sells. We measured the rules over the last 10 months of market data and the sell trades lost money consistently, while the buys did not. We would rather suggest nothing than suggest something we know loses. The scan still shows which currencies are weak up above — that part is good information.',
    volver: '← Back',
    sesionActiva: 'Active session:',
    fuerzaRelativa: 'Relative strength by currency',
    pares: 'Pairs — price, trend and filters',
    mejoresComprar: 'Best to buy',
    mejoresVender: 'Best to sell',
    enVigilancia: 'On watch',
    setups: 'Top setups',
    sinCompras: 'No buys today with strength and trend aligned — do not force entries.',
    sinVentas: 'No sells today with strength and trend aligned — do not force entries.',
    atrPorHora: ({ v }) => `ATR ${v}%`,
    riesgoTitulo: 'Risk:',
    riesgoTexto:
      '1-2% of capital per trade. Several positions in the same currency are not independent trades — they are a single, larger bet.',
    limitacionesTitulo: 'Limitations:',
    limitaciones:
      'Real daily candles with high, low and close: the ATR is a true Wilder ATR and supports and resistances come from real highs and lows. One candle per day, no intraday. The scan does not use tick volume or the broker spread — liquidity is estimated qualitatively. The REAL broker spread is shown separately, while the MT5 bridge is running.',
    educativo: 'Educational analysis, not personalized financial advice. Trading Forex carries risk of loss.',
    descargarMd: '↓ Download .md report',
    pieFuerza: "Weighted average of each currency's % change against the other 7 (1d 20%, 5d 40%, 20d 40%), rescaled 0-10.",
    pieParesGrafico: 'Chart and change (%) over the last 20 daily closes. ATR: Wilder ATR over real daily candles (high, low and close).',
    dif: 'Diff',
    pivoteLinea: ({ p, s1, r1 }) => `Pivot ${p} · S1 ${s1} · R1 ${r1}`,
    sufijoVelas: '20d',
  },

  reversion: {
    marca: 'EXPERIMENT',
    titulo: 'The opposite rule',
    explica:
      'These signals do the OPPOSITE of the ones above: they buy the currency that fell, not the one that is rising. It is the only rule that has measured positive in this project. They are shown separately, on purpose, so they are never confused with the normal signals.',
    ojoContrario:
      'That is why the same pair can show up here as BUY and above as SELL. It is not an error: it is exactly what «opposite» means.',
    enBanco: 'In the test bench (5 years)',
    enReal: 'In real trades so far',
    aviso:
      'These are still very few trades. It decides nothing: it is shown so you can follow it while it accumulates results. It is not a buy or sell recommendation.',
    vacio: 'No signals from this rule today.',
  },

  // El toque de banda de Bollinger, la quinta regla en pruebas. Enseñada en
  // el tablero desde el 2026-10-20, a petición de Néstor.
  //
  // ⚠️ `explica` cuenta lo que midió CON PALABRAS y no con cifras, a
  // propósito: en este proyecto hay dos casos escritos de un número a mano que
  // se quedó viejo enseñando una pérdida como ganancia. Las cifras reales las
  // cuenta `AvisoSombra` leyendo el historial en vivo.
  bandas: {
    titulo: 'The band touch (Bollinger)',
    explica:
      'These signals do NOT look at currency strength: they look at whether price left its normal band. They buy when it breaks out below and sell when it breaks out above. On the test bench it measured slightly in favour counting spread only, and AGAINST once the nightly swap is counted — so not even its own test approves it. It is here so you can follow it, not to trade it.',
    ojoContrario:
      'It can flag the SAME pairs as the signals above, with the direction reversed. That is not a bug: it is not looking at the same thing. A repeated pair with the opposite side means two different rules disagreeing.',
  },

  setup: {
    soporte: 'Support',
    resistencia: 'Resistance',
    entrada: 'Entry',
    stopLoss: 'Stop-loss',
    takeProfit: 'Take-profit',
    rb: 'R/B',
    invalida: 'Invalidated by:',
    verDetalle: 'See signal in detail →',
    pivotes: ({ s2, s1, p, r1, r2 }) => `Session pivots — S2 ${s2} · S1 ${s1} · P ${p} · R1 ${r1} · R2 ${r2}`,
  },

  detalle: {
    encabezado: 'Signal detail',
    volver: '← Back',
    sinDatos:
      'This setup comes from a scan saved before this version, so it does not carry the chart data. Reload the app to see it in full.',
    pip2: '1 pip = 0.01',
    pip4: '1 pip = 0.0001',
    granularidad: 'one candle per day',
    graficoAria: ({ n, par, precio, sl, tp }) =>
      `Last ${n} closes of ${par}. Price now ${precio}, stop-loss ${sl}, target ${tp}.`,
    hace: ({ n }) => `${n} days ago`,
    sinVelas: 'closes · no candles',
    rangoDia: 'high · low · close',
    ahora: 'last',
    riesgoBeneficio: 'Risk / reward',
    barraAria: ({ pct }) => `Risk is ${pct} percent of the trade.`,
    riesgoPips: ({ n }) => `Risk ${n} pips`,
    beneficioPips: ({ n }) => `Reward ${n} pips`,
    rbBajo: 'Below 1:1.5 — you risk almost as much as you can gain. Consider skipping this one.',
    escenarioCompra: 'Buy scenario',
    escenarioVenta: 'Sell scenario',
    escenarioTexto: ({ fuerte, debil, direccion, accion, precio, tp, ema }) =>
      `${fuerte} is the strong currency in the scan and ${debil} is lagging, with the pair in a ${direccion} trend. ${accion} ${precio}, targeting ${tp}. Best entry on a pullback to the EMA20 (${ema}).`,
    alcista: 'rising',
    bajista: 'falling',
    comprarPorEncima: 'Buy above',
    venderPorDebajo: 'Sell below',
    nivelActual: 'current',
    nivelSesion: 'session',
    nivelMax20: 'max 20',
    nivelMin20: 'min 20',
    pivote: 'Pivot',
    // Rótulos cortos dibujados dentro del gráfico: si son largos se salen.
    etqResistencia: 'RESIST.',
    etqPivote: 'PIVOT',
    etqSoporte: 'SUPPORT',
    porQue: 'Why it shows up',
    chipExtendido: ' · extended',
    chipContinuacion: ' · continuation',
    chipEmas: 'EMA20/50 aligned',
    seInvalida: ({ cond }) => `Invalidated by ${cond}`,
    sinInvalidacion: 'No invalidation condition.',
    anotar: 'Log in Journal',
    copiar: 'Copy levels',
    copiado: 'Copied',
    aviso:
      'These levels come from the scan, not from a broker. The app does not place trades: “Log in Journal” only fills your record with this data so you can measure the result later.',
    copiaEntrada: ({ v }) => `Entry: ${v}`,
    copiaSl: ({ v }) => `Stop-loss: ${v}`,
    copiaTp: ({ v }) => `Take-profit: ${v}`,
    copiaRb: ({ v }) => `Risk/reward: 1:${v}`,
    copiaPips: ({ riesgo, beneficio }) => `Risk ${riesgo} pips · reward ${beneficio} pips`,
    notaDiario: ({ niveles }) => `Setup from the intraday scan${niveles}`,
  },

  diario: {
    titulo: 'Trading journal',
    operaciones: 'Trades',
    ganadas: '% won',
    pl: 'P/L (USD)',
    lote: 'Lot (e.g. 0.10)',
    resultado: 'Result USD (±)',
    sigueAbierta: 'Still open (no result yet)',
    notas: 'Notes (setup, what you learned…)',
    guardar: 'Save trade',
    riesgoConcentrado: '⚠ Concentrated risk',
    avisoConcentrado: ({ n, moneda, pares }) =>
      `You have ${n} open trades involving ${moneda} (${pares}) — they are not independent bets, they are a single larger bet on that currency.`,
    cargando: 'Loading trades…',
    abierta: 'Open',
    cerrar: 'Close',
    borrar: 'Delete',
    borrarSeguro: 'Delete?',
    loteSufijo: 'lot',
    vacioTitulo: 'Your journal is empty',
    vacioPorque: 'Logging what you do is what turns this app into something that tells you about YOU, not just about the market.',
    vacioImportar: 'Import from broker',
    vacioSenales: 'See today’s signals',
    promptCerrar: ({ par }) => `Final result for ${par} (USD, use - for a loss):`,
  },

  importar: {
    paraQue: 'It saves you copying by hand what your broker has already written down. The NET result comes in, with swap and commission already deducted, which is the only thing that really says whether you won or lost.',
    aviso: {
      vacio: 'The file is empty.',
      sinTabla: 'No table was found in the file.',
      sinColumnas: 'The columns were not recognised. The file needs a header row with at least the symbol and the trade type.',
      sinResultado: 'No result column was found: trades are added with 0.',
      saltadasPorPar: ({ n, pares }) => `Skipped ${n === 1 ? 'one trade' : `${n} trades`} on instruments this app does not analyse (gold, indices, shares, or pairs outside the ${pares} it follows).`,
      saltadasPorTipo: ({ n }) => `Skipped ${n === 1 ? 'one row that was not' : `${n} rows that were not`} a buy or a sell.`,
      otrasTablas: ({ n }) => `Left out ${n} ${n === 1 ? 'row that was' : 'rows that were'} in other tables of the report (orders and deals): they are the same trade counted another way.`,
      nadaAprovechable: 'Rows were read, but none turned out to be a usable trade.',
    },
    titulo: "Import trades from your broker",
    desc: 'Upload your MT4 or MT5 report and your trades come in on their own, net result included.',
    explicacion: "Export your history from MT4 (\"Save as Detailed Report\") or MT5 (\"Report\") and upload it here. A CSV works too. Nothing is saved until you confirm.",
    elegir: "Choose file…",
    errorLeer: "The file could not be read.",
    errorGuardar: "Not all trades could be saved.",
    hecho: ({ n }) => `${n} trades added to the Journal.`,
    entran: "new trades will be added to the Journal",
    repetidas: ({ n }) => `${n} were already recorded and will not be duplicated.`,
    resultadoTotal: "Total result (swap and commission included):",
    yMas: ({ n }) => `…and ${n} more`,
    confirmar: ({ n }) => `Add all ${n}`,
    cancelar: "Cancel",
    guardando: "Saving…",
  },

  medicion: {
    paraQue: 'A backtest means running the rules over past market data to see what they would have produced. Traders use it to know whether a strategy has an edge BEFORE risking money on it. Here is ours, whatever it says.',
    titulo: 'Backtest over 5 years of real market',
    desc: 'What this app would have returned if it had existed since 2021.',
    avance: ({ acierto, valor }) => `It is right ${acierto}% of the time and still loses ${valor} per dollar risked.`,
    intro: ({ dias, desde, hasta }) => `We replayed the scan day by day across ${dias} days of real market (${desde} to ${hasta}), as if the app had been running that whole time, with each pair's spread and each night's swap deducted.`,
    laApp: "The app as it is, with its own levels",
    varaNeutra: "The same app, neutral yardstick (stop and target equally far)",
    reversion: "The reversal rule (still off, running in the shadows)",
    pieLinea: ({ ops, acierto }) => `${ops} trades · ${acierto}% won`,
    queSignifica: ({ acierto }) => `The big number is what is won or lost per dollar risked. Look at the first two rows: the app wins ${acierto}% of the time and still loses money. That happens because the target sits closer than the stop, so you win small often and lose big rarely. Which is why a win rate on its own tells you nothing.`,
    porQueLoContamos: "We show you this because it is your money. Other apps boast about having an engine to measure it and never publish the result; if it were good, it would be the first thing on their page. Use the scan to read the market faster and decide yourself, not as an order to buy.",
    fechado: ({ fecha }) => `Measured on ${fecha}. A different market can change these numbers.`,
  },

  clima: {
    sol: "Clear",
    solNubes: "Sun and clouds",
    nublado: "Cloudy",
    niebla: "Fog",
    tormenta: "Storm",
    solAyuda: "Clear trend with strength behind it, not yet overextended.",
    solNubesAyuda: "There is a trend, but strength is thin or the move already happened.",
    nubladoAyuda: "No clear direction: price goes back and forth.",
    nieblaAyuda: "Sideways and weak: nothing to see, better not to guess.",
    tormentaAyuda: "Very wide swings: your stop will be tested whatever you trade.",
  },

  calc: {
    titulo: 'Lot and risk calculator',
    capital: 'Account capital (USD)',
    riesgoPct: 'Risk % (1-2)',
    stopPips: 'Stop in pips',
    riesgoUsd: 'Risk USD',
    valorPip: 'Pip value',
    porLote: '/ lot',
    loteSugerido: 'Suggested lot',
    lotes: 'lots',
    completa: 'Fill in the fields',
    cargandoTasas: 'Loading rates…',
    sinTasas: 'No rates available',
    equivale: 'Equals',
    miniMicro: ({ mini, micro }) => `${mini} mini · ${micro} micro`,
    errorTasa: ({ causa }) =>
      `The exchange rate could not be fetched (${causa}). This calculator needs it to convert the pip value into dollars.`,
    sinConexion: 'offline',
    error: 'error',
    pie: 'Pip value computed with the most recent reference exchange rate, per standard lot (100,000 units). Check the exact value with your broker: spread and leverage change the real result.',
  },

  miembros: {
    titulo: 'Members',
    intro: 'Approve requests to grant access, or remove anyone whenever you want. Changes apply instantly for everyone.',
    cargando: 'Loading members…',
    aprobar: 'Approve',
    retirar: 'Remove',
    confirmarRetiro: ({ nombre }) => `Remove ${nombre}?`,
    vacio: 'No requests yet. Share the app so people can sign up.',
    estadoAprobado: 'approved',
    estadoPendiente: 'pending',
    estadoRetirado: 'removed',
    reactivar: 'Reactivate',
    fechaVence: 'Expiry date',
    sinVence: 'no expiry',
    venceHoy: 'expires today',
    venceEn: ({ dias }) => `${dias} days left`,
    vencioHace: ({ dias }) => `expired ${dias} days ago`,
    masCiclo: ({ dias }) => `+${dias} days`,
    venceAyuda: 'The expiry date is how long this person can get in. Every night a robot closes the door on anyone past it (with one day of margin). No date = open access, which is what everyone has today. The +30 days button adds to the date they already had, so renewing early does not cost days. It applies to both apps: they share the same member list.',
  },

  calendario: {
    paraQue: 'Traders check it to pick the HOUR to enter: minutes before a big release the price jumps and the spread widens, so that is when being wrong costs the most. It does not say which way the price will go, only when the shaking is coming.',
    titulo: ({ n }) => `Economic calendar (${n})`,
    desc: 'News that can move price',
    aviso: (v) => `${v.div}: major release in ${v.h} h`,
    intro: 'Economic releases that can move price sharply. They do not change any of the app signals: they are here so you know when not to be entering blind.',
    alto: 'Moves a lot',
    medio: 'Moves somewhat',
    festivo: 'Holiday',
    cat: {
      tipos: 'Interest rates',
      inflacion: 'Inflation',
      empleo: 'Jobs',
      crecimiento: 'Growth',
      ventas: 'Retail sales',
      actividad: 'Business activity',
      comercio: 'Foreign trade',
      discurso: 'A central banker speaks',
      festivo: 'Holiday: less movement',
    },
    cuantos: (v) => `Showing the ${v.n} due in the next 48 hours. There are ${v.total} this week in total.`,
    previsto: 'forecast',
    anterior: 'previous',
    viejo: 'This calendar has not been updated in over a day. Something upcoming may be missing.',
    pie: 'Only high and medium impact releases for the 8 currencies of the scan are shown; low impact ones are left out because they would bury the ones that matter. Times are your phone’s. Source: ForexFactory.',
  },
  correl: {
    paraQue: 'Traders check it before opening two trades at once, so as not to repeat the same bet without realising. Two pairs that move alike do not spread the risk: they double it, and if it goes wrong it hurts twice as much.',
    titulo: ({ n }) => `Correlation between pairs (${n})`,
    desc: 'Pairs that move almost alike',
    intro: 'Before opening two trades at once, check whether these pairs move together. If they do, you are not spreading risk: you are making the same bet at double the size.',
    juntos: 'They move together',
    opuestos: 'They move opposite',
    pie: 'Measured on the price changes of the last 60 sessions. From 0 to 1: the closer to 1, the more alike. A minus sign means they move in opposite directions, and that is the same risk.',
  },
  glosario: {
    paraQue: 'If there is a word in the tables you do not recognise, look it up here. These are the terms you will meet on any trading platform, not inventions of this app: learning them helps you inside and outside of here.',
    titulo: 'Glossary',
    desc: 'What do these terms mean?',
    terminos: [
      ['Relative strength', 'How strong or weak a currency is compared with the other 7, averaging its recent price change. Higher = stronger.'],
      ['Bias', 'Which way a pair leans right now: whether it is better to look for buys or sells, based on which currency is stronger.'],
      ['Trend', 'Whether price has been rising, falling, or moving sideways (no clear direction) over recent weeks.'],
      ['RSI', 'Measures whether a pair is "overbought" (rose too fast, may correct) or "oversold" (fell too fast). It runs from 0 to 100; above 70 or below 30 are zones to watch.'],
      ['ATR%', 'How much a pair\'s price moves on a normal day, as a percentage. Useful for placing a stop-loss with reasonable room, neither too tight nor too wide.'],
      ['EMA20 / EMA50', 'The average price of the last 20 or 50 days, giving more weight to recent days. Useful for seeing the general direction without the noise of any single day.'],
      ['R/B (risk/reward)', 'How much you can gain compared with how much you risk. An R/B of 2 means the expected gain is twice what you risk.'],
      ['Support / Resistance', 'Price levels where the pair has had trouble falling further (support) or rising further (resistance) in the past.'],
      ['Stop-loss', 'The price where the trade closes automatically if it goes against you, to cap the loss.'],
      ['Take-profit', 'The price where the trade closes automatically if it goes your way, to lock in the gain.'],
      ['Invalidation', 'The sign that the trade idea no longer applies. If price touches it, the prudent move is to exit even if the stop-loss has not triggered yet.'],
    ],
  },

  calc_barrido: {
    reversionCompra: ({ b, fb, q, fq, rsi }) =>
      `${b} (${fb}) is below ${q} (${fq}) and price is stretched to the downside with RSI ${rsi}: buying the bounce, not the trend.`,
    reversionVenta: ({ b, fb, q, fq, rsi }) =>
      `${b} (${fb}) is above ${q} (${fq}) and price is stretched to the upside with RSI ${rsi}: selling the pullback, not the trend.`,
    razon: ({ b, fb, q, fq, rsi, extra }) => `${b} (${fb}) vs ${q} (${fq}), EMAs aligned, RSI ${rsi}${extra}`,
    rsiExtendido: ' — RSI extended, do not chase, wait for a pullback',
    rsiContinuacion: ' — RSI in the continuation zone',
    vigilancia: ({ dif, favor, tend }) =>
      `Spread ${dif} in favor of ${favor}, but the pair is still in ${tend} — strength without technical confirmation yet.`,
    entrada: ({ precio, ema }) => `${precio} current · better on a pullback to EMA20 (${ema})`,
    slCompra: ' (below the 10-day low − ½ ATR)',
    slVenta: ' (above the 10-day high + ½ ATR)',
    rbBajo: ' ⚠ below 1:1.5',
    invalCompra: ({ sl, b }) => `daily close below ${sl}, or ${b} losing strength in the ranking.`,
    invalVenta: ({ sl, q }) => `daily close above ${sl}, or ${q} regaining strength.`,
    corte: ({ fecha }) => `Data as of the close of ${fecha} · daily candles`,
    fuenteVivo: 'Twelve Data + Capital.com (live price)',
    fuenteCierre: 'Twelve Data',
  },

  vivo: {
    titulo: 'What it costs to open the trade',
    desc: (v) => `Bid and ask straight from MetaTrader 5. It is the only thing that shows the REAL spread the broker charges — the scan above works on candles and cannot know it. ⚠️ These are from ${v.cuenta}: if your broker is another one, your numbers will differ.`,
    cuentaGenerica: 'a live account',
    cargando: 'Fetching the latest prices…',
    sinDatos: 'No broker prices yet. The bridge publishes them only while the computer running MetaTrader 5 is switched on.',
    vieja: (v) => `These prices were taken over ${v.h} h ago. The bridge was off; treat them as a reference, not as the price right now.`,
    par: 'Pair',
    bid: 'Bid',
    ask: 'Ask',
    spread: 'Spread',
    actividad: 'Activity',
    actividadPie:
      'Activity: how many times the price changed today, according to this broker. It does NOT say which way or how far: a pair can change 8,000 times and end where it started. Nor is it volume — no real volume exists in Forex, because there is no central exchange to record it. Compare pairs with each other right now, not days with each other: the day is only half done.',
    pie: (v) => `Spread in pips, amber above 3. Taken on ${v.hora}.`,
  },
  avisos: {
    pausados: 'Alerts paused while we review the signals',
    pausadosPorque:
      'We measured the app rules over the last 10 months of market data, and the signals that reached the alert stage were not accurate enough. We would rather tell you nothing than tell you something that makes you lose money. The app still shows the scan and still records every signal to check how accurate it is; alerts come back when the numbers support it.',
    titulo: 'Phone alerts',
    desc: 'We alert you as soon as the watcher spots a new signal, even with the app closed.',
    activar: 'Turn on alerts',
    activando: 'Turning on…',
    desactivar: 'Turn off',
    activados: 'Alerts are on for this device',
    probar: 'Test',
    pruebaTitulo: 'Test alert',
    pruebaCuerpo: 'If you can see this, alerts work on this device.',
    noSoportado: 'This browser cannot receive alerts. Try Chrome on Android or Safari on iPhone.',
    iosSinInstalar: 'On iPhone and iPad, alerts only arrive if the app is installed on the home screen. Tap Share, then «Add to Home Screen», and reopen the app from that icon.',
    denegado: 'Alerts are blocked for this app. You need to allow them again in your browser or phone settings.',
    fallo: 'Alerts could not be turned on. Please try again.',
    soloEsteAparato: 'Alerts are set per device: if you use the app on your phone and your computer, turn them on in each one.',
  },

  riesgoSenales: {
    titulo: ({ n }) => `Today's signals that are not independent (${n})`,
    intro: 'These pairs move almost identically, so opening both does not spread your risk: depending on each direction, it doubles it or cancels it out. No signal is turned off — the decision is yours.',
    dobla: 'Same bet, twice the size',
    anula: 'They cancel out: you pay two spreads for nothing',
    pie: "The number already accounts for each signal's direction: positive means they add up, negative means they subtract. Measured on daily changes over the last 60 sessions.",
  },

  plegable: {
    paraQue: 'What it is for',
    ver: 'View',
    cerrar: 'Close',
  },

  sombra: {
    aviso: ({ ops, meta }) =>
      `It still CANNOT be taken as a signal: it has ${ops} of the ${meta} real trades needed to believe it, whichever way the number comes out.`,
    margen: ({ ops, m }) =>
      `With a sample of ${ops}, that percentage can move ±${m} points by chance alone.`,
  },

// Las señales del día de las reglas que corren en pruebas. Ver
  // `components/SenalesSombra.jsx` — el aviso va ANTES de cualquier número a
  // propósito: aquí lo caro no es leer mal un dato, es creer que esta lista es
  // lo que la app propone.
  sombraSenales: {
    titulo: 'What the rules under test flagged',
    desc: 'The four rules the watcher records without proposing them',
    paraQue: 'So you can follow them day by day instead of waiting months for their percentage: which pair each one flagged, in which direction and at what levels. It does NOT say which to trade — these are unvalidated experiments, which is why they are kept apart from the app’s own signals.',
    avance: ({ n }) => `${n} signals shown`,
    aviso: 'THIS IS NOT WHAT THE APP PROPOSES. These rules are UNDER OBSERVATION: the watcher records them to measure them against real trades, nobody was alerted about them, and none has cleared its bar yet.',
    varaVieja: 'Old geometry: the stop and target are not the ones used when this rule was approved. It does not count towards its record.',
    sinSenales: 'This rule has not flagged anything yet.',
    pieCarry: 'With / against the rate differential says which way the swap works while the trade stays open. The rate difference is NOT the swap: the broker adds a margin nobody publishes, and an uneven one at that. This gives the side, not the number.',
    carry: {
      aFavor: 'Swap in your favour',
      enContra: 'Swap against you',
      neutro: 'Swap: barely counts',
    },
  },
  // El corte pares con dólar / cruces. Ver `components/MidePositivo.jsx` —
  // el aviso va ANTES de cualquier número a propósito: aquí lo caro no es
  // leer mal un dato, es creer que esta lista es lo que la app propone o que
  // el corte está confirmado.
  corte: {
    titulo: "What measures positive: dollar pairs and crosses",
    desc: "Which group of pairs each rule has measured well in, and which of today fall there",
    paraQue: "To see whether today's signal falls in the group of pairs where its rule has measured well or in the one where it measured badly. It does NOT say which to trade and it turns none off: the app still proposes its 14 pairs just as before.",
    avance: ({ n }) => `${n} signals in the good group`,
    aviso: "THIS IS NOT WHAT THE APP PROPOSES, NOR A NEW SIGNAL: they are the same signals from above, grouped differently. And the split was found by LOOKING at the results, over the same days, so no forward record has confirmed it yet. Nothing has been turned on or off.",
    montonDolar: "only in dollar pairs",
    montonCruces: "only in crosses (the ones without the dollar)",
    pasa: "PASSED THE BAR",
    noPasa: "DID NOT PASS THE BAR",
    porQueNoPasa: ({ n, piso }) => `It leaves ${n} signals a month and the minimum is ${piso}: even with a good number, there are not enough to believe it.`,
    yConcentracion: "And a single pair contributes too much of the improvement.",
    enSuMonton: "In its group of pairs",
    conLos14: "With all 14 pairs",
    control: "The opposite group (control)",
    conSwap: "Paying swap every night",
    mitades: "The two halves of the period",
    ops: "trades",
    fuera: ({ n }) => `Signals from this rule that fall today in the group that measures negative: ${n}.`,
    sinSenales: "None of its signals falls in this group today.",
    pieCorrelacion: "The 7 dollar pairs nearly all move together: it is measured that five dollar signals can be a single bet said five times. Earning more per trade and spreading the risk less is not automatically better.",
    pieFecha: ({ fecha, dias }) => `Measured on ${fecha} over ${dias} days of real market, with each pair’s spread subtracted and the neutral yardstick: stop and target at the same distance.`,
  },
  historial: {
    esBollinger: 'BOLLINGER',
    bollingerTitulo: '«Band touch» history',
    bollingerIntro:
      'The fifth rule: it enters when price leaves its Bollinger band and bets on a return. ⚠️ It is UNDER OBSERVATION and unvalidated, and two things matter: this version was chosen AFTER seeing the backtest results, and in that backtest it already lost once nightly swap was counted. Not a recommendation.',
    esRuptura: 'STRUCTURE BREAK',
    rupturaTitulo: 'History of "structure break"',
    rupturaIntro:
      'The fourth rule, which enters when price breaks the last high or low it made. ⚠️ It is UNDER OBSERVATION and unvalidated. It is not a recommendation — it is shown so it can be followed, not traded.',
    rsiTitulo: "Do the more stretched ones do better?",
    rsiAviso: "This does NOT say what the rule would give with a stricter threshold. The app keeps the 3 best per side, so with another threshold pairs that do not make it today would rise into the slot, on other dates. This is only how what was already recorded splits.",
    rsiEstiradas: ({ u }) => `Those that would also pass with RSI ${u}`,
    rsiResto: ({ u, v }) => `Those that only passed because of the ${v} (RSI between ${u} and ${v})`,
    esReversion: 'REVERSION',
    esCaida: "BUY THE DIP",
    caidaVieja: ({ n, acierto, pips }) => `Before this, ${n} trades were logged with a stop and target that were not the ones measured when the rule was approved. They do NOT count, and this rule's record starts again from zero (those gave ${acierto} % and ${pips} pips). They stay visible because they really happened.`,
    caidaTitulo: "History of “buy the dip”",
    caidaIntro:
      "The third rule: it buys a pair on the day it hits its 10-day low. Kept separate on purpose — it is a different experiment, and mixing it with the others would answer none of the questions.",
    reversionTitulo: 'Opposite-rule history',
    reversionIntro:
      'The same tally, but for the rule that buys what fell. Kept separate on purpose: these are different experiments, and merging them answers none of the questions.',
    titulo: 'Signal history',
    intro: 'What the app proposed and what happened next. The experiments are further down, each with its own count.',
    appTitulo: "The app's signals",
    pie: 'The pips come from the target and stop the app set: they do NOT include spread or swap, so in a real account the result is somewhat worse. If stop and target are both hit on the same day it counts as a loss, because the daily candle does not say which came first. The day the signal appears does not count: entry is at its close.',
    cargando: 'Loading history…',
    error: 'Could not load the history. Check your connection.',
    vacio: 'No signals yet.',
    vacioLargo: 'The watcher checks the market once a day and records what it finds here. As soon as the first signal shows up, you will see it.',
    acierto: 'Win rate',
    operaciones: 'Trades',
    pips: 'Net pips',
    sinJuzgar: 'Not judged yet',
    ganada: 'Hit',
    perdida: 'Missed',
    abierta: 'Running',
    caducada: 'No data',
  },

  frescura: {
    coste: (v) => `${v.pct} of every 100 signals from ${v.horas} h ago can no longer be taken`,
    generadoMin: (v) => `Generated ${v.n} min ago`,
    generadoH: (v) => `Generated ${v.n} h ago`,
    generadoDias: (v) => `Generated ${v.n} ${v.n === 1 ? 'day' : 'days'} ago`,
  },

  tasas: {
    paraQue: 'Traders check them when a trade will stay open overnight: they tell you in which pairs the interest works in your favour night after night and in which it works against you. It is not the exact figure your broker will charge.',
    titulo: 'Interest rates and swap',
    desc: 'What it costs to keep it open',
    aviso:
      '⚠️ This is NOT the swap your broker will charge you. It is the gap between central bank rates, which is where the swap COMES FROM. Your broker adds a margin nobody publishes, and it is uneven: in one direction you pay and in the other you sometimes get paid, but almost never the same. It gives you the direction and rough size, not the figure.',
    intro:
      'The currency on the left of the pair pays this gap per year against the one on the right. The higher up the list, the more it weighs to keep that trade open night after night.',
    lado: {
      compra: 'Usually works in your favour if you buy',
      venta: 'Usually works in your favour if you sell',
      neutro: 'Almost the same rate: it barely weighs',
    },
    cabeceraSueltas: 'Rate of each central bank',
    subio: (v) => `Up from ${v.de} % · ${v.cuando}`,
    bajo: (v) => `Down from ${v.de} % · ${v.cuando}`,
    haceDias: (v) => `${v.n} ${v.n === 1 ? 'day' : 'days'} ago`,
    haceMeses: (v) => `${v.n} ${v.n === 1 ? 'month' : 'months'} ago`,
    haceAnios: (v) => `${v.n} ${v.n === 1 ? 'year' : 'years'} ago`,
    pieTendencia:
      'The arrow shows which rate today\u2019s one came from and how long it has been at that level. A currency with no arrow did not move inside the window the app looks at: that does not say its central bank is on hold, only that it did not change in there.',
    pie: (v) => `Source: BIS (Bank for International Settlements). The BIS publishes with a few days\u2019 delay, so each row\u2019s date is how far ITS data goes \u2014 not the day that bank decided. The oldest is ${v.dias} days old.`,
  },

  oro: {
    paraQue: 'Traders watch gold because it tends to move opposite the dollar and to rise when the market gets nervous. But that is a habit, not a law: we do not tell you that here — we show you the measured number of how much it has moved alongside each pair over the last 60 sessions, and you decide whether it is useful.',
    titulo: 'Gold',
    desc: 'How much it moves with your pairs',
    aviso: '⚠️ This is NOT a signal. Gold does not say buy or sell on any pair. What follows is how much they have moved TOGETHER over the last three months — a fact about the past, not a prediction. And two things moving together does not mean one moves the other.',
    dolares: 'dollars per ounce',
    enUnDia: 'In one day',
    enVeinteDias: 'In 20 days',
    intro: 'It is measured on each day\\u2019s change, not on the price, and only on sessions that have data in both. The higher up the list, the more alike their moves.',
    cabeceraCorrel: 'How much gold moves with each pair',
    juntos: 'They move together',
    alReves: 'They move opposite',
    sobreDias: (v) => `${v.n} sessions in common`,
    sinCorrel: 'No pair has moved much like gold over the last sessions. That is a fact too: today gold tells you nothing about these fourteen.',
    pie: (v) => `Source: Twelve Data, spot price (XAU/USD), figure from ${v.fecha} — ${v.dias} days ago. The number runs from −1 to +1: near +1 they move almost alike, near −1 opposite, and near 0 they are unrelated. Each row says how many sessions it was computed on.`,
  },

  cot: {
    paraQue: 'Traders check it to see whether a bet is already crowded: when almost all the big players are on the same side, few are left to get in and many to get out. It is background context, weekly and delayed. It does not say which pair to trade or when.',
    titulo: 'Commitments of Traders',
    desc: 'What the big players are holding',
    aviso: '⚠️ This does NOT say buy or sell. These are positions in CME futures, a small slice of the Forex market, and they arrive days late: the CFTC publishes on Fridays with the previous Tuesday’s data. And extreme positioning is read by some as the trend continuing and by others as a turn coming. Which one is right here has not been measured.',
    intro: 'How much the speculative funds — what the CFTC calls leveraged funds — are holding long or short in each currency, as a percentage of all open contracts. Each currency is against the dollar.',
    comprados: 'Net long',
    vendidos: 'Net short',
    igualados: 'Balanced',
    cambio: (v) => `${v.n} contracts this week`,
    sinCambio: 'No change this week',
    indice: 'The dollar against a basket, not against a single currency',
    percentil: (v) => `More bought than in ${v.pct} % of its last ${v.n} weeks`,
    percentilVendido: (v) => `More sold than in ${v.pct} % of its last ${v.n} weeks`,
    esMaximo: (v) => `The MOST bought of its last ${v.n} weeks`,
    esMinimo: (v) => `The MOST sold of its last ${v.n} weeks`,
    piePercentil:
      'Each percentage is compared with the history of ITS own currency, not with the other seven. That matters because each currency has its own habit: in one that is almost always net short, a negative number can be the most bought it has been in three years, while that same number in another would be perfectly ordinary. And an extreme does not say what comes next: some read it as the trend continuing and others as it turning around.',
    pie: (v) => `Source: CFTC, report of ${v.fecha} (${v.dias} days ago). Futures only, no options. Between 3 and 10 days old is normal: it is published on Fridays with Tuesday’s data. The bar is only for comparing at a glance; the number is the data.`,
  },

  diag: {
    paraQue: 'Traders go over their own numbers to find where they lose without noticing: a type of pair, a direction, or one specific pair. With few trades it means nothing, which is why every percentage carries its margin right next to it.',
    titulo: ({ n }) => `Your numbers by group (${n})`,
    desc: 'Your trades split by pair type, by direction and by pair.',
    aviso: 'This counts what YOU did, nothing else. It is not advice, it does not say what to trade, and it has nothing to do with what the app flags.',
    ops: 'ops',
    tipo: 'By pair type',
    cruces: 'Crosses (no dollar)',
    dolar: 'Dollar pairs',
    direccion: 'By direction',
    pares: ({ n }) => `By pair (from ${n} trades)`,
    lote: ({ min, max, distintos }) => `Lot: from ${min} to ${max}, ${distintos} different sizes.`,
    pie: 'The ± is how much that percentage can move by chance alone. With few trades it is huge: with 10 it is ±31 points, so 40 % and 70 % are the same number.',
    moneda: 'It is like tossing a coin: if you toss it 10 times and get 7 heads, it is not rigged — that happens all the time. If you toss it 400 times and get 280, then something really is going on. Your trades work the same way.',
  },

  estac: {
    titulo: 'Seasonality',
    desc: 'How much the pair moves by calendar',
    paraQue: 'To know when the market is awake and when it is asleep on the pair you already picked. If an hour or a day moves half as much as the rest, a stop sized for normal conditions sits too wide and the target too far. It does NOT say which way price will go: it says how far it usually travels.',
    aviso: '⚠️ This measures HOW MUCH it moves, not WHICH WAY. A pair can move a lot and end where it started. It does not pick the pair: it helps pick the moment for the pair you already chose for other reasons.',
    par: 'Pair',
    porDia: 'Range by day of week',
    pieDia: (v) => `Each day comes from ${v.n} candles. Saturdays and Sundays are removed: the provider sends them anyway, with a fraction of the real range, and counting them would sink the average of the days that do exist.`,
    porMes: 'Range by month',
    pieMes: (v) => `Each month comes from ${v.n} days, not from a handful of months. That is why this panel can be read and the one below cannot.`,
    direccion: 'Direction by month',
    avisoDireccion: '⚠️ THIS TABLE DECIDES NOTHING, and it is here so you can see why. Each month comes from about 14 observations, so its margin is ±26 points: a 70% and a 48% are the same number. We checked it with a market invented at random, with no seasonality inside, and its table said "February 71%, July 29%" — 42 points out of nothing. This is the table sold elsewhere, and almost nobody puts the margin beside it.',
    pieDireccion: 'Counts in how many of the months in the series the pair closed above where it opened. Partial months are not counted.',
    pocosDatos: (v) => `few data points: ${v.n}`,
    deMeses: (v) => `${v.verdes} of ${v.n} rose`,
    tramo: (v) => `Data from ${v.desde} to ${v.hasta} · ${v.n} candles`,
  },
  errores: {
    'auth/email-already-in-use': 'That email already has an account. Try "Sign in".',
    'auth/invalid-email': 'That email does not look valid.',
    'auth/weak-password': 'The password must be at least 6 characters.',
    'auth/missing-password': 'Enter a password.',
    'auth/user-not-found': 'Wrong email or password, or you are not signed up yet.',
    'auth/wrong-password': 'Wrong email or password, or you are not signed up yet.',
    'auth/invalid-credential': 'Wrong email or password, or you are not signed up yet.',
    'auth/invalid-login-credentials': 'Wrong email or password, or you are not signed up yet.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'No internet connection. Check your signal and try again.',
    generico: 'Something went wrong. Try again.',
  },
}
