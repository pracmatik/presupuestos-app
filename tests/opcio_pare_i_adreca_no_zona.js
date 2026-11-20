#!/usr/bin/env node
'use strict';
/*
 * Guardià · 11/11/2026 (Z_estructura) · LES OPCIONS QUE SÓN PARES DE CAPÍTOLS I L'ADREÇA QUE NO ÉS UNA ZONA.
 * Documents inventats, català i castellà, cap dada de cap client (va també al repositori públic).
 * D'on ve: una lectura real de l'11/11 (amidaments per línies): adreça · «a).- Fachada principal» · «Opción A …» · «a.1.- Medio auxiliar» … «b).- …» · «Opción B …» ·
 * «b.1.- …». Sortia l'adreça com a zona, «a).-» i l'opció com a capítols buits que gastaven número (partides 3.x a 11.x) i les DUES opcions sumaven
 * (la tècnica ja ho va dir el 16/07: «las opciones A/B se suman»). Com ho fa GTA a mà (C-113): «A).- Fachada principal» és la zona, «A.1.- Medio auxiliar» el capítol 1.
 *  1) opció pare de capítols (com a capítol o com a zona): compta la A (o la 1) i les partides de les altres no sumen; la nota del document mana;
 *  2) una opció sola, opcions separades per partides de fora, opció amb partides pròpies (la regla d'abans) i el que ha marcat una persona: no es toca;
 *  3) l'àmbit d'una opció s'acaba a la zona següent: la zona comuna de després suma;
 *  4) lectura per línies: l'adreça (només si és l'única zona i la primera) no és zona i es diu; «a).-» passa a zona; la línia d'opció va al nom de la zona;
 *     els capítols queden 1, 2… dins de cada zona; un títol buit al final (peu d'una foto) no es fa zona;
 *  5) la quantitat a 0 per la regla 63 (criteri GTA, ml) surt en taronja amb la xifra del document, no com a avaria en vermell;
 *  6) títols: «balcón planta 5 …» ja no queda «BALCÓN PLANTA» (el número d'una planta, escala o bloc és part del nom); una mesura se segueix tallant;
 *  7) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.split(de).join(a); return s === src ? null : s; };
function bloc(H, s) { let i = H.indexOf('{', s), d = 0; for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) return i + 1; } } return -1; }
const eF = (H, n) => { const s = H.indexOf('function ' + n + '('); return s < 0 ? 'function ' + n + '(){ throw new Error("falta ' + n + '"); }' : H.slice(s, bloc(H, s)); };
const eC = (H, n) => { const m = H.match(new RegExp('^const ' + n + '=.*$', 'm')); return m ? m[0] : 'const ' + n + '=/$^/;'; };
const carrega = H => new Function([eC(H, '_RE_OPCIONAL'), eC(H, '_RE_OPCIO_PART'), eC(H, '_RE_OPCIO_COMPTA'), eF(H, '_opcioCompta'), eF(H, '_opcionsPare'),
  eC(H, '_RE_ADRECA_OBRA'), eF(H, '_lrDireccioIOpcio'), eF(H, 'capNumOf'), eF(H, 'renumberRows')].join('\n') + '\nreturn {pare:_opcionsPare,dir:_lrDireccioIOpcio,renum:renumberRows};')();
const S = d => ({ tipo: 'sec', desc: d }), C = d => ({ tipo: 'cap', desc: d }), P = (d, x) => Object.assign({ tipo: 'part', num: '', desc: d, ut: 'm2', amid: 10, preu: 0 }, x || {});
const N = (r, niv) => { Object.defineProperty(r, '_lrNiv', { value: niv, enumerable: false }); return r; };
const opc = rows => rows.map((r, i) => r.gta === 'opc' ? i : -1).filter(i => i >= 0);
const TXT = {
  es: { fa: 'a).- Fachada principal', oa: 'Opción A puntual, zona superior: voladizo y balcones.', a1: 'a.1.- Medio auxiliar', a2: 'a.2.- Voladizo superior',
        fb: 'b).- Fachada principal', ob: 'Opción B: voladizo y todas las barandillas.', b1: 'b.1.- Medio auxiliar', b2: 'b.2.- Barandillas', cu: 'Cubierta', cu1: 'Impermeabilización',
        adr: 'c/ Ejemplo de Prueba, nº 12 (Barcelona)', nota: 'Solo se contabiliza la opción B en este presupuesto.', p: ['Andamio tubular', 'Saneado de frentes', 'Pintura al silicato', 'Retirada de escombros'] },
  ca: { fa: 'a).- Façana principal', oa: 'Opció A puntual, zona superior: volada i balcons.', a1: 'a.1.- Mitjans auxiliars', a2: 'a.2.- Volada superior',
        fb: 'b).- Façana principal', ob: 'Opció B: volada i totes les baranes.', b1: 'b.1.- Mitjans auxiliars', b2: 'b.2.- Baranes', cu: 'Coberta', cu1: 'Impermeabilització',
        adr: 'Carrer de la Prova, núm. 12 (Barcelona)', nota: 'Només es comptabilitza l\'opció B en aquest pressupost.', p: ['Bastida tubular', 'Sanejat de fronts', 'Pintura al silicat', 'Retirada de runa'] },
};
function proves(F, et) {
  for (const L of ['es', 'ca']) { const T = TXT[L], p = T.p;
    // 1a) opció pare com a CAPÍTOL (tots els camins: Excel, text, a mà)
    let r = [C(T.fa), C(T.oa), C(T.a1), P(p[0]), P(p[1]), C(T.a2), P(p[2]), C(T.fb), C(T.ob), C(T.b1), P(p[0]), C(T.b2), P(p[3])];
    let n = F.pare(r, [T.fa, T.oa, T.a1, T.fb, T.ob].join('\n')); check(et + L + ' · opció pare com a capítol: compta la A, les 2 de la B no sumen', JSON.stringify(opc(r)) === '[10,12]' && n === 2, JSON.stringify(opc(r)));
    // 1b) opció pare com a ZONA (el que deixa la lectura per línies)
    r = [S(T.fa + ': ' + T.oa), C(T.a1), P(p[0]), C(T.a2), P(p[1]), S(T.fb + ': ' + T.ob), C(T.b1), P(p[0]), P(p[2])];
    n = F.pare(r, ''); check(et + L + ' · opció pare com a zona: compta la A', JSON.stringify(opc(r)) === '[7,8]', JSON.stringify(opc(r)));
    // 1c) la nota del document diu quina compta
    r = [C(T.oa), C(T.a1), P(p[0]), C(T.ob), C(T.b1), P(p[1])];
    F.pare(r, T.nota + '\n' + T.oa + '\n' + T.a1 + '\n' + p[0] + '\n' + T.ob + '\n' + T.b1 + '\n' + p[1]); check(et + L + ' · la nota del document mana (compta la B)', JSON.stringify(opc(r)) === '[2]', JSON.stringify(opc(r)));
    // 2) el que no es toca
    r = [C(T.oa), C(T.a1), P(p[0]), P(p[1])]; F.pare(r, ''); check(et + L + ' · una opció sola: res', opc(r).length === 0);
    r = [S(T.fa + ': ' + T.oa), C(T.a1), P(p[0]), S(T.cu), C(T.cu1), P(p[3]), S(T.fb + ': ' + T.ob), C(T.b1), P(p[1])]; F.pare(r, ''); check(et + L + ' · opcions separades per una zona amb partides: res', opc(r).length === 0, JSON.stringify(opc(r)));
    r = [C(T.oa), P(p[0]), C(T.ob), P(p[1])]; F.pare(r, ''); check(et + L + ' · opció amb partides pròpies (la regla d\'abans): aquesta no hi toca', opc(r).length === 0);
    r = [C(T.oa), C(T.a1), P(p[0]), C(T.ob), C(T.b1), P(p[1], { estat: 'pendent' }), P(p[2], { pct: 3 })]; F.pare(r, ''); check(et + L + ' · el que ha marcat una persona no es toca', opc(r).length === 0 && r[5].estat === 'pendent');
    r = [C('Partidas opcionales A'), C(T.a1), P(p[0]), C('Partidas opcionales B'), C(T.b1), P(p[1])]; F.pare(r, ''); check(et + L + ' · «opcional» no és cap opció A/B', opc(r).length === 0);
    // 3) l'àmbit s'acaba a la zona següent
    r = [S(T.fa + ': ' + T.oa), C(T.a1), P(p[0]), S(T.fb + ': ' + T.ob), C(T.b1), P(p[1]), S(T.cu), C(T.cu1), P(p[3])]; F.pare(r, ''); check(et + L + ' · la zona comuna de després suma', JSON.stringify(opc(r)) === '[5]', JSON.stringify(opc(r)));
    r = [C(T.fa), C(T.oa), C(T.a1), P(p[0]), C(T.fb), C(T.ob), C(T.b1), P(p[1]), C(T.cu), C(T.cu1), P(p[3])]; F.pare(r, '');
    check(et + L + ' · capítols: l\'opció B s\'acaba al títol pare següent', JSON.stringify(opc(r)) === '[7]', JSON.stringify(opc(r)));
    // 4) lectura per línies: adreça, zona i opció
    r = [N(S(T.adr), 1), N(C(T.fa), 2), N(C(T.oa), 3), N(C(T.a1), 3), P(p[0]), P(p[1]), N(C(T.a2), 3), P(p[2]), N(C(T.fb), 2), N(C(T.ob), 3), N(C(T.b1), 3), P(p[0]), N(C('a) ' + T.fa.slice(5)), 2)];
    let meta = r.map((x, i) => x.tipo === 'part' ? { ini: i } : null), av = [];
    F.dir(r, meta, av, L === 'es'); const fo = r.map(x => x.tipo[0] + ':' + String(x.desc).slice(0, 14)).join(' | ');
    check(et + L + ' · l\'adreça no és zona i es diu', r[0].tipo === 'sec' && r[0].desc.indexOf(T.fa) === 0 && !r.some(x => x.desc === T.adr) && av.some(a => a.indexOf(T.adr) >= 0), fo);
    check(et + L + ' · la línia d\'opció va al nom de la zona', r[0].desc === T.fa + ': ' + T.oa && r.filter(x => x.tipo === 'sec').length === 2 && !r.some(x => x.tipo === 'cap' && /^Opci/.test(x.desc)), fo);
    check(et + L + ' · files i punters segueixen junts', meta.length === r.length && r.every((x, i) => (x.tipo === 'part') === !!meta[i]), meta.length + '/' + r.length);
    check(et + L + ' · el títol buit del final no es fa zona', r[r.length - 1].tipo === 'cap', fo);
    F.renum(r); const nums = r.filter(x => x.tipo === 'part').map(x => x.num).join(',');
    check(et + L + ' · cada zona torna a 1: 1.1,1.2,2.1 i 1.1', nums === '1.1,1.2,2.1,1.1', nums);
    F.pare(r, ''); check(et + L + ' · i compta la A (la de la B, naranja)', JSON.stringify(opc(r)) === '[8]', JSON.stringify(opc(r)));
    // l'adreça només quan és l'única zona i la primera; si els de nivell 2 porten partides, no pugen
    r = [N(S(T.adr), 1), N(C(T.a1), 2), P(p[0]), N(S('C/ Altra Prova 7'), 1), N(C(T.a2), 2), P(p[1])]; meta = r.map(() => null); av = []; F.dir(r, meta, av, L === 'es');
    check(et + L + ' · dues adreces (una zona per carrer): no es toca', r.length === 6 && r[0].desc === T.adr && !av.length);
    r = [N(S(T.cu), 1), N(C(T.cu1), 2), P(p[0])]; meta = r.map(() => null); av = []; F.dir(r, meta, av, L === 'es'); check(et + L + ' · una zona que no és adreça: no es toca', r.length === 3 && r[0].tipo === 'sec' && !av.length);
    r = [N(S(T.adr), 1), N(C(T.a1), 2), P(p[0]), N(C(T.a2), 2), P(p[1])]; meta = r.map(() => null); av = []; F.dir(r, meta, av, L === 'es');
    check(et + L + ' · capítols amb partides sota l\'adreça: segueixen capítols', r.length === 4 && r.every(x => x.tipo !== 'sec') && av.length === 1);
  }
}
// 6) la marca de la regla 63 (criteri GTA: es valora en ml) no surt com a avaria: taronja, amb la xifra del document i en l'idioma del document
function regla63(H, et) { let re, ro; try { re = new Function(eC(H, '_RE_PENDENT_ML') + '\nreturn _RE_PENDENT_ML;')(); ro = new Function(eC(H, '_P13_ROJO') + '\nreturn _P13_ROJO;')(); } catch (e) { check(et + 'regla 63 · es carrega', false, e.message); return; }
  const f = H.indexOf('function p4QuantitatZeroLinies('), cos = f < 0 ? '' : H.slice(f, bloc(H, f)), i63 = cos.indexOf('_RE_PENDENT_ML.test('), iR = cos.indexOf('CANTIDAD A REVISAR: las');
  check(et + 'regla 63 · reconeix la marca en català i en castellà', re.test('PENDENT — passar a ml (criteri GTA)') && re.test('PENDIENTE — pasar a ml (criterio GTA)') && !re.test('PENDENT — preu a revisar'));
  check(et + 'regla 63 · es mira abans de posar «a revisar» en vermell', i63 > 0 && iR > i63);
  const es = 'PENDIENTE — pasar a ml (criterio GTA): el documento trae 3,8 M²; pon los metros lineales', ca = 'PENDENT — passar a ml (criteri GTA): el document porta 3,8 m2; posa-hi els metres lineals';
  check(et + 'regla 63 · el text nou és a l\'app i no és vermell', cos.indexOf('el documento trae ') > 0 && cos.indexOf('el document porta ') > 0 && !ro.test(es) && !ro.test(ca)); }
console.log('Opcions pare i adreça (' + path.basename(HTML) + '):');
regla63(H0, '');
let F; try { F = carrega(H0); } catch (e) { check('les funcions es carreguen', false, e.message); }
if (F) try { proves(F, ''); } catch (e) { check('les proves corren', false, e.message); }
// 4 bis) títols: el número de la planta (o escala, bloc…) és part del nom; una mesura de debò se segueix tallant
function titols(H, et) { const T = new Function([eC(H, '_MOTS_BUITS'), eF(H, '_titolCurt')].join('\n') + '\nreturn _titolCurt;')(), up = x => String(x || '').toUpperCase();
  const t1 = up(T('balcón planta 5 desmontaje de la barandilla metálica para sustituir las piezas')), t2 = up(T('Extracción en balcón planta 5 de las piezas de coronación'));
  const t3 = up(T('Reparació barana de l\'escala 2 i pintat del passamà')), t4 = up(T('Coronament de parets de <= 7,5 cm de gruix')), t5 = up(T('Formación de muro de 20 cm de espesor'));
  check(et + 'títol · «planta 5» no es talla (es)', /PLANTA 5/.test(t1) && /PLANTA 5/.test(t2), t1 + ' | ' + t2);
  check(et + 'títol · «escala 2» no es talla (ca)', /ESCALA 2/.test(t3), t3);
  check(et + 'títol · una mesura de debò se segueix tallant', !/7/.test(t4) && /CORONAMENT DE PARETS/.test(t4) && !/20/.test(t5), t4 + ' | ' + t5); }
try { titols(H0, ''); } catch (e) { check('els títols es proven', false, e.message); }
// 5) peces trencades: cada una s'ha de veure
const PECES = [
  ['l\'opció pare no marca res', 'r.gta="opc"; n++; m++;', 'n++; m++;'],
  ['no es mira la nota del document', 'const compta=_opcioCompta(txt||"",g)||', 'const compta='],
  ['l\'àmbit no s\'acaba a la zona', 'if(esH.has(j)||r.tipo==="sec"||', 'if(esH.has(j)||'],
  ['l\'adreça torna a ser zona', 'rows.splice(0,1); meta.splice(0,1); n++;', 'n++;'],
  ['la regla 63 torna a sortir com a avaria', 'if(_RE_PENDENT_ML.test(String(r.flag||""))){', 'if(false){'],
  ['el número de la planta torna a tallar el títol', '&&_RE_LLOC_NUM.test(p[k-1].replace(', '&&false&&(p[k-1].replace('],
  ['l\'opció no va a la zona', 'z.desc=String(z.desc||"").replace(/[\\s.:;,]+$/,"")+": "+t; rows.splice(i+1,1); meta.splice(i+1,1); n++;', 'n++;'],
];
for (const [nom, de, a] of PECES) { const H = trenca(H0, de, a); if (!H) { check('peça «' + nom + '» trobada', false); continue; }
  const o0 = ok, k0 = ko; console.log = () => {}; const ce = console.error; console.error = () => {};
  try { regla63(H, ''); proves(carrega(H), ''); titols(H, ''); } catch (_) { ko++; } console.log = (...x) => process.stdout.write(x.join(' ') + '\n'); console.error = ce;
  const caigut = ko - k0; ok = o0; ko = k0; check('peça trencada «' + nom + '» es veu (' + caigut + ' en vermell)', caigut > 0); }
console.log(ok + ' OK · ' + ko + ' X'); process.exit(ko ? 1 : 0);
