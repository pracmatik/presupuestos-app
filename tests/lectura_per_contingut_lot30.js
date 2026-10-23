#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 30 (21/10/2026) · L'ESTRUCTURA ES LLEGEIX PEL CONTINGUT, I EL QUE NO QUADRA ES DIU.
 * Documents inventats, castellà i català, cap dada de cap client (va també al repositori públic).
 *  1) Excel amb la fila de títols «CODI | DESCRIPCIÓ | UTS | …» però la unitat a la columna de DESCRIPCIÓ, el títol a la del costat i la descripció a la fila
 *     de sota, i capítols «CAPÍTOL 01. …» escrits com a text: totes les partides, amb unitat, capítols al seu lloc; la quantitat «PA» → pa 0 marcada;
 *     el text tot en majúscules → minúscula de frase (el títol no); les línies soltes al text. Un codi que no es pot llegir → NO es dona per reconegut.
 *  2) Llistat on cada partida tanca amb «Total <codi>» (tipus Presto, «Amidament i pressupost Total <codi> …» i «Total partida <codi> ……… <quantitat>»): es transcriu
 *     línia a línia (quantitat, unitat, capítols i zona, opcional, «#¡VALOR!» en vermell, PA amb amidament que no baixa a 1); una partida sense total → no.
 *  3) Cada fila contra la seva capçalera del document: títol d'una línia partit per un punt, PA amb amidament, «PA» a la quantitat, capçalera de pàgina i
 *     línies de mesura enganxades al final del text.
 *  4) Capítols: la capçalera de pàgina presa per capítol fora; la zona i el seu capítol amb el mateix nom es queden; el capítol que és només el codi pren el títol.
 *  5) Autocomprovació: capítol que es diu com una unitat o que comença pel codi d'una partida, partida sense unitat → en vermell i a la fila; un document net → res.
 *  6) Cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.replace(de, a); return s === src ? null : s; };
const eines = H => { try { const b = H.match(/\/\/ ==== INICI EINES DE LECTURA ====([\s\S]*?)\/\/ ==== FI EINES DE LECTURA ====/)[1];
  const deh = (H.match(/function _dehyphen\(s\)\{[^\n]*\}/) || [''])[0] + '\n' + ((H.match(/^const parseNum=.*$/m) || [''])[0]) + '\n' + ((H.match(/^const num2=.*$/m) || [''])[0]);
  return new Function('IDIOMA', deh + '\nfunction nomZonaDelDocument(){ return null; }\nfunction pctPerDefecte(){ return null; }\nfunction isNoSuma(r){ return /NO SUMA/i.test(String((r&&r.desc)||"")); }\n' + b +
    '\nreturn {xl:(typeof transcriuExcel==="function"?transcriuExcel:null), tx:(typeof transcriuText==="function"?transcriuText:null), aj:(typeof _ajustaAlDocument==="function"?_ajustaAlDocument:null),' +
    ' cc:(typeof _capitolsDeCapcalera==="function"?_capitolsDeCapcalera:null), ac:(typeof _autocomprovacio==="function"?_autocomprovacio:null)};')('es'); } catch (e) { return null; } }
