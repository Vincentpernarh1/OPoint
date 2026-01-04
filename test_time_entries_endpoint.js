import dotenv from 'dotenv';
dotenv.config();

async function testTimeEntries() {
    const userId = 'f6776821-05d3-4c55-8434-9e838ab995aa'; // Renata
    const tenantId = '6c951ee9-4b49-4b37-b4d6-3b28f54826a3';
    
    console.log('🧪 Testing /api/time-entries endpoint\n');
    console.log(`User: ${userId}`);
    console.log(`Tenant: ${tenantId}\n`);
    
    try {
        const response = await fetch(`http://localhost:3001/api/time-entries?userId=${userId}`, {
            method: 'GET',
            headers: {
                'x-tenant-id': tenantId
            }
        });
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('❌ Failed:', result.error);
            return;
        }
        
        console.log(`✅ Found ${result.data.length} time entries\n`);
        
        // Group by date
        const byDate = result.data.reduce((acc, entry) => {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(entry);
            return acc;
        }, {});
        
        // Show January 2026 entries
        console.log('📅 January 2026 Entries:\n');
        
        Object.keys(byDate)
            .filter(d => d.startsWith('2026-01'))
            .sort()
            .forEach(date => {
                const entries = byDate[date].sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                
                console.log(`${date}:`);
                entries.forEach(e => {
                    const time = new Date(e.timestamp).toLocaleTimeString('en-GB');
                    console.log(`  ${e.type.padEnd(10)} ${time}`);
                });
                
                // Calculate hours
                let totalMs = 0;
                for (let i = 0; i < entries.length; i += 2) {
                    if (entries[i].type === 'CLOCK_IN' && entries[i + 1] && entries[i + 1].type === 'CLOCK_OUT') {
                        const inTime = new Date(entries[i].timestamp);
                        const outTime = new Date(entries[i + 1].timestamp);
                        totalMs += outTime - inTime;
                    }
                }
                
                const hours = totalMs / (1000 * 60 * 60);
                console.log(`  Total: ${hours.toFixed(2)}h\n`);
            });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testTimeEntries();
