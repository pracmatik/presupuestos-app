#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 38 (27/10/2026) · ERRORS CALLATS DE LES NOSTRES CAPES (repàs dels 60 documents públics, INT33). Documents inventats, català i castellà,
 * cap dada de cap client (va també al repositori públic).
 *  1) una xifra amb unitat DINS D'UNA FRASE («… corda d'amarratge de 1.00 m de llargada, homologada.») no és el codi i la unitat de la partida següent:
 *     el text de la partida no es talla allà (abans es perdia el final sense avís);
 *  2) una fila que comença amb el codi del document i la unitat és una partida encara que el codi porti minúscules («CSPC.5d Ud. Balisa…»):
 *     el reparador de textos no se l'empassa dins de la de sobre;
 *  3) la PA amb una quantitat al document diferent d'1 («3,95 150,000 592,50»): es reconeix (es diu a la pantalla); un preu («1,00 932,63 932,63») no;
 *  4) el mateix llistat dues vegades quan la segona còpia (el pressupost) s'escriu diferent: hi porta el preu i l'import enmig del text, la referència
 *     «(P - 3)» i el títol tallat en un altre lloc → es treu la segona i la primera queda marcada; sense preus al document no es treu res;
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
  return new Function('IDIOMA', code + '\nreturn {rep:repairDescsFromSource, pa:(typeof _paQuantitatDocument==="function"?_paQuantitatDocument:null), llistat:llistatRepetit};')(idioma);
}
const P = (desc, ut, amid, extra) => Object.assign({ tipo: 'part', num: '', desc, ut, amid, preu: 0 }, extra || {});
const cap = d => ({ tipo: 'cap', desc: d });
const parts = rows => rows.filter(r => r && r.tipo === 'part');
const D = {
  ca: { frase: ['07.04 Ud Botes de seguretat', 'Botes de seguretat amb puntera metàl·lica i sola antilliscant, homologades. Mesurada la unitat.', '4,00 26,29 105,16',
      '07.05 Ud Cinturó de seguretat', 'Cinturó de seguretat de subjecció fabricat amb poliamida, doble anellat d\'acer, i corda', 'd\'amarratge de 1.00 m de llargada, homologada. Mesurada la unitat.', '4,00 27,90 111,60',
      '07.06 Ud Guants de soldador', 'Guants de cuir per a treballs de soldadura, homologats. Mesurada la unitat.', '6,00 3,10 18,60'],
    fiFrase: 'homologada. Mesurada la unitat.',
    minus: ['5.16 H Formació en seguretat i salut', '4,00', '5.17 Ud. Lloguer mensual de caseta vestidor', '2,00', 'CSPC.5d Ud. Balisa lluminosa de senyalització', '3,00', '5.19 Ud. Extintor de pols polivalent', '2,00'],
    pa: ['1 0101EPH PA Esbrossada de plantes i herbes en interiors i exteriors, amb mitjans 3,95 150,000 592,50', 'manuals, per a una alçària de brossa <= 150 cm i càrrega sobre camió', 'o contenidor (P - 1)',
      '2 0102REP PA Reparació de components de la instal·lació de ventilació segons les proves 1,00 932,63 932,63', 'de servei, amb petit material i ajudes de paleta (P - 2)'] },
  es: { frase: ['07.04 Ud Botas de seguridad', 'Botas de seguridad con puntera metálica y suela antideslizante, homologadas. Medida la unidad.', '4,00 26,29 105,16',
      '07.05 Ud Cinturón de seguridad', 'Cinturón de seguridad de sujeción fabricado con poliamida, doble anillaje de acero, y cuerda', 'de amarre de 1.00 m de longitud, homologado. Medida la unidad.', '4,00 27,90 111,60',
      '07.06 Ud Guantes de soldador', 'Guantes de cuero para trabajos de soldadura, homologados. Medida la unidad.', '6,00 3,10 18,60'],
    fiFrase: 'homologado. Medida la unidad.',
    minus: ['5.16 H Formación en seguridad y salud', '4,00', '5.17 Ud. Alquiler mensual de caseta vestuario', '2,00', 'CSPC.5d Ud. Baliza luminosa de señalización', '3,00', '5.19 Ud. Extintor de polvo polivalente', '2,00'],
    pa: ['1 0101EPH PA Desbroce de plantas y hierbas en interiores y exteriores, con medios 3,95 150,000 592,50', 'manuales, para una altura de broza <= 150 cm y carga sobre camión', 'o contenedor (P - 1)',
      '2 0102REP PA Reparación de componentes de la instalación de ventilación según las pruebas 1,00 932,63 932,63', 'de servicio, con pequeño material y ayudas de albañilería (P - 2)'] } };
