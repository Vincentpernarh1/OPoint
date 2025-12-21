import { db, setTenantContext } from './services/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
    // Set tenant context - let's try with a known tenant
    setTenantContext('company-1'); // Assuming this is a valid tenant

    const { data, error } = await db.getUsers();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Users:');
    data.forEach(user => {
        console.log(`${user.name}: ${user.role} - tenant: ${user.tenant_id}`);
    });
}

checkUsers();