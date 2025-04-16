const User = require('../models/User');
const jwt = require('jsonwebtoken');
const validator = require('validator');
require('dotenv').config({ path: '../../.env' }); // Ensure path is correct relative to this file

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Input Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please provide all required fields (name, email, password, role)' });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  if (!['mentor', 'mentee'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified. Must be "mentor" or "mentee".' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    // Check for existing user
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(409).json({ message: 'User already exists with this email address' });
    }

    // Create new user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role
    });

    // Send success response
    return res.status(201).json({
      message: 'Registration successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    return res.status(500).json({ message: 'Server Error during registration' });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  // --- Input Validation ---
  if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
  }
  if (!validator.isEmail(email)) {
     return res.status(400).json({ message: 'Please provide a valid email address format' });
  }
  // --- End Input Validation ---

  try {
    // Find user and explicitly select password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Check if user exists AND password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      // Generic message for security (don't reveal if email exists but password is wrong)
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server Error during login' });
  }
};