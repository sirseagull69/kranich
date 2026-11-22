'use strict';
// Aufbereitung von Entwürfen für den Export.

// Entfernt die Kranich-internen Marken (data-k), damit der Code in einer App
// sauber aussieht. data-name bleibt optional erhalten.
function htmlFuerApp(html, { namenBehalten = false } = {}) {
  let aus = String(html).replace(/\sdata-k="[^"]*"/g, '');
  if (!namenBehalten) aus = aus.replace(/\sdata-name="[^"]*"/g, '');
  return aus;
}

// Packt den Entwurf als SVG mit eingebettetem HTML (foreignObject). Bleibt in
// Browsern und Figma-ähnlichen Programmen scharf; reine Zeichenprogramme
// zeigen foreignObject teils nicht an.
function svgAusHtml(html, breite, hoehe) {
  const sauber = htmlFuerApp(html);
  const kopf = (sauber.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [])[1] || '';
  const stile = [...kopf.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const koerper = (sauber.match(/<body([^>]*)>([\s\S]*?)<\/body>/i) || []);
  const inhalt = koerper[2] || '';
  const xml = (s) => s.replace(/&nbsp;/g, '&#160;').replace(/<(br|hr|img|input|meta|link)([^>]*?)\s*\/?>/gi, '<$1$2/>');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${breite}" height="${hoehe}" viewBox="0 0 ${breite} ${hoehe}">
<foreignObject x="0" y="0" width="${breite}" height="${hoehe}">
<div xmlns="http://www.w3.org/1999/xhtml" class="kranich-body" style="width:${breite}px;height:${hoehe}px;overflow:hidden">
<style><![CDATA[${stile.replace(/\bbody\b/g, '.kranich-body').replace(/\bhtml\b/g, '.kranich-body')}]]></style>
${xml(inhalt)}
</div>
</foreignObject>
</svg>`;
}

function dateiname(name) {
  return String(name || 'kranich')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
    .toLowerCase().slice(0, 60) || 'kranich';
}

module.exports = { htmlFuerApp, svgAusHtml, dateiname };