// ── 1) Excel inventat (la forma, no les dades, d'un amidament real) ──
const cel = v => v == null || v === '' ? null : { v: v, w: String(v), t: typeof v === 'number' ? 'n' : 's' };
const full = (nom, F) => ({ nom, files: F.map((c, i) => ({ r: i + 1, c: c.map(cel) })).filter(x => x.c.some(Boolean)) });
const XL = {
  ca: { cap: ['CODI', 'DESCRIPCIÓ', null, 'UTS', 'LONGITUD', 'AMPLADA', 'ALÇADA', 'PARCIALS', 'QUANTITAT'], c1: 'CAPÍTOL 01. TREBALLS PREVIS. NETEJA', c2: 'CAPÍTOL 02 PINTURA',
    t1: 'RETIRADA DE GRAVA DE LA TERRASSA', d1: 'RETIRADA DE LA GRAVA EXISTENT I TRANSPORT A ABOCADOR AUTORITZAT. AMIDAMENT A CONFIRMAR EN OBRA', l1: 'TERRASSA NORD',
    t2: 'PROVA DE CÀRREGA DELS SOSTRES', d2: 'REALITZACIÓ DE PROVES DE CÀRREGA ABANS DE TANCAR ELS SOSTRES', t3: 'PINTAT DE SOSTRES DE GUIX. PLÀSTIC MAT', d3: 'PINTAT DE SOSTRES DE GUIX AMB DUES CAPES D\'ACABAT', solt: '3R.2A.',
    t4: 'SEGELLAT DE FINESTRES', d4: 'SEGELLAT PERIMETRAL DE FINESTRES AMB MASSILLA DE POLIURETÀ', frase: 'Retirada de la grava existent i transport a abocador autoritzat. Amidament a confirmar en obra' },
  es: { cap: ['CÓDIGO', 'DESCRIPCIÓN', null, 'UDS', 'LONGITUD', 'ANCHURA', 'ALTURA', 'PARCIALES', 'CANTIDAD'], c1: 'CAPÍTULO 01. TRABAJOS PREVIOS. LIMPIEZA', c2: 'CAPÍTULO 02 PINTURA',
    t1: 'RETIRADA DE GRAVA DE LA AZOTEA', d1: 'RETIRADA DE LA GRAVA EXISTENTE Y TRANSPORTE A VERTEDERO AUTORIZADO. MEDICIÓN A CONFIRMAR EN OBRA', l1: 'AZOTEA NORTE',
    t2: 'PRUEBA DE CARGA DE LOS FORJADOS', d2: 'REALIZACIÓN DE PRUEBAS DE CARGA ANTES DE CERRAR LOS FORJADOS', t3: 'PINTADO DE TECHOS DE YESO. PLÁSTICO MATE', d3: 'PINTADO DE TECHOS DE YESO CON DOS MANOS DE ACABADO', solt: '3R.2A.',
    t4: 'SELLADO DE VENTANAS', d4: 'SELLADO PERIMETRAL DE VENTANAS CON MASILLA DE POLIURETANO', frase: 'Retirada de la grava existente y transporte a vertedero autorizado. Medición a confirmar en obra' } };
const xlFulls = (d, trencat) => [full('Full1', [['AMIDAMENTS'], [], d.cap, [null, d.c1], [],
  ['01.01', 'm2', d.t1], [null, d.d1], [null, null, d.l1, null, 40.5, null, null, 40.5], [null, null, 'TERRASSA SUD', null, 20, null, null, 20], [null, null, null, null, null, null, null, null, 60.5], [],
  ['01.02', 'PA', d.t2], [null, d.d2], [null, null, d.t2, 4, null, null, null, 4], [null, null, null, null, null, null, null, null, 4], [],
  [null, d.c2], [],
  ['02.01', trencat ? null : 'm²', d.t3], [null, d.d3], [null, null, d.solt], [null, null, '3R.3A.'], [null, null, null, null, null, null, null, null, 'PA'], [],
  ['02.02', 'ML', d.t4], [null, d.d4], [null, null, 'FAÇANA', null, 12, null, null, 12], [null, null, null, null, null, null, null, null, 12]])];
