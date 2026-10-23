#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 33 (23/10/2026) · DOS COMPTADORS (LECTURA I PREUS) I ELS AVISOS DE LECTURA PRIMER.
 * Textos i partides inventats, català i castellà, cap dada de cap client (va també al repositori públic).
 *  1) Cada tros de marca es classifica: PREU només si és un text de preu conegut; tot el que no es reconeix (text de la IA, «⚠», inventat) és LECTURA.
 *     Una marca amb tots dos tipus compta als dos; la bessona compta pel que diu la seva; una marca no buida mai queda fora dels dos comptadors.
 *  2) La pantalla: dos números (Lectura primer, Preus després) on hi havia un sol «A revisar»; cada fila marcada diu de quin tipus és, sense canviar-ne el color.
 *  3) La finestra de partides pendents (exportar i signar): les MATEIXES partides, primer les de lectura; la de «sense preu» que porta a més una marca de
 *     lectura ensenya totes dues coses.
 *  4) Els avisos de la lectura (notes internes) es repeteixen a dalt de la taula, vermells primer; les notes del client no hi surten; si peta, es diu.
 *  5) Cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.replace(de, a); return s === src ? null : s; };
function extFn(H, n) {
  const m = new RegExp('function\\s+' + n + '\\s*\\(').exec(H); if (!m) throw new Error('no trobo ' + n);
  const b = H.indexOf('{', m.index); let d = 0, i = b;
  for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) { i++; break; } } }
  return H.slice(m.index, i); }
const classif = H => new Function('let _MARCA_PREU=null;\n' + extFn(H, '_trosEsPreu') + '\n' + extFn(H, 'tipusMarca') + '\nreturn tipusMarca;')();

const PREU = ['PENDENT — preu a revisar', 'PENDIENTE — precio a revisar', 'PENDENT — preu a revisar (la lectura no ha proposat preu per a aquesta fila de l\'Excel)',
  'OPCIONAL — PENDENT — preu a revisar', 'OPCIONAL — preu a revisar', 'PREU COMPOST — revisar components', 'PRECIO COMPUESTO — revisar componentes',
  'PARTIDA COMPOSTA — revisar preu', 'PARTIDA COMPUESTA — revisar precio', 'PA — % del total, el fixa el tècnic', 'PA — % del total, el fija el técnico',
  'PA — Pendent de valoració', 'CÀLCUL DEL TÈCNIC', 'CÁLCULO DEL TÉCNICO', 'CÀLCUL DEL TÈCNIC (mesos)', 'CÁLCULO DEL TÉCNICO (meses)',
  'Aplicat el 3 % sobre el total, criteri de GTA del 1/1. Canvia-ho amb el botó %', 'PREU D\'INDUSTRIAL? demana posar/canviar una peça', 'CONSULTAR INDUSTRIAL',
  'REVISAR PREU — orientatiu d\'obres reals, no de catàleg', 'PENDENT — partida del document sense preu: posa-hi preu', 'PENDIENTE — partida del documento sin precio: ponle precio',
  'PENDENT — partida no catalogada', 'PENDENT — partida freqüent no catalogada (real ~12 €/ml)', 'PENDENT — partida no trobada al catàleg',
  'PENDENT — confirmar partida de baranes del catàleg', 'PEDRA ARTIFICIAL / ORNAMENTAL: confirma el preu amb l\'industrial (en peces noves)',
  'PIEDRA ARTIFICIAL / ORNAMENTAL: confirma el precio con el industrial', 'PREU DUBTÓS — ja posat, revisar: 10,5 € (fitxa inventada)', 'PRECIO DUDOSO — ya puesto, revisar: 7 € (x)',
  'PREU DEL CATÀLEG — confirma que és aquesta partida', 'PRECIO DEL CATÁLOGO — confirmar que es esta partida', 'PREU ACTUALITZAT AL CATÀLEG (abans 5 €)',
  'PREU SOSPITÓS (el catàleg suggereix 9 €)', 'PREU FORA DE RANG', 'PRECIO FUERA DE RANGO', '% FORA DE RANG — revisar', 'SENSE PREU AL VOSTRE CATÀLEG (depèn de l\'obra, l\'hi poseu vosaltres) — confirmeu que és aquesta',
  'EL CERCADOR NO HO DONA PER SEGUR — preu a mà', 'EL BUSCADOR NO LO DA POR SEGURO — precio a mano', 'PREU DE LA LECTURA QUE NO ÉS DE CAP FITXA DEL VOSTRE CATÀLEG (3,2 €/m²) — revisar',
  'PRECIO DE LA LECTURA QUE NO ES DE NINGUNA FICHA DE VUESTRO CATÁLOGO (3,2 €/m²) — revisar', 'Sense preu — la intranet rebutja el fitxer sencer'];
