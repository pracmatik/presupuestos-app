#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 45 (28/10/2026) · EL CAPÍTOL QUE CONTINUA AL TALL ENTRE DOS TROSSOS. Documents inventats, català i castellà, cap dada de cap client
 * (va també al repositori públic; la lectura real que ho va destapar té el seu guardià privat, test_tall_capitol_lectura_real_lot45.js).
 * D'on ve: una lectura real del 28/10. El tros 10 continuava el capítol 07 («07.16 … 07.19») i a sota obria el 08; la IA hi posava a dalt el capítol obert
 * («07 SEGURIDAD Y SALUD»). L'app buscava on l'escriu el document, trobava la línia de TOTAL del capítol 07 i hi movia el 07: el 08 quedava buit i les seves
 * partides, al 07, sense alarma vermella.
 *  1) la línia de total, subtotal, suma, import o resum, o amb punts de guia (taula de resum: «07 SEGURIDAD Y SALUD……… 1.234,56»), no és la capçalera:
 *     cada partida queda al capítol que li dona el document;
 *     ni la línia d'una partida que porta el nom del capítol al títol («07.18 Ud Plan de seguridad y salud»);
 *  2) un capítol que el document escriu amb partides a sota no surt buit sense alarma vermella;
 *  3) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(fs.existsSync);
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.split(de).join(a); return s === src ? null : s; };
function eF(H, n) { const s = H.indexOf('function ' + n + '('); if (s < 0) return 'function ' + n + '(){ throw new Error("falta ' + n + '"); }'; let i = H.indexOf('{', s), d = 0; for (; i < H.length; i++) { if (H[i] === '{') d++; else if (H[i] === '}') { d--; if (d === 0) return H.slice(s, i + 1); } } }
const carrega = H => new Function([eF(H, '_capcaleraForaDeLloc'), eF(H, '_mateixCapitolAlTall'), eF(H, '_capitolsBuitsAmbPartides')].join('\n') + '\nreturn {_capcaleraForaDeLloc, _mateixCapitolAlTall, _capitolsBuitsAmbPartides};')();
// el mateix que fa l'app a cada tros que continua (doUpload): capçalera fora de lloc, mateix capítol al tall, i s'ajunta
function ajunta(F, abans, tros, trosAbans, es) { const av = []; const t = JSON.parse(JSON.stringify(tros)); F._capcaleraForaDeLloc(t, trosAbans.text, trosAbans.textAbans, av, es); F._mateixCapitolAlTall(abans, t); return { rows: abans.concat(t), av }; }
const capDe = (rows, codi) => { let c = null; for (const r of rows) { if (r.tipo === 'cap' || r.tipo === 'sec') c = String(r.desc); else if (r.tipo === 'part' && String(r.desc).indexOf(codi) === 0) return c; } return undefined; };
const P = (codi, ut, tit) => ({ tipo: 'part', desc: codi + ' ' + ut + ' ' + tit, ut, amid: 1, preu: 0 });
const D = {
  es: { a: ['CAPÍTULO 07 SEGURIDAD Y SALUD', '07.01 u Casco de seguridad contra impactos', 'Casco de seguridad homologado.', '10,00'].concat(...[2, 3, 4, 5, 6].map(n => ['07.0' + n + ' u Señal de seguridad tipo ' + n, 'Señal de PVC homologada, colocada.', n + ',00'])),
        b: ['07.16 u Par de guantes de protección eléctrica', 'Par de guantes aislantes clase 3.', '5,00', '07.17 u Arnés anticaídas de poliéster', 'Arnés anticaídas homologado.', '5,00',
            'TOTAL CAPÍTULO 07 SEGURIDAD Y SALUD.................................... 1.234,56', 'CAPÍTULO 08 GESTIÓN DE RESIDUOS', '08.01 m3 Retirada de residuos mixtos a planta de valorización',
            'Retirada de residuos mixtos de obra a planta autorizada.', '12,00', '08.02 m3 Retirada de residuos cerámicos con medios mecánicos', 'Retirada de residuos cerámicos.', '8,00'],
        cap7: '07 SEGURIDAD Y SALUD', cap7doc: 'CAPÍTULO 07 SEGURIDAD Y SALUD', cap8: '08 GESTIÓN DE RESIDUOS',
        p: [['07.01', 'u', 'Casco de seguridad contra impactos'], ['07.16', 'u', 'Par de guantes de protección eléctrica'], ['07.17', 'u', 'Arnés anticaídas de poliéster'], ['08.01', 'm3', 'Retirada de residuos mixtos a planta de valorización'], ['08.02', 'm3', 'Retirada de residuos cerámicos con medios mecánicos']] },
  ca: { a: ['CAPÍTOL 07 SEGURETAT I SALUT', '07.01 u Casc de seguretat contra impactes', 'Casc de seguretat homologat.', '10,00'].concat(...[2, 3, 4, 5, 6].map(n => ['07.0' + n + ' u Senyal de seguretat tipus ' + n, 'Senyal de PVC homologat, col·locat.', n + ',00'])),
        b: ['07.16 u Parell de guants de protecció elèctrica', 'Parell de guants aïllants classe 3.', '5,00', '07.17 u Arnès anticaigudes de polièster', 'Arnès anticaigudes homologat.', '5,00',
            'TOTAL CAPÍTOL 07 SEGURETAT I SALUT.................................... 1.234,56', 'CAPÍTOL 08 GESTIÓ DE RESIDUS', '08.01 m3 Retirada de residus mixtos a planta de valorització',
            'Retirada de residus mixtos d\'obra a planta autoritzada.', '12,00', '08.02 m3 Retirada de residus ceràmics amb mitjans mecànics', 'Retirada de residus ceràmics.', '8,00'],
        cap7: '07 SEGURETAT I SALUT', cap7doc: 'CAPÍTOL 07 SEGURETAT I SALUT', cap8: '08 GESTIÓ DE RESIDUS',
        p: [['07.01', 'u', 'Casc de seguretat contra impactes'], ['07.16', 'u', 'Parell de guants de protecció elèctrica'], ['07.17', 'u', 'Arnès anticaigudes de polièster'], ['08.01', 'm3', 'Retirada de residus mixtos a planta de valorització'], ['08.02', 'm3', 'Retirada de residus ceràmics amb mitjans mecànics']] } };