const parts = rows => rows.filter(r => r && r.tipo === 'part');
function provaExcel(T, et) {
  for (const [ll, es] of [['ca', false], ['es', true]]) { const d = XL[ll];
    const r = T.xl(xlFulls(d), es), P = parts(r.rows), C = r.rows.filter(x => x.tipo === 'cap');
    check(`${et} ${ll} · Excel amb la unitat sota DESCRIPCIÓ: reconegut, 4 partides, totes amb unitat`, r.reconegut && r.n === 4 && P.every(p => p.ut), JSON.stringify(P.map(p => [p.ut, p.amid])) + ' ' + r.motiu);
    check(`${et} ${ll} · els capítols «CAPÍTOL 01. …» escrits com a text són capítols (2), sense número ni unitat al títol`, C.length === 2 && /TREBALLS PREVIS|TRABAJOS PREVIOS/.test(C[0].desc) && !/CAP[IÍ]T/.test(C[0].desc) && /PINTURA/.test(C[1].desc), JSON.stringify(C));
    check(`${et} ${ll} · el títol és el de la seva columna (no les primeres paraules de la descripció) i la descripció hi és`, P[0] && P[0].desc.split('\n')[0] === d.t1 && /grava/.test(P[0].desc), P[0] && P[0].desc);
    check(`${et} ${ll} · text tot en majúscules → minúscula de frase; el títol no es toca`, P[0] && P[0].desc.split('\n')[1] === d.frase, P[0] && P[0].desc);
    check(`${et} ${ll} · quantitats: el total de la partida (60,5) i la PA amb amidament (4) no baixa a 1`, P[0] && +P[0].amid === 60.5 && P[1] && /^pa$/.test(P[1].ut) && +P[1].amid === 4 && /AMIDAMENT DEL DOCUMENT|MEDICIÓN DEL DOCUMENTO/.test(P[1].flag || ''), JSON.stringify(P.slice(0, 2).map(p => [p.ut, p.amid, p.flag])));
    check(`${et} ${ll} · «PA» a la quantitat: unitat pa, 0 i la marca de posar-la (la unitat del document a la marca)`, P[2] && P[2].ut === 'pa' && +P[2].amid === 0 && /el document diu PA|el documento dice PA/.test(P[2].flag || '') && /m²/.test(P[2].flag || '') && r.avisos.some(a => /PA \(sense quantitat\)|PA \(sin cantidad\)/.test(a)), JSON.stringify(P[2]));
    check(`${et} ${ll} · títol amb un punt dins: una sola línia; línia solta («3R.2A.») dins del text`, P[2] && P[2].desc.split('\n')[0] === d.t3 && /3r\.2a\./i.test(P[2].desc), P[2] && P[2].desc);
    const r2 = T.xl(xlFulls(d, true), es);
    check(`${et} ${ll} · un codi de partida que no es pot llegir (sense unitat) → NO es dona per reconegut i es diu quin`, !r2.reconegut && /02\.01/.test(r2.motiu) && /codi|código/.test(r2.motiu), r2.reconegut + ' ' + r2.motiu); } }
// ── 2) llistat amb «Total <codi>» ──
const TX = {
  ca: () => ['CAP.1. 1. CAPÍTOL 1. FAÇANES.', 'F1 1.1.FAÇANA DEL CARRER.F1.',
    '111 m2 BASTIDA TUBULAR.', 'Descripció Muntatge i desmuntatge de bastida tubular fixa amb bases regulables,', 'plataformes i baranes, i tots els elements de senyalització.', 'Amidament F1 m2 20,00 10,00 200,00 1,00 200,00', 'Amidament i pressupost Total 111 200,00 0,00 €',
    '112 ut FEINES PRÈVIES. TENDALS.', 'Descripció Retirada i recol·locació de tendals de la façana.', 'Amidament F1: tendals frontals ut 1,00 6,00 6,00', 'Amidament F1: tendals laterals ut 1,00 2,00 2,00', 'Amidament i pressupost Total 112 8,00 0,00 €',
    '113 m2 PARAMENTS.REVESTIMENT. REPICAT. NOTA: ES TINDRÀ EN COMPTE L\'AMIDAMENT REAL', 'Descripció Repicat de l\'arrebossat fins a la base ferma.', 'Amidament franja m2 1,20 3,00 3,60 1,00 3,60', 'Amidament i pressupost Total 113 3,60 0,00 €',
    '114 ml JUNTA DE DILATACIÓ.', 'Descripció Reparació de la junta de dilatació.', 'Amidament junta ml 22,00 22,00 #¡VALOR! #¡VALOR!', 'Amidament i pressupost Total 114 #¡VALOR! #¡VALOR!',
    'TOTAL: 1.1.FAÇANA DEL CARRER.F1. 0,00 €', 'CAP.1. 1. CAPÍTOL 1. FAÇANES.', 'F2 1.2.FAÇANA DEL PATI.F2.',
    '121 PA PROVA D\'ESTANQUEÏTAT.', 'Descripció Prova d\'estanqueïtat dels balcons.', 'Amidament F2 pa 4,00 4,00', 'Amidament i pressupost Total 121 4,00 0,00 €',
    'm2 PARTIDA OPCIONAL. CANVI DE BARANES', '122 OPCIONAL 1', 'AMB BARROTS.', 'Descripció Substitució de les baranes per baranes noves d\'acer.', 'Amidament F2 m2 1,00 30,00 30,00 1,00 30,00', 'Amidament i pressupost Total 122 OPCIONAL 1 30,00 0,00 €'].join('\n'),
  es: () => ['Nº Orden Descripción de las unidades de obra Uds. Longitud Latitud Altura Subtotal Medición', '01 ACTUACIÓN EN FACHADAS F1 Y F2', '( DEFICIENCIAS IMPORTANTES )',
    '01.01 Ud Andamio tubular', 'andtub Instalación de andamios metálicos tubulares para trabajar en fachada.', 'Fachada principal F1 1 1,00', 'Fachada lateral F2 1 1,00', 'Total partida 01.01 ...................................2,00',
    '01.02 ml Coronación de muros', 'cormur Piezas de coronación de muros de hormigón polimérico.', 'Muro F1 1 20,00 20,00', 'Total partida 01.02 ...................................20,00',
    '01.03 m2 Limpieza de piedra artificial', 'limp Limpieza de los elementos de piedra artificial.', 'Total partida 01.03 ...................................35,50', 'Total capítulo 01',
    'Nº Orden Descripción de las unidades de obra Uds. Longitud Latitud Altura Subtotal Medición', '02 ACTUACIONES OPCIONALES EN FACHADAS',
    '02.01 m2 Hidrofugación de ladrillo', 'hidro Aplicación de hidrofugante incoloro.', 'Total partida 02.01 ...................................80,00',
    '02.02 P.A. Pintura de elementos metálicos', 'E26 Pintura al esmalte sintético sobre cerrajería.', 'Barandillas balcones 6 7,14 0,75 32,13', 'Total partida 02.02', '32,13', 'Total capítulo 02',
    'Nº Orden Descripción de las unidades de obra Uds. Longitud Latitud Altura Subtotal Medición'].join('\n') };
