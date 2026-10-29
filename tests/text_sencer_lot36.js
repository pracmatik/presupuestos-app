#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 36 (26/10/2026) · EL TEXT DE LA PARTIDA ES QUEDA SENCER. Documents inventats, català i castellà, cap dada de cap client (va també al
 * repositori públic).
 *  1) PDF amb la quantitat a la mateixa línia que el final del text («… amb sabó de pH neutre 14,40»): l'última línia del text NO es treu (del 22/10 al
 *     26/10 es perdia sense cap avís, perquè es prenia per una línia de mesura enganxada);
 *  2) les línies de mesura de debò (xifres en columna: «Façana principal 10,00 6,70 67,00») enganxades al final del text sí que es treuen, com fins ara;
 *  3) capçalera «1.5 UT PINTAT DE BARANA. SUBMINISTRAMENT I» amb el text que continua a sota: el títol és «PINTAT DE BARANA» i el text comença per
 *     «Subministrament i aplicació…» en minúscula de frase (P-041); un títol d'una línia amb un punt de dins («… SOBRE ENVANS. VERT.GUIX AL PLÀSTIC») es
 *     queda sencer, com fins ara;
 *  4) cada peça trencada es veu.
 */
const fs = require('fs'), path = require('path');
const HTML = process.argv[2] || ['app_gta.html', 'index.html'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
const H0 = fs.readFileSync(HTML, 'utf8');
let ok = 0, ko = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  OK ' + n); } else { ko++; console.error('  X  ' + n + (x ? '  → ' + String(x).slice(0, 300) : '')); } };
const trenca = (src, de, a) => { const s = src.replace(de, a); return s === src ? null : s; };
const eines = (H, idioma) => { try { const b = H.match(/\/\/ ==== INICI EINES DE LECTURA ====([\s\S]*?)\/\/ ==== FI EINES DE LECTURA ====/)[1];
  const deh = (H.match(/function _dehyphen\(s\)\{[^\n]*\}/) || [''])[0] + '\n' + ((H.match(/^const parseNum=.*$/m) || [''])[0]) + '\n' + ((H.match(/^const num2=.*$/m) || [''])[0]);
  return new Function('IDIOMA', deh + '\nfunction nomZonaDelDocument(){ return null; }\nfunction pctPerDefecte(){ return null; }\nfunction isNoSuma(r){ return /NO SUMA/i.test(String((r&&r.desc)||"")); }\n' + b +
    '\nreturn {aj:(typeof _ajustaAlDocument==="function"?_ajustaAlDocument:null)};')(idioma); } catch (e) { return null; } };
const parts = rows => rows.filter(r => r && r.tipo === 'part');
// ── els documents inventats (la forma d'un PDF real: codi, unitat i títol en una línia; el text a sota; la quantitat al final de l'última línia) ──
const D = {
  ca: { cap: 'CAPÍTOL 1. FAÇANES', doc: [
      '1.1 m² NETEJA DE FAÇANA', 'Neteja general de la façana amb aigua a baixa pressió i raspallat', 'manual amb sabó de pH neutre 14,40',
      '1.2 m² REPICAT DE REVESTIMENT', 'Repicat per mitjans manuals del revestiment en mal estat per a la col·locació dels', 'reforços i neteja de superfícies. 5 u de 4 m c/u 5,00',
      '1.3 ml SEGELLAT DE JUNTES', 'Segellat de juntes de dilatació amb massilla de poliuretà. Es considera un 20%', 'entre la cornisa i la barana de coronació. Juntes de dilatació. 12,50',
      '1.4 m² REPÀS DE PARAMENTS', 'Repàs dels paramants verticals amb morter de calç. Amidament a confirmar en obra', 'Façana principal 10,00 6,70 67,00', 'Façana posterior 10,00 6,70 67,00', '134,00',
      '1.5 UT PINTAT DE BARANA. SUBMINISTRAMENT I', 'APLICACIÓ DE DUES MANS D\'ESMALT SINTÈTIC A LES BARANES', 'DELS BALCONS, AMB LA NETEJA PRÈVIA. 2,00',
      '1.6 m² PINTAT DE SOSTRES SOBRE ENVANS. VERT.GUIX AL PLÀSTIC', 'PINTAT DE PARAMENTS VERTICALS DE GUIX AMB UNA CAPA SEGELLADORA I DUES D\'ACABAT. 30,00'],
    files: [
      ['m²', 14.4, 'NETEJA DE FAÇANA\n- Neteja general de la façana amb aigua a baixa pressió i raspallat\nmanual amb sabó de pH neutre'],
      ['m²', 5, 'REPICAT DE REVESTIMENT\n- Repicat per mitjans manuals del revestiment en mal estat per a la col·locació dels\nreforços i neteja de superfícies. 5 u de 4 m c/u'],
      ['ml', 12.5, 'SEGELLAT DE JUNTES\n- Segellat de juntes de dilatació amb massilla de poliuretà. Es considera un 20%\nentre la cornisa i la barana de coronació. Juntes de dilatació.'],
      ['m²', 134, 'REPÀS DE PARAMENTS\n- Repàs dels paramants verticals amb morter de calç. Amidament a confirmar en obra Façana principal 10,00 6,70 67,00 Façana posterior'],
      ['ut', 2, 'PINTAT DE BARANA\n- SUBMINISTRAMENT I\nAPLICACIÓ DE DUES MANS D\'ESMALT SINTÈTIC A LES BARANES\nDELS BALCONS, AMB LA NETEJA PRÈVIA.'],
      ['m²', 30, 'PINTAT DE SOSTRES SOBRE ENVANS\n- VERT.GUIX AL PLÀSTIC\nPINTAT DE PARAMENTS VERTICALS DE GUIX AMB UNA CAPA SEGELLADORA I DUES D\'ACABAT.']],
    fi: ['manual amb sabó de pH neutre', 'reforços i neteja de superfícies. 5 u de 4 m c/u', 'entre la cornisa i la barana de coronació. Juntes de dilatació.'],
    tit5: 'PINTAT DE BARANA', txt5: /^- Subministrament i aplicació de dues mans d'esmalt sintètic/, tit6: 'PINTAT DE SOSTRES SOBRE ENVANS. VERT.GUIX AL PLÀSTIC' },
  es: { cap: 'CAPÍTULO 1. FACHADAS', doc: [
      '1.1 m2 LIMPIEZA DE FACHADA', 'Limpieza general de la fachada con agua a baja presión y cepillado', 'manual con jabón de pH neutro 14,40',
      '1.2 m2 REPICADO DE REVESTIMIENTO', 'Repicado por medios manuales del revestimiento en mal estado para la colocación de los', 'refuerzos y limpieza de superficies. 5 ud de 4 m c/u 5,00',
      '1.3 ml SELLADO DE JUNTAS', 'Sellado de juntas de dilatación con masilla de poliuretano. Se considera un 20%', 'entre la cornisa y la barandilla de coronación. Juntas de dilatación. 12,50',
      '1.4 m2 REPASO DE PARAMENTOS', 'Repaso de los paramentos verticales con mortero de cal. Medición a confirmar en obra', 'Fachada principal 10,00 6,70 67,00', 'Fachada posterior 10,00 6,70 67,00', '134,00',
      '1.5 UD PINTADO DE BARANDILLA. SUMINISTRO Y', 'APLICACIÓN DE DOS MANOS DE ESMALTE SINTÉTICO EN LAS BARANDILLAS', 'DE LOS BALCONES, CON LA LIMPIEZA PREVIA. 2,00',
      '1.6 m2 PINTADO DE TECHOS SOBRE TABIQUES. VERT.YESO AL PLÁSTICO', 'PINTADO DE PARAMENTOS VERTICALES DE YESO CON UNA CAPA SELLADORA Y DOS DE ACABADO. 30,00'],
    files: [
      ['m2', 14.4, 'LIMPIEZA DE FACHADA\n- Limpieza general de la fachada con agua a baja presión y cepillado\nmanual con jabón de pH neutro'],
      ['m2', 5, 'REPICADO DE REVESTIMIENTO\n- Repicado por medios manuales del revestimiento en mal estado para la colocación de los\nrefuerzos y limpieza de superficies. 5 ud de 4 m c/u'],
      ['ml', 12.5, 'SELLADO DE JUNTAS\n- Sellado de juntas de dilatación con masilla de poliuretano. Se considera un 20%\nentre la cornisa y la barandilla de coronación. Juntas de dilatación.'],
      ['m2', 134, 'REPASO DE PARAMENTOS\n- Repaso de los paramentos verticales con mortero de cal. Medición a confirmar en obra Fachada principal 10,00 6,70 67,00 Fachada posterior'],
      ['ud', 2, 'PINTADO DE BARANDILLA\n- SUMINISTRO Y\nAPLICACIÓN DE DOS MANOS DE ESMALTE SINTÉTICO EN LAS BARANDILLAS\nDE LOS BALCONES, CON LA LIMPIEZA PREVIA.'],
      ['m2', 30, 'PINTADO DE TECHOS SOBRE TABIQUES\n- VERT.YESO AL PLÁSTICO\nPINTADO DE PARAMENTOS VERTICALES DE YESO CON UNA CAPA SELLADORA Y DOS DE ACABADO.']],
    fi: ['manual con jabón de pH neutro', 'refuerzos y limpieza de superficies. 5 ud de 4 m c/u', 'entre la cornisa y la barandilla de coronación. Juntas de dilatación.'],
    tit5: 'PINTADO DE BARANDILLA', txt5: /^- Suministro y aplicación de dos manos de esmalte sintético/, tit6: 'PINTADO DE TECHOS SOBRE TABIQUES. VERT.YESO AL PLÁSTICO' } };
function prova(H, ll) {
  const T = eines(H, ll); if (!T || !T.aj) throw new Error('no trobo _ajustaAlDocument');
  const d = D[ll], rows = [{ tipo: 'cap', num: '1', desc: d.cap.replace(/^\S+\s+1\.\s*/, '') }].concat(d.files.map((f, i) => ({ tipo: 'part', num: '1.' + (i + 1), ut: f[0], amid: f[1], desc: f[2] })));
  T.aj(rows, [d.cap].concat(d.doc).join('\n'), [], ll === 'es'); const P = parts(rows), cos = r => String(r && r.desc || '').split('\n').slice(1).join(' ').replace(/\s+/g, ' ').trim();
  d.fi.forEach((f, i) => check(`${ll} · 1.${i + 1}: l'última línia del text, amb la quantitat al final al document, es queda («${f.slice(0, 30)}…»)`, P[i] && cos(P[i]).endsWith(f), P[i] && P[i].desc));
  check(`${ll} · 1.4: les línies de mesura en columna enganxades al final del text, fora`, P[3] && !/67,00|posterior/i.test(P[3].desc) && /confirm\w* en obra$/i.test(P[3].desc), P[3] && P[3].desc);
  check(`${ll} · 1.5: el títol és el del document fins al punt («${d.tit5}»)`, P[4] && P[4].desc.split('\n')[0] === d.tit5, P[4] && P[4].desc);
  check(`${ll} · 1.5: el text comença pel principi de la frase, d'una sola línia i en minúscula de frase`, P[4] && d.txt5.test(P[4].desc.split('\n').slice(1).join('\n')), P[4] && P[4].desc);
  check(`${ll} · 1.6: el títol d'una línia amb un punt de dins es queda sencer`, P[5] && P[5].desc.split('\n')[0] === d.tit6, P[5] && P[5].desc);
}
function tot(H, et) { for (const ll of ['ca', 'es']) prova(H, ll); }
console.log('Guardià LOT 36 · el text de la partida es queda sencer (' + path.basename(HTML) + ')');
tot(H0, 'app');
// ── peces trencades: el guardià ho ha de veure ──
const PECES = [
  ['sense distingir la línia de text amb la quantitat', '&&!_l36FiDeText(x)), CU=MOB.concat(ML)', '), CU=MOB.concat(ML)'],
  ['el títol del document sencer (sense tallar pel punt)', 'const Td=_l36TitolDoc(a.titol), nt=N(tit), nT=N(Td);', 'const Td=String(a.titol||"").trim(), nt=N(tit), nT=N(Td);'],
  ['sense ajuntar el principi del text', 'cos=cos.slice(0,m0.length+fr.length)+" "+cos.slice(m0.length+fr.length+1); }', '}'],
];
for (const [nom, de, a] of PECES) { const H = trenca(H0, de, a); if (!H) { check('peça trencada «' + nom + '»: el codi hi és', false, 'no trobo: ' + de.slice(0, 60)); continue; }
  const ok0 = ok, ko0 = ko; const log = console.log, err = console.error; console.log = () => { }; console.error = () => { };
  try { tot(H, 'trencat'); } catch (e) { ko++; } console.log = log; console.error = err;
  const caigut = ko > ko0; ok = ok0; ko = ko0; check('peça trencada «' + nom + '»: el guardià ho veu', caigut); }
console.log(`\n${ok} OK · ${ko} X`); process.exit(ko ? 1 : 0);
