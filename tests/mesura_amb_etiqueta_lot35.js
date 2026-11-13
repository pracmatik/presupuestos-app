#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 35 (26/10/2026) · LA LÍNIA DE MESURA AMB UNA ETIQUETA DAVANT DE LA XIFRA ÉS EL FINAL DE LA PARTIDA, I UNA FILA QUE COMENÇA AMB
 * EL SEU CODI I LA UNITAT ÉS UNA PARTIDA. Documents inventats, català i castellà, cap dada de cap client (va també al repositori públic).
 *  1) «Amidament façana 12,50 m²», «Amidament per unitat de balcó 6,00 u» (i «Medición fachada 12,50 m2» en castellà): cap partida s'empassa la
 *     de sota, el text de cada partida s'acaba abans de la línia de mesura (ni la mesura ni el codi de la següent hi queden enganxats) i les
 *     quantitats són les de la lectura;
 *  2) codi curt i unitat al document («1.2 u Títol…») amb una línia de mesura que no es reconeix: la fila de sota tampoc s'absorbeix;
 *  3) una frase del text no talla: «segons l'amidament de la façana 3,50 m²» (minúscula) ni «Medición según planos 2 m de altura» (sense decimals);
 *  4) format que no sabem llegir: els ⚠⚠ de l'app que diuen què falla i on es queden («N partides del document no surten…», «el programa n'ha
 *     tret N»), els que depenen de comptar el document es callen («el recompte no quadra»), els taronges també, els del motor com sempre, cap repetit;
 *  5) la comprovació de cada partida pren la línia de mesura del tros («Medición total 60,610 m²») com el total imprès, si n'hi ha una sola;
 *  6) P-041: a la lectura amb IA, títol en majúscules i text tot en majúscules → text en minúscula de frase com els seus a mà («lona de pvc»), el títol
 *     sencer si ve enganxat («- TÍTOL SENCER - TEXT»); un text que ja porta minúscules, un títol en minúscula o una fila d'una línia no es toquen;
 *  7) LOT 35b: en vermell la dada que el document contradiu (total imprès, unitat amb la mateixa quantitat, quantitat 0, partida que no hi és), el
 *     capítol que falta vist pel codi de les seves partides, la data com a capítol i la partida que falta al recompte final; una conversió seva no;
 *  8) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.replace(de, a); return s === src ? null : s; };
const eines = (H, idioma) => { try { const b = H.match(/\/\/ ==== INICI EINES DE LECTURA ====([\s\S]*?)\/\/ ==== FI EINES DE LECTURA ====/)[1];
  const deh = (H.match(/function _dehyphen\(s\)\{[^\n]*\}/) || [''])[0] + '\n' + ((H.match(/^const parseNum=.*$/m) || [''])[0]) + '\n' + ((H.match(/^const num2=.*$/m) || [''])[0]);
  return new Function('IDIOMA', deh + '\nfunction nomZonaDelDocument(){ return null; }\nfunction pctPerDefecte(){ return null; }\nfunction isNoSuma(r){ return /NO SUMA/i.test(String((r&&r.desc)||"")); }\n' + b +
    '\nreturn {rep:(typeof repairDescsFromSource==="function"?repairDescsFromSource:null), sil:(typeof avisosSiNoSabemLlegir==="function"?avisosSiNoSabemLlegir:null), fr:(typeof _fraseALaLectura==="function"?_fraseALaLectura:null)};')(idioma); } catch (e) { return null; } };
