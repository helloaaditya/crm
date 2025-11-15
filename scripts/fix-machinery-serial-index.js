/**
 * Migration script to remove the serialNumber unique index from Machinery collection
 * 
 * This script drops the existing serialNumber unique index since serialNumber
 * is now optional and not required to be unique.
 * 
 * Run this script once to remove the database index constraint.
 * 
 * Usage: node scripts/fix-machinery-serial-index.js
 */

import mongoose from 'mongoose';
import Machinery from '../models/Machinery.js';
import dotenv from 'dotenv';

dotenv.config();

const fixSerialNumberIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('machinery');

    // Check if index exists
    const indexes = await collection.indexes();
    const serialIndex = indexes.find(idx => idx.key && idx.key.serialNumber);

    if (serialIndex) {
      console.log('📋 Current serialNumber index:', JSON.stringify(serialIndex, null, 2));
      
      // Drop existing index
      try {
        await collection.dropIndex('serialNumber_1');
        console.log('✅ Dropped existing serialNumber unique index');
      } catch (err) {
        if (err.code === 27) {
          console.log('ℹ️  Index does not exist, nothing to remove.');
        } else {
          throw err;
        }
      }
    } else {
      console.log('ℹ️  No serialNumber index found, nothing to remove.');
    }

    // Verify the index is removed
    const finalIndexes = await collection.indexes();
    const finalSerialIndex = finalIndexes.find(idx => idx.key && idx.key.serialNumber);
    
    if (finalSerialIndex) {
      console.log('⚠️  Warning: serialNumber index still exists:', JSON.stringify(finalSerialIndex, null, 2));
    } else {
      console.log('✅ Confirmed: serialNumber index has been removed');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('SerialNumber is now optional and not required to be unique.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the migration
fixSerialNumberIndex();

