#!/usr/bin/env node
// Cron B9 — maintenance de la liste de prospection cabinets (NAF 69.20Z).
// Chaque run : le département suivant de la rotation (watermark persistant),
// fusion dans le master CSV, et signalement des SIREN nouveaux (les créations
// de cabinets remontent naturellement dans les mises à jour SIRENE).
// Conçu pour tenir dans la limite d'exécution des crons (3 min).

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { DEPARTEMENTS_UNIQUES } from './prospection-departements.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'prospection');
const MASTER = path.join(OUT, 'cabinets-master.csv');
const STATE = path.join(OUT, 'rotation.json');
const API = 'https://recherche-entreprises.api.gouv.fr/search';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dept = DEPARTEMENTS_UNIQUES[(await state()).index % DEPARTEMENTS_UNIQUES.length];

async function state() {
  try {
    return JSON.parse(await readFile(STATE, 'utf8'));
  } catch {
    return { index: 0, lastRun: null };
  }
}
const saveState = (s) => writeFile(STATE, JSON.stringify(s, null, 1));

async function fetchDept(dept) {
  const rows = [];
  for (let page = 1; page <= 200; page++) {
    const url = `${API}?activite_principale=69.20Z&etat_administratif=A&departement=${dept}&page=${page}&per_page=25`;
    let d = null;
    for (let a = 1; a <= 3; a++) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'brainmail-prospection-cron/1.0' } });
        if (r.status === 429 || r.status >= 500) {
          await sleep(1500 * a);
          continue;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        d = await r.json();
        break;
      } catch (e) {
        if (a === 3) throw e;
        await sleep(1500 * a);
      }
    }
    if (!d) throw new Error('API indisponible');
    for (const e of d.results || []) {
      if (e.opposition_diffusion_commerciale === true || e.statut_diffusion === 'N') continue;
      const s = e.siege || {};
      const dir = (e.dirigeants || [])
        .filter((x) => x.type_dirigeant === 'personne physique')
        .map((x) => `${(x.prenoms || '').trim()} ${x.nom || ''}`.trim())
        .filter(Boolean)[0];
      rows.push([
        e.siren,
        (e.nom_complet || e.nom_raison_sociale || '').replace(/[\r\n;]+/g, ' ').trim(),
        e.nature_juridique || '',
        (dir || '').replace(/[\r\n;]+/g, ' ').trim(),
        (s.adresse || '').replace(/[\r\n;]+/g, ' ').trim(),
        s.code_postal || '',
        s.commune || '',
        s.departement || dept,
        e.tranche_effectif_salarie || '',
        e.date_creation || '',
      ]);
    }
    const total = Math.min(d.total_results ?? 0, 10000);
    if ((d.results || []).length < 25 || page * 25 >= total) break;
    await sleep(150);
  }
  return rows;
}

function parseMaster(text) {
  const lines = text.split('\n').filter(Boolean);
  const map = new Map();
  for (const line of lines.slice(2)) {
    const c = line.split(';');
    if (c[0]) map.set(c[0], c);
  }
  return map;
}

// --- exécution ---
if (!existsSync(OUT)) process.exit(1); // pas de dossier prospection : job non initialisé
const st = await state();
const rows = await fetchDept(dept);
let previous = new Map();
if (existsSync(MASTER)) previous = parseMaster(await readFile(MASTER, 'utf8'));
const nouveaux = rows.filter((r) => !previous.has(r[0]));
// fusion : remplace les lignes du département, garde le reste
for (const [siren] of previous) {
  const c = previous.get(siren);
  if (c[7] === dept) previous.delete(siren);
}
for (const r of rows) previous.set(r[0], r);
const cols = ['siren','nom','forme_juridique','dirigeant','adresse','code_postal','commune','departement','tranche_effectif','date_creation'];
const csv =
  '\ufeff' +
  ['source : INSEE SIRENE via recherche-entreprises.api.gouv.fr - prospection B2B (exclut les oppositions commerciales)']
    .concat([cols.join(';'), ...[...previous.values()].map((c) => c.join(';'))])
    .join('\n');
await writeFile(MASTER, csv);
await saveState({ index: (st.index % DEPARTEMENTS_UNIQUES.length) + 1, lastRun: new Date().toISOString(), dept });
console.log(`B9 prospection - departement ${dept} : ${rows.length} cabinets actifs`);
console.log(`Nouveaux SIREN dans ce departement : ${nouveaux.length}`);
for (const r of nouveaux.slice(0, 3)) console.log(`- ${r[1]} (${r[5]} ${r[6]})`);
console.log(`Master : ${previous.size} cabinets au total - prochaine rotation : dept ${DEPARTEMENTS_UNIQUES[(st.index % DEPARTEMENTS_UNIQUES.length) + 1] ?? DEPARTEMENTS_UNIQUES[0]}`);
