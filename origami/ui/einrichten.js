'use strict';
// Einrichten- und Offline-Seite der origami-App.
(async () => {
  const $ = (id) => document.getElementById(id);
  const grund = new URLSearchParams(location.search).get('grund') || 'neu';
  const ori = (art) => { const s = window.ORI?.[art] || window.ORI?.['ruhezustand-3']; if (s) $('ori').innerHTML = s.replace(/__G__/g, '150'); };
  const e = (await window.ori?.einst()) || { adresse: '' };
  $('adresse').value = e.adresse || '';

  if (grund === 'offline') {
    ori('denkt-nach');
    $('gruss').textContent = 'Hm, ich finde origami gerade nicht.';
    $('titel').textContent = 'Ist dein Heim-PC an?';
    $('text').textContent = 'origami läuft auf deinem Heim-PC. Mach ihn an oder prüf die Adresse unten.';
    $('nochmal').hidden = false;
    $('los').textContent = 'Adresse speichern';
  } else if (grund === 'einst') {
    ori('ruhezustand-3');
    $('gruss').textContent = 'Umziehen?';
    $('titel').textContent = 'Adresse von origami';
    $('text').textContent = 'Wo läuft origami? Meist die Adresse deines Heim-PCs.';
    $('los').textContent = 'Speichern';
    if (e.adresse) $('nochmal').hidden = false, $('nochmal').textContent = 'Abbrechen';
  } else {
    ori('winkt');
  }

  $('nochmal').addEventListener('click', () => { ori('start-landung'); window.ori.nochmal(); });
  $('form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    $('fehler').textContent = '';
    const r = await window.ori.setzen($('adresse').value);
    if (r?.fehler) { $('fehler').textContent = r.fehler; $('adresse').focus(); return; }
    ori('erledigt');
  });
  $('adresse').focus();
})();
