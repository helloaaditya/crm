import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from '../models/Settings.js';

dotenv.config();

const initSettings = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if settings already exist
    const existingSettings = await Settings.findOne();
    
    if (existingSettings) {
      console.log('Settings already exist');
      console.log('Existing settings:', JSON.stringify(existingSettings, null, 2));
    } else {
      // Create default settings
      const defaultSettings = await Settings.create({});
      console.log('Default settings created successfully');
      console.log('Created settings:', JSON.stringify(defaultSettings.toObject(), null, 2));
    }

    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error initializing settings:', error);
    process.exit(1);
  }
};

initSettings();