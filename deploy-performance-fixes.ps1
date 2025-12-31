#!/usr/bin/env pwsh
# =====================================================
# QUICK DEPLOYMENT SCRIPT
# Run this to deploy all performance fixes
# =====================================================

Write-Host "🚀 VPENA OnPoint - Performance Fixes Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
Write-Host "📦 Step 1: Building optimized frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Please fix errors and try again." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Remind about database migration
Write-Host "📊 Step 2: Database Migration Required" -ForegroundColor Yellow
Write-Host "⚠️  IMPORTANT: You must run the database migration manually!" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open Supabase Dashboard → SQL Editor" -ForegroundColor White
Write-Host "2. Copy contents of: add_performance_indexes.sql" -ForegroundColor White
Write-Host "3. Paste and click 'Run'" -ForegroundColor White
Write-Host "4. Wait ~30 seconds for completion" -ForegroundColor White
Write-Host ""
Write-Host "Press any key after you've completed the database migration..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 3: Sync Capacitor (if needed)
Write-Host "📱 Step 3: Sync native apps (optional)" -ForegroundColor Yellow
$syncCapacitor = Read-Host "Do you want to sync Capacitor for native apps? (y/n)"

if ($syncCapacitor -eq 'y') {
    Write-Host "Syncing Capacitor..." -ForegroundColor White
    npx cap sync
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Capacitor synced successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Capacitor sync had warnings (check output above)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipping Capacitor sync" -ForegroundColor Gray
}

Write-Host ""

# Step 4: Summary
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Deploy the dist/ folder to your hosting" -ForegroundColor White
Write-Host "2. Test on real iOS and Android devices" -ForegroundColor White
Write-Host "3. Monitor performance in Supabase dashboard" -ForegroundColor White
Write-Host ""
Write-Host "📄 See PERFORMANCE_FIXES_SUMMARY.md for details" -ForegroundColor Cyan
Write-Host ""
