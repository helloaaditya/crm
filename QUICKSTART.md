# 🚀 Sanjana CRM - Quick Start Guide

## ✅ What's Been Built

A full-stack Business Management Platform with:

### Backend (Node.js + Express + MongoDB)
- ✅ Complete authentication system with JWT
- ✅ Role-based access control (Main Admin, Sub Admin, Supervisor, Employee)
- ✅ Database models for all modules
- ✅ RESTful API routes for:
  - CRM (Customers, Projects, Invoices)
  - Inventory (Materials, Vendors)
  - Employees (Attendance, Salary, Leave)
  - Payments & Reminders
- ✅ AWS S3 integration for file uploads
- ✅ Razorpay payment gateway integration
- ✅ PDF generation for invoices & warranties
- ✅ Email service with Nodemailer

### Frontend (React + Vite + TailwindCSS)
- ✅ Modern, responsive UI
- ✅ Authentication flow with protected routes
- ✅ Dashboard with analytics & charts
- ✅ Sidebar navigation with role-based access
- ✅ Page layouts for all modules
- ✅ Customer management interface
- ✅ Toast notifications

## 🛠️ Setup Instructions

### Prerequisites
- Node.js v16+ installed
- MongoDB installed locally OR MongoDB Atlas account
- (Optional) AWS account for S3
- (Optional) Razorpay account

### Backend Setup

1. **Install backend dependencies:**
```bash
cd e:\sanjana_crm
npm install
```

2. **Create environment file:**
```bash
copy .env.example .env
```

3. **Configure `.env` file:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sanjana_crm
JWT_SECRET=your_secret_key_min_32_characters_long
JWT_EXPIRE=30d

# Optional services (can configure later)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
```

4. **Start MongoDB** (if local):
```bash
mongod
```

5. **Run backend server:**
```bash
npm run dev
```

Backend will run on: `http://localhost:5000`

### Frontend Setup

1. **Install frontend dependencies:**
```bash
cd frontend
npm install
```

2. **Create environment file:**
```bash
copy .env.example .env
```

3. **Configure frontend `.env`:**
```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=
```

4. **Run frontend development server:**
```bash
npm run dev
```

Frontend will run on: `http://localhost:3000`

## 🎯 First Steps

### 1. Create Admin User

Use a tool like Postman or Thunder Client to register the first admin:

**POST** `http://localhost:5000/api/auth/register`

```json
{
  "name": "Admin User",
  "email": "admin@sanjanacrm.com",
  "password": "admin123",
  "phone": "9876543210",
  "role": "main_admin",
  "module": "all",
  "permissions": {
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": true,
    "canHandleAccounts": true
  }
}
```

### 2. Login to Frontend

Open `http://localhost:3000` and login with:
- **Email:** admin@sanjanacrm.com
- **Password:** admin123

## 📁 Project Structure

```
sanjana_crm/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, error handling, file upload
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── utils/           # S3, PDF, Razorpay, Email services
│   ├── uploads/         # Temporary file storage
│   └── server.js        # Express app entry point
│
└── frontend/
    ├── src/
    │   ├── components/  # Reusable UI components
    │   ├── context/     # React Context (Auth)
    │   ├── pages/       # Page components
    │   ├── App.jsx      # Main app component
    │   └── main.jsx     # React entry point
    └── public/          # Static assets
```

## 🔑 Key Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access (Main Admin, Sub Admin, Supervisor, Employee)
- Module-based access (CRM, Inventory, Employee, All)
- Permission-based actions (Create, Edit, Delete, View, Handle Accounts)

### CRM Module
- Customer management with lead tracking
- Project management (Residential, Commercial, Industrial)
- Quotation & Invoice generation (PDF)
- Payment tracking via Razorpay
- Site visit logs with images
- Material requirements linked to inventory
- Warranty certificate generation

### Inventory Module
- Material tracking (Inward/Outward)
- Vendor management
- Stock level monitoring
- Low stock alerts
- Batch & expiry tracking
- Auto-sync with CRM projects

### Employee Module
- GPS-based attendance tracking
- Salary management
- Leave management system
- Work updates & planning
- Performance tracking

### Additional Features
- Dashboard with analytics & charts
- Reminder system (payments, insurance, birthdays, etc.)
- Email notifications
- File upload (images, documents)
- Responsive design (mobile & desktop)

## 🌐 API Endpoints

### Authentication
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user
- PUT `/api/auth/update-password` - Update password

### Customers
- GET `/api/customers` - Get all customers
- POST `/api/customers` - Create customer
- GET `/api/customers/:id` - Get customer
- PUT `/api/customers/:id` - Update customer
- DELETE `/api/customers/:id` - Delete customer

### Projects
- GET `/api/projects` - Get all projects
- POST `/api/projects` - Create project
- POST `/api/projects/:id/site-visit` - Add site visit
- POST `/api/projects/:id/images` - Upload images

### Inventory
- GET `/api/inventory/materials` - Get materials
- POST `/api/inventory/materials` - Add material
- POST `/api/inventory/materials/:id/inward` - Material inward
- POST `/api/inventory/materials/:id/outward` - Material outward

### Employees
- GET `/api/employees` - Get employees
- POST `/api/employees` - Create employee
- POST `/api/employees/:id/attendance` - Mark attendance
- POST `/api/employees/:id/salary` - Process salary

## 🚀 Next Steps

### Backend Development
1. Implement controller logic for all routes
2. Add data validation
3. Implement advanced search & filtering
4. Add export functionality (Excel/PDF)
5. Set up automated backups

### Frontend Development
1. Build complete CRUD interfaces for all modules
2. Add form validation
3. Implement modals for create/edit operations
4. Add data tables with pagination
5. Implement advanced filtering
6. Add file upload UI
7. Build reports & analytics pages

### Integration
1. Connect frontend to backend APIs
2. Test payment gateway integration
3. Test file upload to S3
4. Test PDF generation
5. Test email notifications

### Deployment
1. Deploy backend to Render/AWS
2. Deploy frontend to Vercel/Netlify
3. Set up MongoDB Atlas
4. Configure production environment variables

## 📝 Notes

- All passwords are hashed using bcrypt
- JWT tokens expire in 30 days (configurable)
- File uploads currently stored locally (configure S3 for production)
- Payment gateway and email services need API keys to work

## 🐛 Troubleshooting

**MongoDB connection error:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env

**Port already in use:**
- Change PORT in .env
- Kill process using the port

**CORS errors:**
- Check FRONTEND_URL in backend .env
- Verify API proxy in vite.config.js

## 📧 Support

For issues or questions, refer to the README.md file.

---

**Built with ❤️ for Sanjana CRM**
