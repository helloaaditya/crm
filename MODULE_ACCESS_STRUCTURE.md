# Module Access Control Structure

## Overview
This document outlines the module access control for all pages in the CRM system. Admins can control which users have access to which modules in the account settings.

---

## Module Access Configuration

### 1. **CRM Module** (`crm`)
Access to customer relationship management features.

**Routes with CRM Access:**
- `/api/customers` - Customer management
- `/api/projects` - Project management
- `/api/invoices` - Invoice management
- `/api/payments` - Payment tracking
- `/api/work-orders` - Work order management ✨ NEW

**Pages:**
- Customers
- Projects
- Invoices
- Payments
- Work Orders ✨ NEW

---

### 2. **Inventory Module** (`inventory`)
Access to inventory and vendor management.

**Routes with Inventory Access:**
- `/api/inventory` - Material inventory
- `/api/inventory/vendors` - Vendor management
- `/api/vendor-payments` - Vendor payments ✨ NEW

**Pages:**
- Materials
- Vendors
- Vendor Payments ✨ NEW

---

### 3. **Employee Module** (`employee`)
Access to employee management and HR features.

**Routes with Employee Access:**
- `/api/employees` - Employee management
- `/api/employees/attendance` - Attendance tracking
- `/api/employees/leaves` - Leave management
- `/api/employees/salary` - Salary processing
- `/api/employees/expenses` - Employee expenses
- `/api/company-documents` - Company documents (shared)

**Pages:**
- All Employees
- Attendance
- Leaves
- Salary Management
- Employee Management ✨ NEW (Grid/Hierarchy/List views)
- My Profile (employee self-service)
- My Attendance
- My Leaves
- My Salary
- My Expenses
- Company Documents ✨ NEW (shared)

---

### 4. **Expense Module** (`expense`)
Access to expense tracking and processing.

**Routes with Expense Access:**
- `/api/expenses` - Expense management
- `/api/company-documents` - Company documents (shared)

**Pages:**
- All Expenses
- Expense Approvals
- Company Documents ✨ NEW (shared)

---

### 5. **All Modules** (`all`)
Full access to all features.

**Routes with All Access:**
- All routes listed above
- `/api/dashboard` - Dashboard statistics
- `/api/settings` - System settings
- `/api/reminders` - Reminders
- `/api/notifications` - Notifications

**Pages:**
- Dashboard
- All pages from all modules
- Settings
- Reminders

---

## Module Assignment by Route

### New Routes Added ✨

#### Vendor Payments
```javascript
// routes/vendorPaymentRoutes.js
router.use(moduleAccess('inventory', 'all'));
```
- **Required Module:** `inventory` OR `all`
- **Page:** Vendor Payments

#### Work Orders
```javascript
// routes/workOrderRoutes.js
router.use(moduleAccess('crm', 'all'));
```
- **Required Module:** `crm` OR `all`
- **Page:** Work Orders

#### Company Documents
```javascript
// routes/companyDocumentRoutes.js
router.use(moduleAccess('crm', 'inventory', 'employee', 'expense', 'all'));
```
- **Required Modules:** `crm` OR `inventory` OR `employee` OR `expense` OR `all`
- **Page:** Company Documents (accessible to all modules)

#### Employee Management
```javascript
// Uses existing /api/employees route
router.use(moduleAccess('employee', 'all'));
```
- **Required Module:** `employee` OR `all`
- **Page:** Employee Management (new view mode for existing route)

---

## Complete Route Module Mapping

| Route | Modules | Description |
|-------|---------|-------------|
| `/api/auth` | None | Public authentication |
| `/api/dashboard` | `all` | Dashboard stats |
| `/api/customers` | `crm`, `all` | Customer management |
| `/api/projects` | `crm`, `inventory`, `all` | Project management |
| `/api/invoices` | `crm`, `all` | Invoice management |
| `/api/payments` | `crm`, `all` | Payment tracking |
| `/api/inventory` | `inventory`, `all` | Material inventory |
| `/api/inventory/vendors` | `inventory`, `all` | Vendor management |
| `/api/vendor-payments` ✨ | `inventory`, `all` | Vendor payments |
| `/api/work-orders` ✨ | `crm`, `all` | Work orders |
| `/api/employees` | `employee`, `all` | Employee management |
| `/api/expenses` | `expense`, `all` | Expense management |
| `/api/company-documents` ✨ | `crm`, `inventory`, `employee`, `expense`, `all` | Document repository |
| `/api/settings` | `all` | System settings |
| `/api/reminders` | `all` | Reminders |
| `/api/notifications` | `all` | Notifications |

---

## User Module Assignment

### In User Model (for reference)
```javascript
{
  moduleAccess: {
    type: [String],
    enum: ['crm', 'inventory', 'employee', 'expense', 'all'],
    default: []
  }
}
```

### Example User Configurations

**1. CRM Manager**
```json
{
  "name": "John Doe",
  "role": "manager",
  "moduleAccess": ["crm"]
}
```
**Can Access:**
- Customers, Projects, Invoices, Payments, Work Orders, Dashboard

**Cannot Access:**
- Inventory, Vendor Payments, Employee Management, Expenses

---

**2. Inventory Manager**
```json
{
  "name": "Jane Smith",
  "role": "manager",
  "moduleAccess": ["inventory"]
}
```
**Can Access:**
- Materials, Vendors, Vendor Payments, Company Documents, Dashboard

**Cannot Access:**
- CRM features, Employee Management, Expenses

---

**3. HR Manager**
```json
{
  "name": "Mike Wilson",
  "role": "manager",
  "moduleAccess": ["employee"]
}
```
**Can Access:**
- All employee features, Attendance, Leaves, Salary, Employee Management, Company Documents

