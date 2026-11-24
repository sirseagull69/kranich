'use strict';
// .docx lesen (mammoth) und schreiben (eigenes, schlankes Word-XML).
// Das Dokument kommt als Liste von Blöcken aus der Oberfläche:
//   { art: 'h1'|'h2'|'h3'|'p'|'ul'|'ol'|'zitat', ausrichtung?: 'center'|'right'|'justify', laeufe: [{ t, f?, k?, u?, s? }] }
const JSZip = require('jszip');

const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function lauf(l) {
  const eig = `${l.f ? '<w:b/>' : ''}${l.k ? '<w:i/>' : ''}${l.u ? '<w:u w:val="single"/>' : ''}${l.s ? '<w:strike/>' : ''}`;
  const teile = String(l.t ?? '').split('\n');
  return teile.map((t, i) => `<w:r>${eig ? `<w:rPr>${eig}</w:rPr>` : ''}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${x(t)}</w:t></w:r>`).join('');
}
const STIL = { h1: 'Heading1', h2: 'Heading2', h3: 'Heading3', zitat: 'Quote', ul: 'ListParagraph', ol: 'ListParagraph' };
function absatz(b) {
  const stil = STIL[b.art];
  const num = b.art === 'ul' ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : b.art === 'ol' ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${b.liste || 2}"/></w:numPr>` : '';
  const aus = { center: 'center', right: 'right', justify: 'both' }[b.ausrichtung];
  const ppr = `${stil ? `<w:pStyle w:val="${stil}"/>` : ''}${num}${aus ? `<w:jc w:val="${aus}"/>` : ''}`;
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${(b.laeufe || []).map(lauf).join('')}</w:p>`;
}

function dokumentXml(bloecke) {
  // Jede neue nummerierte Liste beginnt wieder bei 1: eigene numId je Liste.
  let numId = 2; let vorher = '';
  const mitNum = bloecke.map((b) => { if (b.art === 'ol') { if (vorher !== 'ol') numId += 1; vorher = 'ol'; return { ...b, liste: numId }; } vorher = b.art; return b; });
  const body = (mitNum.length ? mitNum : [{ art: 'p', laeufe: [] }]).map(absatz).join('');
  return { xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`, listen: numId };
}

function numberingXml(listen) {
  const abs = `<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`;
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
</w:styles>`;

async function docxSchreiben(bloecke, titel = 'Dokument') {
  const zip = new JSZip();
  const { xml, listen } = dokumentXml(bloecke);
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`);
  zip.file('word/document.xml', xml);
  zip.file('word/styles.xml', STYLES);
  zip.file('word/numbering.xml', numberingXml(listen));
  const jetzt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(titel)}</dc:title><dc:creator>Schwalbe</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${jetzt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${jetzt}</dcterms:modified></cp:coreProperties>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function docxLesen(puffer) {
  const mammoth = require('mammoth');
  const r = await mammoth.convertToHtml({ buffer: puffer }, { styleMap: ['p[style-name=\'Title\'] => h1:fresh', 'p[style-name=\'Quote\'] => blockquote:fresh', 'u => u'] });
  return r.value;
}

module.exports = { docxSchreiben, docxLesen, dokumentXml };