const D = {
  ca: { cap1: 'Capítol 1. Treballs de façana', cap2: 'Capítol 2. Altres partides', mes: 'Amidament', P: [
    ['1.1', 'm²', 'Neteja de façana', 'Neteja general de la façana amb aigua a baixa pressió i detergent neutre, incloent proteccions i retirada de restes.', 'façana 12,50 m²', 12.5],
    ['1.2', 'u', 'Protecció de tendals', 'Desmuntatge provisional dels tendals dels balcons per permetre els treballs i posterior muntatge al seu lloc.', 'per unitat de balcó 6,00 u', 6],
    ['1.3', 'm²', 'Pintat de baranes', 'Preparació i pintat de les baranes metàl·liques amb dues capes d\'esmalt sintètic per exterior, segons l\'amidament de la façana 3,50 m² previst.', 'previsió façana 2,50 m²', 2.5],
    ['1.4', 'ml', 'Reparació de cornises', 'Reconstrucció de les zones malmeses de les cornises amb morter de reparació, mantenint el disseny original.', 'sostres de balcons i cornises (no es compta l\'àtic) 10,50 ml', 10.5]],
    s: ['2.1', 'pa', 'Seguretat i salut', 'Mesures de seguretat i salut a l\'obra segons la legislació vigent.'] },
  es: { cap1: 'Capítulo 1. Trabajos de fachada', cap2: 'Capítulo 2. Otras partidas', mes: 'Medición', P: [
    ['1.1', 'm2', 'Limpieza de fachada', 'Limpieza general de la fachada con agua a baja presión y detergente neutro, incluyendo protecciones y retirada de restos.', 'fachada 12,50 m2', 12.5],
    ['1.2', 'ud', 'Protección de toldos', 'Desmontaje provisional de los toldos de los balcones para permitir los trabajos y posterior montaje en su sitio.', 'por unidad de balcón 6,00 ud', 6],
    ['1.3', 'm2', 'Pintado de barandillas', 'Preparación y pintado de las barandillas metálicas con dos manos de esmalte sintético. Medición según planos 2 m de altura.', 'previsión fachada 2,50 m2', 2.5],
    ['1.4', 'ml', 'Reparación de cornisas', 'Reconstrucción de las zonas dañadas de las cornisas con mortero de reparación, manteniendo el diseño original.', 'techos de balcones y cornisas (no se cuenta el ático) 10,50 ml', 10.5]],
    s: ['2.1', 'pa', 'Seguridad y salud', 'Medidas de seguridad y salud en la obra según la legislación vigente.'] } };
// línia de mesura: «Amidament <etiqueta> <xifra> <unitat>» (cas 1) o una que no es reconeix (cas 2: «Previsió segons obra»)
const doc = (d, nova) => [d.cap1].concat(...d.P.map(p => [p[0] + ' ' + p[1] + ' ' + p[2], p[3], nova ? (d.mes === 'Medición' ? 'Previsto según obra' : 'Previsió segons obra') : d.mes + ' ' + p[4]]))
  .concat([d.cap2, d.s.join(' ').replace(d.s[2] + ' ', d.s[2] + '\n'), d.mes + ' 1,00 pa']).join('\n');
// la lectura: el codi, la unitat i el títol (sense el text), amb la quantitat; la primera amb preu
const lectura = d => [{ tipo: 'cap', desc: d.cap1.replace(/^\S+\s+\d+\.\s*/, '').toUpperCase() }].concat(d.P.map((p, k) => ({ tipo: 'part', desc: p[0] + ' ' + p[1] + ' ' + p[2], ut: p[1], amid: p[5], preu: k ? 0 : 12 })))
  .concat([{ tipo: 'cap', desc: d.cap2.replace(/^\S+\s+\d+\.\s*/, '').toUpperCase() }, { tipo: 'part', desc: d.s.slice(0, 3).join(' '), ut: 'pa', amid: 1 }]);
