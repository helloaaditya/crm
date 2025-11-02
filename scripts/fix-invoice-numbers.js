import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Invoice from '../models/Invoice.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const fixInvoiceNumbers = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in .env file!');
      console.log('💡 Make sure you have a .env file in the root directory with MONGO_URI set');
      process.exit(1);
    }
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all invoices with corrupted numbers (length !== 11)
    // Correct format: INV(3) + YY(2) + MM(2) + 4digits(4) = 11 characters
    const allInvoices = await Invoice.find({}).select('invoiceNumber invoiceDate').lean();
    
    console.log(`\n📊 Total invoices found: ${allInvoices.length}`);
    
    const corrupted = allInvoices.filter(inv => inv.invoiceNumber && inv.invoiceNumber.length !== 11);
    console.log(`❌ Corrupted invoice numbers: ${corrupted.length}`);
    
    if (corrupted.length > 0) {
      console.log('\n🔧 Corrupted invoices:');
      corrupted.forEach(inv => {
        console.log(`   - ${inv.invoiceNumber} (length: ${inv.invoiceNumber.length})`);
      });
      
      console.log('\n⚠️  Would you like to fix these? Run with --fix flag');
      console.log('   Example: node scripts/fix-invoice-numbers.js --fix');
    }

    // If --fix flag is provided, renumber the corrupted invoices
    if (process.argv.includes('--fix')) {
      console.log('\n🔄 Fixing corrupted invoice numbers...\n');
      
      // Group by year-month
      const grouped = {};
      
      for (const inv of corrupted) {
        const invoice = await Invoice.findById(inv._id);
        if (!invoice) continue;
        
        const date = new Date(invoice.invoiceDate);
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const key = `${year}${month}`;
        
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(invoice);
      }
      
      // Fix each group
      for (const [yearMonth, invoices] of Object.entries(grouped)) {
        const prefix = `INV${yearMonth}`;
        
        // Find the highest valid number for this month
        const validInvoices = await Invoice.find({
          invoiceNumber: { $regex: new RegExp(`^${prefix}\\d{4}$`) }
        }).select('invoiceNumber').lean();
        
        let maxNumber = 0;
        validInvoices.forEach(inv => {
          if (inv.invoiceNumber.length === 11) {
            const num = parseInt(inv.invoiceNumber.slice(-4), 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        });
        
        // Renumber corrupted invoices
        for (const invoice of invoices) {
          maxNumber++;
          const newNumber = `${prefix}${String(maxNumber).padStart(4, '0')}`;
          
          console.log(`   ✓ ${invoice.invoiceNumber} → ${newNumber}`);
          
          invoice.invoiceNumber = newNumber;
          await invoice.save({ validateBeforeSave: false });
        }
      }
      
      console.log('\n✅ All corrupted invoice numbers have been fixed!');
    }
    
    // Show summary of valid invoices
    const valid = allInvoices.filter(inv => inv.invoiceNumber && inv.invoiceNumber.length === 11);
    console.log(`\n✅ Valid invoice numbers: ${valid.length}`);
    
    if (valid.length > 0 && valid.length <= 20) {
      console.log('\n📋 Valid invoices:');
      valid.forEach(inv => {
        console.log(`   - ${inv.invoiceNumber}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixInvoiceNumbers();