const LECT = ['⚠ SENSE UNITAT — posa la del document', '⚠⚠ NO ÉS AL DOCUMENT COM A PARTIDA: és una línia de mesura', 'CANTIDAD 12 — pon la del documento',
  'UNIDAD DEL DOCUMENTO — la lectura decía m²', 'QUANTITAT DEL DOCUMENT — la lectura deia 4', 'TEXTO DISTINTO DEL DOCUMENTO: compruébalo', 'NO ÉS AL DOCUMENT: l\'ha afegida la lectura. Comprova-la o treu-la.',
  'PARTIDA REPETIDA PER LA LECTURA: el document escriu aquest text 1 vegada', 'CAPÍTOL SEGONS EL DOCUMENT: la lectura la posava a «X»', 'UNITAT metre lineal? (element lineal amidat en m²)',
  'PENDENT — amidament no deduïble', 'PENDENT — passar a ml (criteri GTA)', 'PENDENT — abast per confirmar', 'PENDENT — partida no catalogada / abast a confirmar',
  'PENDENT — preu a revisar (la quantitat no quadra amb el document)', 'IMPORT DESORBITAT — revisa el preu (molt per sobre del normal)', 'ÉS AL VOSTRE CATÀLEG PERÒ EN ml I AQUÍ VE EN m² — reviseu la unitat',
  'PREU DE LA LECTURA D\'UNA FITXA EN ml I AQUÍ VE EN m² (4 €) — reviseu unitat i preu', 'OPCIONAL (NO SUMA AL TOTAL)', 'una frase qualsevol que la IA s\'ha inventat',
  'PENDENT — preu a revisar i també la quantitat', 'Confirma la quantitat'];

