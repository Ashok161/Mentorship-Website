const express = require('express');
const { sendConnectionRequest, manageConnectionRequest, getConnections, deleteConnection } = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
    .post(protect, sendConnectionRequest) // Send request
    .get(protect, getConnections); // Get all connections (filtered by query param 'type')

router.route('/:id')
     .put(protect, manageConnectionRequest) // Accept/Decline request
     .delete(protect, deleteConnection); // Delete connection/Cancel request

module.exports = router;