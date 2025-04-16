const mongoose = require('mongoose');

const ConnectionSchema = new mongoose.Schema({
  requester: { // User sending the request
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Establishes relationship with User model
    required: true // Schema-level validation: Required
  },
  recipient: { // User receiving the request
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Establishes relationship with User model
    required: true // Schema-level validation: Required
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'], // Schema-level validation: Enum constraint
    default: 'pending' // Default status
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Database index: Prevent duplicate connection requests between the same two users
// Ensures that a pair of (requester, recipient) is unique.
ConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model('Connection', ConnectionSchema);