function tot(H, pre) {
  pre = pre || '';
  let T; try { T = classif(H); } catch (e) { check(pre + 'la funció que classifica les marques hi és', false, e.message); return; }
  console.log(pre + '1. cada marca, al seu comptador');
  const pMal = PREU.filter(x => { const t = T(x); return !(t.preu && !t.lect); });
  check(pre + PREU.length + ' textos de preu (català i castellà) compten només com a PREU', !pMal.length, pMal.join(' | '));
  const lMal = LECT.filter(x => { const t = T(x); return !(t.lect && !t.preu); });
  check(pre + LECT.length + ' textos de lectura, de la IA i inventats compten com a LECTURA (mai amagats com a preu)', !lMal.length, lMal.join(' | '));
  const m = T('PENDENT — preu a revisar · CANTIDAD 3 — pon la del documento');
  check(pre + 'una marca amb preu i lectura compta als dos', m.lect && m.preu, JSON.stringify(m));
  const b1 = T('PENDENT — la mateixa partida surt avisada a la 2.1: «PENDENT — preu a revisar». Revisa-la també aquí.');
  const b2 = T('PENDIENTE — la misma partida está avisada en la 3.4: «⚠ SIN UNIDAD — pon la del documento». Revísala también aquí.');
  check(pre + 'la bessona compta pel que diu la seva (preu → preu; lectura → lectura)', b1.preu && !b1.lect && b2.lect && !b2.preu, JSON.stringify([b1, b2]));
  const z = T(''), u = T(' · ');
  check(pre + 'sense marca, cap comptador; una marca que no se sap llegir, a LECTURA (mai fora dels dos)', !z.lect && !z.preu && u.lect, JSON.stringify([z, u]));

  console.log(pre + '2. la pantalla: dos números, la lectura primer');
  const iL = H.indexOf('id="sFlagsL"'), iP = H.indexOf('id="sFlagsP"');
  check(pre + 'la targeta porta els dos números, Lectura abans que Preus', iL > 0 && iP > iL);
  check(pre + 'el comptador de cada tipus es pinta', /\$\("#sFlagsL"\)\.textContent=flagsL;\$\("#sFlagsP"\)\.textContent=flagsP;/.test(H) && !/\$\("#sFlags"\)\.textContent=flags;/.test(H));
  check(pre + 'cada partida marcada compta al seu', /const _mk=r\.flag\?tipusMarca\(r\.flag\):null;if\(r\.flag\)\{flags\+\+;if\(_mk\.lect\)flagsL\+\+;if\(_mk\.preu\)flagsP\+\+;\}/.test(H));
  check(pre + 'la fila diu de quin tipus és i conserva el mateix color (classe «flagged»)', /<tr class="part\$\{r\.flag\?" flagged":""\}[\s\S]{0,200}?data-mk="\$\{\(_mk\.lect\?"L":""\)\+\(_mk\.preu\?"P":""\)\}"/.test(H));
  check(pre + 'textos en català i castellà', /s_rev_l:"Lectura",s_rev_p:"Preus"/.test(H) && /s_rev_l:"Lectura",s_rev_p:"Precios"/.test(H));
  check(pre + 'el clic sense número recorre primer les de lectura', /_L\.concat\(_alt\)/.test(H) && /k==="L"\?_L:/.test(H));

  console.log(pre + '3. la finestra de pendents: les mateixes partides, la lectura primer');
  { const ROWS = [{ tipo: 'part', num: '1.1', desc: 'PINTURA INVENTADA', flag: 'PENDENT — preu a revisar' },
      { tipo: 'part', num: '1.2', desc: 'ARREBOSSAT INVENTAT', flag: 'CANTIDAD 7 — pon la del documento' },
      { tipo: 'part', num: '1.3', desc: 'BARANA INVENTADA', flag: '⚠ SENSE UNITAT — posa la del document' },
      { tipo: 'part', num: '1.4', desc: 'PARTIDA SENSE QUANTITAT', flag: '' }];
    const list = [{ r: ROWS[0], i: 0, missing: false, motiu: ROWS[0].flag }, { r: ROWS[1], i: 1, missing: false, motiu: ROWS[1].flag },
      { r: ROWS[2], i: 2, missing: true, motiu: 'Sense preu — la intranet rebutja el fitxer sencer' }, { r: ROWS[3], i: 3, missing: false, motiu: 'Quantitat 0,00 — comprova-la al document' }];
    const el = {}, $ = s => (el[s] = el[s] || { innerHTML: '', textContent: '', classList: { add() {}, remove() {} }, value: '', onclick: null }), vals = { '#h_obra': 'X', '#h_coac': 'A', '#h_tec': 'B', '#h_ciutat': '08000 X' };
    const $$ = s => (s in vals ? { value: vals[s] } : $(s));
    let G = null;
    try { G = new Function('IDIOMA', 'rows', 'confirm', '$', 'pendingFlagRows', 'isNoSuma', 'esc', 'pushUndo', 'subsOf', 'render', 'toast',
      'let _MARCA_PREU=null;\n' + extFn(H, '_trosEsPreu') + '\n' + extFn(H, 'tipusMarca') + '\n' + extFn(H, 'askFlagsGate') + '\nreturn askFlagsGate;')(
      'ca', ROWS, () => true, $$, () => list, () => false, x => String(x == null ? '' : x), () => {}, () => [], () => {}, () => {}); } catch (e) { check(pre + 'la finestra es pot provar', false, e.message); }
    if (G) { G('xls'); const h = $('#flagsGateList').innerHTML, sub = $('#flagsGateSub').textContent;
      const pos = n => h.indexOf('<b>' + n + '</b>'), cnt = n => h.split('<b>' + n + '</b>').length - 1;
      check(pre + 'hi són les 4 partides, cadascuna una sola vegada', ['1.1', '1.2', '1.3', '1.4'].every(n => cnt(n) === 1), h.slice(0, 300));
      check(pre + 'les de lectura (1.2, 1.3, 1.4) surten abans que la de preu (1.1), amb el seu títol', pos('1.2') < pos('1.1') && pos('1.3') < pos('1.1') && pos('1.4') < pos('1.1')
        && h.indexOf('Lectura · mireu-les al document (3)') >= 0 && h.indexOf('Lectura') < h.indexOf('Preus (1)'), h.slice(0, 400));
      check(pre + 'la de «sense preu» amb marca de lectura ensenya totes dues coses', /Sense preu[\s\S]*?SENSE UNITAT/.test(h.slice(pos('1.3'), pos('1.3') + 700)));
      check(pre + 'el text de dalt diu quantes de cada', /de lectura \(a dalt\) i 1 de preu|3 de lectura/.test(sub) || /SENSE PREU/i.test(sub), sub); } }

  console.log(pre + '4. els avisos de la lectura, a dalt (vermells primer)');
  { const MI = '\u200b', el = {}, $ = s => (el[s] = el[s] || { innerHTML: '', textContent: '', classList: { toggle(c, v) { this.h = v; }, remove() { this.h = false; } } });
    const I18N = { ca: { ing_avisos: 'A revisar (proposat per IA, valida abans d\'usar):' }, es: { ing_avisos: 'A revisar (propuesto por IA, valida antes de usar):' } };
    const NOTES = [MI + '⚠ ' + I18N.ca.ing_avisos, MI + '• Avís normal inventat', MI + '• ⚠ Avís taronja inventat', MI + '• ⚠⚠ Avís vermell inventat', 'Nota del client que surt al PDF'];
    let R = null; try { R = new Function('IDIOMA', 'NOTES', 'I18N', 'MARCA_INTERNA', 'esNotaInterna', '$', 'esc', 'console', extFn(H, 'renderAvisosLectura') + '\nreturn renderAvisosLectura;'); } catch (e) { check(pre + 'la llista de dalt hi és', false, e.message); }
    if (R) { R('ca', NOTES, I18N, MI, n => String(n).startsWith(MI), $, x => String(x), { error() {} })();
      const l = $('#lectAvisosL').innerHTML, iR = l.indexOf('vermell'), iT = l.indexOf('taronja'), iN = l.indexOf('normal');
      check(pre + 'els 3 avisos hi són, vermell, taronja i normal, en aquest ordre', iR >= 0 && iT > iR && iN > iT, l);
      check(pre + 'ni la capçalera ni la nota del client hi surten; el títol diu quants', !/Nota del client/.test(l) && !/proposat per IA/.test(l) && /\(3\)/.test($('#lectAvisosH').textContent), $('#lectAvisosH').textContent);
      check(pre + 'el vermell porta el color vermell i el taronja el taronja', /<li class="r">⚠⚠ Avís vermell/.test(l) && /<li class="o">⚠ Avís taronja/.test(l));
      const e2 = {}, $2 = s => (e2[s] = e2[s] || { innerHTML: '', textContent: '', classList: { toggle() {}, remove() {} } });
      R('ca', NOTES, null, MI, n => String(n).startsWith(MI), $2, x => String(x), { error() {} })();
      check(pre + 'si peta, es diu (cap llista buida en silenci)', /No s'han pogut mostrar/.test($2('#lectAvisosH').textContent), $2('#lectAvisosH').textContent); }
    check(pre + 'la llista és a dalt de la taula i es pinta amb les notes', H.indexOf('id="lectAvisos"') > 0 && H.indexOf('id="lectAvisos"') < H.indexOf('<div class="tablewrap">') && /function renderNotes\(\)\{\s*renderAvisosLectura\(\);/.test(H)); }
}

tot(H0);
console.log('5. cada peça trencada es veu');
const PECES = [
  ['tot és preu', 'if(p&&_trosEsPreu(p))preu=true; else lect=true;', 'preu=true;'],
  ['el desconegut no va a lectura', 'if(!lect&&!preu&&flag)lect=true;', ''],
  ['la bessona', 'if(bes)p=bes[1].trim();', ''],
  ['el comptador de lectura', 'if(_mk.lect)flagsL++;', ''],
  ['la marca de la fila', 'data-mk="${(_mk.lect?"L":"")+(_mk.preu?"P":"")}"', 'data-mk=""'],
  ['l\'ordre de la finestra', '$("#flagsGateList").innerHTML=(_gL.length?', '$("#flagsGateList").innerHTML=(_gP.length?_hd("Preus",_gP.length)+_gP.map(_it).join(""):"")+(_gL.length?'],
  ['sense preu amaga la lectura', '${x.missing&&x.r.flag?', '${false?'],
  ['l\'ordre de dalt', 'sort((a,b)=>a[0]-b[0]||a[1]-b[1])', 'sort((a,b)=>a[1]-b[1])'],
  ['la nota del client a dalt', 'NOTES.filter(n=>esNotaInterna(n))', 'NOTES.filter(n=>true)'],
];
for (const [nom, de, a] of PECES) { const H = trenca(H0, de, a); if (!H) { check('peça trencada «' + nom + '»: el codi hi és', false, 'no trobo: ' + de.slice(0, 60)); continue; }
  const ok0 = ok, ko0 = ko, log = console.log, err = console.error; console.log = () => {}; console.error = () => {};
  try { tot(H, '(rota) '); } catch (e) { ko++; } finally { console.log = log; console.error = err; }
  const caigut = ko > ko0; ok = ok0; ko = ko0; check('peça trencada «' + nom + '»: el guardià ho veu', caigut); }
console.log(`\n${ok} OK · ${ko} X`); process.exit(ko ? 1 : 0);
