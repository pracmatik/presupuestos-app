#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 39 (27/10/2026) · LA QUANTITAT CONTRA LA LÍNIA QUE TANCA LA PARTIDA, I ELS CAPÍTOLS DEL MATEIX NIVELL AL MATEIX NIVELL. Documents inventats,
 * català i castellà, cap dada de cap client (va també al repositori públic).
 *  1) el document tanca cada partida amb «quantitat · preu · import» («12,96 9,40 € 121,82 €», a × b = c): una fila amb una quantitat que no és cap de les dues
 *     surt marcada i en vermell amb el seu nom; la que hi quadra, no; amb un 1 («1,00 932,63 932,63») i altres línies de mesura al bloc no es diu res (no prova res),
 *     però si és l'única línia amb xifres la quantitat és 1; sense línia de tancament, res;
 *  2) document amb «CAPÍTULO nn» i «SUBCAPÍTULO nn.mm»: si un capítol del nivell de dalt ja és zona a la pantalla, el que porta les partides directament també ho
 *     és (zona i, a sota, el seu capítol); sense subcapítols al document, o si cap del nivell de dalt no és zona, no es toca res;
 *  3) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.split(de).join(a); return s === src ? null : s; };
function eF(H, n) { const s = H.indexOf('function ' + n + '('); if (s < 0) throw new Error('no ' + n); let i = H.indexOf('{', s), d = 0; for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) return H.slice(s, i + 1); } } }
function carrega(H, idioma) {
  const i = H.indexOf('// ==== INICI EINES DE LECTURA ===='), f = H.indexOf('// ==== FI EINES DE LECTURA ====');
  const deh = (H.match(/function _dehyphen\(s\)\{[^\n]*\}/) || [''])[0] + '\n' + ((H.match(/^const parseNum=.*$/m) || [''])[0]) + '\n' + ((H.match(/^const num2=.*$/m) || [''])[0]);
  const code = [deh, 'function pctPerDefecte(){ return null; }', 'function isNoSuma(r){ return /NO SUMA/i.test(String((r&&r.desc)||"")); }', H.slice(i, f), eF(H, '_clauZona')].join('\n');
  return new Function('IDIOMA', code + '\nreturn {q:(typeof _quantitatTancamentDocument==="function"?_quantitatTancamentDocument:null), z:(typeof _zonesComElsGermans==="function"?_zonesComElsGermans:null)};')(idioma);
}
const P = (desc, ut, amid) => ({ tipo: 'part', num: '', desc, ut, amid, preu: 0 });
const cap = d => ({ tipo: 'cap', desc: d }), sec = d => ({ tipo: 'sec', desc: d });
const D = {
  ca: { cap: ['CAPÍTOL 1. ENDERROCS', 'CAPÍTOL 2. PALETERIA'],
    p: [['1.01 m2. Enderroc d\'envans interiors.', 'Enderroc manual d\'envans interiors de maó amb càrrega de runa.', ['Entrada vestidors 3,90', 'Dutxes vestidors 9,06', '12,96 9,40 € 121,82 €'], 12.96],
      ['1.02 u. Retirada de mirall.', 'Retirada de mirall i càrrega a contenidor per a envidraments.', ['Lavabos 4,00', 'Vestidors 4,00', '8,00 6,10 € 48,80 €'], 8],
      ['1.03 u. Retirada de cartell.', 'Retirada del cartell existent de la façana amb mitjans manuals.', ['Façana principal 1,00', '1,00 932,63 932,63'], 5],
      ['2.01 m2. Arrebossat de parament.', 'Arrebossat reglejat sobre parament vertical interior amb morter mixt.', ['Vestíbul 20,00', '20,00 15,35 € 307,00 €'], 20]],
    niv: ['CAPÍTOL 01 TREBALLS PREVIS', 'SUBCAPÍTOL 01.01 ENDERROCS', 'SUBCAPÍTOL 01.02 DESMUNTATGES', 'CAPÍTOL 02 URBANITZACIÓ', 'SUBCAPÍTOL 02.01 PAVIMENTS', 'CAPÍTOL 03 GESTIÓ DE RESIDUS', 'CAPÍTOL 04 CONTROL DE QUALITAT'],
    zones: ['TREBALLS PREVIS', 'ENDERROCS', 'DESMUNTATGES', 'URBANITZACIÓ', 'PAVIMENTS', 'GESTIÓ DE RESIDUS', 'CONTROL DE QUALITAT'] },
  es: { cap: ['CAPÍTULO 1. DERRIBOS', 'CAPÍTULO 2. ALBAÑILERÍA'],
    p: [['1.01 m2. Derribo de tabiques interiores.', 'Derribo manual de tabiques interiores de ladrillo con carga de escombros.', ['Entrada vestuarios 3,90', 'Duchas vestuarios 9,06', '12,96 9,40 € 121,82 €'], 12.96],
      ['1.02 u. Retirada de espejo.', 'Retirada de espejo y carga a contenedor para vidrios.', ['Lavabos 4,00', 'Vestuarios 4,00', '8,00 6,10 € 48,80 €'], 8],
      ['1.03 u. Retirada de cartel.', 'Retirada del cartel existente de la fachada con medios manuales.', ['Fachada principal 1,00', '1,00 932,63 932,63'], 5],
      ['2.01 m2. Enfoscado de paramento.', 'Enfoscado maestreado sobre paramento vertical interior con mortero mixto.', ['Vestíbulo 20,00', '20,00 15,35 € 307,00 €'], 20]],
    niv: ['CAPÍTULO 01 TRABAJOS PREVIOS', 'SUBCAPÍTULO 01.01 DERRIBOS', 'SUBCAPÍTULO 01.02 DESMONTAJES', 'CAPÍTULO 02 URBANIZACIÓN', 'SUBCAPÍTULO 02.01 PAVIMENTOS', 'CAPÍTULO 03 GESTIÓN DE RESIDUOS', 'CAPÍTULO 04 CONTROL DE CALIDAD'],
    zones: ['TRABAJOS PREVIOS', 'DERRIBOS', 'DESMONTAJES', 'URBANIZACIÓN', 'PAVIMENTOS', 'GESTIÓN DE RESIDUOS', 'CONTROL DE CALIDAD'] } };
