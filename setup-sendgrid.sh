#!/usr/bin/env bash
# =====================================================
# PRODUCTION EMAIL FIX - SendGrid Setup
# Run this to fix email issues in production
# =====================================================

echo "🚀 PRODUCTION EMAIL FIX - SendGrid Setup"
echo "========================================="
echo ""
echo "Your production server is blocking Gmail SMTP (port 587)."
echo "This is VERY common with hosting providers (Render, Railway, Heroku, etc.)"
echo ""
echo "✅ SOLUTION: Use SendGrid (FREE tier: 100 emails/day)"
echo ""

# Step 1: Sign up for SendGrid
echo "📝 STEP 1: Create SendGrid Account"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Go to: https://signup.sendgrid.com/"
echo "2. Sign up (free account)"
echo "3. Verify your email"
echo ""
read -p "Press Enter when you've created your SendGrid account..."
echo ""

# Step 2: Create API Key
echo "🔑 STEP 2: Create API Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Login to SendGrid Dashboard"
echo "2. Go to: Settings → API Keys"
echo "3. Click 'Create API Key'"
echo "4. Name: 'VPENA OnPoint Production'"
echo "5. Select: 'Full Access' or 'Mail Send' permission"
echo "6. Click 'Create & View'"
echo "7. COPY the API key (starts with 'SG.')"
echo ""
read -p "Paste your SendGrid API Key here: " SENDGRID_API_KEY
echo ""

if [ -z "$SENDGRID_API_KEY" ]; then
    echo "❌ No API key provided. Exiting..."
    exit 1
fi

# Step 3: Verify Sender Email
echo "📧 STEP 3: Verify Sender Email"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. In SendGrid Dashboard, go to: Settings → Sender Authentication"
echo "2. Click 'Verify a Single Sender'"
echo "3. Enter: vpenatechwizard@gmail.com"
echo "4. Fill in the form and submit"
echo "5. Check your Gmail for verification link"
echo "6. Click the link to verify"
echo ""
read -p "Press Enter when you've verified the sender email..."
echo ""

# Step 4: Update Environment Variables
echo "🔧 STEP 4: Update Production Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Add these environment variables to your production server:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "EMAIL_HOST=smtp.sendgrid.net"
echo "EMAIL_PORT=587"
echo "EMAIL_USER=apikey"
echo "EMAIL_PASSWORD=$SENDGRID_API_KEY"
echo "EMAIL_FROM=vpenatechwizard@gmail.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 5: Platform-specific instructions
echo "📋 Platform-specific instructions:"
echo ""
echo "▶ Render.com:"
echo "  1. Go to your service dashboard"
echo "  2. Environment tab"
echo "  3. Add the variables above"
echo "  4. Click 'Save Changes' (auto-deploys)"
echo ""
echo "▶ Railway.app:"
echo "  1. Go to your project"
echo "  2. Variables tab"
echo "  3. Add RAW Editor mode"
echo "  4. Paste variables"
echo "  5. Deploy"
echo ""
echo "▶ Heroku:"
echo "  1. Settings → Config Vars"
echo "  2. Add each variable"
echo "  3. App will restart automatically"
echo ""
echo "▶ Vercel/Netlify:"
echo "  1. Project Settings → Environment Variables"
echo "  2. Add each variable"
echo "  3. Redeploy"
echo ""

# Step 6: Test
echo "🧪 STEP 6: Test Email in Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "After deploying with new environment variables:"
echo "1. Go to your production app"
echo "2. Try resetting a password"
echo "3. Check if email is received"
echo ""

echo "✅ SETUP COMPLETE!"
echo ""
echo "📊 SendGrid Free Tier Limits:"
echo "  • 100 emails per day (forever free)"
echo "  • Perfect for small-medium teams"
echo "  • Better deliverability than Gmail"
echo "  • Email analytics included"
echo ""
echo "📖 For more help, see: EMAIL_TROUBLESHOOTING.md"
echo ""
