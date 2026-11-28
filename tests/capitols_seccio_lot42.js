#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 42 (27/10/2026) · LA CAPÇALERA DE SECCIÓ O DE PÀGINA DEL DOCUMENT NO ÉS CAP CAPÍTOL. Documents inventats, català i castellà, cap dada de cap client
 * (va també al repositori públic).
 *  1) «1.- CUADRO DE MANO DE OBRA.», «PRESSUPOST PÀG.: 2», «CAPÍTULO RESUMEN IMPORTE», «CÓDIGO CANTIDAD UD DESCRIPCIÓN…» sense cap partida a sota: fora;
 *  2) amb partides a sota: es queden i surt un avís taronja amb el seu nom; el text de la nostra petició («AMIDAMENT — NOMÉS aquest tros…»): fora sempre;
 *  3) no es toquen: «PRESSUPOST PARCIAL Nº 3 FONAMENTS», ni un títol propi del document que comença igual («MEDICIONES ACTUACIONES DEFICIENCIAS EDIFICIO»);
 *  4) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.split(de).join(a); return s === src ? null : s; };
function carrega(H, idioma) {
  const i = H.indexOf('// ==== INICI EINES DE LECTURA ===='), f = H.indexOf('// ==== FI EINES DE LECTURA ====');
  const deh = (H.match(/function _dehyphen\(s\)\{[^\n]*\}/) || [''])[0] + '\n' + ((H.match(/^const parseNum=.*$/m) || [''])[0]) + '\n' + ((H.match(/^const num2=.*$/m) || [''])[0]);
  const code = [deh, 'function pctPerDefecte(){ return null; }', 'function isNoSuma(){ return false; }', H.slice(i, f)].join('\n');
  return new Function('IDIOMA', code + '\nreturn {s:(typeof _capitolsQueSonSeccions==="function"?_capitolsQueSonSeccions:null)};')(idioma);
}
const P = (desc) => ({ tipo: 'part', num: '', desc, ut: 'u', amid: 1, preu: 0 });
const cap = d => ({ tipo: 'cap', desc: d }), sec = d => ({ tipo: 'sec', desc: d });
const D = {
  ca: { buits: ['1.- QUADRE DE MÀ D\'OBRA.', 'PRESSUPOST PÀG.: 2', 'CAPÍTOL RESUM IMPORT', 'CODI QUANTITAT UT DESCRIPCIÓ PREU SUBTOTAL IMPORT'], ambPart: 'QUADRE DE PREUS NÚMERO 1',
    prompt: 'AMIDAMENT — NOMÉS aquest tros del document', reals: ['PRESSUPOST PARCIAL Nº 3 FONAMENTS', 'AMIDAMENTS ACTUACIONS DEFICIÈNCIES EDIFICI'] },
  es: { buits: ['1.- CUADRO DE MANO DE OBRA.', 'PRESUPUESTO PÁG.: 2', 'CAPÍTULO RESUMEN IMPORTE', 'CÓDIGO CANTIDAD UD DESCRIPCIÓN PRECIO SUBTOTAL IMPORTE'], ambPart: 'CUADRO DE PRECIOS Nº 1',
    prompt: 'AMIDAMENT — NOMÉS aquest tros del document', reals: ['PRESUPUESTO PARCIAL Nº 3 CIMENTACIÓN', 'MEDICIONES ACTUACIONES DEFICIENCIAS EDIFICIO'] } };
function prova(H, ll) {
  const T = carrega(H, ll), d = D[ll], es = ll === 'es', res = {};
  if (!T.s) throw new Error('falta _capitolsQueSonSeccions');
  { const rows = [sec('Z'), cap('ENDERROCS'), P('a')].concat(d.buits.map(cap), [cap(d.reals[0]), P('b')]); const av = []; T.s(rows, av, es);
    res.buits = !rows.some(r => d.buits.indexOf(r.desc) >= 0) && rows.some(r => r.desc === d.reals[0]) && av.some(a => /^⚠ /.test(a)); res.buitsDetall = rows.map(r => r.tipo[0] + ':' + r.desc).join(' | '); }
  { const rows = [sec('Z'), cap(d.ambPart), P('a'), cap(d.prompt), P('b')]; const av = []; T.s(rows, av, es);
    res.ambPart = rows.some(r => r.desc === d.ambPart) && !rows.some(r => r.desc === d.prompt) && av.some(a => a.indexOf(d.ambPart.slice(0, 20)) >= 0); }
  { const rows = [cap(d.reals[1]), cap('ESTRUCTURA'), P('a'), cap(d.reals[0]), P('b')]; const av = []; const n = T.s(rows, av, es);
    res.reals = n === 0 && rows.length === 5 && !av.length; }
  return res;
}
for (const ll of ['ca', 'es']) {
  const e = ll === 'ca' ? '[CA]' : '[ES]'; let R; try { R = prova(H0, ll); } catch (x) { check(e + ' les eines es carreguen', false, x.message); continue; }
  check(e + ' 1) capçaleres de secció o de pàgina sense partides: fora', R.buits, R.buitsDetall);
  check(e + ' 2) amb partides: es queda amb avís; el text de la petició: fora', R.ambPart);
  check(e + ' 3) «PRESSUPOST PARCIAL Nº 3 …» i un títol propi que comença igual: no es toquen', R.reals);
}
check('la càrrega crida la comprovació', /_capitolsQueSonSeccions\(allRows,allAvisos,IDIOMA==="es"\)/.test(H0));
const peces = [
  ['1 (els buits es queden)', trenca(H0, '    if(buit||prompt) fora.push(i); else', '    if(prompt) fora.push(i); else'), R => R.buits],
  ['3 (el vocabulari de secció no es mira)', trenca(H0, 'if(resta.some(w=>!/^(?:Y|I|E|DE|', 'if(false&&resta.some(w=>!/^(?:Y|I|E|DE|'), R => R.reals],
];
for (const [n, H, ok1] of peces) { if (!H) { check('peça rota ' + n + ': es pot muntar', false); continue; }
  let vist = false; for (const ll of ['ca', 'es']) { try { if (!ok1(prova(H, ll))) vist = true; } catch (e) { vist = true; } }
  check('peça rota ' + n + ': el guardià la veu', vist); }
console.log((ko ? '✗ ' : '✓ ') + ok + ' OK · ' + ko + ' X');
process.exit(ko ? 1 : 0);