function provaText(T, et) {
  { const r = T.tx(TX.ca(), false), P = parts(r.rows), C = r.rows.filter(x => x.tipo === 'cap'), Z = r.rows.filter(x => x.tipo === 'sec');
    check(`${et} ca · llistat tipus Presto: reconegut, 6 partides, 2 capítols (F1, F2) i una zona (FAÇANES)`, r.reconegut && r.n === 6 && C.length === 2 && Z.length === 1 && /FAÇANA DEL CARRER/.test(C[0].desc) && /^FAÇANES/.test(Z[0].desc), r.motiu + ' ' + JSON.stringify(r.rows.filter(x => x.tipo !== 'part' && x.tipo !== 'subv')));
    check(`${et} ca · quantitat = el total de cada partida (200, 8, 3,6) i la unitat de la capçalera`, P[0] && +P[0].amid === 200 && P[0].ut === 'm²' && +P[1].amid === 8 && P[1].ut === 'ut' && +P[2].amid === 3.6, JSON.stringify(P.map(p => [p.ut, p.amid])));
    check(`${et} ca · el títol fins a «Descripció», sense la NOTA (que va al text), i el text sense l'etiqueta`, P[0] && P[0].desc.split('\n')[0] === 'BASTIDA TUBULAR.' && /^Muntatge/.test(P[0].desc.split('\n')[1]) && P[2].desc.split('\n')[0] === 'PARAMENTS.REVESTIMENT. REPICAT.' && /NOTA: ES TINDRÀ/.test(P[2].desc), JSON.stringify(P.slice(0, 3).map(p => p.desc.slice(0, 80))));
    check(`${et} ca · total «#¡VALOR!»: quantitat 0, marca vermella a la fila i avís`, P[3] && +P[3].amid === 0 && /AMIDAMENT NO DEDUÏBLE/.test(P[3].flag || '') && r.avisos.some(a => /^⚠⚠/.test(a) && /114/.test(a)), JSON.stringify(P[3]));
    check(`${et} ca · PA amb amidament (4): es queda 4, amb la marca`, P[4] && P[4].ut === 'pa' && +P[4].amid === 4 && /AMIDAMENT DEL DOCUMENT/.test(P[4].flag || ''), JSON.stringify(P[4]));
    check(`${et} ca · opcional amb el codi en una altra línia: títol sencer, quantitat 30 (no el «1» de l'opció), NO SUMA`, P[5] && /PARTIDA OPCIONAL\. CANVI DE BARANES AMB BARROTS/.test(P[5].desc) && +P[5].amid === 30 && /NO SUMA AL TOTAL/.test(P[5].desc), JSON.stringify(P[5]));
    check(`${et} ca · les línies de mesura que sumen el total surten com a desglossament`, r.rows.filter(x => x.tipo === 'subv' && x.desglos).length === 2, JSON.stringify(r.rows.filter(x => x.tipo === 'subv'))); }
  { const r = T.tx(TX.es(), true), P = parts(r.rows), C = r.rows.filter(x => x.tipo === 'cap');
    check(`${et} es · «Total partida 01.01 ……… 2,00»: reconegut, 5 partides, 2 capítols, cap zona feta del «Total capítulo» ni de la capçalera de pàgina`, r.reconegut && r.n === 5 && C.length === 2 && !r.rows.some(x => x.tipo === 'sec') && /ACTUACIÓN EN FACHADAS F1 Y F2/.test(C[0].desc) && /DEFICIENCIAS/.test(C[0].desc), r.motiu + ' ' + JSON.stringify(r.rows.filter(x => x.tipo !== 'part' && x.tipo !== 'subv')));
    check(`${et} es · el total a la línia de sota («Total partida 02.02» ⏎ «32,13») i la PA amb amidament no baixa a 1`, P[4] && +P[4].amid === 32.13 && P[4].ut === 'pa' && /MEDICIÓN DEL DOCUMENTO/.test(P[4].flag || ''), JSON.stringify(P[4]));
    check(`${et} es · partida sense línies de mesura: el seu total (35,5)`, P[2] && +P[2].amid === 35.5, JSON.stringify(P[2])); }
  { const sense = TX.ca().replace('Amidament i pressupost Total 112 8,00 0,00 €', 'Amidament i pressupost 8,00 0,00 €'), r = T.tx(sense, false);
    check(`${et} ca · una partida sense el seu «Total <codi>» → NO es transcriu (es llegeix amb la IA)`, !r.reconegut && /112/.test(r.motiu), r.reconegut + ' ' + r.motiu); }
  { const r = T.tx('1.1 m2 Pintura de façana\nPintat amb pintura acrílica.\nFaçana 1 120,00 120,00\n120,00\n1.2 ml Segellat de juntes\nSegellat amb massilla.\n30,00\n'.repeat(3), false);
    check(`${et} · un document sense cap «Total <codi>» no es toca`, !r.reconegut, r.motiu); } }
