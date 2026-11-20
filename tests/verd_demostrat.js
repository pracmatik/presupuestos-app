#!/usr/bin/env node
'use strict';
/*
 * Guardià · 13/11/2026 · EL VERD VOL DIR DEMOSTRAT CONTRA EL DOCUMENT.
 *
 * Per què existeix. Mesurat amb el banc i amb documents públics: hi havia files en verd (comprovada) que eren errònies (repetides, fantasma amb
 * quantitat 0, al capítol o la zona que no tocava, «demostrades» per un preu descompost a×b=c, partides opcionals que sumaven com les altres).
 * Una fila verda ha de ser la del document, sencera. Si el document no ho demostra tot, la fila queda «sense prova» (mai vermella falsa) i
 * no es toca cap quantitat, text ni marca.
 * Què vigila, amb documents inventats en català i castellà (cap dada de cap client):
 *  1) dues files sobre les mateixes línies del document: cap de les dues és verda;
 *  2) quantitat 0: mai verda;
 *  3) la fila al capítol que no és el del document (llibre de capítols): no és verda;
 *  4) «quantitat preu import» sense saber quina columna és la quantitat: el triplet no demostra res; amb la capçalera de columnes, sí
 *     (i la fila que porta el preu com a quantitat no és verda);
 *  5) partida d'un capítol opcional que suma: no és verda;
 *  6) les partides bones del mateix document continuen verdes, i cap fila canvia de quantitat, unitat, text ni marca;
 *  7) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
// treu una funció (o una constant d'una línia) de l'app pel nom
function extFnB(H, n) { let m = new RegExp('\\nfunction\\s+' + n + '\\s*\\(').exec(H);
  if (!m) { m = new RegExp('\\n(?:const|let|var)\\s+' + n + '\\s*=').exec(H); return m ? H.slice(m.index + 1, H.indexOf('\n', m.index + 1)) : ''; }
  const b = H.indexOf('{', m.index); let d = 0, i = b;
  for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) { i++; break; } } } return H.slice(m.index + 1, i); }
// el segell amb les eines de lectura; les peces de fora del bloc que fa servir (llibre de capítols) s'afegeixen soles fins que no en falta cap
function segell(H, idioma, prova) { const i = H.indexOf('// ==== INICI EINES DE LECTURA ===='), f = H.indexOf('// ==== FI EINES DE LECTURA ===='), a = H.indexOf('// 06/10/2026 (Z11) · SEGELL PER PARTIDA'), b = H.indexOf('// ── fi del segell per partida (Z11) ──');
  if (i < 0 || f < 0 || a < 0 || b < 0) return null; const ex = ['_p10Libro'];
  for (let k = 0; k < 40; k++) { let T, err = null;
    try { T = new Function('IDIOMA', 'window', 'console', [extFnB(H, '_dehyphen'), ...ex.map(n => extFnB(H, n)), H.slice(i, f), H.slice(a, b)].join('\n') +
      '\nreturn {segell:segellPartides, llibre:(typeof _p10Libro==="function"?_p10Libro:_llibreCapcaleres)};')(idioma, {}, { warn() {}, log() {}, info() {} });
      T.llibre(prova.join('\n'), files(prova)); } catch (e) { err = e; }
    const m = err && /(\w+) is not defined/.exec(String(err)); if (!err) return T;
    if (!m || ex.includes(m[1]) || !extFnB(H, m[1])) return null; ex.push(m[1]); } return null; }

const CA = ['PRESSUPOST D\'EXEMPLE', '1 COBERTES',
  '1.1 m² Impermeabilització de coberta plana 140,00', 'Làmina de betum modificat amb armadura de feltre de polièster.', 'ZONA 1 1,00 65,00', 'ZONA 2 1,00 75,00',
  '1.2 m² Paviment de rajola sobre suport 140,00', 'Rajola ceràmica col·locada amb morter adhesiu i junta.', 'ZONA 1 1,00 65,00', 'ZONA 2 1,00 75,00',
  '1.3 u Prova d\'estanqueïtat de la coberta 2,00', 'Prova d\'inundació durant 24 hores amb dics de contenció.', 'ZONA 1 1,00 1,00', 'ZONA 2 1,00 1,00',
  '1.4 u Retirada de runa de la coberta 0,00', 'Càrrega manual de runa sobre contenidor.', 'ZONA 1 0,00 0,00',
  '2 DESGUASSOS',
  '2.1 ml Connexió de baixant de PVC 2,00', 'Tub de PVC de 125 mm amb accessoris i peces especials.', 'BAIXANT 1 1,00 1,00', 'BAIXANT 2 1,00 1,00',
  '2.2 m² Arrebossat de mur amb morter de calç 36,00', 'Arrebossat en tres capes amb acabat remolinat.', 'zona 4 4,50 2,00 36,00',
  '2.3 ml Canal de planxa de zinc 12,00 3,50 42,00', 'Canal de zinc de 0,8 mm amb suports.',
  '3 PARTIDES OPCIONALS',
  '3.1 m² Pintura de façana 20,00', 'Pintura plàstica en dues capes.', 'ZONA 1 1,00 8,00', 'ZONA 2 1,00 12,00'];
const TR = [['PRESSUPOST D\'EXEMPLE', 'PRESUPUESTO DE EJEMPLO'], ['1 COBERTES', '1 CUBIERTAS'], ['2 DESGUASSOS', '2 DESAGÜES'], ['3 PARTIDES OPCIONALS', '3 PARTIDAS OPCIONALES'],
  ['Impermeabilització de coberta plana', 'Impermeabilización de cubierta plana'], ['Paviment de rajola sobre suport', 'Pavimento de baldosa sobre soporte'],
  ['Prova d\'estanqueïtat de la coberta', 'Prueba de estanqueidad de la cubierta'], ['Retirada de runa de la coberta', 'Retirada de escombros de la cubierta'],
  ['Connexió de baixant de PVC', 'Conexión de bajante de PVC'], ['Arrebossat de mur amb morter de calç', 'Enfoscado de muro con mortero de cal'],
  ['Canal de planxa de zinc', 'Canalón de chapa de zinc'], ['Pintura de façana', 'Pintura de fachada'], ['BAIXANT', 'BAJANTE']];
const ES = CA.map(l => TR.reduce((s, [a, b]) => s.replace(a, b), l));
const P = (d, ut, q) => ({ tipo: 'part', num: '', desc: d, ut, amid: q, preu: 0 });
function files(txt) { const r = [];
  txt.forEach((l, k) => { if (/^\d \w/.test(l)) { r.push({ tipo: 'cap', desc: l }); return; } const m = l.match(/^(\d\.\d) (m²|ml|u) (.*?) (\d+,\d\d)(?: [\d,]+ [\d,]+)?$/);
    if (m) r.push(P(m[1] + ' ' + m[2] + ' ' + m[3] + '\n- ' + txt[k + 1], m[2] === 'm²' ? 'm2' : m[2], parseFloat(m[4].replace(',', '.')))); }); return r; }
const per = (o, codi) => o && o.cs.filter(c => c.codi === codi);
const est = (o, codi) => (per(o, codi) || []).map(c => c.estat).join(',');
const BONES = ['1.1', '1.2', '1.3', '2.1', '2.2'];
const fixa = rs => JSON.stringify(rs.map(r => [r.tipo, r.desc, r.ut, r.amid, r.flag || '']));

// tots els casos d'un idioma; torna true si tot és com ha de ser (per als trencats)
function casos(T, L, ES_, diu) { let tot = true; const c = (n, v, x) => { tot = tot && !!v; if (diu) check(n, v, x); };
  const s = L.join('\n'), rows = files(L), cap2 = L.find(l => /^2 /.test(l)), cap1 = L.find(l => /^1 /.test(l));
  // 6) document net: les bones, verdes; 1.4 (zero), 2.3 (preu sense columna) i 3.1 (opcional) no
  const abans = fixa(rows), o = T.segell(rows, s, [], ES_);
  for (const k of BONES) c(`${diu} ${k} bona → COMPROVADA`, est(o, k) === 'comprovada', est(o, k));
  c(`${diu} 2) quantitat 0 → mai verda`, est(o, '1.4') === 'sense_prova', est(o, '1.4'));
  c(`${diu} 4) a×b=c sense saber la columna → no demostra`, est(o, '2.3') === 'sense_prova', est(o, '2.3'));
  c(`${diu} 5) capítol opcional que suma → no verda`, est(o, '3.1') === 'sense_prova', est(o, '3.1'));
  c(`${diu} 6) cap quantitat, unitat, text ni marca canviada`, fixa(rows) === abans, fixa(rows));
  // 1) la mateixa partida dues vegades sobre les mateixes línies
  const dup = files(L); dup.splice(2, 0, Object.assign({}, dup[1])); const od = T.segell(dup, s, [], ES_);
  c(`${diu} 1) fila repetida → cap de les dues verda`, est(od, '1.1') === 'sense_prova,sense_prova' && est(od, '1.2') === 'comprovada', est(od, '1.1'));
  // 3) les partides del capítol 2 llegides dins del capítol 1
  const mal = files(L).map(r => r.desc === cap2 ? Object.assign({}, r, { desc: cap1 }) : r), om = T.segell(mal, s, [], ES_);
  c(`${diu} 3) capítol que no és el del document → no verda`, ['2.1', '2.2'].every(k => est(om, k) === 'sense_prova') && est(om, '1.1') === 'comprovada', ['2.1', '2.2', '1.1'].map(k => est(om, k)));
  c(`${diu} 3) sense vermell fals`, om.cs.every(x => x.estat !== 'marcada'), om.cs.map(x => x.estat));
  // 4) amb la capçalera de columnes, el triplet sí demostra la quantitat; el preu posat de quantitat, no
  const L2 = L.slice(); L2.splice(1, 0, ES_ ? 'Código Ud Resumen Cantidad Precio Importe' : 'Codi Ut Resum Quantitat Preu Import');
  const oq = T.segell(files(L2), L2.join('\n'), [], ES_), r35 = files(L2).map(r => /^2\.3/.test(r.desc) ? Object.assign({}, r, { amid: 3.5 }) : r), op = T.segell(r35, L2.join('\n'), [], ES_);
  c(`${diu} 4) amb la columna de quantitat: 12 → COMPROVADA`, est(oq, '2.3') === 'comprovada', est(oq, '2.3'));
  c(`${diu} 4) el preu 3,50 com a quantitat → no verda`, est(op, '2.3') === 'sense_prova', est(op, '2.3'));
  return tot; }

const H = H0, T = segell(H, 'ca', CA), TE = segell(H, 'es', ES);
check('el segell es carrega', !!T && !!TE);
if (T && TE) {
  casos(T, CA, false, 'ca');
  casos(TE, ES, true, 'es');
  // 7) cada peça trencada es veu
  const trenca = (de, a) => { const s = H.replace(de, a); return s === H ? null : s; };
  const peces = [
    ['sense la regla de les repetides', 'if(rep.has(c)) m.push("repetida");', ''],
    ['sense la regla del zero', 'if(c.q===0) m.push("zero");', ''],
    ['sense la regla del capítol', 'if(LL&&!_sgCapOk(c,t,P,D,TX)) m.push("capitol");', ''],
    ['sense la regla del preu descompost', 'if(!_sgProves(D,c,pos).length) m.push("preu");', ''],
    ['sense la regla de l\'opcional', 'if(_sgOpcional(c,t,P)) m.push("opcional");', ''],
    ['sense l\'estat que ho aplica', 'if(c.res.ok.length&&c.noVerd&&c.noVerd.length) return "sense_prova";', ''],
  ];
  for (const [nom, de, a] of peces) { const H2 = trenca(de, a); if (!H2) { check('peça trobada: ' + nom, false, 'no hi és'); continue; }
    const T2 = segell(H2, 'ca', CA); check('trencat es veu: ' + nom, !T2 || !casos(T2, CA, false, '')); }
}
console.log(`\n${ok} OK · ${ko} X`); process.exit(ko ? 1 : 0);