const parts = rows => rows.filter(r => r && r.tipo === 'part');
function prova(T, et, es) {
  const d = D[es ? 'es' : 'ca'], k = es ? 'es' : 'ca';
  if (!T || !T.rep || !T.sil) { check(et + ' ' + k + ' · l\'app porta les eines', false, 'falten'); return; }
  for (const nova of [false, true]) {
    const rows = lectura(d), av = []; T.rep(rows, doc(d, nova), av); const P = parts(rows), n = nova ? 2 : 1;
    check(`${et} ${k} ${n} · les ${d.P.length + 1} partides es queden (cap s'empassa la de sota)`, P.length === d.P.length + 1, P.map(r => r.desc.slice(0, 30)).join(' | '));
    check(`${et} ${k} ${n} · cap avís de partides fusionades`, !av.some(a => /fusionat|fusionado/.test(a)), av.join(' | '));
    check(`${et} ${k} ${n} · cada partida porta el seu text del document`, d.P.every((p, i) => P[i] && P[i].desc.indexOf(p[3].slice(0, 40)) >= 0), P.map(r => r.desc.slice(-50)).join(' | '));
    check(`${et} ${k} ${n} · cap text porta la mesura ni el codi de la partida de sota`, P.every((r, i) => (i >= d.P.length || r.desc.indexOf(d.mes + ' ' + d.P[i][4]) < 0) && !/\s\d\.\d\s+\S{1,3}\s/.test(r.desc.split('\n').slice(1).join(' '))), P.map(r => r.desc.slice(-60)).join(' | '));
    check(`${et} ${k} ${n} · les quantitats són les de la lectura`, d.P.every((p, i) => P[i] && +P[i].amid === p[5]), P.map(r => r.amid).join(','));
  }
  { const rows = lectura(d); T.rep(rows, doc(d, false), []); const t = parts(rows)[2] ? parts(rows)[2].desc : '';
    check(`${et} ${k} 3 · una frase del text no talla (${es ? '«Medición según planos 2 m de altura»' : '«segons l\'amidament de la façana 3,50 m²»'})`, t.indexOf(d.P[2][3]) >= 0, t.slice(-120)); }
  // 4) format que no sabem llegir
  const V = es ? ['⚠⚠ 3 PARTIDA(S) DEL DOCUMENTO NO SALEN EN EL BORRADOR (la lectura no las ha devuelto): 1.2 Protección de toldos · 1.3 Pintado · 1.4 Reparación', '⚠⚠ EL PROGRAMA HA QUITADO 3 PARTIDA(S) DESPUÉS DE LEERLAS: el motor leyó 5 y en pantalla hay 2.', '⚠⚠ LA CUENTA DE PARTIDAS NO CUADRA: el documento original tiene 9 bloques.', '⚠ La numeración salta de 1.1 a 1.5.', 'Una nota.']
    : ['⚠⚠ 3 PARTIDA/ES DEL DOCUMENT NO SURTEN A L\'ESBORRANY (la lectura no les ha tornat): 1.2 Protecció de tendals · 1.3 Pintat · 1.4 Reparació', '⚠⚠ EL PROGRAMA HA TRET 3 PARTIDA/ES DESPRÉS DE LLEGIR-LES: el motor n\'ha llegit 5 i a la pantalla n\'hi ha 2.', '⚠⚠ EL RECOMPTE DE PARTIDES NO QUADRA: el document original té 9 blocs.', '⚠ La numeració salta de 1.1 a 1.5.', 'Una nota.'];
  const M = es ? '⚠⚠ NO PUEDO CONTAR LAS PARTIDAS DE ESTE DOCUMENTO CON GARANTÍAS.' : '⚠⚠ NO PUC COMPTAR LES PARTIDES D\'AQUEST DOCUMENT AMB GARANTIES.';
  const out = T.sil(V.concat([M, V[0]]), { docPartides: 0, partides: 2, formatReconegut: false, motor: [M] }, es);
  check(`${et} ${k} 4 · el primer avís diu que no el sé llegir amb garanties`, /^⚠⚠ (?:AQUEST DOCUMENT NO EL SÉ LLEGIR|ESTE DOCUMENTO NO LO SÉ LEER)/.test(out[0] || ''), out[0]);
  check(`${et} ${k} 4 · es queden les partides que no surten i les que el programa ha tret (diuen què i on)`, out.includes(V[0]) && out.includes(V[1]), JSON.stringify(out).slice(0, 300));
  check(`${et} ${k} 4 · es calla el que depèn de comptar el document, el taronja i la nota`, !out.includes(V[2]) && !out.includes(V[3]) && !out.includes(V[4]), JSON.stringify(out).slice(0, 300));
  check(`${et} ${k} 4 · el ⚠⚠ del motor es queda, i cap avís surt dues vegades`, out.includes(M) && out.length === new Set(out).size && out.length === 4, JSON.stringify(out).slice(0, 300));
  check(`${et} ${k} 4 · document que sí sabem llegir: no es calla res`, T.sil(V.slice(), { docPartides: 5, partides: 5, formatReconegut: true }, es).length === V.length);
}
// 5) la comprovació de cada partida: la línia de mesura del tros és el total imprès de la partida (si n'hi ha una sola)
function provaSegell(H, et) {
  const m = H.match(/const _SG_MESQ=(\/.*\/);/); let re = null; try { re = m ? new Function('return ' + m[1])() : null; } catch (e) { re = null; }
  check(`${et} 5 · hi ha la línia de mesura com a total imprès`, !!re && /return _sgLiniaMesura\(D,c\); \}/.test(H) && /return n===1\?x:null; \}/.test(H), m ? m[1].slice(0, 60) : 'no hi és');
  if (!re) return;
  const si = ['Medición total 60,610 m²', 'Amidament façana 4,00 u', 'Amidament 16,40 m²', 'Medición fachada 12,50 m2', 'Amidament sostres de balcons (no es compta l\'àtic) 70,80 m²'];
  const no = ['Medición: según planos', 'La medición se realizará sobre lo ejecutado 2,00 m', 'Amidament de la bastida segons projecció vertical.', 'Medición total 4 u y 3 ml 2,00 4,00'];
  check(`${et} 5 · reconeix ${si.length} línies de mesura (ca/es, amb etiqueta i sense)`, si.every(t => re.test(t)), si.filter(t => !re.test(t)).join(' | '));
  check(`${et} 5 · i no ${no.length} frases o línies amb més d'una xifra`, no.every(t => !re.test(t)), no.filter(t => re.test(t)).join(' | '));
}
// 6) P-041: text tot en majúscules a la lectura amb IA → minúscula de frase; el títol es queda; «- TÍTOL SENCER - TEXT» → títol sencer
function provaFrase(T, et, H) {
  { const i = H.indexOf('_ajustaAlDocument(allRows,amidament,allAvisos,_es25); }'), j = H.indexOf('try{ _fraseALaLectura(allRows,amidament); }');
    check(`${et} 6 · la lectura amb IA hi passa, just darrere de l\'ajust a la capçalera del document`, i > 0 && j > i && j - i < 400, i + ' / ' + j); }
  if (!T || !T.fr) { check(et + ' 6 · l\'app porta el pas de minúscula de frase', false, 'falta'); return; }
  const C = [
    ['ca', "RETIRADA D'ELEMENTS\n- RETIRADA D'ELEMENTS A LA COBERTA - RETIRADA D'ELEMENTS DIVERSOS I TRANSPORT DE RUNA A ABOCADOR AUTORITZAT. AMIDAMENT A CONFIRMAR EN OBRA",
     "RETIRADA D'ELEMENTS A LA COBERTA\n- Retirada d'elements diversos i transport de runa a abocador autoritzat. Amidament a confirmar en obra"],
    ['es', 'LIMPIEZA DE FACHADA\n- LIMPIEZA GENERAL DE LA FACHADA CON AGUA A PRESIÓN Y LONA DE PVC EN LA BASE. INCLUYE RETIRADA DE RESTOS.',
     'LIMPIEZA DE FACHADA\n- Limpieza general de la fachada con agua a presión y lona de pvc en la base. Incluye retirada de restos.'],
    ['mixt', 'LIMPIEZA DE FACHADA\n- Limpieza general de la fachada con agua a presión (PVC según DF).', null],
    ['títol en minúscula', 'Limpieza de fachada\n- LIMPIEZA GENERAL DE LA FACHADA CON AGUA A PRESIÓN Y DETERGENTE NEUTRO.', null],
    ['una sola línia', 'LIMPIEZA GENERAL DE LA FACHADA CON AGUA A PRESIÓN Y DETERGENTE NEUTRO', null],
    ['fusionada amb una altra (porta la seva capçalera dins: el vermell la mira en majúscules)', 'LIMPIEZA DE FACHADA\n- LIMPIEZA GENERAL DE LA FACHADA CON AGUA A PRESIÓN Y DETERGENTE NEUTRO 1.02 m2 PINTURA DE FACHADA CON DOS MANOS', null]];
  for (const [nom, d, esperat] of C) { const rows = [{ tipo: 'cap', desc: 'CAPÍTOL 1' }, { tipo: 'part', desc: d, ut: 'm2', amid: 3 }]; T.fr(rows);
    check(`${et} 6 · ${nom}: ${esperat ? 'títol en majúscules i text en minúscula de frase' : 'no es toca'}`, rows[1].desc === (esperat || d) && rows[0].desc === 'CAPÍTOL 1' && rows[1].amid === 3, rows[1].desc); }
}
// 7) LOT 35b: la dada que el document contradiu, el capítol que falta pel codi, el capítol que no ho és i el recompte final, EN VERMELL
function extFnB(H, n) { const m = new RegExp('function\\s+' + n + '\\s*\\(').exec(H); if (!m) return ''; const b = H.indexOf('{', m.index); let d = 0, i = b;
  for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) { i++; break; } } } return H.slice(m.index, i); }