// ── 3) cada fila contra la seva capçalera del document ──
const CAPC = ['AMIDAMENTS', 'carrer Inventat 12, Ciutat', 'reparacions a les cobertes de la finca', 'CODI DESCRIPCIÓ UTS LONGITUD AMPLADA ALÇADA PARCIALS QUANTITAT'];
const docAj = () => [].concat(CAPC, ['CAPÍTOL 01. COBERTES',
  '01.01 m² RETIRADA DE PAVIMENT', 'RETIRADA DE PAVIMENT EXISTENT I TRANSPORT DE RUNA. AMIDAMENT A CONFIRMAR EN OBRA', 'COBERTA 1A. 38,60 38,60', 'COBERTA 2A. 61,87 61,87', '100,47',
  '01.02 PA PROVA D\'ESTANQUEÏTAT', 'REALITZACIÓ DE PROVES D\'ESTANQUEÏTAT DE LA COBERTA. AMIDAMENT A CONFIRMAR EN OBRA', 'PROVA D\'ESTANQUEÏTAT 4 4', '4,00'], CAPC,
  ['01.03 m² PINTAT DE SOSTRES SOBRE ENVANS. VERT.GUIX AL PLÀSTIC', 'PINTAT DE PARAMENTS VERTICALS DE GUIX AMB UNA CAPA SEGELLADORA I DUES D\'ACABAT. AMIDAMENT A CONFIRMAR EN OBRA', '3R.1A.', '3R.2A.', 'PA'],
  CAPC, ['01.04 UT SEGELLAT DE BALCONERES', 'SEGELLAT DE BALCONERES ENTRE RAJOLES I FUSTERIA AMB MATERIAL ESPECÍFIC. AMIDAMENT PER UNITAT', 'BALCONERA 1,2 METRES PA', 'PA'], CAPC,
  ['01.05 ml MINVELL DE COBERTA', 'SUBMINISTRAMENT I COL.LOCACIÓ DE PEÇA CERÀMICA AL MINVELL. AMIDAMENT A CONFIRMAR EN OBRA', 'COBERTA 1A. 28,37 28,37', '28,37']).join('\n');
