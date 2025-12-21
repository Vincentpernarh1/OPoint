import { db, setTenantContext } from './services/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
    // Set tenant context - use the Vpena Teck company tenant ID
    setTenantContext('be711ae5-984f-42a8-a290-a7232d05e7ea'); // Vpena Teck company

    const { data, error } = await db.getUsers();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Users:');
    data.forEach(user => {
        console.log(`${user.name}: ${user.role} - tenant: ${user.tenantId || user.tenant_id || 'undefined'}`);
        console.log(`  Mobile Money: ${user.mobileMoneyNumber || user.mobile_money_number || 'Not set'}`);
        console.log(`  Email: ${user.email}`);
        console.log('---');
    });
}

checkUsers();