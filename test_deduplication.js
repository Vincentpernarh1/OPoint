// Test the deduplication logic

console.log('\n=== TESTING DEDUPLICATION LOGIC ===\n');

// Simulate 3 duplicate entries for Jan 3 (same punches array)
const mockEntries = [
    {
        id: '1',
        date: '2026-01-03',
        punches: [
            { type: 'in', time: '2026-01-03T08:00:00Z' },
            { type: 'out', time: '2026-01-03T11:00:00Z' },
            { type: 'in', time: '2026-01-03T12:00:00Z' },
            { type: 'out', time: '2026-01-03T15:26:30Z' }
        ]
    },
    {
        id: '2',
        date: '2026-01-03',
        punches: [
            { type: 'in', time: '2026-01-03T08:00:00Z' },
            { type: 'out', time: '2026-01-03T11:00:00Z' },
            { type: 'in', time: '2026-01-03T12:00:00Z' },
            { type: 'out', time: '2026-01-03T15:26:30Z' }
        ]
    },
    {
        id: '3',
        date: '2026-01-03',
        punches: [
            { type: 'in', time: '2026-01-03T08:00:00Z' },
            { type: 'out', time: '2026-01-03T11:00:00Z' },
            { type: 'in', time: '2026-01-03T12:00:00Z' },
            { type: 'out', time: '2026-01-03T15:26:30Z' }
        ]
    }
];

console.log(`Total entries: ${mockEntries.length}`);

// Apply deduplication logic
const uniqueEntries = [];
const seenEntries = new Set();

mockEntries.forEach(entry => {
    let key;
    if (entry.punches && Array.isArray(entry.punches) && entry.punches.length > 0) {
        // For punches array, use JSON stringified punches as key
        key = JSON.stringify(entry.punches);
    } else {
        // For old format, use clock times
        key = `${entry.clock_in}-${entry.clock_out}-${entry.clock_in_2}-${entry.clock_out_2}`;
    }
    
    if (!seenEntries.has(key)) {
        seenEntries.add(key);
        uniqueEntries.push(entry);
        console.log(`✅ Entry ${entry.id}: Added (unique)`);
    } else {
        console.log(`❌ Entry ${entry.id}: Skipped (duplicate)`);
    }
});

console.log(`\nAfter deduplication: ${uniqueEntries.length} entries\n`);

// Calculate hours for the unique entry
let totalHours = 0;
uniqueEntries.forEach(entry => {
    let dayTotalMs = 0;
    
    for (let i = 0; i < entry.punches.length - 1; i++) {
        const punch1 = entry.punches[i];
        const punch2 = entry.punches[i + 1];
        
        let type1 = punch1.type?.toLowerCase();
        let type2 = punch2.type?.toLowerCase();
        let time1 = new Date(punch1.time);
        let time2 = new Date(punch2.time);
        
        if (type1 === 'in' && type2 === 'out') {
            const pairMs = time2.getTime() - time1.getTime();
            if (pairMs > 0) {
                const hours = pairMs / (1000 * 60 * 60);
                console.log(`  IN→OUT pair: ${time1.toISOString()} to ${time2.toISOString()} = ${hours.toFixed(2)} hours`);
                dayTotalMs += pairMs;
                i++; // Skip next punch since paired
            }
        }
    }
    
    const dayHours = dayTotalMs / (1000 * 60 * 60);
    totalHours += dayHours;
    console.log(`  Total for this entry: ${dayHours.toFixed(2)} hours`);
});

console.log(`\n=== RESULT ===`);
console.log(`Total hours calculated: ${totalHours.toFixed(2)}`);
console.log(`Expected: 6.44 hours`);
console.log(`Match: ${Math.abs(totalHours - 6.4416667) < 0.01 ? '✅ PASS' : '❌ FAIL'}`);
