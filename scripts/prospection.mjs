#!/usr/bin/env node
// Bot de prospection BRAINMAIL : recense les cabinets comptables actifs en
// France (NAF 69.20Z — Activités comptables) via l'API publique
// recherche-entreprises.api.gouv.fr (base SIRENE, INSEE — open data).
//
// Cadre légal : données de contact B2B publiées dans la base SIRENE ;
// les établissements ayant déclaré une opposition à la prospection
// commerciale (opposition_diffusion_commerciale / statut de diffusion)
// sont exclus de la liste produite.
//
// Usage : node scripts/prospection.mjs [--dept 13,2A] [--per-page 100] [--out prospection]
// Sortie : prospection/cabinets-comptables-<date>.csv (+ .json)

import { mkdir, writeFile, appendFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const API = 'https://recherche-entreprises.api.gouv.fr/search';
const APE = '69.20Z'; // Activités comptables (experts-comptables, comptables)

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};
const outDir = argOf('--out', 'prospection');
const perPage = Math.min(Math.max(Number(argOf('--per-page', '25')) || 25, 1), 25); // limite API : 25
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Départements métropole (2A/2B pour la Corse) + DOM.
function departments() {
  const list = [];
  for (let i = 1; i <= 19; i++) list.push(String(i).padStart(2, '0'));
  list.push('2A', '2B');
  for (let i = 21; i <= 95; i++) if (i !== 20) list.push(String(i).padStart(2, '0'));
  list.push('971', '972', '973', '974', '976');
  const only = (argOf('--dept', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return only.length ? only : list;
}

async function fetchPage(dept, page, signal) {
  const url = `${API}?activite_principale=${APE}&etat_administratif=A&departement=${dept}&page=${page}&per_page=${perPage}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'brainmail-prospection/1.0 (liste B2B - source INSEE SIRENE)' }, signal });
      if (r.status === 429 || r.status >= 500) {
        await sleep(1200 * attempt);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      if (attempt === 4) throw e;
      await sleep(1200 * attempt);
    }
  }
}

const seen = new Set();
const rows = [];
const errors = [];

function toRow(e, dept) {
  const s = e.siege || {};
  // Le cabinet refuse la prospection commerciale ? On l'exclut (CNIL).
  if (e.opposition_diffusion_commerciale === true) return null;
  if (e.statut_diffusion === 'N') return null; // diffusion interdite
  const dirigeant = (e.dirigeants || [])
    .filter((d) => d.type_dirigeant === 'personne physique')
    .map((d) => `${(d.prenoms || '').trim()} ${d.nom || ''}`.trim())
    .filter(Boolean);
  const fin = e.finances || {};
  return {
    siren: e.siren,
    nom: (e.nom_complet || e.nom_raison_sociale || '').trim(),
    forme_juridique: e.nature_juridique || '',
    dirigeant: [...new Set(dirigeant)].slice(0, 2).join(' · '),
    adresse: (s.adresse || '').trim(),
    code_postal: s.code_postal || '',
    commune: s.commune || '',
    departement: s.departement || dept,
    tranche_effectif: e.tranche_effectif_salarie || '',
    date_creation: e.date_creation || '',
    ca: fin && fin.ca != null ? fin.ca : '',
    resultat: fin && fin.resultat_net != null ? fin.resultat_net : '',
  };
}

async function scanDept(dept) {
  let page = 1;
  let deptCount = 0;
  for (;;) {
    const d = await fetchPage(dept, page);
    const results = d.results || [];
    for (const e of results) {
      if (!e.siren || seen.has(e.siren)) continue;
      seen.add(e.siren);
      const row = toRow(e, dept);
      if (row) {
        rows.push(row);
        deptCount++;
      }
    }
    const total = Math.min(d.total_results ?? 0, 10000);
    if (results.length < perPage || page * perPage >= total) break;
    page++;
    await sleep(160);
  }
  console.log(`dept ${dept}: ${deptCount} cabinets (page ${page})`);
}

const today = new Date().toISOString().slice(0, 10);
const outFile = path.join(outDir, `cabinets-comptables-${today}`);

console.log(`Prospection des cabinets comptables (NAF ${APE}) — départements: ${departments().length}`);
for (const dept of departments()) {
  try {
    await scanDept(dept);
  } catch (e) {
    console.error(`dept ${dept}: ERREUR ${e.message}`);
    errors.push(dept);
  }
  await sleep(160);
}

// Tri : cabinets avec effectif connu d'abord (plus gros = meilleure cible
// Cabinet), puis département.
const order = (t) => (t ? Number(t) || 0 : 0);
rows.sort((a, b) => b.departement.localeCompare(a.departement) || a.nom.localeCompare(b.nom, 'fr'));

await mkdir(outDir, { recursive: true });
const cols = ['siren','nom','forme_juridique','dirigeant','adresse','code_postal','commune','departement','tranche_effectif','date_creation','ca','resultat'];
const csv = '\ufeff' + ['source : INSEE SIRENE via recherche-entreprises.api.gouv.fr — prospection B2B (exclut les oppositions commerciales)'].concat(
  [cols.join(';'), ...rows.map((r) => cols.map((c) => String(r[c] ?? '').replace(/[\r\n;]+/g, ' ')).join(';'))]
).join('\n');
await writeFile(`${outFile}.csv`, csv);
await writeFile(`${outFile}.json`, JSON.stringify({ date: today, ape: APE, count: rows.length, errors, rows }, null, 1));
console.log(`\nTOTAL: ${rows.length} cabinets → ${outFile}.csv`);
if (errors.length) console.log(`Départements en erreur (relancer avec --dept ${errors.join(',')}): ${errors.join(', ')}`);
