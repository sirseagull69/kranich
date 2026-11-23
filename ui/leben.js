'use strict';
// Leben in den Vogel: beim Drüberfahren winkt er, zwischendurch macht er von selbst kleine Sachen.
(function () {
  const ZWISCHENDURCH = ['winkt', 'sassy', 'gemerkt', 'applaus', 'triumph', 'seufzt', 'ruhezustand-2', 'ruhezustand-4', 'neuer-chat', 'aufwachen', 'ungeduldig'];
  const DAUER = (name) => (/ruhezustand|ungeduldig/.test(name) ? 5000 : name === 'aufwachen' ? 3800 : 3400);
  const ZIELE = '.sk-marke, .chatfigur, .figurecke';

  function ruhig(box) {
    if (!box.matches('.chatfigur')) return true;
    const z = window.App?.S?.kranich?.zustand;
    return z === 'bereit' || z === 'fertig';
  }
  function spiele(box, name) {
    if (!box || box.dataset.spielt || !ruhig(box)) return;
    const alt = box.querySelector('svg');
    if (!alt || !window.figur) return;
    const g = Number(alt.getAttribute('width')) || 34;
    const neu = document.createElement('div');
    neu.innerHTML = window.figur(name, g);
    const svg = neu.firstElementChild;
    if (!svg) return;
    box.dataset.spielt = '1';
    alt.replaceWith(svg);
    setTimeout(() => {
      if (svg.isConnected) svg.replaceWith(alt);
      delete box.dataset.spielt;
    }, DAUER(name));
  }

  document.addEventListener('mouseover', (e) => {
    const box = e.target.closest?.(ZIELE);
    if (box && !box.contains(e.relatedTarget)) spiele(box, 'winkt');
  });

  function naechstes() {
    setTimeout(() => {
      if (!document.hidden) {
        const boxen = [...document.querySelectorAll(ZIELE)].filter((b) => b.offsetParent);
        const box = boxen[Math.floor(Math.random() * boxen.length)];
        spiele(box, ZWISCHENDURCH[Math.floor(Math.random() * ZWISCHENDURCH.length)]);
      }
      naechstes();
    }, 9000 + Math.random() * 12000);
  }
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) naechstes();
})();
