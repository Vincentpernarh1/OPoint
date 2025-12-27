// Check companies in database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vldedsnfbvyfbpigvhzl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZGVkc25mYnZ5ZmJwaWd2aHpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTM0MTMwMSwiZXhwIjoyMDQ2OTE3MzAxfQ.OBg1W3KUXO19yrLd9GC6U9xB7GtIVp69QkPZRCTuNso';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCompanies() {
    console.log('Checking companies...\n');

    const { data, error } = await supabase
        .from('opoint_companies')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No companies found');
        return;
    }

    console.log(`Found ${data.length} companies:\n`);
    data.forEach(company => {
        console.log(`📊 ${company.name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   License Count: ${company.license_count || 'Not set'}`);
        console.log(`   Used Licenses: ${company.used_licenses || 0}`);
        console.log();
    });
}

checkCompanies();