const filesAj = () => [{ tipo: 'cap', num: '1', desc: 'COBERTES' },
  { tipo: 'part', num: '1.1', ut: 'm²', amid: 100.47, desc: 'RETIRADA DE PAVIMENT\n- RETIRADA DE PAVIMENT EXISTENT I TRANSPORT DE RUNA. AMIDAMENT A CONFIRMAR EN OBRA COBERTA 1A. 38,60 38,60 COBERTA 2A.' },
  { tipo: 'part', num: '1.2', ut: 'pa', amid: 1, desc: 'PROVA D\'ESTANQUEÏTAT\n- REALITZACIÓ DE PROVES D\'ESTANQUEÏTAT DE LA COBERTA. AMIDAMENT A CONFIRMAR EN OBRA', flag: 'PA — % del total, el fixa el tècnic' },
  { tipo: 'part', num: '1.3', ut: 'm²', amid: 0, desc: 'PINTAT DE SOSTRES SOBRE ENVANS\n- VERT.GUIX AL PLÀSTIC\nPINTAT DE PARAMENTS VERTICALS DE GUIX AMB UNA CAPA SEGELLADORA I DUES D\'ACABAT. AMIDAMENT A CONFIRMAR EN OBRA\n3R.1A.\n3R.2A.', flag: 'PENDENT — amid no deduïble · QUANTITAT 0 — posa la del document' },
  { tipo: 'part', num: '1.4', ut: 'ut', amid: 0, desc: 'SEGELLAT DE BALCONERES\n- SEGELLAT DE BALCONERES ENTRE RAJOLES I FUSTERIA AMB MATERIAL ESPECÍFIC. AMIDAMENT PER UNITAT BALCONERA 1,2 METRES PA PA AMIDAMENTS carrer Inventat 12, Ciutat reparacions a les cobertes de la' },
  { tipo: 'part', num: '1.5', ut: 'ml', amid: 28.37, desc: 'MINVELL DE COBERTA\n- Subministrament i col.locació de peça ceràmica al minvell. Amidament a confirmar en obra' }];
function provaAjust(T, et) {
  const rows = filesAj(), av = []; T.aj(rows, docAj(), av, false); const P = parts(rows);
  check(`${et} · títol d'una línia que la lectura partia pel punt: la línia sencera i el text sense el tros`, P[2] && P[2].desc.split('\n')[0] === 'PINTAT DE SOSTRES SOBRE ENVANS. VERT.GUIX AL PLÀSTIC' && !/^- Vert/i.test(P[2].desc.split('\n')[1]), P[2] && P[2].desc);
  check(`${et} · PA amb amidament del document (4,00): 4, amb la marca, sense la de «% del total»`, P[1] && +P[1].amid === 4 && /AMIDAMENT DEL DOCUMENT/.test(P[1].flag || '') && !/% del total/.test(P[1].flag || ''), JSON.stringify(P[1]));
  check(`${et} · «PA» a la quantitat del document: unitat pa, 0, la marca de posar-la i sense la «PA» solta del final del text`, P[3] && P[3].ut === 'pa' && +P[3].amid === 0 && /el document diu PA a la quantitat/.test(P[3].flag || '') && !/\bpa\s*$/i.test(P[3].desc), JSON.stringify(P[3]));
  check(`${et} · la capçalera de pàgina enganxada al final del text: fora`, P[3] && !/carrer inventat|amidaments/i.test(P[3].desc) && /balconera 1,2 metres/i.test(P[3].desc), P[3] && P[3].desc);
  check(`${et} · les línies de mesura enganxades al final del text: fora`, P[0] && !/38,60|coberta 2a/i.test(P[0].desc) && /a confirmar en obra$/i.test(P[0].desc), P[0] && P[0].desc);
  check(`${et} · text en majúscules → minúscula de frase; el títol no; un text que ja ho era, igual`, P[0] && P[0].desc.split('\n')[0] === 'RETIRADA DE PAVIMENT' && /^- Retirada de paviment existent/.test(P[0].desc.split('\n')[1]) && P[4].desc === filesAj()[5].desc, P[0] && P[0].desc);
  check(`${et} · es diu què s'ha ajustat`, av.some(a => /capçalera del document/.test(a)), JSON.stringify(av)); }
