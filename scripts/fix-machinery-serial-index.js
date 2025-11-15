/**
 * Migration script to fix the serialNumber index in Machinery collection
 * 
 * This script drops the existing serialNumber index and recreates it as sparse unique,
 * which allows multiple documents to have null serialNumber values.
 * 
 * Run this script once to fix the database index issue.
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
        console.log('✅ Dropped existing serialNumber index');
      } catch (err) {
        if (err.code === 27) {
          console.log('ℹ️  Index does not exist, creating new one...');
        } else {
          throw err;
        }
      }
    }

    // Create new sparse unique index
    await collection.createIndex(
      { serialNumber: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'serialNumber_1'
      }
    );
    console.log('✅ Created new sparse unique index on serialNumber');

    // Verify the index
    const newIndexes = await collection.indexes();
    const newSerialIndex = newIndexes.find(idx => idx.key && idx.key.serialNumber);
    console.log('📋 New serialNumber index:', JSON.stringify(newSerialIndex, null, 2));

    console.log('\n✅ Migration completed successfully!');
    console.log('You can now create multiple machinery entries with null serialNumber.');

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

