import { asyncHandler } from '../middleware/errorHandler.js'
import User from '../models/User.js'
import Employee from '../models/Employee.js'
import Customer from '../models/Customer.js'
import Invoice from '../models/Invoice.js'

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
    'name,contactNumber,email,address',
    'Acme Corp,9988776655,info@acme.com,MG Road, Bangalore',
    'John Doe,9876543210,john@example.com,123 Main St, Mumbai',
    'Jane Smith,9876543211,jane@example.com,456 Park Ave, Delhi'
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
  const { headers, rows } = parseCsv(text)
  
  // Validate headers
  const requiredHeaders = ['name']
  const hasPhoneColumn = headers.includes('phone') || headers.includes('contactNumber')
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
  
  if (missingHeaders.length > 0) {
    return res.status(400).json({ 
      message: `Missing required columns: ${missingHeaders.join(', ')}. Required columns: ${requiredHeaders.join(', ')}` 
    })
  }
  
  if (!hasPhoneColumn) {
    return res.status(400).json({ 
      message: `Missing required column: 'phone' or 'contactNumber'. At least one is required.` 
    })
  }
  
  let created = 0, updated = 0, errors = 0
  const errorDetails = []
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      // Validate required fields
      if (!row.name || row.name.trim() === '') {
        errors++
        errorDetails.push(`Row ${i + 2}: Missing required field 'name'`)
        continue
      }
      
      const email = row.email?.toLowerCase().trim() || undefined
      // Support both 'phone' and 'contactNumber' column names
      const phone = (row.contactNumber || row.phone)?.trim() || ''
      
      // Validate phone number format (must be 10 digits)
      if (phone && !/^[0-9]{10}$/.test(phone)) {
        errors++
        errorDetails.push(`Row ${i + 2}: Invalid phone number '${phone}'. Must be exactly 10 digits.`)
        continue
      }
      
      // Validate email format if provided
      if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        errors++
        errorDetails.push(`Row ${i + 2}: Invalid email format '${email}'.`)
        continue
      }
      
      // Phone number is required
      if (!phone) {
        errors++
        errorDetails.push(`Row ${i + 2}: Missing required field 'contactNumber' (or 'phone').`)
        continue
      }
      
      // Check for duplicate contact number
      const existingByPhone = await Customer.findOne({ contactNumber: phone })
      if (existingByPhone) {
        errors++
        errorDetails.push(`Row ${i + 2}: Customer with phone number '${phone}' already exists`)
        continue
      }
      
      // Check for duplicate email if email is provided
      if (email) {
        const existingByEmail = await Customer.findOne({ email })
        if (existingByEmail) {
          errors++
          errorDetails.push(`Row ${i + 2}: Customer with email '${email}' already exists`)
          continue
        }
      }
      
      // Parse address - can be a simple string or structured
      let addressData = {}
      if (row.address) {
        const addressStr = row.address.trim()
        // Try to parse structured address (comma-separated: street, city, state, pincode)
        const addressParts = addressStr.split(',').map(p => p.trim())
        if (addressParts.length >= 2) {
          addressData = {
            street: addressParts[0] || '',
            city: addressParts[1] || '',
            state: addressParts[2] || '',
            pincode: addressParts[3] || '',
            country: 'India'
          }
        } else {
          // Simple string address
          addressData = { street: addressStr }
        }
      }
      
      // Create new customer
      const customer = await Customer.create({
        name: row.name.trim(),
        contactNumber: phone,
        email: email,
        address: Object.keys(addressData).length > 0 ? addressData : undefined,
        createdBy: req.user?._id
      })
      created++
    } catch (e) {
      errors++
      const errorMsg = e.message || 'Unknown error'
      errorDetails.push(`Row ${i + 2}: ${errorMsg}`)
    }
  }
  
  const message = `Customers import completed. Created: ${created}, Updated: ${updated}, Errors: ${errors}`
  const response = { success: true, message }
  if (errorDetails.length > 0) {
    response.errorDetails = errorDetails
  }
  res.json(response)
})

// ============= INVOICE/QUOTATION BULK IMPORT =============

