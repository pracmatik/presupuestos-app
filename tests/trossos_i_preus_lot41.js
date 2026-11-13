#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 41 (27/10/2026) · TROSSOS SOLTS I LLISTES DE PREUS LLEGITS COM A PARTIDA. Documents inventats, català i castellà, cap dada de cap client
 * (va també al repositori públic).
 *  1) el preu en lletres tallat («0,83 OCHENTA Y TRES CÉNTIMOS», «2,34 DOS EUROS CON TREINTA Y…», «4,10 QUATRE EUROS AMB DEU…») és una fila de llista de preus;
 *     un import en xifres dins del text («partida de 1.500,00 euros per a imprevistos») no;
 *  2) una fila que només és una línia de mesura («SALA 2 18,93 3,45 130,62», «1,00 7.418,01 7.418,01») es marca i es diu en vermell; una partida de debò amb
 *     xifres al títol («FORMIGÓ … DE 0,15 M … 2,50 M») o amb les seves línies de mesura al text, no;
 *  3) el document torna a escriure la capçalera del capítol a la pàgina següent («Capítol nº 3 OBRES DE PALETA» dues vegades, només amb totals de partida
 *     entremig): un sol capítol; amb un «TOTAL CAPÍTOL» entremig, si el document l'escriu una sola vegada o amb un altre número, no es toca;
 *  4) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.split(de).join(a); return s === src ? null : s; };
function eF(H, n) { const s = H.indexOf('function ' + n + '('); if (s < 0) throw new Error('no ' + n); let i = H.indexOf('{', s), d = 0; for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) return H.slice(s, i + 1); } } }
function eC(H, n) { const s = H.indexOf('const ' + n + '='); if (s < 0) throw new Error('no ' + n); const f = H[s + n.length + 7] === '[' ? H.indexOf('\n];', s) + 3 : H.indexOf('\n', s); return H.slice(s, f); }
function carrega(H, idioma) {
  const i = H.indexOf('// ==== INICI EINES DE LECTURA ===='), f = H.indexOf('// ==== FI EINES DE LECTURA ====');
  const deh = (H.match(/function _dehyphen\(s\)\{[^\n]*\}/) || [''])[0] + '\n' + ((H.match(/^const parseNum=.*$/m) || [''])[0]) + '\n' + ((H.match(/^const num2=.*$/m) || [''])[0]);
  const code = [deh, 'function pctPerDefecte(){ return null; }', 'function isNoSuma(){ return false; }', H.slice(i, f), eC(H, '_RE_PREU_FILA'), eC(H, '_RE_RESUM_FILA'), eF(H, '_esFilaDePreu')].join('\n');
  return new Function('IDIOMA', code + '\n' + eF(H, '_clauZona') + '\nreturn {preu:_esFilaDePreu, mesura:(typeof _filesQueSonMesura==="function"?_filesQueSonMesura:null), cap:(typeof _capitolRepetitSeguit==="function"?_capitolRepetitSeguit:null)};')(idioma);
}
const P = (desc, ut, amid) => ({ tipo: 'part', num: '', desc, ut, amid, preu: 0 });
const D = {
  ca: { preus: ['TRANSPORT DE TERRES\n- Transport de terres amb camió 4,10 QUATRE EUROS AMB DEU', 'CÀNON D\'ABOCAMENT\n- Cànon d\'abocament de runes 0,83 VUITANTA-TRES CÈNTIMS'],
    bona: 'PARTIDA ALÇADA D\'IMPREVISTOS\n- Partida de 1.500,00 euros per a imprevistos de l\'obra, a justificar',
    mesura: ['SALA 2 18,93 3,45 130,62\n- 2 4,72 4,30 40,59', '1,00 7.418,01 7.418,01'],
    real: 'FORMIGÓ HM-20 EN SOLERA DE 0,15 M DE GRUIX I 2,50 M D\'AMPLADA\n- Formigó HM-20 de consistència plàstica de 0,15 m de gruix i 2,50 m d\'amplada, abocat amb bomba i vibrat, inclòs el curat'},
  es: { preus: ['TRANSPORTE DE TIERRAS\n- Transporte con camión de mezcla sin clasificar de 0,83 OCHENTA Y TRES CÉNTIM', 'CANON DE VERTIDO\n- Canon de vertido por entrega de mezcla sin clasi- 2,34 DOS EUROS CON TREINTA Y CUATRO ficar'],
    bona: 'PARTIDA ALZADA DE IMPREVISTOS\n- Partida de 1.500,00 euros para imprevistos de la obra, a justificar',
    mesura: ['SALA 2 18,93 3,45 130,62\n- 2 4,72 4,30 40,59', '1,00 7.418,01 7.418,01'],
    real: 'HORMIGÓN HM-20 EN SOLERA DE 0,15 M DE ESPESOR Y 2,50 M DE ANCHURA\n- Hormigón HM-20 de consistencia plástica de 0,15 m de espesor y 2,50 m de anchura, vertido con bomba y vibrado, incluido el curado'} };
