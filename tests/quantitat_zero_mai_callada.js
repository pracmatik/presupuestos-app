#!/usr/bin/env node
'use strict';
/*
 * Guardià · 12/11/2026 (Z_ml) · UNA QUANTITAT A 0 MAI CALLADA, AMB LA XIFRA BONA DEL DOCUMENT, I LA XIFRA FORA DEL TÍTOL.
 * Documents inventats, català i castellà, cap dada de cap client (va també al repositori públic).
 * D'on ve: amidaments on la capçalera de cada partida acaba amb el seu total («1.01 m2 títol de la partida 24,50») i les línies de mesura porten dos
 * factors (unitats × llargada = parcial). L'app treia totes les línies «a × b = c» com si fossin el tancament «quantitat × preu = import»:
 *  1) una fila a 0 pel criteri de valorar en metre lineal deia una xifra equivocada (només sumava les línies de tres factors);
 *  2) una fila a 0 amb una altra marca (preu compost) no deia res de la quantitat: un 0 callat;
 *  3) el total es quedava enganxat al títol quan la fila era a 0 o quan el títol acabava en un número propi («… TUB DE 110 13,20»).
 * Què vigila: el total surt de les línies amb prova (total imprès, capçalera que les línies sumen, suma amb tancament de debò); si hi ha
 * xifres i no es poden sumar amb prova es diu sense xifra; mai es canvia la quantitat; el preu no es pren per total; el número que és
 * del nom es queda; cada peça trencada es veu.
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
  while (cua.length) { const n = cua.pop(); if (dins.has(n) || !M.has(n)) continue; dins.add(n); (M.get(n).s.match(/(?<![\w$])_[\w$]+/g) || []).forEach(x => { if (M.has(x) && !dins.has(x)) cua.push(x); }); }   // les peces de l'app que fan servir comencen per «_»
  const src = [...dins].map(n => M.get(n)).sort((a, b) => a.i - b.i).map(x => x.s).join('\n');
  const falta = volgudes.filter(n => !M.has(n));
  try { return new Function('window', 'IDIOMA', src + '\nreturn {' + volgudes.filter(n => M.has(n)).map(n => n + ':' + n).join(',') + '};')({ _lrLinies: true }, 'ca'); }
  catch (e) { return { _error: e.message, _falta: falta }; }
}
const VOL = ['p4QuantitatZeroLinies', 'quantitatForaDelTitol'];
// ── documents inventats ──
const T = {
  ca: { pend: 'PENDENT — passar a ml (criteri GTA)', comp: 'PREU COMPOST — revisar components', porta: 'el document porta ', sumen: 'sumen ', imprimeixen: 'imprimeixen el total ', xifres: 'porten xifres', rev: 'QUANTITAT A REVISAR', noescrita: 'quantitat no escrita',
    doc: ['1 TREBALLS DE PATI', '1.01 m2 Pintat de barana del pati 24,50', 'Pintat amb dues capes d\'esmalt sobre suport net.', 'PATI A 2,00 5,00 10,00', 'PATI B 1,00 2,00 3,50 7,00', 'PATI C 1,00 7,50 7,50',
      '1.02 ut Substitució de tapa de registre 3,00', 'Tapa nova de fosa col·locada.', 'PATI A 1,00 3,00 3,00',
      '1.03 m2 Reparació de minvell amb morter 8,40', 'Repicat i reposició del minvell.', 'COBERTA 1,00 8,40 8,40',
      '1.04 ml Col·locació de tub de 110 13,20', 'Tub de PVC amb accessoris.', 'COBERTA 2,00 6,60 13,20',
      '1.05 m2 Neteja de parament vertical 30,00', 'Neteja amb aigua a pressió.', 'FAÇANA 3,00 10,00 30,00',
      '1.06 m2 Impermeabilització de terrat tipus B 140,00', 'Membrana líquida en dues capes.', 'TERRAT 1 1,00 65,00', 'TERRAT 2 1,00 75,00',
      '1.07 ut Alarma de bastida 1,00', 'Alarma connectada a central.'],
    tit: ['Pintat de barana del pati', 'Substitució de tapa de registre', 'Reparació de minvell amb morter', 'Col·locació de tub de 110', 'Neteja de parament vertical', 'Impermeabilització de terrat tipus B', 'Alarma de bastida'] },
  es: { pend: 'PENDIENTE — pasar a ml (criterio GTA)', comp: 'PRECIO COMPUESTO — revisar componentes', porta: 'el documento trae ', sumen: 'suman ', imprimeixen: 'imprimen el total ', xifres: 'llevan cifras', rev: 'CANTIDAD A REVISAR', noescrita: 'cantidad no escrita',
    doc: ['1 TRABAJOS DE PATIO', '1.01 m2 Pintado de barandilla del patio 24,50', 'Pintado con dos capas de esmalte sobre soporte limpio.', 'PATIO A 2,00 5,00 10,00', 'PATIO B 1,00 2,00 3,50 7,00', 'PATIO C 1,00 7,50 7,50',
      '1.02 ud Sustitución de tapa de registro 3,00', 'Tapa nueva de fundición colocada.', 'PATIO A 1,00 3,00 3,00',
      '1.03 m2 Reparación de mimbel con mortero 8,40', 'Picado y reposición del mimbel.', 'CUBIERTA 1,00 8,40 8,40',
      '1.04 ml Colocación de tubo de 110 13,20', 'Tubo de PVC con accesorios.', 'CUBIERTA 2,00 6,60 13,20',
      '1.05 m2 Limpieza de paramento vertical 30,00', 'Limpieza con agua a presión.', 'FACHADA 3,00 10,00 30,00',
      '1.06 m2 Impermeabilización de terrado tipo B 140,00', 'Membrana líquida en dos capas.', 'TERRADO 1 1,00 65,00', 'TERRADO 2 1,00 75,00',
      '1.07 ud Alarma de andamio 1,00', 'Alarma conectada a central.'],
    tit: ['Pintado de barandilla del patio', 'Sustitución de tapa de registro', 'Reparación de mimbel con mortero', 'Colocación de tubo de 110', 'Limpieza de paramento vertical', 'Impermeabilización de terrado tipo B', 'Alarma de andamio'] },
};
const INI = [1, 6, 9, 12, 15, 18, 22], FI = [5, 8, 11, 14, 17, 21, 23], TOT = ['24,50', '3,00', '8,40', '13,20', '30,00', '140,00', '1,00'], UT = ['m2', 'ut', 'm2', 'ml', 'm2', 'm2', 'ut'];
// les files com les deixa la lectura per línies: el títol porta el total de la capçalera al final
const files = (id, amids, flags) => T[id].tit.map((t, k) => ({ tipo: 'part', num: '', desc: t + ' ' + TOT[k] + '\n- text de la partida', ut: UT[k], amid: amids[k], preu: 0, flag: (flags || {})[k] || null, lrIni: INI[k], lrFi: FI[k] }));
const tit = r => String(r.desc).split('\n')[0];

function prova(H, etiqueta, esperaVerd) {
  const A = carrega(H, VOL), res = [];
  const c = (n, cond, x) => res.push([n, !!cond, x]);
  if (A._error || !A.p4QuantitatZeroLinies || !A.quantitatForaDelTitol) { c('les funcions de l\'app es carreguen', false, A._error || 'falta alguna funció'); return res; }
  for (const id of ['ca', 'es']) { const t = T[id], ES = id === 'es', src = t.doc.join('\n'), L = '[' + id + '] ';
    // A) fila a 0 pel criteri de metre lineal: la xifra és el total del document, no la suma d'unes quantes línies
    { const rows = files(id, [0, 3, 8.4, 13.2, 30, 140, 1], { 0: t.pend }), av = []; A.p4QuantitatZeroLinies(rows, src, av, ES);
      c(L + 'criteri ml: la marca porta el total del document (24,5) i no 7', String(rows[0].flag).indexOf(t.porta + '24,5 m2') >= 0 && !/ 7 m2/.test(String(rows[0].flag)), rows[0].flag);
      c(L + 'criteri ml: la quantitat no es toca i l\'avís ho diu amb la xifra', rows[0].amid === 0 && av.some(x => /24,5 m2/.test(x) && !/24,50/.test(x)), av.join(' | '));
      A.quantitatForaDelTitol(rows, src);
      c(L + 'criteri ml: el total surt del títol (ja és a la marca)', tit(rows[0]) === t.tit[0], tit(rows[0]));
      c(L + 'les altres files no canvien de quantitat ni reben cap marca', rows.slice(1).every((r, k) => r.amid === [3, 8.4, 13.2, 30, 140, 1][k] && !r.flag)); }
    // B) fila a 0 amb una altra marca: mai callada, en vermell amb la xifra, sense tocar la quantitat
    { const rows = files(id, [24.5, 3, 0, 13.2, 30, 140, 1], { 2: t.comp }), av = []; const n = A.p4QuantitatZeroLinies(rows, src, av, ES);
      c(L + 'un 0 amb una altra marca: «a revisar» amb la xifra del document (8,4)', n === 1 && String(rows[2].flag).indexOf(t.rev) >= 0 && String(rows[2].flag).indexOf(t.sumen + '8,4') >= 0 && String(rows[2].flag).indexOf(t.comp) === 0, rows[2].flag);
      c(L + 'un 0 amb una altra marca: avís vermell i quantitat intacta', rows[2].amid === 0 && av.some(x => /^⚠⚠/.test(x) && /8,4/.test(x)), av.join(' | '));
      const f1 = rows[2].flag; A.p4QuantitatZeroLinies(rows, src, av, ES); c(L + 'passar-hi dues vegades no repeteix la marca', rows[2].flag === f1);
      A.quantitatForaDelTitol(rows, src); c(L + 'un 0 amb una altra marca: el total surt del títol', tit(rows[2]) === t.tit[2], tit(rows[2])); }
    // C) una sola línia de dos factors (unitats × llargada = parcial) i capçalera amb total: 3, no callat
    { const rows = files(id, [24.5, 0, 8.4, 13.2, 30, 140, 1], { 1: t.pend }), av = []; A.p4QuantitatZeroLinies(rows, src, av, ES);
      c(L + 'una sola línia de dos factors: la marca porta 3', String(rows[1].flag).indexOf(t.porta + '3 ' + UT[1]) >= 0, rows[1].flag); }
    // D) capçalera amb total i cap línia de mesura: «imprimeixen el total 1»
    { const rows = files(id, [24.5, 3, 8.4, 13.2, 30, 140, 0], { 6: t.comp }), av = []; A.p4QuantitatZeroLinies(rows, src, av, ES);
      c(L + 'sense línies de mesura, el total de la capçalera (1)', String(rows[6].flag).indexOf(t.imprimeixen + '1') >= 0, rows[6].flag); }
    // E) el títol que acaba en un número propi: el document prova que el darrer és la quantitat
    { const rows = files(id, [24.5, 3, 8.4, 13.2, 30, 140, 1]); A.quantitatForaDelTitol(rows, src);
      c(L + '«… DE 110 13,20»: les línies sumen 13,20 → surt només la quantitat', tit(rows[3]) === t.tit[3], tit(rows[3]));
      c(L + '«… B 140,00»: tot el document acaba la capçalera amb la quantitat → surt', tit(rows[5]) === t.tit[5], tit(rows[5]));
      c(L + 'els títols normals, com sempre', tit(rows[0]) === t.tit[0] && tit(rows[4]) === t.tit[4]);
      const r2 = files(id, [24.5, 3, 8.4, 13.2, 30, 140, 1]); A.quantitatForaDelTitol(r2);
      c(L + 'ADVERSARI · sense el document, el número darrere d\'un nom es queda (com abans)', tit(r2[3]) === t.tit[3] + ' 13,20' && tit(r2[5]) === t.tit[5] + ' 140,00', tit(r2[3]) + ' | ' + tit(r2[5]));
      const r3 = files(id, [24.5, 3, 8.4, 13.2, 30, 99, 1]); A.quantitatForaDelTitol(r3, src);
      c(L + 'ADVERSARI · un número que no és la quantitat de la fila es queda', tit(r3[5]) === t.tit[5] + ' 140,00', tit(r3[5]));
      const r4 = files(id, [24.5, 3, 8.4, 13.2, 30, 140, 0]); A.quantitatForaDelTitol(r4, src);
      c(L + 'ADVERSARI · una fila a 0 sense cap marca amb la xifra: el número es queda al títol (és l\'únic rastre)', tit(r4[6]) === t.tit[6] + ' 1,00', tit(r4[6])); }
    // F) sense total a la capçalera
    { const doc = ['2 ' + (ES ? 'CUBIERTA' : 'COBERTA'), '2.01 m2 ' + t.tit[2], ES ? 'Texto de la partida.' : 'Text de la partida.', 'A 2,00 5,00 10,00', 'B 1,00 4,00 4,00',
        '2.02 m2 ' + t.tit[4], ES ? 'Texto de la partida.' : 'Text de la partida.', 'A 10,00', 'B 5,00', '15,00 12,00 180,00',
        '2.03 m2 ' + t.tit[0], ES ? 'Texto de la partida.' : 'Text de la partida.', 'A 1,00 2,00 3,50 7,00', 'B 1,00 2,00 1,50 3,00'];
      const mk = (fl) => [{ tipo: 'part', desc: t.tit[2] + '\n- text', ut: 'm2', amid: 0, preu: 0, flag: fl[0], lrIni: 1, lrFi: 4 }, { tipo: 'part', desc: t.tit[4] + '\n- text', ut: 'm2', amid: 0, preu: 0, flag: fl[1], lrIni: 5, lrFi: 9 }, { tipo: 'part', desc: t.tit[0] + '\n- text', ut: 'm2', amid: 0, preu: 0, flag: fl[2], lrIni: 10, lrFi: 13 }];
      const rows = mk([t.comp, t.comp, t.comp]), av = []; A.p4QuantitatZeroLinies(rows, doc.join('\n'), av, ES);
      c(L + 'línies «a × b = c» sense total a la capçalera: marca sense xifra (mai una xifra dubtosa, mai callat)', String(rows[0].flag).indexOf(t.rev) >= 0 && String(rows[0].flag).indexOf(t.xifres) >= 0 && !/14|10|4,/.test(String(rows[0].flag).split(' · ').pop()), rows[0].flag);
      c(L + 'el tancament de debò (15 × 12 = 180) no és una línia de mesura: sumen 15', String(rows[1].flag).indexOf(t.sumen + '15 ') >= 0, rows[1].flag);
      c(L + 'línies de tres factors sense total: sumen 10', String(rows[2].flag).indexOf(t.sumen + '10 ') >= 0, rows[2].flag);
      c(L + 'els avisos ho diuen (un amb xifra, un sense)', av.filter(x => /^⚠⚠/.test(x)).length === 2, av.join(' | '));
      const r2 = mk([t.noescrita, null, null]); A.p4QuantitatZeroLinies(r2, doc.join('\n'), [], ES);
      c(L + 'ADVERSARI · la fila que ja diu que la quantitat no és escrita no rep una segona marca', r2[0].flag === t.noescrita, r2[0].flag); }
    // G) el preu no es pren per total; el número del nom tampoc
    { const doc = ['3 ' + (ES ? 'VARIOS' : 'DIVERSOS'), '3.01 m2 ' + t.tit[4] + ' 12,35', 'A 0,15 22,00 3,30', 'B 0,25 36,20 9,05', '3.02 ml ' + (ES ? 'Tubería de saneamiento DN 63,00' : 'Canonada de sanejament DN 63,00'), ES ? 'Texto.' : 'Text.'];
      const rows = [{ tipo: 'part', desc: t.tit[4] + ' 12,35\n- text', ut: 'm2', amid: 0, preu: 12.35, flag: t.comp, lrIni: 1, lrFi: 3 }, { tipo: 'part', desc: (ES ? 'Tubería de saneamiento DN 63,00' : 'Canonada de sanejament DN 63,00') + '\n- text', ut: 'ml', amid: 0, preu: 0, flag: t.comp, lrIni: 4, lrFi: 5 }];
      A.p4QuantitatZeroLinies(rows, doc.join('\n'), [], ES);
      c(L + 'ADVERSARI · la capçalera acaba amb el PREU de la fila: no es diu que el document porta 12,35', !/12,35/.test(String(rows[0].flag)), rows[0].flag);
      c(L + 'ADVERSARI · «… DN 63,00» sense línies: el número és del nom, no es pren per total', !/63/.test(String(rows[1].flag)), rows[1].flag); }
    // G2) un document curt (poques capçaleres): que la capçalera acabi amb la quantitat no és prova de res
    { const nom = ES ? 'Chapa plegada tipo C 12,50' : 'Xapa plegada tipus C 12,50';
      const doc = ['4 ' + (ES ? 'VARIOS' : 'DIVERSOS'), '4.01 m2 ' + nom, ES ? 'Texto.' : 'Text.', '4.02 m2 ' + t.tit[4] + ' 30,00', 'A 3,00 10,00 30,00'];
      const rows = [{ tipo: 'part', desc: nom + '\n- text', ut: 'm2', amid: 12.5, preu: 0, flag: null, lrIni: 1, lrFi: 2 }, { tipo: 'part', desc: t.tit[4] + ' 30,00\n- text', ut: 'm2', amid: 30, preu: 0, flag: null, lrIni: 3, lrFi: 4 }];
      A.quantitatForaDelTitol(rows, doc.join('\n'));
      c(L + 'ADVERSARI · document curt i «… C 12,50» sense línies que ho provin: el número es queda al títol', tit(rows[0]) === nom && tit(rows[1]) === t.tit[4], tit(rows[0]) + ' | ' + tit(rows[1])); }
    // I) un 0 de debò («0,00 × preu = 0,00») seguit del total del capítol: el que ve després ja no és d'aquesta partida → cap marca
    { const doc = ['5 ' + (ES ? 'INSTALACIONES' : 'INSTAL·LACIONS'), '5.01 ut ' + (ES ? 'Conector de cable coaxial' : 'Connector de cable coaxial'), ES ? 'Texto.' : 'Text.', '0,00 37,00 0,00', 'TOTAL 5.01.................... 0,00',
        '5.02 ' + (ES ? 'CUADRO GENERAL' : 'QUADRE GENERAL'), ES ? 'Texto del cuadro.' : 'Text del quadre.', '1,00 815,00 815,00'];
      const rows = [{ tipo: 'part', desc: (ES ? 'Conector de cable coaxial' : 'Connector de cable coaxial') + '\n- text', ut: 'ut', amid: 0, preu: 0, flag: null, lrIni: 1, lrFi: 7 }], av = [];
      const n = A.p4QuantitatZeroLinies(rows, doc.join('\n'), av, ES);
      c(L + 'ADVERSARI · un 0 que el document escriu («0,00 × 37,00 = 0,00») i després el total del capítol: cap marca ni avís', n === 0 && !rows[0].flag && !av.length, rows[0].flag + ' | ' + av.join(' | ')); }
    // J) el tancament «1,00 × preu = import» i després els totals d'apartat: mai la suma dels totals de més amunt
    { const nom = ES ? 'Cuadro de protección de servicios' : 'Quadre de protecció de serveis';
      const doc = ['6 ' + (ES ? 'ELECTRICIDAD' : 'ELECTRICITAT'), '6.01 ut ' + nom, ES ? 'Texto.' : 'Text.', '1,00 489,87 489,87', (ES ? 'TOTAL SUBAPARTADO 6.01 CUADROS ' : 'TOTAL SUBAPARTAT 6.01 QUADRES ') + '489,87', (ES ? 'TOTAL APARTADO 6 PROTECCIÓN ' : 'TOTAL APARTAT 6 PROTECCIÓ ') + '489,87'];
      const rows = [{ tipo: 'part', desc: nom + '\n- text', ut: 'ut', amid: 0, preu: 0, flag: null, lrIni: 1, lrFi: 5 }], av = [];
      A.p4QuantitatZeroLinies(rows, doc.join('\n'), av, ES);
      c(L + 'un 0 amb el tancament «1,00 × 489,87» i totals d\'apartat: marca sense xifra, mai 979,74', String(rows[0].flag).indexOf(t.rev) >= 0 && String(rows[0].flag).indexOf(t.xifres) >= 0 && !/979|489/.test(String(rows[0].flag) + av.join(' ')), rows[0].flag); }
    // K) la darrera línia és només una xifra i suma les de dalt: és el subtotal imprès
    { const nom = ES ? 'Entibación de zanja con paneles' : 'Estrebada de rasa amb panells';
      const doc = ['7 ' + (ES ? 'ZANJAS' : 'RASES'), '7.01 m ' + nom, ES ? 'Según anexo' : 'Segons annex', (ES ? 'Eje A' : 'Eix A') + ' 1 27,73 27,73', '_______________________', '27,73',
        '7.02 m ' + t.tit[4], ES ? 'Texto.' : 'Text.', 'A 5,00', 'B 5,00'];
      const rows = [{ tipo: 'part', desc: nom + '\n- text', ut: 'm', amid: 0, preu: 0, flag: t.comp, lrIni: 1, lrFi: 5 }, { tipo: 'part', desc: t.tit[4] + '\n- text', ut: 'm', amid: 0, preu: 0, flag: t.comp, lrIni: 6, lrFi: 9 }];
      A.p4QuantitatZeroLinies(rows, doc.join('\n'), [], ES);
      c(L + 'una línia «1 × 27,73 = 27,73» i a sota el subtotal sol: sumen 27,73', String(rows[0].flag).indexOf(t.sumen + '27,73') >= 0, rows[0].flag);
      c(L + 'ADVERSARI · dues línies amb etiqueta i la mateixa xifra no són línia i subtotal: sumen 10', String(rows[1].flag).indexOf(t.sumen + '10 ') >= 0, rows[1].flag); }
  }
  // H) la lectura crida la regla del títol amb el document
  c('la lectura passa el document a la regla del títol', /majusculesTitols\(allRows\);\s*try\{ quantitatForaDelTitol\(allRows,amidament\); \}catch/.test(H));
  if (esperaVerd === null) return res;
  return res;
}

console.log('── UNA QUANTITAT A 0 MAI CALLADA (' + path.basename(HTML) + ') ──');
prova(H0).forEach(([n, c, x]) => check(n, c, x));

// ── cada peça trencada es veu (només si l'app ja porta el canvi) ──
if (ko === 0) {
  const PECES = [
    ['el total de la capçalera que les línies sumen', 'if(tOk&&ms.every(ok)&&_sgSuma(ms,T).ok) return {v:T.v,sum:true};', ''],
    ['la marca sense xifra', 'if(tl&&tl.xifres&&_p4ZeroAmbXifres(r,ES)){ n++; dub.push(nomF(r)); }', ''],
    ['només és tancament la línia que porta la suma de les de dalt', '(_sgSuma(ant,t.a).ok||_sgSuma(ant,t.b).ok)', 'true'],
    ['el preu no és el total', '&&!(+r.preu>0&&Math.abs(+r.preu-T.v)<0.005)', ''],
    ['el número del nom no és el total', 'tOk&&!_p4CapDelNom(D.L[c.a])?', 'tOk?'],
    ['la xifra apuntada per treure-la del títol', 'Object.defineProperty(r,"_p4Tot",{value:tot.v,enumerable:false,configurable:true});', ''],
    ['el document prova que el número és la quantitat', '&&!_qftDocHoDiu(r,v,rows,src,cau)', ''],
    ['la prova de tot el document demana 5 capçaleres', 'cau.fmt=k>=5&&k>=0.8*t;', 'cau.fmt=true;'],
    ['el tros s\'acaba al total del capítol', 'if(_SG_CTOT.test(D.L[k])||_P4_TALL.test(D.L[k])){ fi=k; break; }', ';'],
    ['el subtotal sol que suma les de dalt', '&&_sgSuma(dalt,u.ns[0]).ok) return {v:u.ns[0].v,sum:true};', '&&false) return null;'],
    ['el subtotal és una línia amb només la xifra', 'pur(u)&&dalt.some(x=>!pur(x))&&', ''],
    ['la lectura passa el document', 'quantitatForaDelTitol(allRows,amidament);', 'quantitatForaDelTitol(allRows);'],
  ];
  PECES.forEach(([nom, de, a]) => { const Hx = trenca(H0, de, a); if (!Hx) { check('peça trencada «' + nom + '»: el tros hi és', false, 'no trobat: ' + de.slice(0, 60)); return; }
    const r = prova(Hx); check('peça trencada «' + nom + '» → es veu', r.some(x => !x[1]), 'cap comprovació ha fallat'); });
}
console.log('\n' + (ko ? 'X ' + ko + ' FALLEN' : 'OK') + ' · ' + ok + ' comprovacions en verd' + (ko ? ', ' + ko + ' en vermell' : ''));
process.exit(ko ? 1 : 0);
