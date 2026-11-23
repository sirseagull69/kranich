'use strict';
// Der Kranich in drei Haltungen, genau wie im Canvas.
(function () {
  const SCHATTEN = '<ellipse cx="46" cy="87" rx="18" ry="2.4" fill="#1d2742" opacity="0.14"></ellipse>';
  const BEINE = '<polygon points="40,58 43,58 41,86" fill="#6243c4"></polygon><polygon points="48,58 51,58 52,86" fill="#6243c4"></polygon><polygon points="12,50 30,46 30,58" fill="#4a2f9a"></polygon>';

  // Hilfen für SMIL-Animationen
  const pts = (werte, keys, dur, extra = '') => `<animate attributeName="points" values="${werte.join(';')}" keyTimes="${keys}" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="${Array(werte.length - 1).fill('0.45 0 0.55 1').join(';')}" ${extra}></animate>`;
  const schwebe = (y, dur) => `<animateTransform attributeName="transform" type="translate" values="0 0;0 -${y};0 0" dur="${dur}" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"></animateTransform>`;
  let zaehler = 0;

  // Flügelschlag beim Drüberfahren (begin über die id des SVGs)
  const flattern = (id, grund, hoch) => `<animate attributeName="points" values="${grund};${hoch};${grund};${hoch};${grund}" dur="0.7s" begin="${id}.mouseenter" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"></animate>`;

  const HALTUNG = {
    still: () => `<g>${BEINE}<polygon points="24,58 62,58 46,38" fill="#7c5cd6"></polygon><polygon points="56,56 62,58 71,41" fill="#4a2f9a"></polygon><polygon points="30,52 56,55 38,32" fill="#d6caf9"></polygon><polygon points="71,41 84,48 69,47" fill="#1d2742"></polygon></g>`,
    // ruhig atmen, ab und zu nicken, Flügel hebt sich leicht
    ruhend: (id) => `<g>${schwebe(0.9, '4.2s')}${BEINE}<polygon points="24,58 62,58 46,38" fill="#7c5cd6"></polygon>
      <polygon points="56,56 62,58 71,41" fill="#4a2f9a">${pts(['56,56 62,58 71,41', '56,56 62,58 71,41', '56,56 62,58 73,45', '56,56 62,58 73,45', '56,56 62,58 71,41'], '0;0.78;0.84;0.92;1', '7s')}</polygon>
      <polygon points="30,52 56,55 38,32" fill="#d6caf9">${pts(['30,52 56,55 38,32', '30,52 56,55 36,29', '30,52 56,55 38,32'], '0;0.5;1', '4.2s')}${flattern(id, '30,52 56,55 38,32', '30,52 56,55 22,10')}</polygon>
      <polygon points="71,41 84,48 69,47" fill="#1d2742">${pts(['71,41 84,48 69,47', '71,41 84,48 69,47', '73,45 85,54 71,51', '73,45 85,54 71,51', '71,41 84,48 69,47'], '0;0.78;0.84;0.92;1', '7s')}</polygon></g>`,
    // faltet: wippt, pickt mit dem Kopf, Flügel arbeitet
    arbeitend: () => `<g>${schwebe(1.6, '1.2s')}${BEINE}<polygon points="24,58 62,58 46,38" fill="#7c5cd6"></polygon>
      <polygon points="56,56 62,58 64,9" fill="#4a2f9a">${pts(['56,56 62,58 64,9', '56,56 62,58 64,9', '56,56 62,58 60,11', '56,56 62,58 60,11', '56,56 62,58 64,9'], '0;0.4;0.5;0.85;1', '2.4s')}</polygon>
      <polygon points="30,52 56,55 34,27" fill="#d6caf9">${pts(['30,52 56,55 34,27', '30,52 56,55 28,22', '30,52 56,55 34,27'], '0;0.5;1', '0.9s')}</polygon>
      <polygon points="64,9 79,9 63,16" fill="#1d2742">${pts(['64,9 79,9 63,16', '64,9 79,9 63,16', '60,11 74,17 59,18', '60,11 74,17 59,18', '64,9 79,9 63,16'], '0;0.4;0.5;0.85;1', '2.4s')}</polygon></g>`,
    // fertig: hüpft zweimal und schlägt mit den Flügeln, dann stolz
    fertig: () => `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -7;0 0;0 -4;0 0" keyTimes="0;0.22;0.45;0.62;0.8" dur="1.3s" repeatCount="1" calcMode="spline" keySplines="0.2 0.8 0.4 1;0.6 0 0.8 0.4;0.2 0.8 0.4 1;0.6 0 0.8 0.4"></animateTransform>${BEINE}
      <polygon points="42,52 59,55 64,5" fill="#7c5cd6"><animate attributeName="points" values="42,52 59,55 64,5;42,52 59,55 74,14;42,52 59,55 64,5;42,52 59,55 74,14;42,52 59,55 64,5" dur="0.8s" repeatCount="2"></animate></polygon>
      <polygon points="24,58 62,58 46,38" fill="#7c5cd6"></polygon><polygon points="56,56 62,58 70,18" fill="#4a2f9a"></polygon>
      <polygon points="30,52 56,55 20,8" fill="#d6caf9"><animate attributeName="points" values="30,52 56,55 20,8;30,52 56,55 10,22;30,52 56,55 20,8;30,52 56,55 10,22;30,52 56,55 20,8" dur="0.8s" repeatCount="2"></animate></polygon>
      <polygon points="70,18 84,20 69,25" fill="#1d2742"></polygon></g>`,
    // schläft (keine Verbindung): Kopf eingezogen, langsam atmen, Zz
    schlaeft: () => `<g>${schwebe(0.6, '5s')}${BEINE}<polygon points="24,58 62,58 46,38" fill="#7c5cd6"></polygon><polygon points="56,56 62,58 58,44" fill="#4a2f9a"></polygon><polygon points="30,52 56,55 40,36" fill="#d6caf9"></polygon><polygon points="58,44 68,50 57,49" fill="#1d2742"></polygon></g>
      <text x="66" y="34" font-family="Caveat,cursive" font-size="14" fill="#7c5cd6">z<animate attributeName="opacity" values="0;1;0" dur="2.6s" repeatCount="indefinite"></animate><animateTransform attributeName="transform" type="translate" values="0 4;4 -6" dur="2.6s" repeatCount="indefinite"></animateTransform></text>
      <text x="74" y="24" font-family="Caveat,cursive" font-size="11" fill="#7c5cd6" opacity="0">z<animate attributeName="opacity" values="0;1;0" dur="2.6s" begin="1.3s" repeatCount="indefinite"></animate></text>`,
    // landet: kommt von oben angeflogen und setzt auf (einmal)
    landet: (id) => `<g opacity="0"><animate attributeName="opacity" values="0;1" dur="0.4s" fill="freeze"></animate><animateTransform attributeName="transform" type="translate" values="18 -30;4 -6;0 0" keyTimes="0;0.7;1" dur="1.1s" fill="freeze" calcMode="spline" keySplines="0.2 0.7 0.4 1;0.4 0 0.2 1"></animateTransform>${BEINE}<polygon points="24,58 62,58 46,38" fill="#7c5cd6"></polygon><polygon points="56,56 62,58 71,41" fill="#4a2f9a"></polygon>
      <polygon points="30,52 56,55 38,32" fill="#d6caf9"><animate attributeName="points" values="30,52 56,55 14,12;30,52 56,55 30,40;30,52 56,55 14,12;30,52 56,55 30,40;30,52 56,55 38,32" keyTimes="0;0.25;0.5;0.75;1" dur="1.1s" fill="freeze"></animate>${flattern(id, '30,52 56,55 38,32', '30,52 56,55 22,10')}</polygon>
      <polygon points="71,41 84,48 69,47" fill="#1d2742"></polygon></g>`,
  };
  const NAMEN = { still: 'Kranich', ruhend: 'Kranich ruhend', arbeitend: 'Kranich arbeitet', fertig: 'Kranich ist fertig', schlaeft: 'Kranich schläft', landet: 'Kranich landet' };

  window.figur = function figur(haltung = 'ruhend', groesse = 34) {
    const h = HALTUNG[haltung] ? haltung : 'ruhend';
    const id = `kr${++zaehler}`;
    return `<svg id="${id}" viewBox="0 0 100 100" width="${groesse}" height="${groesse}" role="img" aria-label="${NAMEN[h]}" style="display:block;flex:none;overflow:visible">${SCHATTEN}${HALTUNG[h](id)}</svg>`;
  };

  window.eselsohr = function eselsohr() { return ''; };
  window.eselsohrAlt = function eselsohrAlt(groesse = 54, grund = '#f6f1e7') {
    return `<svg viewBox="0 0 100 100" width="${groesse}" height="${groesse}" aria-hidden="true" class="eselsohr"><polygon points="100,38 100,100 38,100" fill="${grund}"></polygon><polygon points="38,100 100,38 38,38" fill="#7c5cd6"></polygon><polygon points="38,100 38,38 69,69" fill="#4a2f9a"></polygon></svg>`;
  };

  // Symbole aus dem Canvas (Strichzeichnungen, 24er Raster).
  const SYM = {
    haken: 'M5 12.5l4.5 4.5L19 7.5', zurueck: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
    varianten: 'M3 6h5v12H3zM10 6h5v12h-5zM17 6h4v12h-4z', export: 'M12 4v11M7 10l5 5 5-5M4 20h16',
    seite: 'M6 3h9l4 4v14H6zM15 3v4h4', plus: 'M12 5v14M5 12h14', box: 'M4 6h16v13H4z', text: 'M5 6V4h14v2M12 4v16M9 20h6',
    liste: 'M4 6h16M4 12h16M4 18h16', klammer: 'm21 12-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.7 3.7 0 0 1 5.2 5.2l-9.2 9.2a1.8 1.8 0 0 1-2.6-2.6L15.5 7',
    senden: 'M12 19V5M5 12l7-7 7 7', ordner: 'M3 7h6l2 2h10v10H3z', zahnrad: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    verschieben: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
    zuschneiden: 'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14', pinsel: 'M18.4 2.6a2 2 0 0 1 2.9 2.9L11 15.8 8.2 13zM8 14c-2 0-3.5 1.5-3.5 3.5C4.5 19 3 20 2 20c1.5 1.3 3.5 2 5 2a4 4 0 0 0 4-4z',
    radierer: 'M7 21h10M5.5 13.5l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 19H8l-2.5-2.5a2.1 2.1 0 0 1 0-3z',
    auswahl: 'M4 4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4',
    freistellen: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z', farbe: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1a1.5 1.5 0 0 1 1.1-2.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8zM7.5 11.5h.01M10.5 7.5h.01M15 7.5h.01',
    auge: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', muell: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    links: 'M15 18l-6-6 6-6', rechts: 'M9 18l6-6-6-6', pfeilrechts: 'M5 12h14M13 6l6 6-6 6', suche: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
    handy: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2', tablet: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
    web: 'M3 5h18v14H3zM3 9h18', fenster: 'M3 4h18v12H3zM8 20h8M12 16v4', plakat: 'M6 3h9l4 4v14H6zM15 3v4h4', uhr: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    lineal: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2', stern: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    zeiger: 'M5 3l14 7-6 2-2 6z', hand: 'M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A5.5 5.5 0 0 1 5 17.6L3.3 14a1.5 1.5 0 0 1 2.6-1.5L8 15',
    bild: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01', form: 'M9 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM11 11h10v10H11z', linie: 'M3 17c3-6 6 2 9-4s6-2 9-8',
    ebenen: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17.5 12 22.5l10-5', teilen: 'M4 12v8h16v-8M12 3v12M7 8l5-5 5 5', start: 'M3 11 12 4l9 7v9H3z',
    mikro: 'M9 3h6v11H9zM5 11a7 7 0 0 0 14 0M12 18v3', schliessen: 'M6 6l12 12M18 6L6 18', mischen: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  };
  window.sym = function sym(name, groesse = 16, breite = 2) {
    const d = SYM[name] || SYM.box;
    return `<svg width="${groesse}" height="${groesse}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${breite}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;flex:none"><path d="${d}"></path></svg>`;
  };
})();