export const invoiceBulkSample = asyncHandler(async (req, res) => {
  const csv = [
    'invoiceType,customerPhone,invoiceNumber,quotationNumber,invoiceDate,dueDate,subtotal,cgst,sgst,igst,discount,totalAmount,paidAmount,paymentStatus,status,items,notes',
    'quotation,9876543210,,QUO24120001,2024-12-01,2024-12-31,10000,900,900,0,0,11800,0,unpaid,draft,"[{""description"":""Service 1"",""quantity"":1,""unit"":""Nos"",""rate"":10000,""amount"":10000,""gstRate"":18,""gstAmount"":1800}]",Old quotation',
    'tax_invoice,9876543210,INV24120001,,2024-12-15,2025-01-15,20000,1800,1800,0,500,40600,20000,partial,partial,"[{""description"":""Product 1"",""quantity"":2,""unit"":""Nos"",""rate"":10000,""amount"":20000,""gstRate"":18,""gstAmount"":3600}]",Old invoice with partial payment',
    'tax_invoice,9876543211,INV24120002,,2024-12-20,2025-01-20,15000,1350,1350,0,0,17700,17700,paid,paid,"[{""description"":""Service 2"",""quantity"":1,""unit"":""Nos"",""rate"":15000,""amount"":15000,""gstRate"":18,""gstAmount"":2700}]",Old paid invoice'
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="invoices-sample.csv"')
  res.send(csv)
})

export const invoiceBulkUpload = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'CSV file is required' })
  }
  const isCsv = /csv/i.test(req.file.mimetype) || /\.csv$/i.test(req.file.originalname)
  if (!isCsv) {
    return res.status(400).json({ message: 'Please upload a CSV file (not Excel). Save as CSV and retry.' })
  }
  const text = req.file.buffer.toString('utf-8')
  const { headers, rows } = parseCsv(text)
  
  // Validate required headers
  const requiredHeaders = ['invoiceType', 'customerPhone']
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
  
  if (missingHeaders.length > 0) {
    return res.status(400).json({ 
      message: `Missing required columns: ${missingHeaders.join(', ')}. Required columns: ${requiredHeaders.join(', ')}` 
    })
  }
  
  let created = 0, errors = 0
  const errorDetails = []
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      // Validate required fields
      if (!row.invoiceType || !row.customerPhone) {
        errors++
        errorDetails.push(`Row ${i + 2}: Missing required fields 'invoiceType' or 'customerPhone'`)
        continue
      }
      
      // Validate invoiceType
      const validTypes = ['quotation', 'proforma', 'tax_invoice', 'final', 'dc']
      if (!validTypes.includes(row.invoiceType.toLowerCase())) {
        errors++
        errorDetails.push(`Row ${i + 2}: Invalid invoiceType '${row.invoiceType}'. Must be one of: ${validTypes.join(', ')}`)
        continue
      }
      
      // Find customer by phone
      const customer = await Customer.findOne({ contactNumber: row.customerPhone.trim() })
      if (!customer) {
        errors++
        errorDetails.push(`Row ${i + 2}: Customer with phone '${row.customerPhone}' not found. Please create customer first.`)
        continue
      }
      
      // Parse items (JSON string or empty)
      let items = []
      if (row.items && row.items.trim()) {
        try {
          items = JSON.parse(row.items)
          if (!Array.isArray(items)) {
            errors++
            errorDetails.push(`Row ${i + 2}: Items must be a JSON array`)
            continue
          }
        } catch (e) {
          errors++
          errorDetails.push(`Row ${i + 2}: Invalid items JSON format: ${e.message}`)
          continue
        }
      }
      
      // If no items, create a default item from description/amount
      if (items.length === 0 && row.description && row.totalAmount) {
        items = [{
          description: row.description || 'Imported item',
          quantity: parseFloat(row.quantity) || 1,
          unit: row.unit || 'Nos',
          rate: parseFloat(row.rate) || parseFloat(row.totalAmount),
          amount: parseFloat(row.totalAmount),
          gstRate: parseFloat(row.gstRate) || 0,
          gstAmount: parseFloat(row.gstAmount) || 0
        }]
      }
      
      if (items.length === 0) {
        errors++
        errorDetails.push(`Row ${i + 2}: No items found. Provide items as JSON array or description/amount fields.`)
        continue
      }
      
      // Parse amounts
      const subtotal = parseFloat(row.subtotal) || 0
      const cgst = parseFloat(row.cgst) || 0
      const sgst = parseFloat(row.sgst) || 0
      const igst = parseFloat(row.igst) || 0
      const discount = parseFloat(row.discount) || 0
      const totalAmount = parseFloat(row.totalAmount) || subtotal + cgst + sgst + igst - discount
      const paidAmount = parseFloat(row.paidAmount) || 0
      
      // Parse dates
      const invoiceDate = row.invoiceDate ? new Date(row.invoiceDate) : new Date()
      const dueDate = row.dueDate ? new Date(row.dueDate) : undefined
      
      // Create invoice data
      const invoiceData = {
        customer: customer._id,
        invoiceType: row.invoiceType.toLowerCase(),
        items: items,
        subtotal: subtotal,
        cgst: cgst,
        sgst: sgst,
        igst: igst,
        discount: discount,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        balanceAmount: totalAmount - paidAmount,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        paymentStatus: row.paymentStatus?.toLowerCase() || (paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'),
        status: row.status?.toLowerCase() || 'draft',
        notes: row.notes || 'Imported from bulk upload',
        createdBy: req.user?._id
      }
      
      // Set invoice/quotation number if provided (otherwise will auto-generate)
      if (row.invoiceNumber && row.invoiceType.toLowerCase() !== 'quotation') {
        invoiceData.invoiceNumber = row.invoiceNumber.trim()
      }
      if (row.quotationNumber && row.invoiceType.toLowerCase() === 'quotation') {
        invoiceData.quotationNumber = row.quotationNumber.trim()
      }
      
      // Check for duplicate invoice/quotation number if provided
      if (invoiceData.invoiceNumber) {
        const existing = await Invoice.findOne({ invoiceNumber: invoiceData.invoiceNumber })
        if (existing) {
          errors++
          errorDetails.push(`Row ${i + 2}: Invoice with number '${invoiceData.invoiceNumber}' already exists`)
          continue
        }
      }
      if (invoiceData.quotationNumber) {
        const existing = await Invoice.findOne({ quotationNumber: invoiceData.quotationNumber })
        if (existing) {
          errors++
          errorDetails.push(`Row ${i + 2}: Quotation with number '${invoiceData.quotationNumber}' already exists`)
          continue
        }
      }
      
      // Create invoice (will auto-generate number if not provided)
      const invoice = await Invoice.create(invoiceData)
      created++
    } catch (e) {
      errors++
      const errorMsg = e.message || 'Unknown error'
      errorDetails.push(`Row ${i + 2}: ${errorMsg}`)
    }
  }
  
  const message = `Invoices/Quotations import completed. Created: ${created}, Errors: ${errors}`
  const response = { success: true, message }
  if (errorDetails.length > 0) {
    response.errorDetails = errorDetails
  }
  res.json(response)
})




