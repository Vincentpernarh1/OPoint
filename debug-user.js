// Debug script - paste this in browser console
console.log('=== DEBUG INFO ===');
const userData = localStorage.getItem('currentUser');
if (userData) {
    const user = JSON.parse(userData);
    console.log('User from localStorage:', {
        name: user.name,
        email: user.email,
        role: user.role,
        roleType: typeof user.role,
        company_id: user.company_id
    });
    
    // Check role match
    const UserRole = {
        EMPLOYEE: 'Employee',
        ADMIN: 'Admin',
        HR: 'HR',
        OPERATIONS: 'Operations',
        PAYMENTS: 'Payments',
    };
    
    console.log('Role comparisons:');
    console.log('  Matches EMPLOYEE?', user.role === UserRole.EMPLOYEE);
    console.log('  Matches ADMIN?', user.role === UserRole.ADMIN);
    console.log('  Matches HR?', user.role === UserRole.HR);
} else {
    console.log('No user in localStorage');
}
