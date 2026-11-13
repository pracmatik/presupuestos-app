#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 34 (23/10/2026) · LES LÍNIES DE MESURA DEL DOCUMENT VAN AL TEXT DE LA PARTIDA, COM ALS SEUS PRESSUPOSTOS A MÀ (petició P-040).
 * Documents inventats, castellà i català, cap dada de cap client (va també al repositori públic).
 *  1) Excel transcrit, partida AMB text seu: títol ⏎ text ⏎ cada línia de mesura com l'escriu el document (etiqueta, «25%» com és, xifres a dos
 *     decimals, sense els zeros); la fila de la suma (sense etiqueta, una xifra) no hi va; la quantitat de la partida no canvia;
 *  2) partida SENSE text: les línies sota el títol (com abans); el text que el document escriu entre línies de mesura hi és, al seu lloc;
 *  3) partida opcional: la marca «(NO SUMA AL TOTAL)» es queda al final del text i les línies a sota;
 *  4) desglossament que ja surt en files sota la partida (columna «Parcial» i línies que sumen el total): cap línia al text (com abans);
 *  5) llistat tancat amb «Total <codi>»: la línia de mesura al text, sense la paraula «Amidament», i la xifra sola (la suma) no;
 *  6) el text seguit del PDF no s'enganxa una fila de mesura («Zona sud 2,00 3,50 7,00»), però sí una frase tallada que acaba en «30 x 30» o «0,036»;
 *  7) dues partides iguals de zones diferents (mateix text, línies diferents) continuen sent bessones: l'avís de l'una passa a l'altra;
 *  8) xifra a mig cèntim (1,005) → 1,01, com l'Excel; milers amb punt (1.234,50);
 *  9) el cercador de preus rep el mateix text que abans (sense les línies afegides; els preus no canvien) i el camp de treball no es desa;
 * 10) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.replace(de, a); return s === src ? null : s; };
function extFn(H, n) {
  const m = new RegExp('function\\s+' + n + '\\s*\\(').exec(H); if (!m) throw new Error('no trobo ' + n);
  const b = H.indexOf('{', m.index); let d = 0, i = b;
  for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) { i++; break; } } }
  return H.slice(m.index, i); }
const eines = (H, idioma) => { try { const b = H.match(/\/\/ ==== INICI EINES DE LECTURA ====([\s\S]*?)\/\/ ==== FI EINES DE LECTURA ====/)[1];
  const deh = (H.match(/function _dehyphen\(s\)\{[^\n]*\}/) || [''])[0] + '\n' + ((H.match(/^const parseNum=.*$/m) || [''])[0]) + '\n' + ((H.match(/^const num2=.*$/m) || [''])[0]);
  return new Function('IDIOMA', deh + '\nfunction nomZonaDelDocument(){ return null; }\nfunction pctPerDefecte(){ return null; }\nfunction isNoSuma(r){ return /NO SUMA/i.test(String((r&&r.desc)||"")); }\n' + b + '\n' + extFn(H, 'coherenciaBessones') +
    '\nreturn {xl:(typeof transcriuExcel==="function"?transcriuExcel:null), tx:(typeof transcriuText==="function"?transcriuText:null), uni:(typeof unirSaltsDelPdf==="function"?unirSaltsDelPdf:null), bes:coherenciaBessones};')(idioma); } catch (e) { return null; } };
