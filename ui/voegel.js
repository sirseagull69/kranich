'use strict';
// Die Vögel der Familie „Selbst gfaltet“ und ihre Animationen.
// Jeder Vogel besteht aus gefalteten Teilen (Polygone). Eine Pose legt die
// Punkte der Teile fest, eine Animation ist eine Folge von Posen plus
// Bewegung des ganzen Vogels und kleinen Requisiten (Lupe, Stift, Zz …).
// Alles als SVG mit SMIL, läuft ohne Skript weiter.
(function () {
  const VOEGEL = {
    kranich: {
      name: 'Kranich', fuss: [46, 86],
      farben: { haus: '#7c5cd6', facette: '#4a2f9a', hell: '#d6caf9', tinte: '#1d2742', bein: '#6243c4' },
      teile: [
        ['fluegel2', 'haus'], ['bein1', 'bein'], ['bein2', 'bein'], ['schwanz', 'facette'],
        ['koerper', 'haus'], ['hals', 'facette'], ['fluegel', 'hell'], ['kopf', 'tinte'],
      ],
      posen: {
        stehen: { fluegel2: '40,56 58,56 48,46', bein1: '40,58 43,58 41,86', bein2: '48,58 51,58 52,86', schwanz: '12,50 30,46 30,58', koerper: '24,58 62,58 46,38', hals: '56,56 62,58 71,41', fluegel: '30,52 56,55 38,32', kopf: '71,41 84,48 69,47' },
        nicken: { hals: '56,56 62,58 73,45', kopf: '73,45 85,54 71,51' },
        picken: { hals: '56,56 62,58 76,62', kopf: '76,62 86,72 74,68', fluegel: '30,52 56,55 36,36' },
        hoch: { hals: '56,56 62,58 64,9', kopf: '64,9 79,9 63,16', fluegel: '30,52 56,55 34,27' },
        schief: { hals: '56,56 62,58 68,22', kopf: '68,22 80,30 66,29' },
        zurueck: { hals: '56,56 62,58 48,28', kopf: '48,28 35,32 49,35' },
        halb: { fluegel: '30,52 56,55 18,24', fluegel2: '42,52 59,55 72,22' },
        oben: { fluegel: '30,52 56,55 20,8', fluegel2: '42,52 59,55 64,5', hals: '56,56 62,58 70,18', kopf: '70,18 84,20 69,25' },
        unten: { fluegel: '30,52 56,55 12,62', fluegel2: '42,52 59,55 78,64' },
        ducken: { koerper: '24,60 62,60 46,46', hals: '56,58 62,60 58,48', kopf: '58,48 68,53 57,52', fluegel: '30,56 56,58 40,42', bein1: '40,60 43,60 41,86', bein2: '48,60 51,60 52,86' },
        strecken: { hals: '56,56 62,58 66,3', kopf: '66,3 80,1 65,9', fluegel: '30,52 56,55 22,6', fluegel2: '42,52 59,55 66,2' },
        winken: { fluegel2: '42,52 59,55 80,12', hals: '56,56 62,58 68,30', kopf: '68,30 81,36 66,37' },
        bein: { bein2: '48,58 51,58 60,80' },
      },
    },
    albatros: {
      name: 'Albatros', fuss: [46, 86],
      farben: { haus: '#2f8a55', facette: '#1d5e3a', hell: '#a8dcbb', kopf: '#eef7f1', schnabel: '#e0a83a', bein: '#1d5e3a' },
      teile: [
        ['fluegel2', 'facette'], ['bein1', 'bein'], ['bein2', 'bein'], ['schwanz', 'facette'],
        ['koerper', 'haus'], ['hals', 'facette'], ['kopf', 'kopf'], ['schnabel', 'schnabel'], ['fluegel', 'hell'],
      ],
      posen: {
        stehen: { fluegel2: '36,62 60,62 48,50', bein1: '40,64 43,64 42,86', bein2: '50,64 53,64 54,86', schwanz: '6,58 26,54 26,64', koerper: '18,64 68,64 46,44', hals: '58,62 66,64 72,42', kopf: '64,42 78,36 75,49', schnabel: '76,40 94,44 76,47', fluegel: '6,60 62,60 32,46' },
        nicken: { hals: '58,62 66,64 74,45', kopf: '66,45 80,41 77,53', schnabel: '78,45 94,51 77,52' },
        picken: { hals: '58,62 66,64 76,62', kopf: '70,60 82,58 80,69', schnabel: '80,62 94,70 79,69' },
        hoch: { hals: '58,62 66,64 70,18', kopf: '62,18 76,12 73,25', schnabel: '74,16 91,18 74,23' },
        schief: { hals: '58,62 66,64 72,28', kopf: '64,28 76,20 77,33', schnabel: '76,25 91,24 77,31' },
        zurueck: { hals: '58,62 66,64 52,32', kopf: '46,32 58,26 57,39', schnabel: '47,34 31,36 47,39' },
        halb: { fluegel: '24,58 62,60 6,30', fluegel2: '36,60 60,62 88,28' },
        oben: { fluegel: '24,58 62,60 0,10', fluegel2: '36,60 60,62 98,8', hals: '58,62 66,64 72,30', kopf: '64,30 77,23 76,36', schnabel: '76,27 92,28 77,33' },
        unten: { fluegel: '24,58 62,60 2,76', fluegel2: '36,60 60,62 96,76' },
        ducken: { koerper: '18,66 68,66 46,52', hals: '58,64 66,66 63,54', kopf: '55,54 67,49 66,60', schnabel: '66,53 80,57 66,59', fluegel: '8,64 62,64 32,52', bein1: '40,66 43,66 42,86', bein2: '50,66 53,66 54,86' },
        strecken: { hals: '58,62 66,64 72,6', kopf: '64,6 78,0 75,13', schnabel: '76,4 93,4 76,10', fluegel: '24,58 62,60 2,8', fluegel2: '36,60 60,62 96,6' },
        winken: { fluegel2: '36,60 60,62 92,10', hals: '58,62 66,64 72,32', kopf: '64,32 77,25 76,38', schnabel: '76,29 92,30 77,35' },
        bein: { bein2: '50,64 53,64 62,80' },
      },
    },
  };

  // Albatros sitzt tiefer: kurze Beine, flacher Körper (alles außer dem Boden 10 Einheiten runter)
  for (const pose of Object.values(VOEGEL.albatros.posen)) {
    for (const [t, pts] of Object.entries(pose)) {
      pose[t] = pts.split(' ').map((pt) => { const [x, y] = pt.split(',').map(Number); return `${x},${y >= 86 ? y : Math.min(85, y + 10)}`; }).join(' ');
    }
  }

  // ---------- Requisiten (oben rechts im Bild, eigene kleine Bewegung) ----------
  const T = '#1d2742';
  const schweben = (d = '2s') => `<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 -3;0 0" dur="${d}" repeatCount="indefinite"></animateTransform>`;
  const blinken = (d = '1.6s', b = '0s') => `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="${d}" begin="${b}" repeatCount="indefinite"></animate>`;
  const RQ = (f) => ({
    zz: `<g font-family="Caveat,cursive" fill="${f.haus}"><text x="70" y="30" font-size="15">z${blinken('2.6s')}<animateTransform attributeName="transform" type="translate" values="0 4;5 -8" dur="2.6s" repeatCount="indefinite"></animateTransform></text><text x="80" y="18" font-size="11" opacity="0">z${blinken('2.6s', '1.3s')}</text></g>`,
    punkte: `<g fill="${f.haus}">${[0, 1, 2].map((i) => `<circle cx="${74 + i * 8}" cy="16" r="2.6" opacity=".2"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" begin="${i * 0.2}s" repeatCount="indefinite"></animate></circle>`).join('')}</g>`,
    frage: `<text x="80" y="24" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="22" fill="${f.haus}">?${schweben()}</text>`,
    frage2: `<g font-family="Bricolage Grotesque,sans-serif" font-weight="800" fill="${f.haus}"><text x="12" y="24" font-size="18">?${blinken('2s')}</text><text x="82" y="20" font-size="22">?${blinken('2s', '1s')}</text></g>`,
    ausruf: `<text x="82" y="26" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="26" fill="#d9532f">!<animateTransform attributeName="transform" type="scale" additive="sum" values="1;1.15;1" dur="0.6s" repeatCount="indefinite"></animateTransform></text>`,
    herz: `<path d="M82 20c-4-6-12-2-8 4l8 7 8-7c4-6-4-10-8-4z" fill="#e2557a">${schweben('1.4s')}<animate attributeName="opacity" values="0;1;1;0" dur="1.8s" repeatCount="indefinite"></animate></path>`,
    sterne: `<g fill="#f2b632">${[[76, 12, 0], [90, 26, 0.4], [66, 22, 0.8]].map(([x, y, b]) => `<path d="M${x} ${y - 5}l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z">${blinken('1.2s', `${b}s`)}</path>`).join('')}</g>`,
    haken: `<g><circle cx="84" cy="18" r="10" fill="#2f8a55"></circle><path d="M79 18l4 4 7-8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-dasharray="20" stroke-dashoffset="20"><animate attributeName="stroke-dashoffset" values="20;0" dur="0.5s" begin="0.3s" fill="freeze"></animate></path></g>`,
    lupe: `<g stroke="${T}" stroke-width="2.6" fill="rgba(255,255,255,.6)"><circle cx="82" cy="18" r="7"></circle><path d="M87 23l6 6" stroke-linecap="round"></path><animateTransform attributeName="transform" type="translate" values="0 0;-8 4;-2 8;0 0" dur="2.4s" repeatCount="indefinite"></animateTransform></g>`,
    stift: `<g><path d="M76 30l14-14 4 4-14 14-5 1z" fill="${f.hell || f.haus}" stroke="${T}" stroke-width="1.5"></path><animateTransform attributeName="transform" type="translate" values="0 0;-6 2;0 4;-6 6;0 0" dur="1.2s" repeatCount="indefinite"></animateTransform></g><path d="M68 40h18" stroke="${T}" stroke-width="1.6" stroke-dasharray="18" stroke-dashoffset="18"><animate attributeName="stroke-dashoffset" values="18;0;0" dur="1.2s" repeatCount="indefinite"></animate></path>`,
    blatt: `<g><rect x="74" y="8" width="18" height="22" fill="#fff" stroke="${T}" stroke-width="1.5"></rect><path d="M78 14h10M78 18h10M78 22h6" stroke="${T}" stroke-width="1.2"></path>${schweben('2.2s')}</g>`,
    blaetter3: `<g stroke="${T}" stroke-width="1.4">${[0, 1, 2].map((i) => `<rect x="${66 + i * 10}" y="${10 + i * 2}" width="12" height="16" fill="${['#fff', f.hell || '#eee', f.haus][i]}"><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="1.5s" begin="${i * 0.25}s" repeatCount="indefinite"></animateTransform></rect>`).join('')}</g>`,
    faltblatt: `<g><polygon points="74,10 94,10 94,30 74,30" fill="#fff" stroke="${T}" stroke-width="1.4"><animate attributeName="points" values="74,10 94,10 94,30 74,30;74,10 94,10 84,30 74,30;74,10 84,10 84,20 74,20;74,10 94,10 94,30 74,30" dur="2.4s" repeatCount="indefinite"></animate></polygon></g>`,
    pinsel: `<g><path d="M90 8l4 4-12 14-5-1 1-5z" fill="#b98a5a" stroke="${T}" stroke-width="1.2"></path><circle cx="76" cy="28" r="3" fill="${f.haus}"></circle><animateTransform attributeName="transform" type="rotate" values="0 84 18;-14 84 18;0 84 18" dur="1s" repeatCount="indefinite"></animateTransform></g><path d="M64 36q8-6 16 0" stroke="${f.haus}" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="20" stroke-dashoffset="20"><animate attributeName="stroke-dashoffset" values="20;0;0" dur="2s" repeatCount="indefinite"></animate></path>`,
    schere: `<g stroke="${T}" stroke-width="2" fill="none"><circle cx="78" cy="26" r="3.5"></circle><circle cx="78" cy="14" r="3.5"></circle><path d="M81 24l12-8M81 16l12 8"><animate attributeName="d" values="M81 24l12-8M81 16l12 8;M81 24l12-3M81 16l12 3;M81 24l12-8M81 16l12 8" dur="0.6s" repeatCount="indefinite"></animate></path></g>`,
    lineal: `<g><rect x="64" y="14" width="30" height="8" fill="#f2d48a" stroke="${T}" stroke-width="1.2"></rect>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${67 + i * 5} 14v${i % 2 ? 3 : 5}" stroke="${T}" stroke-width="1"></path>`).join('')}<animateTransform attributeName="transform" type="translate" values="0 0;-6 0;0 0" dur="1.8s" repeatCount="indefinite"></animateTransform></g>`,
    zahnrad: `<g fill="${f.facette}"><circle cx="84" cy="18" r="6"></circle>${[0, 45, 90, 135].map((a) => `<rect x="82" y="8" width="4" height="20" transform="rotate(${a} 84 18)"></rect>`).join('')}<circle cx="84" cy="18" r="2.5" fill="#fff"></circle><animateTransform attributeName="transform" type="rotate" values="0 84 18;360 84 18" dur="2s" repeatCount="indefinite"></animateTransform></g>`,
    paket: `<g><rect x="74" y="12" width="18" height="16" fill="#d9b27a" stroke="${T}" stroke-width="1.3"></rect><path d="M83 12v16M74 18h18" stroke="${T}" stroke-width="1.1"></path><animateTransform attributeName="transform" type="translate" values="0 0;8 -6;0 0" dur="1.6s" repeatCount="indefinite"></animateTransform></g>`,
    play: `<g><circle cx="84" cy="18" r="10" fill="${f.haus}"></circle><path d="M81 13l8 5-8 5z" fill="#fff"></path><animateTransform attributeName="transform" type="scale" additive="sum" values="1;1.08;1" dur="1s" repeatCount="indefinite"></animateTransform></g>`,
    konfetti: `<g>${[['#e2557a', 70, 0], ['#f2b632', 80, 0.2], [f.haus, 90, 0.4], ['#3aa3d9', 76, 0.6], ['#2f8a55', 86, 0.3]].map(([c, x, b]) => `<rect x="${x}" y="0" width="3" height="5" fill="${c}"><animateTransform attributeName="transform" type="translate" values="0 0;${x % 3 - 1} 34" dur="1.4s" begin="${b}s" repeatCount="indefinite"></animateTransform><animate attributeName="opacity" values="1;1;0" dur="1.4s" begin="${b}s" repeatCount="indefinite"></animate></rect>`).join('')}</g>`,
    noten: `<g fill="${f.haus}" font-size="16"><text x="72" y="22">♪${schweben('1.2s')}</text><text x="86" y="14" font-size="13">♫${blinken('1.6s', '0.5s')}</text></g>`,
    uhr: `<g><circle cx="84" cy="18" r="9" fill="#fff" stroke="${T}" stroke-width="1.6"></circle><path d="M84 18v-6" stroke="${T}" stroke-width="1.6" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0 84 18;360 84 18" dur="2s" repeatCount="indefinite"></animateTransform></path></g>`,
    wolke: `<path d="M74 24a6 6 0 0 1 2-11 8 8 0 0 1 15 2 5 5 0 0 1 1 9z" fill="#fff" stroke="${T}" stroke-width="1.4">${schweben('3s')}</path>`,
    funken: `<g stroke="#f2b632" stroke-width="2" stroke-linecap="round">${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M84 10v-5" transform="rotate(${a} 84 18)"><animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite"></animate></path>`).join('')}</g>`,
    farbe: `<g>${[['#e2557a', 76], ['#f2b632', 84], ['#3aa3d9', 92]].map(([c, x], i) => `<circle cx="${x}" cy="20" r="4" fill="${c}"><animate attributeName="cy" values="20;14;20" dur="1s" begin="${i * 0.15}s" repeatCount="indefinite"></animate></circle>`).join('')}</g>`,
    offline: `<g stroke="${T}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"><path d="M74 18a14 14 0 0 1 20 0M78 22a8 8 0 0 1 12 0"></path><circle cx="84" cy="26" r="1.5" fill="${T}"></circle><path d="M74 10l20 20" stroke="#d9532f"></path></g>`,
    diskette: `<g><rect x="75" y="9" width="18" height="18" rx="2" fill="${f.facette}"></rect><rect x="79" y="9" width="10" height="6" fill="#fff"></rect><rect x="78" y="19" width="12" height="8" fill="#fff"></rect><animateTransform attributeName="transform" type="translate" values="0 -6;0 0;0 0" keyTimes="0;0.3;1" dur="1.6s" repeatCount="indefinite"></animateTransform></g>`,
    plus: `<g><circle cx="84" cy="18" r="9" fill="${f.haus}"></circle><path d="M84 13v10M79 18h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"></path>${schweben('1.6s')}</g>`,
    liste: `<g stroke="${T}" stroke-width="1.5"><rect x="72" y="6" width="22" height="26" fill="#fff"></rect>${[0, 1, 2].map((i) => `<path d="M76 ${13 + i * 6}l2 2 3-4" stroke="${f.haus}" fill="none" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="${0.4 + i * 0.5}s" fill="freeze"></animate></path><path d="M84 ${13 + i * 6}h7"></path>`).join('')}</g>`,
    bloecke: `<g stroke="${T}" stroke-width="1.2">${[[72, 22, f.hell], [84, 22, f.haus], [78, 10, f.facette]].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="11" height="11" fill="${c}"><animateTransform attributeName="transform" type="translate" values="0 -20;0 0;0 0" keyTimes="0;0.3;1" dur="2.4s" begin="${i * 0.3}s" repeatCount="indefinite"></animateTransform></rect>`).join('')}</g>`,
    bild: `<g><rect x="72" y="8" width="22" height="18" fill="#fff" stroke="${T}" stroke-width="1.4"></rect><path d="M72 24l7-7 5 5 4-3 6 5" stroke="${f.haus}" stroke-width="1.6" fill="none"></path><circle cx="88" cy="13" r="2" fill="#f2b632"></circle>${schweben('2.4s')}</g>`,
    text: `<text x="76" y="28" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="24" fill="${f.facette}">T<animate attributeName="opacity" values="1;.3;1" dur="1s" repeatCount="indefinite"></animate></text>`,
    pfeil: `<g stroke="${f.haus}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M84 30V8M76 16l8-8 8 8"></path><animateTransform attributeName="transform" type="translate" values="0 6;0 -4;0 6" dur="1s" repeatCount="indefinite"></animateTransform></g>`,
    trendhoch: `<g stroke="${f.haus}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M68 30l8-8 6 4 12-14" stroke-dasharray="40" stroke-dashoffset="40"><animate attributeName="stroke-dashoffset" values="40;0;0" dur="1.6s" repeatCount="indefinite"></animate></path><path d="M88 12h6v6"></path></g>`,
    trendrunter: `<g stroke="#d9532f" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M68 10l8 8 6-4 12 14" stroke-dasharray="40" stroke-dashoffset="40"><animate attributeName="stroke-dashoffset" values="40;0;0" dur="1.6s" repeatCount="indefinite"></animate></path><path d="M88 28h6v-6"></path></g>`,
    tabelle: `<g stroke="${T}" stroke-width="1.2"><rect x="68" y="6" width="28" height="24" fill="#fff"></rect><path d="M68 12h28M68 18h28M68 24h28M77 6v24M86 6v24"></path><rect x="77" y="12" width="9" height="6" fill="${f.hell}" stroke="none"><animate attributeName="y" values="12;18;24;12" dur="1.8s" calcMode="discrete" repeatCount="indefinite"></animate></rect></g>`,
    diagramm: `<g>${[[70, 10, f.hell], [78, 16, f.haus], [86, 6, f.facette]].map(([x, h, c], i) => `<rect x="${x}" y="${30 - h * 2}" width="6" height="${h * 2}" fill="${c}"><animate attributeName="height" values="0;${h * 2};${h * 2}" keyTimes="0;0.4;1" dur="2s" begin="${i * 0.15}s" repeatCount="indefinite"></animate><animate attributeName="y" values="30;${30 - h * 2};${30 - h * 2}" keyTimes="0;0.4;1" dur="2s" begin="${i * 0.15}s" repeatCount="indefinite"></animate></rect>`).join('')}<path d="M68 30h26" stroke="${T}" stroke-width="1.4"></path></g>`,
    torte: `<g><circle cx="84" cy="18" r="10" fill="${f.hell}"></circle><path d="M84 18V8a10 10 0 0 1 9.5 13z" fill="${f.haus}"><animateTransform attributeName="transform" type="rotate" values="0 84 18;20 84 18;0 84 18" dur="1.6s" repeatCount="indefinite"></animateTransform></path></g>`,
    summe: `<text x="76" y="28" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="24" fill="${f.haus}">Σ<animateTransform attributeName="transform" type="scale" additive="sum" values="1;1.1;1" dur="1.2s" repeatCount="indefinite"></animateTransform></text>`,
    prozent: `<text x="74" y="28" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="22" fill="${f.haus}">%${schweben('1.4s')}</text>`,
    euro: `<text x="76" y="28" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="24" fill="${f.haus}">€${schweben('1.4s')}</text>`,
    formel: `<text x="66" y="26" font-family="ui-monospace,Consolas,monospace" font-weight="700" font-size="13" fill="${f.facette}">=fx<animate attributeName="opacity" values=".4;1;.4" dur="1.4s" repeatCount="indefinite"></animate></text>`,
    filter: `<path d="M70 8h26l-10 12v10l-6-3v-7z" fill="${f.hell}" stroke="${T}" stroke-width="1.4">${schweben('1.6s')}</path>`,
    sortieren: `<g fill="${f.haus}">${[[70, 26, 8], [78, 20, 14], [86, 12, 22]].map(([x, y, h], i) => `<rect x="${x}" y="${y}" width="6" height="${h}"><animate attributeName="x" values="${[86, 70, 78][i]};${x};${x}" keyTimes="0;0.5;1" dur="2s" repeatCount="indefinite"></animate></rect>`).join('')}</g>`,
    kalender: `<g stroke="${T}" stroke-width="1.3"><rect x="72" y="8" width="22" height="22" fill="#fff"></rect><rect x="72" y="8" width="22" height="6" fill="${f.haus}"></rect><text x="78" y="27" font-size="11" font-weight="700" stroke="none" fill="${T}" font-family="Bricolage Grotesque,sans-serif">23</text></g>`,
    kopieren: `<g stroke="${T}" stroke-width="1.4"><rect x="72" y="12" width="14" height="16" fill="#fff"></rect><rect x="78" y="6" width="14" height="16" fill="${f.hell}"><animateTransform attributeName="transform" type="translate" values="-6 6;0 0;0 0" keyTimes="0;0.4;1" dur="1.6s" repeatCount="indefinite"></animateTransform></rect></g>`,
    datei: `<g><path d="M74 6h12l6 6v18H74z" fill="#fff" stroke="${T}" stroke-width="1.4"></path><text x="76" y="25" font-size="7" font-weight="800" fill="${f.haus}" font-family="Bricolage Grotesque,sans-serif">XLS</text><animateTransform attributeName="transform" type="translate" values="10 -10;0 0;0 0" keyTimes="0;0.35;1" dur="2s" repeatCount="indefinite"></animateTransform></g>`,
    besen: `<g><path d="M92 4l-10 18" stroke="#8a6a3a" stroke-width="2.4"></path><path d="M78 20l8 4-4 8-10-4z" fill="#d9b27a"></path><animateTransform attributeName="transform" type="rotate" values="0 86 14;-18 86 14;0 86 14" dur="0.9s" repeatCount="indefinite"></animateTransform></g>`,
    gross: `<g stroke="${T}" stroke-width="1.3" fill="#fff"><rect x="66" y="16" width="8" height="12"></rect><rect x="76" y="10" width="10" height="18" fill="${f.hell}"></rect><rect x="88" y="20" width="8" height="8" fill="${f.haus}"></rect>${schweben('2s')}</g>`,
    welle: `<g fill="none" stroke="${f.hell}" stroke-width="2.4" stroke-linecap="round"><path d="M64 34q5-4 10 0t10 0 10 0"><animateTransform attributeName="transform" type="translate" values="0 0;-10 0" dur="1.2s" repeatCount="indefinite"></animateTransform></path></g>`,
  });

  // ---------- Animationen ----------
  // k: Keyframes [Zeit 0–1, Pose, dx, dy, Drehung]; d: Dauer; r: Requisiten; einmal: läuft nur einmal
  const A = (name, info, d, k, r = [], einmal = false) => ({ name, info, d, k, r, einmal });
  const ruhig = [[0, 'stehen'], [0.5, 'stehen', 0, -0.9], [1, 'stehen']];
  const GEMEINSAM = [
    A('ruhezustand', 'Start, Leerlauf', 4.2, ruhig),
    A('ruhezustand-2', 'schaut sich um', 7, [[0, 'stehen'], [0.35, 'stehen'], [0.45, 'zurueck'], [0.65, 'zurueck'], [0.75, 'stehen'], [1, 'stehen']]),
    A('ruhezustand-3', 'nickt ab und zu', 6, [[0, 'stehen'], [0.78, 'stehen'], [0.84, 'nicken'], [0.92, 'nicken'], [1, 'stehen']]),
    A('ruhezustand-4', 'pickt am Boden', 6, [[0, 'stehen'], [0.6, 'stehen'], [0.68, 'picken'], [0.74, 'nicken'], [0.8, 'picken'], [0.9, 'stehen'], [1, 'stehen']]),
    A('ruhezustand-5', 'Flügel ordnen', 6, [[0, 'stehen'], [0.6, 'stehen'], [0.7, 'halb'], [0.78, 'stehen'], [0.86, 'halb'], [1, 'stehen']]),
    A('denkt-nach', 'Kranich überlegt', 2.4, [[0, 'schief'], [0.5, 'schief', 0, -1], [1, 'schief']], ['punkte']),
    A('denkt-nach-2', 'schaut nach oben', 3, [[0, 'stehen'], [0.3, 'hoch'], [0.7, 'hoch'], [1, 'stehen']], ['frage']),
    A('denkt-nach-3', 'Kopf hin und her', 3, [[0, 'schief'], [0.5, 'zurueck'], [1, 'schief']], ['punkte']),
    A('arbeitet', 'bei der Arbeit', 1.2, [[0, 'nicken'], [0.5, 'picken', 0, -1], [1, 'nicken']]),
    A('wartet', 'wartet auf dich', 4, [[0, 'stehen'], [0.5, 'schief'], [1, 'stehen']]),
    A('ungeduldig', 'tippt mit dem Fuß', 1, [[0, 'stehen'], [0.5, 'bein'], [1, 'stehen']]),
    A('seufzt', 'seufzt', 3, [[0, 'stehen'], [0.3, 'hoch', 0, -2], [0.6, 'ducken', 0, 1], [1, 'stehen']]),
    A('gaehnt', 'gähnt', 3, [[0, 'stehen'], [0.3, 'strecken'], [0.6, 'strecken'], [1, 'stehen']]),
    A('streckt-sich', 'streckt sich', 2.4, [[0, 'stehen'], [0.4, 'strecken', 0, -3], [0.7, 'strecken', 0, -3], [1, 'stehen']]),
    A('schlaeft', 'keine Verbindung, Nacht', 5, [[0, 'ducken'], [0.5, 'ducken', 0, -0.6], [1, 'ducken']], ['zz']),
    A('schlafen-gehen', 'macht sich klein', 1.6, [[0, 'stehen'], [0.5, 'nicken'], [1, 'ducken']], [], true),
    A('aufwachen', 'wacht auf', 1.6, [[0, 'ducken'], [0.4, 'strecken', 0, -2], [0.7, 'oben'], [1, 'stehen']], [], true),
    A('landet', 'kommt angeflogen', 1.2, [[0, 'oben', 20, -34], [0.25, 'unten', 14, -22], [0.5, 'oben', 6, -10], [0.75, 'halb', 1, -2], [1, 'stehen']], [], true),
    A('abflug', 'fliegt weg', 1.2, [[0, 'stehen'], [0.25, 'ducken'], [0.5, 'oben', 4, -10], [0.75, 'unten', 14, -24], [1, 'oben', 30, -44]], [], true),
    A('fliegt', 'im Flug', 0.8, [[0, 'oben', 0, -6], [0.5, 'unten', 0, -2], [1, 'oben', 0, -6]], ['welle']),
    A('winkt', 'Hallo', 1.4, [[0, 'stehen'], [0.25, 'winken'], [0.5, 'stehen'], [0.75, 'winken'], [1, 'stehen']]),
    A('flattert', 'flattert', 0.6, [[0, 'halb'], [0.5, 'oben', 0, -1], [1, 'halb']]),
    A('huepft', 'hüpft', 0.9, [[0, 'stehen'], [0.4, 'halb', 0, -8], [0.8, 'stehen'], [1, 'stehen']]),
    A('applaus', 'klatscht mit den Flügeln', 0.5, [[0, 'halb'], [0.5, 'unten'], [1, 'halb']], ['funken']),
    A('triumph', 'Ziel erreicht', 1.6, [[0, 'oben', 0, -2], [0.5, 'strecken', 0, -6], [1, 'oben', 0, -2]], ['sterne']),
    A('fertig', 'Entwurf fertig', 1.3, [[0, 'stehen'], [0.22, 'oben', 0, -7], [0.45, 'oben'], [0.62, 'oben', 0, -4], [0.8, 'oben'], [1, 'oben']], ['haken'], true),
    A('fehler', 'etwas ging schief', 1.2, [[0, 'stehen'], [0.15, 'ducken', -2], [0.3, 'ducken', 2], [0.45, 'ducken', -2], [0.6, 'ducken'], [1, 'stehen']], ['ausruf']),
    A('ratlos', 'weiß nicht weiter', 3, [[0, 'schief'], [0.5, 'zurueck'], [1, 'schief']], ['frage2']),
    A('erschrickt', 'erschrickt', 0.8, [[0, 'stehen'], [0.3, 'oben', -4, -6], [1, 'stehen']], ['ausruf'], true),
    A('nickt', 'ja', 1, [[0, 'stehen'], [0.25, 'nicken'], [0.5, 'stehen'], [0.75, 'nicken'], [1, 'stehen']]),
    A('schuettelt', 'nein', 1, [[0, 'stehen', 0, 0, 0], [0.25, 'schief', 0, 0, -4], [0.5, 'stehen', 0, 0, 0], [0.75, 'schief', 0, 0, 4], [1, 'stehen']]),
    A('lacht', 'freut sich', 0.6, [[0, 'hoch'], [0.5, 'hoch', 0, -2], [1, 'hoch']]),
    A('verbeugt', 'danke', 2, [[0, 'stehen'], [0.4, 'picken'], [0.6, 'picken'], [1, 'stehen']]),
    A('tanzt', 'gute Laune', 1.2, [[0, 'halb', 0, 0, -6], [0.5, 'oben', 0, -3, 6], [1, 'halb', 0, 0, -6]], ['noten']),
    A('dreht-sich', 'dreht sich einmal', 1.4, [[0, 'stehen', 0, 0, 0], [0.5, 'halb', 0, -4, 180], [1, 'stehen', 0, 0, 360]], [], true),
    A('staunt', 'oh!', 1.6, [[0, 'stehen'], [0.2, 'hoch', 0, -3], [1, 'hoch']], ['ausruf']),
    A('liebt', 'mag das', 2, [[0, 'schief'], [0.5, 'schief', 0, -1], [1, 'schief']], ['herz']),
    A('merkt-sich', 'gemerkt', 2, [[0, 'nicken'], [0.5, 'stehen'], [1, 'nicken']], ['blatt']),
    A('sucht', 'sucht etwas', 2.4, [[0, 'picken'], [0.5, 'nicken'], [1, 'picken']], ['lupe']),
    A('liest', 'liest', 3, [[0, 'nicken'], [0.5, 'nicken', 0, -0.6], [1, 'nicken']], ['blatt']),
    A('schreibt', 'schreibt', 1.2, [[0, 'nicken'], [0.5, 'picken'], [1, 'nicken']], ['stift']),
    A('speichert', 'speichert', 1.6, [[0, 'stehen'], [0.3, 'nicken'], [1, 'stehen']], ['diskette']),
    A('laedt', 'lädt', 2, [[0, 'schief'], [0.5, 'schief', 0, -1], [1, 'schief']], ['uhr']),
    A('senden', 'schickt los', 1.4, [[0, 'stehen'], [0.3, 'ducken'], [0.6, 'oben', 0, -4], [1, 'stehen']], ['pfeil']),
    A('offline', 'kein Netz', 4, [[0, 'ducken'], [0.5, 'ducken', 0, -0.5], [1, 'ducken']], ['offline']),
    A('login', 'Willkommen', 1.4, [[0, 'stehen'], [0.25, 'winken'], [0.5, 'stehen'], [0.75, 'winken'], [1, 'stehen']], ['herz']),
    A('neuer-entwurf', 'neues Blatt', 1.6, [[0, 'stehen'], [0.4, 'hoch'], [1, 'stehen']], ['plus']),
    A('lernt', 'lernt dazu', 3, [[0, 'nicken'], [0.5, 'hoch'], [1, 'nicken']], ['sterne']),
    A('prueft', 'Selbstprüfung', 2.4, [[0, 'nicken'], [0.5, 'schief'], [1, 'nicken']], ['lupe']),
    A('geprueft', 'alles sauber', 1.2, [[0, 'stehen'], [0.3, 'hoch', 0, -3], [1, 'stehen']], ['haken'], true),
    A('repariert', 'repariert', 1.6, [[0, 'picken'], [0.5, 'nicken'], [1, 'picken']], ['zahnrad']),
    A('misst', 'misst nach', 1.8, [[0, 'nicken'], [0.5, 'stehen'], [1, 'nicken']], ['lineal']),
    A('uebergibt', 'gibt das Paket ab', 1.6, [[0, 'stehen'], [0.4, 'winken'], [1, 'stehen']], ['paket']),
    A('feiert', 'feiert', 1, [[0, 'oben'], [0.5, 'oben', 0, -6], [1, 'oben']], ['konfetti']),
    A('plant', 'macht einen Plan', 2.4, [[0, 'nicken'], [0.5, 'schief'], [1, 'nicken']], ['liste']),
    A('wolke', 'träumt', 4, [[0, 'hoch'], [0.5, 'hoch', 0, -1], [1, 'hoch']], ['wolke']),
    A('kopiert', 'kopiert', 1.6, [[0, 'nicken'], [0.5, 'stehen'], [1, 'nicken']], ['kopieren']),
    A('stolz', 'stolz', 3, [[0, 'oben'], [0.5, 'oben', 0, -1], [1, 'oben']]),
    A('duckt-sich', 'macht sich klein', 1.4, [[0, 'stehen'], [0.5, 'ducken'], [1, 'ducken']], [], true),
    A('balanciert', 'auf einem Bein', 2, [[0, 'bein', 0, 0, -3], [0.5, 'halb', 0, 0, 3], [1, 'bein', 0, 0, -3]]),
    A('kuckuck', 'guckt hervor', 2.6, [[0, 'ducken', 0, 10], [0.4, 'hoch', 0, 0], [0.8, 'hoch'], [1, 'ducken', 0, 10]]),
  ];
  const KRANICH = [
    A('faltet', 'faltet einen Entwurf', 2.4, [[0, 'nicken'], [0.5, 'picken'], [1, 'nicken']], ['faltblatt']),
    A('entwirft', 'entwirft', 1.6, [[0, 'hoch'], [0.5, 'nicken'], [1, 'hoch']], ['stift']),
    A('varianten', 'faltet drei Fassungen', 1.6, [[0, 'nicken'], [0.5, 'schief'], [1, 'nicken']], ['blaetter3']),
    A('mischt', 'mischt Fassungen', 1.6, [[0, 'halb'], [0.5, 'unten'], [1, 'halb']], ['blaetter3']),
    A('malt', 'malt', 1, [[0, 'nicken'], [0.5, 'picken'], [1, 'nicken']], ['pinsel']),
    A('schneidet', 'schneidet zu', 1.2, [[0, 'nicken'], [0.5, 'picken'], [1, 'nicken']], ['schere']),
    A('stellt-frei', 'stellt frei', 2, [[0, 'picken'], [0.5, 'nicken'], [1, 'picken']], ['funken']),
    A('faerbt', 'färbt ein', 1.4, [[0, 'nicken'], [0.5, 'stehen'], [1, 'nicken']], ['farbe']),
    A('bild', 'schaut aufs Bild', 2.4, [[0, 'schief'], [0.5, 'nicken'], [1, 'schief']], ['bild']),
    A('text', 'setzt Text', 1.2, [[0, 'nicken'], [0.5, 'picken'], [1, 'nicken']], ['text']),
    A('baut', 'baut Bausteine', 2.4, [[0, 'picken'], [0.5, 'hoch'], [1, 'picken']], ['bloecke']),
    A('groessen', 'faltet alle Größen', 2, [[0, 'nicken'], [0.5, 'schief'], [1, 'nicken']], ['gross']),
    A('spielt-ab', 'spielt die App ab', 1.4, [[0, 'stehen'], [0.5, 'hoch'], [1, 'stehen']], ['play']),
    A('exportiert', 'exportiert', 1.6, [[0, 'stehen'], [0.3, 'winken'], [1, 'stehen']], ['datei']),
    A('zoomt', 'zoomt ran', 2.4, [[0, 'nicken'], [0.5, 'picken'], [1, 'nicken']], ['lupe']),
    A('skizziert', 'skizziert', 1.2, [[0, 'nicken'], [0.5, 'nicken', -1, 1], [1, 'nicken']], ['stift']),
    A('ordnet', 'ordnet Boards', 2.4, [[0, 'nicken'], [0.5, 'zurueck'], [1, 'nicken']], ['gross']),
    A('aus-bild', 'macht aus Bild einen Entwurf', 2.4, [[0, 'schief'], [0.5, 'nicken'], [1, 'schief']], ['bild', 'punkte']),
    A('kranich-tanz', 'der Kranichtanz', 2, [[0, 'oben', 0, -2, -4], [0.25, 'halb', 0, -8, 0], [0.5, 'strecken', 0, -2, 4], [0.75, 'halb', 0, -8, 0], [1, 'oben', 0, -2, -4]], ['noten']),
    A('wird-gefaltet', 'Papier wird zum Kranich', 1.8, [[0, 'ducken', 0, 4], [0.5, 'halb', 0, -2], [1, 'stehen']], ['faltblatt'], true),
  ];
  const ALBATROS = [
    A('tabelle-baut', 'baut eine Tabelle', 1.8, [[0, 'nicken'], [0.5, 'picken'], [1, 'nicken']], ['tabelle']),
    A('rechnet', 'rechnet', 1.2, [[0, 'schief'], [0.5, 'nicken'], [1, 'schief']], ['punkte']),
    A('summiert', 'bildet die Summe', 1.2, [[0, 'nicken'], [0.5, 'hoch'], [1, 'nicken']], ['summe']),
    A('sortiert', 'sortiert', 2, [[0, 'nicken'], [0.5, 'zurueck'], [1, 'nicken']], ['sortieren']),
    A('filtert', 'filtert', 1.6, [[0, 'picken'], [0.5, 'nicken'], [1, 'picken']], ['filter']),
    A('diagramm', 'macht ein Diagramm', 2, [[0, 'nicken'], [0.5, 'hoch'], [1, 'nicken']], ['diagramm']),
    A('torte', 'Tortendiagramm', 1.6, [[0, 'schief'], [0.5, 'nicken'], [1, 'schief']], ['torte']),
    A('trend-hoch', 'es geht bergauf', 1.6, [[0, 'stehen'], [0.5, 'hoch', 0, -2], [1, 'stehen']], ['trendhoch']),
    A('trend-runter', 'es geht bergab', 1.6, [[0, 'stehen'], [0.5, 'ducken'], [1, 'stehen']], ['trendrunter']),
    A('importiert', 'holt eine Datei rein', 2, [[0, 'zurueck'], [0.4, 'stehen'], [1, 'nicken']], ['datei']),
    A('raeumt-auf', 'räumt die Daten auf', 0.9, [[0, 'nicken'], [0.5, 'picken'], [1, 'nicken']], ['besen']),
    A('formel', 'erklärt eine Formel', 2, [[0, 'nicken'], [0.5, 'schief'], [1, 'nicken']], ['formel']),
    A('prozent', 'rechnet Prozente', 1.4, [[0, 'schief'], [0.5, 'nicken'], [1, 'schief']], ['prozent']),
    A('waehrung', 'rechnet in Euro', 1.4, [[0, 'nicken'], [0.5, 'hoch'], [1, 'nicken']], ['euro']),
    A('datum', 'sortiert nach Datum', 2, [[0, 'nicken'], [0.5, 'schief'], [1, 'nicken']], ['kalender']),
    A('vergleicht', 'vergleicht Spalten', 3, [[0, 'zurueck'], [0.5, 'stehen'], [1, 'zurueck']], ['tabelle']),
    A('zaehlt', 'zählt durch', 1.8, [[0, 'nicken'], [0.25, 'picken'], [0.5, 'nicken'], [0.75, 'picken'], [1, 'nicken']], ['punkte']),
    A('segelt', 'segelt über den Wellen', 2.4, [[0, 'oben', 0, -8, -4], [0.5, 'oben', 0, -10, 4], [1, 'oben', 0, -8, -4]], ['welle']),
    A('gleitet', 'gleitet lange', 3, [[0, 'halb', 0, -6], [0.5, 'halb', 0, -9], [1, 'halb', 0, -6]], ['wolke']),
    A('exportiert', 'speichert als Excel', 1.6, [[0, 'stehen'], [0.3, 'winken'], [1, 'stehen']], ['datei']),
  ];

  // ---------- Erzeugen ----------
  let nr = 0;
  const SPLINE = '0.45 0 0.55 1';
  function svgAnimation(vogelName, animName, groesse = 80, { hover = true } = {}) {
    const v = VOEGEL[vogelName] || VOEGEL.kranich;
    const liste = ANIMATIONEN[vogelName] || ANIMATIONEN.kranich;
    const a = liste.find((x) => x.name === animName) || liste.find((x) => x.name === 'ruhezustand');
    const id = `vg${++nr}`;
    const pose = (n) => ({ ...v.posen.stehen, ...(v.posen[n] || {}) });
    const k = a.k;
    const zeiten = k.map((x) => x[0]).join(';');
    const splines = Array(Math.max(1, k.length - 1)).fill(SPLINE).join(';');
    const wdh = a.einmal ? 'fill="freeze"' : 'repeatCount="indefinite"';
    const teile = v.teile.map(([t, f]) => {
      const werte = k.map((x) => pose(x[1])[t]);
      const gleich = werte.every((w) => w === werte[0]);
      const anim = gleich ? '' : `<animate attributeName="points" values="${werte.join(';')}" keyTimes="${zeiten}" dur="${a.d}s" ${wdh} calcMode="spline" keySplines="${splines}"></animate>`;
      const flatter = hover && t === 'fluegel' && !a.einmal ? `<animate attributeName="points" values="${pose('stehen')[t]};${pose('oben')[t]};${pose('halb')[t]};${pose('oben')[t]};${pose('stehen')[t]}" dur="0.8s" begin="${id}.mouseenter"></animate>` : '';
      return `<polygon points="${werte[0]}" fill="${v.farben[f]}">${anim}${flatter}</polygon>`;
    }).join('');
    const [fx, fy] = v.fuss;
    const bew = k.some((x) => x[2] || x[3]) ? `<animateTransform attributeName="transform" type="translate" values="${k.map((x) => `${x[2] || 0} ${x[3] || 0}`).join(';')}" keyTimes="${zeiten}" dur="${a.d}s" ${wdh} calcMode="spline" keySplines="${splines}"></animateTransform>` : '';
    const dreh = k.some((x) => x[4]) ? `<animateTransform attributeName="transform" type="rotate" additive="sum" values="${k.map((x) => `${x[4] || 0} ${fx} ${fy - 20}`).join(';')}" keyTimes="${zeiten}" dur="${a.d}s" ${wdh} calcMode="spline" keySplines="${splines}"></animateTransform>` : '';
    const rq = RQ(v.farben);
    const schatten = `<ellipse cx="${fx}" cy="87" rx="20" ry="2.4" fill="#1d2742" opacity="0.13"></ellipse>`;
    return `<svg id="${id}" viewBox="0 0 100 100" width="${groesse}" height="${groesse}" role="img" aria-label="${v.name}: ${a.info}" style="display:block;flex:none;overflow:visible">${schatten}<g>${bew}${dreh}${teile}</g>${a.r.map((n) => rq[n] || '').join('')}</svg>`;
  }

  const ANIMATIONEN = { kranich: [...GEMEINSAM, ...KRANICH], albatros: [...GEMEINSAM, ...ALBATROS.filter((x) => x.name !== 'exportiert'), ALBATROS.find((x) => x.name === 'exportiert')] };
  // Kranich: „exportiert“ gibt es in beiden Listen nur einmal
  ANIMATIONEN.kranich = ANIMATIONEN.kranich.filter((x, i, l) => l.findIndex((y) => y.name === x.name) === i);
  ANIMATIONEN.albatros = ANIMATIONEN.albatros.filter((x, i, l) => l.findIndex((y) => y.name === x.name) === i);

  const ziel = typeof window !== 'undefined' ? window : globalThis;
  ziel.Voegel = { VOEGEL, ANIMATIONEN, svg: svgAnimation };
})();
