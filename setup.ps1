# OPoint-P360 Quick Setup Script
# Run this after setting up your database

Write-Host "🚀 OPoint-P360 Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔐 Setting up test user password..." -ForegroundColor Yellow
Write-Host ""

# Check if server is running
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $serverRunning = $true
    }
} catch {
    $serverRunning = $false
}

if (-not $serverRunning) {
    Write-Host "⚠️  Server is not running on port 3001" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please start the server first:" -ForegroundColor Yellow
    Write-Host "  node server.js" -ForegroundColor Cyan
    Write-Host "  OR" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    Write-Host ""
    exit
}

# Initialize test user password
try {
    Write-Host "Initializing test user password..." -ForegroundColor Yellow
    
    $body = @{
        email = "vpernarh@gmail.com"
        password = "Vpernarh@20"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/initialize-password" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    if ($response.success) {
        Write-Host ""
        Write-Host "✅ Password initialized successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Cyan
        Write-Host "     LOGIN CREDENTIALS" -ForegroundColor Cyan
        Write-Host "=====================================" -ForegroundColor Cyan
        Write-Host "📧 Email   : vpernarh@gmail.com" -ForegroundColor White
        Write-Host "🔑 Password: Vpernarh@20" -ForegroundColor White
        Write-Host "=====================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🎉 You're all set! Start the frontend and login!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "❌ Failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Server is running on port 3001" -ForegroundColor White
    Write-Host "  2. Database is configured in .env" -ForegroundColor White
    Write-Host "  3. User exists in database" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
