const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'], // Schema-level validation: Required
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'], // Schema-level validation: Required
    unique: true, // Database index: Prevents duplicate emails
    lowercase: true,
    match: [ // Schema-level validation: Regex for basic email format
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'], // Schema-level validation: Required
    minlength: 6, // Schema-level validation: Minimum length
    select: false // Hide password by default when querying users
  },
  role: {
    type: String,
    enum: ['mentor', 'mentee'], // Schema-level validation: Enum constraint
    required: [true, 'Please specify a role (mentor or mentee)'] // Schema-level validation: Required
  },
  skills: [{ // Array of strings
    type: String,
    trim: true
  }],
  interests: [{ // Array of strings
    type: String,
    trim: true
  }],
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'] // Schema-level validation: Max length
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware: Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) {
    return next();
  }
  // Hash the password with cost factor 10
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method: Compare entered password with hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  // Need to explicitly select password when finding user if it was excluded with 'select: false'
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);