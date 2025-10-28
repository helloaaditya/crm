import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

// Generate Simple Invoice PDF (Single Page)
export const generateInvoicePDF = async (invoiceData, type = 'invoice') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 30, 
        size: 'A4'
      });
      const filename = `${type}-${invoiceData.invoiceNumber}-${Date.now()}.pdf`;
      const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
      const filepath = path.join(uploadsDir, filename);
      
      console.log('PDF Generation Debug:', {
        invoiceNumber: invoiceData.invoiceNumber,
        filename,
        uploadsDir,
        filepath
      });

      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const companyInfo = invoiceData.companyInfo || {};
      const theme = invoiceData.theme || {};
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      
      // Theme settings with defaults
      const primaryColor = theme.primaryColor || '#1e40af';
      const secondaryColor = theme.secondaryColor || '#374151';
      const accentColor = theme.accentColor || '#f3f4f6';
      const fontSizes = theme.fontSizes || {};
      const logo = theme.logo || {};
      const layout = theme.layout || {};

      // ================== HEADER SECTION ==================
      
      // Logo (if enabled)
      let logoX = 30;
      if (logo.enabled && logo.url) {
        try {
          const logoWidth = logo.width || 80;
          const logoHeight = logo.height || 40;
          
          if (logo.position === 'right') {
            logoX = pageWidth - logoWidth - 30;
          } else if (logo.position === 'center') {
            logoX = (pageWidth - logoWidth) / 2;
          }
          
          // Load and display the actual logo
          doc.image(logo.url, logoX, 30, { width: logoWidth, height: logoHeight });
        } catch (error) {
          console.log('Logo loading failed:', error);
          // Fallback: show placeholder
          doc.rect(logoX, 30, logoWidth, logoHeight)
             .stroke('#e5e7eb');
          doc.fontSize(8)
             .fillColor('#9ca3af')
             .text('LOGO', logoX + 5, 30 + logoHeight/2 - 4, { width: logoWidth - 10, align: 'center' });
        }
      }
      
      // Company Name - Large and Bold
      const companyNameSize = fontSizes.companyName || 24;
      doc.fontSize(companyNameSize)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text(companyInfo.name || '', logoX, 30, {
           width: 300
         });

      // Company Address
      const headerTextSize = fontSizes.headerText || 8;
      doc.fontSize(headerTextSize)
         .font('Helvetica')
         .fillColor(secondaryColor);
      if (companyInfo.address) doc.text(`${companyInfo.address}`, logoX, 60);
      const locLine = [companyInfo.city, companyInfo.state, companyInfo.pincode].filter(Boolean).join(', ');
      if (locLine) doc.text(locLine, logoX, 70);
      const contactLine = [companyInfo.phone, companyInfo.email].filter(Boolean).join(' | ');
      if (contactLine) doc.text(`📞 ${contactLine}`, logoX, 80);

      // ================== INVOICE TYPE BOX ==================
      const invoiceTitle = type === 'quotation' ? 'QUOTATION' : 'TAX INVOICE';
      const boxX = 400;
      const boxY = 30;
      
      // Invoice type box
      doc.rect(boxX, boxY, 165, 60)
         .fillAndStroke(accentColor, primaryColor);

      const invoiceTitleSize = fontSizes.invoiceTitle || 14;
      doc.fontSize(invoiceTitleSize)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text(invoiceTitle, boxX + 5, boxY + 5, {
           width: 155,
           align: 'center'
         });

      // Invoice details in box
      const bodyTextSize = fontSizes.bodyText || 7;
      doc.fontSize(bodyTextSize)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text(`${type === 'quotation' ? 'Quotation' : 'Invoice'} No:`, boxX + 5, boxY + 25)
         .font('Helvetica-Bold')
         .text(invoiceData.invoiceNumber, boxX + 65, boxY + 25);

      doc.font('Helvetica')
         .text('Date:', boxX + 5, boxY + 35)
         .font('Helvetica-Bold')
         .text(new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN'), boxX + 50, boxY + 35);

      doc.font('Helvetica')
         .text('Due Date:', boxX + 5, boxY + 45)
         .font('Helvetica-Bold')
         .text(invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString('en-IN') : 'On Receipt', boxX + 50, boxY + 45);

      // Currency note (single place only)
      doc.fontSize(7)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text('Currency: INR', boxX + 5, boxY + 55, { width: 155, align: 'center' });

      // ================== BILL TO / BILL FROM SECTION ==================
      let yPos = 110;

      // Draw separator line
      doc.moveTo(30, yPos - 10)
         .lineTo(pageWidth - 30, yPos - 10)
         .stroke('#e5e7eb');

      // FROM section
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('FROM:', 30, yPos);

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#374151')
         .text(companyInfo.name || '', 30, yPos + 15);
      const taxLine = [companyInfo.gstin ? `GSTIN: ${companyInfo.gstin}` : null, companyInfo.pan ? `PAN: ${companyInfo.pan}` : null]
        .filter(Boolean).join(' | ');
      if (taxLine) doc.text(taxLine, 30, yPos + 25);

      // BILL TO section
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('BILL TO:', 300, yPos);

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#374151')
         .text(invoiceData.customerName, 300, yPos + 15);

      if (invoiceData.customerAddress) {
        const addr = typeof invoiceData.customerAddress === 'object'
          ? [
              invoiceData.customerAddress.street || invoiceData.customerAddress.address,
              [invoiceData.customerAddress.city, invoiceData.customerAddress.state, invoiceData.customerAddress.pincode].filter(Boolean).join(', ')
            ].filter(Boolean).join('\n')
          : String(invoiceData.customerAddress);
        doc.text(addr, 300, yPos + 25, { width: 250, lineGap: 2 });
      }

      let customerYPos = invoiceData.customerAddress ? yPos + 45 : yPos + 25;
      
      if (invoiceData.customerPhone) {
        doc.text(`Phone: ${invoiceData.customerPhone}`, 300, customerYPos);
        customerYPos += 10;
      }
      
      if (invoiceData.customerEmail) {
        doc.text(`Email: ${invoiceData.customerEmail}`, 300, customerYPos);
        customerYPos += 10;
      }
      
      if (invoiceData.isGST && invoiceData.gstNumber) {
        doc.font('Helvetica-Bold')
           .text(`GSTIN: ${invoiceData.gstNumber}`, 300, customerYPos);
      }

      // ================== ITEMS TABLE ==================
      yPos = 190;

      // Table header background
      doc.rect(30, yPos, pageWidth - 60, 20)
         .fill(primaryColor);

      // Table headers
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('#', 35, yPos + 6, { width: 15 })
         .text('DESCRIPTION', 55, yPos + 6, { width: 180 })
         .text('QTY', 240, yPos + 6, { width: 30, align: 'center' })
         .text('UNIT', 275, yPos + 6, { width: 35, align: 'center' })
         .text('RATE', 315, yPos + 6, { width: 50, align: 'right' })
         .text('AMOUNT', 375, yPos + 6, { width: 60, align: 'right' })
         .text('GST', 440, yPos + 6, { width: 30, align: 'right' })
         .text('TOTAL', 480, yPos + 6, { width: 70, align: 'right' });

      yPos += 20;

      // Table items (limited to fit on one page)
      const maxItems = 12; // Limit items to fit on one page
      const itemsToShow = invoiceData.items.slice(0, maxItems);
      
      itemsToShow.forEach((item, index) => {
        // Alternate row colors (if enabled)
        if (layout.showAlternateRows !== false && index % 2 === 0) {
          doc.rect(30, yPos, pageWidth - 60, 18)
             .fill(accentColor);
        }

        doc.fontSize(bodyTextSize)
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(index + 1, 35, yPos + 5, { width: 15 })
           .text(item.description, 55, yPos + 5, { width: 180 })
           .text(item.quantity.toString(), 240, yPos + 5, { width: 30, align: 'center' })
           .text(item.unit || 'Nos', 275, yPos + 5, { width: 35, align: 'center' })
           .text(`${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 315, yPos + 5, { width: 50, align: 'right' })
           .text(`${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 375, yPos + 5, { width: 60, align: 'right' })
           .text(invoiceData.isGST ? `${(invoiceData.cgst / invoiceData.subtotal * 100).toFixed(1)}%` : 'N/A', 440, yPos + 5, { width: 30, align: 'right' })
           .text(`${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, yPos + 5, { width: 70, align: 'right' });

        yPos += 18;
      });

      // If there are more items than we can show
      if (invoiceData.items.length > maxItems) {
        doc.fontSize(7)
           .font('Helvetica-Oblique')
           .fillColor('#6b7280')
           .text(`+${invoiceData.items.length - maxItems} more items...`, 55, yPos + 5);
        yPos += 18;
      }

      // Bottom border of table
      doc.moveTo(30, yPos)
         .lineTo(pageWidth - 30, yPos)
         .stroke('#e5e7eb');

      // ================== TOTALS SECTION ==================
      yPos += 10;

      const totalsX = 400;
      const amountX = 480;

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#374151');

      // Subtotal
      doc.text('Subtotal:', totalsX, yPos)
         .text(`${invoiceData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, amountX, yPos, { width: 70, align: 'right' });
      yPos += 15;

      // GST Details
      if (invoiceData.isGST) {
        if (invoiceData.cgst > 0) {
          doc.text(`CGST:`, totalsX, yPos)
             .text(`${invoiceData.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, amountX, yPos, { width: 70, align: 'right' });
          yPos += 12;
          
          doc.text(`SGST:`, totalsX, yPos)
             .text(`${invoiceData.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, amountX, yPos, { width: 70, align: 'right' });
          yPos += 12;
        }
        
        if (invoiceData.igst > 0) {
          doc.text(`IGST:`, totalsX, yPos)
             .text(`${invoiceData.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, amountX, yPos, { width: 70, align: 'right' });
          yPos += 12;
        }
      }

      // Discount
      if (invoiceData.discount > 0) {
        doc.fillColor('#dc2626')
           .text('Discount:', totalsX, yPos)
           .text(`-${invoiceData.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, amountX, yPos, { width: 70, align: 'right' });
        yPos += 15;
      }

      // Total box
      doc.rect(totalsX - 20, yPos, 170, 25)
         .fillAndStroke(primaryColor, primaryColor);

      const totalTextSize = fontSizes.totalText || 9;
      doc.fontSize(totalTextSize)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('TOTAL AMOUNT:', totalsX - 15, yPos + 7)
         .fontSize(totalTextSize + 2)
         .text(`${invoiceData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, amountX, yPos + 7, { width: 70, align: 'right' });

      yPos += 35;

      // Amount in words
      const amountInWords = convertNumberToWords(invoiceData.totalAmount);
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#374151')
         .text(`Amount in Words: ${amountInWords} Rupees Only`, 30, yPos, { width: 350 });

      yPos += 25;

      // ================== PAYMENT INFO & QR CODE ==================
      const bankDetails = invoiceData.bankDetails || {};
      
      // Payment information
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('BANK DETAILS:', 30, yPos);

      doc.fontSize(7)
         .font('Helvetica')
         .fillColor('#374151');
      let bankLineY = yPos + 12;
      if (bankDetails.bankName) { doc.text(`Bank: ${bankDetails.bankName}`, 30, bankLineY); bankLineY += 10; }
      if (bankDetails.accountName) { doc.text(`A/c Name: ${bankDetails.accountName}`, 30, bankLineY); bankLineY += 10; }
      if (bankDetails.accountNumber) { doc.text(`A/c No: ${bankDetails.accountNumber}`, 30, bankLineY); bankLineY += 10; }
      if (bankDetails.ifscCode) { doc.text(`IFSC: ${bankDetails.ifscCode}`, 30, bankLineY); bankLineY += 10; }
      if (bankDetails.branch) { doc.text(`Branch: ${bankDetails.branch}`, 180, yPos + 12); }
      if (bankDetails.upiId) { doc.text(`UPI ID: ${bankDetails.upiId}`, 180, yPos + 22); }

      // QR Code section
      if (invoiceData.qrCode?.enabled && bankDetails.upiId) {
        const amountParam = invoiceData.qrCode.includeAmount ? `&am=${Number(invoiceData.totalAmount || 0)}` : '';
        const upiString = `upi://pay?pa=${bankDetails.upiId}&pn=${encodeURIComponent(companyInfo.name || '')}${amountParam}&cu=INR`;

        QRCode.toDataURL(upiString, { width: 120, margin: 1 }, (err, url) => {
          // QR Code box
          doc.rect(400, yPos, 165, 120)
             .fillAndStroke('#f0fdf4', '#22c55e');

          doc.fontSize(8)
             .font('Helvetica-Bold')
             .fillColor('#166534')
             .text('SCAN TO PAY', 400, yPos + 5, { width: 165, align: 'center' });

          if (!err && url) {
            try {
              const base64 = url.split(',')[1];
              const buffer = Buffer.from(base64, 'base64');
              doc.image(buffer, 430, yPos + 20, { width: 100, height: 100 });
            } catch {}
          }

          if (invoiceData.qrCode.includeAmount && Number(invoiceData.totalAmount) > 0) {
            doc.fontSize(8)
               .font('Helvetica-Bold')
               .text(`${invoiceData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, yPos + 100, { width: 165, align: 'center' });
          }

          continueWithTermsAndFooter();
        });
      } else {
        continueWithTermsAndFooter();
      }

      function continueWithTermsAndFooter() {
        yPos += 90;

        // ================== DECLARATION ==================
        doc.fontSize(8)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('DECLARATION:', 30, yPos);

        doc.fontSize(7)
           .font('Helvetica')
           .fillColor('#4b5563')
           .text('WE DECLARE THAT THIS INVOICE SHOWS THE ACTUAL PRICE OF THE GOODS DESCRIBED AND THAT ALL', 30, yPos + 12, { width: 350, lineGap: 1 });
        
        doc.text('PARTICULARS ARE TRUE AND CORRECT', 30, yPos + 24, { width: 350, lineGap: 1 });

        yPos += 50;

        // ================== TERMS & CONDITIONS ==================
        const terms = invoiceData.terms || invoiceData.invoiceDefaults?.terms || '';

        doc.fontSize(8)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Terms & Conditions:', 30, yPos);

        doc.fontSize(6)
           .font('Helvetica')
           .fillColor('#4b5563')
           .text(terms, 30, yPos + 12, { width: 350, lineGap: 1 });

        // ================== FOOTER ==================
        // Signature section
        doc.fontSize(7)
           .font('Helvetica')
           .fillColor('#6b7280')
           .text('Authorized Signatory', pageWidth - 150, pageHeight - 40);

        // Footer text
        doc.fontSize(6)
           .fillColor('#9ca3af')
           .text('This is a computer-generated document. No signature required.', 30, pageHeight - 30, { 
             width: pageWidth - 60, 
             align: 'center' 
           });

        doc.end();
      }

      stream.on('finish', () => {
        console.log('PDF file written successfully:', { filename, filepath });
        resolve({ filename, filepath });
      });

      stream.on('error', (error) => {
        console.error('PDF stream error:', error);
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
         .text(payslipData.companyName || '', 0, 62, { align: 'center' });

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
         .text('This is a computer-generated document and does not require a signature.', 0, 790, { width: pageWidth, align: 'center' });

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
         .text(warrantyData.companyName || '', 0, 180, { align: 'center' });

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4b5563')
         .text(warrantyData.companyAddress || '', 0, 210, { align: 'center' });

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
         .text(`For ${warrantyData.companyName || ''}`, 360, yPos + 70);

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