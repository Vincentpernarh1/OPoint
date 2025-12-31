# =====================================================
# PRODUCTION EMAIL FIX - SendGrid Setup (PowerShell)
# Run this to fix email issues in production
# =====================================================

Write-Host "PRODUCTION EMAIL FIX - SendGrid Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your production server is blocking Gmail SMTP (port 587)." -ForegroundColor Yellow
Write-Host "This is VERY common with hosting providers (Render, Railway, Heroku, etc.)" -ForegroundColor Yellow
Write-Host ""
Write-Host "[OK] SOLUTION: Use SendGrid (FREE tier: 100 emails/day)" -ForegroundColor Green
Write-Host ""

# Step 1: Sign up for SendGrid
Write-Host "STEP 1: Create SendGrid Account" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Gray
Write-Host "1. Go to: https://signup.sendgrid.com/" -ForegroundColor White
Write-Host "2. Sign up (free account)" -ForegroundColor White
Write-Host "3. Verify your email" -ForegroundColor White
Write-Host ""
Start-Process "https://signup.sendgrid.com/"
Read-Host "Press Enter when you've created your SendGrid account"
Write-Host ""

# Step 2: Create API Key
Write-Host "STEP 2: Create API Key" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Gray
Write-Host "1. Login to SendGrid Dashboard" -ForegroundColor White
Write-Host "2. Go to: Settings -> API Keys" -ForegroundColor White
Write-Host "3. Click 'Create API Key'" -ForegroundColor White
Write-Host "4. Name: 'VPENA OnPoint Production'" -ForegroundColor White
Write-Host "5. Select: 'Full Access' or 'Mail Send' permission" -ForegroundColor White
Write-Host "6. Click 'Create & View'" -ForegroundColor White
Write-Host "7. COPY the API key (starts with 'SG.')" -ForegroundColor White
Write-Host ""
$SENDGRID_API_KEY = Read-Host "Paste your SendGrid API Key here"
Write-Host ""

if ([string]::IsNullOrWhiteSpace($SENDGRID_API_KEY)) {
    Write-Host "[ERROR] No API key provided. Exiting..." -ForegroundColor Red
    exit 1
}

# Step 3: Verify Sender Email
Write-Host "STEP 3: Verify Sender Email" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Gray
Write-Host "1. In SendGrid Dashboard, go to: Settings -> Sender Authentication" -ForegroundColor White
Write-Host "2. Click 'Verify a Single Sender'" -ForegroundColor White
Write-Host "3. Enter: vpenatechwizard@gmail.com" -ForegroundColor White
Write-Host "4. Fill in the form and submit" -ForegroundColor White
Write-Host "5. Check your Gmail for verification link" -ForegroundColor White
Write-Host "6. Click the link to verify" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter when you've verified the sender email"
Write-Host ""

# Step 4: Update Environment Variables
Write-Host "STEP 4: Update Production Environment Variables" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Gray
Write-Host ""
Write-Host "Add these environment variables to your production server:" -ForegroundColor Cyan
Write-Host ""
Write-Host "===========================================" -ForegroundColor Gray
Write-Host "EMAIL_HOST=smtp.sendgrid.net" -ForegroundColor Green
Write-Host "EMAIL_PORT=587" -ForegroundColor Green
Write-Host "EMAIL_USER=apikey" -ForegroundColor Green
Write-Host "EMAIL_PASSWORD=$SENDGRID_API_KEY" -ForegroundColor Green
Write-Host "EMAIL_FROM=vpenatechwizard@gmail.com" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Gray
Write-Host ""

# Copy to clipboard
$envVars = @"
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=$SENDGRID_API_KEY
EMAIL_FROM=vpenatechwizard@gmail.com
"@

$envVars | Set-Clipboard
Write-Host "[OK] Environment variables copied to clipboard!" -ForegroundColor Green
Write-Host ""

# Step 5: Platform-specific instructions
Write-Host "Platform-specific instructions:" -ForegroundColor Yellow
Write-Host ""
Write-Host ">> Render.com:" -ForegroundColor Cyan
Write-Host "  1. Go to your service dashboard" -ForegroundColor White
Write-Host "  2. Environment tab" -ForegroundColor White
Write-Host "  3. Add the variables above (or paste from clipboard)" -ForegroundColor White
Write-Host "  4. Click 'Save Changes' (auto-deploys)" -ForegroundColor White
Write-Host ""
Write-Host ">> Railway.app:" -ForegroundColor Cyan
Write-Host "  1. Go to your project" -ForegroundColor White
Write-Host "  2. Variables tab" -ForegroundColor White
Write-Host "  3. Add RAW Editor mode" -ForegroundColor White
Write-Host "  4. Paste variables (Ctrl+V)" -ForegroundColor White
Write-Host "  5. Deploy" -ForegroundColor White
Write-Host ""
Write-Host ">> Heroku:" -ForegroundColor Cyan
Write-Host "  1. Settings -> Config Vars" -ForegroundColor White
Write-Host "  2. Add each variable" -ForegroundColor White
Write-Host "  3. App will restart automatically" -ForegroundColor White
Write-Host ""
Write-Host ">> Vercel/Netlify:" -ForegroundColor Cyan
Write-Host "  1. Project Settings -> Environment Variables" -ForegroundColor White
Write-Host "  2. Add each variable" -ForegroundColor White
Write-Host "  3. Redeploy" -ForegroundColor White
Write-Host ""

# Step 6: Test
Write-Host "STEP 6: Test Email in Production" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Gray
Write-Host "After deploying with new environment variables:" -ForegroundColor White
Write-Host "1. Go to your production app" -ForegroundColor White
Write-Host "2. Try resetting a password" -ForegroundColor White
Write-Host "3. Check if email is received" -ForegroundColor White
Write-Host ""

Write-Host "[OK] SETUP COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "SendGrid Free Tier Limits:" -ForegroundColor Cyan
Write-Host "  - 100 emails per day (forever free)" -ForegroundColor White
Write-Host "  - Perfect for small-medium teams" -ForegroundColor White
Write-Host "  - Better deliverability than Gmail" -ForegroundColor White
Write-Host "  - Email analytics included" -ForegroundColor White
Write-Host ""
Write-Host "For more help, see: EMAIL_TROUBLESHOOTING.md" -ForegroundColor Cyan
Write-Host ""
