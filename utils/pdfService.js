import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

// Generate Professional Invoice/Quotation PDF
export const generateInvoicePDF = async (invoiceData, type = 'invoice') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4',
        bufferPages: true
      });
      const filename = `${type}-${invoiceData.invoiceNumber}-${Date.now()}.pdf`;
      const filepath = path.join('uploads', 'invoices', filename);

      // Ensure directory exists
      if (!fs.existsSync(path.join('uploads', 'invoices'))) {
        fs.mkdirSync(path.join('uploads', 'invoices'), { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const companyInfo = invoiceData.companyInfo || {};
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points

      // ================== HEADER SECTION ==================
      
      // Top border accent
      doc.rect(40, 40, pageWidth - 80, 3)
         .fill('#2563eb');

      // Company Name - Large and Bold
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text(companyInfo.name || 'SANJANA ENTERPRISES', 40, 55, {
           width: 300
         });

      // Company tagline or type
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('WATERPROOFING & CONSTRUCTION SERVICES', 40, 92);

      // ================== INVOICE TYPE BOX ==================
      const invoiceTitle = type === 'quotation' ? 'QUOTATION' : 'TAX INVOICE';
      const boxX = 380;
      const boxY = 50;
      
      // Invoice type box with gradient effect
      doc.rect(boxX, boxY, 175, 80)
         .fillAndStroke('#eff6ff', '#2563eb');

      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text(invoiceTitle, boxX + 10, boxY + 12, {
           width: 155,
           align: 'center'
         });

      // Invoice details in box
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151')
         .text(`${type === 'quotation' ? 'Quotation' : 'Invoice'} No:`, boxX + 10, boxY + 38)
         .font('Helvetica-Bold')
         .text(invoiceData.invoiceNumber, boxX + 75, boxY + 38);

      doc.font('Helvetica')
         .text('Date:', boxX + 10, boxY + 52)
         .font('Helvetica-Bold')
         .text(new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN'), boxX + 75, boxY + 52);

      doc.font('Helvetica')
         .text('Due Date:', boxX + 10, boxY + 66)
         .font('Helvetica-Bold')
         .text(invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString('en-IN') : 'On Receipt', boxX + 75, boxY + 66);

      // ================== COMPANY DETAILS SECTION ==================
      let yPos = 120;

      // Company details box
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#4b5563');

      const companyDetails = [
        companyInfo.address || '# 786/1/30&31, 3rd main, 2nd cross, telecom layout',
        'Beside Muneshwara Temple, Srirampura, Jakkur Post',
        `${companyInfo.city || 'Bangalore'}, ${companyInfo.state || 'Karnataka'} - ${companyInfo.pincode || '561203'}`,
        '',
        `📞 ${companyInfo.phone || '+91 9916290799'}`,
        `📧 ${companyInfo.email || 'sanjana.waterproofing@gmail.com'}`,
        '',
        `GSTIN: ${companyInfo.gstin || '29XXXXX1234X1ZX'} | PAN: ${companyInfo.pan || 'XXXXX1234X'}`
      ];

      companyDetails.forEach(line => {
        if (line) {
          doc.text(line, 40, yPos);
          yPos += 12;
        }
      });

      // ================== BILL TO / BILL FROM SECTION ==================
      yPos = 240;

      // Draw separator line
      doc.moveTo(40, yPos - 10)
         .lineTo(pageWidth - 40, yPos - 10)
         .stroke('#e5e7eb');

      // FROM section
      doc.rect(40, yPos, 250, 120)
         .fillAndStroke('#f9fafb', '#e5e7eb');

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('FROM', 50, yPos + 10);

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#374151')
         .text(companyInfo.name || 'Sanjana Enterprises', 50, yPos + 28, { width: 230 });

      doc.font('Helvetica')
         .fillColor('#4b5563')
         .text(companyInfo.address || '# 786/1/30&31, 3rd main, 2nd cross', 50, yPos + 42, { width: 230 })
         .text(`${companyInfo.city || 'Bangalore'}, ${companyInfo.state || 'Karnataka'} - ${companyInfo.pincode || '561203'}`, 50, yPos + 68, { width: 230 })
         .text(`Ph: ${companyInfo.phone || '+91 9916290799'}`, 50, yPos + 82)
         .text(`GSTIN: ${companyInfo.gstin || '29XXXXX1234X1ZX'}`, 50, yPos + 96);

      // BILL TO section
      doc.rect(305, yPos, 250, 120)
         .fillAndStroke('#eff6ff', '#bfdbfe');

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('BILL TO', 315, yPos + 10);

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text(invoiceData.customerName, 315, yPos + 28, { width: 230 });

      if (invoiceData.customerAddress) {
        doc.font('Helvetica')
           .fillColor('#374151')
           .text(invoiceData.customerAddress, 315, yPos + 42, { width: 230 });
      }

      let customerYPos = invoiceData.customerAddress ? yPos + 68 : yPos + 42;
      
      if (invoiceData.customerPhone) {
        doc.text(`Phone: ${invoiceData.customerPhone}`, 315, customerYPos);
        customerYPos += 14;
      }
      
      if (invoiceData.customerEmail) {
        doc.text(`Email: ${invoiceData.customerEmail}`, 315, customerYPos);
        customerYPos += 14;
      }
      
      if (invoiceData.isGST && invoiceData.gstNumber) {
        doc.font('Helvetica-Bold')
           .text(`GSTIN: ${invoiceData.gstNumber}`, 315, customerYPos);
      }

      // ================== ITEMS TABLE ==================
      yPos = 380;

      // Table header background
      doc.rect(40, yPos, pageWidth - 80, 25)
         .fill('#1e40af');

      // Table headers
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('#', 50, yPos + 8, { width: 20 })
         .text('DESCRIPTION', 75, yPos + 8, { width: 200 })
         .text('QTY', 290, yPos + 8, { width: 40, align: 'center' })
         .text('UNIT', 335, yPos + 8, { width: 45, align: 'center' })
         .text('RATE (Rs.)', 385, yPos + 8, { width: 70, align: 'right' })
         .text('AMOUNT (Rs.)', 465, yPos + 8, { width: 85, align: 'right' });

      yPos += 25;

      // Table items
      invoiceData.items.forEach((item, index) => {
        // Check for page break
        if (yPos > 680) {
          doc.addPage();
          yPos = 50;
          
          // Repeat header on new page
          doc.rect(40, yPos, pageWidth - 80, 25)
             .fill('#1e40af');
          
          doc.fontSize(9)
             .font('Helvetica-Bold')
             .fillColor('#ffffff')
             .text('#', 50, yPos + 8, { width: 20 })
             .text('DESCRIPTION', 75, yPos + 8, { width: 200 })
             .text('QTY', 290, yPos + 8, { width: 40, align: 'center' })
             .text('UNIT', 335, yPos + 8, { width: 45, align: 'center' })
             .text('RATE', 385, yPos + 8, { width: 70, align: 'right' })
             .text('AMOUNT', 465, yPos + 8, { width: 85, align: 'right' });
          
          yPos += 25;
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(40, yPos, pageWidth - 80, 24)
             .fill('#f9fafb');
        }

        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(index + 1, 50, yPos + 8, { width: 20 })
           .text(item.description, 75, yPos + 8, { width: 200 })
           .text(item.quantity.toString(), 290, yPos + 8, { width: 40, align: 'center' })
           .text(item.unit || 'Nos', 335, yPos + 8, { width: 45, align: 'center' })
           .text(`₹${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 385, yPos + 8, { width: 70, align: 'right' })
           .text(`₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 465, yPos + 8, { width: 85, align: 'right' });

        yPos += 24;
      });

      // Bottom border of table
      doc.moveTo(40, yPos)
         .lineTo(pageWidth - 40, yPos)
         .stroke('#e5e7eb');

      // ================== TOTALS SECTION ==================
      yPos += 15;

      const totalsX = 360;
      const amountX = 465;

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151');

      // Subtotal
      doc.text('Subtotal:', totalsX, yPos)
         .text(`₹${invoiceData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, amountX, yPos, { width: 85, align: 'right' });
      yPos += 18;

      // GST Details
      if (invoiceData.isGST) {
        if (invoiceData.cgst > 0) {
          doc.text(`CGST (${(invoiceData.cgst / invoiceData.subtotal * 100).toFixed(1)}%):`, totalsX, yPos)
             .text(`₹${invoiceData.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, amountX, yPos, { width: 85, align: 'right' });
          yPos += 15;
          
          doc.text(`SGST (${(invoiceData.sgst / invoiceData.subtotal * 100).toFixed(1)}%):`, totalsX, yPos)
             .text(`₹${invoiceData.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, amountX, yPos, { width: 85, align: 'right' });
          yPos += 18;
        }
        
        if (invoiceData.igst > 0) {
          doc.text(`IGST (${(invoiceData.igst / invoiceData.subtotal * 100).toFixed(1)}%):`, totalsX, yPos)
             .text(`₹${invoiceData.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, amountX, yPos, { width: 85, align: 'right' });
          yPos += 18;
        }
      }

      // Discount
      if (invoiceData.discount > 0) {
        doc.fillColor('#dc2626')
           .text('Discount:', totalsX, yPos)
           .text(`-₹${invoiceData.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, amountX, yPos, { width: 85, align: 'right' });
        yPos += 18;
      }

      // Total box
      doc.rect(totalsX - 10, yPos, 200, 30)
         .fillAndStroke('#1e40af', '#1e40af');

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('TOTAL AMOUNT:', totalsX, yPos + 8)
         .fontSize(14)
         .text(`₹${invoiceData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, amountX, yPos + 8, { width: 85, align: 'right' });

      yPos += 40;

      // Amount in words box
      const amountInWords = convertNumberToWords(invoiceData.totalAmount);
      doc.rect(40, yPos, pageWidth - 80, 35)
         .fillAndStroke('#f9fafb', '#e5e7eb');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#374151')
         .text('Amount in Words:', 50, yPos + 8)
         .font('Helvetica')
         .fontSize(9)
         .text(`${amountInWords} Rupees Only`, 50, yPos + 20, { width: pageWidth - 100 });

      yPos += 50;

      // ================== PAYMENT INFO & QR CODE ==================
      if (yPos > 620) {
        doc.addPage();
        yPos = 50;
      }

      const bankDetails = invoiceData.bankDetails || {};
      
      // Payment information box
      doc.rect(40, yPos, 300, 110)
         .fillAndStroke('#fffbeb', '#fbbf24');

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#92400e')
         .text('PAYMENT INFORMATION', 50, yPos + 10);

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#78350f')
         .text(`Bank: ${bankDetails.bankName || 'State Bank of India'}`, 50, yPos + 28)
         .text(`A/c Name: ${bankDetails.accountName || 'Sanjana Enterprises'}`, 50, yPos + 40)
         .text(`A/c No: ${bankDetails.accountNumber || '1234567890'}`, 50, yPos + 52)
         .text(`IFSC: ${bankDetails.ifscCode || 'SBIN0001234'}`, 50, yPos + 64)
         .text(`Branch: ${bankDetails.branch || 'Bangalore Main'}`, 50, yPos + 76)
         .text(`UPI ID: ${bankDetails.upiId || 'sanjana@sbi'}`, 50, yPos + 88);

      // QR Code section
      if (invoiceData.qrCode?.enabled !== false) {
        const upiString = `upi://pay?pa=${bankDetails.upiId || 'sanjana@sbi'}&pn=${encodeURIComponent(companyInfo.name || 'Sanjana Enterprises')}&am=${invoiceData.totalAmount}&cu=INR`;
        
        QRCode.toDataURL(upiString, { width: 100, margin: 1 }, (err, url) => {
          if (!err) {
            // QR Code box
            doc.rect(360, yPos, 195, 110)
               .fillAndStroke('#f0fdf4', '#22c55e');

            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fillColor('#166534')
               .text('SCAN TO PAY', 360, yPos + 10, { width: 195, align: 'center' });

            // QR Code placeholder (in real implementation, use doc.image())
            doc.rect(420, yPos + 25, 70, 70)
               .stroke('#22c55e');

            doc.fontSize(7)
               .text('QR Code', 420, yPos + 50, { width: 70, align: 'center' });

            doc.fontSize(8)
               .font('Helvetica-Bold')
               .text(`₹${invoiceData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 360, yPos + 98, { width: 195, align: 'center' });

            continueWithTermsAndFooter();
          } else {
            continueWithTermsAndFooter();
          }
        });
      } else {
        continueWithTermsAndFooter();
      }

      function continueWithTermsAndFooter() {
        yPos += 130;

        // ================== TERMS & CONDITIONS ==================
        const terms = invoiceData.invoiceDefaults?.terms || 
          '1. Payment terms are 30 days from invoice date.\n' +
          '2. Interest @ 24% per annum will be charged on overdue amounts.\n' +
          '3. All disputes subject to Bangalore jurisdiction.\n' +
          '4. Goods once sold will not be taken back.';

        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('TERMS & CONDITIONS', 40, yPos);

        doc.fontSize(7)
           .font('Helvetica')
           .fillColor('#4b5563')
           .text(terms, 40, yPos + 15, { width: pageWidth - 80, lineGap: 3 });

        // ================== FOOTER ==================
        // Signature section
        doc.fontSize(8)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('For ' + (companyInfo.name || 'SANJANA ENTERPRISES'), pageWidth - 180, pageHeight - 100);

        doc.moveTo(pageWidth - 180, pageHeight - 50)
           .lineTo(pageWidth - 50, pageHeight - 50)
           .stroke('#9ca3af');

        doc.fontSize(7)
           .font('Helvetica')
           .fillColor('#6b7280')
           .text('Authorized Signatory', pageWidth - 180, pageHeight - 40);

        // Bottom decorative line
        doc.rect(40, pageHeight - 70, pageWidth - 80, 2)
           .fill('#e5e7eb');

        // Footer text
        doc.fontSize(7)
           .fillColor('#9ca3af')
           .text('This is a computer-generated document. No signature required.', 40, pageHeight - 55, { 
             width: pageWidth - 80, 
             align: 'center' 
           })
           .text('Thank you for your business!', 40, pageHeight - 43, { 
             width: pageWidth - 80, 
             align: 'center' 
           });

        doc.end();
      }

      stream.on('finish', () => {
        resolve({ filename, filepath });
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to convert number to words (Indian numbering system)
function convertNumberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  // Handle decimal part
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  function convertHundreds(n) {
    let str = '';
    if (n > 99) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str;
  }
  
  const crore = Math.floor(rupees / 10000000);
  let remaining = rupees % 10000000;
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  
  let result = '';
  if (crore > 0) result += convertHundreds(crore) + 'Crore ';
  if (lakh > 0) result += convertHundreds(lakh) + 'Lakh ';
  if (thousand > 0) result += convertHundreds(thousand) + 'Thousand ';
  if (remaining > 0) result += convertHundreds(remaining);
  
  if (paise > 0) {
    result += 'and ' + convertHundreds(paise) + 'Paise ';
  }
  
  return result.trim();
}

// Generate Professional Payslip PDF
export const generatePayslipPDF = async (payslipData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `payslip-${payslipData.employeeId}-${payslipData.month}-${Date.now()}.pdf`;
      const filepath = path.join('uploads', 'payslips', filename);

      if (!fs.existsSync(path.join('uploads', 'payslips'))) {
        fs.mkdirSync(path.join('uploads', 'payslips'), { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const pageWidth = 595.28;

      // Header with background
      doc.rect(0, 0, pageWidth, 100)
         .fill('#1e40af');

      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('PAYSLIP', 0, 30, { align: 'center' });

      doc.fontSize(12)
         .font('Helvetica')
         .text('Sanjana Enterprises', 0, 62, { align: 'center' });

      // Employee details box
      let yPos = 130;
      
      doc.rect(50, yPos, 245, 140)
         .fillAndStroke('#f9fafb', '#e5e7eb');

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('EMPLOYEE DETAILS', 60, yPos + 10);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151')
         .text('Employee ID:', 60, yPos + 35)
         .font('Helvetica-Bold')
         .text(payslipData.employeeId, 150, yPos + 35);

      doc.font('Helvetica')
         .text('Name:', 60, yPos + 52)
         .font('Helvetica-Bold')
         .text(payslipData.employeeName, 150, yPos + 52);

      doc.font('Helvetica')
         .text('Department:', 60, yPos + 69)
         .font('Helvetica-Bold')
         .text(payslipData.department || 'N/A', 150, yPos + 69);

      doc.font('Helvetica')
         .text('Designation:', 60, yPos + 86)
         .font('Helvetica-Bold')
         .text(payslipData.designation || 'N/A', 150, yPos + 86);

      doc.font('Helvetica')
         .text('Bank A/c:', 60, yPos + 103)
         .font('Helvetica-Bold')
         .text(payslipData.bankAccount || 'N/A', 150, yPos + 103);

      // Payment period box
      doc.rect(305, yPos, 245, 140)
         .fillAndStroke('#eff6ff', '#bfdbfe');

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('PAYMENT PERIOD', 315, yPos + 10);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151')
         .text('Month:', 315, yPos + 35)
         .font('Helvetica-Bold')
         .text(payslipData.month, 400, yPos + 35);

      doc.font('Helvetica')
         .text('Payment Date:', 315, yPos + 52)
         .font('Helvetica-Bold')
         .text(payslipData.paymentDate ? new Date(payslipData.paymentDate).toLocaleDateString('en-IN') : 'N/A', 400, yPos + 52);

      doc.font('Helvetica')
         .text('Working Days:', 315, yPos + 69)
         .font('Helvetica-Bold')
         .text(payslipData.workingDays || 'N/A', 400, yPos + 69);

      doc.font('Helvetica')
         .text('Days Worked:', 315, yPos + 86)
         .font('Helvetica-Bold')
         .text(payslipData.daysWorked || 'N/A', 400, yPos + 86);

      // Earnings and Deductions section
      yPos = 300;

      // Earnings header
      doc.rect(50, yPos, 245, 25)
         .fill('#22c55e');

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('EARNINGS', 50, yPos + 7, { width: 245, align: 'center' });

      yPos += 25;

      // Earnings items
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151');

      const earnings = [
        { label: 'Basic Salary', amount: payslipData.basicSalary || 0 },
        ...(payslipData.allowances ? Object.entries(payslipData.allowances)
          .filter(([_, value]) => value > 0)
          .map(([key, value]) => ({
            label: key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase()),
            amount: value
          })) : [])
      ];

      earnings.forEach(item => {
        doc.text(item.label, 60, yPos)
           .text(`₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, yPos, { width: 85, align: 'right' });
        yPos += 18;
      });

      // Total earnings
      yPos += 5;
      doc.rect(50, yPos, 245, 20)
         .fill('#dcfce7');

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#166534')
         .text('Gross Earnings', 60, yPos + 5)
         .text(`₹${(payslipData.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, yPos + 5, { width: 85, align: 'right' });

      // Deductions header
      yPos = 300;
      doc.rect(305, yPos, 245, 25)
         .fill('#ef4444');

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('DEDUCTIONS', 305, yPos + 7, { width: 245, align: 'center' });

      yPos += 25;

      // Deductions items
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151');

      const deductions = payslipData.deductions ? Object.entries(payslipData.deductions)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => ({
          label: key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase()),
          amount: value
        })) : [];

      if (deductions.length === 0) {
        doc.text('No Deductions', 315, yPos, { align: 'center' });
        yPos += 18;
      } else {
        deductions.forEach(item => {
          doc.text(item.label, 315, yPos)
             .text(`₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 455, yPos, { width: 85, align: 'right' });
          yPos += 18;
        });
      }

      // Total deductions
      const maxYPos = Math.max(yPos, 300 + 25 + (earnings.length * 18) + 5);
      
      doc.rect(305, maxYPos + 5, 245, 20)
         .fill('#fee2e2');

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#991b1b')
         .text('Total Deductions', 315, maxYPos + 10)
         .text(`₹${(payslipData.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 455, maxYPos + 10, { width: 85, align: 'right' });

      // Net Salary Box
      yPos = maxYPos + 50;

      doc.rect(50, yPos, 500, 45)
         .fillAndStroke('#1e40af', '#1e40af');

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('NET SALARY', 60, yPos + 12);

      doc.fontSize(20)
         .text(`₹${(payslipData.netAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 300, yPos + 12, { width: 240, align: 'right' });

      // Net salary in words
      yPos += 55;
      const netInWords = convertNumberToWords(payslipData.netAmount || 0);
      
      doc.rect(50, yPos, 500, 30)
         .fillAndStroke('#f9fafb', '#e5e7eb');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#374151')
         .text('Amount in Words:', 60, yPos + 8)
         .font('Helvetica')
         .fontSize(9)
         .text(`${netInWords} Rupees Only`, 60, yPos + 18, { width: 480 });

      // Note section
      yPos += 50;

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#92400e')
         .text('Note:', 50, yPos)
         .font('Helvetica')
         .fillColor('#78350f')
         .text('This is a computer-generated payslip. Please verify all details and report any discrepancies to HR within 7 days.', 50, yPos + 12, { width: 500 });

      // Footer
      doc.rect(0, 780, pageWidth, 2)
         .fill('#e5e7eb');

      doc.fontSize(7)
         .fillColor('#9ca3af')
         .text('Generated by Sanjana CRM', 0, 790, { width: pageWidth, align: 'center' })
         .text('This is a computer-generated document and does not require a signature.', 0, 800, { width: pageWidth, align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve({ filename, filepath });
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

// Generate Professional Warranty Certificate PDF
export const generateWarrantyCertificate = async (warrantyData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `warranty-${warrantyData.projectId}-${Date.now()}.pdf`;
      const filepath = path.join('uploads', 'certificates', filename);

      if (!fs.existsSync(path.join('uploads', 'certificates'))) {
        fs.mkdirSync(path.join('uploads', 'certificates'), { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const pageWidth = 595.28;
      const pageHeight = 841.89;

      // Decorative border
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
         .lineWidth(3)
         .stroke('#2563eb');

      doc.rect(35, 35, pageWidth - 70, pageHeight - 70)
         .lineWidth(1)
         .stroke('#93c5fd');

      // Header with decorative elements
      doc.fontSize(32)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('WARRANTY CERTIFICATE', 0, 80, { align: 'center' });

      // Decorative line under header
      doc.moveTo(150, 125)
         .lineTo(445, 125)
         .lineWidth(2)
         .stroke('#2563eb');

      // Certificate number
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(`Certificate No: WC-${warrantyData.projectId}-${new Date().getFullYear()}`, 0, 140, { align: 'center' });

      // Company logo/name section
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text(warrantyData.companyName || 'SANJANA ENTERPRISES', 0, 180, { align: 'center' });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4b5563')
         .text(warrantyData.companyAddress || 'Waterproofing & Construction Services', 0, 210, { align: 'center' })
         .text('Bangalore, Karnataka', 0, 225, { align: 'center' });

      // Introduction text
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#1f2937')
         .text('This is to certify that the following project has been completed and is covered under warranty:', 70, 270, { 
           width: pageWidth - 140, 
           align: 'center' 
         });

      // Project details box
      let yPos = 320;

      doc.rect(70, yPos, pageWidth - 140, 200)
         .fillAndStroke('#f9fafb', '#d1d5db');

      // Project details
      const details = [
        { label: 'Project ID', value: warrantyData.projectId },
        { label: 'Customer Name', value: warrantyData.customerName },
        { label: 'Project Type', value: warrantyData.projectType },
        { label: 'Project Location', value: warrantyData.projectLocation || 'N/A' },
        { label: 'Completion Date', value: new Date(warrantyData.completionDate).toLocaleDateString('en-IN') },
        { label: 'Warranty Period', value: `${warrantyData.warrantyPeriod} Months` },
        { label: 'Warranty Valid Till', value: new Date(warrantyData.warrantyExpiry).toLocaleDateString('en-IN') }
      ];

      yPos += 20;

      details.forEach(detail => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text(`${detail.label}:`, 90, yPos, { width: 150 })
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(detail.value, 250, yPos, { width: 250 });
        yPos += 25;
      });

      // Warranty terms section
      yPos = 550;

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('WARRANTY TERMS & CONDITIONS', 70, yPos);

      yPos += 25;

      const terms = [
        'This warranty covers defects in workmanship and materials used in the project.',
        'The warranty is valid only if regular maintenance as per our guidelines is followed.',
        'Warranty does not cover damage caused by misuse, neglect, accidents, or natural disasters.',
        'All warranty claims must be made in writing within the warranty period.',
        'The company reserves the right to inspect before accepting any warranty claim.',
        'Our liability is limited to repair or replacement of defective work only.'
      ];

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151');

      terms.forEach((term, index) => {
        doc.text(`${index + 1}. ${term}`, 90, yPos, { width: pageWidth - 180 });
        yPos += 20;
      });

      // Signature section
      yPos = 720;

      // Company seal placeholder
      doc.circle(120, yPos + 20, 30)
         .stroke('#9ca3af');

      doc.fontSize(7)
         .fillColor('#9ca3af')
         .text('COMPANY', 100, yPos + 15)
         .text('SEAL', 107, yPos + 25);

      // Signature line
      doc.moveTo(350, yPos + 30)
         .lineTo(500, yPos + 30)
         .stroke('#9ca3af');

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('Authorized Signatory', 360, yPos + 40)
         .font('Helvetica')
         .fontSize(8)
         .fillColor('#6b7280')
         .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 360, yPos + 55);

      doc.fontSize(9)
         .text(`For ${warrantyData.companyName || 'Sanjana Enterprises'}`, 360, yPos + 70);

      // Footer
      doc.fontSize(7)
         .fillColor('#9ca3af')
         .text('This certificate is computer-generated and valid without physical signature.', 0, 800, { 
           width: pageWidth, 
           align: 'center' 
         });

      doc.end();

      stream.on('finish', () => {
        resolve({ filename, filepath });
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};