function lecturaB(H) { const i = H.indexOf('// ==== INICI EINES DE LECTURA ===='), f = H.indexOf('// ==== FI EINES DE LECTURA ===='), a = H.indexOf('// 06/10/2026 (Z11) · SEGELL PER PARTIDA'), b = H.indexOf('// ── fi del segell per partida (Z11) ──');
  if (i < 0 || f < 0 || a < 0 || b < 0) return null;
  try { return new Function('IDIOMA', 'window', 'console', [extFnB(H, '_dehyphen'), H.slice(i, f), H.slice(a, b)].join('\n') + '\nreturn {segell:segellPartides, cap:(typeof capitolQueFaltaPelCodi==="function"?capitolQueFaltaPelCodi:null), noCap:(typeof capitolsQueNoSonCapitols==="function"?capitolsQueNoSonCapitols:null), falten:(typeof partidesQueFaltenAlFinal==="function"?partidesQueFaltenAlFinal:null)};')('ca', {}, { warn() {}, log() {}, info() {} }); } catch (e) { return null; } }
const DOC7 = ['PRESSUPOST D\'EXEMPLE', '1.- COBERTA', '01.1 m2 IMPERMEABILITZACIÓ DE COBERTA', 'Impermeabilització amb làmina asfàltica soldada i protecció.', 'Amidament total 60,61 m²', '01.2 ml REMAT DE PETO', 'Remat de peto amb peça ceràmica i morter.', 'Amidament total 22,69 ml',
  '01.3 u BUNERA SIFÒNICA', 'Formació de bunera amb connexió al baixant.', 'Amidament total 4,00 u', '2.- PINTURA', '02.1 m2 PINTURA DE FAÇANA', 'Pintura plàstica en dues mans sobre arrebossat.', 'Amidament total 120,00 m²', '02.2 ml PINTURA DE BARANES', 'Esmalt sintètic sobre baranes metàl·liques.', 'Amidament total 30,00 ml'].join('\n');