// el llistat: amidaments (sense preus) i, a sota, el pressupost (preu · quantitat · import enmig del text, «(P - n)» i el títol tallat en un altre lloc)
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
  const T = carrega(H, ll), d = D[ll], es = ll === 'es', res = {};
  { const src = d.frase.join('\n') + '\n' + 'x '.repeat(120); const rows = [cap('07 X'), P(d.frase[0].replace(/^\S+\s+\S+\s+/, ''), 'ud', 4), P(d.frase[3].replace(/^\S+\s+\S+\s+/, '') + '\n' + d.frase[4] + '\n' + d.frase[5], 'ud', 4), P(d.frase[7].replace(/^\S+\s+\S+\s+/, ''), 'ud', 6)];
    T.rep(rows, src, []); const r = parts(rows)[1]; res.frase = !!r && String(r.desc).replace(/\s+/g, ' ').indexOf(d.fiFrase) >= 0 && parts(rows).length === 3; res.fraseDetall = r && r.desc; }
  { const src = d.minus.join('\n') + '\n' + 'y '.repeat(120); const rows = [cap('05 X')].concat([0, 2, 4, 6].map(k => P(d.minus[k], 'ud', parseFloat(d.minus[k + 1].replace(',', '.')))));
    T.rep(rows, src, []); res.minus = parts(rows).length === 4 && parts(rows).some(r => /CSPC\.5d/.test(r.desc) && +r.amid === 3); res.minusDetall = JSON.stringify(parts(rows).map(r => r.desc)); }
  { const src = d.pa.join('\n'); const a = P(d.pa[0].replace(/^\d+\s+\S+\s+PA\s+/, '').replace(/\s+[\d.,]+\s+[\d.,]+\s+[\d.,]+$/, '') + '\n- ' + d.pa[1], 'pa', 150), b = P(d.pa[3].replace(/^\d+\s+\S+\s+PA\s+/, '').replace(/\s+[\d.,]+\s+[\d.,]+\s+[\d.,]+$/, '') + '\n- ' + d.pa[4], 'pa', 932.63), c = P('Altra partida alçada qualsevol de prova\n- amb el text de sota i sense cap xifra', 'pa', 1);
    res.pa = !!T.pa && T.pa(a, src) === 150 && T.pa(b, src) === 0 && T.pa(c, src) === 0; res.paDetall = T.pa ? [T.pa(a, src), T.pa(b, src), T.pa(c, src)].join(' / ') : 'sense _paQuantitatDocument'; }
  { const L = llistat(es); let rows = [cap(L.capN)].concat(L.primera, [cap(L.capN)], L.segona); const av = [];
    const r = T.llistat(rows, L.txt, av, es); res.llistat = r.trets === 5 && parts(rows).length === 5 && parts(rows).every(x => /LLISTAT REPETIT|LISTADO REPETIDO/.test(x.flag || '')) && av.some(a => /^⚠ /.test(a));
    res.llistatDetall = JSON.stringify(r) + ' ' + av.join(' | ');
    const sensePreus = L.txt.slice(0, L.txt.indexOf(es ? 'PRESUPUESTO' : 'PRESSUPOST')) + '\n' + L.txt.slice(0, L.txt.indexOf(es ? 'PRESUPUESTO' : 'PRESSUPOST'));   // dues vegades el mateix, sense preus
    rows = [cap(L.capN)].concat(L.primera, [cap(L.capN)], L.segona.map(x => Object.assign({}, x))); const av2 = []; const r2 = T.llistat(rows, sensePreus, av2, es);
    res.sensePreus = r2.trets === 0 && parts(rows).length === 10; }
  return res;
}
for (const ll of ['ca', 'es']) {
  const e = ll === 'ca' ? '[CA]' : '[ES]'; let R; try { R = prova(H0, ll); } catch (x) { check(e + ' les eines es carreguen', false, x.message); continue; }
  check(e + ' 1) una xifra amb unitat dins d\'una frase («de 1.00 m de») no talla el text de la partida', R.frase, R.fraseDetall);
  check(e + ' 2) una fila amb codi del document amb minúscules («CSPC.5d Ud.») és una partida: no s\'empassa', R.minus, R.minusDetall);
  check(e + ' 3) PA amb quantitat del document (preu · 150 · import) es reconeix; un preu (1,00 · 932,63 · 932,63) i la PA d\'1 no', R.pa, R.paDetall);
  check(e + ' 4) segona còpia del llistat escrita diferent (preu enmig, «(P - n)»): es treu i la primera queda marcada', R.llistat, R.llistatDetall);
  check(e + ' 4b) el mateix sense preus al document: no es treu res', R.sensePreus);
}
check('la garantia «PA = 1» de la càrrega diu les PA amb quantitat del document', /_paQuantitatDocument\(r,amidament\)/.test(H0) && /partida\/es alçada\/es \(PA\) amb una quantitat diferent d'1 al document/.test(H0));
// 5) peces trencades: cada una s'ha de veure
const peces = [
  ['1 (la xifra dins de la frase torna a tallar)', H0.indexOf('(?<!(?:^|\\s)(?:de|del|d\'|a|al|amb|con|en|per|para|por|fins|hasta|entre|sobre|i|y|o|x))\\s[A-Z]{0,3}') >= 0 ? trenca(H0, '(?<!(?:^|\\s)(?:de|del|d\'|a|al|amb|con|en|per|para|por|fins|hasta|entre|sobre|i|y|o|x))\\s[A-Z]{0,3}\\d{1,2}\\.\\d{2}(?:\\.\\d{2})?\\s+(?:m2|m²|m3|m³|ml|ud|u|pa|kg|m|h)\\s(?!(?:de|del|d[\'’]|a|al|amb|con|en|per|para|por|i|y|o|que|x)\\s)', '\\s[A-Z]{0,3}\\d{1,2}\\.\\d{2}(?:\\.\\d{2})?\\s+(?:m2|m²|m3|m³|ml|ud|u|pa|kg|m|h)\\s') : null, R => R.frase],
  ['2 (el codi amb minúscules torna a ser text)', trenca(H0, '(?=\\\\S*[A-Z])[A-Za-z0-9][A-Za-z0-9.\\\\-]*\\\\d[A-Za-z0-9.\\\\-]*', 'ZZZZNOCODIZZZZ'), R => R.minus],
  ['3 (la prova de preu · quantitat · import no es mira)', trenca(H0, 'if(_ternaPreu(S.slice(Math.max(0,p-200),p+pr.length+500),q)) return q;', 'return q;'), R => R.pa],
  ['4 (la clau fluixa no casa res)', trenca(H0, 'return c/(A.size+B.size-c)>=0.6; };', 'return false; };'), R => R.llistat],
];
for (const [n, H, ok1] of peces) { if (!H) { check('peça rota ' + n + ': es pot muntar', false); continue; }
  let vist = false; for (const ll of ['ca', 'es']) { try { if (!ok1(prova(H, ll))) vist = true; } catch (e) { vist = true; } }
  check('peça rota ' + n + ': el guardià la veu', vist); }
console.log((ko ? '✗ ' : '✓ ') + ok + ' OK · ' + ko + ' X');
process.exit(ko ? 1 : 0);
