import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export const generateInvoicePDF = async (invoiceData, type = 'invoice') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4'
      });
      
      const filename = `invoice-${invoiceData.invoiceNumber}-${Date.now()}.pdf`;
      const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
      const filepath = path.join(uploadsDir, filename);

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const companyInfo = invoiceData.companyInfo || {};
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);
      
      // Professional color scheme
      const primaryColor = '#1e3a8a';
      const accentColor = '#3b82f6';
      const lightGray = '#f3f4f6';
      const darkGray = '#4b5563';
      const textColor = '#1f2937';
      
      let yPos = margin;
      
      // ================== HEADER SECTION ==================
      
      // Company header with gradient effect
      doc.rect(margin, yPos, contentWidth, 60)
         .fill(primaryColor);
      
      // Tax Invoice label
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('TAX INVOICE', margin + 20, yPos + 15);
      
      // Company name and logo area
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('Sanjana', pageWidth - margin - 150, yPos + 10, { width: 140, align: 'right' });
      
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(lightGray)
         .text('ENTERPRISES', pageWidth - margin - 150, yPos + 37, { width: 140, align: 'right' });
      
      yPos += 75;
      
      // ================== INVOICE INFO SECTION ==================
      
      // Two-column layout for Invoice To and Invoice Details
      const leftColX = margin;
      const rightColX = pageWidth - margin - 200;
      const colStartY = yPos;
      
      // LEFT COLUMN - Invoice To
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('INVOICE TO', leftColX, yPos);
      
      yPos += 18;
      
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(textColor)
         .text(invoiceData.customerName || '', leftColX, yPos);
      
      yPos += 15;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(darkGray);
      
      if (invoiceData.customerAddress) {
        const addr = typeof invoiceData.customerAddress === 'object'
          ? `${invoiceData.customerAddress.street || invoiceData.customerAddress.address || ''}\n${invoiceData.customerAddress.city || ''}, ${invoiceData.customerAddress.state || ''} - ${invoiceData.customerAddress.pincode || ''}`
          : String(invoiceData.customerAddress);
        
        doc.text(addr, leftColX, yPos, { width: 280, lineGap: 3 });
      }
      
      // RIGHT COLUMN - Invoice Details
      yPos = colStartY;
      
      const detailsBox = [
        { label: 'Invoice No.', value: invoiceData.invoiceNumber || '' },
        { label: 'Date', value: new Date(invoiceData.invoiceDate || Date.now()).toLocaleDateString('en-IN') },
        { label: 'Payment Mode', value: invoiceData.paymentMode || 'As per terms' },
        { label: 'Order No.', value: invoiceData.buyerOrderNo || '-' },
        { label: 'Dispatch Through', value: invoiceData.dispatchThrough || '-' },
        { label: 'Destination', value: invoiceData.destination || invoiceData.customerAddress?.city || '-' },
        { label: 'Delivery Terms', value: invoiceData.deliveryTerms || '-' }
      ];
      
      doc.fontSize(9)
         .font('Helvetica');
      
      detailsBox.forEach((detail, index) => {
        const rowY = yPos + (index * 16);
        
        doc.fillColor(darkGray)
           .text(detail.label + ':', rightColX, rowY, { width: 110 });
        
        doc.fillColor(textColor)
           .font('Helvetica-Bold')
           .text(detail.value, rightColX + 115, rowY, { width: 65, align: 'left' });
        
        doc.font('Helvetica');
      });
      
      yPos += 140;
      
      // ================== ITEMS TABLE ==================
      
      // Table header with professional styling
      doc.rect(margin, yPos, contentWidth, 30)
         .fill(primaryColor);
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#ffffff');
      
      // Column definitions with proper spacing
      const cols = {
        slNo: { x: margin + 10, width: 30, label: 'No.' },
        desc: { x: margin + 45, width: 200, label: 'Item Description' },
        hsn: { x: margin + 250, width: 60, label: 'HSN/SAC' },
        qty: { x: margin + 315, width: 45, label: 'Qty' },
        unit: { x: margin + 365, width: 40, label: 'Unit' },
        rate: { x: margin + 410, width: 55, label: 'Rate (₹)' },
        disc: { x: margin + 470, width: 35, label: 'Disc%' },
        amount: { x: margin + 510, width: 55, label: 'Amount (₹)' }
      };
      
      Object.values(cols).forEach(col => {
        doc.text(col.label, col.x, yPos + 10, { width: col.width, align: col === cols.slNo ? 'center' : 'left' });
      });
      
      yPos += 30;
      
      // Table rows
      const items = invoiceData.items || [];
      const rowHeight = 25;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(textColor);
      
      items.forEach((item, index) => {
        // Alternating row colors
        if (index % 2 === 0) {
          doc.rect(margin, yPos, contentWidth, rowHeight)
             .fill(lightGray);
        }
        
        // Row border
        doc.rect(margin, yPos, contentWidth, rowHeight)
           .stroke('#d1d5db');
        
        const textY = yPos + 8;
        
        doc.fillColor(textColor);
        doc.text((index + 1).toString(), cols.slNo.x, textY, { width: cols.slNo.width, align: 'center' });
        doc.text(item.description || item.name, cols.desc.x, textY, { width: cols.desc.width, ellipsis: true });
        doc.text(item.hsnCode || '0000', cols.hsn.x, textY, { width: cols.hsn.width });
        doc.text(item.quantity.toString(), cols.qty.x, textY, { width: cols.qty.width, align: 'right' });
        doc.text(item.unit || 'Nos', cols.unit.x, textY, { width: cols.unit.width });
        doc.text('Rs.' + item.rate.toFixed(2), cols.rate.x, textY, { width: cols.rate.width, align: 'right' });
        doc.text(item.discount || '0', cols.disc.x, textY, { width: cols.disc.width, align: 'center' });
        doc.font('Helvetica-Bold')
           .text(item.amount.toFixed(2), cols.amount.x, textY, { width: cols.amount.width, align: 'right' });
        doc.font('Helvetica');
        
        yPos += rowHeight;
      });
      
      // Empty rows to maintain table structure
      const minRows = 5;
      for (let i = items.length; i < minRows; i++) {
        if (i % 2 === 0) {
          doc.rect(margin, yPos, contentWidth, rowHeight)
             .fill(lightGray);
        }
        doc.rect(margin, yPos, contentWidth, rowHeight)
           .stroke('#d1d5db');
        yPos += rowHeight;
      }
      
      yPos += 15;
      
      // ================== AMOUNT SECTION ==================
      
      // Amount in words
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Amount in Words:', margin, yPos);
      
      yPos += 15;
      
      const amountInWords = convertNumberToWords(invoiceData.subtotal || 0);
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(textColor)
         .text(amountInWords + ' Rupees Only', margin, yPos, { width: 350 });
      
      // Subtotal box
      const totalBoxY = yPos - 15;
      const totalBoxX = pageWidth - margin - 150;
      
      doc.rect(totalBoxX, totalBoxY, 150, 35)
         .fill(primaryColor);
      
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('SUBTOTAL', totalBoxX + 10, totalBoxY + 10, { width: 80 });
      
      doc.fontSize(14)
         .text('₹ ' + (invoiceData.subtotal || 0).toFixed(2), totalBoxX + 10, totalBoxY + 10, { width: 130, align: 'right' });
      
      yPos += 50;
      
      // ================== TAX BREAKDOWN ==================
      
      doc.rect(margin, yPos, contentWidth, 25)
         .fill(primaryColor);
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#ffffff');
      
      const taxCols = {
        hsn: { x: margin + 10, width: 70, label: 'HSN/SAC' },
        taxable: { x: margin + 85, width: 80, label: 'Taxable Value' },
        cgstRate: { x: margin + 170, width: 50, label: 'CGST %' },
        cgstAmt: { x: margin + 225, width: 70, label: 'CGST Amt' },
        sgstRate: { x: margin + 300, width: 50, label: 'SGST %' },
        sgstAmt: { x: margin + 355, width: 70, label: 'SGST Amt' },
        total: { x: margin + 430, width: 85, label: 'Total Tax' }
      };
      
      Object.values(taxCols).forEach(col => {
        doc.text(col.label, col.x, yPos + 8, { width: col.width, align: 'center' });
      });
      
      yPos += 25;
      
      // Tax row
      doc.rect(margin, yPos, contentWidth, 25)
         .fill(lightGray)
         .stroke('#d1d5db');
      
      const taxableValue = invoiceData.subtotal || 0;
      const cgstAmount = invoiceData.cgst || 0;
      const sgstAmount = invoiceData.sgst || 0;
      const totalTax = cgstAmount + sgstAmount + (invoiceData.igst || 0);
      const cgstRate = taxableValue > 0 ? ((cgstAmount / taxableValue) * 100).toFixed(1) : '0.0';
      const sgstRate = taxableValue > 0 ? ((sgstAmount / taxableValue) * 100).toFixed(1) : '0.0';
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(textColor);
      
      const taxY = yPos + 8;
      doc.text('Various', taxCols.hsn.x, taxY, { width: taxCols.hsn.width, align: 'center' });
      doc.text('₹' + taxableValue.toFixed(2), taxCols.taxable.x, taxY, { width: taxCols.taxable.width, align: 'right' });
      doc.text(cgstRate + '%', taxCols.cgstRate.x, taxY, { width: taxCols.cgstRate.width, align: 'center' });
      doc.text('₹' + cgstAmount.toFixed(2), taxCols.cgstAmt.x, taxY, { width: taxCols.cgstAmt.width, align: 'right' });
      doc.text(sgstRate + '%', taxCols.sgstRate.x, taxY, { width: taxCols.sgstRate.width, align: 'center' });
      doc.text('₹' + sgstAmount.toFixed(2), taxCols.sgstAmt.x, taxY, { width: taxCols.sgstAmt.width, align: 'right' });
      doc.font('Helvetica-Bold')
         .text('₹' + totalTax.toFixed(2), taxCols.total.x, taxY, { width: taxCols.total.width, align: 'right' });
      
      yPos += 40;
      
      // Tax amount in words
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Tax Amount in Words:', margin, yPos);
      
      yPos += 15;
      
      const taxAmountInWords = convertNumberToWords(totalTax);
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(darkGray)
         .text(taxAmountInWords + ' Rupees Only', margin, yPos, { width: contentWidth });
      
      yPos += 30;
      
      // ================== GRAND TOTAL ==================
      
      const grandTotal = taxableValue + totalTax;
      
      doc.rect(pageWidth - margin - 200, yPos, 200, 40)
         .fill(accentColor);
      
      doc.fontSize(13)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('GRAND TOTAL', pageWidth - margin - 190, yPos + 10, { width: 100 });
      
      doc.fontSize(16)
         .text('₹ ' + grandTotal.toFixed(2), pageWidth - margin - 190, yPos + 10, { width: 180, align: 'right' });
      
      yPos += 55;
      
      // ================== DECLARATION ==================
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('DECLARATION', margin, yPos);
      
      yPos += 15;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(darkGray)
         .text(
           'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
           margin,
           yPos,
           { width: contentWidth, lineGap: 2 }
         );
      
      yPos += 30;
      
      // ================== BANK DETAILS & QR CODE ==================
      
      const footerSectionY = yPos;
      
      // Bank details box
      doc.rect(margin, yPos, 280, 90)
         .stroke('#d1d5db');
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('BANK DETAILS', margin + 10, yPos + 10);
      
      yPos += 25;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(textColor);
      
      const bankDetails = invoiceData.bankDetails || {};
      doc.text('Bank Name: ' + (bankDetails.bankName || 'AXIS BANK'), margin + 10, yPos, { width: 260 });
      yPos += 12;
      doc.text('Account No: ' + (bankDetails.accountNumber || '910020023507337'), margin + 10, yPos, { width: 260 });
      yPos += 12;
      doc.text('Branch: ' + (bankDetails.branch || 'SAHAKARNAGAR'), margin + 10, yPos, { width: 260 });
      yPos += 12;
      doc.text('IFSC Code: ' + (bankDetails.ifscCode || 'UTIB0000561'), margin + 10, yPos, { width: 260 });
      
      // QR Code and signature box
      const rightBoxX = margin + 290;
      yPos = footerSectionY;
      
      doc.rect(rightBoxX, yPos, 225, 90)
         .stroke('#d1d5db');
      
      // Generate QR Code
      if (bankDetails.upiId) {
        const upiString = `upi://pay?pa=${bankDetails.upiId}&pn=${encodeURIComponent(
          companyInfo.name || 'Sanjana Enterprises'
        )}&am=${grandTotal}&cu=INR`;
        
        QRCode.toDataURL(upiString, { width: 80, height: 80, margin: 1 }, (err, url) => {
          if (!err && url) {
            doc.fontSize(8)
               .font('Helvetica-Bold')
               .fillColor(primaryColor)
               .text('Scan to Pay', rightBoxX + 10, yPos + 10);
            
            try {
              const base64 = url.split(',')[1];
              const buffer = Buffer.from(base64, 'base64');
              doc.image(buffer, rightBoxX + 15, yPos + 25, { width: 60, height: 60 });
            } catch (error) {
              console.log('QR code error:', error);
            }
          }
          
          finishPDF();
        });
      } else {
        finishPDF();
      }
      
      function finishPDF() {
        // Authorized signature
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor(textColor)
           .text('For Sanjana Enterprises', rightBoxX + 90, footerSectionY + 30);
        
        doc.moveTo(rightBoxX + 90, footerSectionY + 70)
           .lineTo(rightBoxX + 210, footerSectionY + 70)
           .stroke('#000000');
        
        doc.fontSize(8)
           .font('Helvetica')
           .text('Authorized Signatory', rightBoxX + 90, footerSectionY + 75, { width: 120, align: 'center' });
        
        // ================== FOOTER ==================
        
        const footerY = pageHeight - 25;
        
        doc.rect(0, footerY - 5, pageWidth, 30)
           .fill(primaryColor);
        
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#ffffff')
           .text(
             'This is a computer generated invoice',
             0,
             footerY + 5,
             { width: pageWidth, align: 'center' }
           );
        
        doc.end();
      }
      
      stream.on('finish', () => {
        console.log('PDF generated successfully:', filepath);
        resolve({ filename, filepath });
      });
      
      stream.on('error', (error) => {
        console.error('PDF generation error:', error);
        reject(error);
      });
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      reject(error);
    }
  });
};

// Helper function to convert number to words (Indian system)
function convertNumberToWords(num) {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];
  
  if (num === 0) return 'Zero';
  
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

export const generateWarrantyCertificate = async (warrantyData) => {
  return Promise.resolve({ filename: 'warranty.pdf', filepath: '/path/to/warranty.pdf' });
};