function prova(H, ll) {
  const T = carrega(H, ll), d = D[ll], es = ll === 'es', res = {};
  if (!T.q || !T.z) throw new Error('falten les funcions del LOT 39');
  const text = [d.cap[0]].concat(...d.p.slice(0, 3).map(x => [x[0], x[1]].concat(x[2])), [d.cap[1]], ...d.p.slice(3).map(x => [x[0], x[1]].concat(x[2])), ['TOTAL PRESSUPOST'], ['x'.repeat(200)]).join('\n');
  const files = q0 => [cap(d.cap[0].replace(/^\S+\s+\d+\.\s*/, ''))].concat(d.p.slice(0, 3).map((x, k) => P(x[0] + '\n' + x[1], x[0].split(' ')[1].replace(/\.$/, ''), k === 0 ? q0 : x[3])), [cap(d.cap[1].replace(/^\S+\s+\d+\.\s*/, ''))], d.p.slice(3).map(x => P(x[0] + '\n' + x[1], 'm2', x[3])));
  { const rows = files(1.38), av = []; const n = T.q(rows, text, av, es); const pp = rows.filter(r => r.tipo === 'part');
    res.q = n === 1 && /QUANTITAT A REVISAR|CANTIDAD A REVISAR/.test(pp[0].flag || '') && !pp.slice(1).some(r => r.flag) && av.some(a => /^⚠⚠/.test(a) && a.indexOf(d.p[0][0].slice(0, 25)) >= 0); res.qDetall = n + ' ' + JSON.stringify(pp.map(r => r.flag || '')) + ' ' + av.join(' | '); }
  { const t1 = d.cap[0] + '\n' + d.p[0][0] + '\n' + d.p[0][1] + '\n1,00 20,48 20,48\n' + d.p[1][0] + '\n' + d.p[1][1] + '\n' + d.p[1][2].join('\n') + '\n' + 'x'.repeat(200);
    const rows = [cap('X'), P(d.p[0][0] + '\n' + d.p[0][1], 'm2', 20.48), P(d.p[1][0] + '\n' + d.p[1][1], 'u', 8)], av = []; res.q1 = T.q(rows, t1, av, es) === 1 && /QUANTITAT A REVISAR|CANTIDAD A REVISAR/.test(rows[1].flag || ''); }
  { const rows = files(12.96), av = []; res.qBona = T.q(rows, text, av, es) === 0 && !av.length; }
  { const rows = files(1.38), av = []; res.qSense = T.q(rows, text.replace(/[\d.,]+ [\d.,]+ € [\d.,]+ €/g, 'TOTAL 0'), av, es) === 0; }
  // 2) nivells
  const doc = d.niv.map((t, k) => t + '\n' + (es ? 'Partida de prueba número ' : 'Partida de prova número ') + k + '\n1,00').join('\n');
  const pantalla = () => [sec(d.zones[0]), cap(d.zones[1]), P('a', 'u', 1), cap(d.zones[2]), P('b', 'u', 1), sec(d.zones[3]), cap(d.zones[4]), P('c', 'u', 1), cap(d.zones[5]), P('e', 'u', 1), cap(d.zones[6]), P('f', 'u', 1)];
  { const rows = pantalla(), av = []; const n = T.z(rows, doc, av, es); const t = rows.map(r => r.tipo[0] + ':' + (r.desc || '').slice(0, 12)).join(',');
    const i5 = rows.findIndex(r => r.tipo === 'cap' && r.desc === d.zones[5]), i6 = rows.findIndex(r => r.tipo === 'cap' && r.desc === d.zones[6]);
    res.z = n === 2 && rows[i5 - 1] && rows[i5 - 1].tipo === 'sec' && rows[i5 - 1].desc === d.zones[5] && rows[i6 - 1] && rows[i6 - 1].tipo === 'sec' && rows[i6 - 1].desc === d.zones[6] && av.some(a => /^⚠ /.test(a)); res.zDetall = n + ' ' + t; }
  { const rows = pantalla(), av = []; res.zSenseSub = T.z(rows, doc.replace(/SUBCAP[IÍ]T(?:OL|ULO) \d+\.\d+ /g, 'APARTAT '), av, es) === 0 && rows.length === 12; }
  { const rows = pantalla().map(r => r.tipo === 'sec' ? cap(r.desc) : r), av = []; res.zSenseZona = T.z(rows, doc, av, es) === 0 && !rows.some(r => r.tipo === 'sec'); }
  return res;
}
for (const ll of ['ca', 'es']) {
  const e = ll === 'ca' ? '[CA]' : '[ES]'; let R; try { R = prova(H0, ll); } catch (x) { check(e + ' les eines es carreguen', false, x.message); continue; }
  check(e + ' 1) quantitat que no és cap de les dues de «a × b = c» del tancament: marcada i en vermell amb el seu nom', R.q, R.qDetall);
  check(e + ' 1b) la quantitat que hi quadra no es marca', R.qBona);
  check(e + ' 1d) «1,00 20,48 20,48» com a única línia de xifres i la fila diu 20,48: es marca (la quantitat és 1)', R.q1);
  check(e + ' 1c) sense línia de tancament no es diu res', R.qSense);
  check(e + ' 2) capítol del nivell de dalt sense subcapítols, amb germans que són zona: es posa com a zona amb el seu capítol', R.z, R.zDetall);
  check(e + ' 2b) document d\'un sol nivell: no es toca', R.zSenseSub);
  check(e + ' 2c) cap capítol del nivell de dalt és zona a la pantalla: no es toca', R.zSenseZona);
}
check('la càrrega crida les dues comprovacions', /_quantitatTancamentDocument\(allRows,amidament,allAvisos,IDIOMA==="es"\)/.test(H0) && /_zonesComElsGermans\(allRows,amidament,allAvisos,IDIOMA==="es"\)/.test(H0));
const peces = [
  ['1 (la quantitat no es compara)', trenca(H0, 'if(u1?Math.abs(q-1)<=0.005:(Math.abs(q-a)<=0.005*Math.max(1,a)||Math.abs(q-b)<=0.005*Math.max(1,b))) continue;', 'continue;'), R => R.q],
  ['1b (el «1» deixa de ser prudent)', trenca(H0, '||((Math.abs(a-1)<0.0005||Math.abs(b-1)<0.0005)&&nNum>1)) continue;', ') continue;'), R => R.q && R.qBona && !R.__],
  ['2 (els germans no es miren)', trenca(H0, 'if(![...N1].some(k=>Z.has(k))) return 0;', 'return 0;'), R => R.z],
  ['2b (sense subcapítols també es toca)', trenca(H0, 'if(N1.size<2||n2<2) return 0;', 'if(N1.size<2) return 0;'), R => R.zSenseSub],
];
for (const [n, H, ok1] of peces) { if (!H) { check('peça rota ' + n + ': es pot muntar', false); continue; }
  let vist = false; for (const ll of ['ca', 'es']) { try { if (!ok1(prova(H, ll))) vist = true; } catch (e) { vist = true; } }
  check('peça rota ' + n + ': el guardià la veu', vist); }
console.log((ko ? '✗ ' : '✓ ') + ok + ' OK · ' + ko + ' X');
process.exit(ko ? 1 : 0);
