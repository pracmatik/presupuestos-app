#!/usr/bin/env node
'use strict';
/*
 * Guardià · 12/11/2026 · L'AMORTITZACIÓ DE LA BASTIDA ES DECIDEIX PEL TÍTOL, NO PEL TEXT.
 * Quan el document porta bastida tubular i cap partida d'amortització, l'app afegeix «AMORTITZACIÓ DE BASTIDA TUBULAR» (mesos a 0, criteri GTA).
 * Error trobat al web real: la descripció de la bastida deia «Inclòs el lloguer i amortització durant el temps…» i l'app es pensava que
 * l'amortització ja hi era: la fila no sortia i cap avís ho deia. Ara només compta una partida que ho diu al TÍTOL (primera línia).
 * 13/11: i que sigui de la BASTIDA: «AMORTITZACIÓ DE TREBALLS VERTICALS» (títol real dels documents) també la treia.
 * 13/11 (2): la fila que posa la LECTURA per línies (sortia en «ml», sense el text de la casa, i repetida quan el document ja porta la seva)
 * surt igual que la de l'app; i el botó de desglossar la bastida també mira només el títol.
 * Documents inventats, català i castellà, cap dada de cap client. Es fa córrer el bloc REAL de l'app.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 200) : '')); } };
function fiBloc(s, i) { let d = 0; for (; i < s.length; i++) { if (s[i] === '{') d++; else if (s[i] === '}') { d--; if (d === 0) return i + 1; } } return -1; }
function funcio(nom) { const m = new RegExp('function\\s+' + nom + '\\s*\\(').exec(H); if (!m) return null; return H.slice(m.index, fiBloc(H, H.indexOf('{', m.index))); }

const fEs = funcio('_esPartidaAmortitzacio');
check('l\'app té la funció que decideix pel títol', !!fEs);
const i0 = H.indexOf('{ const _ESd=');
const bloc = i0 >= 0 ? H.slice(i0, fiBloc(H, i0)) : null;
check('el bloc que afegeix l\'amortització hi és', !!bloc);
check('el bloc fa servir la funció del títol (no el text sencer)', !!bloc && /_esPartidaAmortitzacio\(r\)/.test(bloc), bloc && bloc.slice(0, 200));

function corre(rows, idioma) {
  const avisos = [];
  new Function('allRows', 'allAvisos', 'IDIOMA', 'IDIOMA_DOC', (fEs || '') + '\n' + (bloc || ''))(rows, avisos, idioma, idioma);
  return { rows, avisos };
}
const bastida = (t) => ({ tipo: 'part', desc: t, ut: 'm²', amid: 120 });
const CA_TEXT = 'SUBMINISTRE I MUNTATGE DE BASTIDA\n- Bastida tubular normalitzada per a les feines d\'aquest estat d\'amidaments. Inclòs el lloguer i amortització durant el temps que durin les obres.';
const ES_TEXT = 'MONTAJE DE ANDAMIO\n- Andamio tubular homologado para los trabajos de este estado de mediciones. Incluido el alquiler y la amortización durante el tiempo que duren las obras.';

if (fEs && bloc) {
  const es0 = new Function(fEs + '\nreturn _esPartidaAmortitzacio;')();
  // 1) català: la frase del text de la bastida no treu l'amortització
  let r = corre([{ tipo: 'cap', desc: 'PATI' }, bastida(CA_TEXT), { tipo: 'part', desc: 'NETEJA', ut: 'm²', amid: 30 }], 'ca');
  const a1 = r.rows.findIndex(x => x.origen === 'auto');
  check('CA · bastida amb «amortització» al text → s\'afegeix l\'amortització', a1 === 2, JSON.stringify(r.rows.map(x => x.desc.split('\n')[0])));
  check('CA · amb el títol i els mesos a 0', a1 >= 0 && /^AMORTITZACIÓ DE BASTIDA TUBULAR/.test(r.rows[a1].desc) && r.rows[a1].ut === 'mes' && r.rows[a1].amid === 0);
  check('CA · i l\'avís que s\'ha afegit', r.avisos.some(a => /amortització de la bastida/.test(a)));
  // 2) castellà, el mateix
  r = corre([bastida(ES_TEXT)], 'es');
  check('ES · andamio con «amortización» en el texto → se añade', r.rows.length === 2 && /^AMORTIZACIÓN DE ANDAMIO TUBULAR/.test(r.rows[1].desc), JSON.stringify(r.rows.map(x => x.desc.split('\n')[0])));
  // 3) el document ja porta la seva partida d'amortització → no se'n posa cap altra
  r = corre([bastida(CA_TEXT), { tipo: 'part', desc: 'AMORTITZACIÓ MENSUAL DE LA BASTIDA\n- Lloguer mensual', ut: 'mes', amid: 4 }], 'ca');
  check('CA · document amb partida d\'amortització pròpia → no se n\'afegeix cap', r.rows.length === 2 && !r.rows.some(x => x.origen === 'auto'));
  r = corre([bastida(ES_TEXT), { tipo: 'part', desc: 'Amortización de andamio\n- alquiler', ut: 'mes', amid: 3 }], 'es');
  check('ES · documento con amortización propia (minúsculas) → no se añade', r.rows.length === 2);
  // 3b) l'amortització de TREBALLS VERTICALS no és la de la bastida (títol i text com els documents reals)
  r = corre([bastida(CA_TEXT), { tipo: 'part', desc: 'AMORTITZACIÓ DE TREBALLS VERTICALS\n- Execució diària de treballs en alçada, en llocs de difícil accés per part de professionals especialitzats amb tècniques d\'escalada.', ut: 'dia', amid: 5 }], 'ca');
  check('CA · document amb amortització de treballs verticals → igualment s\'afegeix la de la bastida', r.rows.length === 3 && r.rows[1].origen === 'auto', JSON.stringify(r.rows.map(x => x.desc.split('\n')[0])));
  r = corre([bastida(ES_TEXT), { tipo: 'part', desc: 'AMORTIZACIÓN DE TRABAJOS VERTICALES\n- Ejecución diaria de trabajos en altura con técnicas de escalada.', ut: 'día', amid: 5 }], 'es');
  check('ES · documento con amortización de trabajos verticales → se añade la del andamio', r.rows.length === 3 && r.rows.some(x => x.origen === 'auto'));
  // 3c) amortització o lloguer de la bastida amb un títol curt (la bastida al text) → és la seva: no se n'afegeix cap
  r = corre([bastida(CA_TEXT), { tipo: 'part', desc: 'AMORTITZACIÓ MENSUAL\n- Amortització mensual de la bastida homologada', ut: 'mes', amid: 4 }], 'ca');
  check('CA · «AMORTITZACIÓ MENSUAL» amb la bastida al text → no se n\'afegeix cap', r.rows.length === 2);
  r = corre([bastida(ES_TEXT), { tipo: 'part', desc: 'ALQUILER DE ANDAMIO\n- por meses', ut: 'mes', amid: 4 }], 'es');
  check('ES · «ALQUILER DE ANDAMIO» → no se añade otra', r.rows.length === 2);
  // 3d) 13/11: lloguer que NO es compta en mesos (per dies, a la unitat) → no és la partida del temps: GTA hi posa igualment la seva amortització
  r = corre([bastida(ES_TEXT), { tipo: 'part', desc: 'Alquiler de andamio tubular de fachada.\n- Alquiler, durante 100 días naturales, de andamio tubular normalizado.', ut: 'Ud', amid: 1 }], 'es');
  check('ES · «Alquiler de andamio… 100 días» (Ud) → se añade igualmente la amortización', r.rows.length === 3 && r.rows.some(x => x.origen === 'auto'), JSON.stringify(r.rows.map(x => [x.desc.split('\n')[0], x.ut])));
  r = corre([bastida(CA_TEXT), { tipo: 'part', desc: 'Lloguer de bastida tubular de façana.\n- Lloguer durant 90 dies de bastida tubular normalitzada.', ut: 'u', amid: 1 }], 'ca');
  check('CA · «Lloguer de bastida… 90 dies» (u) → s\'afegeix igualment l\'amortització', r.rows.length === 3 && r.rows.some(x => x.origen === 'auto'), JSON.stringify(r.rows.map(x => [x.desc.split('\n')[0], x.ut])));
  check('funció · lloguer en mesos → SÍ; per dies → NO', es0({ desc: 'LLOGUER DE BASTIDA\n- mensual', ut: 'mesos' }) && !es0({ desc: 'LLOGUER DE BASTIDA\n- 90 dies', ut: 'u' }));
  // 4) sense bastida tubular no es toca res
  r = corre([{ tipo: 'part', desc: 'NETEJA DE FAÇANA\n- amb amortització d\'equips inclosa', ut: 'm²', amid: 10 }], 'ca');
  check('sense bastida tubular → res', r.rows.length === 1);
  // 5) la funció sola
  const es = new Function(fEs + '\nreturn _esPartidaAmortitzacio;')();
  check('funció · text de bastida amb amortització al cos → NO és amortització', !es(bastida(CA_TEXT)) && !es(bastida(ES_TEXT)));
  check('funció · títol d\'amortització → SÍ', es({ desc: 'AMORTITZACIÓ DE BASTIDA TUBULAR\n- text' }) && es({ desc: 'Amortización andamio' }));
  check('funció · fila buida → no', !es(null) && !es({}));
  check('funció · amortització de treballs verticals → NO és la de la bastida', !es({ desc: 'AMORTITZACIÓ DE TREBALLS VERTICALS\n- Execució diària de treballs en alçada' }));
  check('funció · lloguer d\'un contenidor → NO', !es({ desc: 'LLOGUER DE CONTENIDOR\n- per a runa' }));
  check('funció · «MONTAJE, AMORTIZACIÓN Y DESMONTAJE DE ANDAMIO» és la bastida, NO la partida d\'amortització', !es({ desc: 'MONTAJE, AMORTIZACIÓN Y DESMONTAJE DE ANDAMIO\n- en m²' }));
  check('funció · tota la partida en una línia amb «lloguer i amortització» al final → NO', !es({ desc: 'SUBMINISTRE, INSTAL·LACIÓ I DESMUNTATGE DE BASTIDA - Bastida tubular normalitzada. Inclòs el lloguer i amortització durant les obres' }));
  check('funció · amortització primer i el muntatge després, en una línia → SÍ', es({ desc: 'AMORTITZACIÓ MENSUAL DE BASTIDA - Amortització de la bastida; el muntatge va a part' }));
  // 5b) bastida en una sola línia amb «amortització» al final + la fila de la lectura → la de la lectura es queda (en mesos)
  r = corre([{ tipo: 'part', desc: 'SUBMINISTRE, INSTAL·LACIÓ I DESMUNTATGE DE BASTIDA - Bastida tubular normalitzada. Inclòs el lloguer i amortització durant les obres', ut: 'm²', amid: 200, lrIni: 7 }, { tipo: 'part', desc: 'AMORTITZACIÓ DE BASTIDA TUBULAR', ut: 'ml', amid: 0, origen: 'auto' }], 'ca');
  check('CA · bastida en una línia + fila de la lectura → no es treu, surt en mesos', r.rows.length === 2 && r.rows[1].ut === 'mes', JSON.stringify(r.rows.map(x => [x.desc.slice(0, 30), x.ut])));
  r = corre([{ tipo: 'part', desc: 'MONTAJE, AMORTIZACIÓN Y DESMONTAJE DE ANDAMIO\n- Andamio tubular homologado', ut: 'm²', amid: 204 }], 'es');
  check('ES · «MONTAJE, AMORTIZACIÓN Y DESMONTAJE DE ANDAMIO» sin más → se añade la amortización (meses a 0)', r.rows.length === 2 && r.rows[1].origen === 'auto' && r.rows[1].ut === 'mes');
  // 6) la fila que posa la lectura (origen auto, títol sol, unitat ml) → mesos, text de la casa, cap fila de més
  const lect = (es) => ({ tipo: 'part', desc: es ? 'AMORTIZACIÓN DE ANDAMIO TUBULAR' : 'AMORTITZACIÓ DE BASTIDA TUBULAR', ut: 'ml', amid: 0, preu: 0, flag: es ? 'CÁLCULO DEL TÉCNICO' : 'CÀLCUL DEL TÈCNIC', origen: 'auto' });
  r = corre([bastida(CA_TEXT), lect(false), { tipo: 'part', desc: 'NETEJA', ut: 'm²', amid: 30 }], 'ca');
  check('CA · fila de la lectura → no se n\'afegeix cap altra', r.rows.length === 3, JSON.stringify(r.rows.map(x => x.desc.split('\n')[0])));
  check('CA · fila de la lectura → en mesos, a 0, amb el text de la casa i el seu avís de mesos', r.rows[1].ut === 'mes' && r.rows[1].amid === 0 && /\n- Amortització mensual de bastida metàl·lica/.test(r.rows[1].desc) && /mesos/.test(r.rows[1].flag), JSON.stringify(r.rows[1]));
  r = corre([bastida(ES_TEXT), lect(true)], 'es');
  check('ES · fila de la lectura → meses y texto de la casa', r.rows.length === 2 && r.rows[1].ut === 'mes' && /\n- Amortización mensual de andamio/.test(r.rows[1].desc), JSON.stringify(r.rows[1]));
  // dues bastides, cadascuna amb la seva fila de la lectura → les dues a punt, cap de més
  r = corre([bastida(CA_TEXT), lect(false), bastida(CA_TEXT), lect(false)], 'ca');
  check('CA · dues bastides amb la seva fila de la lectura → les dues en mesos, cap de més', r.rows.length === 4 && r.rows[1].ut === 'mes' && r.rows[3].ut === 'mes');
  // 7) el document ja porta la seva amortització (amb línies) i la lectura n'hi posa una altra → la de la lectura fora, amb avís
  r = corre([bastida(CA_TEXT), lect(false), { tipo: 'part', desc: 'AMORTITZACIÓ MENSUAL DE BASTIDA TUBULAR\n- Lloguer mensual', ut: 'mes', amid: 4, lrIni: 9, lrFi: 10 }], 'ca');
  check('CA · document amb la seva amortització + la de la lectura → la de la lectura fora', r.rows.length === 2 && !r.rows.some(x => x.origen === 'auto') && r.rows[1].amid === 4, JSON.stringify(r.rows.map(x => x.desc.split('\n')[0])));
  check('CA · i ho diu', r.avisos.some(a => /ja porta la seva amortització/.test(a)));
  r = corre([bastida(ES_TEXT), lect(true), { tipo: 'part', desc: 'Amortización de andamio\n- alquiler', ut: 'mes', amid: 3 }], 'es');
  check('ES · documento con su amortización + la de la lectura → fuera la de la lectura', r.rows.length === 2 && r.rows[1].amid === 3);
}
// 8) la lectura marca la seva fila com a nostra, i el botó de desglossar la bastida mira només el títol
check('la fila «gen» de la lectura surt amb origen auto', /if\(it\.t==="gen"\)\{ rows\.push\(\{[^}]*origen:"auto"\}/.test(H));
check('el botó de desglossar la bastida fa servir la funció del títol', /andami\/i\.test\(r\.desc\|\|""\)&&!_esPartidaAmortitzacio\(r\)&&!\(\+r\.pct\)\)\?`<button class="mini bastbtn"/.test(H));
console.log((ko ? 'X' : 'OK') + ' amortització pel títol: ' + ok + ' OK, ' + ko + ' X');
process.exit(ko ? 1 : 0);