// ── 4) capítols ──
function provaCapitols(T, et) {
  const doc = ['MEDICIONES', 'Reparaciones de fachada', 'D1             Demoliciones y trabajos previos', 'DR01   m2   Eliminación de enfoscado', 'texto', '20,00', 'MEDICIONES', 'Reparaciones de fachada',
    'DR02   m2   Demolición de pavimento', 'texto', '30,00', 'MEDICIONES', 'Reparaciones de fachada', 'INST           Instalaciones', 'IN01   u    Desmontaje de aire acondicionado', '2,00', 'MEDICIONES', 'Reparaciones de fachada'].join('\n');
  const rows = [{ tipo: 'sec', desc: 'REPARACIONES DE FACHADA' }, { tipo: 'cap', desc: 'DEMOLICIONES Y TRABAJOS PREVIOS' }, { tipo: 'part', desc: 'ELIMINACIÓN DE ENFOSCADO', ut: 'm2', amid: 20 },
    { tipo: 'cap', desc: 'REPARACIONES DE FACHADA' }, { tipo: 'part', desc: 'DEMOLICIÓN DE PAVIMENTO', ut: 'm2', amid: 30 }, { tipo: 'cap', desc: 'INST' }, { tipo: 'part', desc: 'DESMONTAJE DE AIRE ACONDICIONADO', ut: 'u', amid: 2 }], av = [];
  T.cc(rows, doc, av, true); const C = rows.filter(r => r.tipo === 'cap');
  check(`${et} · la capçalera de pàgina presa per capítol a mig capítol: fora (la partida es queda al capítol d'abans)`, C.length === 2 && C[0].desc === 'DEMOLICIONES Y TRABAJOS PREVIOS' && rows[3].tipo === 'part', JSON.stringify(rows.map(r => r.tipo + ':' + r.desc.slice(0, 20))));
  check(`${et} · el capítol que és només el codi («INST») pren el títol del document`, C[1] && C[1].desc === 'INSTALACIONES', JSON.stringify(C));
  const rows2 = [{ tipo: 'sec', desc: 'FACHADAS' }, { tipo: 'cap', desc: 'FACHADAS' }, { tipo: 'part', desc: 'X', ut: 'm2', amid: 1 }], d2 = 'FACHADAS\nFACHADAS\nFACHADAS\n1.1 m2 X\n1,00';
  T.cc(rows2, d2, [], true);
  check(`${et} · la zona i el seu capítol amb el mateix nom, seguits: es queden`, rows2.length === 3 && rows2[1].tipo === 'cap', JSON.stringify(rows2)); }
// ── 5) autocomprovació ──
function provaAuto(T, et) {
  const doc = ['111 m2 BASTIDA TUBULAR.', 'Descripció bastida', 'Amidament F1 m2 33,11 22,64 749,61 1,00 749,61', '112 ut FEINES PRÈVIES.', 'Descripció feines', 'Amidament F1 ut 1,00 21,00 21,00', '113 m2 PARAMENTS. REPICAT.', 'Descripció repicat', 'Amidament pilar m2 1,80 3,02 5,44', '114 ml JUNTA.', 'Descripció junta', 'Amidament junta ml 22,64 22,64'].join('\n');
  const rows = [{ tipo: 'cap', desc: 'UT' }, { tipo: 'part', num: '1.1', desc: 'BASTIDA TUBULAR.', ut: 'm2', amid: 749.61 }, { tipo: 'cap', desc: '112 FEINES PRÈVIES. TENDALLS' }, { tipo: 'part', num: '2.1', desc: 'FEINES PRÈVIES.', ut: '', amid: 21 }], av = [];
  T.ac(rows, doc, av, false);
  check(`${et} · capítol que es diu com una unitat i capítol que comença pel codi d'una partida: vermell, dit pel seu nom, i marca a la seva primera partida`, av.some(a => /^⚠⚠/.test(a) && /«UT»/.test(a) && /«112 FEINES/.test(a)) && /CAPÍTOL A REVISAR/.test(rows[1].flag || ''), JSON.stringify(av));
  check(`${et} · partida sense unitat: vermell i marca a la fila`, av.some(a => /SENSE UNITAT/.test(a)) && /SENSE UNITAT/.test(rows[3].flag || ''), JSON.stringify(rows[3]));
  const net = [{ tipo: 'cap', desc: 'FAÇANES' }, { tipo: 'part', num: '1.1', desc: 'BASTIDA TUBULAR.', ut: 'm2', amid: 749.61 }, { tipo: 'part', num: '1.2', desc: 'FEINES PRÈVIES.', ut: 'ut', amid: 21 }], av2 = [];
  T.ac(net, doc, av2, false);
  check(`${et} · un esborrany que quadra: cap avís ni cap marca`, !av2.length && net.every(r => !r.flag), JSON.stringify(av2)); }
