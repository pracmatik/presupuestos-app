#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 29 (19/10/2026) · LA PARTIDA SENSE CODI QUE LA LECTURA AJUNTA AMB LA DE SOBRE, I L'OPCIONAL AMB LA UNITAT AL DAVANT.
 * Documents inventats, castellà i català, cap dada de cap client (va també al repositori públic).
 *  1) el document escriu «4 m2 TÍTOL … 18,90» i a sota, sense codi, «Text… 396,00» (+ una línia de continuació): la lectura en fa UNA fila amb
 *     396 (o 414,90) → dues files com al document (18,90 i 396), marca a les dues, avís; les partides de sota del capítol i els avisos que les
 *     citaven tornen un número;
 *  2) la fila porta una altra quantitat → no es toca res i es marca a la fila (mai en silenci);
 *  3) el que NO s'ha de tocar: dues files ja separades; una línia de mesura a sota («Zona norte 13,06 22 287,32»); una continuació en minúscula;
 *  4) la partida OPCIONAL de sota amb la unitat al davant («m2 OPCIONAL Según…»): el text de la de dalt no se l'empassa;
 *  5) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + x : '')); } };
const trenca = (src, de, a) => { const s = src.replace(de, a); return s === src ? null : s; };
const eines = H => { try { const b = H.match(/\/\/ ==== INICI EINES DE LECTURA ====([\s\S]*?)\/\/ ==== FI EINES DE LECTURA ====/)[1];
  const deh = (H.match(/function _dehyphen\(s\)\{[^\n]*\}/) || [''])[0] + '\n' + ((H.match(/^const parseNum=.*$/m) || [''])[0]) + '\n' + ((H.match(/^const num2=.*$/m) || [''])[0]);
  return new Function('IDIOMA', deh + '\nfunction nomZonaDelDocument(){ return null; }\nfunction pctPerDefecte(){ return null; }\n' + b +
    '\nreturn {ps:(typeof partidaSenseCodiAjuntada==="function"?partidaSenseCodiAjuntada:null), rep:(typeof repairDescsFromSource==="function"?repairDescsFromSource:null)};')('es'); } catch (e) { return null; } }
const D = {
  es: { tit: 'Pintura en interior de patio central si se pinta la zona tratada', b1: 'Se valorará según el coste la opción de pintar la totalidad de los patios interiormente- total ambos',
        b2: 'patios m2 sin descontar huecos', sig: 'Limpieza de canalones de la cubierta y retirada de restos a contenedor autorizado', cap: '3 CUBIERTAS',
        gr: 'Sellado de fisuras mediante junta flexible de mortero sintético de resinas epoxi.', gr2: 'Acabado superficial con mortero de granulado similar al existente.',
        op: 'OPCIONAL Según se determine el estado del muro y su firmeza se procederá a rehacer la', op2: 'parte dañada con ladrillo macizo a buena vista con mortero de cal en', op3: 'las dos caras, en lugar del sellado',
        cont: 'incluso p.p. de medios auxiliares y retirada de escombros' },
  ca: { tit: 'Pintura a l\'interior del pati central si es pinta la zona tractada', b1: 'Es valorarà segons el cost l\'opció de pintar la totalitat dels patis per dins- total tots dos',
        b2: 'patis m2 sense descomptar forats', sig: 'Neteja de canals de la coberta i retirada de restes a contenidor autoritzat', cap: '3 COBERTES',
        gr: 'Segellat de fissures mitjançant junta flexible de morter sintètic de resines epoxi.', gr2: 'Acabat superficial amb morter de granulat semblant a l\'existent.',
        op: 'OPCIONAL Segons es determini l\'estat del mur i la seva fermesa es procedirà a refer la', op2: 'part malmesa amb maó massís a bona vista amb morter de calç a', op3: 'les dues cares, en lloc del segellat',
        cont: 'inclosa la part proporcional de mitjans auxiliars i retirada de runa' } };
