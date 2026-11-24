'use strict';
// .docx lesen (mammoth + eigene Ergänzungen) und schreiben (eigenes Word-XML).
// Das Dokument kommt als Liste von Blöcken aus der Oberfläche:
//   { art: 'h1'|'h2'|'h3'|'p'|'ul'|'ol'|'zitat', ausrichtung?, abstand?, laeufe: [lauf] }
//   { art: 'tabelle', zeilen: [[{ laeufe, kopf? }]] }
//   { art: 'bild', daten: '<base64>', typ: 'png'|'jpeg'|'gif', breite: px, hoehe: px, ausrichtung? }
//   { art: 'umbruch' }            – Seitenumbruch
//   { art: 'inhalt' }             – Inhaltsverzeichnis (Word aktualisiert es beim Öffnen)
// lauf: { t, f?, k?, u?, s?, groesse?: pt, farbe?: '#rrggbb', mark?: '#rrggbb', schrift?, link?, hoch?, tief?,
//         kom?: Kommentar-Id, ins?: { autor, zeit }, del?: { autor, zeit } }
// Optionen: { kopf?: text, fuss?: text, seitenzahlen?: bool, quer?: bool, kommentare?: [{ id, autor, text, zeit, antworten? }] }
const JSZip = require('jszip');

const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex = (c) => (/^#?[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).replace('#', '').toUpperCase() : null);
// Word kennt für Textmarker nur feste Farben; wir nehmen die nächste.
function markerName(c) {
  // nach Farbton zuordnen – auch Pastelltöne (#fff59d) landen so beim passenden Word-Marker
  const h = hex(c); if (!h) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (max === min || d / max < 0.15) return 'lightGray';
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; hue = (hue * 60 + 360) % 360;
  if (hue < 15 || hue >= 330) return 'red';
  if (hue < 75) return 'yellow';
  if (hue < 160) return 'green';
  if (hue < 200) return 'cyan';
  if (hue < 260) return 'blue';
  return 'magenta';
}

class Schreiber {
  constructor() { this.rels = []; this.medien = []; this.listen = 2; this.komIds = new Map(); this.aendNr = 100; }
  komNr(id) { if (!this.komIds.has(id)) this.komIds.set(id, this.komIds.size); return this.komIds.get(id); }
  rel(typ, ziel, extern) { const id = `rId${10 + this.rels.length}`; this.rels.push({ id, typ, ziel, extern }); return id; }

  lauf(l) {
    let eig = '';
    if (l.schrift) eig += `<w:rFonts w:ascii="${x(l.schrift)}" w:hAnsi="${x(l.schrift)}" w:cs="${x(l.schrift)}"/>`;
    if (l.f) eig += '<w:b/>';
    if (l.k) eig += '<w:i/>';
    if (l.s) eig += '<w:strike/>';
    if (hex(l.farbe)) eig += `<w:color w:val="${hex(l.farbe)}"/>`;
    else if (l.link) eig += '<w:color w:val="1E4FA0"/>';
    if (l.groesse) eig += `<w:sz w:val="${Math.round(Number(l.groesse) * 2)}"/>`;
    if (markerName(l.mark)) eig += `<w:highlight w:val="${markerName(l.mark)}"/>`;
    if (l.u || l.link) eig += '<w:u w:val="single"/>';
    if (l.hoch) eig += '<w:vertAlign w:val="superscript"/>';
    if (l.tief) eig += '<w:vertAlign w:val="subscript"/>';
    const teile = String(l.t ?? '').split('\n');
    const tt = l.del ? 'w:delText' : 'w:t';
    let r = teile.map((t, i) => `<w:r>${eig ? `<w:rPr>${eig}</w:rPr>` : ''}${i ? '<w:br/>' : ''}<${tt} xml:space="preserve">${x(t)}</${tt}></w:r>`).join('');
    const rev = (a) => `w:id="${this.aendNr++}" w:author="${x(a?.autor || 'Schwalbe')}"${/^\d{4}-\d\d-\d\dT/.test(a?.zeit || '') ? ` w:date="${x(a.zeit)}"` : ''}`;
    if (l.del) r = `<w:del ${rev(l.del)}>${r}</w:del>`;
    else if (l.ins) r = `<w:ins ${rev(l.ins)}>${r}</w:ins>`;
    if (l.link && /^(https?:|mailto:)/i.test(l.link)) return `<w:hyperlink r:id="${this.rel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', l.link, true)}">${r}</w:hyperlink>`;
    return r;
  }

  ppr(b, extra = '') {
    const stil = { h1: 'Heading1', h2: 'Heading2', h3: 'Heading3', zitat: 'Quote', ul: 'ListParagraph', ol: 'ListParagraph' }[b.art];
    const num = b.art === 'ul' ? `<w:numPr><w:ilvl w:val="${b.ebene || 0}"/><w:numId w:val="1"/></w:numPr>` : b.art === 'ol' ? `<w:numPr><w:ilvl w:val="${b.ebene || 0}"/><w:numId w:val="${b.liste || 2}"/></w:numPr>` : '';
    const abst = b.abstand ? `<w:spacing w:line="${Math.round(Number(b.abstand) * 240)}" w:lineRule="auto"/>` : '';
    const aus = { center: 'center', right: 'right', justify: 'both' }[b.ausrichtung];
    const p = `${stil ? `<w:pStyle w:val="${stil}"/>` : ''}${num}${abst}${aus ? `<w:jc w:val="${aus}"/>` : ''}${extra}`;
    return p ? `<w:pPr>${p}</w:pPr>` : '';
  }
  // Läufe mit Kommentar-Bereichen; Start/Ende werden am Schluss über alle Absätze bereinigt
  laeufe(liste) {
    let s = ''; let offen = null;
    for (const l of liste || []) {
      const k = l.kom || null;
      if (k !== offen) { if (offen) s += `\u0001E${this.komNr(offen)}\u0001`; if (k) s += `\u0001S${this.komNr(k)}\u0001`; offen = k; }
      s += this.lauf(l);
    }
    if (offen) s += `\u0001E${this.komNr(offen)}\u0001`;
    return s;
  }
  absatz(b) { return `<w:p>${this.ppr(b)}${this.laeufe(b.laeufe)}</w:p>`; }

  bild(b) {
    const typ = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif' }[String(b.typ || '').toLowerCase()];
    if (!typ || !b.daten) return '';
    const n = this.medien.length + 1; const name = `bild${n}.${typ === 'jpeg' ? 'jpg' : typ}`;
    this.medien.push({ name, daten: Buffer.from(b.daten, 'base64') });
    const id = this.rel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', `media/${name}`);
    // px → EMU (96 dpi), höchstens Seitenbreite (16 cm)
    let w = Math.max(16, Number(b.breite) || 400); let h = Math.max(16, Number(b.hoehe) || 300);
    const max = 605; if (w > max) { h = Math.round(h * max / w); w = max; }
    const cx = Math.round(w * 9525); const cy = Math.round(h * 9525);
    const aus = { center: 'center', right: 'right' }[b.ausrichtung];
    return `<w:p>${aus ? `<w:pPr><w:jc w:val="${aus}"/></w:pPr>` : ''}<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Bild ${n}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }

  tabelle(b) {
    const zeilen = (b.zeilen || []).filter((z) => z.length);
    if (!zeilen.length) return '';
    const spalten = Math.max(...zeilen.map((z) => z.length));
    const breite = Math.floor(9072 / spalten); // Satzspiegel A4 in Twips
    const rand = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="B9C4D6"/>`).join('') + '</w:tblBorders>';
    const kopf = zeilen[0].every((c) => c.kopf);
    let s = `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${rand}<w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${breite}"/>`.repeat(spalten)}</w:tblGrid>`;
    zeilen.forEach((z, zi) => {
      s += `<w:tr>${zi === 0 && kopf ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}`;
      for (let i = 0; i < spalten; i++) {
        const c = z[i] || { laeufe: [] };
        const laeufe = (c.laeufe || []).map((l) => (c.kopf ? { ...l, f: true } : l));
        s += `<w:tc><w:tcPr><w:tcW w:w="${breite}" w:type="dxa"/>${c.kopf ? '<w:shd w:val="clear" w:color="auto" w:fill="DBE6F7"/>' : ''}</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${this.laeufe(laeufe)}</w:p></w:tc>`;
      }
      s += '</w:tr>';
    });
    return `${s}</w:tbl><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
  }

  inhalt(ueberschriften = []) {
    // Feld mit vorausgefülltem Ergebnis: sieht sofort richtig aus, Word kann es später aktualisieren (Seitenzahlen)
    const zeilen = ueberschriften.length ? ueberschriften.map((h) => `<w:p><w:pPr><w:pStyle w:val="TOC${h.ebene}"/></w:pPr><w:r><w:t xml:space="preserve">${x(h.text)}</w:t></w:r></w:p>`) : ['<w:p><w:r><w:t>Noch keine Überschriften.</w:t></w:r></w:p>'];
    const [erste, ...rest] = zeilen;
    const anfang = '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>';
    const ersteMit = erste.replace(/(<w:p>(?:<w:pPr>.*?<\/w:pPr>)?)/, `$1${anfang}`);
    const letzte = (rest.length ? rest : [null]);
    const ende = '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
    if (!rest.length) return `<w:p><w:pPr><w:pStyle w:val="TOCHeading"/></w:pPr><w:r><w:t>Inhalt</w:t></w:r></w:p>${ersteMit.replace('</w:p>', `${ende}</w:p>`)}`;
    const zuletzt = letzte[letzte.length - 1].replace(/<\/w:p>$/, `${ende}</w:p>`);
    return `<w:p><w:pPr><w:pStyle w:val="TOCHeading"/></w:pPr><w:r><w:t>Inhalt</w:t></w:r></w:p>${ersteMit}${rest.slice(0, -1).join('')}${zuletzt}`;
  }

  body(bloecke) {
    const roh = this.bodyRoh(bloecke);
    const erst = new Map(); const letzt = new Map();
    for (const m of roh.matchAll(/\u0001([SE])(\d+)\u0001/g)) { if (m[1] === 'S' && !erst.has(m[2])) erst.set(m[2], m.index); if (m[1] === 'E') letzt.set(m[2], m.index); }
    return roh.replace(/\u0001([SE])(\d+)\u0001/g, (t, art, id, pos) => {
      if (art === 'S') return erst.get(id) === pos ? `<w:commentRangeStart w:id="${id}"/>` : '';
      return letzt.get(id) === pos ? `<w:commentRangeEnd w:id="${id}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>` : '';
    });
  }

  bodyRoh(bloecke) {
    let vorher = '';
    return bloecke.map((b) => {
      if (b.art === 'ol') { if (vorher !== 'ol') this.listen += 1; vorher = 'ol'; return this.absatz({ ...b, liste: this.listen }); }
      vorher = b.art;
      if (b.art === 'tabelle') return this.tabelle(b);
      if (b.art === 'bild') return this.bild(b);
      if (b.art === 'umbruch') return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      if (b.art === 'inhalt') return this.inhalt(bloecke.filter((y) => /^h[123]$/.test(y.art)).map((y) => ({ ebene: Number(y.art[1]), text: (y.laeufe || []).map((l) => l.t).join('').replace(/\n/g, ' ').trim() })).filter((y) => y.text));
      return this.absatz(b);
    }).join('');
  }
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

