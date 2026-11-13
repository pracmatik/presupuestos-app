#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 31 (22/10/2026) · C-123: LA NUMERACIÓ DE LES PARTIDES ÉS EL CODI QUE EL DOCUMENT LI DÓNA.
 * Documents inventats, castellà i català, cap dada de cap client (va també al repositori públic).
 *  1) Un document que porta codi a cada partida (codi + unitat + títol, codi + títol, columnes, Presto amb «OPCIONAL n»): cada partida porta el seu codi, en ordre;
 *     zeros del davant fora (01.02 → 1.2), punts de més fora (6..02 → 6.2), punt final fora (1.1.- → 1.1).
 *  2) C-112: l'amortització de la bastida que afegeix el programa no gasta cap codi: penja de la seva bastida (codi + «.2») i la partida següent conserva el seu.
 *  3) Tot o res: si una sola partida no es pot aparellar amb el seu codi, es queda la numeració 1.1, 1.2… del programa a tot el pressupost i es diu per què;
 *     un document sense cap codi no canvia res ni diu res.
 *  4) El codi només va a la fila que en té el TÍTOL: dues partides que només es distingeixen pel final del títol («… (9)», «… (10)») i una línia de referència dins
 *     d'una partida («4.1.- Ensayos … y las condiciones generales») no poden prendre el codi d'una altra.
 *  5) L'Excel i els llistats ja porten el codi a la fila (codiDoc): es fa servir directament, i no queda a cap fila.
 *  6) CSV de la intranet: només s'hi posa el codi del document en un capítol si té la forma que la intranet ha acceptat sempre («capítol.n», tots diferents);
 *     si no (111, D101, repetits), aquest capítol surt 1.1, 1.2… i es diu. El fitxer sempre passa el candau de la intranet.
 *  7) Cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.replace(de, a); return s === src ? null : s; };

function extreu(H, name) {
  const pats = [new RegExp('function\\s+' + name + '\\s*\\('), new RegExp('const\\s+' + name + '\\s*=')];
  for (const pat of pats) { const m = pat.exec(H); if (!m) continue; const bs = H.indexOf('{', m.index); if (bs < 0) continue;
    let d = 0, i = bs; for (; i < H.length; i++) { const ch = H[i]; if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) { i++; break; } } }
    if (pat === pats[1] && H[i] === ';') i++; return H.slice(m.index, i); }
  throw new Error('funció no trobada: ' + name);
}
const motor = H => { try {
  const b = H.match(/\/\/ ==== INICI EINES DE LECTURA ====([\s\S]*?)\/\/ ==== FI EINES DE LECTURA ====/)[1];
  const fora = ['capNumOf', 'renumberRows'].map(n => extreu(H, n)).join('\n');
  return new Function('IDIOMA', fora + '\n' + b + '\nreturn {desde:(typeof renumberDes==="function"?renumberDes:null), codis:(typeof codisDelDocument==="function"?codisDelDocument:null), norm:(typeof _normCodiDoc==="function"?_normCodiDoc:null), ren:renumberRows, forma:formaDePartides};')('es'); } catch (e) { console.error(String(e.stack || e).slice(0, 400)); return null; } };
const csvMotor = H => { try {
  const NOMS = ['num2', 'subsOf', 'unitPrice', 'isNoSuma', 'isSenseCoef', 'rowGross', 'pctBase', 'pctBaseAt', 'comma', 'csvUnit', 'sanitizeRows', 'csvBuildLines', 'csvIntranetCheck'];
  const sb = { console, isFinite, Math, parseFloat, Number, String, Array, Object, Set, Map, window: {}, IDIOMA: 'es' }; vm.createContext(sb);
  new vm.Script(NOMS.map(n => extreu(H, n)).join('\n'), { filename: 'csv31.js' }).runInContext(sb); return sb; } catch (e) { console.error(String(e.stack || e).slice(0, 400)); return null; } };

