#!/usr/bin/env node
'use strict';
/*
 * Guardià · 13/11/2026 · EL NÚMERO DEL NOM D'UNA LÍNIA D'AMIDAMENT ÉS NOM, NO XIFRA, I LA CAPÇALERA QUE NO QUADRA AMB LES SEVES LÍNIES ES DIU.
 *
 * Per què existeix. En un document real, la capçalera d'una partida deia 1,00 i a sota hi havia dues línies amb nom i número («ZONA 1 1,00 1,00»,
 * «ZONA 2 1,00 1,00») que sumen 2. La fila va sortir amb 1 i el segell la donava per COMPROVADA: llegia el número del nom com una xifra, prenia
 * la segona línia pel total de la primera i la suma «quadrava». I al revés: partides bones («ZONA 1 1,00 65,00» + «ZONA 2 1,00 75,00» = 140)
 * sortien sense comprovar perquè el «1» del nom es feia passar per factor i parcial («1 → 1,00»).
 * Què vigila, amb documents inventats en català i castellà (cap dada de cap client; va també al repositori públic):
 *  1) línies «NOM n uts parcial»: la partida que les suma queda COMPROVADA;
 *  2) una frase de la descripció que acaba amb una xifra («perímetre 40,00ml.») no espatlla la suma del bloc de línies del final;
 *  3) capçalera 1 i línies que sumen 2, en un document on la capçalera és la suma de les línies en 3 partides o més: fila MARCADA, amb el motiu
 *     (les línies sumen 2 i la capçalera diu 1), en català i en castellà; mai comprovada;
 *  4) la mateixa contradicció en un document que no demostra aquesta regla: no es marca (una marca falsa ensenya a no mirar-les);
 *  5) dimensions en blanc («1,00 0,00 0,00 0,00 1,00»): el parcial és l'1, no el 0;
 *  6) el número del nom pot fer de nombre d'unitats («zona 4 4,50 2,00 36,00» → 36) i, a la capçalera amb preus, és la quantitat («… 12 0,00 € 0,00 €»);
 *  7) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
function extFnB(H, n) { const m = new RegExp('function\\s+' + n + '\\s*\\(').exec(H); if (!m) return ''; const b = H.indexOf('{', m.index); let d = 0, i = b;
  for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) { i++; break; } } } return H.slice(m.index, i); }
function segell(H, idioma) { const i = H.indexOf('// ==== INICI EINES DE LECTURA ===='), f = H.indexOf('// ==== FI EINES DE LECTURA ===='), a = H.indexOf('// 06/10/2026 (Z11) · SEGELL PER PARTIDA'), b = H.indexOf('// ── fi del segell per partida (Z11) ──');
  if (i < 0 || f < 0 || a < 0 || b < 0) return null;
  try { return new Function('IDIOMA', 'window', 'console', [extFnB(H, '_dehyphen'), H.slice(i, f), H.slice(a, b)].join('\n') +
    '\nreturn {segell:segellPartides, doc:_sgDoc, mesura:(typeof _sgMesura==="function"?_sgMesura:null)};')(idioma, {}, { warn() {}, log() {}, info() {} }); } catch (e) { return null; } }

const CA = ['PRESSUPOST D\'EXEMPLE', '1 COBERTES',
  '1.1 m² Impermeabilització de coberta plana 140,00', 'Làmina de betum modificat amb armadura de feltre de polièster.', 'Inclou solapaments, peces especials i neteja final.', 'ZONA 1 1,00 65,00', 'ZONA 2 1,00 75,00',
  '1.2 m² Paviment de rajola sobre suport 140,00', 'Rajola ceràmica col·locada amb morter adhesiu i junta.', 'Inclou el sòcol del perímetre 40,00ml.', 'ZONA 1 1,00 65,00', 'ZONA 2 1,00 75,00',
  '1.3 u Prova d\'estanqueïtat de la coberta 2,00', 'Prova d\'inundació durant 24 hores amb dics de contenció.', 'ZONA 1 1,00 1,00', 'ZONA 2 1,00 1,00',
  '2 DESGUASSOS',
  '2.1 u Treballs en alçada amb cordes 1,00', 'Muntatge i desmuntatge de cordes i equips de seguretat.', 'ZONA 1 1,00 1,00', 'ZONA 2 1,00 1,00',
  '2.2 ml Connexió de baixant de PVC 2,00', 'Tub de PVC de 125 mm amb accessoris i peces especials.', 'BAIXANT 1 1,00 0,00 0,00 0,00 1,00', 'BAIXANT 2 1,00 0,00 0,00 0,00 1,00',
  '2.3 m² Arrebossat de mur amb morter de calç 36,00', 'Arrebossat en tres capes amb acabat remolinat.', 'zona 4 4,50 2,00 36,00'];
const ES = CA.map(l => l.replace('PRESSUPOST D\'EXEMPLE', 'PRESUPUESTO DE EJEMPLO').replace('Treballs en alçada amb cordes', 'Trabajos en altura con cuerdas')
  .replace('Muntatge i desmuntatge de cordes i equips de seguretat.', 'Montaje y desmontaje de cuerdas y equipos de seguridad.'));
const P = (d, ut, q) => ({ tipo: 'part', num: '', desc: d, ut, amid: q, preu: 0 });
const files = txt => { const r = []; let cur = null;
  txt.forEach((l, k) => { if (/^\d \w/.test(l)) { r.push({ tipo: 'cap', desc: l }); return; } const m = l.match(/^(\d\.\d) (m²|ml|u) (.*) (\d+,\d\d)$/);
    if (m) { cur = P(m[1] + ' ' + m[2] + ' ' + m[3] + '\n- ' + txt[k + 1], m[2] === 'm²' ? 'm2' : m[2], parseFloat(m[4].replace(',', '.'))); r.push(cur); } }); return r; };
const per = (out, codi) => out && out.cs.find(c => c.codi === codi);
const H = H0, T = segell(H, 'ca');
check('el segell es carrega', !!T);
if (T) {
  // 1, 2, 5, 6) les partides bones queden comprovades
  const o = T.segell(files(CA), CA.join('\n'), [], false);
  for (const k of ['1.1', '1.2', '1.3', '2.2', '2.3']) check(`partida ${k} (línies amb nom) COMPROVADA`, per(o, k) && per(o, k).estat === 'comprovada', per(o, k) && (per(o, k).estat + ' ' + JSON.stringify(per(o, k).res)));
  // 3) la capçalera que no quadra amb les seves línies, marcada amb el motiu
  const c21 = per(o, '2.1');
  check('2.1: capçalera 1 i línies que sumen 2 → MARCADA, mai comprovada', c21 && c21.estat === 'marcada', c21 && (c21.estat + ' ' + JSON.stringify(c21.res)));
  check('2.1: el motiu diu la suma i la capçalera, a la fila', c21 && /sumen 2 i la capçalera diu 1/.test(String(c21.r.flag || '')), c21 && c21.r.flag);
  const TE = segell(H, 'es'), oe = TE && TE.segell(files(ES), ES.join('\n'), [], true), e21 = per(oe, '2.1');
  check('2.1 en castellà: marcada amb el motiu en castellà', e21 && e21.estat === 'marcada' && /suman 2 y la cabecera dice 1/.test(String(e21.r.flag || '')), e21 && (e21.estat + ' ' + e21.r.flag));
  // 4) document que no demostra la regla: no es marca
  const CURT = CA.slice(0, 2).concat(CA.slice(17, 21)), oc = T.segell(files(CURT).concat([]), CURT.join('\n') + '\n' + 'Nota final del document sense xifres per arribar a la mida mínima del text que es comprova.'.repeat(2), [], false), k21 = per(oc, '2.1');
  check('document sense la regla: la contradicció no es marca (ni es dona per comprovada)', k21 && k21.estat !== 'marcada' && k21.estat !== 'comprovada', k21 && (k21.estat + ' ' + JSON.stringify(k21.res)));
  // 5, 6) peces soltes
  const D = T.doc(['BAIXANT 1 1,00 0,00 0,00 0,00 1,00', 'zona 4 4,50 2,00 36,00', '1.2 h Revisió d\'elements de façana 12 0,00 € 0,00 €', 'ZONA 1 1,00 65,00'].join('\n'));
  const ms = k => T.mesura ? T.mesura(D.tl[k].ns, D.tl[k].lab) : null;
  check('dimensions en blanc: el parcial és 1, no 0', ms(0) && ms(0).p.v === 1, ms(0) && JSON.stringify(ms(0)));
  check('«zona 4 4,50 2,00 36,00»: el 4 fa de nombre d\'unitats → 36 amb prova', ms(1) && ms(1).ok && ms(1).p.v === 36, ms(1) && JSON.stringify(ms(1)));
  check('capçalera amb preus: el 12 és la quantitat (es queda a les xifres)', D.tl[2].ns.some(n => n.v === 12) && !D.tl[2].lab, JSON.stringify(D.tl[2]));
  check('«ZONA 1 1,00 65,00»: el parcial és 65, no 1', ms(3) && ms(3).p.v === 65, ms(3) && JSON.stringify(ms(3)));
  // 7) cada peça trencada es veu
  const trenca = (de, a) => { const s = H.replace(de, a); return s === H ? null : s; };
  const casos = [
    ['sense apartar el número del nom', 'lab=ns.shift();', 'lab=null;'],
    ['sense la marca de la capçalera que no quadra', 'q_capc:c=>c.ordre&&c.docCapc,', ''],
    ['sense el bloc de línies del final', 'for(const x of [...new Set([s,s2])])', 'for(const x of [])'],
    ['amb el número del nom com a factor sol', '||(lf&&j===0&&pi===1)', ''],
  ];
  for (const [nom, de, a] of casos) { const H2 = trenca(de, a); if (!H2) { check('peça trobada: ' + nom, false, 'no hi és'); continue; }
    const T2 = segell(H2, 'ca'), o2 = T2 && T2.segell(files(CA), CA.join('\n'), [], false);
    const bo = o2 && ['1.1', '1.2', '1.3', '2.2', '2.3'].every(k => per(o2, k) && per(o2, k).estat === 'comprovada') && per(o2, '2.1') && per(o2, '2.1').estat === 'marcada';
    check('trencat es veu: ' + nom, !bo); }
}
console.log(`\n${ok} OK · ${ko} X`); process.exit(ko ? 1 : 0);
