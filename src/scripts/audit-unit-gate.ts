#!/usr/bin/env tsx
/**
 * Dry-run the unit-integrity gate (migration 20260620000000) over EXISTING
 * biomarker rows, WITHOUT modifying anything. Reports exactly which rows the
 * trigger would quarantine, which slugs are FK orphans, and flags anything that
 * looks like a false positive for human review.
 *
 * Run: pnpm tsx src/scripts/audit-unit-gate.ts
 */
import 'dotenv/config';
import { getSupabaseClient } from '../utils/supabase';
import { unitDimension, unitsCompatible } from '../utils/unit-dimension';

async function main() {
  const sb = getSupabaseClient();

  const { data: rows, error } = await sb
    .from('biomarkers')
    .select('name_normalized, name, unit, value');
  if (error) throw error;

  const { data: defs, error: e2 } = await sb
    .from('biomarker_definitions')
    .select('name_normalized, unit');
  if (e2) throw e2;
  const catUnit = new Map(defs!.map((d) => [d.name_normalized, d.unit as string]));

  const quarantined: any[] = [];
  const orphans = new Map<string, number>();
  let pass = 0;

  for (const r of rows!) {
    const cat = catUnit.get(r.name_normalized);
    if (cat === undefined) {
      orphans.set(r.name_normalized, (orphans.get(r.name_normalized) ?? 0) + 1);
      continue; // pre-existing orphan: NOT VALID FK ignores it; trigger skips (no catalog unit)
    }
    if (!cat || cat === '') { pass++; continue; } // empty catalog unit -> trigger passes
    if (unitsCompatible(r.unit, cat)) { pass++; continue; }
    quarantined.push({
      slug: r.name_normalized,
      name: r.name,
      value: r.value,
      unit: r.unit,
      catalogUnit: cat,
      foundDim: unitDimension(r.unit),
      expectedDim: unitDimension(cat),
    });
  }

  console.log(`\nTotal rows: ${rows!.length}`);
  console.log(`  pass (kept):        ${pass}`);
  console.log(`  WOULD quarantine:   ${quarantined.length}`);
  console.log(`  orphan-slug rows:   ${[...orphans.values()].reduce((a, b) => a + b, 0)} (across ${orphans.size} slugs; pre-existing, untouched)\n`);

  console.log('=== ROWS THE TRIGGER WOULD QUARANTINE (review for false positives) ===');
  const bySlug = new Map<string, any[]>();
  for (const q of quarantined) {
    if (!bySlug.has(q.slug)) bySlug.set(q.slug, []);
    bySlug.get(q.slug)!.push(q);
  }
  for (const [slug, items] of [...bySlug.entries()].sort()) {
    const cat = items[0].catalogUnit;
    console.log(`\n${slug}  [catalog: ${cat} = ${items[0].expectedDim}]  (${items.length} rows)`);
    for (const q of items) {
      console.log(`    "${q.unit}" (${q.foundDim})  ${q.name} = ${q.value}`);
    }
  }

  console.log('\n=== ORPHAN SLUGS (no catalog entry; FK NOT VALID ignores these existing rows) ===');
  console.log([...orphans.entries()].map(([s, n]) => `${s} (${n})`).sort().join(', '));

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
