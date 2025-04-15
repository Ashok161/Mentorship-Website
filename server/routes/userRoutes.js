const express = require('express');
const { getUserProfile, updateUserProfile, deleteUserProfile, discoverUsers, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/me').get(protect, getUserProfile).put(protect, updateUserProfile).delete(protect, deleteUserProfile);
router.get('/', protect, discoverUsers); // Discovery route
router.get('/:id', protect, getUserById); // Get specific user profile

module.exports = router;