function prova(F, ll, resum, titol) { const d = Object.assign({}, D[ll]); if (resum) d.b = d.b.map(l => /^TOTAL CAP/.test(l) ? d.cap7 + '.................................... 1.234,56' : l);
  if (titol) { const t = d.cap7.replace(/^07 /, ''); d.b = d.b.filter(l => !/^TOTAL CAP/.test(l)); d.b.splice(6, 0, '07.18 u Plan de ' + t.toLowerCase(), 'Plan de ' + t.toLowerCase() + ' de la obra.', '1,00'); d.p = d.p.concat([['07.18', 'u', 'Plan de ' + t.toLowerCase()]]); } const abans = [{ tipo: 'cap', desc: d.cap7doc }, P(...d.p[0])];
  const p18 = d.p[5] ? Object.assign(P(...d.p[5]), { desc: d.p[5].join(' ').replace(/^(\S+) (\S+) /, '$1 $2 ') + '\n' + d.b[7] }) : null;   // la lectura copia el títol i el text
  const tros = [{ tipo: 'cap', desc: d.cap7 }, P(...d.p[1]), P(...d.p[2])].concat(p18 ? [p18] : [], [{ tipo: 'cap', desc: d.cap8 }, P(...d.p[3]), P(...d.p[4])]);
  const r = ajunta(F, abans, tros, { text: d.b.join('\n'), textAbans: d.a.join('\n') }, ll === 'es'); r.text = d.a.concat(d.b).join('\n'); return r; }
