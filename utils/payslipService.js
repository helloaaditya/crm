import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a professional payslip PDF
 * @param {Object} salaryData - Salary processing data
 * @param {Object} employee - Employee details
 * @param {Object} company - Company details
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generatePayslipPDF = async (salaryData, employee, company) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Company Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(company.name || 'Sanjana Enterprises', margin, margin, { align: 'center' });

      doc.fontSize(10)
         .font('Helvetica')
         .text(company.address || '', margin, doc.y + 5, { align: 'center' })
         .text(company.phone ? `Phone: ${company.phone}` : '', margin, doc.y + 3, { align: 'center' })
         .text(company.email ? `Email: ${company.email}` : '', margin, doc.y + 3, { align: 'center' });

      // Payslip Title
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('PAYSLIP', margin, doc.y + 20, { align: 'center' });

      doc.moveTo(margin, doc.y + 5)
         .lineTo(pageWidth - margin, doc.y + 5)
         .stroke();

      // Payslip Details (Left & Right columns)
      const startY = doc.y + 15;
      let currentY = startY;

      doc.fontSize(10).font('Helvetica');

      // Left column
      doc.font('Helvetica-Bold').text('Employee Details:', margin, currentY);
      currentY += 15;

      doc.font('Helvetica').text('Employee ID:', margin, currentY);
      doc.font('Helvetica-Bold').text(employee.employeeId || 'N/A', margin + 100, currentY);
      currentY += 15;

      doc.font('Helvetica').text('Employee Name:', margin, currentY);
      doc.font('Helvetica-Bold').text(employee.name || 'N/A', margin + 100, currentY);
      currentY += 15;

      doc.font('Helvetica').text('Designation:', margin, currentY);
      doc.font('Helvetica-Bold').text(employee.designation || employee.role || 'N/A', margin + 100, currentY);
      currentY += 15;

      doc.font('Helvetica').text('Department:', margin, currentY);
      doc.font('Helvetica-Bold').text(employee.role || 'N/A', margin + 100, currentY);
      currentY += 15;

      doc.font('Helvetica').text('Date of Joining:', margin, currentY);
      doc.font('Helvetica-Bold').text(
        employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A',
        margin + 100,
        currentY
      );

      // Right column
      currentY = startY;
      const rightColX = pageWidth - margin - 200;

      doc.font('Helvetica-Bold').text('Salary Details:', rightColX, currentY);
      currentY += 15;

      doc.font('Helvetica').text('Pay Period:', rightColX, currentY);
      doc.font('Helvetica-Bold').text(salaryData.month || 'N/A', rightColX + 100, currentY);
      currentY += 15;

      doc.font('Helvetica').text('Pay Date:', rightColX, currentY);
      doc.font('Helvetica-Bold').text(
        salaryData.paymentDate ? new Date(salaryData.paymentDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        rightColX + 100,
        currentY
      );
      currentY += 15;

      doc.font('Helvetica').text('Payment Mode:', rightColX, currentY);
      doc.font('Helvetica-Bold').text(salaryData.paymentMode || 'Bank Transfer', rightColX + 100, currentY);
      currentY += 15;

      doc.font('Helvetica').text('Working Days:', rightColX, currentY);
      doc.font('Helvetica-Bold').text(String(salaryData.workingDays || 0), rightColX + 100, currentY);

      // Separator line
      currentY = doc.y + 25;
      doc.moveTo(margin, currentY)
         .lineTo(pageWidth - margin, currentY)
         .stroke();

      // Earnings and Deductions Table
      currentY += 15;

      // Table headers
      const tableY = currentY;
      const col1X = margin;
      const col2X = margin + (contentWidth / 2);
      const colWidth = (contentWidth / 2) - 10;

      // Left table (Earnings)
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('EARNINGS', col1X, tableY);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000');

      currentY = tableY + 20;

      // Earnings items
      const earnings = [
        { label: 'Basic Salary', amount: salaryData.basicSalary || 0 },
        { label: 'HRA', amount: salaryData.hra || 0 },
        { label: 'Conveyance', amount: salaryData.conveyance || 0 },
        { label: 'Medical Allowance', amount: salaryData.medical || 0 },
        { label: 'Other Allowances', amount: salaryData.otherAllowances || 0 }
      ];

      let totalEarnings = 0;
      earnings.forEach(item => {
        if (item.amount > 0) {
          doc.font('Helvetica').text(item.label, col1X, currentY);
          doc.font('Helvetica').text(`Rs. ${item.amount.toFixed(2)}`, col1X + 150, currentY, { width: 100, align: 'right' });
          totalEarnings += item.amount;
          currentY += 15;
        }
      });

      const earningsEndY = currentY;

      // Right table (Deductions)
      currentY = tableY + 20;

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('DEDUCTIONS', col2X, tableY);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000');

      // Deductions items
      const deductions = [
        { label: 'PF', amount: salaryData.pf || 0 },
        { label: 'ESI', amount: salaryData.esi || 0 },
        { label: 'Professional Tax', amount: salaryData.professionalTax || 0 },
        { label: 'TDS', amount: salaryData.tds || 0 },
        { label: 'Other Deductions', amount: salaryData.otherDeductions || 0 },
        { label: 'Advance/Loan', amount: salaryData.advance || 0 }
      ];

      let totalDeductions = 0;
      deductions.forEach(item => {
        if (item.amount > 0) {
          doc.font('Helvetica').text(item.label, col2X, currentY);
          doc.font('Helvetica').text(`Rs. ${item.amount.toFixed(2)}`, col2X + 150, currentY, { width: 100, align: 'right' });
          totalDeductions += item.amount;
          currentY += 15;
        }
      });

      // Use the maximum Y position from both columns
      currentY = Math.max(earningsEndY, currentY) + 10;

      // Total line
      doc.moveTo(margin, currentY)
         .lineTo(pageWidth - margin, currentY)
         .stroke();

      currentY += 10;

      // Totals
      doc.fontSize(11)
         .font('Helvetica-Bold');

      doc.text('Gross Earnings:', col1X, currentY);
      doc.text(`Rs. ${totalEarnings.toFixed(2)}`, col1X + 150, currentY, { width: 100, align: 'right' });

      doc.text('Total Deductions:', col2X, currentY);
      doc.text(`Rs. ${totalDeductions.toFixed(2)}`, col2X + 150, currentY, { width: 100, align: 'right' });

      currentY += 25;

      // Double line before net salary
      doc.moveTo(margin, currentY)
         .lineTo(pageWidth - margin, currentY)
         .stroke();

      doc.moveTo(margin, currentY + 2)
         .lineTo(pageWidth - margin, currentY + 2)
         .stroke();

      currentY += 15;

      // Net Salary (highlighted box)
      const netSalary = totalEarnings - totalDeductions;

      doc.rect(margin, currentY, contentWidth, 40)
         .fillAndStroke('#f0f9ff', '#2563eb');

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('NET SALARY:', margin + 20, currentY + 12);

      doc.fontSize(16)
         .text(`Rs. ${netSalary.toFixed(2)}`, pageWidth - margin - 200, currentY + 12, { 
           width: 180, 
           align: 'right' 
         });

      currentY += 55;

      // Salary in words
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .fillColor('#000000')
         .text(`Amount in words: ${convertToWords(netSalary)} Only`, margin, currentY);

      currentY += 30;

      // Bank details (if available)
      if (employee.bankDetails?.accountNumber) {
        doc.moveTo(margin, currentY)
           .lineTo(pageWidth - margin, currentY)
           .stroke();

        currentY += 15;

        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text('Bank Details:', margin, currentY);

        currentY += 15;

        doc.fontSize(9)
           .font('Helvetica');

        const bankDetails = [
          { label: 'Account Holder:', value: employee.bankDetails.accountHolderName || employee.name },
          { label: 'Bank Name:', value: employee.bankDetails.bankName || '-' },
          { label: 'Account Number:', value: employee.bankDetails.accountNumber || '-' },
          { label: 'IFSC Code:', value: employee.bankDetails.ifscCode || '-' }
        ];

        bankDetails.forEach(detail => {
          doc.font('Helvetica').text(detail.label, margin, currentY);
          doc.font('Helvetica-Bold').text(detail.value, margin + 120, currentY);
          currentY += 12;
        });

        currentY += 10;
      }

      // Footer notes
      currentY = doc.page.height - 150;

      doc.moveTo(margin, currentY)
         .lineTo(pageWidth - margin, currentY)
         .stroke();

      currentY += 15;

      doc.fontSize(9)
         .font('Helvetica-Oblique')
         .fillColor('#666666')
         .text('Note: This is a computer-generated payslip and does not require a signature.', margin, currentY);

      currentY += 30;

      // Signature section
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000');

      doc.text("Employee's Signature", margin, currentY);
      doc.text("Authorized Signatory", pageWidth - margin - 150, currentY, { width: 150, align: 'right' });

      doc.moveTo(margin, currentY + 25)
         .lineTo(margin + 100, currentY + 25)
         .stroke();

      doc.moveTo(pageWidth - margin - 100, currentY + 25)
         .lineTo(pageWidth - margin, currentY + 25)
         .stroke();

      // Footer
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#999999')
         .text(
           `Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`,
           margin,
           doc.page.height - 50,
           { align: 'center', width: contentWidth }
         );

      doc.end();

    } catch (error) {
      console.error('Error generating payslip:', error);
      reject(error);
    }
  });
};

