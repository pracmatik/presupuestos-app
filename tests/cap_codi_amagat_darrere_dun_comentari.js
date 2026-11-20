#!/usr/bin/env node
'use strict';
/*
 * Guardià · 11/11/2026 (Z_lectura) · CAP SENTÈNCIA DEL PROGRAMA AMAGADA DARRERE D'UN COMENTARI DE LÍNIA.
 * Cap dada de cap client: mira el codi de l'app i unes línies inventades (va també al repositori públic).
 * D'on ve: una comprovació de seguretat («el document escriu aquest tros una sola vegada») va quedar escrita al final d'una línia, darrere del «//»
 * d'un comentari, i no es va executar mai durant dues setmanes. Cap prova ho veia, perquè el programa no fallava: simplement no feia la comprovació
 * i treia una partida de debò. Aquesta és la CLASSE d'errada, no el cas: una línia amb codi, un comentari, i al final del comentari sentències
 * que semblen codi viu (declaració o condició seguida d'una acció).
 *  1) a l'app no n'hi ha cap;
 *  2) les línies inventades que ho són es veuen, i les que no ho són (prosa, exemples entre «» o ``, adreces, expressions amb barres) no salten;
 *  3) cada peça trencada es veu (la mateixa errada tornada a posar de dues maneres).
 * Si salta per un comentari que cita codi a propòsit: posa l'exemple entre «» o entre accents greus, o en una línia que sigui només comentari.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 400) : '')); } };
// on comença el comentari de línia, fora de cadenes; «\/» (barra escapada d'una expressió) i «://» (adreça) no ho són
function iniciComentari(l) { let q = null; for (let i = 0; i < l.length; i++) { const c = l[i];
    if (c === '\\') { i++; continue; }
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '/' && l[i + 1] === '/') { if (i > 0 && l[i - 1] === ':') { i++; continue; } return i; } }
  return -1; }
// la cua del comentari ACABA amb sentències: prosa, espai, i una declaració seguida d'una acció, o una condició seguida d'una acció
const RE_CUA = /[.:»)\p{L}\d]\s+(?:(?:const|let|var)\s+[\w$]+\s*=[^;]{1,120};\s*(?:if|return|for|while|[\w$.]+\s*\()|if\s*\([^\n]{3,140}\)\s*(?:return|continue|break|[\w$.\]]+\s*(?:=[^=]|\()))[^\n]*$|[.:»)\p{L}\d]\s+(?:while|for)\s*\([^\n]{3,220}\)\s*(?:\{|[\w$.\]]+\s*(?:=[^=]|\())[^\n]*$|;\s*return\b[^;\n]{0,80};\s*\}\s*\)?;?$/u;   // 11/11 tarda: també un bucle («… mesura while(…) p.pop(); return p; };») o el tancament d'una funció
function amagades(src) { const out = []; String(src).split('\n').forEach((l, i) => { if (l.length < 30) return; const k = iniciComentari(l); if (k < 0 || !l.slice(0, k).trim()) return;
    let cua = l.slice(k + 2).replace(/«[^»]*»|`[^`]*`/g, ' '); const k2 = cua.search(/(?:^|[^:\\])\/\/(?=\s|$)/); if (k2 >= 0) cua = cua.slice(0, k2 + 1);   // un segon comentari al darrere no ho tapa
    cua = cua.trim(); if (!/[;})]$/.test(cua)) return; if (RE_CUA.test(cua)) out.push((i + 1) + ': …' + cua.slice(-110)); });
  return out; }

// 1) l'app
const A = amagades(H0);
check('a l\'app no hi ha cap sentència amagada darrere d\'un comentari de línia', A.length === 0, A.join(' | '));

// 2) línies inventades
const SI = [
  'if(titol.length<8) return;   // massa curt per ser un tros (fuzz) const o=aparicions(text,tros,2); if(o.length!==1) return;',
  'const cos=net(fila.desc);   // el text de la fila sense el títol. if(cos.length<12) return;',
  'total+=fila.import;   // suma de la zona: let n=compta(files); if(n>3) avisa(n);',
  'files.push(nova);   // la fila nova va al final. if(!nova.ut) nova.ut=unitat(nova.desc);',
  'if(titol.length<8) return;   // massa curt (fuzz) if(aparicions(text,tros,2).length!==1) return;   // i el document l\'escriu una sola vegada',
  'let p=x.split(" ").slice(0,6); if(k>0) p=p.slice(0,k);   // el número és part del nom, no una mesura while(p.length>1&&buida(p[p.length-1])) p.pop(); return p; };',
  'const n=llista.length;   // una per fila for(const f of llista){ if(!f.ut) f.ut=unitat(f.desc); }' ];
const NO = [
  'if(titol.length<8) return;   // massa curt per ser un tros: no es mira res més',
  'const cos=net(fila.desc);   // abans era «const cos=fila.desc; if(cos) return;» i perdia el títol',
  'const u="https://exemple.cat/a//b";   // adreça amb dues barres dins d\'una cadena',
  'if(!/\\/camí\\//.test(String(adreca))) return; const e=compta(adreca); e.tot++;',
  '// const o=aparicions(text,tros,2); if(o.length!==1) return;',
  'x=a/b;   // divisió: si b és 0 el resultat és Infinity (es mira més avall, a la línia de if(b===0))',
  'p.pop();   // es treu mentre la darrera paraula sigui buida (abans es feia amb un while i un return al final)',
  'const n=llista.length;   // una per fila, com fa el for de més avall' ];
SI.forEach((l, i) => check('línia inventada amb codi amagat ' + (i + 1) + ': es veu', amagades(l).length === 1, l));
NO.forEach((l, i) => check('línia inventada que no ho és ' + (i + 1) + ': no salta', amagades(l).length === 0, amagades(l).join(' | ')));

// 3) peces trencades: la mateixa errada tornada a posar a l'app
const trenca = (src, de, a) => { const s = src.split(de).join(a); return s === src ? null : s; };
const P = '(fuzz)\n    if(_l2Aparicions(SL,pr,2).length!==1) return;';
[['la comprovació torna darrere del comentari, tal com era', '(fuzz) const o=_l2Aparicions(SL,pr,2); if(o.length!==1) return;'],
 ['la comprovació torna darrere del comentari, en una sola condició', '(fuzz) if(_l2Aparicions(SL,pr,2).length!==1) return;']].forEach(([nom, a]) => {
  const Hb = trenca(H0, P, a); check('peça trencada · ' + nom + ': es veu', !!Hb && amagades(Hb).length === 1, Hb ? amagades(Hb).join(' | ') : 'no trobo la peça a l\'app'); });
// 11/11 tarda: la mateixa errada en un bucle, la que es va colar en un candidat (un comentari nou enganxat davant del «while» que treu les paraules buides del títol)
{ const de = 'if(_xf>0) p=p.slice(0,_xf);'; const Hb = H0.includes(de + ' while(') ? H0.split(de + ' while(').join(de + '   // comentari nou enganxat while(') : null;
  check('peça trencada · el bucle del títol queda darrere d\'un comentari: es veu', !!Hb && amagades(Hb).length === 1, Hb ? amagades(Hb).join(' | ') : 'no trobo la peça a l\'app'); }

console.log('\n' + (ko ? '✗ ' : '✓ ') + ok + ' OK · ' + ko + ' X');
process.exit(ko ? 1 : 0);
