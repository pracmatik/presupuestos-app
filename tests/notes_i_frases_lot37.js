#!/usr/bin/env node
'use strict';
/*
 * Guardià · LOT 37 (26/10/2026) · CAP NOTA NI FINAL DE FRASE ES PERD SENSE AVÍS, I LA ZONA ÉS EL NOM QUE EL DOCUMENT ESCRIU A CADA FULL. Documents inventats,
 * català i castellà, cap dada de cap client (va també al repositori públic).
 *  1) el text que tanca l'amidament darrere de l'última partida, sense la paraula NOTA («AQUESTA RELACIÓ DE MESURES ÉS ORIENTATIVA…»), va una vegada al
 *     final com a nota sense valorar (C-117); si no acaba amb punt (no se sap on s'acaba) no es posa i surt un avís taronja; el resum de l'import no és cap nota;
 *  2) la descripció que la lectura deixa a mitja frase («… inscrita al Registre») es completa amb el final de la frase del document («oficial d'instal·ladors
 *     de la comunitat.»), encara que el PDF l'enganxi als títols de columna («Cant. Long./Sup Gruix Alçada TOTAL»); una etiqueta de mesura curta no hi entra;
 *  3) la zona: «FAÇANA PRINCIPAL I POSTERIOR. C/ …» a dalt de cada full, sobre els títols de columna → la zona és «FAÇANA PRINCIPAL I POSTERIOR»
 *     (abans, el títol del projecte tallat a la primera coma); sense aquesta capçalera, la zona surt com sempre;
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
  return new Function('IDIOMA', deh + '\nfunction pctPerDefecte(){ return null; }\nfunction isNoSuma(r){ return /NO SUMA/i.test(String((r&&r.desc)||"")); }\n' + b +
    '\nreturn {notes:notesAlSeuLloc, rep:repairDescsFromSource, zona:nomZonaDelDocument};')(idioma); } catch (e) { return { err: e }; } };
const D = {
  ca: { cap: 'COBERTA', p1: ['1.1 m² REPICAT DE PAVIMENT', 'Repicat i retirada del paviment ceràmic existent amb mitjans manuals,', 'càrrega i transport de runa a l\'abocador autoritzat.', 'Terrassa 1 18,94 18,94', 'TOTAL 18,94 m²'],
    p2: ['1.2 ml', 'Retirada del baixant existent i col·locació d\'un de nou de PVC de 125 mm.', 'L\'empresa que faci les obres haurà d\'estar inscrita al Registre',
      'oficial d\'instal·ladors de la comunitat. Cant. Long./Sup Gruix Alçada TOTAL', 'Baixant pati 1 1 36 36 Ml', 'TOTAL 36,00 Ml'],
    legal: ['AQUESTA RELACIÓ DE MESURES ÉS ORIENTATIVA I', 'NO SERVEIX DE BASE CONTRACTUAL. LES', 'MIDES QUE S\'HI DONEN SÓN PER ORIENTAR', 'L\'EMPRESA, QUE LES REVISARÀ AMB LA', 'PROPIETAT I LA DIRECCIÓ ABANS DE', 'COMENÇAR LES OBRES.'],
    legalSensePunt: ['AQUESTA RELACIÓ DE MESURES ÉS ORIENTATIVA I', 'NO SERVEIX DE BASE CONTRACTUAL I LES', 'MIDES QUE S\'HI DONEN SÓN PER ORIENTAR', 'L\'EMPRESA QUE LES REVISARÀ'],
    resum: ['El pressupost d\'execució material puja a la quantitat de vint mil euros', 'més l\'IVA corresponent segons la normativa vigent a la data.'],
    index: ['COBERTA', '1', 'PATIS', '2'],
    r2: 'Retirada del baixant existent i col·locació d\'un de nou de PVC de 125 mm.\nL\'empresa que faci les obres haurà d\'estar inscrita al Registre',
    fi2: 'inscrita al Registre oficial d\'instal·ladors de la comunitat.',
    zonaDoc: ['REHABILITACIÓ DE FAÇANES PRINCIPAL, POSTERIOR I LATERALS D\'UN', 'EDIFICI PLURIFAMILIAR SITUAT AL CARRER INVENTAT 9', 'FAÇANA PRINCIPAL I POSTERIOR. C/ INVENTAT, Nº 9.', 'ref. ut DESCRIPCIÓ UTS LONGITUD AMPLADA ALÇADA PARCIALS QUANTITAT', 'CAPÍTOL 1: BASTIDA'],
    zona: 'FAÇANA PRINCIPAL I POSTERIOR', zonaTitol: 'REHABILITACIÓ DE FAÇANES PRINCIPAL' },
  es: { cap: 'CUBIERTA', p1: ['1.1 m2 REPICADO DE PAVIMENTO', 'Repicado y retirada del pavimento cerámico existente con medios manuales,', 'carga y transporte de escombros al vertedero autorizado.', 'Terraza 1 18,94 18,94', 'TOTAL 18,94 m2'],
    p2: ['1.2 ml', 'Retirada del bajante existente y colocación de uno nuevo de PVC de 125 mm.', 'La empresa que realice las obras deberá estar inscrita en el Registro',
      'oficial de instaladores de la comunidad. Cant. Long./Sup Gruix Alçada TOTAL', 'Bajante patio 1 1 36 36 Ml', 'TOTAL 36,00 Ml'],
    legal: ['ESTA RELACIÓN DE MEDIDAS ES ORIENTATIVA Y', 'NO SIRVE DE BASE CONTRACTUAL. LAS', 'MEDIDAS QUE SE DAN SON PARA ORIENTAR', 'A LA EMPRESA, QUE LAS REVISARÁ CON LA', 'PROPIEDAD Y LA DIRECCIÓN ANTES DE', 'EMPEZAR LAS OBRAS.'],
    legalSensePunt: ['ESTA RELACIÓN DE MEDIDAS ES ORIENTATIVA Y', 'NO SIRVE DE BASE CONTRACTUAL Y LAS', 'MEDIDAS QUE SE DAN SON PARA ORIENTAR', 'A LA EMPRESA QUE LAS REVISARÁ'],
    resum: ['El presupuesto de ejecución material asciende a la cantidad de veinte mil euros', 'más el IVA correspondiente según la normativa vigente en la fecha.'],
    index: ['CUBIERTA', '1', 'PATIOS', '2'],
    r2: 'Retirada del bajante existente y colocación de uno nuevo de PVC de 125 mm.\nLa empresa que realice las obras deberá estar inscrita en el Registro',
    fi2: 'inscrita en el Registro oficial de instaladores de la comunidad.',
    zonaDoc: ['REHABILITACIÓN DE FACHADAS PRINCIPAL, POSTERIOR Y LATERALES DE UN', 'EDIFICIO PLURIFAMILIAR SITUADO EN LA CALLE INVENTADA 9', 'FACHADA PRINCIPAL Y POSTERIOR. C/ INVENTADA, Nº 9.', 'ref. ud DESCRIPCIÓN UDS LONGITUD ANCHURA ALTURA PARCIALES CANTIDAD', 'CAPÍTULO 1: ANDAMIAJE'],
    zona: 'FACHADA PRINCIPAL Y POSTERIOR', zonaTitol: 'REHABILITACIÓN DE FACHADAS PRINCIPAL' } };
const files = d => [{ tipo: 'cap', num: '1', desc: d.cap },
  { tipo: 'part', num: '1.1', ut: 'm²', amid: 18.94, desc: d.p1[0].split(/\s+/).slice(2).join(' ') + '\n- ' + d.p1[1] + ' ' + d.p1[2] },
  { tipo: 'part', num: '1.2', ut: 'ml', amid: 36, desc: d.r2 }];
function prova(H, ll) {
  const T = eines(H, ll); if (!T || T.err) throw new Error('no puc carregar les eines: ' + (T && T.err && T.err.message));
  const d = D[ll], es = ll === 'es', res = {};
  // 1) notes del final
  const base = ['##CAP## ' + d.cap].concat(d.p1, d.p2);
  { const rows = files(d), av = []; T.notes(rows, base.concat(d.legal, d.index).join('\n'), av, es, null); const n = rows.filter(r => r.notaFinal);
    res.nota = n.length === 1 && /OBRAS?\.$|OBRES\.$/.test(n[0].desc) && n[0].desc.indexOf(d.legal[0]) === 0 && !n[0].amid && rows[rows.length - 1] === n[0];
    res.notaDetall = JSON.stringify(n.map(x => x.desc)).slice(0, 200); }
  { const rows = files(d), av = []; T.notes(rows, base.concat(d.legalSensePunt).join('\n'), av, es, null);
    res.dubte = !rows.some(r => r.notaFinal) && av.some(a => /^⚠/.test(a) && a.indexOf(d.legalSensePunt[0].slice(0, 30)) >= 0); res.dubteDetall = JSON.stringify(av).slice(0, 200); }
  { const rows = files(d), av = []; T.notes(rows, base.concat(d.resum).join('\n'), av, es, null); res.resum = !rows.some(r => r.notaFinal) && !av.some(a => /^⚠/.test(a)); }
  { const rows = files(d); rows.push(Object.assign({ tipo: 'subv', num: '', desc: d.legal.join(' '), ut: '', amid: '', preu: '' }, { notaFinal: true })); const av = [];
    T.notes(rows, base.concat(d.legal).join('\n'), av, es, null); res.jaHiEs = rows.filter(r => r.notaFinal).length === 1 && !av.some(a => /^⚠/.test(a)); }
  // 2) final de frase enganxat als títols de columna
  { const rows = files(d), src = base.concat(d.legal).join('\n'); T.rep(rows, src, []); const r = rows.find(x => x.num === '1.2');
    res.frase = !!r && r.desc.replace(/\s+/g, ' ').endsWith(d.fi2) && !/Cant\.|Gruix|TOTAL/.test(r.desc); res.fraseDetall = r && r.desc.slice(-90); }
  // 3) zona
  { const z = Array(3).fill(d.zonaDoc.slice(2, 4)).flat(); const t1 = d.zonaDoc.slice(0, 2).concat(z, [d.zonaDoc[4]], d.p1).join('\n');
    const t2 = d.zonaDoc.slice(0, 2).concat([d.zonaDoc[3], d.zonaDoc[4]], d.p1).join('\n');
    res.zona = T.zona(t1); res.zonaSense = T.zona(t2); }
  return res; }
function avalua(H, etiq) { const out = {}; for (const ll of ['ca', 'es']) { try { out[ll] = prova(H, ll); } catch (e) { out[ll] = { err: e.message }; } }
  if (etiq) return out;
  for (const ll of ['ca', 'es']) { const r = out[ll], d = D[ll];
    if (r.err) { check(ll + ': les eines es carreguen', false, r.err); continue; }
    check(ll + ': el text que tanca l\'amidament va una vegada al final, sense valorar', r.nota, r.notaDetall);
    check(ll + ': si no acaba amb punt no es posa i surt un avís taronja que el cita', r.dubte, r.dubteDetall);
    check(ll + ': el resum de l\'import no és cap nota ni porta avís', r.resum);
    check(ll + ': si ja surt a la pantalla no es repeteix ni s\'avisa', r.jaHiEs);
    check(ll + ': el final de la frase enganxat als títols de columna entra al text', r.frase, r.fraseDetall);
    check(ll + ': la zona és el nom escrit a dalt de cada full', r.zona === d.zona, r.zona);
    check(ll + ': sense capçalera de full, la zona surt com sempre', r.zonaSense === d.zonaTitol, r.zonaSense); }
  return out; }
console.log('Guardià LOT 37 · notes, final de frase i zona (' + path.basename(HTML) + ')');
avalua(H0);
// 4) peces trencades: cada una s'ha de veure
const peces = [
  ['sense la nota del final', /if\(fet&&w>=12&&/, 'if(false&&fet&&w>=12&&', r => !r.ca.nota && !r.es.nota],
  ['sense l\'avís de dubte', /else if\(Array\.isArray\(avisos\)\) avisos\.push\(es\?\("⚠ Detrás de la última partida/, 'else if(false) avisos.push(es?("⚠ Detrás de la última partida', r => !r.ca.dubte && !r.es.dubte],
  ['sense el final de frase', /const _etiq=!_frase37&&/, 'const _etiq=', r => !r.ca.frase && !r.es.frase],
  ['sense la zona de la capçalera de full', /if\(sota>=2\) return m\[1\]/, 'if(false) return m[1]', r => r.ca.zona !== D.ca.zona && r.es.zona !== D.es.zona]];
for (const [nom, de, a, vist] of peces) { const H = trenca(H0, de, a); if (!H) { check('peça trencada «' + nom + '»: el tros hi és', false); continue; }
  check('peça trencada «' + nom + '»: es veu', vist(avalua(H, true))); }
console.log((ko ? 'X ' : 'OK ') + ok + ' OK · ' + ko + ' X'); process.exit(ko ? 1 : 0);
