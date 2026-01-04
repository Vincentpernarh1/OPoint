import dotenv from 'dotenv';
dotenv.config();

async function testTimeEntries() {
    const userId = 'f6776821-05d3-4c55-8434-9e838ab995aa'; // Renata
    const tenantId = '6c951ee9-4b49-4b37-b4d6-3b28f54826a3';
    
    console.log('🧪 Testing /api/time-entries for January 2026\n');
    
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
        
        console.log(`✅ Total entries: ${result.data.length}\n`);
        
        // Group by date
        const byDate = result.data.reduce((acc, entry) => {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(entry);
            return acc;
        }, {});
        
        // Show January 2026 only
        const janDates = Object.keys(byDate)
            .filter(d => d.startsWith('2026-01'))
            .sort();
        
        console.log('📅 January 2026 Entries:\n');
        
        janDates.forEach(date => {
            const entries = byDate[date].sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            
            console.log(`${dayName}, ${date}:`);
            entries.forEach(e => {
                const time = new Date(e.timestamp).toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                console.log(`  ${e.type.padEnd(10)} ${time}`);
            });
            console.log();
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testTimeEntries();