const cel = v => v == null || v === '' ? null : { v: v, w: String(v), t: typeof v === 'number' ? 'n' : 's' };
const full = (nom, F) => ({ nom, files: F.map((c, i) => ({ r: i + 1, c: c.map(cel) })).filter(x => x.c.some(Boolean)) });
const parts = rows => (rows || []).filter(r => r && r.tipo === 'part');
const D = {
  ca: { cap: 'CAPÍTOL 01. TREBALLS DE COBERTA', t1: 'REPÀS DE PENDENTS', x1: 'REPÀS DELS PENDENTS DE LA COBERTA AMB MORTER CAP ALS PUNTS DE DESGUÀS. AMIDAMENT A CONFIRMAR EN OBRA',
        z1: 'COBERTA NORD', z2: 'COBERTA SUD', t2: 'PROTECCIÓ DE PERSIANES', t3: 'IMPERMEABILITZACIÓ OPCIONAL', x3: 'Impermeabilització amb làmina asfàltica de la coberta.',
        mid: 'CANTONADA DEL PATI', xL: 'Neteja general de la façana amb aigua a baixa pressió.', tL: 'NETEJA DE FAÇANA', zL: 'Zona sud' },
  es: { cap: 'CAPÍTULO 01. TRABAJOS DE CUBIERTA', t1: 'REPASO DE PENDIENTES', x1: 'REPASO DE LAS PENDIENTES DE LA CUBIERTA CON MORTERO HACIA LOS PUNTOS DE DESAGÜE. MEDICIÓN A CONFIRMAR EN OBRA',
        z1: 'CUBIERTA NORTE', z2: 'CUBIERTA SUR', t2: 'PROTECCIÓN DE PERSIANAS', t3: 'IMPERMEABILIZACIÓN OPCIONAL', x3: 'Impermeabilización con lámina asfáltica de la cubierta.',
        mid: 'ESQUINA DEL PATIO', xL: 'Limpieza general de la fachada con agua a baja presión.', tL: 'LIMPIEZA DE FACHADA', zL: 'Zona sur' } };
// la forma (no les dades) d'un amidament d'arquitecte: CODI | unitat | títol (a la columna de la descripció hi va la unitat) | UTS | LONGITUD | AMPLADA | ALÇADA | PARCIALS | QUANTITAT
const capc = ['CODI', 'DESCRIPCIÓ', '', 'UTS', 'LONGITUD', 'AMPLADA', 'ALÇADA', 'PARCIALS', 'QUANTITAT'];
const llibre = d => [full('Full1', [capc, ['', d.cap],
  ['01.01', 'm2', d.t1], ['', d.x1], ['', '', d.z1, '25%', 38.6, null, null, 9.65], ['', '', d.z2, '25%', 61.87, null, null, 15.4675], ['', '', '', '', '', '', '', '', 25.1175],
  ['01.02', 'ut', d.t2], ['', '', d.z1, '4', null, null, null, '4'], ['', '', d.mid], ['', '', '', 2, 0, 1.5, null, 3], ['', '', '', '', '', '', '', '', 7],
  ['01.03', 'm2', d.t3], ['', d.x3], ['', '', d.z1, '', 1234.5, null, null, 1234.5], ['', '', d.z2, '', 1.005, null, null, 1.005], ['', '', '', '', '', '', '', '', 1235.505]])];
// desglossament que ja surt en files: la columna «Parcial» es reconeix i les línies sumen el total
const llibreDesg = d => [full('Full1', [['Código', 'Ud', 'Resumen', 'Uds', 'Largo', 'Parcial', 'Cantidad'], ['C1', '', d.cap.replace(/^\S+\s+\S+\s*/, '')],
  ['P1', 'm2', d.t1, null, null, null, 100.47], ['', '', d.x1], ['', '', d.z1, 1, 38.6, 38.6], ['', '', d.z2, 1, 61.87, 61.87], ['Total P1', '', '', '', '', '', 100.47]])];
const llistat = d => {   // cinc partides tancades amb «Total <codi>»
  const L = []; for (let k = 1; k <= 5; k++) { L.push('01.0' + k + ' m2 ' + d.tL + ' ' + k, d.xL, 'Amidament ' + d.zL + ' 2,00 3,50 7,00', '7,00', 'Total partida 01.0' + k + ' ........ 7,00'); }
  return ['01 ' + d.cap.replace(/^\S+\s+\S+\s*/, '')].concat(L).join('\n'); };