// ── documents inventats ──
const part = (d, extra) => Object.assign({ tipo: 'part', num: '', desc: d + '\n- text de la partida', ut: 'm²', amid: 10, preu: 5 }, extra || {});
const T_UT = [  // codi + unitat + títol, sense punts (Presto), amb «OPCIONAL n»
  'CAPÍTOL 1 FAÇANA', '111 m2 BASTIDA TUBULAR.', 'Muntatge i desmuntatge de bastida tubular.', 'Amidament i pressupost Total 111 100,00 0,00 €',
  '112 ml REPICAT DE VOLADISSOS.', 'Repicat de la vora.', 'Amidament i pressupost Total 112 30,00 0,00 €',
  '113 m2 PINTURA DE PARAMENTS.', 'Pintura plàstica.', 'Amidament i pressupost Total 113 80,00 0,00 €',
  '114 OPCIONAL 1 m2 NOVA CLARABOIA DEL PATI.', 'Claraboia de policarbonat.', 'Amidament i pressupost Total 114 OPCIONAL 1 12,00 0,00 €'].join('\n');
const R_UT = () => [{ tipo: 'sec', desc: 'FAÇANA' }, { tipo: 'cap', desc: 'FAÇANA PRINCIPAL' }, part('BASTIDA TUBULAR.'), { tipo: 'part', num: '', desc: 'AMORTITZACIÓ DE BASTIDA TUBULAR', ut: 'mes', amid: 0, preu: 0, origen: 'auto' },
  part('REPICAT DE VOLADISSOS.'), part('PINTURA DE PARAMENTS.'), part('NOVA CLARABOIA DEL PATI.')];
const T_ZERS = ['01.01 m2 Neteja de façana.', 'Neteja amb aigua.', 'Total partida 01.01 .......... 50,00', '01.02 ml Segellat de juntes.', 'Segellat flexible.', 'Total partida 01.02 .......... 20,00',
  '02.10 m2 Enfosc de morter.', 'Enfosc.', 'Total partida 02.10 .......... 40,00', '02.11 ud Retirada de baranes.', 'Retirada.', 'Total partida 02.11 .......... 4,00'].join('\n');
const R_ZERS = () => [{ tipo: 'cap', desc: '1 NETEJA' }, part('Neteja de façana.'), part('Segellat de juntes.'), { tipo: 'cap', desc: '2 ENFOSCATS' }, part('Enfosc de morter.'), part('Retirada de baranes.')];
const T_PUNTS = ['6..02 m2 Protecció de l\'obra.', 'Protecció.', 'Total 6..02 10,00', '6..03 m2 Neteja final de l\'obra.', 'Neteja.', 'Total 6..03 12,00', '6..04 m2 Retirada de runa a l\'abocador.', 'Retirada.', 'Total 6..04 8,00'].join('\n');
const R_PUNTS = () => [{ tipo: 'cap', desc: '6 FINAL' }, part('Protecció de l\'obra.'), part('Neteja final de l\'obra.'), part('Retirada de runa a l\'abocador.')];
const T_TIT = ['4.1.- Ensayos y control de calidad de materiales', 'Texto del ensayo.', 'Medición total 8,00', '4.2.- Limpieza de la zona de trabajo', 'Texto de limpieza.', 'Medición total 3,00',
  '4.1.- Ensayos y control de calidad de materiales y las condiciones generales.', '4.9.- Ensayos y control de calidad de materiales (9)', 'Texto.', 'Medición total 2,00',
  '4.10.- Ensayos y control de calidad de materiales (10)', 'Texto.', 'Medición total 1,00'].join('\n');
const R_TIT = () => [{ tipo: 'cap', desc: '4 CALIDAD' }, part('Ensayos y control de calidad de materiales'), part('Limpieza de la zona de trabajo'), part('Ensayos y control de calidad de materiales (9)'), part('Ensayos y control de calidad de materiales (10)')];
const T_BESS = ['IP701 m2 Ensayos y control de calidad de materiales', 'Texto.', 'Total IP701 1,00', 'IP702 m2 Ensayos y control de calidad de materiales EN ZONA NORTE', 'Texto.', 'Total IP702 2,00',
  'IP703 m2 Ensayos y control de calidad de materiales EN TERRAZA', 'Texto.', 'Total IP703 3,00', 'IP704 m2 Limpieza final de la obra', 'Texto.', 'Total IP704 4,00'].join('\n');
