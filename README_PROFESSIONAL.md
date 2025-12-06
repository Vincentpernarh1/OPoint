# 🚀 Vpena OnPoint - Professional Payroll Management System

**A comprehensive, cloud-based payroll solution designed specifically for Ghanaian businesses**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb)](https://reactjs.org)

---

## 🌟 Why Vpena OnPoint?

Vpena OnPoint is built to solve the unique challenges Ghanaian businesses face with payroll management:

✅ **Mobile Money Integration** - Direct salary payments via MTN Mobile Money  
✅ **Cloud-Based** - Access from anywhere, no expensive hardware needed  
✅ **Affordable** - Free tier available, perfect for startups and SMEs  
✅ **Ghana-Compliant** - Built with Ghanaian tax and labor laws in mind  
✅ **Multi-Company** - Manage multiple businesses from one dashboard  
✅ **Real-Time** - Instant payment processing and status updates  

---

## 🎯 Key Features

### 💰 Payroll Management
- **Bulk salary processing** with one click
- **Mobile Money integration** (MTN, Vodafone, AirtelTigo)
- **Payroll history** and detailed transaction logs
- **Automatic tax calculations** (PAYE, SSNIT, etc.)
- **Payslip generation** in PDF format

### 👥 Employee Management
- **Complete employee records** with photos
- **Department & position** tracking
- **Attendance monitoring** with clock in/out
- **Leave management** with approval workflows
- **Performance tracking**

### 📊 Smart Dashboard
- **Real-time analytics** and insights
- **Payment status** tracking
- **Company overview** with key metrics
- **Role-based access** (SuperAdmin, Admin, Manager, HR, Employee)

### 🔐 Security & Authentication
- **Supabase authentication** with email/password
- **Row-level security** for data protection
- **Role-based permissions**
- **Audit logs** for all actions

### 📱 Mobile-Friendly
- **Responsive design** - works on any device
- **PWA support** - install as a mobile app
- **Ghana phone number** validation

---

## 🏗️ Technology Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Beautiful, responsive design

### Backend
- **Node.js** - Server runtime
- **Express** - Web framework
- **Supabase** - PostgreSQL database & authentication
- **MTN MoMo API** - Payment processing

### Infrastructure
- **Supabase Cloud** - Database hosting (free tier available)
- **Vercel/Netlify** - Frontend hosting (optional)
- **Railway/Render** - Backend hosting (optional)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- Supabase account (free at https://supabase.com)
- MTN MoMo Developer account (optional, for live payments)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   - Edit `.env` and add your credentials:
     - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (from Supabase dashboard)
     - `MOMO_API_KEY` (optional for testing - will use simulation mode)

3. **Setup Supabase database**
   - Follow the guide in `DATABASE_SETUP.md`
   - Create all required tables
   - Enable Row Level Security

4. **Start the development servers**
   
   Terminal 1 (Backend):
   ```bash
   node server.js
   ```
   
   Terminal 2 (Frontend):
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

---

## 📖 Documentation

- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference with all endpoints
- **[Database Setup Guide](DATABASE_SETUP.md)** - Step-by-step Supabase setup instructions

---

## 💼 Perfect For

- **Small & Medium Enterprises (SMEs)** in Ghana
- **Startups** looking for affordable payroll solutions
- **HR Departments** managing multiple employees
- **Accounting Firms** managing client payrolls
- **Remote Teams** needing cloud-based access
- **Multi-location Businesses**

---

## 🌍 Ghana-Specific Features

### Mobile Money Support
- **MTN Mobile Money** ✅ (Integrated)
- **Vodafone Cash** 🔜 (Coming soon)
- **AirtelTigo Money** 🔜 (Coming soon)

### Tax Compliance
- **PAYE** (Pay As You Earn) calculations
- **SSNIT** (Social Security) contributions
- **Tier 2 & 3** pension deductions
- **GRA compliance** ready

### Phone Number Validation
- Validates Ghana phone formats: `0XXXXXXXXX`
- Supports all major networks (MTN, Vodafone, AirtelTigo)

---

## 🔧 Environment Variables

```env
# Supabase Database (Get from https://supabase.com/dashboard)
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key

# MTN Mobile Money (Get from https://momodeveloper.mtn.com)
MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com/disbursement
MOMO_USER_ID=your-user-id
MOMO_API_KEY=your-api-key
MOMO_SUBSCRIPTION_KEY=your-subscription-key
MOMO_TARGET_ENV=sandbox

# Application Settings
PORT=3001
NODE_ENV=development
APPROVAL_PASSWORD=your-secure-password
```

---

## 🧪 Testing

### Simulation Mode
If MTN MoMo credentials are not provided, the system automatically runs in **simulation mode**:
- Payments are simulated with 90% success rate
- Perfect for testing without real API credentials
- All features work normally

### Mock Data
If database is not configured, system uses mock employee data automatically.

---

## 🏆 Why This App Will Win Bids in Ghana

### 1. **Built for Ghana**
   - Mobile Money integration (primary payment method in Ghana)
   - Ghana phone number validation
   - Local tax compliance (PAYE, SSNIT)
   - Designed for Ghanaian business workflows

### 2. **Professional & Polished**
   - Modern, clean UI that impresses clients
   - Enterprise-grade error handling
   - Comprehensive validation
   - Professional API documentation

### 3. **Cost-Effective**
   - Free Supabase tier for small businesses
   - No expensive infrastructure needed
   - Pay-as-you-grow pricing
   - Lower cost than competitors

### 4. **Scalable & Reliable**
   - Cloud-based architecture
   - Handles multiple companies
   - Real-time updates
   - Automatic fallback systems

### 5. **Easy to Deploy**
   - Can be hosted on free tiers initially
   - Clear documentation
   - Quick setup process
   - Ready for production

---

## 📊 API Features

### Complete REST API with:
- ✅ User authentication (login, register, logout)
- ✅ Employee CRUD operations
- ✅ Payroll processing and history
- ✅ Leave request management
- ✅ Company management
- ✅ Real-time payment status
- ✅ Mobile Money callbacks
- ✅ Health monitoring

### Professional Error Handling:
- Detailed validation messages
- Ghana-specific validations (phone numbers, amounts)
- Graceful fallbacks
- Comprehensive logging

---

## 🚀 Deployment Ready

The application is production-ready with:
- Environment-based configuration
- Security best practices
- CORS configuration
- Request logging
- Error tracking
- Database connection pooling
- Automatic retry logic

---

## 📞 Getting Started for Businesses

### Demo Setup (5 minutes)
1. Visit https://supabase.com and create free account
2. Create a new project
3. Run the SQL scripts from `DATABASE_SETUP.md`
4. Add credentials to `.env`
5. Start servers and demo to clients!

### Production Setup
- Follow deployment guide
- Add custom domain
- Enable SSL/HTTPS
- Configure production MoMo credentials
- Setup monitoring

---

## 🎯 Competitive Advantages

1. **Modern Tech Stack** - React 19, Node.js 18+, TypeScript
2. **Mobile-First** - Works perfectly on phones and tablets
3. **Offline-Ready** - Can work with intermittent internet
4. **Fast Performance** - Vite build, optimized queries
5. **Secure** - Supabase RLS, encrypted connections
6. **Well-Documented** - Easy for other developers to maintain

---

## 💡 Perfect Pitch for Clients

> "Vpena OnPoint is a modern, cloud-based payroll system designed specifically for Ghanaian businesses. It integrates directly with Mobile Money for instant salary payments, handles all Ghana tax calculations automatically, and can be accessed from anywhere. No expensive hardware needed - just a web browser. Perfect for growing businesses that want professional payroll management without the enterprise price tag."

---

## 📝 Next Steps

1. **Setup Supabase** - Follow `DATABASE_SETUP.md`
2. **Add Your Logo** - Customize branding
3. **Test Thoroughly** - Use simulation mode
4. **Deploy** - Choose hosting platform
5. **Win Contracts!** 🎉

---

## 🙏 Support

For questions or support:
- Read the documentation files
- Check the API reference
- Review code comments

---

## 📄 License

MIT License - feel free to use for commercial projects

---

**Built with ❤️ for Ghanaian Businesses**

*Vpena OnPoint - Simplifying payroll management across Africa*

**⭐ Professional. Affordable. Made for Ghana. ⭐**
