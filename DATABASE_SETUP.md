# Supabase Database Schema Setup Guide

## 🚀 Quick Start - Create Your Free Supabase Project

1. **Go to Supabase**: https://supabase.com
2. **Sign up** for a free account
3. **Create a new project**:
   - Choose a project name (e.g., "vpena-onpoint")
   - Set a strong database password
   - Select a region close to Ghana (e.g., "Frankfurt" or "Singapore")
4. **Get your credentials**:
   - Go to Settings > API
   - Copy your `Project URL` → Add to `.env` as `SUPABASE_URL`
   - Copy your `anon/public` key → Add to `.env` as `SUPABASE_ANON_KEY`

---

## 📋 Database Tables to Create

### 1. **companies** table
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  tin TEXT, -- Tax Identification Number
  registration_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
```

### 2. **users** (employees) table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Employee', -- 'SuperAdmin', 'Admin', 'Manager', 'HR', 'Employee'
  basic_salary DECIMAL(10, 2) DEFAULT 0,
  mobile_money_number TEXT, -- Ghana phone format: 0XXXXXXXXX
  date_of_birth DATE,
  hire_date DATE DEFAULT CURRENT_DATE,
  department TEXT,
  position TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### 3. **payroll_history** table
```sql
CREATE TABLE payroll_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT UNIQUE NOT NULL, -- MTN MoMo reference ID
  external_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT DEFAULT 'Monthly Salary',
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_payroll_user_id ON payroll_history(user_id);
CREATE INDEX idx_payroll_status ON payroll_history(status);
CREATE INDEX idx_payroll_created_at ON payroll_history(created_at);
CREATE INDEX idx_payroll_transaction_id ON payroll_history(transaction_id);

-- Enable Row Level Security
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;
```

### 4. **leave_requests** table
```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL, -- 'annual', 'sick', 'casual', 'maternity', 'paternity'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_leave_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
```

### 5. **time_logs** table (for clock in/out)
```sql
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  total_hours DECIMAL(4, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX idx_time_logs_clock_in ON time_logs(clock_in);

-- Enable Row Level Security
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
```

### 6. **announcements** table
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general', -- 'general', 'urgent', 'policy', 'event'
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_announcements_company_id ON announcements(company_id);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);

-- Enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
```

---

## 🔐 Row Level Security (RLS) Policies

### Basic Policy Examples (Run after creating tables)

```sql
-- Allow users to read their own data
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (auth.uid()::text = id::text);

-- Allow admins to view all users
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role IN ('SuperAdmin', 'Admin', 'HR')
  )
);

-- Allow users to view their own payroll history
CREATE POLICY "Users can view own payroll"
ON payroll_history FOR SELECT
USING (user_id::text IN (
  SELECT id::text FROM users WHERE id::text = auth.uid()::text
));
```

---

## 🎯 Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the SQL code for each table (starting with `companies`, then `users`, etc.)
5. Click **Run** to execute
6. Repeat for all tables
7. Then run the RLS policies

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

---

## 📊 Sample Data (Optional - For Testing)

```sql
-- Insert a sample company
INSERT INTO companies (name, industry, email, phone)
VALUES ('Vertex Technologies', 'IT Services', 'info@vertex.com', '0302123456');

-- Get the company ID (replace with actual UUID after running above)
-- Then insert sample users...
```

---

## 🔑 Authentication Setup

Supabase provides built-in authentication. Enable it in your dashboard:

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider
3. (Optional) Enable **Google**, **GitHub** for social login
4. Set up email templates under **Email Templates**

---

## ✅ Verify Setup

After creating all tables, run this query to verify:

```sql
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see all 6 tables listed!

---

## 🌟 Production Tips for Ghana

1. **Data Backup**: Enable automatic backups in Supabase settings
2. **Performance**: Add indexes on frequently queried columns
3. **Security**: Always use RLS policies in production
4. **Monitoring**: Set up Supabase logging and alerts
5. **Compliance**: Ensure GDPR/data protection compliance

---

## 📞 Support

- Supabase Docs: https://supabase.com/docs
- Community: https://github.com/supabase/supabase/discussions
- Ghana Tech Community: Join local developer groups for support

---

## 🎉 Next Steps

After setting up the database:

1. Add your `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`
2. Restart your server: `node server.js`
3. You should see "✅ Database: Connected (Supabase)"
4. Test the API endpoints at `http://localhost:3001/api/health`
5. Start building your frontend to connect to these APIs!

Good luck with your payroll system! 🚀
