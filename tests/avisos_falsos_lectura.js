#!/usr/bin/env node
'use strict';
/*
 * Guardià · 12/11/2026 (Z_tot) · TRES AVISOS FALSOS DE LA LECTURA PER LÍNIES, SENSE PERDRE ELS DE DEBÒ.
 * Documents inventats, català i castellà, cap dada de cap client (va també al repositori públic).
 *  1) «UNA PARTIDA CONTÉ LA CAPÇALERA D'UNA ALTRA» en un document sense capçaleres reconegudes: el càlcul escrit dins la frase de la descripció
 *     («… 12,0 + 8,0 ml * 0,30 m = 6,00 m2.») es prenia per fila de mesura; text darrere i les files de debò → «dues partides». Ara no; una unió
 *     de debò (files, text d'una altra partida, files) i una fila de taula amb «=» sense punt final segueixen sortint.
 *  2) «SUBPARTIDA SENSE LÍNIA AL DOCUMENT»: la subpartida porta la fitxa sencera del catàleg (nom + descripció del producte) i el nom de la IA en
 *     l'altra llengua; es mirava el 60 % de totes les paraules de la fitxa. Ara també el nom de la fitxa i el nom de la IA, amb l'arrel de cada
 *     paraula (català ↔ castellà). Una subpartida que no és al text (un fals sostre en una coberta) segueix en vermell.
 *  3) La fila de títols de columna «Nº ORDRE UNIT. DESCRIPCIÓ PARTIDA a b c d parcial partida» (i «UNT») sortia com a nota sota el capítol.
 *     Ara és fila de títols; amb «UNIT.» o «UNT» el document té columna d'unitat. Una frase normal no ho és.
 *  6) La descripció d'una partida llegida per línies perdia sense avís la frase de la línia de la quantitat («… de la obra. 120,00»): ara entra
 *     (la xifra no); una fila de mesura, un total o una etiqueta no. Guardià de l'app: una línia de frase del tram que no és a la descripció es diu.
 *  7) La quantitat sola en una línia enmig del paràgraf («Una» / «1» / «vez …») no entra a la frase; una xifra dins la frase no es toca.
 * Cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.split(de).join(a); return s === src ? null : s; };
function fiBloc(H, s) { let i = H.indexOf('{', s), d = 0; for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) return i + 1; } } return -1; }
// les funcions REALS de l'app: les demanades i tot el que fan servir (per nom), en l'ordre del fitxer
function carrega(H, volgudes) {
  const M = new Map(), re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^const\s+([A-Za-z_$][\w$]*)\s*=/gm; let m;
  while ((m = re.exec(H))) { const n = m[1] || m[2]; if (M.has(n)) continue; const e = m[1] ? fiBloc(H, m.index) : H.indexOf('\n', m.index); M.set(n, { i: m.index, s: H.slice(m.index, e < 0 ? H.length : e) }); }
  const dins = new Set(), cua = volgudes.slice();
  while (cua.length) { const n = cua.pop(); if (dins.has(n) || !M.has(n)) continue; dins.add(n); (M.get(n).s.match(/(?<![\w$])_[\w$]+/g) || []).forEach(x => { if (M.has(x) && !dins.has(x)) cua.push(x); }); }
  const src = [...dins].map(n => M.get(n)).sort((a, b) => a.i - b.i).map(x => x.s).join('\n');
  try { return new Function('window', 'IDIOMA', src + '\nreturn {' + volgudes.filter(n => M.has(n)).map(n => n + ':' + n).join(',') + '};')({ _lrLinies: true }, 'ca'); }
  catch (e) { return { _error: e.message }; }
}
const VOL = ['_p12Unio', '_p10SubAncorada', '_esCapcaleraColumnes', '_docSenseColumnaUnitat'];
const cap = () => false;

// ── documents inventats ──
const DOC1 = {
  ca: ['1 TREBALLS DE TERRAT', '1.1 m2 Impermeabilització de terrat amb làmina 40,00', 'Neteja del suport i imprimació de tota la superfície.',
    'Inclou el minvell perimetral amb una superfície total de minvell de 12,0 + 8,0 ml', '* 0,30 m = 6,00 m2.', 'Làmina de betum modificat col·locada en calent,',
    'amb solapaments de 10 cm i segellat de totes les trobades amb paraments verticals.', 'TERRAT A 1,00 25,00', 'TERRAT B 1,00 15,00'],
  es: ['1 TRABAJOS DE AZOTEA', '1.1 m2 Impermeabilización de azotea con lámina 40,00', 'Limpieza del soporte e imprimación de toda la superficie.',
    'Incluye el remate perimetral con una superficie total de remate de 12,0 + 8,0 ml * 0,30 m = 6,00 m2.', 'Lámina de betún modificado colocada en caliente,',
    'con solapes de 10 cm y sellado de todos los encuentros con paramentos verticales.', 'AZOTEA A 1,00 25,00', 'AZOTEA B 1,00 15,00'],
  // dues partides llegides com una: files, el text de la segona, files
  unio: ['1 TREBALLS DE TERRAT', '1.1 m2 Neteja de terrat 40,00', 'Neteja amb aigua a pressió de tota la superfície.', 'TERRAT A 1,00 25,00', 'TERRAT B 1,00 15,00',
    'Reparació de fissures del paviment amb morter de reparació i segellat posterior', 'TERRAT A 1,00 4,00', 'TERRAT B 1,00 2,00'],
  // files amb etiqueta llarga (cinc paraules) que acaben en xifra: segueixen sent files
  unioLlarga: ['1 TREBALLS DE FAÇANA', '1.1 m2 Neteja de façana 40,00', 'Neteja amb aigua a pressió de tota la superfície.', 'Planta baixa façana del carrer principal 1,00 25,00',
    'Planta primera façana del carrer principal 1,00 15,00', 'Reparació de fissures del parament amb morter de reparació i segellat posterior', 'Planta baixa façana lateral esquerra 1,00 4,00'],
  // un TOTAL «Total = 40,00 m2.» (amb = i punt final) és tancament, no fórmula de la frase
  unioTotal: ['1 TRABAJOS DE AZOTEA', '1.1 m2 Limpieza de azotea 40,00', 'Limpieza con agua a presión de toda la superficie.', 'AZOTEA A 1,00 25,00', 'Total = 40,00 m2.',
    'Reparación de fisuras del pavimento con mortero de reparación y sellado posterior', 'AZOTEA A 1,00 4,00', 'Total = 4,00 m2.'],
  // la fila de la primera partida porta «=» però no és cap frase (sense punt final): la unió segueix sortint
  unioIgual: ['1 TRABAJOS DE AZOTEA', '1.1 m2 Limpieza de azotea 40,00', 'Limpieza con agua a presión de toda la superficie.', 'AZOTEA 2,00 x 20,00 = 40,00',
    'Reparación de fisuras del pavimento con mortero de reparación y sellado posterior', 'AZOTEA A 1,00 4,00', 'AZOTEA B 1,00 2,00'],
};
const PAR = { t: 'part', l: [2, 9] };
const LIN2 = { ca: DOC1.ca, es: ['1 TRABAJOS DE AZOTEA', '1.1 m2 Impermeabilización de azotea 40,00', 'Limpieza con agua a presión del pavimento existente.',
  'Capa de regularización con mortero de cemento de 3 cm de espesor.', 'Formación de junta de dilatación perimetral con masilla.', 'AZOTEA 1,00 40,00'] };
const SUBS = [
  // [nom, document, partida, subpartida, esperat]
  ['fitxa catalana + nom castellà (document català)', 'ca', { t: 'part', l: [2, 9] }, { t: 'sub', desc: 'IMPERMEABILITZACIÓ AMB LÀMINA DE BETUM - Subministrament i col·locació de làmina de betum modificat tipus LBM-40 armada amb feltre de polièster, inclosa imprimació asfàltica prèvia.', cat: 'IMPERMEABILIZACIÓN CON LÁMINA DE BETÚN', a: 40, p: 31 }, true],
  // 16:30 · un sinònim (bituminosa / betum) ja NO es dona per bo: queda vermell (millor rojo visible que suposar)
  ['un sinònim que el document no escriu (bituminosa) segueix vermell', 'ca', { t: 'part', l: [2, 9] }, { t: 'sub', cat: 'IMPERMEABILIZACIÓN CON LÁMINA BITUMINOSA', a: 40, p: 31 }, false],
  ['fitxa catalana en un document castellà', 'es', { t: 'part', l: [2, 6] }, { t: 'sub', desc: 'CAPA DE REGULARITZACIÓ - Formació de capa de regularització del solat amb morter de ciment i àrid fi en les zones necessàries.', a: 40, p: 7 }, true],
  ['nom castellà de la IA amb arrels (làmina modificat / lámina modificado)', 'ca', { t: 'part', l: [2, 9] }, { t: 'sub', cat: 'LÁMINA BETÚN MODIFICADO', a: 40, p: 5 }, true],
  ['una subpartida que el document no diu (fals sostre) segueix vermella', 'ca', { t: 'part', l: [2, 9] }, { t: 'sub', desc: 'FORMACIÓ DE FALS SOSTRE DE PLACA DE GUIX - Subministrament i muntatge de fals sostre continu de placa de guix laminat.', cat: 'FORMACIÓN DE FALSO TECHO DE PLACA DE YESO', a: 40, p: 78 }, false],
  ['una feina que el document no diu (desmuntatge) encara que hi surti el material segueix vermella', 'ca', { t: 'part', l: [2, 9] }, { t: 'sub', cat: 'DESMUNTATGE DE LÀMINES BETUMINOSES', a: 7, p: 13 }, false],
  ['un nom d\'una sola paraula curta no prova res', 'es', { t: 'part', l: [2, 6] }, { t: 'sub', cat: 'MURO', a: 40, p: 9 }, false],
  ['una subpartida d\'una altra feina en castellà segueix vermella', 'es', { t: 'part', l: [2, 6] }, { t: 'sub', desc: 'BAJANTE DE PVC DN 110 - Suministro y colocación de bajante de PVC con abrazaderas.', cat: 'BAJANTE DE PVC', a: 40, p: 25 }, false],
];
const COL = [
  ['Nº ORDRE UNIT. DESCRIPCIÓ PARTIDA a b c d parcial partida', true], ['Nº ORDEN UNT DESCRIPCIÓN PARTIDA a b c d parcial partida', true],
  ['CODI UT DESCRIPCIÓ QUANTITAT PREU IMPORT', true], ['Pintat de la barana a dues mans', false], ['Neteja de façana amb aigua a pressió', false], ['a b c d', false],
];

function prova(H) {
  const res = [], c = (n, v, x) => res.push([n, v, x]); const F = carrega(H, VOL);
  if (F._error) { c('les funcions de l\'app es carreguen', false, F._error); return res; }
  VOL.forEach(n => c('l\'app té ' + n, typeof F[n] === 'function'));
  if (VOL.some(n => typeof F[n] !== 'function')) return res;
  // 1) unió
  c('ca: el càlcul dins la frase no fa «dues partides»', F._p12Unio(DOC1.ca, 1, DOC1.ca.length - 1, cap) === false);
  c('es: el cálculo dentro de la frase no hace «dos partidas»', F._p12Unio(DOC1.es, 1, DOC1.es.length - 1, cap) === false);
  c('una unió de debò (files, text, files) segueix sortint', F._p12Unio(DOC1.unio, 1, DOC1.unio.length - 1, cap) === true);
  c('files amb etiqueta llarga que acaben en xifra: la unió surt', F._p12Unio(DOC1.unioLlarga, 1, DOC1.unioLlarga.length - 1, cap) === true);
  c('amb TOTAL: la unió surt', F._p12Unio(DOC1.unioTotal, 1, DOC1.unioTotal.length - 1, cap) === true);
  c('una fila amb «=» sense punt final segueix sent fila (la unió surt)', F._p12Unio(DOC1.unioIgual, 1, DOC1.unioIgual.length - 1, cap) === true);
  // 2) subpartides
  SUBS.forEach(([n, d, par, it, esp]) => { let v; try { v = F._p10SubAncorada(LIN2[d].slice(), par, Object.assign({}, it)); } catch (e) { v = 'PETA ' + e.message; } c('subpartida: ' + n, v === esp, 'dona ' + v); });
  // 3) fila de títols de columna
  COL.forEach(([l, esp]) => c('títols de columna «' + l + '» → ' + esp, F._esCapcaleraColumnes(l) === esp));
  c('document amb «UNIT.» o «UNT» té columna d\'unitat', F._docSenseColumnaUnitat('x\nNº ORDRE UNT DESCRIPCIÓ PARTIDA a b c d parcial partida\n1.1 m2 Pintat 3,00') === false);
  c('document amb «PARTIDA DESCRIPCIÓ QUANTITAT» no en té', F._docSenseColumnaUnitat('x\nPARTIDA DESCRIPCIÓ QUANTITAT\n1.1 M2 de pintat 3,00') === true);
  // la nota sota el capítol salta la fila de títols (és la mateixa funció de títols)
  c('la nota sota el capítol salta la fila de títols', /if\(_esCapcaleraColumnes\(l\)\|\|\(typeof _esPeuDePagina==="function"&&_esPeuDePagina\(l\)\)\) continue;/.test(H));
  return res;
}

console.log('── TRES AVISOS FALSOS DE LA LECTURA (' + path.basename(HTML) + ') ──');
prova(H0).forEach(([n, c, x]) => check(n, c, x));

// ── cada peça trencada es veu (només si l'app ja porta el canvi) ──
if (ko === 0) {
  const PECES = [
    ['la fórmula dins la frase no és fila', 'if(!t||omet(j,t)||_p12Formula(t)) continue;', 'if(!t||omet(j,t)) continue;'],
    ['la fórmula acaba en punt', '\\s*\\.$/i.test(t)||', '\\s*\\.?$/i.test(t)||'],
    ['la línia de frase que no acaba en xifra', '||(_p12Dec(t)>=1&&_p12Pal(t)>=5&&!/\\d[.,]?\\d*\\s*$/.test(t)); };', '; };'],
    ['un tancament sempre és fila', 'if(_p12Tanca(t)) return false; return /=', 'return /='],
    ['el nom de la fitxa del catàleg', 'for(const c of [nom(it.desc),nom(it.cat)]){', 'for(const c of []){'],
    ['totes les paraules del nom', 'if(wz.every(w=>bw.some(b=>b.startsWith(w.slice(0,4))))) return true;', 'if(wz.length>=2) return true;'],
    ['les paraules noves de títols de columna', '|ordre|orden|unit\\.?|unt\\.?|[a-d]|codi|', '|codi|'],
    ['UNT és columna d\'unitat', '|un\\.?|unt\\.?|unitats?|', '|un\\.?|unitats?|'],
  ];
  PECES.forEach(([nom, de, a]) => { const Hx = trenca(H0, de, a); if (!Hx) { check('peça trencada «' + nom + '»: el tros hi és', false, 'no trobat: ' + de.slice(0, 80)); return; }
    const r = prova(Hx); check('peça trencada «' + nom + '» → es veu', r.some(x => !x[1]), 'cap comprovació ha fallat'); });
}
// ── 6 i 7 · LA DESCRIPCIÓ NO PERD TEXT I NO S'HI COLA LA QUANTITAT (bloc propi: carrega amb consts de diverses línies) ──
{
function fiConst(H, s) { let e = H.indexOf('\n', s); const obre = l => (l.match(/{/g) || []).length - (l.match(/}/g) || []).length; let d = obre(H.slice(s, e)); while (d > 0 && e > 0) { const e2 = H.indexOf('\n', e + 1); d += obre(H.slice(e, e2)); e = e2; } return e; }
function carrega(H, volgudes) {
  const M = new Map(), re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^const\s+([A-Za-z_$][\w$]*)\s*=/gm; let m;
  while ((m = re.exec(H))) { const n = m[1] || m[2]; if (M.has(n)) continue; const e = m[1] ? fiBloc(H, m.index) : fiConst(H, m.index); M.set(n, { i: m.index, s: H.slice(m.index, e < 0 ? H.length : e) }); }
  const dins = new Set(), cua = volgudes.slice();
  while (cua.length) { const n = cua.pop(); if (dins.has(n) || !M.has(n)) continue; dins.add(n); (M.get(n).s.match(/(?<![\w$])_[\w$]+/g) || []).forEach(x => { if (M.has(x) && !dins.has(x)) cua.push(x); }); }
  const src = [...dins].map(n => M.get(n)).sort((a, b) => a.i - b.i).map(x => x.s).join('\n');
  try { return new Function('window', 'IDIOMA', src + '\nreturn {' + volgudes.filter(n => M.has(n)).map(n => n + ':' + n).join(',') + '};')({ _lrLinies: true }, 'ca'); }
  catch (e) { return { error: e.message }; }
}
const D = {
  es: ['1 TRABAJOS DE FACHADA', '1.1 m2 Limpieza de fachada con agua a presión, incluyendo todos los medios', 'auxiliares necesarios según las indicaciones del',
    'pliego de condiciones de la obra. 120,00'],
  ca: ['1 TREBALLS DE FAÇANA', '1.1 m2 Neteja de façana amb aigua a pressió, inclosos tots els mitjans auxiliars', 'necessaris i la retirada de runa segons les indicacions',
    'de la direcció facultativa de l\'obra 85,50'],
  taula: ['1 TREBALLS DE FAÇANA', '1.2 ml Segellat de junts amb massilla de poliuretà a tota la façana.', 'Façana principal 1,00 40,00 40,00'],
  taulaOberta: ['1 TREBALLS DE FAÇANA', '1.5 ml Segellat de junts amb massilla de poliuretà a tota la façana', 'Façana principal planta baixa i primera 1,00 40,00'],
  etiqueta: ['1 TREBALLS DE FAÇANA', '1.3 ml Segellat de junts amb massilla de poliuretà a tota la façana.', 'Façana principal 40,00'],
  total: ['1 TRABAJOS DE FACHADA', '1.4 ml Sellado de juntas con masilla de poliuretano en toda la fachada.', 'TOTAL MEDICIÓN 40,00'],
  xifra: ['2 TRABAJOS DE BALCONES', '2.1 ud Retirada de la pieza existente de coronación del balcón. Una', '1', 'vez retirada, colocación de la nueva pieza de 5 cm de espesor.'],
  // soroll real de documents públics (inventat): fila amb fórmula al final, etiqueta en majúscules, rètol repetit, inici d'una altra partida
  soroll: ['3 INSTAL·LACIONS', '3.1 u Subministrament i col·locació de lavabo de porcellana blanca amb aixeta.', '12 INODOR+CISTERNA+SEIENT T CANT',
    'Zona vestidors planta baixa 2,000 1,000 2,000 C#*D#', 'Rètol de la zona comuna', 'Rètol de la zona comuna 1 3,15', 'Rètol de la zona comuna 2 2,00', '4 EQX1234 U Suport de paret per a lavabo amb fixacions', 'novembre de 2026 12 CAPÍTOL 04 FUSTERIA EXTERIOR I VIDRES'],
  xifraNo: ['2 TRABAJOS DE BALCONES', '2.2 ud Retirada de la pieza existente de coronación del balcón. Una', '7', 'vez retirada, colocación de la nueva pieza de 5 cm de espesor.'],
};
const IT = {
  es: { t: 'part', l: [2, 4], d: 3, q: 4, c: '1.1', u: 'm2', a: 120, salta: [] },
  ca: { t: 'part', l: [2, 4], d: 3, q: 4, c: '1.1', u: 'm2', a: 85.5, salta: [] },
  taula: { t: 'part', l: [2, 3], d: 2, q: 3, c: '1.2', u: 'ml', a: 40, salta: [] },
  taulaOberta: { t: 'part', l: [2, 3], d: 2, q: 3, c: '1.5', u: 'ml', a: 40, salta: [] },
  etiqueta: { t: 'part', l: [2, 3], d: 2, q: 3, c: '1.3', u: 'ml', a: 40, salta: [] },
  total: { t: 'part', l: [2, 3], d: 2, q: 3, c: '1.4', u: 'ml', a: 40, salta: [] },
  xifra: { t: 'part', l: [2, 4], d: 4, q: 3, c: '2.1', u: 'ud', a: 1, salta: [3] },
  soroll: { t: 'part', l: [2, 9], d: 2, q: null, c: '3.1', u: 'u', a: 12, salta: [] },
  xifraNo: { t: 'part', l: [2, 4], d: 4, q: null, c: '2.2', u: 'ud', a: 1, salta: [] },
};
function prova(H, etiq) {
  const F = carrega(H, ['_lrDesc', '_lrTextPerdut']); if (F.error || !F._lrDesc) { check(etiq + 'funcions carregades', false, F.error || 'no hi és'); return; }
  const de = k => F._lrDesc(D[k], IT[k], new Set()), gu = (k, desc) => F._lrTextPerdut ? F._lrTextPerdut(D[k], IT[k], desc, new Set()) : null;
  const es = de('es'), ca = de('ca');
  check(etiq + 'es: la frase de la línia de la quantitat entra', /pliego de condiciones de la obra\.$/.test(es) && !/120/.test(es), es);
  check(etiq + 'ca: sense punt final, la frase oberta entra', /de la direcció facultativa de l'obra$/.test(ca) && !/85/.test(ca), ca);
  check(etiq + 'una fila de mesura no entra', !/Façana principal/.test(de('taula')), de('taula'));
  check(etiq + 'una fila de mesura darrere una frase oberta no entra', !/Façana principal/.test(de('taulaOberta')), de('taulaOberta'));
  check(etiq + 'una etiqueta curta darrere una frase tancada no entra', !/Façana principal/.test(de('etiqueta')), de('etiqueta'));
  check(etiq + 'un total no entra', !/TOTAL/i.test(de('total')), de('total'));
  const x = de('xifra'), xn = de('xifraNo');
  check(etiq + 'la quantitat sola enmig de la frase no entra («Una vez»)', /Una\s+vez retirada/.test(x) && /5 cm/.test(x), x);
  check(etiq + 'una xifra sola que no és la quantitat no es toca', /Una 7 vez|Una\n7/.test(xn), xn);
  // guardià: frase perduda → línia; files de mesura i total → res
  check(etiq + 'guardià: frase perduda es diu', JSON.stringify(gu('es', 'Limpieza de fachada con agua a presión, incluyendo todos los medios auxiliares necesarios según las indicaciones del')) === '[4]', JSON.stringify(gu('es', 'Limpieza de fachada con agua a presión, incluyendo todos los medios auxiliares necesarios según las indicaciones del')));
  check(etiq + 'guardià: descripció sencera, res', JSON.stringify(gu('es', es)) === '[]', JSON.stringify(gu('es', es)));
  check(etiq + 'guardià: fórmula al final, etiqueta, rètol repetit i inici d\'una altra partida no compten', JSON.stringify(gu('soroll', D.soroll[1].replace(/^3\.1 u /, ''))) === '[]', JSON.stringify(gu('soroll', D.soroll[1].replace(/^3\.1 u /, ''))));
  check(etiq + 'guardià: fila de mesura i total no compten', JSON.stringify(gu('taula', de('taula'))) === '[]' && JSON.stringify(gu('total', de('total'))) === '[]');
  // 13/11/2026 · la lectura posa la PRIMERA línia (codi, unitat, títol i quantitat) a «salta»: la línia és a la descripció, no és text perdut
  const P1 = Object.assign({}, IT.es, { salta: [2] }), C1 = ['1 TREBALLS PREVIS', '1.1 ut Proteccions de zones de pas 1,00', 'Proteccions del paviment amb cartrons i plàstics durant tota la obra.', 'ZONES COMUNES 1,00 1,00 1,00'],
    I1 = { t: 'part', l: [2, 4], d: 3, q: 2, c: '1.1', u: 'ut', a: 1, salta: [2] }, d1 = F._lrDesc(D.es, P1, new Set()), dc1 = F._lrDesc(C1, I1, new Set());
  check(etiq + 'guardià: la primera línia a «salta» (frase llarga) no és text perdut', JSON.stringify(F._lrTextPerdut(D.es, P1, d1, new Set())) === '[]', JSON.stringify(F._lrTextPerdut(D.es, P1, d1, new Set())));
  check(etiq + 'guardià: la primera línia a «salta» (títol curt amb quantitat) no és text perdut', JSON.stringify(F._lrTextPerdut(C1, I1, dc1, new Set())) === '[]', JSON.stringify(F._lrTextPerdut(C1, I1, dc1, new Set())));
  check(etiq + 'guardià: amb la primera línia a «salta», la frase perduda es segueix dient', JSON.stringify(F._lrTextPerdut(D.es, P1, 'Limpieza de fachada con agua a presión, incluyendo todos los medios auxiliares necesarios según las indicaciones del', new Set())) === '[4]');
}
console.log('── ÚLTIMA LÍNIA I XIFRA COLADA (' + path.basename(HTML) + ') ──');
prova(H0, '');
// la marca del guardià no ha de tapar cap altra marca de la fila (p. ex. «EL TÍTOL NO QUADRA», que fa r.flag=r.flag||…): es posa l'última
{ const iAv = H0.indexOf('_lrAvisPartides(L,rows,av,ES);\n'), iPos = H0.indexOf('_p10Marca(r,r._tpF)'), dir = /_lrTextPerdut\(L,it,[^\n]*\n[^\n]*r\._tpF=/.test(H0);
  check('guardià: la marca es guarda a part i es posa després de les altres marques', dir && iAv > 0 && iPos > iAv, 'iAv=' + iAv + ' iPos=' + iPos + ' dir=' + dir); }
const PECES = [
  ['la línia de la quantitat amb text', 'if(x) out.push(x); }', '}'],
  ['la xifra sola de la quantitat', '&&_lrNomesQ(t,it)) continue;', '&&false) continue;', '&&_lrSaltaFora(L,t,rep,it)) continue;', '&&false) continue;'],
  ['la primera línia no compta com a «salta»', 'if(salta.has(j)&&j>it.l[0]-1&&j<=it.l[1]-1){', 'if(salta.has(j)&&j<=it.l[1]-1){'],
  ['el guardià mira','if(ws.filter(w=>D.has(w)).length<Math.ceil(ws.length*0.5)) out.push(j+1); }', '}'],
  ['fila amb dues xifres amb decimals', '(?!\\d)/g)||[]).length>=2) continue;', '(?!\\d)/g)||[]).length>=99) continue;'],
  ['línia repetida 3 vegades', '(L._lrVegades.get(t)||0)>=3) continue;', '(L._lrVegades.get(t)||0)>=99) continue;', 'if(_lrEtiqMesura(L,j,t)) continue;', ''],   // 13/11/2026: el rètol curt davant d'una fila de mesura ja el treu també la regla de l'etiqueta de mesura: es trenquen totes dues
  ['etiqueta en majúscules', '&&!/\\p{Ll}{3}/u.test(t)) continue;', '&&false) continue;'],
  ['capçalera de capítol', '\\b(?:sub)?cap[íi]t(?:ulo|ol)\\b|', '\\bXXXX\\b|'],
  ['inici d\'una altra partida', '|ml|kg|h|pa|t)\\s/i.test(t)) continue;', '|ml|kg|h|pa|t)\\s/i.test(t)&&false) continue;'],
  ['una fila de mesura no és frase', 'if(/(?:^|\\s)-?\\d[\\d.,]*\\s*(?:m2|m²|m3|m³|ml|m|uds?\\.?|u|kg|h|x|=)?$/i.test(x)||', 'if('],
];
PECES.forEach(([nom, de, a, de2, a2]) => { let Hx = trenca(H0, de, a); if (Hx && de2) Hx = trenca(Hx, de2, a2) || Hx; if (!Hx) { check('peça trencada «' + nom + '»: el tros hi és', false, 'no trobat: ' + de.slice(0, 80)); return; }
  const k0 = ko, o0 = ok; const log = console.log, err = console.error; console.log = () => {}; console.error = () => {}; prova(Hx, ''); console.log = log; console.error = err;
  const caigut = ko > k0; ko = k0; ok = o0; check('peça trencada «' + nom + '» → es veu', caigut, 'cap comprovació ha fallat'); });
}
// ── 8, 9 i 10 · RONDA 2 (12/11/2026): nota darrere la partida, desglossament repetit, paràgraf repetit (textos inventats) ──
{
function fiConst(H, s) { let e = H.indexOf('\n', s); const obre = l => (l.match(/{/g) || []).length - (l.match(/}/g) || []).length; let d = obre(H.slice(s, e)); while (d > 0 && e > 0) { const e2 = H.indexOf('\n', e + 1); d += obre(H.slice(e, e2)); e = e2; } return e; }
function carrega(H, volgudes) {
  const M = new Map(), re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^const\s+([A-Za-z_$][\w$]*)\s*=/gm; let m;
  while ((m = re.exec(H))) { const n = m[1] || m[2]; if (M.has(n)) continue; const e = m[1] ? fiBloc(H, m.index) : fiConst(H, m.index); M.set(n, { i: m.index, s: H.slice(m.index, e < 0 ? H.length : e) }); }
  const dins = new Set(), cua = volgudes.slice();
  while (cua.length) { const n = cua.pop(); if (dins.has(n) || !M.has(n)) continue; dins.add(n); (M.get(n).s.match(/(?<![\w$])_[\w$]+/g) || []).forEach(x => { if (M.has(x) && !dins.has(x)) cua.push(x); }); }
  const src = [...dins].map(n => M.get(n)).sort((a, b) => a.i - b.i).map(x => x.s).join('\n');
  try { return new Function('window', 'IDIOMA', src + '\nreturn {' + volgudes.filter(n => M.has(n)).map(n => n + ':' + n).join(',') + '};')({ _lrLinies: true }, 'es'); }
  catch (e) { return { error: e.message }; }
}
// 9 · desglossament de la mesura amb rètols repetits al document (3+ vegades): entra sencer; el rètol de pàgina (a sobre de la capçalera de columnes), el subtotal i la capçalera «Unitats Total», no
const L9 = ['2 TRABAJOS DE BARANDILLAS', '2.1 m2 Pintado de barandillas de terraza con esmalte sintético, dos manos.', 'BLOQUE NORTE.', 'Terraza A 2,00 3,50 7,00', 'BLOQUE SUR.', 'Terraza B 2,00 3,50 7,00', 'TOTAL 14,00'];
const I9 = { t: 'part', l: [2, 7], d: 2, q: 7, c: '2.1', u: 'm2', a: 14, salta: [3, 4, 5, 6, 7] }, R9 = new Set(['BLOQUE NORTE.', 'BLOQUE SUR.']);
const L9b = ['2 TRABAJOS DE BARANDILLAS', '2.2 m2 Lijado de barandillas de terraza con medios manuales y cepillo,', 'EDIFICIO INVENTADO DE PRUEBA', 'Nº ORDEN UD DESCRIPCIÓN a b c d parcial partida', 'con imprimación previa de las zonas oxidadas.', '1 LIJADO C Unitats Total', '3 Subtotal S 10,000', 'TOTAL 10,00'];
const I9b = { t: 'part', l: [2, 8], d: 5, q: 8, c: '2.2', u: 'm2', a: 10, salta: [3, 4, 6, 7] }, R9b = new Set(['EDIFICIO INVENTADO DE PRUEBA']);
// 8 · la nota entre parèntesis darrere la línia de la quantitat, abans de la partida següent: no es perd
const L8 = ['5 CERRAJERÍA', '5.1 ud Revisión y ajuste de las rejas metálicas de las ventanas de planta baja,', 'incluso engrase de bisagras.', 'TOTAL 3,00',
  '(Nota: si la reja está muy deteriorada se sustituirá por otra de iguales', 'características, previa aprobación de la dirección facultativa).', '5.2 ud Sustitución de la cerradura de la puerta de acceso al patio.', 'TOTAL 1,00'];
const I8 = [{ t: 'cap', l: 1, niv: 2 }, { t: 'part', l: [2, 4], d: 3, q: 4, c: '5.1', u: 'ud', a: 3, salta: [] }, { t: 'nota', l: [5, 6], mena: 'nota' }, { t: 'part', l: [7, 8], d: 7, q: 8, c: '5.2', u: 'ud', a: 1, salta: [] }];
function prova8(H, etiq) {
  const F = carrega(H, ['_lrDesc', '_lrTextPerdut', '_lrFiles', '_alDocPerLinies']); if (F.error || !F._lrDesc) { check(etiq + 'funcions carregades', false, F.error || 'no hi és'); return; }
  const d9 = F._lrDesc(L9, I9, R9);
  check(etiq + '9 · el desglossament amb rètols repetits entra sencer', /BLOQUE NORTE\./.test(d9) && /BLOQUE SUR\./.test(d9) && /Terraza B 2,00/.test(d9) && !/TOTAL/.test(d9), d9);
  check(etiq + '9 · guardià: amb el desglossament sencer, res', JSON.stringify(F._lrTextPerdut(L9, I9, d9, R9)) === '[]', JSON.stringify(F._lrTextPerdut(L9, I9, d9, R9)));
  const g9 = F._lrTextPerdut(L9, I9, L9[1].replace(/^2\.1 m2 /, ''), R9);
  check(etiq + '9 · guardià: el desglossament que falta es diu', JSON.stringify(g9) === '[3,4,5,6]', JSON.stringify(g9));
  const d9b = F._lrDesc(L9b, I9b, R9b);
  check(etiq + '9 · rètol de pàgina, capçalera, subtotal i «Unitats Total» no entren', /imprimación previa/.test(d9b) && !/EDIFICIO INVENTADO|Nº ORDEN|Subtotal|Unitats/.test(d9b), d9b);
  let r8 = null; try { r8 = F._lrFiles ? F._lrFiles(L8, I8, [], new Set(), true) : null; } catch (e) { r8 = { error: e.message }; }
  const rows8 = (r8 && r8.rows) || [];
  check(etiq + '8 · la nota «(Nota: …)» darrere la partida surt a la seva fila', rows8.some(r => r && /\(Nota: si la reja/.test(r.desc || '') && r.tipo !== 'part') && rows8.filter(r => r && r.tipo === 'part').length === 2, JSON.stringify(r8 && (r8.error || rows8.map(r => r && [r.tipo, String(r.desc || '').slice(0, 40)]))));
  check(etiq + '8 · guardià: la nota no queda com a text perdut de cap partida', r8 && !r8.error && !rows8.some(r => r && /QUE NO (?:ÉS|ESTÁ)/.test((r._tpF || '') + (r.flag || ''))), JSON.stringify(rows8.map(r => r && (r._tpF || r.flag || ''))));
  const SL = '2.1 m2 pintado de barandillas de terraza.\ntotal 14,00\nse incluyen todos los medios auxiliares.\n2.2 m2 lijado de barandillas.';
  const ok10 = typeof F._alDocPerLinies === 'function' && F._alDocPerLinies('Pintado de barandillas de terraza.\nSe incluyen todos los medios auxiliares.', SL, 0, SL.indexOf('2.2 m2'));
  const no10 = typeof F._alDocPerLinies === 'function' && !F._alDocPerLinies('Pintado de barandillas de terraza.\nSe incluye la retirada de runa al vertedero.', SL, 0, SL.indexOf('2.2 m2'));
  check(etiq + '10 · paràgraf del document amb un TOTAL al mig: no és «text de més»', ok10, String(ok10));
  check(etiq + '10 · una frase que no és al document sí que ho és', no10, String(no10));
}
console.log('── RONDA 2: NOTA, DESGLOSSAMENT I PARÀGRAF REPETIT (' + path.basename(HTML) + ') ──');
prova8(H0, '');
}
console.log('\n' + (ko ? 'X ' + ko + ' FALLEN' : 'OK') + ' · ' + ok + ' comprovacions en verd' + (ko ? ', ' + ko + ' en vermell' : ''));
process.exit(ko ? 1 : 0);