const P7 = (d, ut, q) => ({ tipo: 'part', num: '', desc: d, ut, amid: q, preu: 0 });
function files7(o) { o = Object.assign({ q1: 60.61, u2: 'ml', q2: 22.69, cap2: true, invent: false, data: false, treu: false }, o);
  const r = [{ tipo: 'cap', desc: '1.- COBERTA' }, P7('01.1 m2 IMPERMEABILITZACIÓ DE COBERTA\n- Impermeabilització amb làmina asfàltica soldada i protecció.', 'm2', o.q1), P7('01.2 ml REMAT DE PETO\n- Remat de peto amb peça ceràmica i morter.', o.u2, o.q2)];
  if (!o.treu) r.push(P7('01.3 u BUNERA SIFÒNICA\n- Formació de bunera amb connexió al baixant.', 'u', 4));
  if (o.invent) r.push(P7('01.4 m2 ENRAJOLAT DE TERRASSA\n- Enrajolat amb gres porcellànic.', 'm2', 35));
  if (o.data) r.push({ tipo: 'cap', desc: '5 DE MAIG DE 2026' });
  if (o.cap2) r.push({ tipo: 'cap', desc: '2.- PINTURA' });
  r.push(P7('02.1 m2 PINTURA DE FAÇANA\n- Pintura plàstica en dues mans sobre arrebossat.', 'm2', 120), P7('02.2 ml PINTURA DE BARANES\n- Esmalt sintètic sobre baranes metàl·liques.', 'ml', 30)); return r; }
