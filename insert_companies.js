import { getSupabaseAdminClient } from './services/database.js';

async function insertCompanies() {
    const client = getSupabaseAdminClient();
    if (!client) {
        console.error('No admin client');
        return;
    }

    const companies = [
        {
            id: 'c1',
            name: 'Vertex Innovations Ltd.',
            license_count: 50,
            modules: { payroll: true, leave: true, expenses: true, reports: true, announcements: true }
        },
        {
            id: 'c2',
            name: 'Summit Solutions Inc.',
            license_count: 10,
            modules: { payroll: true, leave: true, expenses: false, reports: true, announcements: false }
        },
        {
            id: '1c8296f4-edad-4934-9638-d6ed933eeead',
            name: 'Vpena Teck',
            license_count: 50,
            modules: { payroll: true, leave: true, expenses: true, reports: true, announcements: true }
        },
        {
            id: '19333055-ca7a-4cc0-a4e6-1b5e444cf96e',
            name: 'Vpena Teck',
            license_count: 50,
            modules: { payroll: true, leave: true, expenses: true, reports: true, announcements: true }
        }
    ];

    for (const company of companies) {
        const { error } = await client
            .from('companies')
            .upsert(company, { onConflict: 'id' });

        if (error) {
            console.error('Error inserting company:', company.id, error);
        } else {
            console.log('Inserted company:', company.name);
        }
    }
}

insertCompanies();