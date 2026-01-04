console.log('Testing fresh payslip calculation...\n');

// Wait 2 seconds for server to be ready
setTimeout(async () => {
    const response = await fetch('http://localhost:3001/api/payslips/f6776821-05d3-4c55-8434-9e838ab995aa/2026-01-04?force=true', {
        headers: {
            'X-Tenant-ID': '6c951ee9-4b49-4b37-b4d6-3b28f54826a3'
        }
    });
    
    const data = await response.json();
    
    console.log('Payslip Data:');
    console.log(`  Pay Period: ${data.data?.payPeriodStart} to ${data.data?.payPeriodEnd}`);
    console.log(`  Hours Not Worked: ${data.data?.hoursDeduction?.hours}`);
    console.log(`  Actual Hours: ${176 - (data.data?.hoursDeduction?.hours || 0)}`);
    console.log(`  Gross Pay: GHS ${data.data?.grossPay?.toFixed(2)}`);
    console.log(`  Cached: ${data.cached}`);
    
    if (Math.abs((176 - (data.data?.hoursDeduction?.hours || 0)) - 16) < 0.1) {
        console.log('\n✅ SUCCESS! Backend now calculates 16 hours!');
    } else {
        console.log(`\n❌ Still wrong: Expected 16 hours, got ${176 - (data.data?.hoursDeduction?.hours || 0)}`);
    }
    
}, 2000);