function provaVermells(H, et) { const T = lecturaB(H); if (!T || !T.cap || !T.noCap || !T.falten) { check(et + ' 7 · l\'app porta els passos nous', false, 'falten'); return; }
  const corre = o => { const r = files7(o), av = []; T.segell(r, DOC7, av, false); T.cap(r, DOC7, av, false); T.noCap(r, DOC7, av, false); T.falten(r, DOC7, av, false); return av.filter(a => /^⚠⚠/.test(a)); };
  const C = [['lectura bona: cap vermell', {}, null], ['quantitat que el total imprès contradiu (66,61 per 60,61)', { q1: 66.61 }, /DADA QUE EL DOCUMENT CONTRADIU[^]*01\.1/],
    ['unitat de la capçalera diferent amb la mateixa quantitat (u per ml)', { u2: 'u' }, /DADA QUE EL DOCUMENT CONTRADIU[^]*01\.2/], ['quantitat 0 i el document n\'hi escriu una', { q1: 0 }, /DADA QUE EL DOCUMENT CONTRADIU[^]*01\.1/],
    ['partida que no és al document', { invent: true }, /DADA QUE EL DOCUMENT CONTRADIU[^]*01\.4/], ['capítol del document que no surt (les seves partides dins d\'un altre)', { cap2: false }, /CAPÍTOL\/S DEL DOCUMENT QUE NO SURTEN[^]*PINTURA/],
    ['una data com a capítol', { data: true }, /QUE NO SÓN CAPÍTOLS DEL DOCUMENT[^]*5 DE MAIG/], ['una partida que falta (el document en té 5)', { treu: true }, /FALTEN 1 PARTIDA/],
    ['conversió seva (unitat i quantitat canviades, m² a ml): NO vermell, es queda en taronja', { u2: 'm2', q2: 6.81 }, null]];
  for (const [nom, o, re] of C) { const v = corre(o); check(`${et} 7 · ${nom}`, re ? v.some(a => re.test(a)) : v.length === 0, JSON.stringify(v).slice(0, 300)); }
}
function tot(H, et) { prova(eines(H, 'ca'), et, false); prova(eines(H, 'es'), et, true); provaSegell(H, et); provaFrase(eines(H, 'ca'), et, H); provaVermells(H, et); }
console.log('Guardià LOT 35 · línia de mesura amb etiqueta i codi curt · ' + path.basename(HTML));
tot(H0, 'app');
const PECES = [
  ['sense la línia de mesura amb etiqueta', '  /(?:^|\\s)(?:Amidament|AMIDAMENT|Mesurament|MESURAMENT|Medici[oó]n|MEDICI[OÓ]N)\\s+(?=[A-Za-zÀ-ÿ])', '  /(?!)(?:^|\\s)(?:Amidament|AMIDAMENT|Mesurament|MESURAMENT|Medici[oó]n|MEDICI[OÓ]N)\\s+(?=[A-Za-zÀ-ÿ])'],
  ['sense el codi curt', '||_codiDavant||_capcCurta){end=loc[j];break;}', '||_codiDavant){end=loc[j];break;}'],
  ['callant els ⚠⚠ de l\'app', '(_deMotor.indexOf(a)>=0||!_NO_FIA.test(String(a)))', '(_deMotor.indexOf(a)>=0)'],
  ['sense callar el recompte', '||!_NO_FIA.test(String(a))', '||true'],
  ['sense la línia de mesura com a total imprès', 'return _sgLiniaMesura(D,c); }', 'return null; }'],
  ['amb més d\'una línia de mesura al tros', 'return n===1?x:null; }', 'return x; }'],
  ['sense la minúscula de frase a la lectura', 'const nd=_textDeFrase(tit+"\\n"+cos); if(nd!==d){ r.desc=nd; n++; } }', '}'],
  ['sense el títol sencer enganxat', 'if(m&&_titMaj(m[2])&&_fpN(m[2]).indexOf(_fpN(tit))===0)', 'if(false)'],
  ['sense el vermell de la dada contradita', ':cs.filter(c=>c.res&&_sgVermella(c))', ':[]'],
  ['amb la conversió en vermell', '(f.includes("q_ptot")&&!f.includes("ut")&&!!c.ordre)', '(f.includes("q_ptot")&&!!c.ordre)'],
  ['sense el capítol que falta pel codi', 'if(!Ts.length||Ts.some(t=>surt(t,xs[0].z))) continue;', 'continue;'],
  ['sense la data com a capítol', 'if(data||etiq||portada||nota||zona) out.push(t);', 'if(false) out.push(t);'],
  ['sense el recompte final', 'if(n>=N) return 0; const A={length:N};', 'return 0; const A={length:N};'],
  ['sense cridar-lo a la lectura', '        try{ _fraseALaLectura(allRows,amidament); }', '        try{ }'],
  ['tocant la fila fusionada', '||_scanMarques(_cleanLit("\\n"+cos),RESM).length) continue;', ') continue;'],
];
for (const [nom, de, a] of PECES) { const H = trenca(H0, de, a); if (!H) { check('peça trencada «' + nom + '»: el codi hi és', false, 'no trobo: ' + de.slice(0, 60)); continue; }
  const ok0 = ok, ko0 = ko; const log = console.log, err = console.error; console.log = () => { }; console.error = () => { };
  try { tot(H, 'trencat'); } catch (e) { ko++; } console.log = log; console.error = err;
  const caigut = ko > ko0; ok = ok0; ko = ko0; check('peça trencada «' + nom + '»: el guardià ho veu', caigut); }
console.log(`\n${ok} OK · ${ko} X`); process.exit(ko ? 1 : 0);
