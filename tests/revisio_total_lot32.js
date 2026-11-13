#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 32 (22/10/2026) · ARREGLOS DE LA REVISIÓ TOTAL: CAP ERROR CALLAT NOU, CAP AVÍS QUE ESBORRI UN ALTRE.
 * Documents i dades inventats, castellà i català, cap dada de cap client (va també al repositori públic).
 *  1) Quantitat que el document imprimeix al «Total <unitat> ……: N» de la partida i l'esborrany porta una altra que no és al seu tros → marca a la fila.
 *     Si l'esborrany porta la del document, res.
 *  2) Capítol del document que falta quan el mateix nom es repeteix a cada zona, i capçaleres «Presupuesto parcial nº N» → vermell. La mateixa capçalera
 *     repetida a cada pàgina NO és un capítol de més (cap avís). Un esborrany sencer → cap avís.
 *  3) L'avís d'import desorbitat s'AFEGEIX a l'avís que ja portava la partida i, quan deixa de passar, només es treu ell. Amb una sola partida valorada no salta.
 *  4) Preus que posa la lectura: el que és el preu i la unitat d'una fitxa passa; el d'una fitxa d'una altra unitat i el que no és de cap fitxa es marquen,
 *     sense trepitjar l'avís que hi havia.
 *  5) Un pas de comprovació de la lectura que peta es diu (taronja, amb el seu nom, una vegada) i cap pas de comprovació del tram calla a la consola.
 *  6) Petits errors sense avís: 0.500 a l'editor, «1.250*2», esborrany de la Població, esborrany nou que reapareix, nota esborrada, aprendre amb avís
 *     pendent, reintent sense partides, document d'un sol tros, esborrar sense files, recàrrega amb fotos de la carta.
 *  7) Cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.replace(de, a); return s === src ? null : s; };
function extFn(H, n) {
  for (const pat of [new RegExp('function\\s+' + n + '\\s*\\('), new RegExp('const\\s+' + n + '\\s*=')]) {
    const m = pat.exec(H); if (!m) continue; const b = H.indexOf('{', m.index); let d = 0, i = b;
    for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) { i++; break; } } }
    let e = i; if (pat.source.startsWith('const') && H[e] === ';') e++; return H.slice(m.index, e); }
  throw new Error('no trobo ' + n); }
const extLine = (H, n) => { const m = new RegExp('const\\s+' + n + '\\s*=[^\\n]*?;', 'm').exec(H); if (!m) throw new Error('no trobo ' + n); return m[0]; };
function lectura(H, es) {   // eines de lectura + segell, com a l'app
  const i = H.indexOf('// ==== INICI EINES DE LECTURA ===='), f = H.indexOf('// ==== FI EINES DE LECTURA ====');
  const a = H.indexOf('// 06/10/2026 (Z11) · SEGELL PER PARTIDA'), b = H.indexOf('// ── fi del segell per partida (Z11) ──');
  if (i < 0 || f < 0 || a < 0 || b < 0) return null;
  const ctx = { window: {}, console: { warn() {}, log() {}, info() {} } };
  try { return new Function('IDIOMA', 'window', 'console', [extFn(H, '_dehyphen'), H.slice(i, f), H.slice(a, b)].join('\n') +
    '\nreturn {segell:segellPartides, falten:capitolsDelDocumentQueFalten, pas:(typeof _pasFallat==="function"?_pasFallat:null)};')(es ? 'es' : 'ca', ctx.window, ctx.console); } catch (e) { return null; }
}
const P = (desc, ut, amid) => ({ tipo: 'part', num: '', desc, ut, amid, preu: 0 });
const C = desc => ({ tipo: 'cap', desc }), Z = desc => ({ tipo: 'sec', desc });