const docDe = d => ['2 PINTURA', '2.1 m2 ' + d.tit + ' 18,90', d.b1 + ' 396,00', d.b2, '2.2 m ' + d.sig + ' 12,00', '2.3 m2 ' + d.gr, d.gr2 + ' 12,00', d.op, 'm2 ' + d.op2, d.op3 + ' 12,80',
  '2.4 m2 Revoco a buena vista de cara exterior de muretes laterales de los patios centrales 18,90', d.cap, '3.1 m ' + d.sig + ' 40,00',
  'Zona norte 13,06 22 287,32', 'Afectación de la zona tratada del patio 15% 43,10'].join('\n') + '\n' + 'Texto de relleno del documento para que tenga el tamaño de un documento real. '.repeat(6);
const files = (d, q) => [{ tipo: 'cap', num: '2', desc: 'PINTURA' }, { tipo: 'part', num: '2.1', ut: 'm²', amid: q, desc: 'm2 ' + d.tit + '\n' + d.b1 + ' 396,00\n' + d.b2 },
  { tipo: 'part', num: '2.2', ut: 'm', amid: 12, desc: 'm ' + d.sig }, { tipo: 'cap', num: '3', desc: d.cap }, { tipo: 'part', num: '3.1', ut: 'm', amid: 40, desc: 'm ' + d.sig }];
const prova = (T, es, d, q) => { const rows = files(d, q), av = ['⚠ 1 cantidad(es): 2.2 (12 / documento 12). Compruébalo.']; const n = T.ps(rows, docDe(d), av, es); return { n, rows, av }; };
const parts = rows => rows.filter(r => r.tipo === 'part');
function comprova(T, etiqueta) {
  for (const [ll, es] of [['es', true], ['ca', false]]) { const d = D[ll];
    for (const q of [396, 414.9]) { const { n, rows, av } = prova(T, es, d, q); const p = parts(rows);
      check(`${etiqueta} ${ll} · fila amb ${q}: es parteix en dues (18,90 i 396)`, n === 1 && p.length === 4 && +p[0].amid === 18.9 && +p[1].amid === 396, p.map(r => r.num + ' ' + r.amid).join(', '));
      check(`${etiqueta} ${ll} · fila amb ${q}: la de dalt es queda el seu text i la nova el de sota (literal del document)`, p[0] && !/valorar|valora/i.test(p[0].desc) && p[1] && p[1].desc.indexOf(d.b1) === 0 && p[1].desc.indexOf(d.b2) > 0 && !/396/.test(p[1].desc), JSON.stringify(p.slice(0, 2).map(r => r.desc)).slice(0, 220));
      check(`${etiqueta} ${ll} · fila amb ${q}: marca a les dues files i avís`, /SEPARADO|SEPARAT/.test(p[0].flag || '') && /SIN CÓDIGO|SENSE CODI/.test(p[1].flag || '') && av.some(a => /sin código iban dentro|sense codi anaven dins/.test(a)));
      check(`${etiqueta} ${ll} · fila amb ${q}: les de sota tornen un número i l'avís que les citava també`, p[1].num === '2.2' && p[2].num === '2.3' && p[3].num === '3.1' && av[0].indexOf('2.3 (12') >= 0, p.map(r => r.num).join(',') + ' · ' + av[0]); }
    { const { n, rows, av } = prova(T, es, d, 50); const p = parts(rows);
      check(`${etiqueta} ${ll} · fila amb una altra quantitat (50): no es parteix, però es marca a la fila i es diu`, n === 0 && p.length === 3 && /POSIBLE PARTIDA SIN CÓDIGO|POSSIBLE PARTIDA SENSE CODI/.test(p[0].flag || '') && av.some(a => /pueden llevar dentro|poden portar a dins/.test(a)), (p[0].flag || '') + ' · ' + p.length); }
    { const rows = [{ tipo: 'part', num: '2.1', ut: 'm²', amid: 18.9, desc: 'm2 ' + d.tit }, { tipo: 'part', num: '2.2', ut: 'm²', amid: 396, desc: d.b1 + '\n' + d.b2 }], av = [];
      check(`${etiqueta} ${ll} · dues files ja separades: no es toca res`, T.ps(rows, docDe(d), av, es) === 0 && rows.length === 2 && !rows[0].flag && !rows[1].flag && !av.length); }
    { const rows = [{ tipo: 'part', num: '3.1', ut: 'm', amid: 43.1, desc: 'm ' + d.sig + '\nZona norte 13,06 22 287,32\nAfectación de la zona tratada del patio 15% 43,10' }], av = [];
      check(`${etiqueta} ${ll} · línies de mesura a sota: no és cap partida sense codi`, T.ps(rows, docDe(d), av, es) === 0 && rows.length === 1 && !rows[0].flag); }
    { const doc = docDe(d).replace(d.b1 + ' 396,00', d.cont + ' 396,00'); const rows = [{ tipo: 'part', num: '2.1', ut: 'm²', amid: 396, desc: 'm2 ' + d.tit + '\n' + d.cont + ' 396,00\n' + d.b2 }], av = [];
      check(`${etiqueta} ${ll} · continuació en minúscula: no es toca`, T.ps(rows, doc, av, es) === 0 && rows.length === 1 && !rows[0].flag); }
    if (T.rep) { const rows = [{ tipo: 'part', num: '2.3', ut: 'm²', amid: 12, desc: 'm2 ' + d.gr + '\n' + d.gr2 }, { tipo: 'part', num: '2.4', ut: 'm²', amid: 12.8, desc: 'm2 ' + d.op + '\nm2 ' + d.op2 + '\n' + d.op3 }], av = [];
      try { T.rep(rows, docDe(d), av); } catch (e) { }
      check(`${etiqueta} ${ll} · l'opcional de sota amb «m2» al davant: el text de la de dalt no se l'empassa`, rows[0] && !/OPCI/i.test(rows[0].desc) && rows[0].desc.indexOf(d.gr2.slice(0, 20)) >= 0, JSON.stringify(rows[0].desc).slice(0, 220)); }
  } }
