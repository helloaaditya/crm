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
  // Simple format matching user's existing data
  const csv = [
    'Name,Address,Ph No,Quotation For,Amount,Status',
    'John Doe,123 Main Street Bangalore,9876543210,Interior Design Work,50000,Won',
    'Jane Smith,456 Park Avenue Mumbai,9876543211,Construction Materials,75000,Pending',
    'Raj Kumar,789 MG Road Delhi,9876543212,Plumbing Services,30000,Lost'
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
  
  // Check for simple format (Name, Address, Ph No, Quotation For, Amount, Status)
  const isSimpleFormat = headers.some(h => 
    ['Name', 'name', 'Nmae', 'nmae'].includes(h.trim())
  ) && headers.some(h => 
    ['Ph No', 'ph no', 'PhNo', 'phno', 'Phone', 'phone', 'Contact', 'contact'].includes(h.trim())
  )
  
  let created = 0, errors = 0
  const errorDetails = []
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      if (isSimpleFormat) {
        // Handle simple format: Name, Address, Ph No, Quotation For, Amount, Status
        const nameField = headers.find(h => ['Name', 'name', 'Nmae', 'nmae'].includes(h.trim()))
        const addressField = headers.find(h => ['Address', 'address'].includes(h.trim()))
        const phoneField = headers.find(h => ['Ph No', 'ph no', 'PhNo', 'phno', 'Phone', 'phone', 'Contact', 'contact', 'ContactNumber', 'contactNumber'].includes(h.trim()))
        const quotationForField = headers.find(h => ['Quotation For', 'quotation for', 'QuotationFor', 'quotationFor', 'Description', 'description'].includes(h.trim()))
        const amountField = headers.find(h => ['Amount', 'amount'].includes(h.trim()))
        const statusField = headers.find(h => ['Status', 'status'].includes(h.trim()))
        
        // Validate required fields
        if (!row[nameField] || !row[phoneField] || !row[amountField]) {
          errors++
          errorDetails.push(`Row ${i + 2}: Missing required fields (Name, Ph No, or Amount)`)
          continue
        }
        
        const name = row[nameField]?.trim()
        const phone = row[phoneField]?.trim().replace(/\D/g, '') // Remove non-digits
        const address = row[addressField]?.trim()
        const quotationFor = row[quotationForField]?.trim() || 'Quotation'
        const amount = parseFloat(row[amountField]?.toString().replace(/[^\d.-]/g, '')) || 0
        const status = row[statusField]?.trim() || 'draft'
        
        // Validate phone number
        if (!phone || phone.length !== 10) {
          errors++
          errorDetails.push(`Row ${i + 2}: Invalid phone number '${row[phoneField]}'. Must be 10 digits.`)
          continue
        }
        
        // Find or create customer
        let customer = await Customer.findOne({ contactNumber: phone })
        if (!customer) {
          // Parse address
          let addressData = {}
          if (address) {
            const addressParts = address.split(',').map(p => p.trim())
            if (addressParts.length >= 2) {
              addressData = {
                street: addressParts[0] || '',
                city: addressParts[1] || '',
                state: addressParts[2] || '',
                pincode: addressParts[3] || '',
                country: 'India'
              }
            } else {
              addressData = { street: address }
            }
          }
          
          // Create customer
          customer = await Customer.create({
            name: name,
            contactNumber: phone,
            address: Object.keys(addressData).length > 0 ? addressData : undefined,
            leadStatus: 'new',
            createdBy: req.user?._id
          })
        } else {
          // Update customer name and address if provided
          if (name && customer.name !== name) {
            customer.name = name
          }
          if (address) {
            const addressParts = address.split(',').map(p => p.trim())
            if (addressParts.length >= 2) {
              customer.address = {
                street: addressParts[0] || '',
                city: addressParts[1] || '',
                state: addressParts[2] || '',
                pincode: addressParts[3] || '',
                country: 'India'
              }
            } else {
              customer.address = { street: address }
            }
            await customer.save()
          }
        }
        
        // Calculate GST (assuming 18% GST on amount)
        const subtotal = amount / 1.18 // Remove GST to get subtotal
        const gstAmount = amount - subtotal
        const cgst = gstAmount / 2
        const sgst = gstAmount / 2
        
        // Create quotation item
        const items = [{
          description: quotationFor,
          quantity: 1,
          unit: 'Nos',
          rate: subtotal,
          amount: subtotal,
          gstRate: 18,
          gstAmount: gstAmount
        }]
        
        // Map status
        let invoiceStatus = 'draft'
        if (status.toLowerCase() === 'won') {
          invoiceStatus = 'sent'
        } else if (status.toLowerCase() === 'lost') {
          invoiceStatus = 'cancelled'
        } else if (status.toLowerCase() === 'pending') {
          invoiceStatus = 'sent'
        }
        
        // Create quotation
        const invoiceData = {
          customer: customer._id,
          invoiceType: 'quotation',
          items: items,
          subtotal: subtotal,
          cgst: cgst,
          sgst: sgst,
          igst: 0,
          discount: 0,
          totalAmount: amount,
          paidAmount: 0,
          balanceAmount: amount,
          invoiceDate: new Date(),
          paymentStatus: 'unpaid',
          status: invoiceStatus,
          notes: `Imported from bulk upload - Status: ${status}`,
          createdBy: req.user?._id
        }
        
        const invoice = await Invoice.create(invoiceData)
        created++
      } else {
        // Handle detailed format (original format)
        const requiredHeaders = ['invoiceType', 'customerPhone']
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        
        if (missingHeaders.length > 0) {
          return res.status(400).json({ 
            message: `Missing required columns: ${missingHeaders.join(', ')}. Required columns: ${requiredHeaders.join(', ')} or use simple format (Name, Address, Ph No, Quotation For, Amount, Status)` 
          })
        }
        
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
      }
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




