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
    'name,phone,email,role,module,basicSalary,dateOfBirth',
    'John Doe,9876543210,john@example.com,engineer,all,25000,1990-05-20'
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="employees-sample.csv"')
  res.send(csv)
})

export const employeeBulkUpload = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'CSV file is required' })
  }
  const text = req.file.buffer.toString('utf-8')
  const { rows } = parseCsv(text)
  let created = 0, updated = 0, errors = 0
  for (const row of rows) {
    try {
      const email = row.email?.toLowerCase()
      if (!row.name || !row.phone || !email) { errors++; continue }
      let user = await User.findOne({ email })
      if (!user) {
        user = await User.create({
          name: row.name,
          email,
          phone: row.phone,
          password: 'password123',
          role: row.role || 'employee',
          module: row.module || 'all'
        })
        created++
      } else {
        user.name = row.name
        user.phone = row.phone
        user.role = row.role || user.role
        user.module = row.module || user.module
        await user.save()
        updated++
      }
      // Ensure employee record
      let employee = await Employee.findOne({ userId: user._id })
      if (!employee) {
        employee = new Employee({ userId: user._id, name: user.name, phone: user.phone, email: user.email })
      }
      if (row.basicSalary) employee.basicSalary = Number(row.basicSalary)
      if (row.dateOfBirth) employee.dateOfBirth = new Date(row.dateOfBirth)
      await employee.save()
    } catch (e) {
      errors++
    }
  }
  res.json({ success: true, message: `Employees import completed. Created: ${created}, Updated: ${updated}, Errors: ${errors}` })
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


