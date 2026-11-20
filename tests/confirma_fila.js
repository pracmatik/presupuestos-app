#!/usr/bin/env node
'use strict';
/*
 * Guardià · 13/11/2026 (fase 3) · CONFIRMAR AMB UN CLIC LA FILA DUBTOSA, AMB LA LÍNIA DEL DOCUMENT AL COSTAT.
 *
 * Per què existeix. Promesa de venda: el que és verd està demostrat contra el document; tota la resta es veu marcat; cap error amagat. Una fila que el segell no dona per
 * demostrada (marcada o sense prova) ha de poder-se mirar al costat de la línia del document i confirmar amb UN clic, sense finestres ni passos nous (criteri escrit de la
 * direcció del client, 07/09: el sistema aplica el que té establert, el tècnic ho pot canviar, les preguntes fan perdre temps). La confirmació és de la persona: mai no
 * converteix la fila en verda, es veu amb nom i hora, es desa amb el pressupost i desapareix sola si la fila canvia.
 * Què vigila, amb documents inventats en català i castellà (cap dada de cap client):
 *  1) el segell de sempre no canvia (mateix resultat, cap fila toca quantitat, unitat, text ni marca) i només les files dubtoses porten estat i línies del document;
 *  2) el botó només surt a files no verdes; la línia (o les línies) del document surt tal qual; sense línia ho diu;
 *  3) un clic confirma: nom i hora, una entrada al llibre d'activitat, desfer, cap canvi a la fila; i la fila confirmada MAI és verda;
 *  4) es desa amb el pressupost i sobreviu a recarregar; 5) editar text, unitat, quantitat o preu (o una línia de càlcul) treu la confirmació;
 *  6) el comptador «N files per comprovar · M confirmades pel tècnic»; 7) català i castellà, textos i llibre d'activitat;
 *  8) si alguna cosa peta, es veu (avís o missatge), mai en silenci; 9) cablejat: res al tram de lectura, res bloquejant; 10) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };

function ext(n, HH = H) { let m = new RegExp('\\n(?:async\\s+)?function\\s+' + n + '\\s*\\(').exec(HH);
  if (!m) { m = new RegExp('\\n(?:const|let|var)\\s+' + n + '\\s*=').exec(HH); return m ? HH.slice(m.index + 1, HH.indexOf('\n', m.index + 1)) : ''; }
  const b = HH.indexOf('{', m.index); let d = 0, i = b; for (; i < HH.length; i++) { if (HH[i] === '{') d++; else if (HH[i] === '}') { d--; if (d === 0) { i++; break; } } } return HH.slice(m.index + 1, i); }
const FN = ['_cfNet', '_cfLinies', '_cfCaptura', '_cfNum', '_cfHash', '_cfValida', '_cfMarcada', '_cfDubtosa', '_cfPurga', '_cfFalla', '_cfQuan', '_cfQui', '_cfPanel', '_cfBadge', '_cfConfirma', '_cfResum', '_cfRefresca', '_cfAb'];
const falten = FN.filter(n => !ext(n));
check('l\'app té totes les peces (' + FN.length + ')', falten.length === 0, 'falten: ' + falten.join(', '));
const B0 = H.indexOf('const _cfAb='), B1 = H.indexOf('function renderResum(){', B0), BLK = B0 > 0 && B1 > B0 ? H.slice(B0, B1) : '';
check('el bloc nou és sencer i va fora del tram de lectura (després de la lectura, abans del resum)', BLK.length > 500 && B0 > H.indexOf('const _draftIA=') && B1 > B0);

const i0 = H.indexOf('\nconst I18N={'), i1 = H.indexOf('\nconst t = k =>');
let I18N = null; try { I18N = new Function(H.slice(i0 + 1, i1) + '\nreturn I18N;')(); } catch (e) { check('els diccionaris de textos es poden carregar', false, e.message); }
const claus = ['cf_pend', 'cf_conf', 'cf_tt', 'cf_estat_s', 'cf_estat_m', 'cf_linia', 'cf_sense', 'cf_btn', 'cf_qui', 'cf_resum', 'cf_ok', 'cf_err', 'cf_fall'];
const TXT = { ca: { cf_btn: 'Comprovat amb el document', cf_conf: 'Confirmada pel tècnic', cf_sense: 'Sense línia del document', cf_resum: '{p} files per comprovar · {c} confirmades pel tècnic' },
  es: { cf_btn: 'Comprobado con el documento', cf_conf: 'Confirmada por el técnico', cf_sense: 'Sin línea del documento', cf_resum: '{p} filas por comprobar · {c} confirmadas por el técnico' } };
if (I18N) {
  const perd = ['ca', 'es'].map(l => claus.filter(k => !I18N[l][k]).map(k => l + ':' + k)).flat();
  check('7) tots els textos hi són en català i en castellà', perd.length === 0, perd.join(', '));
  check('7) cap text és igual en les dues llengües (cap sense traduir)', claus.filter(k => I18N.ca[k] === I18N.es[k]).length === 0);
  for (const l of ['ca', 'es']) for (const k in TXT[l]) check('7) ' + l + ' ' + k + ' diu el que toca', (I18N[l][k] || '').startsWith(TXT[l][k]), I18N[l][k]);
  const tots = ['ca', 'es'].map(l => claus.map(k => I18N[l][k] || '').join('\n')).join('\n');
  check('7) sense cometes ni ratlles llargues als textos nous', !/[«»"“”]|—/.test(tots.replace(/\{[a-z]\}/g, '')));
  check('7) cap frase prohibida de baixa als textos nous', !/no\s+(?:et\s+|te\s+)?(?:tornem|volvemos|vuelvo|torno)\s+a\s+escriure|no\s+vol(?:vemos|vuelvo)\s+a\s+escribir/i.test(tots));
  check('7) el llibre d\'activitat té la frase de persona en les dues llengües i el grup «documents» la recull', H.split('confirmacio_fila:"ha ').length === 3 && /documents:a=>\/\^\([^)]*confirmacio_/.test(H));
  check('7) la confirmació no diu que sigui una prova del programa: ho diu una persona', /persona/.test(I18N.ca.cf_qui) && /persona/.test(I18N.es.cf_qui) && /no és una prova/.test(I18N.ca.cf_qui) && /no es una prueba/.test(I18N.es.cf_qui));
}

// ═════════ 1) el segell de sempre i les files dubtoses (documents inventats) ═════════
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
const fixa = rs => JSON.stringify(rs.map(r => [r.tipo, r.desc, r.ut, r.amid, r.flag || '']));
const copia = rs => JSON.parse(JSON.stringify(rs));

// el segell de producció amb les seves eines (com el guardià del verd demostrat) i, si hi és, l'embolcall nou; mut canvia el text per trencar una peça
function segell(HH, idioma, prova, ambEmbolcall, mut) { const i = HH.indexOf('// ==== INICI EINES DE LECTURA ===='), f = HH.indexOf('// ==== FI EINES DE LECTURA ===='), a = HH.indexOf('// 06/10/2026 (Z11) · SEGELL PER PARTIDA'), b = HH.indexOf('// ── fi del segell per partida (Z11) ──');
  if (i < 0 || f < 0 || a < 0 || b < 0) return null; const ex = ['_p10Libro'];
  const w0 = HH.indexOf('const _cfSegellOrig=segellPartides;'), w1 = HH.indexOf('function _cfNum(');
  const emb = ambEmbolcall && w0 > 0 && w1 > w0 ? [ext('_cfNet', HH), ext('_cfLinies', HH), ext('_cfCaptura', HH), HH.slice(w0, w1)].join('\n') : '';
  for (let k = 0; k < 40; k++) { let T, err = null;
    try { let code = [ext('_dehyphen', HH), ...ex.map(n => ext(n, HH)), HH.slice(i, f), HH.slice(a, b), emb].join('\n') + '\nreturn {segell:segellPartides, llibre:(typeof _p10Libro==="function"?_p10Libro:_llibreCapcaleres)};';
      if (mut) code = mut(code);
      T = new Function('IDIOMA', 'window', 'console', code)(idioma, {}, { warn() {}, log() {}, info() {} }); T.llibre(prova.join('\n'), files(prova)); } catch (e) { err = e; }
    const m = err && /(\w+) is not defined/.exec(String(err)); if (!err) return T;
    if (!m || ex.includes(m[1]) || !ext(m[1], HH)) return null; ex.push(m[1]); } return null; }

const quitaCf = rs => rs.map(r => { const o = Object.assign({}, r); delete o.sg; delete o.sgL; delete o.cf; return o; });
function casSegell(idioma, L, ES_) {
  const T = segell(H, idioma, L, true), T0 = segell(H, idioma, L, false); const dia = idioma + ' ';
  check('1) ' + dia + 'el segell es carrega amb l\'embolcall', !!T && !!T0); if (!T || !T0) return;
  const s = L.join('\n'), rows = copia(files(L)), base = copia(files(L)), av = [], av0 = [];
  const o = T.segell(rows, s, av, ES_), o0 = T0.segell(base, s, av0, ES_);
  check('1) ' + dia + 'el segell dóna el mateix resultat que sense l\'embolcall (comptes, estats, avisos)', JSON.stringify(o.n) === JSON.stringify(o0.n) && JSON.stringify(o.cs.map(c => c.estat)) === JSON.stringify(o0.cs.map(c => c.estat)) && JSON.stringify(av) === JSON.stringify(av0), JSON.stringify([o.n, o0.n]));
  check('1) ' + dia + 'cap fila canvia de quantitat, unitat, text ni marca (només s\'hi afegeixen l\'estat i les línies)', fixa(rows) === fixa(base) && JSON.stringify(quitaCf(rows)) === JSON.stringify(quitaCf(base)));
  check('1) ' + dia + 'les files verdes (comprovada) no porten ni estat ni línies', ['1.1', '1.2', '1.3', '2.1', '2.2'].every(k => per(o, k).every(c => c.estat === 'comprovada' && c.r.sg === undefined && c.r.sgL === undefined && c.r.cf === undefined)));
  const sp = ['1.4', '2.3', '3.1'].map(k => per(o, k)[0]);
  check('1) ' + dia + 'les files sense prova porten sg=s', sp.every(c => c.estat === 'sense_prova' && c.r.sg === 's'), sp.map(c => c.estat + c.r.sg));
  const t14 = L.find(l => /^1\.4 /.test(l)), t23 = L.find(l => /^2\.3 /.test(l)), t31 = L.find(l => /^3\.1 /.test(l));
  check('2) ' + dia + 'la línia del document surt tal qual (la de la partida) i mai més de 3 línies de 180 lletres', per(o, '1.4')[0].r.sgL[0] === t14 && per(o, '2.3')[0].r.sgL[0] === t23 && per(o, '3.1')[0].r.sgL[0] === t31 && sp.every(c => c.r.sgL.length >= 1 && c.r.sgL.length <= 3 && c.r.sgL.every(x => x.length <= 180)), JSON.stringify(sp.map(c => c.r.sgL)));
  check('2) ' + dia + 'cada línia és una línia que hi és al document', sp.every(c => c.r.sgL.every(x => L.some(l => l.replace(/\s+/g, ' ').trim() === x))));
  check('2) ' + dia + 'el que no es pot localitzar no s\'inventa res: cap línia', (() => { const r = copia(files(L)); r.push({ tipo: 'part', num: '', desc: '9.9 u Partida que no surt\n- text', ut: 'u', amid: 3, preu: 0 }); const oo = T.segell(r, s, [], ES_), c = oo.cs[oo.cs.length - 1]; return c.estat === 'marcada' && c.r.sg === 'm' && c.r.sgL === undefined; })());
  check('1) ' + dia + 'una fila marcada porta sg=m i, si el document la té, la seva línia (el document hi posa una altra unitat)', (() => { const doc = L.map(l => l.replace(/^1\.1 m² /, '1.1 ml ')), T2 = segell(H, idioma, doc, true); if (!T2) return false;
    const r = copia(files(L)), oo = T2.segell(r, doc.join('\n'), [], ES_), c = per(oo, '1.1')[0]; return c.estat === 'marcada' && c.r.sg === 'm' && /NO QUADRA|NO CUADRA/.test(c.r.flag) && Array.isArray(c.r.sgL) && c.r.sgL[0] === doc.find(l => /^1\.1 /.test(l)); })());
  check('1) ' + dia + 'tornar a passar el segell esborra l\'estat vell (una fila que ja és verda no el conserva)', (() => { const r = copia(files(L)); r.forEach(x => { if (x.tipo === 'part') { x.sg = 's'; x.sgL = ['vella']; } }); T.segell(r, s, [], ES_); return r.filter(x => /^1\.1 /.test(x.desc))[0].sg === undefined && r.filter(x => /^1\.1 /.test(x.desc))[0].sgL === undefined; })());
  check('8) ' + dia + 'si apuntar les línies peta, el segell surt igual i es diu a l\'avís de la lectura (visible, no en silenci)', (() => {
    const Tm = segell(H, idioma, L, true, c => c.replace('function _cfCaptura(R,src){', 'function _cfCaptura(R,src){ throw new Error("prova");')); if (!Tm) return false;
    const r = copia(files(L)), a = [], oo = Tm.segell(r, s, a, ES_); return !!oo && oo.cs.length > 0 && a.some(x => /(QUE HA FALLAT|QUE HA FALLADO) \(.confirmar fila/.test(x)); })());
}
for (const [i_, L_, e_] of [['ca', CA, false], ['es', ES, true]]) { try { casSegell(i_, L_, e_); } catch (e) { check('1) ' + i_ + ' el segell amb l\'embolcall no peta', false, e.message); } }

// ═════════ la pantalla de mentida: etiqueta, panell, clic, comptador ═════════
class El { constructor(tag) { this.tag = tag; this.id = ''; this.className = ''; this.children = []; this.parentNode = null; this._t = ''; this.l = {}; this.removed = false; }
  set textContent(v) { this._t = String(v); } get textContent() { return this._t; }
  insertBefore(c, ref) { const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); c.parentNode = this; return c; }
  get nextSibling() { const p = this.parentNode; if (!p) return null; const i = p.children.indexOf(this); return p.children[i + 1] || null; }
  remove() { this.removed = true; if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); this.parentNode = null; } }
function mon(opt = {}) {
  const wrap = new El('div'), av = new El('details'); av.id = 'lectAvisos'; if (!opt.senseLloc) wrap.insertBefore(av, null);
  const calls = { render: 0, undo: 0, toast: [], log: [], listeners: {} }, TB = { addEventListener: (t, f) => { (calls.listeners[t] = calls.listeners[t] || []).push(f); } };
  const doc = { getElementById: id => id === 'cfResum' ? (wrap.children.find(e => e.id === 'cfResum') || null) : id === 'lectAvisos' ? (opt.senseLloc ? null : av) : null, createElement: tag => new El(tag),
    querySelectorAll: sel => /data-cfwhy/.test(sel) ? [3, 4, 5, 6].map(i => ({ dataset: { cfwhy: String(i) }, parentElement: { querySelector: () => calls.panels && calls.panels[i] ? { remove() { out.panelGone[i] = true; } } : null }, set outerHTML(v) { out.outer[i] = v; } })) : [] };
  const out = { outer: {}, panelGone: {} };
  const src = 'let IDIOMA="ca", rows=[], LOCK=false, ME={nombre:"Tècnica Prova"};\nconst I18N=(()=>{' + H.slice(i0 + 1, i1) + '\nreturn I18N;})();\nconst t = k => (I18N[IDIOMA][k]!==undefined?I18N[IDIOMA][k]:k);\n' +
    'const locked=()=>LOCK, toast=(m,e)=>C.toast.push([m,!!e]), logActivitat=(a,d)=>{ C.log.push([a,d]); }, pushUndo=()=>{ C.undo++; }, render=()=>{ C.render++; }, _pasFallat=()=>{}; function segellPartides(){ return {n:{},cs:[]}; }\n' +
    ['num2', 'subsOf', 'unitPrice', 'esc'].map(n => ext(n)).join('\n') + '\n' + BLK + '\n' +
    'return {rows:()=>rows, set:v=>{rows=v;}, idioma:v=>{IDIOMA=v;}, lock:v=>{LOCK=v;}, me:v=>{ME=v;}, badge:_cfBadge, panel:_cfPanel, confirma:_cfConfirma, resum:_cfResum, purga:_cfPurga, valida:_cfValida, hash:_cfHash, dubtosa:_cfDubtosa, abiertas:()=>window._cfAbiertas};';
  let A = null, err = null; const win = {};
  try { A = new Function('window', 'document', '$', 'C', src)(win, doc, () => TB, calls); } catch (e) { err = e; }
  return { A, err, calls, wrap, av, TB, win, doc, outer: out.outer, panelGone: out.panelGone, resum: () => wrap.children.find(e => e.id === 'cfResum') || null }; }
const part = (d, o) => Object.assign({ tipo: 'part', num: '', desc: d, ut: 'm2', amid: 10, preu: 25.5 }, o || {});
const nou = () => [{ tipo: 'sec', desc: 'ZONA' }, { tipo: 'cap', desc: '1 CAPITOL' },
  part('1.1 Partida verda\n- text', {}), part('1.2 Partida sense prova\n- text', { sg: 's', sgL: ['1.2 m2 Partida sense prova 10,00', 'text del document'] }),
  part('1.3 Partida marcada\n- text', { sg: 'm', sgL: ['1.3 m2 Partida marcada 11,00'], flag: 'NO QUADRA AMB EL DOCUMENT: la quantitat no és al seu tros — comprova-ho' }),
  part('1.4 Partida sense línia\n- text', { sg: 's' }), part('1.5 Partida de lectura vella\n- text', { flag: 'NO CUADRA CON EL DOCUMENTO: otra cantidad' })];
const verd = /\bbtn ok\b|--ok\b|\bok\b|green|verd|comprovada/i;

(() => {
  const m0 = mon(); check('les peces es poden muntar en un entorn de prova', !!m0.A, m0.err && m0.err.message);
  if (!m0.A || falten.length) { check('les proves de comportament necessiten les peces, que a l\'app no hi són (' + falten.join(', ') + ')', false); console.error('\n' + ok + ' OK · ' + ko + ' en vermell'); process.exit(1); }

  // 2) etiqueta només a files no verdes, panell amb la línia, sense línia ho diu
  { const m = mon(); m.A.set(nou()); const R = m.A.rows(), b = R.map((r, i) => m.A.badge(r, i));
    check('2) cap etiqueta ni botó a la fila verda, al capítol ni a la zona', b[0] === '' && b[1] === '' && b[2] === '', b.slice(0, 3));
    check('2) etiqueta («Per comprovar») a la fila sense prova, a la marcada i a la marcada d\'una lectura vella (flag sense estat)', [3, 4, 6].every(i => /data-cfwhy="\d"/.test(b[i]) && /Per comprovar/.test(b[i])), [b[3], b[6]]);
    check('2) l\'etiqueta de la fila sense prova fa servir classes de sempre (flag-badge), sense colors nous', /class="flag-badge cf-tag"/.test(b[3]) && !/style=|#[0-9a-f]{3,6}|rgb\(/i.test(b[3]));
    check('2) el botó NO surt fins que es toca l\'etiqueta (cap passa nou al flux normal)', b.slice(0, 7).every(x => !/data-cfok/.test(x)));
    const p3 = m.A.panel(R[3], 3, false), p4 = m.A.panel(R[4], 4, false), p5 = m.A.panel(R[5], 5, false), p6 = m.A.panel(R[6], 6, false);
    check('2) el panell de la fila sense prova ensenya les línies del document tal qual i UN botó «Comprovat amb el document»', /1\.2 m2 Partida sense prova 10,00/.test(p3) && /text del document/.test(p3) && /Al document hi diu/.test(p3) && /Sense prova/.test(p3) && (p3.match(/data-cfok=/g) || []).length === 1 && /Comprovat amb el document/.test(p3), p3);
    check('2) el panell de la fila marcada diu que és marcada i ensenya la seva línia', /Marcada/.test(p4) && /1\.3 m2 Partida marcada 11,00/.test(p4) && /data-cfok="4"/.test(p4));
    check('2) sense línia del document ho diu (no deixa res en blanc) i el botó hi és igualment', /Sense línia del document/.test(p5) && !/Al document hi diu/.test(p5) && /data-cfok="5"/.test(p5) && /Sense línia del document/.test(p6) && /Marcada/.test(p6));
    check('2) el text del document s\'escapa (cap HTML de la línia arriba a la pantalla)', (() => { const r = part('x', { sg: 's', sgL: ['<img src=x onerror=alert(1)> & "q"'] }); const p = m.A.panel(r, 0, false); return !/<img/.test(p) && /&lt;img/.test(p); })());
    check('2) panell obert: fila sense prova i fila marcada (qualsevol de les tres) amb classe de sempre, no bloqueja (cap modal)', /class="flag-why cf-why"/.test(p3) && !/modal|confirm\(|prompt\(/.test(BLK)); }
  // clic a l'etiqueta: obre/tanca el panell sense tornar a pintar tota la taula
  { const m = mon(); m.A.set(nou()); const clic = m.calls.listeners.click[0]; let pn = null, html = '', aria = '';
    const W = { dataset: { cfwhy: '3' }, parentElement: { querySelector: () => pn }, setAttribute: (k, v) => { aria = k + v; }, insertAdjacentHTML: (w, h) => { html = h; pn = { remove() { pn = null; } }; } };
    clic({ target: { closest: s => s === '[data-cfwhy]' ? W : null } });
    check('2) tocar l\'etiqueta ensenya el panell amb el botó (sense tornar a pintar la taula)', /data-cfok="3"/.test(html) && m.calls.render === 0 && aria === 'aria-expandedtrue' && m.A.abiertas().has(m.A.rows()[3]), html);
    clic({ target: { closest: s => s === '[data-cfwhy]' ? W : null } }); check('2) tocar-la un altre cop el tanca', pn === null && !m.A.abiertas().has(m.A.rows()[3]));
    check('2) un clic a qualsevol altre lloc no fa res', (() => { const n = m.calls.render; clic({ target: { closest: () => null } }); return m.calls.render === n && m.calls.log.length === 0; })()); }

  // 3) un clic confirma
  { const m = mon(); m.A.set(nou()); const R = m.A.rows(), abans = JSON.stringify(R.map(r => [r.tipo, r.desc, r.ut, r.amid, r.preu, r.flag || '', r.sg || '', JSON.stringify(r.sgL || '')]));
    const clic = m.calls.listeners.click[0]; clic({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } });
    const r = R[3];
    check('3) un clic: la fila porta qui (nom del tècnic), quan (hora) i l\'empremta de la fila', !!r.cf && r.cf.u === 'Tècnica Prova' && /^\d{4}-\d\d-\d\dT/.test(r.cf.t) && !!r.cf.h && m.A.valida(r, 3), JSON.stringify(r.cf));
    check('3) un sol clic, un sol pas: desfer apuntat, pantalla repintada, missatge, i res més (cap pregunta)', m.calls.undo === 1 && m.calls.render === 1 && m.calls.toast.length === 1 && m.calls.toast[0][1] === false);
    check('3) una entrada al llibre d\'activitat (confirmacio_fila) amb la fila i l\'estat', m.calls.log.length === 1 && m.calls.log[0][0] === 'confirmacio_fila' && /fila 4/.test(m.calls.log[0][1]) && /sense prova/.test(m.calls.log[0][1]) && /Partida sense prova/.test(m.calls.log[0][1]), JSON.stringify(m.calls.log));
    check('3) la fila no canvia: text, unitat, quantitat, preu, marca, estat i línies, igual', JSON.stringify(R.map(r => [r.tipo, r.desc, r.ut, r.amid, r.preu, r.flag || '', r.sg || '', JSON.stringify(r.sgL || '')])) === abans);
    const b = m.A.badge(r, 3);
    check('3) confirmada: l\'etiqueta passa a «Confirmada pel tècnic» amb nom i hora, i es veu DIFERENT (no és la de per comprovar)', /Confirmada pel tècnic/.test(b) && /Tècnica Prova/.test(b) && !/Per comprovar/.test(b) && /class="gta-tag scoef cf-tag"/.test(b), b);
    check('3) confirmada MAI és verda: cap classe ni paraula de verd (ni btn ok, ni --ok, ni comprovada), i segueix sent dubtosa del segell', !verd.test(b) && !verd.test(m.A.panel(r, 3, true)) && m.A.dubtosa(r) && r.sg === 's');
    check('3) confirmada: el panell diu que ho ha mirat una persona, no el programa, i ja no ofereix el botó', /Ho ha mirat una persona/.test(m.A.panel(r, 3, true)) && !/data-cfok/.test(m.A.panel(r, 3, true)));
    clic({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '2' } } : null } });
    check('3) la fila verda no es pot confirmar (cap botó, i si algú ho força no fa res)', !R[2].cf && m.calls.log.length === 1);
    m.A.me(null); clic({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '4' } } : null } });
    check('3) sense usuari identificat no es confirma (mai anònim) i ho diu', !R[4].cf && m.calls.toast.length === 2 && m.calls.toast[1][1] === true);
    { const mb = mon(); mb.A.set(nou()); mb.A.me({}); mb.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } });
      check('3) un usuari sense nom tampoc confirma (mai anònim) i ho diu', !mb.A.rows()[3].cf && mb.calls.toast.length === 1 && mb.calls.toast[0][1] === true && mb.calls.log.length === 0); }
    m.A.me({ nombre: 'Tècnica Prova' }); m.A.lock(true); clic({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '4' } } : null } });
    check('3) pressupost signat: no es confirma ni surt el botó, però la confirmació que hi ha es veu', !R[4].cf && !/data-cfok/.test(m.A.panel(R[4], 4, false)) && /Confirmada pel tècnic/.test(m.A.badge(r, 3))); }

  // 4) es desa amb el pressupost i sobreviu a recarregar
  { const san = ext('sanitizeRows') ? new Function('IDIOMA', '_titolCurt', 'ORIGEN_IA', [ext('_filesDeTaulaEnDesglos'), ext('sanitizeRows')].join('\n') + '\nreturn sanitizeRows;')('ca', undefined, null) : null;
    check('4) sanitizeRows (la que desa i reobre) es pot executar sola', !!san);
    if (san) { const m = mon(); m.A.set(nou()); const R = m.A.rows(); R[3].amid = '10'; R[3].desc = 'Linia 1\r\n- text\u0000'; R[3].preu = '25,5';
      const clic = m.calls.listeners.click[0]; clic({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } });
      const json = JSON.parse(JSON.stringify(R)), out = san(json, false);
      check('4) el que es desa porta l\'estat, les línies i la confirmació (qui, quan, empremta)', !!out && out[3].sg === 's' && out[3].sgL.length === 2 && out[3].cf.u === 'Tècnica Prova' && !!out[3].cf.t && !!out[3].cf.h && out[4].sg === 'm' && out[2].sg === undefined && out[2].cf === undefined, JSON.stringify(out && out[3]));
      const m2 = mon(); m2.A.set(out);
      check('4) recarregat: la confirmació segueix valent (fila igual, encara que es desi amb saltsde línia, lletres de control, quantitat i preu en text)', m2.A.valida(out[3], 3) && /Confirmada pel tècnic/.test(m2.A.badge(out[3], 3)) && /Per comprovar/.test(m2.A.badge(out[5], 5)), m2.A.badge(out[3], 3));
      check('4) les files sense res d\'això no en porten (res al desat de les verdes ni dels capítols)', out.every((r, i) => [3, 4, 5, 6].includes(i) || (r.sg === undefined && r.sgL === undefined && r.cf === undefined)));
      check('4) un cf mal format es descarta en desar (cap brossa)', (() => { const o = san([{ tipo: 'part', desc: 'x', ut: 'u', amid: 1, preu: 1, cf: { u: '' } }, { tipo: 'part', desc: 'y', ut: 'u', amid: 1, preu: 1, cf: 'x', sg: 'z', sgL: 'no' }], false); return o && o[0].cf === undefined && o[1].cf === undefined && o[1].sg === undefined && o[1].sgL === undefined; })());
      check('4) la confirmació d\'una fila que ja ha canviat no es desa: abans de desar s\'esborra', /saveCurrent[\s\S]{0,400}_cfPurga\(\)[\s\S]{0,200}const payload=\{obra/.test(H.slice(H.indexOf('async function saveCurrent'), H.indexOf('async function saveCurrent') + 1200)));
    } }

  // 5) editar la fila treu la confirmació
  const camps = [['text', r => { r.desc = r.desc + ' i més'; }], ['unitat', r => { r.ut = 'ml'; }], ['quantitat', r => { r.amid = 11; }], ['preu', r => { r.preu = 30; }]];
  for (const [nom, f] of camps) { const m = mon(); m.A.set(nou()); const R = m.A.rows(); m.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } });
    check('5) canviar el ' + nom + ' de la fila: la confirmació no val més (l\'etiqueta torna a «Per comprovar» i s\'esborra)', (() => { f(R[3]); const b = m.A.badge(R[3], 3); return /Per comprovar/.test(b) && !/Confirmada/.test(b) && R[3].cf === undefined; })()); }
  { const m = mon(); m.A.set(nou()); const R = m.A.rows(); m.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } });
    R[3].desc = 'canviat'; const n = m.A.purga(); check('5) abans de desar, la confirmació vella s\'esborra', n === 1 && R[3].cf === undefined && m.A.purga() === 0); }
  { const m = mon(); m.A.set(nou()); const R = m.A.rows(); m.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } }); m.A.resum(); const rend = m.calls.render, abans = m.resum().textContent;
    R[2].desc = 'una altra fila canviada'; R[3].amid = 99; const inp = m.calls.listeners.input[0];
    inp({ target: { dataset: { f: 'amid', i: '3' } } });
    return new Promise(r => setTimeout(r, 25)).then(() => {
      check('5) escriure a la quantitat d\'una fila confirmada: la confirmació se\'n va a l\'acte', R[3].cf === undefined && /Per comprovar/.test(m.outer[3] || '') && !/Confirmada/.test(m.outer[3] || ''), m.outer[3]);
      check('5) ...SENSE repintar la taula (no es crida render: qui escriu no perd el cursor)', m.calls.render === rend, m.calls.render);
      check('5) ...i el comptador s\'actualitza (3 · 1 passa a 4 · 0)', abans === '3 files per comprovar · 1 confirmades pel tècnic' && m.resum().textContent === '4 files per comprovar · 0 confirmades pel tècnic', m.resum().textContent);
      inp({ target: { dataset: { f: 'amid', i: '3' } } }); inp({ target: { dataset: { f: 'amid', i: '3' } } }); const n0 = JSON.stringify(m.outer); m.outer[3] = 'intacte'; return new Promise(r => setTimeout(r, 25)).then(() => check('5) escriure més no repinta res més (no hi ha res a treure)', m.calls.render === rend && m.outer[3] === 'intacte' && n0 !== undefined)); }).then(() => {
      const m5 = mon(); m5.A.set(nou()); const R5 = m5.A.rows(); m5.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } }); m5.calls.panels = { 3: true }; R5[3].desc += ' i més'; m5.calls.listeners.input[0]({ target: { dataset: { f: 'desc', i: '3' } } });
      return new Promise(r => setTimeout(r, 25)).then(() => check('5) amb el panell obert: es treu el vell i es torna a pintar amb el botó (encara per comprovar), sense render', m5.panelGone[3] === true && /Per comprovar/.test(m5.outer[3]) && /data-cfok="3"/.test(m5.outer[3]) && m5.calls.render === 1)); }).then(() => {
      const m3 = mon(); m3.A.set(nou()); const R3 = m3.A.rows(); m3.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '4' } } : null } }); const r3 = m3.calls.render; R3[2].desc = 'canvi a una altra fila';
      m3.calls.listeners.input[0]({ target: { dataset: { f: 'desc', i: '2' } } }); return new Promise(r => setTimeout(r, 25)).then(() => check('5) canviar una ALTRA fila no treu la confirmació d\'aquesta ni repinta res', !!R3[4].cf && m3.calls.render === r3 && Object.keys(m3.outer).length === 0)); }).then(() => {
      const m4 = mon(); m4.A.set(nou()); const R4 = m4.A.rows(); const idx = R4.findIndex(x => /1\.3 /.test(x.desc)); R4.splice(idx + 1, 0, { tipo: 'sub', desc: 'calc', ut: 'u', amid: 2, preu: 5 }); R4[idx].preu = ''; m4.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: String(idx) } } : null } });
      const ok0 = m4.A.valida(R4[idx], idx); R4[idx + 1].preu = 6; check('5) canviar el preu d\'una línia de càlcul de la partida (el preu de la partida canvia) treu la confirmació', ok0 && !m4.A.valida(R4[idx], idx)); const r4 = m4.calls.render; m4.calls.listeners.input[0]({ target: { dataset: { f: 'preu', i: String(idx + 1) } } });
      return new Promise(r => setTimeout(r, 25)).then(() => check('5) ...i escriure-ho a la línia de càlcul repinta l\'etiqueta de la partida (no la taula)', /Per comprovar/.test(m4.outer[idx] || '') && m4.calls.render === r4 && m4.A.rows()[idx].cf === undefined)); }); }
})().then(() => { (() => {
  // 6) comptador
  { const m = mon(); m.A.set(nou()); m.A.resum(); const e = m.resum();
    check('6) comptador amb tres files dubtoses de les quatre amb estat (dues de lectura nova, una sense estat però marcada): «4 files per comprovar · 0 confirmades pel tècnic», al costat dels avisos', !!e && e.textContent === '4 files per comprovar · 0 confirmades pel tècnic' && m.wrap.children[1] === e && /\bhint\b/.test(e.className), e && e.textContent);
    m.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } }); m.A.resum();
    check('6) confirmar una fila: una menys per comprovar, una més de confirmada (3 · 1) i el mateix element (no se\'n crea cap de nou)', m.resum().textContent === '3 files per comprovar · 1 confirmades pel tècnic' && m.wrap.children.filter(x => x.id === 'cfResum').length === 1, m.resum().textContent);
    m.A.rows()[3].amid = 77; m.A.purga(); m.A.resum(); check('6) si la fila canvia, torna a comptar com a per comprovar', m.resum().textContent === '4 files per comprovar · 0 confirmades pel tècnic');
    m.A.idioma('es'); m.A.resum(); check('6) en castellà', m.resum().textContent === '4 filas por comprobar · 0 confirmadas por el técnico', m.resum().textContent);
    m.A.set([{ tipo: 'sec', desc: 'Z' }, part('verda')]); m.A.resum(); check('6) si no hi ha cap fila dubtosa no es veu res (cap soroll)', m.resum() === null); }
  // 7) castellà a la fila
  { const m = mon(); m.A.idioma('es'); m.A.set(nou()); const R = m.A.rows(), b = m.A.badge(R[3], 3), p = m.A.panel(R[5], 5, false);
    check('7) etiqueta i panell en castellà (Por comprobar · Sin línea del documento · Comprobado con el documento)', /Por comprobar/.test(b) && /Sin línea del documento/.test(p) && /Comprobado con el documento/.test(p) && /Sin prueba/.test(p), [b, p]);
    m.calls.listeners.click[0]({ target: { closest: s => s === '[data-cfok]' ? { dataset: { cfok: '3' } } : null } });
    check('7) confirmada en castellà, amb el nom', /Confirmada por el técnico/.test(m.A.badge(R[3], 3)) && /Lo ha mirado una persona/.test(m.A.panel(R[3], 3, true)) && /Fila confirmada con el documento/.test(m.calls.toast[0][0])); }
  // 8) si peta, es veu
  { const m = mon(); m.A.set(nou()); const R = m.A.rows(); const mal = part('x', { sg: 's', cf: { u: 'a', t: 'b', h: 'c' } }); Object.defineProperty(mal, 'desc', { get() { throw new Error('desc trencada'); } }); R.push(mal);
    let b = 'NO'; try { b = m.A.badge(mal, R.length - 1); } catch (e) { b = 'PETA'; }
    check('8) si pintar l\'etiqueta peta, no peta la pantalla: surt una etiqueta d\'error i un missatge a la vista', b !== 'PETA' && /⚠/.test(b) && /Error en la comprovació/.test(b) && m.calls.toast.length === 1 && m.calls.toast[0][1] === true, JSON.stringify([b, m.calls.toast]));
    m.A.badge(mal, R.length - 1); check('8) i no atabala: un missatge per minut com a molt', m.calls.toast.length === 1); }
  { const m = mon({ senseLloc: true }); m.A.set(nou()); let r = 'OK'; try { m.A.resum(); } catch (e) { r = 'PETA'; }
    check('8) si el comptador no troba on posar-se, no peta i ho diu', r === 'OK' && m.calls.toast.length === 1 && m.calls.toast[0][1] === true && m.resum() === null, JSON.stringify(m.calls.toast)); }
  { const m = mon(); m.A.set(nou()); m.calls.listeners.click[0]({ target: { closest: s => { throw new Error('DOM trencat'); } } });
    check('8) si el clic peta, no peta la pantalla i ho diu', m.calls.toast.length === 1 && m.calls.toast[0][1] === true); }
  { const m = mon(); m.A.set(nou()); m.calls.listeners.input[0]({ target: null }); m.calls.listeners.input[0]({ target: { dataset: null } }); check('8) un esdeveniment estrany a la taula no fa res ni peta', m.calls.toast.length === 0 && m.calls.render === 0); }

  // 9) cablejat: res al tram de lectura, res que bloquegi
  const t0 = H.indexOf('// ==== INICI EINES DE LECTURA ===='), t1 = H.indexOf('const _draftIA='), TRAM = H.slice(t0, t1);
  check('9) res al tram de lectura (cap peça _cf ni sg/sgL/cf a la lectura: LECTURA_VER no puja)', t0 > 0 && t1 > t0 && !/_cf[A-Z]|\.sgL\b|\.cf\b/.test(TRAM) && /^const LECTURA_VER\s*=/m.test(H));
  const A0 = H.indexOf('// 06/10/2026 (Z11) · SEGELL PER PARTIDA'), A1 = H.indexOf('// ── fi del segell per partida (Z11) ──');
  check('9) el segell de sempre no s\'ha tocat (cap peça nova dins del segell)', A0 > 0 && A1 > A0 && !/_cf[A-Z]|\bsgL\b/.test(H.slice(A0, A1)));
  check('9) l\'embolcall del segell es fa FORA del tram de lectura, un sol cop, i diu l\'error si falla', (H.match(/const _cfSegellOrig=segellPartides;/g) || []).length === 1 && H.indexOf('const _cfSegellOrig=') > t1 && /try\{ _cfCaptura\(R,src\); \}catch\(e\)\{ _pasFallat\("confirmar fila/.test(H));
  check('9) l\'etiqueta va a la fila de partida just al costat de la marca de sempre, el comptador amb el resum de la pantalla', (H.match(/<\/textarea>\$\{badge\}\$\{_cfBadge\(r,i\)\}\$\{r\.gta\?/g) || []).length === 1 && /renderResum\(\);renderNotes\(\);showFeedbackBar\(\);_cfResum\(\);\n\}/.test(H));
  check('9) cap finestra, pregunta ni pausa: cap confirm, prompt, modal ni await a les peces', !/confirm\(|prompt\(|modal|await |localStorage|sessionStorage/.test(BLK));
  check('9) la confirmació no toca la lectura fixada ni els avisos de la lectura (cap allAvisos, cap flag)', !/allAvisos|\.flag\s*=|delete r\.flag|NOTES/.test(BLK.replace(/r\.flag\|\|""/g, '')));
  check('9) escriure a la taula no la repinta mai sencera: l\'escoltador crida _cfRefresca i _cfRefresca no crida render', /_cfPurga\(\)\) _cfRefresca\(\);/.test(H) && !/render\(\)/.test(ext('_cfRefresca')) && /_cfResum\(\)/.test(ext('_cfRefresca')));
  check('9) cap peça nova passa de 50 línies', FN.every(n => ext(n).split('\n').length <= 50), FN.map(n => n + ':' + ext(n).split('\n').length).join(' '));
  check('9) cap color nou: només classes i variables de sempre', !/#[0-9a-fA-F]{3,6}\b|rgb\(|rgba\(/.test(BLK));
  console.log('\n' + ok + ' OK · ' + ko + ' en vermell'); process.exit(ko ? 1 : 0); })(); });