const R_BESS = () => [{ tipo: 'cap', desc: 'ENSAYOS' }, part('Ensayos y control de calidad de materiales'), part('Ensayos y control de calidad de materiales EN ZONA NORTE'), part('Ensayos y control de calidad de materiales EN TERRAZA'), part('Limpieza final de la obra')];
const T_DUP = ['IP701 m2 Ensayos de materiales', 'Texto.', 'Total IP701 1,00', 'IP702 m2 Ensayos de materiales', 'Texto.', 'Total IP702 2,00', 'IP703 m2 Limpieza de la obra', 'Texto.', 'Total IP703 3,00', 'IP704 m2 Pintura de fachada', 'Texto.', 'Total IP704 4,00'].join('\n');
const R_DUP_PERDUDA = () => [{ tipo: 'cap', desc: 'ENSAYOS' }, part('Ensayos de materiales'), part('Limpieza de la obra'), part('Pintura de fachada')];
const R_DUP_SENCERA = () => [{ tipo: 'cap', desc: 'ENSAYOS' }, part('Ensayos de materiales'), part('Ensayos de materiales'), part('Limpieza de la obra'), part('Pintura de fachada')];
const T_TAIL = ['7.3.- Ensayos y control de calidad de materiales A LA ESCALERA A', 'Texto.', 'Medición total 8,00', '7.9.- Ensayos y control de calidad de materiales (9)', 'Texto.', 'Medición total 2,00',
  '7.10.- Limpieza de la zona de trabajo', 'Texto.', 'Medición total 3,00', '7.11.- Pintura de fachada exterior', 'Texto.', 'Medición total 1,00'].join('\n');
const T_TAIL_SENSE9 = ['7.3.- Ensayos y control de calidad de materiales A LA ESCALERA A', 'Texto.', 'Medición total 8,00', '7.10.- Limpieza de la zona de trabajo', 'Texto.', 'Medición total 3,00', '7.11.- Pintura de fachada exterior', 'Texto.', 'Medición total 1,00'].join('\n');
const R_TAIL = () => [{ tipo: 'cap', desc: '7 CALIDAD' }, part('Ensayos y control de calidad de materiales (9)'), part('Limpieza de la zona de trabajo'), part('Pintura de fachada exterior')];
const R_BESS_SENSE_PRIMERA = () => [{ tipo: 'cap', desc: 'ENSAYOS' }, part('Ensayos y control de calidad de materiales EN ZONA NORTE'), part('Ensayos y control de calidad de materiales EN TERRAZA'), part('Limpieza final de la obra')];
const T_SENSE1 = ['01.01 m2 Neteja de façana.', 'Neteja.', 'Total partida 01.01 .......... 50,00', '01.02 ml Segellat de juntes.', 'Segellat.', 'Total partida 01.02 .......... 20,00',
  '01.03 m2 Pintura de façana.', 'Pintura.', 'Total partida 01.03 .......... 30,00', 'Treballs complementaris sense codi.', 'Total 4,00'].join('\n');
const R_SENSE1 = () => [{ tipo: 'cap', desc: '1 NETEJA' }, part('Neteja de façana.'), part('Segellat de juntes.'), part('Pintura de façana.'), part('Treballs complementaris sense codi.')];
const T_LLIURE = ['Es repararà la coberta amb teula nova.', 'Es neteja el pati.', 'Pintura de les baranes.', 'Substitució de vidres.'].join('\n');
const R_LLIURE = () => [{ tipo: 'cap', desc: '1 OBRA' }, part('Reparació de la coberta amb teula nova.'), part('Neteja del pati.'), part('Pintura de les baranes.'), part('Substitució de vidres.')];
const T_COL = ['  NUM.   CODI        UA    DESCRIPCIÓ', '  1      CQ01        1     Controls i anàlisis necessaris', '  2      SS01        1     Seguretat i salut en obra', '  3      MA02        2     Mitjans auxiliars de l\'obra', '  4      CAT-01      1     Cates en forjats'].join('\n');
const R_COL = () => [{ tipo: 'cap', desc: 'GENERAL' }, part('Controls i anàlisis necessaris'), part('Seguretat i salut en obra'), part('Mitjans auxiliars de l\'obra'), part('Cates en forjats')];

