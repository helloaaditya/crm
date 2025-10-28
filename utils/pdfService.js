import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

// Generate Professional Invoice PDF with Clean Design
export const generateInvoicePDF = async (invoiceData, type = 'invoice') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4'
      });
      const filename = `${type}-${invoiceData.invoiceNumber}-${Date.now()}.pdf`;
      const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
      const filepath = path.join(uploadsDir, filename);

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const companyInfo = invoiceData.companyInfo || {};
      const theme = invoiceData.theme || {};
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      
      // Theme colors with professional defaults
      const primaryColor = theme.primaryColor || '#2563eb';
      const secondaryColor = theme.secondaryColor || '#1e293b';
      const accentColor = theme.accentColor || '#f8fafc';
      
      // ================== HEADER SECTION ==================
      
      // Top accent bar
      doc.rect(0, 0, pageWidth, 8)
         .fill(primaryColor);
      
      let yPos = 35;
      
      // Company name - large and prominent
      doc.fontSize(26)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text(companyInfo.name || 'COMPANY NAME', 40, yPos);
      
      yPos += 35;
      
      // Company details - left side
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(secondaryColor);
      
      if (companyInfo.address) {
        doc.text(companyInfo.address, 40, yPos);
        yPos += 12;
      }
      
      const cityLine = [companyInfo.city, companyInfo.state, companyInfo.pincode]
        .filter(Boolean).join(', ');
      if (cityLine) {
        doc.text(cityLine, 40, yPos);
        yPos += 12;
      }
      
      if (companyInfo.phone) {
        doc.text(`Phone: ${companyInfo.phone}`, 40, yPos);
        yPos += 12;
      }
      
      if (companyInfo.email) {
        doc.text(`Email: ${companyInfo.email}`, 40, yPos);
        yPos += 12;
      }
      
      // Tax details
      yPos += 5;
      if (companyInfo.gstin) {
        doc.font('Helvetica-Bold')
           .text(`GSTIN: ${companyInfo.gstin}`, 40, yPos);
        yPos += 12;
      }
      
      if (companyInfo.pan) {
        doc.font('Helvetica')
           .text(`PAN: ${companyInfo.pan}`, 40, yPos);
      }
      
      // ================== INVOICE INFO BOX - Right Side ==================
      const boxX = 350;
      const boxY = 35;
      const boxWidth = 205;
      
      // Invoice type header
      const invoiceTitle = type === 'quotation' ? 'QUOTATION' : 'TAX INVOICE';
      
      doc.rect(boxX, boxY, boxWidth, 35)
         .fill(primaryColor);
      
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text(invoiceTitle, boxX, boxY + 10, {
           width: boxWidth,
           align: 'center'
         });
      
      // Invoice details box
      doc.rect(boxX, boxY + 35, boxWidth, 85)
         .fillAndStroke(accentColor, '#cbd5e1');
      
      let detailY = boxY + 45;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(secondaryColor);
      
      // Invoice Number
      doc.text(`${type === 'quotation' ? 'Quotation' : 'Invoice'} No:`, boxX + 10, detailY);
      doc.font('Helvetica-Bold')
         .text(invoiceData.invoiceNumber, boxX + 90, detailY, {
           width: boxWidth - 100,
           align: 'right'
         });
      
      detailY += 18;
      
      // Invoice Date
      doc.font('Helvetica')
         .text('Date:', boxX + 10, detailY);
      doc.font('Helvetica-Bold')
         .text(
           new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN'),
           boxX + 90,
           detailY,
           { width: boxWidth - 100, align: 'right' }
         );
      
      detailY += 18;
      
      // Due Date
      doc.font('Helvetica')
         .text('Due Date:', boxX + 10, detailY);
      doc.font('Helvetica-Bold')
         .text(
           invoiceData.dueDate 
             ? new Date(invoiceData.dueDate).toLocaleDateString('en-IN')
             : 'On Receipt',
           boxX + 90,
           detailY,
           { width: boxWidth - 100, align: 'right' }
         );
      
      detailY += 18;
      
      // Currency
      doc.font('Helvetica')
         .text('Currency:', boxX + 10, detailY);
      doc.font('Helvetica-Bold')
         .text('INR (₹)', boxX + 90, detailY, {
           width: boxWidth - 100,
           align: 'right'
         });
      
      // ================== BILLING SECTION ==================
      yPos = 180;
      
      // Horizontal separator
      doc.moveTo(40, yPos)
         .lineTo(pageWidth - 40, yPos)
         .lineWidth(1)
         .stroke('#cbd5e1');
      
      yPos += 20;
      
      // Two column layout for billing addresses
      const leftColX = 40;
      const rightColX = 300;
      const colWidth = 240;
      
      // FROM Section
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('FROM:', leftColX, yPos);
      
      yPos += 18;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(secondaryColor)
         .text(companyInfo.name || '', leftColX, yPos, { width: colWidth });
      
      yPos += 15;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#475569');
      
      if (companyInfo.gstin || companyInfo.pan) {
        const taxInfo = [
          companyInfo.gstin ? `GSTIN: ${companyInfo.gstin}` : null,
          companyInfo.pan ? `PAN: ${companyInfo.pan}` : null
        ].filter(Boolean).join('\n');
        
        doc.text(taxInfo, leftColX, yPos, { width: colWidth, lineGap: 2 });
      }
      
      // BILL TO Section
      let billToY = 180 + 20;
      
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('BILL TO:', rightColX, billToY);
      
      billToY += 18;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(secondaryColor)
         .text(invoiceData.customerName || '', rightColX, billToY, { width: colWidth });
      
      billToY += 15;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#475569');
      
      if (invoiceData.customerAddress) {
        const addr = typeof invoiceData.customerAddress === 'object'
          ? [
              invoiceData.customerAddress.street || invoiceData.customerAddress.address,
              [
                invoiceData.customerAddress.city,
                invoiceData.customerAddress.state,
                invoiceData.customerAddress.pincode
              ].filter(Boolean).join(', ')
            ].filter(Boolean).join('\n')
          : String(invoiceData.customerAddress);
        
        doc.text(addr, rightColX, billToY, { width: colWidth, lineGap: 3 });
        billToY += doc.heightOfString(addr, { width: colWidth, lineGap: 3 }) + 5;
      }
      
      if (invoiceData.customerPhone) {
        doc.text(`Phone: ${invoiceData.customerPhone}`, rightColX, billToY);
        billToY += 12;
      }
      
      if (invoiceData.customerEmail) {
        doc.text(`Email: ${invoiceData.customerEmail}`, rightColX, billToY);
        billToY += 12;
      }
      
      if (invoiceData.isGST && invoiceData.gstNumber) {
        doc.font('Helvetica-Bold')
           .text(`GSTIN: ${invoiceData.gstNumber}`, rightColX, billToY);
      }
      
      // ================== ITEMS TABLE ==================
      yPos = Math.max(yPos + 40, billToY + 25);
      
      // Table header
      doc.rect(40, yPos, pageWidth - 80, 25)
         .fill(primaryColor);
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#ffffff');
      
      // Column headers with proper spacing
      doc.text('#', 45, yPos + 8, { width: 25 });
      doc.text('DESCRIPTION', 75, yPos + 8, { width: 190 });
      doc.text('QTY', 270, yPos + 8, { width: 35, align: 'center' });
      doc.text('UNIT', 310, yPos + 8, { width: 40, align: 'center' });
      doc.text('RATE', 355, yPos + 8, { width: 55, align: 'right' });
      doc.text('AMOUNT', 415, yPos + 8, { width: 60, align: 'right' });
      doc.text('GST%', 480, yPos + 8, { width: 35, align: 'right' });
      doc.text('TOTAL', 520, yPos + 8, { width: 35, align: 'right' });
      
      yPos += 25;
      
      // Table items
      const maxItems = 10;
      const itemsToShow = invoiceData.items.slice(0, maxItems);
      
      itemsToShow.forEach((item, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(40, yPos, pageWidth - 80, 22)
             .fill(accentColor);
        }
        
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(secondaryColor);
        
        const itemY = yPos + 6;
        
        doc.text((index + 1).toString(), 45, itemY, { width: 25 });
        doc.text(item.description, 75, itemY, { width: 190 });
        doc.text(item.quantity.toString(), 270, itemY, { width: 35, align: 'center' });
        doc.text(item.unit || 'Nos', 310, itemY, { width: 40, align: 'center' });
        doc.text(
          item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          355,
          itemY,
          { width: 55, align: 'right' }
        );
        doc.text(
          item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          415,
          itemY,
          { width: 60, align: 'right' }
        );
        
        const gstRate = invoiceData.isGST && invoiceData.subtotal > 0
          ? ((invoiceData.cgst + invoiceData.sgst + invoiceData.igst) / invoiceData.subtotal * 100).toFixed(1)
          : '0';
        
        doc.text(gstRate + '%', 480, itemY, { width: 35, align: 'right' });
        doc.text(
          item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          520,
          itemY,
          { width: 35, align: 'right' }
        );
        
        yPos += 22;
      });
      
      // More items indicator
      if (invoiceData.items.length > maxItems) {
        doc.fontSize(8)
           .font('Helvetica-Oblique')
           .fillColor('#64748b')
           .text(
             `... and ${invoiceData.items.length - maxItems} more item(s)`,
             75,
             yPos + 5
           );
        yPos += 20;
      }
      
      // Table bottom border
      doc.moveTo(40, yPos)
         .lineTo(pageWidth - 40, yPos)
         .lineWidth(1)
         .stroke('#cbd5e1');
      
      // ================== TOTALS SECTION ==================
      yPos += 20;
      
      const totalsX = 380;
      const amountX = 480;
      const amountWidth = 75;
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(secondaryColor);
      
      // Subtotal
      doc.text('Subtotal:', totalsX, yPos);
      doc.text(
        invoiceData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        amountX,
        yPos,
        { width: amountWidth, align: 'right' }
      );
      yPos += 16;
      
      // GST breakdown
      if (invoiceData.isGST) {
        if (invoiceData.cgst > 0) {
          doc.text('CGST:', totalsX, yPos);
          doc.text(
            invoiceData.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            amountX,
            yPos,
            { width: amountWidth, align: 'right' }
          );
          yPos += 14;
          
          doc.text('SGST:', totalsX, yPos);
          doc.text(
            invoiceData.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            amountX,
            yPos,
            { width: amountWidth, align: 'right' }
          );
          yPos += 14;
        }
        
        if (invoiceData.igst > 0) {
          doc.text('IGST:', totalsX, yPos);
          doc.text(
            invoiceData.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            amountX,
            yPos,
            { width: amountWidth, align: 'right' }
          );
          yPos += 14;
        }
      }
      
      // Discount
      if (invoiceData.discount > 0) {
        doc.fillColor('#dc2626')
           .text('Discount:', totalsX, yPos)
           .text(
             `- ${invoiceData.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
             amountX,
             yPos,
             { width: amountWidth, align: 'right' }
           );
        yPos += 16;
      }
      
      // Total amount box
      yPos += 5;
      
      doc.rect(totalsX - 15, yPos - 5, 190, 30)
         .fillAndStroke(primaryColor, primaryColor);
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('TOTAL AMOUNT:', totalsX - 10, yPos + 5);
      
      doc.fontSize(14)
         .text(
           `₹ ${invoiceData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
           amountX,
           yPos + 5,
           { width: amountWidth, align: 'right' }
         );
      
      yPos += 40;
      
      // Amount in words
      const amountInWords = convertNumberToWords(invoiceData.totalAmount);
      
      doc.rect(40, yPos, pageWidth - 80, 25)
         .fillAndStroke('#f1f5f9', '#cbd5e1');
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(secondaryColor)
         .text('Amount in Words:', 45, yPos + 8);
      
      doc.font('Helvetica')
         .text(
           `${amountInWords} Rupees Only`,
           150,
           yPos + 8,
           { width: pageWidth - 195 }
         );
      
      yPos += 35;
      
      // ================== PAYMENT INFO & QR CODE ==================
      const bankDetails = invoiceData.bankDetails || {};
      
      // Bank details section
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('BANK DETAILS', 40, yPos);
      
      yPos += 18;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(secondaryColor);
      
      const bankInfo = [
        bankDetails.bankName ? `Bank: ${bankDetails.bankName}` : null,
        bankDetails.accountName ? `Account Name: ${bankDetails.accountName}` : null,
        bankDetails.accountNumber ? `Account No: ${bankDetails.accountNumber}` : null,
        bankDetails.ifscCode ? `IFSC Code: ${bankDetails.ifscCode}` : null,
        bankDetails.branch ? `Branch: ${bankDetails.branch}` : null,
        bankDetails.upiId ? `UPI ID: ${bankDetails.upiId}` : null
      ].filter(Boolean);
      
      bankInfo.forEach(info => {
        doc.text(info, 40, yPos);
        yPos += 12;
      });
      
      // QR Code
      if (invoiceData.qrCode?.enabled && bankDetails.upiId) {
        const qrX = 380;
        const qrY = yPos - (bankInfo.length * 12) - 18;
        
        const amountParam = invoiceData.qrCode.includeAmount
          ? `&am=${invoiceData.totalAmount}`
          : '';
        const upiString = `upi://pay?pa=${bankDetails.upiId}&pn=${encodeURIComponent(
          companyInfo.name || ''
        )}${amountParam}&cu=INR`;
        
        QRCode.toDataURL(upiString, { width: 140, margin: 1 }, (err, url) => {
          if (!err && url) {
            // QR Code container
            doc.rect(qrX, qrY, 175, 140)
               .fillAndStroke('#f0fdf4', '#22c55e');
            
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#166534')
               .text('SCAN TO PAY', qrX, qrY + 8, { width: 175, align: 'center' });
            
            try {
              const base64 = url.split(',')[1];
              const buffer = Buffer.from(base64, 'base64');
              doc.image(buffer, qrX + 27.5, qrY + 25, { width: 120, height: 120 });
            } catch (error) {
              console.log('QR code image error:', error);
            }
          }
          
          continueWithFooter();
        });
      } else {
        continueWithFooter();
      }
      
      function continueWithFooter() {
        // ================== TERMS & CONDITIONS ==================
        yPos += 20;
        
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }
        
        const terms = invoiceData.terms || invoiceData.invoiceDefaults?.terms || '';
        
        if (terms) {
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(primaryColor)
             .text('TERMS & CONDITIONS', 40, yPos);
          
          yPos += 15;
          
          doc.fontSize(8)
             .font('Helvetica')
             .fillColor('#475569')
             .text(terms, 40, yPos, { width: pageWidth - 80, lineGap: 2 });
          
          yPos += doc.heightOfString(terms, { width: pageWidth - 80, lineGap: 2 }) + 20;
        }
        
        // ================== DECLARATION ==================
        if (yPos < 700) {
          doc.fontSize(8)
             .font('Helvetica-Bold')
             .fillColor(secondaryColor)
             .text('DECLARATION:', 40, yPos);
          
          yPos += 12;
          
          doc.fontSize(7)
             .font('Helvetica')
             .fillColor('#64748b')
             .text(
               'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
               40,
               yPos,
               { width: pageWidth - 80, lineGap: 1 }
             );
        }
        
        // ================== FOOTER ==================
        const footerY = pageHeight - 60;
        
        // Signature
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#64748b')
           .text('Authorized Signatory', pageWidth - 150, footerY);
        
        doc.moveTo(pageWidth - 150, footerY + 30)
           .lineTo(pageWidth - 40, footerY + 30)
           .stroke('#cbd5e1');
        
        // Bottom accent bar
        doc.rect(0, pageHeight - 25, pageWidth, 2)
           .fill(primaryColor);
        
        // Footer text
        doc.fontSize(7)
           .fillColor('#94a3b8')
           .text(
             'This is a computer-generated document. No signature required.',
             0,
             pageHeight - 20,
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