function prova(H, ll) {
  const T = carrega(H, ll), d = D[ll], es = ll === 'es', res = {};
  res.preu = d.preus.every(x => T.preu(x)) && !T.preu(d.bona) && !T.preu(d.real);
  if (!T.mesura) throw new Error('falta _filesQueSonMesura');
  const ambMesures = (es ? 'Sellado de juntas de dilatación' : 'Segellat de junts de dilatació') + '\n1 1,000 2,710 1,000 1,000 2,710 C#*D#*E#*F#\n2 3,000 2,460 1,000 1,000 7,380 C#*D#*E#*F#';
  const rows = [P(d.real, 'm2', 12.5), P(d.mesura[0], 'm2', 261.09), P(d.mesura[1], 'pa', 1), P(d.bona, 'pa', 1), P(ambMesures, 'ml', 10.09)], av = [];
  const n = T.mesura(rows, av, es);
  res.mesura = n === 2 && /NO ÉS UNA PARTIDA|NO ES UNA PARTIDA/.test(rows[1].flag || '') && /NO ÉS UNA PARTIDA|NO ES UNA PARTIDA/.test(rows[2].flag || '') && !rows[0].flag && !rows[3].flag && !rows[4].flag && av.some(a => /^⚠⚠/.test(a) && a.indexOf('SALA 2 18,93') >= 0);
  res.mesuraDetall = n + ' ' + JSON.stringify(rows.map(r => r.flag || '')) + ' ' + av.join(' | ');
  { const h = es ? 'Capítulo nº 3 OBRAS DE ALBAÑILERÍA' : 'Capítol nº 3 OBRES DE PALETA', tp = es ? 'Total Pa : 1,00 200,82 € 200,82 €' : 'Total Pa : 1,00 200,82 € 200,82 €', tc = es ? 'TOTAL CAPÍTULO 3 1.200,00' : 'TOTAL CAPÍTOL 3 1.200,00';
    const pant = () => [{ tipo: 'sec', desc: 'Z' }, { tipo: 'cap', desc: h }, P('a', 'pa', 1), { tipo: 'cap', desc: h }, P('b', 'pa', 1)];
    const d1 = ['##CAP## ' + h, '3.6 Pa Repasos', tp, '##CAP## ' + h, '3.7 Pa Ajudes', tp].join('\n'), d2 = ['##CAP## ' + h, '3.6 Pa Repasos', tc, '##CAP## ' + h, '3.7 Pa Ajudes'].join('\n'), d3 = ['##CAP## ' + h, '3.6 Pa Repasos', tp, '3.7 Pa Ajudes'].join('\n');
    let r = pant(); const n1 = T.cap(r, d1, [], es); res.cap = n1 === 1 && r.filter(x => x.tipo === 'cap').length === 1;
    r = pant(); res.capTotal = T.cap(r, d2, [], es) === 0 && r.filter(x => x.tipo === 'cap').length === 2;
    r = pant(); res.capUna = T.cap(r, d3, [], es) === 0;
    const d4 = ['##CAP## ' + h.replace('nº 3', '02'), '3.6 Pa Repasos', tp, '##CAP## ' + h.replace('nº 3', '01'), '3.7 Pa Ajudes', tp].join('\n');   // mateix nom, número diferent: dos capítols
    r = [{ tipo: 'sec', desc: 'Z' }, { tipo: 'cap', desc: h.replace('nº 3', '02') }, P('a', 'pa', 1), { tipo: 'cap', desc: h.replace('nº 3', '01') }, P('b', 'pa', 1)]; res.capNum = T.cap(r, d4, [], es) === 0; }
  return res;
}
for (const ll of ['ca', 'es']) {
  const e = ll === 'ca' ? '[CA]' : '[ES]'; let R; try { R = prova(H0, ll); } catch (x) { check(e + ' les eines es carreguen', false, x.message); continue; }
  check(e + ' 1) preu en lletres tallat = fila de llista de preus; un import en xifres dins del text, no', R.preu);
  check(e + ' 2) fila que només és una línia de mesura: marcada i en vermell; la partida de debò amb xifres, no', R.mesura, R.mesuraDetall);
  check(e + ' 3) capçalera repetida a la pàgina següent: un sol capítol', R.cap);
  check(e + ' 3b) amb un total de capítol entremig, o escrita una sola vegada: no es toca', R.capTotal && R.capUna);
  check(e + ' 3c) mateix nom amb un número diferent: són dos capítols', R.capNum);
}
check('la càrrega crida les dues comprovacions', /_filesQueSonMesura\(allRows,allAvisos,_ESz\)/.test(H0) && /_capitolRepetitSeguit\(allRows,amidament,allAvisos,IDIOMA==="es"\)/.test(H0));
const peces = [
  ['1 (el preu en lletres tallat no es reconeix)', trenca(H0, '  /\\d,\\d{2}\\s+(?:[A-ZÀ-ÝÑÇ][A-ZÀ-ÝÑÇ\\-]{0,15}\\s+){1,8}(?:EUROS?|C[ÉÈE]NTIM(?:OS|S)?)\\b/,', ''), R => R.preu],
  ['3 (el total de capítol no talla la continuació)', trenca(H0, 'else if(/^\\s*TOTAL\\s+(?:(?:SUB)?CAP|T[IÍ]T)/i.test(t)) ant=-1; }', '}'), R => R.capTotal],
  ['3c (el número no es mira)', trenca(H0, 'if(ant>=0&&nn===an) return true;', 'if(ant>=0) return true;'), R => R.capNum],
  ['2 (les xifres no es comparen amb les paraules)', trenca(H0, 'if(nd<2||nd<2*Math.max(1,w)) continue;', 'if(nd<2) continue;'), R => R.mesura],
];
for (const [n, H, ok1] of peces) { if (!H) { check('peça rota ' + n + ': es pot muntar', false); continue; }
  let vist = false; for (const ll of ['ca', 'es']) { try { if (!ok1(prova(H, ll))) vist = true; } catch (e) { vist = true; } }
  check('peça rota ' + n + ': el guardià la veu', vist); }
console.log((ko ? '✗ ' : '✓ ') + ok + ' OK · ' + ko + ' X');
process.exit(ko ? 1 : 0);
