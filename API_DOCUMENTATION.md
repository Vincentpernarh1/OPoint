# Vpena OnPoint - API Documentation

## 🌐 Base URL
```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

---

## 🔐 Authentication

### Login
**POST** `/auth/login`

```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "user": { ... },
  "session": { ... }
}
```

### Register
**POST** `/auth/register`

```json
Request:
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "Employee"
}

Response:
{
  "success": true,
  "user": { ... }
}
```

### Logout
**POST** `/auth/logout`

---

## 👥 User Management

### Get All Users
**GET** `/users`

```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Alice Johnson",
      "email": "alice@vertex.com",
      "role": "Employee",
      "basic_salary": 8000,
      "mobile_money_number": "0240123456",
      ...
    }
  ]
}
```

### Get User by ID
**GET** `/users/:id`

### Create User
**POST** `/users`

```json
Request:
{
  "name": "New Employee",
  "email": "employee@company.com",
  "role": "Employee",
  "basic_salary": 5000,
  "mobile_money_number": "0241234567",
  "company_id": "company-uuid",
  "department": "IT",
  "position": "Developer"
}
```

### Update User
**PUT** `/users/:id`

### Delete User
**DELETE** `/users/:id`

---

## 💰 Payroll Management

### Get Payable Employees
**GET** `/payroll/payable-employees`

Returns all employees with their payment status for current month.

```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Alice Johnson",
      "email": "alice@vertex.com",
      "mobileMoneyNumber": "0240123456",
      "basicSalary": 8000,
      "netPay": 7200,
      "isPaid": false,
      "paidAmount": 0,
      "paidDate": null
    }
  ]
}
```

### Process Payroll
**POST** `/payroll/pay`

Process batch payments to employees via Mobile Money.

```json
Request:
{
  "password": "approve123",
  "payments": [
    {
      "userId": "uuid",
      "amount": 7200,
      "reason": "November 2024 Salary"
    }
  ]
}

Response:
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "amount": 7200,
      "status": "success",
      "referenceId": "transaction-id",
      "message": "Payment queued successfully"
    }
  ],
  "summary": {
    "total": 5,
    "successful": 4,
    "failed": 1
  }
}
```

### Get Payroll History
**GET** `/payroll/history?userId=uuid&month=11&year=2024`

Query Parameters:
- `userId` (optional): Filter by specific user
- `month` (optional): Filter by month (1-12)
- `year` (optional): Filter by year

---

## 🏖️ Leave Management

### Get Leave Requests
**GET** `/leave/requests?status=pending&userId=uuid`

Query Parameters:
- `status` (optional): pending, approved, rejected
- `userId` (optional): Filter by specific user

### Create Leave Request
**POST** `/leave/requests`

```json
Request:
{
  "user_id": "uuid",
  "leave_type": "annual",
  "start_date": "2024-12-15",
  "end_date": "2024-12-20",
  "reason": "Family vacation",
  "days_count": 5
}
```

### Update Leave Request (Approve/Reject)
**PUT** `/leave/requests/:id`

```json
Request:
{
  "status": "approved",
  "approved_by": "manager-uuid",
  "approved_at": "2024-12-06T10:30:00Z"
}
```

---

## 🏢 Company Management

### Get All Companies
**GET** `/companies`

### Create Company
**POST** `/companies`

```json
Request:
{
  "name": "Vertex Technologies Ghana Ltd",
  "industry": "IT Services",
  "email": "info@vertex.com",
  "phone": "0302123456",
  "address": "123 Independence Ave, Accra",
  "tin": "C0012345678",
  "registration_number": "CS123456789"
}
```

---

## 📊 System Endpoints

### Health Check
**GET** `/health`

```json
Response:
{
  "status": "healthy",
  "database": "connected",
  "momo": "live",
  "timestamp": "2024-12-06T10:00:00Z"
}
```

### Root
**GET** `/`

```json
Response:
{
  "status": "running",
  "message": "Vpena OnPoint Backend API",
  "version": "1.0.0",
  "timestamp": "2024-12-06T10:00:00Z"
}
```

---

## 📱 MTN Mobile Money Callback

### Callback Endpoint
**POST** `/momo/callback`

This endpoint receives payment status updates from MTN MoMo.

```json
Request (from MTN):
{
  "referenceId": "transaction-id",
  "status": "SUCCESS"
}
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (wrong password/credentials)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔒 Ghana-Specific Features

### Phone Number Validation
All Ghana phone numbers must follow the format:
- **Format**: `0XXXXXXXXX` (10 digits starting with 0)
- **Valid Prefixes**: 02X, 03X, 05X (MTN, Vodafone, AirtelTigo)
- **Example**: `0240123456`

### Supported Mobile Money Providers
- MTN Mobile Money (most common in Ghana)
- Vodafone Cash (coming soon)
- AirtelTigo Money (coming soon)

---

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials
   - Add your MTN MoMo API keys

3. **Start Server**
   ```bash
   node server.js
   ```

4. **Test API**
   ```bash
   curl http://localhost:3001/api/health
   ```

---

## 📝 Best Practices

1. **Always validate input** - Server validates all Ghana phone numbers and emails
2. **Use HTTPS in production** - Never send passwords over HTTP
3. **Rate limiting** - Implement rate limiting for production
4. **Logging** - All API calls are logged with timestamps
5. **Error handling** - Graceful fallback to mock data if database unavailable

---

## 🎯 Production Checklist

- [ ] Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to production `.env`
- [ ] Add MTN MoMo production credentials
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Setup monitoring and logging
- [ ] Configure CORS for production domain
- [ ] Enable rate limiting
- [ ] Setup automated backups
- [ ] Add API key authentication
- [ ] Setup error tracking (e.g., Sentry)

---

## 🆘 Support

For technical support or questions:
- Email: support@vpena-onpoint.com
- GitHub: [Your Repository]
- Phone: +233 XX XXX XXXX

---

**Built with ❤️ for Ghanaian Businesses**

*Simplifying payroll management across Africa*
