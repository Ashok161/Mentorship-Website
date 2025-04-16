// server/controllers/connectionController.js
const Connection = require('../models/Connection');
const User = require('../models/User');
const mongoose = require('mongoose');

// Send a connection request (UPDATED DUPLICATE/STATUS CHECK)
exports.sendConnectionRequest = async (req, res) => {
    const { recipientId } = req.body;
    const requesterId = req.user.id; // From 'protect' middleware

    // --- Input Validation ---
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({ message: 'Valid Recipient ID is required' });
    }
    if (requesterId === recipientId) {
        return res.status(400).json({ message: 'You cannot send a connection request to yourself' });
    }
    // --- End Input Validation ---

    try {
        // Check if recipient user actually exists
        const recipientExists = await User.findById(recipientId);
        if (!recipientExists) {
            return res.status(404).json({ message: 'Recipient user not found' });
        }

        // --- Duplicate/Status Prevention Check Updated ---
        // Check if a connection already exists between these two users
        const existingConnection = await Connection.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId } // Check both directions
            ]
        });

        if (existingConnection) {
            // Block sending if already pending, accepted, OR if a previous request was declined.
            if (existingConnection.status === 'pending') {
                 if (existingConnection.requester.toString() === requesterId) {
                     return res.status(409).json({ message: 'Request already sent and is pending' }); // 409 Conflict
                 } else {
                     return res.status(409).json({ message: 'This user has already sent you a pending request. Check your received requests.' });
                 }
            } else if (existingConnection.status === 'accepted') {
                 return res.status(409).json({ message: 'You are already connected with this user' }); // 409 Conflict
            } else if (existingConnection.status === 'declined') {
                 // *** BLOCK sending if already declined ***
                 if (existingConnection.requester.toString() === requesterId) {
                      // Current user sent the request that was declined
                      return res.status(403).json({ message: 'Your previous request to this user was declined. Cannot send again.' }); // 403 Forbidden
                 } else {
                      // Current user received and declined the request previously
                      return res.status(403).json({ message: 'You previously declined a request from this user. Cannot send request.' }); // 403 Forbidden
                 }
            }
            // If status is something else (shouldn't happen with current enum), treat as conflict
             return res.status(409).json({ message: 'A connection record conflict exists' });
        }
        // --- End Duplicate/Status Prevention Check ---

        // Create and save the new connection request (status defaults to 'pending')
        const newConnection = new Connection({
            requester: requesterId,
            recipient: recipientId,
        });

        await newConnection.save(); // This might throw if the unique index failsafe triggers
        res.status(201).json({ message: 'Connection request sent successfully', connection: newConnection });

    } catch (error) {
        // Handle potential duplicate key error from the index (fallback)
        if (error.code === 11000) {
            // This usually indicates the unique index on (requester, recipient) was violated
            return res.status(409).json({ message: 'A connection record conflict occurred (duplicate index).' });
        }
        console.error('Send Connection Request Error:', error);
        res.status(500).json({ message: 'Server Error sending connection request' });
    }
};

// Manage a received connection request (Accept/Decline)
exports.manageConnectionRequest = async (req, res) => {
    const connectionId = req.params.id;
    const { status } = req.body; // Expect 'accepted' or 'declined'
    const userId = req.user.id; // User taking the action (must be recipient)

    // --- Input Validation ---
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
       return res.status(400).json({ message: 'Invalid connection ID format' });
    }
    if (!status || !['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided. Must be "accepted" or "declined".' });
    }
    // --- End Input Validation ---

    try {
      const connection = await Connection.findById(connectionId);

      if (!connection) {
        return res.status(404).json({ message: 'Connection request not found' });
      }

      // --- Authorization Check ---
      if (connection.recipient.toString() !== userId) {
        return res.status(403).json({ message: 'You are not authorized to manage this request' }); // 403 Forbidden
      }
      // --- End Authorization Check ---

      // Check if the request is actually pending
      if (connection.status !== 'pending') {
         return res.status(400).json({ message: `This request is no longer pending (current status: ${connection.status})` });
      }

      // Update the status
      connection.status = status;
      await connection.save();

      res.json({ message: `Request ${status} successfully`, connection });

    } catch (error) {
      console.error('Manage Connection Request Error:', error);
      res.status(500).json({ message: 'Server Error managing request' });
    }
};


// Get connections (filtered by type - ADDED declined_received)
exports.getConnections = async (req, res) => {
    const userId = req.user.id;
    const { type } = req.query; // 'pending_received', 'pending_sent', 'accepted', 'declined_sent', 'declined_received'
    let query = {};

    // Determine query based on type requested
    switch (type) {
        case 'pending_received':
            query = { recipient: userId, status: 'pending' };
            break;
        case 'pending_sent':
            query = { requester: userId, status: 'pending' };
            break;
        case 'accepted':
            query = { $or: [{ requester: userId }, { recipient: userId }], status: 'accepted' };
            break;
        case 'declined_sent': // Requests sent by current user that were declined by recipient
            query = { requester: userId, status: 'declined' };
            break;
        // *** ADDED CASE for requests received by current user that THEY declined ***
        case 'declined_received':
            query = { recipient: userId, status: 'declined' };
            break;
        // *** END ADDED CASE ***
        default:
            // It's better to return an error for unknown types
            console.warn(`Invalid connection type requested: ${type}.`);
            return res.status(400).json({ message: "Invalid connection type specified. Use 'pending_received', 'pending_sent', 'accepted', 'declined_sent', or 'declined_received'." });
            // query = { $or: [{ requester: userId }, { recipient: userId }], status: 'accepted' }; // Old default behavior
    }

    try {
        // Find connections and populate user details (excluding passwords)
        // Populate only necessary fields for the list view
        const connections = await Connection.find(query)
          .populate('requester', 'name email role bio skills interests') // Populate all needed fields
          .populate('recipient', 'name email role bio skills interests')
          .sort({ createdAt: -1 }); // Sort by newest first (or maybe update time?)

        res.json(connections);

    } catch (error) {
        console.error('Get Connections Error:', error);
        res.status(500).json({ message: 'Server Error fetching connections' });
    }
};


// Delete a connection or cancel a sent request (UPDATED to prevent deleting 'declined')
exports.deleteConnection = async (req, res) => {
    const connectionId = req.params.id;
    const userId = req.user.id; // User initiating the deletion

     // --- Input Validation (Param) ---
     if (!mongoose.Types.ObjectId.isValid(connectionId)) {
       return res.status(400).json({ message: 'Invalid connection ID format' });
    }
    // --- End Input Validation ---

    try {
         const connection = await Connection.findById(connectionId);
         if (!connection) {
             return res.status(404).json({ message: 'Connection or request not found' });
         }

         // --- Authorization Check ---
         // Allow deletion only if user is either the requester OR the recipient
         if (connection.requester.toString() !== userId && connection.recipient.toString() !== userId) {
             return res.status(403).json({ message: 'You are not authorized to modify this connection' }); // 403 Forbidden
         }

         // *** Prevent deleting 'declined' records via this route ***
         if (connection.status === 'declined') {
             return res.status(403).json({ message: 'Declined connection records cannot be deleted directly via this action.' });
         }
         // --- End Prevent Deleting Declined ---

         // Proceed with deleting 'pending' (cancel) or 'accepted' (remove) connections
         await Connection.findByIdAndDelete(connectionId);
         res.json({ message: `Connection ${connection.status === 'pending' ? 'request cancelled' : 'removed'} successfully` });

    } catch (error) {
         console.error('Delete Connection Error:', error);
         res.status(500).json({ message: 'Server Error removing connection or request' });
    }
};