function tot(H, et) {
  for (const es of [true, false]) {
    const L = lectura(H, es), E = et + (es ? ' [es]' : ' [ca]');
    if (!L || !L.segell || !L.falten) { check(E + ' · l\'app porta el segell i el detector de capítols', false); continue; }
    // 1) «Total <unitat> ……: N»
    const D1 = (es ? ['MEDICIONES DE LA OBRA EJEMPLO', 'Presupuesto parcial nº 1 Carpintería', '1.1.1 u PUERTA DE PASO DE MADERA.', 'Puerta de paso de madera lacada con herrajes y colocación.',
      'Planta baja 4 4,000', 'Planta primera 3 3,000', 'Total u ......: 7,000', '1.1.2 m2 PINTURA PLÁSTICA EN PARAMENTOS.', 'Pintura plástica lisa en paramentos verticales, dos manos.',
      'Vestíbulo 1 12,50 2,60 32,500', 'Total m2 ......: 32,500']
      : ['AMIDAMENTS DE L\'OBRA EXEMPLE', 'Pressupost parcial núm. 1 Fusteria', '1.1.1 u PORTA DE PAS DE FUSTA.', 'Porta de pas de fusta lacada amb ferramenta i col·locació.',
      'Planta baixa 4 4,000', 'Planta primera 3 3,000', 'Total u ......: 7,000', '1.1.2 m2 PINTURA PLÀSTICA EN PARAMENTS.', 'Pintura plàstica llisa en paraments verticals, dues mans.',
      'Vestíbul 1 12,50 2,60 32,500', 'Total m2 ......: 32,500']).join('\n') + '\n' + 'x'.repeat(200);
    const fila1 = (q) => [P(es ? '1.1.1 u PUERTA DE PASO DE MADERA.\nPuerta de paso de madera lacada con herrajes y colocación.' : '1.1.1 u PORTA DE PAS DE FUSTA.\nPorta de pas de fusta lacada amb ferramenta i col·locació.', 'ud', q),
      P(es ? '1.1.2 m2 PINTURA PLÁSTICA EN PARAMENTOS.\nPintura plástica lisa en paramentos verticales, dos manos.' : '1.1.2 m2 PINTURA PLÀSTICA EN PARAMENTS.\nPintura plàstica llisa en paraments verticals, dues mans.', 'm²', 32.5)];
    { const r = fila1(70), av = []; L.segell(r, D1, av, es);
      check(E + ' · quantitat que no és la del «Total u ……: 7» imprès: marca a la fila amb la del document', /NO (CUADRA|QUADRA)/.test(r[0].flag || '') && /7/.test(r[0].flag || ''), JSON.stringify(r[0].flag));
      const r2 = fila1(7); L.segell(r2, D1, [], es); check(E + ' · amb la quantitat del document: cap marca', !/NO (CUADRA|QUADRA)/.test(r2[0].flag || '') && !/NO (CUADRA|QUADRA)/.test(r2[1].flag || ''), JSON.stringify(r2.map(x => x.flag))); }
    // 2) capítol que falta a una zona (el mateix nom a cada zona) i «Presupuesto parcial nº N»
    const cap = (n, t) => (es ? 'Capítulo 0' : 'Capítol 0') + n + '. ' + t, R1 = es ? 'Revestimientos' : 'Revestiments', R2 = es ? 'Impermeabilización' : 'Impermeabilització';
    const ZN = es ? 'ZONA ' : 'ZONA ', part = (c, t) => c + ' m² ' + t + '\n' + t + ' en paramentos de la obra.\n12,50';
    const D2 = [ZN + '1', cap(1, R1), part('E01.01', 'ARREBOSSAT MONOCAPA'), cap(2, R2), part('E02.01', 'LAMINA ASFALTICA'), ZN + '2', cap(1, R1), part('E01.02', 'PINTURA DE FAÇANA'),
      cap(2, R2), part('E02.02', 'SEGELLAT DE JUNTES'), ZN + '3', cap(1, R1), part('E01.03', 'REPÀS DE CANTELLS'), cap(2, R2), part('E02.03', 'IMPRIMACIO DE MURS')].join('\n');
    const pr = [Z(ZN + '1'), C(R1.toUpperCase()), P('ARREBOSSAT MONOCAPA', 'm²', 12.5), C(R2.toUpperCase()), P('LAMINA ASFALTICA', 'm²', 12.5), Z(ZN + '2'), C(R1.toUpperCase()), P('PINTURA DE FAÇANA', 'm²', 12.5),
      C(R2.toUpperCase()), P('SEGELLAT DE JUNTES', 'm²', 12.5), Z(ZN + '3'), C(R1.toUpperCase()), P('REPÀS DE CANTELLS', 'm²', 12.5)];
    { const av = []; const r = pr.concat([P('IMPRIMACIO DE MURS', 'm²', 12.5)]); L.falten(r, D2, av, es);
      check(E + ' · el capítol que es repeteix a cada zona i la lectura se\'n menja un: vermell amb el seu nom', av.some(a => /^⚠⚠/.test(a) && a.indexOf(R2) >= 0), JSON.stringify(av));
      const av2 = []; L.falten(pr.concat([C(R2.toUpperCase()), P('IMPRIMACIO DE MURS', 'm²', 12.5)]), D2, av2, es); check(E + ' · el mateix document sencer: cap avís', !av2.length, JSON.stringify(av2)); }
    { const PP = es ? 'Presupuesto parcial nº ' : 'Pressupost parcial núm. ', D3 = [PP + '1 ' + (es ? 'Demoliciones' : 'Enderrocs'), part('1.1.1', 'RETIRADA DE PAVIMENT'), part('1.1.2', 'RETIRADA DE BARANES'),
      PP + '2 ' + (es ? 'Cerrajería' : 'Serralleria'), part('2.1.1', 'BARANA D ACER GALVANITZAT'), part('2.1.2', 'REIXA DE PROTECCIO')].join('\n');
      const r = [C((es ? 'DEMOLICIONES' : 'ENDERROCS')), P('RETIRADA DE PAVIMENT', 'm²', 12.5), P('RETIRADA DE BARANES', 'm²', 12.5), P('BARANA D ACER GALVANITZAT', 'm²', 12.5), P('REIXA DE PROTECCIO', 'm²', 12.5)];
      const av = []; L.falten(r, D3, av, es); check(E + ' · «' + PP + '2» que la lectura no separa: vermell', av.some(a => /^⚠⚠/.test(a) && /Cerrajer|Serraller/.test(a)), JSON.stringify(av));
      const av2 = []; L.falten([C(es ? 'DEMOLICIONES' : 'ENDERROCS'), r[1], r[2], C(es ? 'CERRAJERÍA' : 'SERRALLERIA'), r[3], r[4]], D3, av2, es); check(E + ' · amb els dos capítols: cap avís', !av2.length, JSON.stringify(av2)); }
    { const D4 = [ZN + '1', cap(1, R1), part('E01.01', 'ARREBOSSAT MONOCAPA'), cap(1, R1), part('E01.02', 'PINTURA DE FAÇANA'), ZN + '2', cap(2, R2), part('E02.01', 'LAMINA ASFALTICA')].join('\n');   // capçalera repetida a cada pàgina
      const av = []; L.falten([Z(ZN + '1'), C(R1.toUpperCase()), P('ARREBOSSAT MONOCAPA', 'm²', 1), P('PINTURA DE FAÇANA', 'm²', 1), Z(ZN + '2'), C(R2.toUpperCase()), P('LAMINA ASFALTICA', 'm²', 1)], D4, av, es);
      check(E + ' · la mateixa capçalera repetida a la pàgina següent no és un capítol que falta', !av.length, JSON.stringify(av)); }
    { const D5 = [cap(1, R1), part('E01.01', 'ARREBOSSAT MONOCAPA'), cap(2, R2), part('E02.01', 'LAMINA ASFALTICA'), (es ? 'PRESUPUESTO' : 'PRESSUPOST'), cap(1, R1), part('E01.01', 'ARREBOSSAT MONOCAPA'), cap(2, R2), part('E02.01', 'LAMINA ASFALTICA')].join('\n');
      const av = []; L.falten([C(R1.toUpperCase()), P('ARREBOSSAT MONOCAPA', 'm²', 1), C(R2.toUpperCase()), P('LAMINA ASFALTICA', 'm²', 1)], D5, av, es);
      check(E + ' · document que llista les partides dues vegades (amidaments i pressupost), sense zones: cap capítol que falta', !av.length, JSON.stringify(av)); }
    // 5) pas que falla
    if (L.pas) { const av = []; global.window = {}; L.pas('prova', new Error('x'), av); L.pas('prova', new Error('x'), av);
      check(E + ' · un pas de la lectura que peta es diu una vegada, en taronja i amb el seu nom', av.length === 1 && /^⚠ /.test(av[0]) && /prova/.test(av[0]), JSON.stringify(av)); }
    else check(E + ' · existeix l\'avís de pas que falla', false);
  }
  // 3) import desorbitat
  let base = null;
  try { base = 'function coef(){return 1;}\n' + ['num2', 'subsOf', 'unitPrice', 'isNoSuma', 'isSenseCoef', 'rowGross', 'pctBase', 'pctBaseAt', 'rowTotal', 'computeTotal'].map(n => extFn(H, n)).join('\n') + '\n'
    + extFn(H, '_RANG_PREU') + '\n' + extLine(H, '_MARCA_DISP_ES') + '\n' + extLine(H, '_MARCA_DISP_CA') + '\n' + extFn(H, 'marcaPreusDisparats') + '\n'; } catch (e) { base = null; }
  const mp = (rows) => { const s = { Math, String, Number, parseFloat, isFinite, Array, Object, IDIOMA: 'es', rows }; vm.createContext(s); vm.runInContext(base + 'marcaPreusDisparats(rows,coef());', s); return rows; };
  if (base) {
    const pf = (p, f) => ({ tipo: 'part', desc: 'Partida de prueba', ut: 'm²', amid: 10, preu: p, flag: f });
    const r = mp([{ tipo: 'cap', desc: 'C1' }, pf(9000, 'PRECIO DEL CATÁLOGO — confirmar que es esta partida'), pf(10), pf(12), pf(11)]);
    check(et + ' · el desorbitat s\'afegeix a l\'avís que ja portava la partida', /^PRECIO DEL CATÁLOGO — confirmar que es esta partida · IMPORTE DESORBITADO/.test(r[1].flag || ''), r[1].flag);
    r[1].preu = 15; mp(r); check(et + ' · quan deixa de ser desorbitat, la partida torna a tenir el seu avís (no es queda sense)', r[1].flag === 'PRECIO DEL CATÁLOGO — confirmar que es esta partida', r[1].flag);
    const u = mp([{ tipo: 'cap', desc: 'C1' }, pf(30), pf(0), pf(0), pf(0), pf(0)]); check(et + ' · una sola partida valorada (el 100 % del total) no és cap import desorbitat', !/DESORBITA/.test(u[1].flag || ''), u[1].flag);
  } else check(et + ' · marcaPreusDisparats es pot carregar', false);
  // 4) preus de la lectura
  try { const s = {}; vm.createContext(s); vm.runInContext(extFn(H, '_ugP') + '\n' + extFn(H, 'guardaPreusDeLaLectura') + '\nthis.G=guardaPreusDeLaLectura;', s);
    const t = [{ tipo: 'part', ut: 'm2', preu: 10 }, { tipo: 'part', ut: 'ml', preu: 10 }, { tipo: 'part', ut: 'ud', preu: 7.77, flag: 'PENDIENTE — x' }, { tipo: 'part', ut: 'm²', preu: 99, origen: 'catalog' }];
    const m = s.G(t, [{ unidad: 'm²', precio: 10 }, { unidad: 'ud', precio: 5 }], true);
    check(et + ' · preu i unitat d\'una fitxa: passa sense avís', !t[0].flag);
    check(et + ' · preu d\'una fitxa d\'una ALTRA unitat: marcat amb la unitat de la fitxa', /UNA FICHA EN m²/.test(t[1].flag || ''), t[1].flag);
    check(et + ' · preu de cap fitxa: marcat i l\'avís d\'abans es conserva', /^PENDIENTE — x · PRECIO DE LA LECTURA QUE NO ES/.test(t[2].flag || ''), t[2].flag);
    check(et + ' · el preu del cercador (catàleg) no es torna a jutjar', !t[3].flag && m.length === 2);
  } catch (e) { check(et + ' · la guarda dels preus de la lectura es pot carregar', false, e.message); }
  // 5b) cap pas de comprovació del tram de lectura que només escrigui a la consola
  { const a = H.indexOf('reabsorbSourceSubs(allRows,amidament); // 1r'), b = H.indexOf('const _draftIA=JSON.parse');
    const tram = a >= 0 && b > a ? H.slice(a, b) : ''; const muts = (tram.match(/catch\((?:e|_e)\)\{ console\.warn\("\[lectura\][^)]*\);\s*\}/g) || []).length;   // (el del segell ja diu el seu avís a la llista)
    check(et + ' · cap pas de comprovació del tram de lectura calla a la consola (tots passen per l\'avís)', tram && muts === 0 && (tram.match(/_pasFallat\("/g) || []).length >= 20, 'muts ' + muts);
    check(et + ' · Pracmatik rep un avís per document amb els passos que han fallat', /LECTURA DE GTA: PAS DE COMPROVACIÓ FALLAT/.test(H)); }
  // 6) petits errors sense avís (text de l'app)
  { try { const s = {}; vm.createContext(s); vm.runInContext(extFn(H, 'evalCell') + '\nthis.v=evalCell("1.250*2");this.w=evalCell("1,5*2");', s); check(et + ' · «1.250*2» fa 2.500 (punt de milers) i «1,5*2» fa 3', s.v === 2500 && s.w === 3, s.v + ' ' + s.w); }
    catch (e) { check(et + ' · evalCell es pot carregar', false, e.message); } }
  const T = [['0.500 a l\'editor és decimal', /\^-\?0\\\.\\d\+\$\/\.test\(_v0\)\?parseFloat\(_v0\)/],
    ['el punt llegit com a milers es diu', /addEventListener\("change"[\s\S]{0,400}separador de miles/],
    ['en recuperar un esborrany es recupera la Població', /data-draft-restore[\s\S]{0,700}h_ciutat"\)\.value=HEADER\.ciutat/],
    ['el primer desat d\'un pressupost nou esborra l\'esborrany provisional', /_eraNou=!\(CURRENT&&CURRENT\.id\)[\s\S]{0,900}if\(_eraNou\) clearDraft\(DKU\(\)\+"nou"\)/],
    ['esborrar una nota és un canvi sense desar', /NOTES\.splice\(\+rm\.dataset\.noterm,1\);DIRTY=true;/],
    ['en signar no s\'aprèn una fitxa amb avís pendent', /async function aprenEquivalencies[\s\S]{0,700}if\(String\(r\.flag\|\|""\)\.trim\(\)\) continue;/],
    ['reintent: una part que torna 0 partides segueix fallida', /some\(r=>r&&r\.tipo==="part"\)\)\{ const _n0=recovered\.length;/],
    ['document d\'un sol tros no llegit: Pracmatik avisat', /chunks\.length===1\)\{ if\(!_iaCaiguda\)\{ try\{ avisaPracmatik\("LECTURA DE GTA: DOCUMENT NO LLEGIT/],
    ['esborrar un pressupost que la base protegeix ho diu en vermell', /delete\(\{count:"exact"\}\)[\s\S]{0,120}_nDel===0/],
    ['no es recarrega l\'app amb fotos de la carta sense entregar', /function _reloadIfStale\(\)\{\s*if\(!window\._STALE\)return;\s*if\(typeof CT_FOTOS!=="undefined"&&CT_FOTOS\.length\)/],
    ['la guarda dels preus de la lectura es crida abans del cercador', /try\{ await _guardaPreusLectura\(allRows,allAvisos\); \}[\s\S]{0,400}\{ \/\/ A7 · casador de preus/]];
  for (const [n, re] of T) check(et + ' · ' + n, re.test(H));
}
tot(H0, 'app');
// 7) cada peça trencada es veu
const PECES = [
  ['quantitat del «Total» imprès', 'f.push("q_ptot");', 'void 0;'],
  ['marca visible q_ptot', 'q_ptot:c=>c.ordre,', ''],
  ['capítol repetit a cada zona', 'if(cops.length<=nP) return;', 'return;'],
  ['capçaleres «Presupuesto parcial»', '|PRES(?:UPUESTO|SUPOST)\\s+PARCIAL\\s+N(?:[ºª°o]|[ÚU]M\\.?)?\\.?)\\s*(\\d{1,3})', ')\\s*(\\d{1,3})'],
  ['només amb zones a l\'esborrany', 'if(rows.filter(r=>r&&r.tipo==="sec").length<2) return;', ''],
  ['capçalera repetida a la pàgina = una', '&&(j===0||sq[j-1].k!==h.k)', ''],
  ['desorbitat que s\'afegeix', 'r.flag=_a?_a+" · "+_m:_m;', 'r.flag=_m;'],
  ['partides valorades', '&&rowGross(arr,i,c)>0).length;', ').length;'],
  ['guarda: unitat de la fitxa', 'if(per.has(u+"|"+e)) continue;', 'continue;'],
  ['família amb un sol capítol a la pantalla', 'if(!P.length) return 0;', 'if(P.length<2) return 0;'],
  ['avís de pas que falla', 'av.push(IDIOMA==="es"?("⚠ PASO DE COMPROBACIÓN', 'void(IDIOMA==="es"?("⚠ PASO DE COMPROBACIÓN'],
  ['0.500 decimal', '/^-?0\\.\\d+$/.test(_v0)?parseFloat(_v0):', ''],
  ['Població de l\'esborrany', 'if($("#h_ciutat"))$("#h_ciutat").value=HEADER.ciutat||"";', ''],
  ['aprendre amb avís', 'if(String(r.flag||"").trim()) continue;', ''],
];
for (const [nom, de, a] of PECES) { const H = trenca(H0, de, a); if (!H) { check('peça trencada «' + nom + '»: el codi hi és', false, 'no trobo: ' + de.slice(0, 60)); continue; }
  const ok0 = ok, ko0 = ko, log = console.log, err = console.error; console.log = () => {}; console.error = () => {};
  try { tot(H, '(rota) '); } catch (e) { ko++; } finally { console.log = log; console.error = err; }
  const caigut = ko > ko0; ok = ok0; ko = ko0; check('peça trencada «' + nom + '»: el guardià ho veu', caigut); }
console.log(`\n${ok} OK · ${ko} X`); process.exit(ko ? 1 : 0);
