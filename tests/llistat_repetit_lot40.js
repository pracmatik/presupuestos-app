#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 40 (27/10/2026) · EL LLISTAT REPETIT TAMBÉ QUAN LA LECTURA POSA LA ZONA EN UNA CÒPIA I NO EN L'ALTRA, QUAN EL DOCUMENT EL LLISTA TRES
 * VEGADES, I SENSE DEIXAR CAPÍTOLS BUITS DE MÉS. Documents inventats, català i castellà, cap dada de cap client (va també al repositori públic).
 *  1) segona còpia (pressupost amb preus) sota una zona que la primera no porta: es treu, i la zona i el capítol que es queden sense cap partida també;
 *  2) el document llista tres vegades (amidaments, pressupost amb preus i un tercer llistat sense preus): es treu la còpia;
 *  3) un capítol que ja era buit abans de treure res es queda; dues zones amb nom i diferents no es toquen (ho vigila també test_preus_zones_llistats.js);
 *  4) la PA amb la marca de quantitat del document («AMIDAMENT DIRECTE 2,200», «Medición directa 2,200») es reconeix encara que la lectura hi posi 1;
 *     amb «… 1,000» no; la marca de la partida de sota no compta;
 *  5) cada peça trencada es veu.
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
  const code = [deh, 'function pctPerDefecte(){ return null; }', 'function isNoSuma(r){ return /NO SUMA/i.test(String((r&&r.desc)||"")); }', H.slice(i, f),
    eF(H, '_clauFilaDoc'), eF(H, '_clauZona'), eF(H, '_clauTextFila'), eF(H, '_ternaPreu'), eF(H, 'llistatRepetit')].join('\n');
  return new Function('IDIOMA', code + '\nreturn {llistat:llistatRepetit, pa:_paQuantitatDocument};')(idioma);
}
const P = (desc, ut, amid, extra) => Object.assign({ tipo: 'part', num: '', desc, ut, amid, preu: 0 }, extra || {});
const cap = d => ({ tipo: 'cap', desc: d }), sec = d => ({ tipo: 'sec', desc: d });
const parts = rows => rows.filter(r => r && r.tipo === 'part');
function llistat(es) {
  const it = es ? [['F001', 'm2', 'DEMOLICIÓN DE PAVIMENTO DE HORMIGÓN', 'Demolición de pavimento de hormigón de hasta 20 cm de grosor, con compresor y carga sobre camión', 109, 10.98],
    ['F002', 'm3', 'EXCAVACIÓN Y CARGA DE TIERRA', 'Excavación y carga de tierra para caja de pavimento en terreno de tránsito, con medios mecánicos', 16, 4.75],
    ['F003', 'm3', 'TERRAPLENADO Y NIVELACIÓN DE TIERRAS', 'Terraplenado y nivelación de tierras con máquinas automotrices y compactación del noventa y cinco por ciento', 22.5, 5.23],
    ['F004', 'm3', 'TRANSPORTE DE TIERRAS AL VERTEDERO', 'Transporte de tierras con camión de doce toneladas hasta el vertedero autorizado, incluido canon de vertido', 42, 6.36],
    ['F005', 'm3', 'BASE DE ZAHORRA ARTIFICIAL', 'Base de zahorra artificial con extendido y apisonado del material al noventa y ocho por ciento', 108.45, 26.54]]
    : [['F001', 'm2', 'DEMOLICIÓ DE PAVIMENT DE FORMIGÓ', 'Demolició de paviment de formigó de fins a 20 cm de gruix, amb compressor i càrrega sobre camió', 109, 10.98],
    ['F002', 'm3', 'EXCAVACIÓ I CÀRREGA DE TERRA', 'Excavació i càrrega de terra per a caixa de paviment en terreny de trànsit, amb mitjans mecànics', 16, 4.75],
    ['F003', 'm3', 'TERRAPLENAT I ANIVELLAMENT DE TERRES', 'Terraplenat i anivellament de terres amb màquines automotrius i compactació del noranta-cinc per cent', 22.5, 5.23],
    ['F004', 'm3', 'TRANSPORT DE TERRES A L\'ABOCADOR', 'Transport de terres amb camió de dotze tones fins a l\'abocador autoritzat, inclòs el cànon d\'abocament', 42, 6.36],
    ['F005', 'm3', 'BASE DE TOT-U ARTIFICIAL', 'Base de tot-u artificial amb estesa i piconatge del material al noranta-vuit per cent', 108.45, 26.54]];
  const f = x => x.toFixed(2).replace('.', ','), f3 = x => x.toFixed(3).replace('.', ',');
  const am = it.map((x, k) => (k + 1) + ' ' + x[0] + ' ' + x[1] + ' ' + x[3] + '\nNum. Text Tipus [C] [D] [E] [F] TOTAL Fórmula\n1 ' + f3(x[4]) + ' ' + f3(x[4]) + ' C#*D#*E#*F#\nTOTAL AMIDAMENT ' + f3(x[4])).join('\n');
  const pr = it.map((x, k) => { const w = x[3].split(' '), h = Math.ceil(w.length / 2); return (k + 1) + ' ' + x[0] + ' ' + x[1] + ' ' + w.slice(0, h).join(' ').toUpperCase() + ' ' + f(x[5]) + ' ' + f3(x[4]) + ' ' + f(x[5] * x[4]) + '\n' + w.slice(h).join(' ').toUpperCase() + ' (P - ' + (k + 1) + ')'; }).join('\n');
  const txt = (es ? 'MEDICIONES Obra Ejemplo\nCapítulo 01 MOVIMIENTOS DE TIERRAS\n' : 'AMIDAMENTS Obra Exemple\nCapítol 01 MOVIMENTS DE TERRES\n') + am + '\n' + (es ? 'PRESUPUESTO Obra Ejemplo\nCapítulo 01 MOVIMIENTOS DE TIERRAS\n' : 'PRESSUPOST Obra Exemple\nCapítol 01 MOVIMENTS DE TERRES\n') + pr;
  const primera = it.map(x => P(x[2] + '\n- ' + x[3] + '.', x[1], x[4]));
  const segona = it.map((x, k) => { const w = x[3].split(' '), h = Math.ceil(w.length / 2); return P(w.slice(0, h).join(' ').toUpperCase() + ' ' + f(x[5]) + ' ' + f3(x[4]) + ' ' + f(x[5] * x[4]) + '\n- ' + w.slice(h).join(' ') + ' (P - ' + (k + 1) + ')', x[1], x[4]); });
  return { txt, primera, segona, capN: es ? 'MOVIMIENTOS DE TIERRAS' : 'MOVIMENTS DE TERRES' };
}
function prova(H, ll) {
  const T = carrega(H, ll), es = ll === 'es', L = llistat(es), res = {}, zona = es ? 'PRESUPUESTO GENERAL DE LA OBRA' : 'PRESSUPOST GENERAL DE L\'OBRA';
  { const rows = [cap(L.capN)].concat(L.primera, [sec(zona), cap(L.capN)], L.segona); const av = []; const r = T.llistat(rows, L.txt, av, es);
    res.zona = r.trets === 5 && parts(rows).length === 5 && !rows.some(x => x.tipo === 'sec') && rows.filter(x => x.tipo === 'cap').length === 1; res.zonaDetall = JSON.stringify(r) + ' ' + rows.map(x => x.tipo[0]).join(''); }
  { const am = L.txt.slice(0, L.txt.indexOf(es ? 'PRESUPUESTO' : 'PRESSUPOST')); const txt3 = L.txt + '\n' + am.replace(es ? 'MEDICIONES' : 'AMIDAMENTS', es ? 'LISTADO' : 'LLISTAT');
    const rows = [cap(L.capN)].concat(L.primera, [cap(L.capN)], L.segona); const av = []; const r = T.llistat(rows, txt3, av, es); res.tres = r.trets === 5 && parts(rows).length === 5; res.tresDetall = JSON.stringify(r); }
  { const rows = [cap(L.capN)].concat(L.primera, [cap(es ? 'CAPÍTULO VACÍO' : 'CAPÍTOL BUIT'), cap(L.capN)], L.segona); const av = []; T.llistat(rows, L.txt, av, es);
    res.buit = rows.some(x => x.tipo === 'cap' && /BUIT|VACÍO/.test(x.desc)) && parts(rows).length === 5; }
  { const rows = [sec(es ? 'ESCALERA A' : 'ESCALA A'), cap(L.capN)].concat(L.primera, [sec(es ? 'ESCALERA B' : 'ESCALA B'), cap(L.capN)], L.segona); const av = []; const r = T.llistat(rows, L.txt, av, es);
    res.escales = r.trets === 0 && parts(rows).length === 10; }
  { const tx = es ? ['1 H141CCCC PA Partida alzada a justificar para la aplicación del plan de seguridad y salud', 'MEDICIÓN DIRECTA 2,200', '2 H141CCCQ PA Partida alzada a justificar para el programa de control de calidad', 'MEDICIÓN DIRECTA 1,000']
      : ['1 H141CCCC PA Partida alçada a justificar per a l\'aplicació del pla de seguretat i salut', 'AMIDAMENT DIRECTE 2,200', '2 H141CCCQ PA Partida alçada a justificar per al programa de control de qualitat', 'AMIDAMENT DIRECTE 1,000'];
    const src = tx.join('\n'), a = P('PARTIDA ALÇADA\n- ' + tx[0].replace(/^\d+\s+\S+\s+PA\s+/, ''), 'pa', 1), b = P('PARTIDA ALÇADA\n- ' + tx[2].replace(/^\d+\s+\S+\s+PA\s+/, ''), 'pa', 1);
    res.pa = T.pa(a, src) === 2.2 && T.pa(b, src) === 0; res.paDetall = T.pa(a, src) + ' / ' + T.pa(b, src); }
  return res;
}
for (const ll of ['ca', 'es']) {
  const e = ll === 'ca' ? '[CA]' : '[ES]'; let R; try { R = prova(H0, ll); } catch (x) { check(e + ' les eines es carreguen', false, x.message); continue; }
  check(e + ' 1) la còpia sota una zona que la primera no porta es treu, i la zona i el capítol buits també', R.zona, R.zonaDetall);
  check(e + ' 2) el document llista tres vegades: es treu la còpia', R.tres, R.tresDetall);
  check(e + ' 3) el capítol que ja era buit es queda', R.buit);
  check(e + ' 3b) dues zones amb nom i diferents (dues escales): no es toca res', R.escales);
  check(e + ' 4) PA amb «AMIDAMENT DIRECTE 2,200»: es reconeix encara que la lectura posi 1; amb 1,000 no', R.pa, R.paDetall);
}
const peces = [
  ['1 (la zona buida no casa)', trenca(H0, '(zona[P[a+L]]===zona[P[b+L]]||!zona[P[a+L]]||!zona[P[b+L]])', 'zona[P[a+L]]===zona[P[b+L]]'), R => R.zona],
  ['2 (només es mira l\'última aparició)', trenca(H0, 'return o.slice(1).some(p=>_ternaPreu(w(p),q))&&!_ternaPreu(w(o[0]),q)?"preus":null;', 'return _ternaPreu(w(o[o.length-1]),q)&&!_ternaPreu(w(o[0]),q)?"preus":null;'), R => R.tres],
  ['4 (la marca de quantitat de la PA no es mira)', trenca(H0, 'if(v>0&&Math.abs(v-1)>0.001) return v; continue; }', 'continue; }'), R => R.pa],
  ['3 (les capçaleres buides es queden)', trenca(H0, 'const tr=[...treu,..._caps]', 'const tr=[...treu]'), R => R.zona],
];
for (const [n, H, ok1] of peces) { if (!H) { check('peça rota ' + n + ': es pot muntar', false); continue; }
  let vist = false; for (const ll of ['ca', 'es']) { try { if (!ok1(prova(H, ll))) vist = true; } catch (e) { vist = true; } }
  check('peça rota ' + n + ': el guardià la veu', vist); }
console.log((ko ? '✗ ' : '✓ ') + ok + ' OK · ' + ko + ' X');
process.exit(ko ? 1 : 0);