function kopfFussXml(art, text, seitenzahlen, sw) {
  const tag = art === 'kopf' ? 'w:hdr' : 'w:ftr';
  let inhalt = text ? sw.lauf({ t: text, groesse: 9, farbe: '#5D6478' }) : '';
  if (seitenzahlen) inhalt += `${text ? '<w:r><w:tab/></w:r>' : ''}<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="5D6478"/></w:rPr><w:t xml:space="preserve">Seite </w:t></w:r><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="5D6478"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="5D6478"/></w:rPr><w:t xml:space="preserve"> von </w:t></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
  const jc = text && seitenzahlen ? '<w:tabs><w:tab w:val="right" w:pos="9072"/></w:tabs>' : `<w:jc w:val="${seitenzahlen ? 'right' : 'left'}"/>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${tag} ${NS}><w:p><w:pPr><w:pStyle w:val="${art === 'kopf' ? 'Header' : 'Footer'}"/>${jc}</w:pPr>${inhalt}</w:p></${tag}>`;
}

function numberingXml(listen) {
  const lvl = (fmt, txt, i) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${txt}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + i * 360}" w:hanging="360"/></w:pPr></w:lvl>`;
  const abs = `<w:abstractNum w:abstractNumId="0">${[0, 1, 2].map((i) => lvl('bullet', ['•', '◦', '▪'][i], i)).join('')}</w:abstractNum><w:abstractNum w:abstractNumId="1">${[0, 1, 2].map((i) => lvl(['decimal', 'lowerLetter', 'lowerRoman'][i], `%${i + 1}.`, i)).join('')}</w:abstractNum>`;
  let nums = '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>';
  for (let i = 3; i <= listen; i++) nums += `<w:num w:numId="${i}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${abs}${nums}</w:numbering>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="de-DE"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1E3F75"/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="1E3F75"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="567"/></w:pPr><w:rPr><w:i/><w:color w:val="555555"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="CommentText"><w:name w:val="annotation text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="CommentReference"><w:name w:val="annotation reference"/><w:rPr><w:sz w:val="16"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/><w:basedOn w:val="Heading1"/><w:next w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="284"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC3"><w:name w:val="toc 3"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="567"/></w:pPr></w:style>
</w:styles>`;

async function docxSchreiben(bloecke, titel = 'Dokument', opt = {}) {
  const sw = new Schreiber();
  const body = sw.body(Array.isArray(bloecke) && bloecke.length ? bloecke : [{ art: 'p', laeufe: [] }]);
  const zip = new JSZip();
  let sect = '';
  if (opt.kopf || opt.kopfSeitenzahlen) { const id = sw.rel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/header', 'header1.xml'); zip.file('word/header1.xml', kopfFussXml('kopf', opt.kopf || '', false, sw)); sect += `<w:headerReference w:type="default" r:id="${id}"/>`; }
  if (opt.fuss || opt.seitenzahlen) { const id = sw.rel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', 'footer1.xml'); zip.file('word/footer1.xml', kopfFussXml('fuss', opt.fuss || '', Boolean(opt.seitenzahlen), sw)); sect += `<w:footerReference w:type="default" r:id="${id}"/>`; }
  const komListe = (opt.kommentare || []).filter((k) => sw.komIds.has(k.id));
  if (komListe.length) {
    sw.rel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments', 'comments.xml');
    const absatz = (t, erster) => `<w:p><w:pPr><w:pStyle w:val="CommentText"/></w:pPr>${erster ? '<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:annotationRef/></w:r>' : ''}<w:r><w:t xml:space="preserve">${x(t)}</w:t></w:r></w:p>`;
    zip.file('word/comments.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${NS}>${komListe.map((k) => {
      const zeilen = String(k.text || '').split('\n');
      for (const a of k.antworten || []) zeilen.push(`↳ ${a.autor || ''}: ${a.text || ''}`);
      if (k.erledigt) zeilen.push('(erledigt)');
      const ini = String(k.autor || 'S').split(/\s+/).map((w) => w[0]).join('').slice(0, 3);
      return `<w:comment w:id="${sw.komNr(k.id)}" w:author="${x(k.autor || 'Schwalbe')}" w:initials="${x(ini)}"${/^\d{4}-/.test(k.zeit || '') ? ` w:date="${x(String(k.zeit).replace(/\.\d+Z$/, 'Z'))}"` : ''}>${zeilen.map((t, i) => absatz(t, i === 0)).join('')}</w:comment>`;
    }).join('')}</w:comments>`);
  }
  const pg = opt.quer ? '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' : '<w:pgSz w:w="11906" w:h="16838"/>';
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr>${sect}${pg}<w:pgMar w:top="1417" w:right="1417" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${opt.kopf ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ''}${opt.fuss || opt.seitenzahlen ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ''}${komListe.length ? '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' : ''}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  const rels = [
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    ...sw.rels.map((r) => `<Relationship Id="${r.id}" Type="${r.typ}" Target="${x(r.ziel)}"${r.extern ? ' TargetMode="External"' : ''}/>`),
  ];
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
  zip.file('word/styles.xml', STYLES);
  zip.file('word/numbering.xml', numberingXml(sw.listen));
  // Felder (Inhaltsverzeichnis, Seitenzahlen) beim Öffnen aktualisieren
  zip.file('word/settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${bloecke.some((b) => b.art === 'inhalt') ? '<w:updateFields w:val="true"/>' : ''}<w:defaultTabStop w:val="708"/><w:lang w:val="de-DE"/></w:settings>`);
  for (const m of sw.medien) zip.file(`word/media/${m.name}`, m.daten);
  const jetzt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(titel)}</dc:title><dc:creator>Schwalbe</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${jetzt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${jetzt}</dcterms:modified></cp:coreProperties>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Kopf-/Fußzeilentext aus einer .docx (mammoth liest die nicht)
async function kopfFussLesen(puffer) {
  try {
    const zip = await JSZip.loadAsync(puffer);
    const text = async (muster) => {
      const n = Object.keys(zip.files).filter((f) => muster.test(f)).sort()[0]; if (!n) return { text: '', seiten: false };
      const xml = await zip.file(n).async('string');
      const t = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s*Seite\s*(von)?\s*$/i, '').trim();
      return { text: t, seiten: /PAGE/.test(xml) };
    };
    const k = await text(/^word\/header\d*\.xml$/); const f = await text(/^word\/footer\d*\.xml$/);
    return { kopf: k.text, fuss: f.text, seitenzahlen: f.seiten || k.seiten };
  } catch { return { kopf: '', fuss: '', seitenzahlen: false }; }
}

// Kommentare und nachverfolgte Änderungen als Marker in den Text holen (mammoth kennt sie nicht)
async function vorbereiten(puffer) {
  const zip = await JSZip.loadAsync(puffer);
  const dok = zip.file('word/document.xml'); if (!dok) return { puffer, kommentare: [], aenderungen: {} };
  let xml = await dok.async('string');
  const ent = (t) => String(t).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const at = (s, n) => { const m = new RegExp(`w:${n}="([^"]*)"`).exec(s); return m ? ent(m[1]) : ''; };
  const mk = (t) => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;
  const aenderungen = {};
  if (!/commentRange|<w:ins\b|<w:del\b/.test(xml)) return { puffer, kommentare: [], aenderungen };
  xml = xml.replace(/<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:commentReference\b[^>]*\/>[\s\S]*?<\/w:r>/g, '');
  xml = xml.replace(/<w:commentRangeStart\b[^>]*w:id="(\d+)"[^>]*\/>/g, (m, id) => mk(`⟦K:${id}⟧`));
  xml = xml.replace(/<w:commentRangeEnd\b[^>]*w:id="(\d+)"[^>]*\/>/g, (m, id) => mk(`⟦/K:${id}⟧`));
  xml = xml.replace(/<w:ins\b([^>]*[^/])>/g, (m, a) => { const id = at(a, 'id'); aenderungen[`I${id}`] = { autor: at(a, 'author'), zeit: at(a, 'date') }; return mk(`⟦I:${id}⟧`); }).replace(/<\/w:ins>/g, mk('⟦/I⟧'));
  xml = xml.replace(/<w:del\b([^>]*[^/])>/g, (m, a) => { const id = at(a, 'id'); aenderungen[`D${id}`] = { autor: at(a, 'author'), zeit: at(a, 'date') }; return mk(`⟦D:${id}⟧`); }).replace(/<\/w:del>/g, mk('⟦/D⟧'));
  xml = xml.replace(/<w:delText\b/g, '<w:t').replace(/<\/w:delText>/g, '</w:t>');
  zip.file('word/document.xml', xml);
  const kommentare = [];
  const kx = zip.file('word/comments.xml') ? await zip.file('word/comments.xml').async('string') : '';
  for (const m of kx.matchAll(/<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g)) {
    const text = [...m[2].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((p) => [...p[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((t) => ent(t[1])).join('')).join('\n').trim();
    kommentare.push({ id: `w${at(m[1], 'id')}`, autor: at(m[1], 'author') || 'Unbekannt', zeit: at(m[1], 'date'), text, antworten: [] });
  }
  return { puffer: await zip.generateAsync({ type: 'nodebuffer' }), kommentare, aenderungen };
}

async function docxLesen(eingang) {
  const mammoth = require('mammoth');
  const { puffer, kommentare, aenderungen } = await vorbereiten(eingang);
  const r = await mammoth.convertToHtml({ buffer: puffer }, {
    styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Quote'] => blockquote:fresh", "p[style-name='Intense Quote'] => blockquote:fresh", 'u => u', 'strike => s', "r[style-name='Hyperlink'] => "],
    convertImage: mammoth.images.imgElement((bild) => bild.read('base64').then((d) => ({ src: `data:${bild.contentType};base64,${d}` }))),
  });
  const kf = await kopfFussLesen(eingang);
  return { html: r.value, ...kf, kommentare, aenderungen };
}

module.exports = { docxSchreiben, docxLesen, Schreiber };