const T_COL1 = ['CAT-01          Cates en forjats', 'Text.', 'MA02            Mitjans auxiliars de l\'obra', 'Text.', 'SS01            Seguretat i salut en obra', 'Text.'].join('\n');
const R_COL1 = () => [{ tipo: 'cap', desc: 'GENERAL' }, part('Cates en forjats'), part('Mitjans auxiliars de l\'obra'), part('Seguretat i salut en obra')];
const nums = rs => rs.filter(r => r.tipo === 'part').map(r => r.num);
function prova(H, etiqueta) {
  const M = motor(H); if (!M || !M.codis) { check(etiqueta + ': l\'app porta codisDelDocument', false); return null; }
  const unaVegada = (rows, text, es) => { M.ren(rows); const av = []; const n = M.codis(rows, text, av, es === undefined ? true : es); return { n, av, nums: nums(rows) }; };
  const r1 = unaVegada(R_UT(), T_UT); check(etiqueta + ' · Presto amb OPCIONAL: 111, 111.2 (amortització), 112, 113, 114', r1.nums.join(',') === '111,111.2,112,113,114' && r1.n === 4, r1.nums.join(','));
  check(etiqueta + ' · diu d\'on ve la numeració (castellà)', r1.av.some(a => /Numeración tomada del documento/.test(a)), r1.av.join(' | '));
  const r1c = unaVegada(R_UT(), T_UT, false); check(etiqueta + ' · i en català', r1c.av.some(a => /Numeració presa del document/.test(a)), r1c.av.join(' | '));
  { const rows = R_UT(); const P = rows.filter(r => r.tipo === 'part'); P[2].flag = 'PENDENT — la mateixa partida surt avisada a la 1.3'; P[1].estat = 'inclosa'; P[1].estatRef = '1.2'; M.ren(rows);
    const av = ['⚠ 2 unitats no coincidien amb el document: 1.1 (m² → m), 1.3 (pa → ud). Revisa-les.', 'La numeració del document salta de 1.1 a 1.3 (així ve a l\'original)', 'Recompte: 28,2 m i 1.234,56 € a la partida 1.4.']; M.codis(rows, T_UT, av, false);
    check(etiqueta + ' · els avisos que citen una partida diuen el número de la pantalla (1.1 → 111, 1.3 → 113, 1.4 → 114)', /111 \(m² → m\), 113 \(pa → ud\)/.test(av[0]) && /partida 114\./.test(av[2]) && /28,2 m i 1\.234,56 €/.test(av[2]), av.join(' | '));
    check(etiqueta + ' · el que cita el codi del document (salt de numeració) no es toca', av[1] === 'La numeració del document salta de 1.1 a 1.3 (així ve a l\'original)', av[1]);
    check(etiqueta + ' · la marca de la fila i «inclosa a» diuen el número de la pantalla', /a la 113/.test(P[2].flag) && P[1].estatRef === '112', P[2].flag + ' · ' + P[1].estatRef); }
  const r2 = unaVegada(R_ZERS(), T_ZERS); check(etiqueta + ' · zeros del davant fora (01.02 → 1.2, 02.10 → 2.10)', r2.nums.join(',') === '1.1,1.2,2.10,2.11', r2.nums.join(','));
  const r3 = unaVegada(R_PUNTS(), T_PUNTS); check(etiqueta + ' · punts de més fora (6..02 → 6.2)', r3.nums.join(',') === '6.2,6.3,6.4', r3.nums.join(','));
  const r4 = unaVegada(R_TIT(), T_TIT); check(etiqueta + ' · títols que només es distingeixen pel final i una línia de referència: cada codi al seu lloc', r4.nums.join(',') === '4.1,4.2,4.9,4.10', r4.nums.join(','));
  const r5 = unaVegada(R_SENSE1(), T_SENSE1); check(etiqueta + ' · una partida sense codi: tot o res, es queda 1.1, 1.2… i ho diu', r5.n === 0 && r5.nums.join(',') === '1.1,1.2,1.3,1.4' && r5.av.some(a => /^Numeraci/.test(a) && /Treballs complementaris/.test(a)), r5.nums.join(',') + ' · ' + r5.av.join(' | '));
  const r6 = unaVegada(R_LLIURE(), T_LLIURE); check(etiqueta + ' · un document sense codis: res canvia i no diu res', r6.n === 0 && r6.nums.join(',') === '1.1,1.2,1.3,1.4' && r6.av.length === 0, r6.nums.join(',') + ' · ' + r6.av.join(' | '));
  const r7 = unaVegada(R_COL(), T_COL); check(etiqueta + ' · columnes (número, codi, quantitat, títol; codi amb guió)', r7.nums.join(',') === 'CQ01,SS01,MA02,CAT-01', r7.nums.join(','));
  const rB = unaVegada(R_BESS(), T_BESS); check(etiqueta + ' · bessones amb el títol més llarg: cada codi a la seva (701, 702, 703, 704)', rB.nums.join(',') === 'IP701,IP702,IP703,IP704', rB.nums.join(','));
  const rT = unaVegada(R_TAIL(), T_TAIL); check(etiqueta + ' · el títol d\'una fila només s\'assembla al principi del d\'una altra capçalera: no la pren', rT.nums.join(',') === '7.9,7.10,7.11', rT.nums.join(','));
  const rT2 = unaVegada(R_TAIL(), T_TAIL_SENSE9); check(etiqueta + ' · si la capçalera de la fila no es pot llegir, no es posa el codi d\'una altra de títol semblant: es queda 1.1, 1.2…', rT2.n === 0 && rT2.nums.join(',') === '7.1,7.2,7.3', rT2.nums.join(','));
  const rBP = unaVegada(R_BESS_SENSE_PRIMERA(), T_BESS); check(etiqueta + ' · falta la primera bessona a la lectura: les altres no prenen el seu codi (702, 703, 704)', rBP.nums.join(',') === 'IP702,IP703,IP704', rBP.nums.join(','));
  const rD1 = unaVegada(R_DUP_SENCERA(), T_DUP); check(etiqueta + ' · dues partides amb el mateix títol i totes dues a la lectura: cada codi a la seva', rD1.nums.join(',') === 'IP701,IP702,IP703,IP704', rD1.nums.join(','));
  const rD2 = unaVegada(R_DUP_PERDUDA(), T_DUP); check(etiqueta + ' · la lectura ha perdut una de dues partides amb el mateix títol: no s\'endevina, es queda 1.1, 1.2… i ho diu', rD2.n === 0 && rD2.nums.join(',') === '1.1,1.2,1.3' && rD2.av.some(a => /^Numeraci/.test(a)), rD2.nums.join(',') + ' · ' + rD2.av.join(' | '));
  const r8 = unaVegada(R_COL1(), T_COL1); check(etiqueta + ' · columnes (codi, separació, títol)', r8.nums.join(',') === 'CAT-01,MA02,SS01', r8.nums.join(','));
  const rO = R_LLIURE(); rO.filter(r => r.tipo === 'part').forEach((r, k) => { r.codiDoc = ['1125 OPCIONAL 1', '1126 OPCIONAL 2', '1.01.', '6..02'][k]; }); M.ren(rO); M.codis(rO, '', [], true);
  check(etiqueta + ' · codi de la fila: «OPCIONAL n» i punts de més fora', nums(rO).join(',') === '1125,1126,1.1,6.2', nums(rO).join(','));
  // l'Excel i els llistats ja porten el codi a la fila
  const rE = R_LLIURE(); rE.filter(r => r.tipo === 'part').forEach((r, k) => { r.codiDoc = ['01.01', '01.02', 'A-03', '2.10'][k]; }); M.ren(rE); const nE = M.codis(rE, '', [], true);
  check(etiqueta + ' · codi de la fila (Excel, llistat): es fa servir i no queda a cap fila', nE === 4 && nums(rE).join(',') === '1.1,1.2,A-03,2.10' && !rE.some(r => 'codiDoc' in r), nums(rE).join(',') + ' · ' + JSON.stringify(rE.map(r => r.codiDoc)));
  const rF = R_SENSE1(); rF.filter(r => r.tipo === 'part').forEach((r, k) => { if (k < 3) r.codiDoc = '9.' + (k + 1); }); M.ren(rF); const av = []; const nF = M.codis(rF, T_LLIURE, av, true);
  check(etiqueta + ' · amb el codi de la fila només a una part: tot o res, i el codi no es queda a cap fila', nF === 0 && !rF.some(r => 'codiDoc' in r) && nums(rF).join(',') === '1.1,1.2,1.3,1.4', nums(rF).join(','));
  // renumberRows: només a partir d'una fila (el reintent d'un tros)
  const rR = [{ tipo: 'cap', desc: '1 A' }, part('X', { num: 'D101' }), part('Y', { num: 'D102' }), { tipo: 'cap', desc: 'RECUPERADO' }, part('Z', { num: '' })]; M.desde(rR, 3);
  check(etiqueta + ' · renumberDes(rows, des): només les files noves; els codis del document es queden', nums(rR).join(',') === 'D101,D102,2.1', nums(rR).join(','));
  return M;
}
function provaCsv(H, etiqueta) {
  const sb = csvMotor(H); if (!sb) { check(etiqueta + ': CSV carregable', false); return; }
  const llegeix = raw => { const rows = sb.sanitizeRows(raw); const L = sb.csvBuildLines(rows, 1, 'OBRA TEST', 'G00.000', 'es'); L.numsRenumerats = L.numsRenumerats || []; const txt = '\uFEFF' + L.join('\r\n') + '\r\n'; return { L, ids: L.map(l => l.split(';')).filter(f => !f[0] && f[1] && f[3]).map(f => f[1]), probs: sb.csvIntranetCheck(txt) }; };
  const P = (num, d) => ({ tipo: 'part', num, desc: d, ut: 'm2', amid: 2, preu: 10 });
  const a = llegeix([{ tipo: 'cap', desc: '1 PRIMER', num: '1' }, P('1.1', 'A'), P('1.2', 'B'), { tipo: 'cap', desc: '2 SEGON', num: '2' }, P('2.7', 'C'), P('2.10', 'D')]);
  check(etiqueta + ' · CSV: codis «capítol.n» del document es queden tal qual (1.1, 1.2, 2.7, 2.10)', a.ids.join(',') === '1.1,1.2,2.7,2.10' && a.L.numsRenumerats.length === 0 && a.probs.length === 0, a.ids.join(',') + ' · ' + JSON.stringify(a.probs));
  const b = llegeix([{ tipo: 'cap', desc: '1 PRIMER', num: '1' }, P('111', 'A'), P('112', 'B'), P('113', 'C')]);
  check(etiqueta + ' · CSV: codis 111, 112… (mai acceptats per la intranet) → 1.1, 1.2, 1.3 i ho diu', b.ids.join(',') === '1.1,1.2,1.3' && b.L.numsRenumerats.join(',') === '1' && b.probs.length === 0, b.ids.join(',') + ' · ' + b.L.numsRenumerats);
  const c = llegeix([{ tipo: 'cap', desc: '1 PRIMER', num: '1' }, P('D101', 'A'), P('F101', 'B'), { tipo: 'cap', desc: '2 SEGON', num: '2' }, P('2.1', 'C'), P('2.2', 'D')]);
  check(etiqueta + ' · CSV: un capítol amb codis de lletres surt 1.1, 1.2 i l\'altre, amb forma bona, no es toca', c.ids.join(',') === '1.1,1.2,2.1,2.2' && c.L.numsRenumerats.join(',') === '1', c.ids.join(',') + ' · ' + c.L.numsRenumerats);
  const d = llegeix([{ tipo: 'cap', desc: '1 PRIMER', num: '1' }, P('1.1', 'A'), P('1.1', 'B'), P('1.3', 'C')]);
  check(etiqueta + ' · CSV: codis repetits al mateix capítol → 1.1, 1.2, 1.3', d.ids.join(',') === '1.1,1.2,1.3' && d.L.numsRenumerats.join(',') === '1', d.ids.join(','));
  const e = llegeix([{ tipo: 'cap', desc: '1 PRIMER', num: '1' }, P('3.1', 'A'), P('3.2', 'B')]);
  check(etiqueta + ' · CSV: codi amb un altre primer número que el capítol → 1.1, 1.2', e.ids.join(',') === '1.1,1.2' && e.L.numsRenumerats.join(',') === '1', e.ids.join(','));
  const f = llegeix([{ tipo: 'cap', desc: '7 SETÈ', num: '7' }, P('7.1.1', 'A'), P('7.1.2', 'B'), P('7.2', 'C')]);
  check(etiqueta + ' · CSV: 7.1.1, 7.1.2, 7.2 (com els CSV acceptats) es queden', f.ids.join(',') === '7.1.1,7.1.2,7.2' && f.L.numsRenumerats.length === 0, f.ids.join(','));
}