/**
 * Convert number to words (Indian numbering system)
 */
function convertToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (amount === 0) return 'Zero';

  const num = Math.floor(amount);
  let words = '';

  // Crores
  if (num >= 10000000) {
    words += convertToWords(Math.floor(num / 10000000)) + ' Crore ';
  }

  // Lakhs
  if ((num >= 100000) && (num % 10000000)) {
    words += convertToWords(Math.floor((num % 10000000) / 100000)) + ' Lakh ';
  }

  // Thousands
  if ((num >= 1000) && (num % 100000)) {
    words += convertToWords(Math.floor((num % 100000) / 1000)) + ' Thousand ';
  }

  // Hundreds
  if ((num >= 100) && (num % 1000)) {
    words += ones[Math.floor((num % 1000) / 100)] + ' Hundred ';
  }

  // Tens and ones
  const remainder = num % 100;
  if (remainder >= 20) {
    words += tens[Math.floor(remainder / 10)] + ' ';
    if (remainder % 10 > 0) {
      words += ones[remainder % 10] + ' ';
    }
  } else if (remainder >= 10) {
    words += teens[remainder - 10] + ' ';
  } else if (remainder > 0) {
    words += ones[remainder] + ' ';
  }

  // Add paise if any
  const paise = Math.round((amount - num) * 100);
  if (paise > 0) {
    words += 'and ' + convertToWords(paise) + ' Paise ';
  }

  return words.trim() + ' Rupees';
}

export default generatePayslipPDF;