for (const ll of ['es', 'ca']) {
  const F = carrega(H0), r = prova(F, ll), d = D[ll];
  console.log('\n' + ll);
  check('les partides 07.16 i 07.17 queden al capítol 07, i les 08.01 i 08.02 al 08', /07/.test(capDe(r.rows, '07.16')) && /07/.test(capDe(r.rows, '07.17')) && /08/.test(capDe(r.rows, '08.01')) && /08/.test(capDe(r.rows, '08.02')), JSON.stringify(r.rows.map(x => x.tipo[0] + ':' + String(x.desc).slice(0, 18))));
  check('cap capítol buit amb partides al document', F._capitolsBuitsAmbPartides(r.rows, r.text).length === 0, F._capitolsBuitsAmbPartides(r.rows, r.text).join(' | '));
}
for (const ll of ['es', 'ca']) { const F = carrega(H0), r = prova(F, ll, true); check(ll + ': amb la línia de resum amb punts de guia en lloc del TOTAL, igual: 08.01 al capítol 08', /08/.test(capDe(r.rows, '08.01')) && /07/.test(capDe(r.rows, '07.16')), JSON.stringify(r.rows.map(x => x.tipo[0] + ':' + String(x.desc).slice(0, 18)))); }
for (const ll of ['es', 'ca']) { const F = carrega(H0), r = prova(F, ll, false, true); check(ll + ': una partida amb el nom del capítol al títol («07.18 … Plan de seguridad y salud») no és la capçalera: 08.01 al 08', /08/.test(capDe(r.rows, '08.01')) && /07/.test(capDe(r.rows, '07.18')), JSON.stringify(r.rows.map(x => x.tipo[0] + ':' + String(x.desc).slice(0, 18)))); }
console.log('\nverd no basta: es trenca cada peça');
{ const s = trenca(H0, 'if(esTanca(l)||dePartida(l)) return false;', 'if(esTanca(l)) return false;'); check('(la prova és vàlida: la regla de la línia de partida es pot treure)', !!s); if (s) { const F = carrega(s), r = prova(F, 'es', false, true); check('sense la regla de la línia de partida → el 08 torna a quedar buit', /07/.test(capDe(r.rows, '08.01')), JSON.stringify(r.rows.map(x => x.tipo[0] + ':' + String(x.desc).slice(0, 18)))); } }
{ const s = trenca(H0, '||/\\.{5,}/.test(String(l));', ';'); check('(la prova és vàlida: la regla dels punts de guia es pot treure)', !!s); if (s) { const F = carrega(s), r = prova(F, 'es', true); check('sense la regla dels punts de guia → el 08 torna a quedar buit', /07/.test(capDe(r.rows, '08.01'))); } }
{ const s = trenca(H0, 'const esLa=l=>{ if(esTanca(l)||dePartida(l)) return false; const t=net(l);', 'const esLa=l=>{ const t=net(l);'); check('(la prova és vàlida: la línia de total es pot tornar a prendre per la capçalera)', !!s);
  if (s) for (const ll of ['es', 'ca']) { const F = carrega(s), r = prova(F, ll); check(ll + ': sense la regla → el 08 queda buit i les seves partides al 07 (com el 28/10)', /07/.test(capDe(r.rows, '08.01')), JSON.stringify(r.rows.map(x => x.tipo[0] + ':' + String(x.desc).slice(0, 18))));
    check(ll + ': …i la comprovació de coherència ho diu (el 08 surt buit amb partides al document)', F._capitolsBuitsAmbPartides(r.rows, r.text).some(t => /08/.test(t)), F._capitolsBuitsAmbPartides(r.rows, r.text).join(' | ')); } }
{ const s1 = trenca(H0, 'const esLa=l=>{ if(esTanca(l)||dePartida(l)) return false; const t=net(l);', 'const esLa=l=>{ const t=net(l);'), s = s1 && trenca(s1, '  return out;\n}\nfunction _capcaleraForaDeLloc', '  return [];\n}\nfunction _capcaleraForaDeLloc');
  check('(la prova és vàlida: la comprovació de coherència es pot treure)', !!s); if (s) { const F = carrega(s), r = prova(F, 'es'); check('sense la comprovació → el capítol buit passa en silenci', F._capitolsBuitsAmbPartides(r.rows, r.text).length === 0); } }
{ const s = trenca(H0, 'if(_cbp.length) allAvisos.unshift(', 'if(false) allAvisos.unshift('); check('(l\'alarma vermella del capítol buit és a la cadena de l\'app)', !!s); }
console.log(ko === 0 ? ('\n== TALL DE CAPÍTOL LOT 45 OK -- ' + ok + '/' + (ok + ko) + ' ==') : ('\n== FALLA -- ' + ko + ' de ' + (ok + ko) + ' =='));
process.exit(ko ? 1 : 0);