function prova(T, et, es) {
  const d = D[es ? 'es' : 'ca'], k = es ? 'es' : 'ca';
  if (!T || !T.xl || !T.tx || !T.uni || !T.bes) { check(et + ' ' + k + ' · l\'app porta les eines', false, 'falten'); return; }
  const r = T.xl(llibre(d), es), P = parts(r.rows);
  const L0 = P[0] ? P[0].desc.split('\n') : [];
  check(`${et} ${k} 1 · amb text: títol ⏎ text ⏎ «${d.z1} 25% 38,60 9,65» ⏎ «${d.z2} 25% 61,87 15,47», sense la fila de la suma`, r.reconegut && L0.length === 4 && L0[0] === d.t1 && /^re/i.test(L0[1]) && L0[2] === d.z1 + ' 25% 38,60 9,65' && L0[3] === d.z2 + ' 25% 61,87 15,47', JSON.stringify(L0));
  check(`${et} ${k} 1 · la quantitat no canvia (25,12)`, P[0] && Math.abs(+P[0].amid - 25.12) < 0.006, P[0] && P[0].amid);
  const L1 = P[1] ? P[1].desc.split('\n') : [];
  check(`${et} ${k} 2 · sense text: les línies sota el títol, amb el text del mig al seu lloc («${d.z1} 4 4» ⏎ «${d.mid}» ⏎ «2,00 1,50 3,00»)`, L1.length === 4 && L1[0] === d.t2 && L1[1] === d.z1 + ' 4 4' && L1[2] === d.mid && L1[3] === '2,00 1,50 3,00', JSON.stringify(L1));
  const L2 = P[2] ? P[2].desc.split('\n') : [];
  check(`${et} ${k} 3 · opcional: «(NO SUMA AL TOTAL)» al final del text i les línies a sota`, L2.length === 4 && /\(NO SUMA AL TOTAL\)$/.test(L2[1]) && L2[2] === d.z1 + ' 1.234,50 1.234,50', JSON.stringify(L2));
  check(`${et} ${k} 8 · 1,005 → 1,01 (com l'Excel; la coma flotant donava 1,00) i milers amb punt`, L2[3] === d.z2 + ' 1,01 1,01', JSON.stringify(L2[3]));
  const rd = T.xl(llibreDesg(d), es), Pd = parts(rd.rows), Sd = (rd.rows || []).filter(x => x.tipo === 'subv' && x.desglos);
  check(`${et} ${k} 4 · desglossament en files: dues files sota la partida i cap línia al text`, rd.reconegut && Pd.length === 1 && Sd.length === 2 && Pd[0].desc.split('\n').length === 2, JSON.stringify(rd.rows).slice(0, 300));
  const rt = T.tx(llistat(d), es), Pt = parts(rt.rows), Lt = Pt[0] ? Pt[0].desc.split('\n') : [];
  check(`${et} ${k} 5 · llistat «Total <codi>»: la línia al text sense «Amidament» i sense la xifra sola`, rt.reconegut && Pt.length === 5 && Lt[Lt.length - 1] === d.zL + ' 2,00 3,50 7,00' && !Lt.some(l => l.trim() === '7,00'), rt.motiu + ' ' + JSON.stringify(Lt));
  const ru = [{ tipo: 'part', desc: d.t1 + '\n- ' + d.xL.replace(/\.$/, '') + '\n' + d.zL.toLowerCase() + ' 2,00 3,50 7,00' }, { tipo: 'part', desc: d.t2 + '\n- peça de 30 x\n30' },
    { tipo: 'part', desc: d.t3 + '\n- conductivitat tèrmica 1,1 W i\nfinal 0,036' }];
  T.uni(ru);
  check(`${et} ${k} 6 · el text seguit no s'enganxa la fila de mesura en minúscula`, ru[0].desc.split('\n').length === 3, JSON.stringify(ru[0].desc));
  check(`${et} ${k} 6 · però sí la frase tallada («30 x ⏎ 30», «… i ⏎ final 0,036»)`, ru[1].desc.split('\n').length === 2 && ru[2].desc.split('\n').length === 2, JSON.stringify([ru[1].desc, ru[2].desc]));
  const rb = [{ tipo: 'part', num: '1.1', ut: 'm2', desc: d.t1 + '\n- ' + d.xL + '\n' + d.z1 + ' 12,50 19,00 237,50', flag: 'PENDENT — preu a revisar' },
    { tipo: 'part', num: '2.1', ut: 'm2', desc: d.t1 + '\n- ' + d.xL + '\n' + d.z2 + ' 23,00 19,00 437,00' }];
  T.bes(rb, []);
  check(`${et} ${k} 7 · mateix text amb línies diferents: continuen sent bessones (l'avís passa a la 2.1)`, /la mateixa partida|la misma partida/.test(rb[1].flag || ''), JSON.stringify(rb[1]));
}
// 10) el cercador de preus rep el text de sempre: la fila porta les línies afegides (mesDoc) només durant la lectura; el cercador les treu del que envia
function provaCercador(H, et) {
  let san = null; try { san = new Function('let IDIOMA="ca";\n' + extFn(H, 'sanitizeRows') + '\nreturn sanitizeRows;')(); } catch (e) { san = null; }
  const r = { tipo: 'part', num: '1.1', ut: 'm2', desc: 'TÍTOL\n- Text.\nZONA 1,00 2,00', amid: 2, preu: 0, mesDoc: 'ZONA 1,00 2,00' };
  const a = san ? san([r]) : null, b = san ? san([r], false) : null;
  check(`${et} 10 · durant la lectura la fila conserva les línies afegides (mesDoc); en obrir un esborrany desat, no`, a && a[0].mesDoc === 'ZONA 1,00 2,00' && b && b[0].mesDoc === undefined, JSON.stringify([a, b]));
  const m = /_cand\.push\(\{i:_i,desc:([^\n]*?)\.replace\(\/\\s\+\/g," "\)\.slice\(0,400\)/.exec(H); let q = null;
  try { q = m ? new Function('r', 'return String(' + m[1] + ');')(r) : null; } catch (e) { q = null; }
  check(`${et} 10 · el cercador rep el text sense les línies afegides («TÍTOL ⏎ - Text.»)`, q === 'TÍTOL\n- Text.', JSON.stringify(q));
  check(`${et} 10 · i després del cercador mesDoc s'esborra (no es desa)`, /if\(r&&r\.mesDoc!==undefined\) delete r\.mesDoc;/.test(H) && H.indexOf('delete r.mesDoc') > H.indexOf('_cand.push({i:_i'), ''); }
function tot(T, et, H) { prova(T, et, false); prova(T, et, true); provaCercador(H || H0, et); }
console.log('Guardià LOT 34 · línies de mesura al text de la partida · ' + path.basename(HTML));
tot(eines(H0, 'ca'), 'app', H0);
const PECES = [
  ['sense les línies al text (Excel)', 'row.desc+="\\n"+row.mesDoc; } }   // la marca', '} }   // la marca'],
  ['sense la línia desada al llegir', 'if(_ld) cur.det=(cur.det||[]).concat([{m:1,t:_ld}]);', ''],
  ['sense el text del mig', 'cur.det=(cur.det||[]).concat([{m:0,t:desc||t}]);', ''],
  ['sense treure la fila de la suma', 'if(!lloc&&x.length<=1) return "";', ''],
  ['sense l\'arrodoniment com l\'Excel', 'Math.round(Math.abs(v)*100+1e-7)/100', 'Math.round(Math.abs(v)*100)/100'],
  ['sense les línies al text (llistat)', 'if(_lt.length){ row.mesDoc=', 'if(false){ row.mesDoc='],
  ['sense guardar les línies afegides per al cercador', 'if(r.tipo==="part"&&typeof r.mesDoc==="string"&&r.mesDoc&&ingest)o.mesDoc=r.mesDoc;', ''],
  ['el cercador amb les línies', '_cand.push({i:_i,desc:String((r.mesDoc&&String(r.desc).endsWith("\\n"+r.mesDoc))?String(r.desc).slice(0,-(r.mesDoc.length+1)):r.desc)', '_cand.push({i:_i,desc:String(r.desc)'],
  ['sense esborrar mesDoc després del cercador', 'if(r&&r.mesDoc!==undefined) delete r.mesDoc;', ''],
  ['sense treure «Amidament»', 't:l.replace(_TX_MES,"").trim()}', 't:l}'],
  ['sense la fila de mesura protegida', 'const segueix=!!at&&!!bt&&!_esFilaMes(bt)&&', 'const segueix=!!at&&!!bt&&'],
  ['sense les bessones sense línies', 'const d=norm(String(r.desc||"").split("\\n").filter((l,k)=>!k||!', 'const d=norm(String(r.desc||"").split("\\n").filter((l,k)=>true||!'],
];
for (const [nom, de, a] of PECES) { const H = trenca(H0, de, a); if (!H) { check('peça trencada «' + nom + '»: el codi hi és', false, 'no trobo: ' + de.slice(0, 60)); continue; }
  const ok0 = ok, ko0 = ko; const log = console.log, err = console.error; console.log = () => { }; console.error = () => { };
  try { tot(eines(H, 'ca'), 'trencat', H); } catch (e) { ko++; } console.log = log; console.error = err;
  const caigut = ko > ko0; ok = ok0; ko = ko0; check('peça trencada «' + nom + '»: el guardià ho veu', caigut); }
console.log(`\n${ok} OK · ${ko} X`); process.exit(ko ? 1 : 0);
