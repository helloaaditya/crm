import { asyncHandler } from '../middleware/errorHandler.js'
import User from '../models/User.js'
import Employee from '../models/Employee.js'
import Customer from '../models/Customer.js'

// Helpers
const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

export const employeeBulkSample = asyncHandler(async (req, res) => {
  const csv = [
    'name,email,phone,role,module,basicSalary,dateOfBirth,canView,canCreate,canEdit,canDelete,canHandleAccounts',
    'John Doe,john@example.com,9876543210,engineer,all,25000,1990-05-20,true,true,true,false,false',
    'Rahul Kumar,rahul@gmail.com,9876543211,worker,inventory,20000,1992-08-15,true,false,false,false,false',
    'Priya Sharma,priya@example.com,9876543212,supervisor,all,30000,1988-03-10,true,true,true,true,false',
    'Raj Singh,raj@example.com,9876543213,technician,crm,22000,1995-11-25,true,true,false,false,false'
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="employees-sample.csv"')
  res.send(csv)
})

export const employeeBulkUpload = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'CSV file is required' })
  }
  // Enforce CSV for now (avoid parsing binary excel)
  const isCsv = /csv/i.test(req.file.mimetype) || /\.csv$/i.test(req.file.originalname)
  if (!isCsv) {
    return res.status(400).json({ message: 'Please upload a CSV file (not Excel). Save as CSV and retry.' })
  }
  const text = req.file.buffer.toString('utf-8')
  const { rows } = parseCsv(text)
  let created = 0, updated = 0, errors = 0
  const errorDetails = []
  
  // Get current employee count to start generating IDs
  const currentEmployeeCount = await Employee.countDocuments()
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const email = row.email?.toLowerCase()
      if (!row.name || !row.phone || !email) { 
        errors++
        errorDetails.push(`Row ${i + 2}: Missing required fields (name, phone, or email)`)
        continue 
      }
      
      let user = await User.findOne({ email })
      if (!user) {
        // Parse permissions from CSV
        const permissions = {
          canView: row.canView === 'true' || row.canView === '1' || row.canView === '' || !row.hasOwnProperty('canView'),
          canCreate: row.canCreate === 'true' || row.canCreate === '1',
          canEdit: row.canEdit === 'true' || row.canEdit === '1',
          canDelete: row.canDelete === 'true' || row.canDelete === '1',
          canHandleAccounts: row.canHandleAccounts === 'true' || row.canHandleAccounts === '1'
        }
        
        user = await User.create({
          name: row.name,
          email,
          phone: row.phone,
          password: 'password123',
          role: row.role || 'employee',
          module: row.module || 'all',
          permissions: permissions,
          createdBy: req.user?._id
        })
        created++
      } else {
        user.name = row.name
        user.phone = row.phone
        user.role = row.role || user.role
        user.module = row.module || user.module
        
        // Update permissions if provided
        if (row.hasOwnProperty('canView')) {
          user.permissions.canView = row.canView === 'true' || row.canView === '1'
        }
        if (row.hasOwnProperty('canCreate')) {
          user.permissions.canCreate = row.canCreate === 'true' || row.canCreate === '1'
        }
        if (row.hasOwnProperty('canEdit')) {
          user.permissions.canEdit = row.canEdit === 'true' || row.canEdit === '1'
        }
        if (row.hasOwnProperty('canDelete')) {
          user.permissions.canDelete = row.canDelete === 'true' || row.canDelete === '1'
        }
        if (row.hasOwnProperty('canHandleAccounts')) {
          user.permissions.canHandleAccounts = row.canHandleAccounts === 'true' || row.canHandleAccounts === '1'
        }
        
        await user.save()
        updated++
      }
      
      // Ensure employee record exists
      let employee = await Employee.findOne({ userId: user._id })
      if (!employee) {
        // Map role/designation to allowed enums
        const allowedRoles = ['supervisor', 'engineer', 'worker', 'technician', 'helper', 'driver', 'manager', 'admin']
        const roleValue = allowedRoles.includes((row.role || '').toLowerCase()) ? (row.role || '').toLowerCase() : 'worker'
        const designationValue = allowedRoles.includes((row.role || '').toLowerCase()) ? (row.role || '').toLowerCase() : 'other'
        
        // Generate unique employee ID
        const employeeCount = await Employee.countDocuments()
        const employeeId = `EMP${String(employeeCount + 1).padStart(4, '0')}`
        
        employee = await Employee.create({
          employeeId,
          userId: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: roleValue,
          designation: designationValue,
          basicSalary: Number(row.basicSalary) || 0,
          joiningDate: new Date(),
          employmentType: 'full_time',
          createdBy: req.user?._id || user._id
        })
      } else {
        // Update existing employee
        if (row.basicSalary) employee.basicSalary = Number(row.basicSalary)
        if (row.dateOfBirth) employee.dateOfBirth = new Date(row.dateOfBirth)
        await employee.save()
      }
    } catch (e) {
      errors++
      errorDetails.push(`Row ${i + 2}: ${e.message}`)
    }
  }
  
  const message = `Employees import completed. Created: ${created}, Updated: ${updated}, Errors: ${errors}`
  const response = { success: true, message }
  if (errorDetails.length > 0 && errorDetails.length <= 10) {
    response.errorDetails = errorDetails
  }
  res.json(response)
})

export const customerBulkSample = asyncHandler(async (req, res) => {
  const csv = [
    'name,phone,email,address',
    'Acme Corp,9988776655,info@acme.com,MG Road, Bangalore'
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="customers-sample.csv"')
  res.send(csv)
})

export const customerBulkUpload = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'CSV file is required' })
  }
  const isCsv = /csv/i.test(req.file.mimetype) || /\.csv$/i.test(req.file.originalname)
  if (!isCsv) {
    return res.status(400).json({ message: 'Please upload a CSV file (not Excel). Save as CSV and retry.' })
  }
  const text = req.file.buffer.toString('utf-8')
  const { rows } = parseCsv(text)
  let created = 0, updated = 0, errors = 0
  for (const row of rows) {
    try {
      const email = row.email?.toLowerCase()
      if (!row.name) { errors++; continue }
      const query = email ? { $or: [{ email }, { name: row.name }] } : { name: row.name }
      let customer = await Customer.findOne(query)
      if (!customer) {
        customer = await Customer.create({
          name: row.name,
          email: email || undefined,
          phone: row.phone || '',
          address: row.address || ''
        })
        created++
      } else {
        customer.name = row.name
        customer.phone = row.phone || customer.phone
        customer.email = email || customer.email
        customer.address = row.address || customer.address
        await customer.save()
        updated++
      }
    } catch (e) {
      errors++
    }
  }
  res.json({ success: true, message: `Customers import completed. Created: ${created}, Updated: ${updated}, Errors: ${errors}` })
})



