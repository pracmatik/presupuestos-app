#!/usr/bin/env node
'use strict';
/*
 * Guardià · 13/11/2026 (versió 2, SENSE finestra ni pausa) · NOTA DEL ORIGINAL I SELECTOR DE CONTINGUT DESPRÉS DE LLEGIR (només PDF i Word).
 *
 * Per què existeix. Criteri escrit de la direcció del client (07/09): el sistema aplica el que té establert, el tècnic ho pot canviar i les preguntes li fan perdre temps.
 * Per això no hi ha cap finestra ni cap pausa: la lectura corre com sempre i, DESPRÉS de llegir, (1) una sola nota si el text delata el programa que ha fet el document
 * (si té el BC3 o l'Excel, que el pugi) i (2) un selector petit a les notes (No ho sé per defecte · un sol pressupost · opcions · diversos pressupostos) que, en canviar-lo,
 * torna a fer NOMÉS el contrast amb el que la lectura ha trobat (la detecció que ja existia) i refresca aquestes notes. El que és verd és demostrat contra el document; la resta es veu marcat.
 * Què vigila, amb textos inventats en català i castellà (cap dada de cap client):
 *  1) no hi ha finestra, ni pregunta, ni pausa abans de llegir; res no s'espera ni es recorda al navegador;
 *  2) la nota del programa només surt amb una firma segura (positius i negatius), només a PDF i Word, i una sola vegada;
 *  3) el selector surt a les notes només a PDF i Word, amb les classes de sempre, «No ho sé» per defecte, i obrir un altre pressupost el treu;
 *  4) els casos del contrast (opcions / diversos / un sol / no ho sé), amb avís en català i castellà; «un sol» només avisa si la numeració torna a començar, mai per zones;
 *  5) canviar el selector: avisos nous sense deixar-ne de vells, un sol esdeveniment al llibre d'activitat per canvi, la lectura i les altres notes no es toquen;
 *  6) cablejat: va a les notes de pantalla (mai a la lectura fixada), errors a la vista, la cadena de lectura no es toca;
 *  7) cada peça trencada es veu (a producció, que no té res d'això, el guardià surt en vermell).
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };

function ext(n) { let m = new RegExp('\\n(?:async\\s+)?function\\s+' + n + '\\s*\\(').exec(H);
  if (!m) { m = new RegExp('\\n(?:const|let|var)\\s+' + n + '\\s*=').exec(H); return m ? H.slice(m.index + 1, H.indexOf('\n', m.index + 1)) : ''; }
  const b = H.indexOf('{', m.index); let d = 0, i = b; for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) { i++; break; } } } return H.slice(m.index + 1, i); }
const FN = ['_pregPrograma', '_pregEsPdfWord', '_pregNotaOriginal', '_pregH', '_pregTrobatOpcions', '_pregTrobatReinici', '_pregTrobatDiversos', '_pregContrast', '_pregAfegeixAvisos', '_pregTreuAvisos', '_pregReset', '_pregPinta', '_pregCanvia', '_pregInicia'];
const CT = ['_PREG_NOMS', '_PREG_VERBAL', '_PREG_FIRMES', '_pregCtx', '_SG_OPC', '_llNorm', 'FORMATS', 'FORMATS_RE'];
const falten = FN.concat(CT).filter(n => !ext(n));
check('l\'app té totes les peces (' + FN.concat(CT).length + ')', falten.length === 0, 'falten: ' + falten.join(', '));

const i0 = H.indexOf('\nconst I18N={'), i1 = H.indexOf('\nconst t = k =>');
let I18N = null; try { I18N = new Function(H.slice(i0 + 1, i1) + '\nreturn I18N;')(); } catch (e) { check('els diccionaris de textos es poden carregar', false, e.message); }
const claus = ['preg_nota_pdf', 'preg_nota_doc', 'preg_sel', 'preg_un', 'preg_opc', 'preg_div', 'preg_nose', 'preg_err', 'preg_av_opc', 'preg_av_div', 'preg_av_un'];
if (I18N) {
  const perd = ['ca', 'es'].map(l => claus.filter(k => !I18N[l][k]).map(k => l + ':' + k)).flat();
  check('tots els textos hi són en català i en castellà', perd.length === 0, perd.join(', '));
  check('cap text és igual en les dues llengües (cap sense traduir)', claus.filter(k => I18N.ca[k] === I18N.es[k]).length === 0);
  const tots = ['ca', 'es'].map(l => claus.map(k => I18N[l][k] || '').join('\n')).join('\n');
  check('sense cometes ni ratlles llargues als textos nous', !/[«»"“”]|—/.test(tots.replace(/\{p\}/g, '')));
  check('cap frase prohibida de baixa als textos nous', !/no\s+(?:et\s+|te\s+)?(?:tornem|volvemos|vuelvo|torno)\s+a\s+escriure|no\s+vol(?:vemos|vuelvo)\s+a\s+escribir/i.test(tots));
  check('els avisos diuen què cal revisar (Mira) i la nota diu què fer (puja / súbelo)', ['ca', 'es'].every(l => /\bMira\b/.test(I18N[l].preg_av_opc) && /\bMira\b/.test(I18N[l].preg_av_div) && /\bMira\b/.test(I18N[l].preg_av_un)) && /puja'l/.test(I18N.ca.preg_nota_pdf) && /súbelo/.test(I18N.es.preg_nota_pdf));
  check('el llibre d\'activitat té la frase de persona en les dues llengües', /preguntes_previes:"ha /.test(H) && H.split('preguntes_previes:"ha ').length === 3);
}

// ---- el món de mentida: pantalla de notes ----
class El { constructor(tag) { this.tag = tag; this.children = []; this.cls = new Set(); this.style = {}; this.l = {}; this._t = ''; this.parent = null; }
  set textContent(v) { this.children = []; this._t = String(v); } get textContent() { return this._t; }
  set className(v) { this.cls = new Set(String(v).split(/\s+/).filter(Boolean)); } get className() { return [...this.cls].join(' '); }
  get classList() { const s = this; return { add: c => s.cls.add(c), remove: c => s.cls.delete(c), contains: c => s.cls.has(c) }; }
  get parentNode() { return this.parent; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  insertBefore(c, ref) { const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); c.parent = this; return c; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null; }
  addEventListener(t, f) { (this.l[t] = this.l[t] || []).push(f); }
  click() { (this.l.click || []).forEach(f => f({})); }
  all(out = []) { out.push(this); this.children.forEach(c => c.all(out)); return out; } }
function mon(opt = {}) {
  const body = new El('body'), panel = new El('div'), box = new El('div'); box.id = 'notesBox'; panel.appendChild(box); body.appendChild(panel);
  const toasts = [], logs = []; let rend = 0;
  const doc = opt.senseDoc ? undefined : { body, createElement: tag => { if (opt.trenca) throw new Error('DOM trencat'); return new El(tag); } };
  const dollar = s => (s === '#pregSel' ? (panel.all().find(e => e.id === 'pregSel') || null) : s === '#notesBox' ? box : null);
  const src = 'let IDIOMA="ca", NOTES=[], rows=[], DIRTY=false, rend=0; const MARCA_INTERNA="\\u0001"; const I18N=(()=>{' + H.slice(i0 + 1, i1) + '\nreturn I18N;})();\n' +
    'const t = k => (I18N[IDIOMA][k]!==undefined?I18N[IDIOMA][k]:k); const renderNotes=()=>{ rend++; };\n' + CT.map(ext).join('\n') + '\n' + ['formatDe'].concat(FN).map(ext).join('\n') + '\n' +
    'const G=n=>{ try{ return eval(n); }catch(_){ return null; } };\n' +
    'return {idioma:v=>{IDIOMA=v;}, notes:()=>NOTES, setNotes:v=>{NOTES=v;}, setRows:v=>{rows=v;}, dirty:()=>DIRTY, ctx:()=>_pregCtx, rend:()=>rend, mark:MARCA_INTERNA, cap:()=>MARCA_INTERNA+"⚠ "+t("ing_avisos"), t,' +
    'prog:G("_pregPrograma"), nota:G("_pregNotaOriginal"), inicia:G("_pregInicia"), canvia:G("_pregCanvia"), reset:G("_pregReset"), pinta:G("_pregPinta"), contrast:G("_pregContrast")};';
  let A = null, err = null;
  try { A = new Function('document', '$', 'toast', 'logActivitat', 'window', 'localStorage', src)(doc, dollar, (m, e) => toasts.push(m), (a, d) => logs.push([a, d]), {}, undefined); } catch (e) { err = e; }
  return { A, err, body, panel, box, toasts, logs, rend: () => A && A.rend(), sel: () => dollar('#pregSel') };
}
const fx = n => ({ name: n, size: 1000 });
const btns = m => (m.sel() ? m.sel().children.filter(e => e.tag === 'button') : []);
const clic = (m, txt) => { const b = btns(m).find(e => e.textContent === txt); if (!b) throw new Error('no hi ha el botó ' + txt); b.click(); };
const nota = (m, re) => m.A.notes().filter(n => re.test(n)).length;

(() => {
  const base = mon(); check('les peces es poden muntar en un entorn de prova', !!base.A, base.err && base.err.message);
  if (!base.A || falten.length) { check('les proves de comportament necessiten les peces, que a l\'app no hi són (' + falten.join(', ') + ')', false); console.error('\n' + ok + ' OK · ' + ko + ' en vermell'); process.exit(1); }

  // 1) cap finestra, cap pregunta, cap pausa
  const d0 = H.indexOf('async function doUpload(file){'), d1 = H.indexOf('\nasync function ', d0 + 10), D = H.slice(d0, d1 > 0 ? d1 : d0 + 150000);
  check('1) no hi ha cap finestra ni pregunta prèvia a l\'app (ni peça ni text ni emmagatzematge)', !/_pregFinestra|_pregPrevies|_pregToca|gta_preguntes_omeses|preg_titol|preg_si_orig|preg_llegir|preg_nomes|no m'ho tornis a preguntar/i.test(H));
  const iFix = D.indexOf('if(_fixReuse){'), iAll = D.indexOf('let allRows=[]'), iIA = D.indexOf('INGESTA_URL');
  check('1) doUpload no espera res d\'això: cap await ni confirm de les peces noves, cap crida abans de la lectura fixada ni abans de la IA', !/await\s+_preg/.test(D) && !/confirm\([^)]*_preg/.test(D) && iFix > 0 && !/_preg\w*\(/.test(D.slice(0, iFix)) && !/_preg\w*\(/.test(D.slice(iAll, iIA)));
  check('1) les dues úniques crides són DESPRÉS de llegir: la de la lectura fixada (ja llegida) i la de la lectura nova (després de la IA)', (D.match(/_pregInicia\(file,/g) || []).length === 2 && D.indexOf('_pregInicia(file,') > iFix && D.indexOf('_pregInicia(file,') < iAll && D.lastIndexOf('_pregInicia(file,') > iIA);
  check('1) el selector no fa servir localStorage ni sessionStorage', !/localStorage|sessionStorage/.test(FN.map(ext).join('\n')));
  check('1) cap emmagatzematge de preguntes a tota l\'app (cap clau preg/omesa a localStorage o sessionStorage)', !/(?:localStorage|sessionStorage)\.\w+\(\s*["'][^"']*(?:preg|omesa)/i.test(H));
  check('1) les peces noves no toquen allAvisos (es desa amb la lectura fixada)', !/allAvisos/.test(FN.map(ext).join('\n')));

  // 2) la nota del programa
  const POS = [['Presto', 'Pressupost\nGenerat amb Presto\nPàgina 1'], ['Presto', 'Presupuesto de obra\nPresto 8.8 - Pág. 1'], ['Presto', 'PRESTO 2020  Mediciones'], ['Presto', 'Presto ® Obra'],
    ['Arquímedes', 'Arquímedes y Control de Obra\nMediciones'], ['Arquímedes', 'Arquimedes i Control d\'obra'], ['TCQ', 'Exportat per TCQ2000\nPressupost'], ['TCQ', 'Generado con TCQ 2020'],
    ['Menfis', 'Menfis v10 · Presupuesto'], ['Menfis', 'Document exportat per Menfis'], ['Gest', 'Documento generado con Gest\nPágina 1'], ['Presto', 'Elaborado por Presto']];
  for (const [e, tx] of POS) check('2) detecta ' + e + ' en «' + tx.split('\n')[0] + '»', base.A.prog(tx) === e, base.A.prog(tx));
  const NEG = ['El tècnic va ser presto a respondre.', 'Está presto para la entrega, presto, presto.', 'Gestió de residus de la construcció', 'Generado con gestión de calidad', 'Gest d\'obra', 'El principio de Arquímedes se aplica a la piscina.',
    'Precios del generador CYPE 2024', 'Banco de precios TCQ', 'La ciudad de Menfis', 'Presupuesto de ejecución material 12.500,00', 'Pressupost de rehabilitació de façana', 'prestos 2 unitats', 'Creado por gestores externos'];
  for (const tx of NEG) check('2) no es confon amb una paraula corrent: «' + tx.slice(0, 40) + '»', base.A.prog(tx) === '', base.A.prog(tx));
  { const m = mon(); m.A.inicia(fx('pressupost.pdf'), 'Generat amb Presto'); const n = m.A.notes();
    check('2) PDF amb firma: UNA nota, en català, sota la capçalera d\'avisos de les notes de pantalla', n.length === 2 && n[0] === m.A.cap() && n[1] === m.A.mark + '• Aquest PDF s\'ha fet amb Presto. Si en tens el BC3 o l\'Excel, puja\'l aquí i surt sense errors de lectura.', n); }
  { const m = mon(); m.A.idioma('es'); m.A.inicia(fx('presupuesto.docx'), 'Presto 8.8'); const n = m.A.notes(); check('2) Word amb firma, en castellà', n.length === 2 && /Este documento se ha hecho con Presto\. Si tienes el BC3 o el Excel, súbelo aquí y sale sin errores de lectura\./.test(n[1]), n); }
  { const m = mon(); m.A.inicia(fx('a.pdf'), 'Pressupost de rehabilitació'); check('2) PDF sense firma: cap nota (res es nota si no es detecta)', m.A.notes().length === 0, m.A.notes()); }
  for (const n of ['a.xlsx', 'a.xlsm', 'a.xls', 'a.bc3', 'a.txt', 'a.md', 'a.zip']) { const m = mon(); m.A.inicia(fx(n), 'Generat amb Presto 8.8 TCQ2000'); check('2) ' + n + ' amb firma: cap nota, cap selector', m.A.notes().length === 0 && m.sel() === null && m.A.ctx() === null, m.A.notes()); }

  // 3) el selector
  { const m = mon(); m.A.inicia(fx('a.pdf'), 'res'); const s = m.sel(), tx = btns(m).map(b => b.textContent);
    check('3) PDF: surt un selector a les notes (just abans de les notes), sense cap finestra', !!s && m.panel.children.indexOf(s) === m.panel.children.indexOf(m.box) - 1 && !m.body.all().some(e => e.cls.has('modal-bg') || e.cls.has('modal')));
    check('3) quatre botons en català: No ho sé · Un sol pressupost · Diverses opcions o alternatives · Diversos pressupostos', tx.join('|') === 'No ho sé|Un sol pressupost|Diverses opcions o alternatives|Diversos pressupostos', tx);
    check('3) «No ho sé» és el per defecte (botó actiu, classes de sempre btn ok) i els altres són btn', btns(m)[0].cls.has('ok') && btns(m).slice(1).every(b => b.cls.has('btn') && !b.cls.has('ok')) && m.A.ctx().resp === 'nose');
    check('3) sense cap resposta no hi ha cap avís, cap esdeveniment, res brut', m.A.notes().length === 0 && m.logs.length === 0 && !m.A.dirty());
    m.A.reset(); check('3) obrir un altre pressupost (reset) treu el selector i la resposta', m.sel() === null && m.A.ctx() === null); }
  { const m = mon(); m.A.idioma('es'); m.A.inicia(fx('a.docx'), 'res'); check('3) en castellà', btns(m).map(b => b.textContent).join('|') === 'No lo sé|Un solo presupuesto|Varias opciones o alternativas|Varios presupuestos', btns(m).map(b => b.textContent)); }
  { const m = mon({ trenca: true }); let r = 'NO PETA'; try { m.A.inicia(fx('a.pdf'), 'res'); } catch (e) { r = 'PETA'; } check('3) si el selector no es pot muntar, l\'error surt (doUpload el captura i ho diu a les notes), no es cau en silenci', r === 'PETA', r); }

  // 4) el contrast
  const P = (g, d) => ({ tipo: 'part', desc: d || 'Partida', gta: g }), SEC = d => ({ tipo: 'sec', desc: d }), CAP = d => ({ tipo: 'cap', desc: d });
  const UN = [SEC('XXXXXXXXXXX'), CAP('1 COBERTES'), P(undefined)], OPC = UN.concat([P('opc', 'Pintura (opcional)')]), ALT = UN.concat([P('alt')]), OPC_CAP = [SEC('Z'), CAP('2 OPCIÓN 2 BARANDILLAS'), P(undefined)],
    DOS = [SEC('EDIFICI A'), CAP('1 X'), P(), SEC('EDIFICI B'), CAP('1 X'), P()], ZONES = [SEC('ZONA 1'), CAP('1 X'), P(), SEC('ZONA 2'), CAP('2 Y'), P(), SEC('ZONA 3'), CAP('3 Z'), P()];
  const RC = '⚠⚠ SEMBLA QUE FALTA UNA ZONA: dins de la primera zona 3 capítol(s) repeteixen el títol', RE = '⚠⚠ PARECE QUE FALTA UNA ZONA: dentro de la primera zona';
  const av = (resp, rows, avisos = [], idi = 'ca') => { const m = mon(); m.A.idioma(idi); return m.A.contrast(resp, rows, avisos); };
  const a1 = av('opcions', UN); check('4) «opcions» i la lectura no en troba → avís en català que diu què revisar', a1.length === 1 && /Has marcat que el document té diverses opcions o alternatives/.test(a1[0]) && /Mira/.test(a1[0]), a1);
  const a2 = av('opcions', UN, [], 'es'); check('4) el mateix en castellà', a2.length === 1 && /Has marcado que el documento tiene varias opciones o alternativas/.test(a2[0]) && /Mira/.test(a2[0]), a2);
  check('4) «opcions» i la lectura troba partida opcional / alternativa / capítol OPCIÓN → cap avís', av('opcions', OPC).length === 0 && av('opcions', ALT).length === 0 && av('opcions', OPC_CAP).length === 0);
  check('4) «diversos» i la lectura només troba un pressupost → avís (ca i es)', av('diversos', UN).length === 1 && /diversos pressupostos/.test(av('diversos', UN)[0]) && /varios presupuestos/.test(av('diversos', UN, [], 'es')[0]));
  check('4) «diversos» i la lectura troba dues zones, o la numeració que torna a començar (ca i es) → cap avís', av('diversos', DOS).length === 0 && av('diversos', UN, [RC]).length === 0 && av('diversos', UN, [RE]).length === 0);
  check('4) «un sol» i la numeració torna a començar → avís (ca i es)', av('un', UN, [RC]).length === 1 && /un sol pressupost/.test(av('un', UN, [RC])[0]) && /un solo presupuesto/.test(av('un', UN, [RE], 'es')[0]) && /torna a començar/.test(av('un', UN, [RC])[0]));
  check('4) «un sol» i zones dins del pressupost (2 i 3 zones) → NO avisa (les zones dins d\'un pressupost són legítimes)', av('un', DOS).length === 0 && av('un', ZONES).length === 0);
  check('4) «un sol» amb opcions → cap avís; «un sol» i un sol pressupost → cap avís', av('un', OPC).length === 0 && av('un', ALT).length === 0 && av('un', OPC_CAP).length === 0 && av('un', UN).length === 0);
  for (const rows of [UN, OPC, DOS, ZONES]) check('4) «No ho sé» → mai cap avís', av('nose', rows, [RC]).length === 0 && av(undefined, rows, [RC]).length === 0);
  check('4) el contrast no toca cap fila de la lectura', (() => { const r = JSON.stringify(DOS); av('un', DOS); av('diversos', DOS); av('opcions', DOS); return JSON.stringify(DOS) === r; })());

  // 5) canviar el selector
  { const m = mon(); m.A.inicia(fx('a.pdf'), 'Generat amb Presto'); m.A.setRows(UN); m.A.setNotes(m.A.notes().concat(['una nota meva']));
    clic(m, 'Diverses opcions o alternatives');
    check('5) «opcions» sense opcions: un avís a les notes (capçalera de sempre), amb la nota del programa i la nota meva intactes', nota(m, /Has marcat que el document té diverses opcions/) === 1 && nota(m, /Aquest PDF s'ha fet amb Presto/) === 1 && m.A.notes().includes('una nota meva') && m.A.notes()[0] === m.A.cap(), m.A.notes());
    check('5) i refresca les notes i el selector (botó actiu nou), marca el pressupost com a canviat, un sol esdeveniment al llibre', m.rend() === 1 && btns(m).find(b => b.cls.has('ok')).textContent === 'Diverses opcions o alternatives' && m.A.dirty() && m.logs.length === 1 && /resposta=opcions · programa=Presto/.test(m.logs[0][1]) && m.logs[0][0] === 'preguntes_previes', JSON.stringify([m.rend(), m.logs]));
    clic(m, 'Diverses opcions o alternatives'); check('5) tornar a clicar el mateix no repeteix res (cap avís doble, cap esdeveniment de més)', nota(m, /Has marcat que el document té diverses opcions/) === 1 && m.logs.length === 1);
    m.A.setNotes(m.A.notes().concat([m.A.mark + '• ' + RC])); clic(m, 'Un sol pressupost');
    check('5) passar a «un sol» amb la numeració que torna a començar: l\'avís vell desapareix i en surt el nou (cap avís vell queda)', nota(m, /Has marcat que el document té diverses opcions/) === 0 && nota(m, /és un sol pressupost, però la numeració/) === 1 && m.logs.length === 2, m.A.notes());
    clic(m, 'No ho sé'); check('5) «No ho sé»: no queda cap avís del contrast, queden les altres notes i la nota del programa', nota(m, /Has marcat/) === 0 && nota(m, /Aquest PDF/) === 1 && m.A.notes().includes('una nota meva') && nota(m, /FALTA UNA ZONA/) === 1 && m.logs.length === 3); }
  { const m = mon(); m.A.inicia(fx('a.pdf'), 'res'); m.A.setRows(UN); clic(m, 'Diversos pressupostos'); const n1 = m.A.notes().length; clic(m, 'No ho sé');
    check('5) si l\'avís era l\'únic, la capçalera d\'avisos també se\'n va (no queda cap capçalera sola)', n1 === 2 && m.A.notes().length === 0, m.A.notes()); }
  { const m = mon(); m.A.inicia(fx('a.pdf'), 'res'); m.A.setRows(ZONES); clic(m, 'Un sol pressupost'); check('5) «un sol» amb 3 zones: cap avís, tot i el clic (però el canvi s\'anota)', m.A.notes().length === 0 && m.logs.length === 1); clic(m, 'Diversos pressupostos'); check('5) «diversos» amb 3 zones: cap avís', m.A.notes().length === 0); }
  { const m = mon(); m.A.idioma('es'); m.A.inicia(fx('a.docx'), 'res'); m.A.setRows(UN); clic(m, 'Varios presupuestos'); check('5) en castellà el canvi dona l\'avís en castellà', nota(m, /Has marcado que el documento tiene varios presupuestos/) === 1, m.A.notes()); m.A.idioma('ca'); clic(m, 'Un solo presupuesto'); check('5) i en canviar-ho en una altra llengua també treu l\'avís vell', nota(m, /varios presupuestos/) === 0, m.A.notes()); }
  { const m = mon(); m.A.inicia(fx('a.pdf'), 'res'); m.A.setRows({}); let r = 'OK'; try { clic(m, 'Diverses opcions o alternatives'); } catch (e) { r = 'PETA'; }
    check('5) si el contrast peta, no peta la pantalla i es diu (avís visible)', r === 'OK' && m.toasts.length === 1 && /No s'ha pogut contrastar/.test(m.toasts[0]), JSON.stringify([r, m.toasts])); }

  // 6) cablejat
  check('6) la nota i el selector van a les notes de pantalla, no a allAvisos (que es desa amb la lectura fixada)', !/allAvisos\.(?:push|unshift)\([^;\n]*_preg/.test(D) && D.lastIndexOf('_pregInicia(file,') > D.indexOf('NOTES=[MARCA_INTERNA+"⚠ "+t("ing_avisos")].concat(allAvisos'));
  check('6) si falla, es diu a les notes (mai en silenci) a la lectura nova i a la fixada', (D.match(/_pregInicia\(file,[^\n]*catch\(_e\)\{[^\n]*NOTES\.unshift\(MARCA_INTERNA\+"⚠ "/g) || []).length === 2);
  check('6) obrir un altre pressupost treu el selector (openEditor)', /function openEditor\([^)]*\)\{[^}]*?_pregReset\(\)/.test(H));
  check('6) cap funció de les peces noves passa de 50 línies', FN.every(n => ext(n).split('\n').length <= 50), FN.map(n => n + ':' + ext(n).split('\n').length).join(' '));
  const ch0 = H.indexOf('reabsorbSourceSubs(allRows,amidament)'), ch1 = H.indexOf('_draftIA=JSON.parse');
  check('6) la lectura no canvia: la cadena de lectura (de reabsorbSourceSubs a _draftIA) no porta res de les peces noves, i LECTURA_VER hi és', ch0 > 0 && ch1 > ch0 && !/_preg[A-Z]\w*\(/.test(H.slice(ch0, ch1)) && /^const LECTURA_VER\s*=/m.test(H));

  console.log('\n' + ok + ' OK · ' + ko + ' en vermell'); process.exit(ko ? 1 : 0);
})();
