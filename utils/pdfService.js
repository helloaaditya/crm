import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

// Exact replica of Sanjana Enterprises Tax Invoice Format
export const generateInvoicePDF = async (invoiceData, type = 'invoice') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 30, 
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
      const pageWidth = 595.28;  // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      
      // Dark Blue Color (matching image)
      const darkBlue = '#1e3a8a';
      const lightBlue = '#60a5fa';
      
      let yPos = 40;
      
      // ================== HEADER SECTION ==================
      
      // Dark blue header bar with "TAX INVOICE"
      doc.rect(30, yPos, 350, 40)
         .fill(darkBlue);
      
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('TAX INVOICE', 40, yPos + 10);
      
      // Company Logo and Name (Right Side)
      // You can add logo image here if available
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(lightBlue)
         .text('Sanjana', 420, yPos);
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(darkBlue)
         .text('ENTERPRISES', 420, yPos + 22);
      
      yPos += 50;
      
      // ================== INVOICE TO & INVOICE DETAILS ==================
      
      // Left Side - Invoice To
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('INVOICE TO:', 30, yPos);
      
      yPos += 15;
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text(invoiceData.customerName || '', 30, yPos);
      
      yPos += 12;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#333333');
      
      if (invoiceData.customerAddress) {
        const addr = typeof invoiceData.customerAddress === 'object'
          ? `${invoiceData.customerAddress.street || invoiceData.customerAddress.address || ''}, ${invoiceData.customerAddress.city || ''}, ${invoiceData.customerAddress.state || ''} - ${invoiceData.customerAddress.pincode || ''}`
          : String(invoiceData.customerAddress);
        
        doc.text(addr, 30, yPos, { width: 250 });
        yPos += doc.heightOfString(addr, { width: 250 }) + 5;
      }
      
      // Right Side - Invoice Details
      let detailY = 90;
      const labelX = 390;
      const valueX = 520;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#000000');
      
      // Invoice #
      doc.text('INVOICE #', labelX, detailY);
      doc.text(invoiceData.invoiceNumber || '', valueX, detailY);
      detailY += 12;
      
      // Date
      doc.text('DATE:', labelX, detailY);
      doc.text(new Date(invoiceData.invoiceDate || Date.now()).toLocaleDateString('en-IN'), valueX, detailY);
      detailY += 12;
      
      // Mode/Terms of Payment
      doc.text('MODE/TERMS OF PAYMENT:', labelX, detailY);
      doc.text(invoiceData.paymentMode || 'As per terms', valueX, detailY);
      detailY += 12;
      
      // Buyer's Order #
      doc.text('BUYER\'S ORDER #:', labelX, detailY);
      doc.text(invoiceData.buyerOrderNo || '-', valueX, detailY);
      detailY += 12;
      
      // Dispatch Through
      doc.text('DISPATCH THROUGH:', labelX, detailY);
      doc.text(invoiceData.dispatchThrough || '-', valueX, detailY);
      detailY += 12;
      
      // Destination
      doc.text('DESTINATION:', labelX, detailY);
      doc.text(invoiceData.destination || invoiceData.customerAddress?.city || '-', valueX, detailY);
      detailY += 12;
      
      // Terms of Delivery
      doc.text('TERMS OF DELIVERY:', labelX, detailY);
      doc.text(invoiceData.deliveryTerms || '-', valueX, detailY);
      
      // ================== ITEMS TABLE ==================
      yPos = Math.max(yPos, detailY) + 25;
      
      // Table Header
      doc.rect(30, yPos, 535, 20)
         .fill(darkBlue);
      
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#ffffff');
      
      const colPositions = {
        slNo: 35,
        desc: 55,
        hsn: 230,
        qty: 280,
        unit: 315,
        price: 350,
        dis: 395,
        amount: 440
      };
      
      doc.text('SL. NO.', colPositions.slNo, yPos + 6);
      doc.text('ITEM DESCRIPTION', colPositions.desc, yPos + 6);
      doc.text('HSN/SAC', colPositions.hsn, yPos + 6);
      doc.text('QUANTITY', colPositions.qty, yPos + 6);
      doc.text('UNIT', colPositions.unit, yPos + 6);
      doc.text('PRICE', colPositions.price, yPos + 6);
      doc.text('DIS. %', colPositions.dis, yPos + 6);
      doc.text('AMOUNT', colPositions.amount, yPos + 6);
      
      yPos += 20;
      
      // Table Rows
      const items = invoiceData.items || [];
      const rowHeight = 18;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#000000');
      
      items.forEach((item, index) => {
        // Draw row border
        doc.rect(30, yPos, 535, rowHeight)
           .stroke('#cccccc');
        
        doc.text((index + 1).toString(), colPositions.slNo, yPos + 5);
        doc.text(item.description || item.name, colPositions.desc, yPos + 5, { width: 170 });
        doc.text(item.hsnCode || '0000', colPositions.hsn, yPos + 5);
        doc.text(item.quantity.toString(), colPositions.qty, yPos + 5);
        doc.text(item.unit || 'Nos', colPositions.unit, yPos + 5);
        doc.text(item.rate.toFixed(2), colPositions.price, yPos + 5);
        doc.text(item.discount || '0', colPositions.dis, yPos + 5);
        doc.text(item.amount.toFixed(2), colPositions.amount, yPos + 5);
        
        yPos += rowHeight;
      });
      
      // Add 5 empty rows if less than 5 items
      for (let i = items.length; i < 5; i++) {
        doc.rect(30, yPos, 535, rowHeight)
           .stroke('#cccccc');
        yPos += rowHeight;
      }
      
      // ================== AMOUNT IN WORDS & TOTAL ==================
      yPos += 5;
      
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('AMOUNT IN WORDS:', 30, yPos);
      
      const amountInWords = convertNumberToWords(invoiceData.subtotal || 0);
      doc.font('Helvetica')
         .text(amountInWords + ' Rupees Only', 30, yPos + 12, { width: 350 });
      
      // Total Box
      doc.rect(440, yPos, 125, 25)
         .fill(darkBlue);
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text('TOTAL:', 445, yPos + 8);
      
      doc.fontSize(11)
         .text('₹ ' + (invoiceData.subtotal || 0).toFixed(2), 500, yPos + 7);
      
      yPos += 40;
      
      // ================== TAX BREAKDOWN TABLE ==================
      
      // Tax Table Header
      doc.rect(30, yPos, 535, 20)
         .fill(darkBlue);
      
      doc.fontSize(7)
         .font('Helvetica-Bold')
         .fillColor('#ffffff');
      
      doc.text('HSN/SAC', 35, yPos + 7);
      doc.text('TAXABLE', 100, yPos + 3);
      doc.text('VALUE', 105, yPos + 10);
      doc.text('CGST', 170, yPos + 7);
      doc.text('RATE', 165, yPos + 12, { width: 20 });
      doc.text('AMOUNT', 195, yPos + 12, { width: 30 });
      doc.text('SCST/UTGST', 255, yPos + 7);
      doc.text('RATE', 255, yPos + 12, { width: 20 });
      doc.text('AMOUNT', 285, yPos + 12, { width: 30 });
      doc.text('AMOUNT', 350, yPos + 7);
      
      yPos += 20;
      
      // Tax rows (simplified - showing totals)
      const taxRowHeight = 18;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#000000');
      
      // Row 1 - Aggregated taxes
      doc.rect(30, yPos, 535, taxRowHeight)
         .stroke('#cccccc');
      
      const taxableValue = invoiceData.subtotal || 0;
      const cgstAmount = invoiceData.cgst || 0;
      const sgstAmount = invoiceData.sgst || 0;
      const totalTax = cgstAmount + sgstAmount + (invoiceData.igst || 0);
      const cgstRate = taxableValue > 0 ? ((cgstAmount / taxableValue) * 100).toFixed(1) : '0';
      const sgstRate = taxableValue > 0 ? ((sgstAmount / taxableValue) * 100).toFixed(1) : '0';
      
      doc.text('Various', 35, yPos + 5);
      doc.text(taxableValue.toFixed(2), 100, yPos + 5);
      doc.text(cgstRate + '%', 165, yPos + 5);
      doc.text(cgstAmount.toFixed(2), 195, yPos + 5);
      doc.text(sgstRate + '%', 255, yPos + 5);
      doc.text(sgstAmount.toFixed(2), 285, yPos + 5);
      doc.text(totalTax.toFixed(2), 350, yPos + 5);
      
      yPos += taxRowHeight;
      
      // Row 2 - Empty
      doc.rect(30, yPos, 535, taxRowHeight)
         .stroke('#cccccc');
      
      yPos += taxRowHeight + 5;
      
      // ================== TAX AMOUNT IN WORDS ==================
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('TAX AMOUNT IN WORDS:', 30, yPos);
      
      const taxAmountInWords = convertNumberToWords(totalTax);
      doc.font('Helvetica')
         .text(taxAmountInWords + ' Rupees Only', 30, yPos + 12, { width: 535 });
      
      yPos += 30;
      
      // ================== DECLARATION ==================
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('DECLARATION:', 30, yPos);
      
      yPos += 12;
      
      doc.fontSize(7)
         .font('Helvetica')
         .fillColor('#333333')
         .text(
           'WE DECLARE THAT THIS INVOICE SHOWS THE ACTUAL PRICE OF THE GOODS DESCRIBED AND THAT ALL PARTICULARS ARE TRUE AND CORRECT.',
           30,
           yPos,
           { width: 535 }
         );
      
      yPos += 25;
      
      // ================== BANK DETAILS & QR CODE ==================
      
      // Bank Details
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('COMPANY\'S BANK DETAILS', 30, yPos);
      
      yPos += 15;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#333333');
      
      const bankDetails = invoiceData.bankDetails || {};
      doc.text('BANK NAME : ' + (bankDetails.bankName || 'AXIS BANK'), 30, yPos);
      yPos += 12;
      doc.text('A/C NO. : ' + (bankDetails.accountNumber || '910020023507337'), 30, yPos);
      yPos += 12;
      doc.text('BRANCH & IFS CODE: ' + (bankDetails.branch || 'SAHAKARNAGAR') + ' & ' + (bankDetails.ifscCode || 'UTIB0000561'), 30, yPos);
      
      // QR Code and Authorized Sign
      const qrY = yPos - 45;
      
      // Generate QR Code
      if (bankDetails.upiId) {
        const upiString = `upi://pay?pa=${bankDetails.upiId}&pn=${encodeURIComponent(
          companyInfo.name || 'Sanjana Enterprises'
        )}&am=${invoiceData.totalAmount}&cu=INR`;
        
        QRCode.toDataURL(upiString, { width: 80, height: 80, margin: 0 }, (err, url) => {
          if (!err && url) {
            doc.fontSize(7)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text('PAYMENT VIA QR CODE', 370, qrY);
            
            try {
              const base64 = url.split(',')[1];
              const buffer = Buffer.from(base64, 'base64');
              doc.image(buffer, 390, qrY + 12, { width: 70, height: 70 });
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
        // Authorized Sign
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#000000')
           .text('AUTHORISED SIGN', 470, qrY + 90);
        
        doc.moveTo(460, qrY + 85)
           .lineTo(555, qrY + 85)
           .stroke('#000000');
        
        // ================== FOOTER ==================
        const footerY = pageHeight - 30;
        
        doc.rect(0, footerY, pageWidth, 20)
           .fill(darkBlue);
        
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#ffffff')
           .text(
             'THIS IS A COMPUTER GENERATED INVOICE',
             0,
             footerY + 6,
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

// Warranty Certificate (keep existing one)
export const generateWarrantyCertificate = async (warrantyData) => {
  // ... keep existing warranty code
  return Promise.resolve({ filename: 'warranty.pdf', filepath: '/path/to/warranty.pdf' });
};

