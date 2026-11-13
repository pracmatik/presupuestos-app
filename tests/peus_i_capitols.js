#!/usr/bin/env node
'use strict';
/*
 * Guardià · 13/11/2026 · DOS CAUSES DE LECTURA QUE DEIXAVEN FILES VERDES EQUIVOCADES.
 *
 * A) El segell girat del marge que el PDF repeteix a cada full (visat, registre d'entrada, «còpia autèntica») es barrejava amb el text d'una partida de quantitat bona
 *    i la fila sortia verda amb un text que no era el seu. Ara la lectura del PDF el marca com a peu (##PEU##), el peu del document el recull sol o en bloc, i la neteja
 *    el treu de la descripció (com a línia, com a línia feta només de peus, enganxat a una frase o dins d'una paraula), sense mirar majúscules, espais ni xifres.
 * B) Els capítols amb subcapítols (7 → 7.1, 7.2…, o subcapítols que el document només marca pel seu total) sortien amb tots els nivells al mateix lloc i les partides
 *    quedaven a la zona equivocada. Ara el capítol de dalt és zona i cada subcapítol va davant de les seves partides.
 * Documents inventats, en català i castellà (cap dada de cap client). També vigila el que NO ha de canviar: un text que s'assembla a un peu però és de la partida, un
 * número sol dins d'un text, un document de dos nivells, una pantalla que ja porta zones, una partida de debò amb el nom d'un subcapítol.
 * Ús: node test_peus_i_capitols.js <app.html>
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const HTML = process.argv[2] || path.join(__dirname, '..', 'app_gta.html');
const H = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };

function ext(n) { let m = new RegExp('\\n(?:async\\s+)?function\\s+' + n + '\\s*\\(').exec(H);
  if (!m) { m = new RegExp('\\n(?:const|let|var)\\s+' + n + '\\s*=').exec(H); if (!m) return '';
    const e = H.indexOf('\n];', m.index), l = H.indexOf('\n', m.index + 1); return H.slice(m.index + 1, (H.slice(m.index, l).trim().endsWith('[') && e > 0) ? e + 3 : l).replace(/^(const|let) /, 'var '); }
  const b = H.indexOf('{', m.index); let d = 0, i = b; for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) { i++; break; } } } return H.slice(m.index + 1, i); }
const NAMES = ['_dehyphen', '_cleanLit', '_clauZona', '_RE_PEU_LINIA', '_esPeuDePagina', '_peusDelDocument', '_rxPeus', '_trauPeus', 'senseMarquesInternes', '_capitolsAmbSubcapitols', '_subcapitolsPelTotal'];
const ctx = vm.createContext({ console });
vm.runInContext('function _esCapcaleraColumnes(){ return false; } function _senseCapcaleraMesuraAlFinal(l){ return l; }', ctx);   // (la neteja de capçaleres de columnes de mesura no és d'aquest guardià)
let carregat = true;
for (const n of NAMES) { const s = ext(n); if (!s) continue; try { vm.runInContext(s, ctx); } catch (e) { carregat = false; console.error('  (no es pot carregar ' + n + ': ' + e.message + ')'); } }
// una peça que en fa servir una altra de l'app: es carrega sola quan el motor diu que no la troba (fins a 40)
const R = c => { for (let k = 0; k < 40; k++) { try { return vm.runInContext(c, ctx); } catch (e) { const m = /^(\S+) is not defined/.exec(e.message), s = m && ext(m[1]); if (!s) return 'ERR ' + e.message; try { vm.runInContext(s, ctx); } catch (e2) { return 'ERR ' + e2.message; } } } return 'ERR massa dependències'; };
const J = o => JSON.stringify(o);
const run = (fn, rows, src, es) => { ctx.__rows = JSON.parse(J(rows)); ctx.__src = src; ctx.__av = []; const r = R('typeof ' + fn + '==="function"?' + fn + '(__rows,__src,__av,' + (es ? 'true' : 'false') + '):"no existeix"'); return { ret: r, rows: ctx.__rows, av: ctx.__av }; };
const forma = rows => rows.map(r => r.tipo + ':' + String(r.desc).split('\n')[0]).join(' | ');
const neteja = (desc, peus) => { ctx.__d = desc; ctx.__p = peus; return R('(()=>{ const rs=[{tipo:"part",desc:__d,amid:1}]; senseMarquesInternes(rs,__p); return rs[0].desc; })()'); };

console.log('A) segell girat repetit a cada full');
check('0) el guardià carrega les peces', carregat);
const brut = ['##PEU## Nº Reg. Entrada: 1234. Fecha/Hora: 09/06/2026 14:17:52', '1.1 m2 Pintura plástica en paramentos', 'Pintura plástica lisa, dos manos.', '##PEU## 21/001981 - T004', '##PEU## 06', '##PEU## MAYO', '##PEU## 2024', '1.2 m2 Falso techo', '##PEU## Nº Reg. Entrada: 5678. Fecha/Hora: 09/06/2026 14:18:03'].join('\n');
const peus = R('_peusDelDocument(' + J(brut) + ')');
check('A1) el peu del document recull el segell marcat, sol (amb xifres de veure)', Array.isArray(peus) && peus.some(p => /Reg\. Entrada/.test(p)), J(peus));
check('A2) i el bloc de línies marcades seguides com un sol peu', Array.isArray(peus) && peus.some(p => /21\/001981 - T004 06 MAYO 2024/.test(p)), J(peus));
check('A3) una línia marcada compta com a peu de pàgina', R('_esPeuDePagina("##PEU## Visado 12/2026")') === true);
const P = Array.isArray(peus) ? peus : [];
check('A4) línia sola de la descripció feta del segell, es treu', neteja('Pintura plástica\nNº Reg. Entrada: 9999. Fecha/Hora: 10/07/2027 08:00:01\nDos manos', P) === 'Pintura plástica\nDos manos', neteja('Pintura plástica\nNº Reg. Entrada: 9999. Fecha/Hora: 10/07/2027 08:00:01\nDos manos', P));
check('A5) enganxat a una frase (la IA canvia majúscules i espais), es treu i la frase queda', /^Falso techo registrable de yeso laminado\.?$/.test(String(neteja('Falso techo registrable nº reg. entrada: 4321.  fecha/hora: 01/01/2020 00:00:00 de yeso laminado.', P)).replace(/\s+/g, ' ').replace(/\s+de yeso/, ' de yeso')) || !/reg\. entrada/i.test(String(neteja('Falso techo registrable nº reg. entrada: 4321.  fecha/hora: 01/01/2020 00:00:00 de yeso laminado.', P))), neteja('Falso techo registrable nº reg. entrada: 4321.  fecha/hora: 01/01/2020 00:00:00 de yeso laminado.', P));
check('A6) dins d\'una paraula, el segell es treu i la paraula es torna a unir', neteja('Rejilla equivaNº Reg. Entrada: 1234. Fecha/Hora: 09/06/2026 14:17:52lente a la existente', P) === 'Rejilla equivalente a la existente', neteja('Rejilla equivaNº Reg. Entrada: 1234. Fecha/Hora: 09/06/2026 14:17:52lente a la existente', P));
check('A7) una línia feta només de peus (21/001981 - T004 06) es treu', !/T004/.test(String(neteja('Enfoscado de paredes\n21/001981 - T004 06\nPicado manual', P))), neteja('Enfoscado de paredes\n21/001981 - T004 06\nPicado manual', P));
check('N1) un 06 o un 2024 sol dins d\'un text de la partida NO s\'esborra mai', neteja('Pintura de 06 manos en 2024 m2 de superficie', P) === 'Pintura de 06 manos en 2024 m2 de superficie', neteja('Pintura de 06 manos en 2024 m2 de superficie', P));
check('N2) un text que s\'assembla a un peu però és de la partida es queda', neteja('Registro de entrada de agua en la vivienda, fecha de la obra', P) === 'Registro de entrada de agua en la vivienda, fecha de la obra', neteja('Registro de entrada de agua en la vivienda, fecha de la obra', P));
check('N3) sense segell marcat al document no es treu res (document de sempre)', neteja('Pintura\nNº Reg. Entrada: 1234. Fecha/Hora: 09/06/2026 14:17:52\nFin', []) === 'Pintura\nNº Reg. Entrada: 1234. Fecha/Hora: 09/06/2026 14:17:52\nFin');
check('N4) un peu de pàgina de sempre (sense marca) segueix sent peu', R('_esPeuDePagina("Página 3 de 12")') === true || R('_esPeuDePagina("Pàgina 3 de 12")') === true);
check('N5) la lectura del PDF marca el segell girat repetit i no l\'esborra, i el context extra no en porta la marca', /_esSegell/.test(H) && /"##PEU## "\+l\.t/.test(H) && /replace\(\/\^\[ \\t\]\*##PEU##/.test(H));

console.log('B) capítols amb subcapítols');
const cap = d => ({ tipo: 'cap', desc: d }), sec = d => ({ tipo: 'sec', desc: d }), part = (d, a) => ({ tipo: 'part', desc: d, amid: a == null ? 5 : a });
const src3 = ['CAPÍTULO 4 : REVESTIMIENTOS', '4.1 m2 Enlucido', 'CAPÍTULO 7 : SEGURIDAD Y SALUD', 'CAPÍTULO 7.1 : Locales y servicios', '7.1.1 ud Caseta', 'CAPÍTULO 7.2 : Protecciones individuales', '7.2.1 ud Casco', 'CAPITULO IMPORTE € %', '7.1 Locales y servicios 1.234,00 12,3'].join('\n');
const filas3 = [cap('REVESTIMIENTOS'), part('ENLUCIDO'), cap('SEGURIDAD Y SALUD'), cap('LOCALES Y SERVICIOS'), part('CASETA'), cap('PROTECCIONES INDIVIDUALES'), part('CASCO')];
let o = run('_capitolsAmbSubcapitols', filas3, src3, true);
check('B1) tres nivells (castellà): el capítol de dalt passa a zona i els subcapítols queden com a capítols', forma(o.rows) === 'cap:REVESTIMIENTOS | part:ENLUCIDO | sec:SEGURIDAD Y SALUD | cap:LOCALES Y SERVICIOS | part:CASETA | cap:PROTECCIONES INDIVIDUALES | part:CASCO', forma(o.rows));
check('B2) ho diu amb un avís i no toca cap partida', o.av.length === 1 && o.rows.filter(r => r.tipo === 'part').every((r, i) => r.desc === filas3.filter(x => x.tipo === 'part')[i].desc && r.amid === 5), J(o.av));
const srcCa = src3.replace(/CAPÍTULO/g, 'CAPÍTOL').replace('SEGURIDAD Y SALUD', 'SEGURETAT I SALUT');
o = run('_capitolsAmbSubcapitols', [cap('SEGURETAT I SALUT'), cap('LOCALS I SERVEIS'), part('CASETA')], srcCa.replace('Locales y servicios', 'Locals i serveis').replace('Locales y servicios', 'Locals i serveis'), false);
check('B3) el mateix en català', forma(o.rows) === 'sec:SEGURETAT I SALUT | cap:LOCALS I SERVEIS | part:CASETA', forma(o.rows));
const src2 = ['CAPÍTULO 1 : DEMOLICIONES', '1.1 m2 Picado', 'CAPÍTULO 2 : PINTURAS', '2.1 m2 Pintura'].join('\n');
o = run('_capitolsAmbSubcapitols', [cap('DEMOLICIONES'), part('PICADO'), cap('PINTURAS'), part('PINTURA')], src2, true);
check('N6) un document de dos nivells (cap subcapítol) no es toca', forma(o.rows) === 'cap:DEMOLICIONES | part:PICADO | cap:PINTURAS | part:PINTURA' && o.av.length === 0, forma(o.rows));
o = run('_capitolsAmbSubcapitols', [sec('SEGURIDAD Y SALUD'), cap('LOCALES Y SERVICIOS'), part('CASETA')], src3, true);
check('N7) si la pantalla ja porta aquella zona no es duplica ni es toca', forma(o.rows) === 'sec:SEGURIDAD Y SALUD | cap:LOCALES Y SERVICIOS | part:CASETA', forma(o.rows));
o = run('_capitolsAmbSubcapitols', [cap('SEGURIDAD Y SALUD'), part('CASETA GENERAL'), cap('LOCALES Y SERVICIOS'), part('CASETA')], src3, true);
check('N8) un capítol amb partides pròpies (no va just davant d\'un subcapítol) es queda com és', forma(o.rows) === 'cap:SEGURIDAD Y SALUD | part:CASETA GENERAL | cap:LOCALES Y SERVICIOS | part:CASETA', forma(o.rows));

const srcT = ['5 Ram de paleta', '5.1.1 Ut Impermeabilitzacio', 'Total subcapítol 5.1.- Coberta: 18.280,33', '5.2.1 Ut Revestiment', 'Total subcapítol 5.2.- Revestiments: 749,96', '5.3.1 M Aillament', 'Total subcapítol 5.3.- Aillaments: 126,16', '6 Alumini'].join('\n');
const filasT = [cap('5 Ram de paleta'), part('IMPERMEABILITZACIO'), part('COBERTA\n- Coberta: 18.280,33 5 Ram de paleta', 0), part('REVESTIMENT'), part('Revestiments: 749,96', 0), part('AILLAMENT'), cap('6 Alumini'), part('FINESTRA')];
o = run('_subcapitolsPelTotal', filasT, srcT, false);
check('C1) subcapítols que el document només marca pel total: zona, cada subcapítol davant de les seves partides, l\'últim sense fila de total també, i les files de total desapareixen', forma(o.rows) === 'sec:5 Ram de paleta | cap:COBERTA | part:IMPERMEABILITZACIO | cap:REVESTIMENTS | part:REVESTIMENT | cap:AILLAMENTS | part:AILLAMENT | sec:6 Alumini | cap:6 Alumini | part:FINESTRA', forma(o.rows));
check('C2) cap partida de debò canvia de text ni de quantitat, i ho diu amb un avís', o.rows.filter(r => r.tipo === 'part').map(r => r.desc + '#' + r.amid).join('|') === 'IMPERMEABILITZACIO#5|REVESTIMENT#5|AILLAMENT#5|FINESTRA#5' && o.av.length === 1, J(o.rows.filter(r => r.tipo === 'part').map(r => r.desc)));
const srcTes = srcT.replace(/Total subcapítol/g, 'Total subcapítulo').replace('Ram de paleta', 'Ramo de albañilería');
o = run('_subcapitolsPelTotal', filasT.map(r => r.tipo === 'cap' ? { tipo: 'cap', desc: r.desc.replace('Ram de paleta', 'Ramo de albañilería') } : r), srcTes, true);
check('C3) el mateix en castellà (Total subcapítulo)', /^sec:5 Ramo de albañilería \| cap:COBERTA \| part:IMPERMEABILITZACIO \| cap:REVESTIMENTS/.test(forma(o.rows)), forma(o.rows));
o = run('_subcapitolsPelTotal', [cap('5 Ram de paleta'), part('IMPERMEABILITZACIO'), part('Coberta: 18.280,33', 12), part('REVESTIMENT'), part('Revestiments: 749,96', 0)], srcT, false);
check('N9) una partida de debò amb quantitat que s\'assembla a un total NO és el final d\'un subcapítol', !o.rows.some(r => r.tipo === 'cap' && r.desc === 'COBERTA'), forma(o.rows));
o = run('_subcapitolsPelTotal', [cap('5 Ram de paleta'), part('IMPERMEABILITZACIO'), part('REVESTIMENT')], srcT, false);
check('N10) un document amb els totals però sense cap fila de total a la lectura no es toca', forma(o.rows) === 'cap:5 Ram de paleta | part:IMPERMEABILITZACIO | part:REVESTIMENT', forma(o.rows));
o = run('_subcapitolsPelTotal', [sec('ZONA A'), cap('5 Ram de paleta'), part('IMPERMEABILITZACIO'), part('Coberta: 18.280,33', 0), part('REVESTIMENT'), part('Revestiments: 749,96', 0)], srcT, false);
check('N11) si la pantalla ja porta zones no es toca', forma(o.rows) === 'sec:ZONA A | cap:5 Ram de paleta | part:IMPERMEABILITZACIO | part:Coberta: 18.280,33 | part:REVESTIMENT | part:Revestiments: 749,96', forma(o.rows));
o = run('_subcapitolsPelTotal', [cap('9 Altre capítol'), part('X'), part('Coberta: 18.280,33', 0), part('Y')], srcT, false);
check('N12) un total que pertany a un altre capítol (número diferent) no es fa servir', forma(o.rows) === 'cap:9 Altre capítol | part:X | part:Coberta: 18.280,33 | part:Y', forma(o.rows));


console.log('\nD) la prova «quantitat · preu · import» és del DOCUMENT SENCER, no del tros (13/11/2026)');
try { R('_nDoc'); R('_documentAmbPreus'); R('marquesIngesta'); } catch (e) { }
const MOT_PATH = process.argv[3] || path.join(__dirname, '..', 'motor', 'n8n_ingesta_Fusionar.js');
let MOTH = ''; try { MOTH = fs.readFileSync(MOT_PATH, 'utf8'); } catch (e) { MOTH = ''; }
const eFm = n => { const a = MOTH.indexOf('function ' + n + '('); if (a < 0) return ''; let i = MOTH.indexOf('{', MOTH.indexOf(')', a)), d = 0; for (; i < MOTH.length; i++) { if (MOTH[i] === '{') d++; else if (MOTH[i] === '}') { d--; if (d === 0) return MOTH.slice(a, i + 1); } } return ''; };
let MQ = null; try { MQ = new Function([eFm('_nDoc'), eFm('liniaProducte'), eFm('_documentAmbPreus'), eFm('quantitatsProducte'), eFm('avisQuantitatsDubte'), 'let _DOC_PREUS_APP;', 'function assignaBlocs(rows){ return rows.map(function(r,i){ return i; }); }'].join('\n') + '\nreturn {quantitatsProducte, posa:function(v){ _DOC_PREUS_APP=v; }};')(); } catch (e) { MQ = null; }
const trosA = '01 ENDERROCS\n01.01 h Desmuntatge d\'instal·lació\nDesmuntatge i aplec.\n10,00 23,42 234,20\n01.02 m2 Enderroc d\'envà\nEnderroc d\'envà de totxana.\n5,00 12,00 60,00\nTOTAL CAPÍTOL 01 ENDERROCS ........ 294,20\n';
const trosB = '02 PAVIMENTS\n02.01 m2 Paviment de gres\nPaviment de gres porcelànic.\n8,00 20,00 160,00\n02.02 m2 Sòcol ceràmic\nSòcol ceràmic de 8 cm.\n6,00 15,00 90,00\n';
const docSencer = trosA + trosB;
const PARTS = [['01.01', 'Desmuntatge', 'h', 10, 234.2, '10,00 23,42'], ['01.02', 'Enderroc', 'm2', 5, 60, '5,00 12,00'], ['02.01', 'Paviment', 'm2', 8, 160, '8,00 20,00'], ['02.02', 'Sòcol', 'm2', 6, 90, '6,00 15,00']];
// quantitats que surten d'un tros: la lectura diu la quantitat bona (el primer factor) i el comptador del motor tanca amb l'import
const surt = (tros, flag) => { const rows = [], blocs = [], dub = []; PARTS.forEach(([cod, d, ut, q, imp, lin]) => { const ini = tros.indexOf(cod + ' '); if (ini < 0) return; const f = tros.indexOf('\n', tros.indexOf(lin)) + 1; rows.push({ tipo: 'part', num: '', desc: d, ut, amid: q, preu: 0 }); blocs.push({ codi: cod, ini, fiText: f, fi: f, total: imp }); dub.push({ num: cod, codi: cod, ia: q, doc: imp, motiu: 'xifra final' }); });
  const c = { dubtes: dub }; MQ.posa(flag); MQ.quantitatsProducte(c, rows, blocs, tros, false); return rows.map(r => r.amid); };
const bones = tros => PARTS.filter(([c]) => tros.indexOf(c + ' ') >= 0).map(x => x[3]);
check('D1) la funció de l\'app i la del motor que decideixen si el document és de preus són la mateixa, lletra per lletra', !!MOTH && !!ext('_documentAmbPreus') && !!ext('_nDoc') && ext('_documentAmbPreus').trim() === eFm('_documentAmbPreus').trim() && ext('_nDoc').trim() === eFm('_nDoc').trim());
try {
check('D2) la prova del document (TOTAL = suma dels imports) la dóna el document sencer i no el tros que no la porta', R('_documentAmbPreus')(docSencer) === true && R('_documentAmbPreus')(trosA) === true && R('_documentAmbPreus')(trosB) === false);
const flagApp = MQ ? R('_documentAmbPreus')(docSencer) : null;
if (!MQ) check('D3) el motor es pot carregar', false, MOT_PATH);
else {
  const sense = surt(trosB, undefined);
  check('D3) (la prova té dents) sense dir res, el tros que no porta la prova pren la quantitat bona per un factor: 8 → 160', J(sense) === J([160, 90]), J(sense));
  check('D4) l\'app diu que el document és de preus i el tros sense prova conserva les quantitats (8 i 6)', J(surt(trosB, flagApp)) === J([8, 6]), J(surt(trosB, flagApp)));
  const talls = { 'a la frontera del capítol': [trosA, trosB], 'dins del primer capítol': [trosA.slice(0, trosA.indexOf('01.02')), trosA.slice(trosA.indexOf('01.02')) + trosB], 'dins del segon': [trosA + trosB.slice(0, trosB.indexOf('02.02')), trosB.slice(trosB.indexOf('02.02'))] };
  for (const [nom, tr] of Object.entries(talls)) {
    check('D5) el mateix document tallat ' + nom + ': cada tros decideix igual i cap quantitat canvia (l\'app envia el resultat del document sencer)', tr.every(t => J(surt(t, flagApp)) === J(bones(t))), tr.map(t => J(surt(t, flagApp)) + '/' + J(bones(t))).join(' | '));
  }
  check('D6) (la prova té dents) sense la bandera del document, tallant el mateix document per llocs diferents, les quantitats SÍ canvien en algun tall', Object.values(talls).some(tr => tr.some(t => J(surt(t, undefined)) !== J(bones(t)))));
  check('D7) quan l\'app ha parlat (el document no és de preus), el tros no ho desfà encara que ell porti una prova: la palanca segueix el document', J(surt(trosA, false)) === J([234.2, 60]), J(surt(trosA, false)));
  const docMesures = '01 COBERTA\n01.13 m2 EXTRACCIÓ DE MALLA\nExtracció de malles.\n50,00 50,00 2500,00\n';
  check('D8) un document d\'amidaments sense cap prova de preus (50 × 50 = 2500) no és de preus: la bandera és falsa i la palanca segueix viva', R('_documentAmbPreus')(docMesures) === false);
}
check('D9) l\'app envia la bandera del document sencer a cada tros i no la porta si no la sap calcular', (() => { try { const f = R('marquesIngesta'); const a = f('f.pdf', false); a.docPreus(true); const b = f('f.pdf', false); b.docPreus(undefined); const c = f('f.pdf', false); c.docPreus(false); return a.marques().document_amb_preus === true && !('document_amb_preus' in b.marques()) && c.marques().document_amb_preus === false; } catch (e) { return false; } })());
check('D10) l\'app la calcula UNA vegada sobre el text sencer del document (no sobre un tros) i el motor la rep del cos de la crida', /_MARQUES_INGESTA\.docPreus\(_documentAmbPreus\(amidament\)\)/.test(H) && /document_amb_preus/.test(MOTH) && /typeof _DOC_PREUS_APP==='boolean'\?_DOC_PREUS_APP:_documentAmbPreus\(txt\)/.test(MOTH));
} catch (e) { check('D2-D10) la prova de preus del document es pot executar (l\'app i el motor la porten)', false, e.message); }

console.log('\nCablejat');
check('W1) els dos passos nous corren dins la cadena de lectura, protegits (si peten es veu)', /_capitolsAmbSubcapitols\(allRows,amidament,allAvisos/.test(H) && /_subcapitolsPelTotal\(allRows,amidament,allAvisos/.test(H) && /_pasFallat\("13\/11 capítols amb subcapítols"/.test(H) && /_pasFallat\("13\/11 subcapítols pel total"/.test(H));
check('W2) cap peça nova passa de 50 línies', ['_rxPeus', '_trauPeus', '_capitolsAmbSubcapitols', '_subcapitolsPelTotal'].every(n => ext(n).split('\n').length <= 50), ['_rxPeus', '_trauPeus', '_capitolsAmbSubcapitols', '_subcapitolsPelTotal'].map(n => n + ':' + ext(n).split('\n').length).join(' '));
check('W3) la versió de lectura és d\'avui o d\'abans, mai del futur', (() => { const m = /const LECTURA_VER="([^"]+)"/.exec(H); return !!m && /^2026-11-1[3-9]T\d\d:\d\dZ$/.test(m[1]) && m[1] >= '2026-11-13T15:00Z' && m[1] <= new Date().toISOString().slice(0, 16) + 'Z'; })());
console.log('\n' + ok + ' OK · ' + ko + ' en vermell'); process.exit(ko ? 1 : 0);
