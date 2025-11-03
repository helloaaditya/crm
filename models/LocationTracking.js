import mongoose from 'mongoose';

const locationTrackingSchema = new mongoose.Schema({
  // Reference to employee
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  
  // Reference to user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Session ID to group location points for a single check-in/check-out session
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Location coordinates (GeoJSON format)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  
  // Human-readable address (optional, can be reverse-geocoded)
  address: {
    type: String
  },
  
  // Accuracy of GPS reading (in meters)
  accuracy: {
    type: Number
  },
  
  // Speed (in m/s, optional)
  speed: {
    type: Number
  },
  
  // Heading/direction (in degrees, optional)
  heading: {
    type: Number
  },
  
  // Battery level at time of tracking (optional)
  batteryLevel: {
    type: Number
  },
  
  // Is this tracking session currently active?
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Date of the tracking (for easy querying)
  trackingDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Linked attendance record
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee' // Reference to Employee.attendance array item
  }
}, {
  timestamps: true
});

// Create geospatial index for location queries
locationTrackingSchema.index({ location: '2dsphere' });

// Compound index for efficient queries
locationTrackingSchema.index({ employee: 1, sessionId: 1, createdAt: 1 });
locationTrackingSchema.index({ isActive: 1, createdAt: -1 });
locationTrackingSchema.index({ trackingDate: 1, employee: 1 });

// Virtual for getting lat/lng in easy format
locationTrackingSchema.virtual('latitude').get(function() {
  return this.location.coordinates[1];
});

locationTrackingSchema.virtual('longitude').get(function() {
  return this.location.coordinates[0];
});

// Ensure virtuals are included in JSON
locationTrackingSchema.set('toJSON', { virtuals: true });
locationTrackingSchema.set('toObject', { virtuals: true });

const LocationTracking = mongoose.model('LocationTracking', locationTrackingSchema);

export default LocationTracking;