const T = eines(H0);
console.log('LOT 29 · PARTIDA SENSE CODI AJUNTADA I OPCIONAL AMB LA UNITAT AL DAVANT — ' + path.basename(HTML));
if (!T || !T.ps) { check('trobo partidaSenseCodiAjuntada a l\'app', false); console.log('\n' + ok + ' OK · ' + ko + ' fallades'); process.exit(1); }
comprova(T, 'app');
// ── 5) cada peça trencada es veu ──
const PECES = [
  ['sense la crida a la funció nova (la fila es queda ajuntada)', H => trenca(H, /function partidaSenseCodiAjuntada\(rows,src,avisos,es\)\{\n  if\(/, 'function partidaSenseCodiAjuntada(rows,src,avisos,es){ return 0;\n  if(')],
  ['sense mirar la quantitat de sota (es parteix qualsevol fila)', H => trenca(H, 'if(!(Math.abs(am-q2)<0.005||Math.abs(am-(q1+q2))<0.005)){', 'if(false){')],
  ['sense distingir les línies de mesura', H => trenca(H, 'return w.filter(x=>/^[A-Za-zÀ-ÿ¿(«"\'-]*[A-Za-zÀ-ÿ]{3,}/.test(x)).length>=4&&', 'return true||')],
  ['sense renumerar les de sota', H => trenca(H, 'REN.set(v,nv); x.num=nv;', 'REN.set(v,nv);')],
  ['sense la majúscula de la línia de sota', H => trenca(H, '||!/^[A-ZÀ-ÝÑÇ¿]/.test(P[k])', '')],
  ['l\'opcional amb la unitat al davant, com abans', H => trenca(H, '/i.test(_kd)){ const kk=_cleanLit(_kd)', '/i.test(String(k.desc||""))){ const kk=_cleanLit(k.desc)')]];
for (const [nom, f] of PECES) { const H = f(H0); if (!H) { check('peça trencada «' + nom + '»: trobo el codi a trencar', false); continue; }
  const T2 = eines(H); if (!T2 || !T2.ps) { check('peça trencada «' + nom + '» es veu', true); continue; }
  const o = ok, k = ko; const log = console.log, err = console.error; console.log = () => { }; console.error = () => { };
  try { comprova(T2, 'x'); } catch (e) { ko++; } console.log = log; console.error = err; const caigudes = ko - k; ok = o; ko = k;
  check('peça trencada «' + nom + '» es veu (' + caigudes + ' comprovacions cauen)', caigudes > 0); }
console.log('\n' + ok + ' OK · ' + ko + ' fallades');
process.exit(ko ? 1 : 0);