**Cannot Access:**
- CRM, Inventory, Expenses (except employee expenses)

---

**4. Finance Manager**
```json
{
  "name": "Sarah Johnson",
  "role": "manager",
  "moduleAccess": ["expense"]
}
```
**Can Access:**
- Expenses, Expense Approvals, Company Documents

**Cannot Access:**
- CRM, Inventory, Employee Management

---

**5. Admin**
```json
{
  "name": "Admin User",
  "role": "main_admin",
  "moduleAccess": ["all"]
}
```
**Can Access:**
- Everything

---

**6. Multi-Module User**
```json
{
  "name": "Operations Manager",
  "role": "manager",
  "moduleAccess": ["crm", "inventory", "employee"]
}
```
**Can Access:**
- CRM features
- Inventory features
- Employee features
- Company Documents (shared across modules)

---

## Sidebar Menu Structure with Module Access

### Suggested Sidebar Configuration

```javascript
// Example sidebar structure
const sidebarMenus = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'DashboardIcon',
    requiresModule: null // Always visible when logged in
  },
  
  // CRM Section
  {
    title: 'CRM',
    requiresModule: 'crm',
    subMenus: [
      { title: 'Customers', path: '/customers' },
      { title: 'Projects', path: '/projects' },
      { title: 'Invoices', path: '/invoices' },
      { title: 'Payments', path: '/payments' },
      { title: 'Work Orders', path: '/work-orders' } // ✨ NEW
    ]
  },
  
  // Inventory Section
  {
    title: 'Inventory',
    requiresModule: 'inventory',
    subMenus: [
      { title: 'Materials', path: '/materials' },
      { title: 'Vendors', path: '/vendors' },
      { title: 'Vendor Payments', path: '/vendor-payments' } // ✨ NEW
    ]
  },
  
  // Employee Section
  {
    title: 'Employees',
    requiresModule: 'employee',
    subMenus: [
      { title: 'All Employees', path: '/employees' },
      { title: 'Employee Management', path: '/employee-management' }, // ✨ NEW
      { title: 'Attendance', path: '/attendance' },
      { title: 'Leaves', path: '/leaves' },
      { title: 'Salary', path: '/salary' }
    ]
  },
  
  // Expense Section
  {
    title: 'Expenses',
    requiresModule: 'expense',
    subMenus: [
      { title: 'All Expenses', path: '/expenses' },
      { title: 'Approvals', path: '/expense-approvals' }
    ]
  },
  
  // Documents Section (Shared)
  {
    title: 'Documents',
    path: '/company-documents', // ✨ NEW
    icon: 'DocumentIcon',
    requiresModule: ['crm', 'inventory', 'employee', 'expense'] // Any of these
  },
  
  // Settings Section
  {
    title: 'Settings',
    path: '/settings',
    icon: 'SettingsIcon',
    requiresModule: 'all' // Admin only
  }
];
```

---

## Settings Page Configuration

### Module Access Management UI

In your Settings page, add a section for managing user module access:

```jsx
// Example Settings Component
<div className="module-access-section">
  <h3>Module Access Control</h3>
  
  <div className="user-module-assignment">
    <label>Select Modules for {user.name}</label>
    
    <Checkbox 
      label="CRM Module" 
      value="crm"
      description="Access to Customers, Projects, Invoices, Payments, Work Orders"
    />
    
    <Checkbox 
      label="Inventory Module" 
      value="inventory"
      description="Access to Materials, Vendors, Vendor Payments"
    />
    
    <Checkbox 
      label="Employee Module" 
      value="employee"
      description="Access to Employee Management, Attendance, Leaves, Salary"
    />
    
    <Checkbox 
      label="Expense Module" 
      value="expense"
      description="Access to Expense Management and Approvals"
    />
    
    <Checkbox 
      label="All Modules" 
      value="all"
      description="Full access to all features (Admin)"
    />
  </div>
</div>
```

---

## Implementation Checklist

### Backend ✅
- [x] Module access middleware in place
- [x] All routes have proper `moduleAccess()` calls
- [x] User model has `moduleAccess` array field

### Frontend TODO
- [ ] Update sidebar to show/hide menus based on user's `moduleAccess`
- [ ] Add module access management in Settings page
- [ ] Add route guards to check module access before rendering pages
- [ ] Display "Access Denied" message for unauthorized pages
- [ ] Update user profile to show assigned modules

### Example Route Guard
```jsx
// ProtectedRoute.jsx
const ProtectedRoute = ({ children, requiredModule }) => {
  const { user } = useAuth();
  
  const hasAccess = () => {
    if (!requiredModule) return true; // No module required
    if (user.moduleAccess.includes('all')) return true; // Admin
    if (Array.isArray(requiredModule)) {
      return requiredModule.some(module => user.moduleAccess.includes(module));
    }
    return user.moduleAccess.includes(requiredModule);
  };
  
  if (!hasAccess()) {
    return <AccessDenied />;
  }
  
  return children;
};

// Usage
<Route 
  path="/vendor-payments" 
  element={
    <ProtectedRoute requiredModule="inventory">
      <VendorPayments />
    </ProtectedRoute>
  } 
/>
```

---

## Summary

✅ **All new routes now have module access control:**
- Vendor Payments → `inventory` or `all`
- Work Orders → `crm` or `all`
- Company Documents → `crm`, `inventory`, `employee`, `expense`, or `all`
- Employee Management → Uses existing `employee` or `all`

This allows you to control exactly which users can access which features through the account settings! 🎯

