// Debug login response to see user structure
import fetch from 'node-fetch';

try {
    const dotenv = await import('dotenv');
    dotenv.config();
} catch (e) {}

const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'vpernarh@gmail.com',
        password: '1234'
    })
});

const data = await response.json();
const cookies = response.headers.get('set-cookie');

console.log('Login Response:');
console.log(JSON.stringify(data, null, 2));
console.log('\nCookie:', cookies);

if (data.user) {
    console.log('\nUser structure:');
    console.log('- id:', data.user.id);
    console.log('- tenantId:', data.user.tenantId);
    console.log('- tenant_id:', data.user.tenant_id);
    console.log('- role:', data.user.role);
}