console.log('— app ' + HTML);
const M0 = prova(H0, 'app'); provaCsv(H0, 'app');
// ── cada peça trencada es veu ──
console.log('— peces trencades (cada una ha de fer caure alguna comprovació)');
const peces = [
  ['zeros del davant', /c\.split\("\."\)\.map\(x=>String\(\+x\)\)\.join\("\."\):c;/, 'c.split(".").map(x=>x).join("."):c;'],
  ['capçalera «codi OPCIONAL n | unitat | títol»', 'OPCIONAL\\\\s*\\\\d*(?:', 'NO_ES_AIXO\\\\s*\\\\d*(?:'],
  ['"OPCIONAL n" de la fi del codi', /\.replace\(\/\\s\+OPCIONAL\\s\*\\d\*\$\/i,""\)/, ''],
  ['punts de més (6..02)', /\.replace\(\/\(\\d\)\\\.\{2,\}\(\?=\\d\)\/g,"\$1\."\)/, ''],
  ['amortització penja de la bastida', /if\(r\.origen==="auto"\)\{ if\(ant\) r\.num=ant\+"\.2"; return; \}/, 'if(r.origen==="auto"){ return; }'],
  ['tot o res', /if\(falten\.length\)\{/, 'if(false){'],
  ['títol idèntic fins al final', /if\(cp>=m\) return/, 'if(cp>=m*0.8) return'],
  ['la bessona de títol més llarg no pren el codi de l\'altra', /0\.5\+0\.5\*cp\/Math\.max\(a\.t\.length,r\.length\)/, '1'],
  ['títols repetits que no quadren amb el document', /out\.amb\.push\(i\)/, 'void 0'],
  ['codi de la fila (Excel, llistats)', /const k=_normCodiDoc\(rows\[i\]\.codiDoc\); if\(k\) cod\.set\(i,k\);/, 'void 0;'],
  ['el codi no es queda a la fila', /const neteja=\(\)=>\{[^\n]*\n/, 'const neteja=()=>{};\n'],
  ['columnes (codi, separació, títol)', /\["columna",\/\^/, '["columna",/^NO_ES_AIXO'],
  ['columnes (número, codi, quantitat, títol)', /\["columna2",\/\^/, '["columna2",/^NO_ES_AIXO'],
  ['avisos i marques amb el número de la pantalla', /if\(r\.flag\) r\.flag=cita\(r\.flag\);/, 'void 0;'],
  ['reintent: només les files noves', /g\.forEach\(\(n,i\)=>\{ if\(n!==undefined\) rs\[i\]\.num=n; \}\);/, 'void 0;'],
  ['CSV: forma que la intranet accepta', /n\.split\("\."\)\[0\]!==p1\|\|/, ''],
  ['CSV: codis repetits', /\|\|vist\.has\(n\)\)\{ ok=false/, '){ ok=false'],
  ['CSV: avís de capítols renumerats', /if\(_numsCap\)L\.numsRenumerats\.push\(n\);/, 'void 0;'],
];
let trencades = 0;
for (const [nom, de, a] of peces) {
  const H1 = trenca(H0, de, a);
  if (!H1) { check('peça «' + nom + '» trobada a l\'app', false); continue; }
  const abans = ko, abansOk = ok; const sortida = console.error; const log = console.log; console.error = () => {}; console.log = () => {};
  let caigut = false; try { prova(H1, 'x'); provaCsv(H1, 'x'); } catch (e) { caigut = true; }
  console.error = sortida; console.log = log; const fallades = ko - abans; ko = abans; ok = abansOk;   // les fallades de la prova trencada no compten com a fallades del guardià
  check('trencada «' + nom + '» → es veu', caigut || fallades > 0, 'cap comprovació ha caigut'); if (caigut || fallades > 0) trencades++;
}
check('totes les peces trencades es veuen (' + trencades + '/' + peces.length + ')', trencades === peces.length);
console.log(ok + ' OK, ' + ko + ' X');
process.exit(ko ? 1 : 0);
