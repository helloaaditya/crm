import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update users with 'none' module access to 'all'
    const result = await User.updateMany(
      { module: 'none' },
      { $set: { module: 'all' } }
    );

    console.log(`Updated ${result.modifiedCount} users from 'none' to 'all' module access`);

    // Also update users with empty or null module
    const result2 = await User.updateMany(
      { $or: [{ module: { $exists: false } }, { module: null }, { module: '' }] },
      { $set: { module: 'all' } }
    );

    console.log(`Updated ${result2.modifiedCount} users with empty/null module to 'all'`);

    // Show current user module distribution
    const moduleStats = await User.aggregate([
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('Current user module distribution:');
    moduleStats.forEach(stat => {
      console.log(`  ${stat._id || 'null'}: ${stat.count} users`);
    });

    return {
      success: true,
      updatedNone: result.modifiedCount,
      updatedEmpty: result2.modifiedCount,
      moduleStats
    };

  } catch (error) {
    console.error('Error running migration:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the migration
runMigration().then(result => {
  console.log('Migration result:', result);
  process.exit(result.success ? 0 : 1);
});
