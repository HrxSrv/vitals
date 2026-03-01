/**
 * Update biomarker definitions in the database
 * Adds missing biomarkers and fixes naming inconsistencies
 */

import '../env'; // Load environment variables first
import { supabaseAdmin } from '../services/supabase.service';

const newBiomarkers = [
  {
    name_normalized: 'pdw',
    display_name: 'PDW',
    category: 'blood_count',
    unit: '%',
    ref_range_low: 9.0,
    ref_range_high: 17.0,
    critical_low: 5.0,
    critical_high: 25.0,
    description: 'Platelet distribution width',
  },
  {
    name_normalized: 'uibc',
    display_name: 'UIBC',
    category: 'other',
    unit: 'μg/dL',
    ref_range_low: 111,
    ref_range_high: 343,
    critical_low: 50,
    critical_high: 500,
    description: 'Unsaturated iron binding capacity',
  },
  {
    name_normalized: 'transferrin_saturation',
    display_name: 'Transferrin Saturation',
    category: 'other',
    unit: '%',
    ref_range_low: 20,
    ref_range_high: 50,
    critical_low: 10,
    critical_high: 80,
    description: 'Percentage of transferrin saturated with iron',
  },
  {
    name_normalized: 'tibc',
    display_name: 'TIBC',
    category: 'other',
    unit: 'μg/dL',
    ref_range_low: 250,
    ref_range_high: 450,
    critical_low: 150,
    critical_high: 600,
    description: 'Total iron binding capacity',
  },
  {
    name_normalized: 'mpv',
    display_name: 'MPV',
    category: 'blood_count',
    unit: 'fL',
    ref_range_low: 7.5,
    ref_range_high: 11.5,
    critical_low: 5.0,
    critical_high: 15.0,
    description: 'Mean platelet volume',
  },
  {
    name_normalized: 'pct',
    display_name: 'PCT',
    category: 'blood_count',
    unit: '%',
    ref_range_low: 0.2,
    ref_range_high: 0.5,
    critical_low: 0.1,
    critical_high: 1.0,
    description: 'Plateletcrit',
  },
  {
    name_normalized: 'white_blood_cells',
    display_name: 'WBC',
    category: 'blood_count',
    unit: 'thousand/μL',
    ref_range_low: 4.0,
    ref_range_high: 11.0,
    critical_low: 1.0,
    critical_high: 30.0,
    description: 'White blood cell count',
  },
  {
    name_normalized: 'red_blood_cells',
    display_name: 'RBC',
    category: 'blood_count',
    unit: 'million/μL',
    ref_range_low: 4.0,
    ref_range_high: 6.0,
    critical_low: 2.0,
    critical_high: 8.0,
    description: 'Red blood cell count',
  },
  {
    name_normalized: 'platelets',
    display_name: 'Platelets',
    category: 'blood_count',
    unit: 'thousand/μL',
    ref_range_low: 150,
    ref_range_high: 400,
    critical_low: 50,
    critical_high: 1000,
    description: 'Platelet count',
  },
];

async function updateBiomarkerDefinitions() {
  console.log('🔄 Updating biomarker definitions...\n');

  try {
    // Step 1: Update alp to alkaline_phosphatase
    console.log('1. Updating alkaline phosphatase naming...');
    const { error: updateError } = await supabaseAdmin
      .from('biomarker_definitions')
      .update({ name_normalized: 'alkaline_phosphatase' })
      .eq('name_normalized', 'alp');

    if (updateError) {
      console.log(`   ⚠️  ALP update: ${updateError.message}`);
    } else {
      console.log('   ✅ Updated alp → alkaline_phosphatase');
    }

    // Step 2: Insert new biomarkers
    console.log('\n2. Adding missing biomarkers...');
    
    for (const biomarker of newBiomarkers) {
      // Check if it already exists
      const { data: existing } = await supabaseAdmin
        .from('biomarker_definitions')
        .select('name_normalized')
        .eq('name_normalized', biomarker.name_normalized)
        .single();

      if (existing) {
        console.log(`   ⏭️  ${biomarker.name_normalized} already exists`);
        continue;
      }

      // Insert new biomarker
      const { error: insertError } = await supabaseAdmin
        .from('biomarker_definitions')
        .insert(biomarker);

      if (insertError) {
        console.log(`   ❌ ${biomarker.name_normalized}: ${insertError.message}`);
      } else {
        console.log(`   ✅ Added ${biomarker.name_normalized}`);
      }
    }

    console.log('\n✅ Biomarker definitions updated successfully!');
  } catch (error) {
    console.error('\n❌ Failed to update biomarker definitions:', error);
    process.exit(1);
  }
}

// Run the update
updateBiomarkerDefinitions();