function tot(T, et) {
  if (!T || !T.xl || !T.tx || !T.aj || !T.cc || !T.ac) { check(et + ' · l\'app porta les eines del LOT 30', false, 'falten'); return; }
  provaExcel(T, et); provaText(T, et); provaAjust(T, et); provaCapitols(T, et); provaAuto(T, et); }
console.log('Guardià LOT 30 · lectura per contingut i autocomprovació · ' + path.basename(HTML));
tot(eines(H0), 'app');
// 6) peces trencades: cadascuna s'ha de veure
const PECES = [
  ['sense les columnes pel contingut', 'const H=_xlRolsPerContingut(F,H0);', 'const H=H0;'],
  ['sense el capítol escrit com a text', 'const mC=tx0.length===1?_XL_CAP_TXT.exec(tx0[0]):null;', 'const mC=null;'],
  ['sense la quantitat «PA»', 'if(_paCel.length) cur.qPA=true;', ''],
  ['sense la PA amb amidament', 'if(/^pa$/i.test(row.ut)&&q.q!=null&&q.com!=="pa"', 'if(false&&/^pa$/i.test(row.ut)&&q.q!=null&&q.com!=="pa"'],
  ['sense l\'autocomprovació de l\'Excel', 'if(fora.length){ res.motiu=', 'if(false){ res.motiu='],
  ['sense el tancament per codi', 'const T=[]; L.forEach((l,i)=>{ const m=_TX_TANCA.exec(l);', 'const T=[]; L.forEach((l,i)=>{ const m=null;'],
  ['sense el total a la línia de sota', 'if(s&&new RegExp("^(?:"+_TX_NUM+")$").test(nx))', 'if(false)'],
  ['sense l\'opció numerada', '(?:\\\\s+\\\\d{1,2}(?=\\\\s+-?\\\\d))?', ''],
  ['sense el títol sencer', 'tit=Td; out.titol++;', 'out.titol++;'],
  ['sense el mobiliari de pàgina', 'if(ok){ cos=cos.slice(0,p).replace(/\\s+$/,""); out.mobles++; break; }', 'if(false){ }'],
  ['sense la minúscula de frase', 'function _textDeFrase(desc){ const d=String(desc||""), k=d.indexOf("\\n"); if(k<0) return d;', 'function _textDeFrase(desc){ const d=String(desc||""), k=d.indexOf("\\n"); return d;'],
  ['sense la capçalera de pàgina presa per capítol', 'rows.splice(i,1); i--; out.pagina++; continue;', 'out.pagina++;'],
  ['sense l\'autocomprovació dels capítols', 'if(motiu){ out.capitols.push(', 'if(false){ out.capitols.push('],
];
for (const [nom, de, a] of PECES) { const H = trenca(H0, de, a); if (!H) { check('peça trencada «' + nom + '»: el codi hi és', false, 'no trobo: ' + de.slice(0, 60)); continue; }
  const ok0 = ok, ko0 = ko; const log = console.log, err = console.error; console.log = () => { }; console.error = () => { };
  try { tot(eines(H), 'trencat'); } catch (e) { ko++; } console.log = log; console.error = err;
  const caigut = ko > ko0; ok = ok0; ko = ko0; check('peça trencada «' + nom + '»: el guardià ho veu', caigut); }
console.log(`\n${ok} OK · ${ko} X`); process.exit(ko ? 1 : 0);
