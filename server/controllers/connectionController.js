// server/controllers/connectionController.js
const Connection = require('../models/Connection');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.sendConnectionRequest = async (req, res) => {
    const recipientId = req.body.recipientId;
    const requesterId = req.user.id;

    if (!recipientId) {
        return res.status(400).json({ message: 'Recipient ID is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({ message: 'Invalid recipient ID format' });
    }
    if (requesterId === recipientId) {
        return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    try {
        const recipientExists = await User.findById(recipientId);
        if (!recipientExists) {
            return res.status(404).json({ message: 'Recipient user not found' });
        }

        const existingConnection = await Connection.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId }
            ]
        });

        if (existingConnection) {
            if (existingConnection.status === 'pending') {
                return res.status(400).json({ message: 'Request already pending' });
            } else if (existingConnection.status === 'accepted') {
                return res.status(400).json({ message: 'Already connected' });
            } else if (existingConnection.status === 'declined' && existingConnection.requester.toString() === requesterId) {
                return res.status(400).json({ message: 'Recipient previously declined your request' });
            }
        }

        const newConnection = new Connection({
            requester: requesterId,
            recipient: recipientId,
        });

        await newConnection.save();
        res.status(201).json({ message: 'Connection request sent successfully', connection: newConnection });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A connection or request already exists between these users.' });
        }
        console.error('Send Connection Request Error:', error);
        res.status(500).json({ message: 'Server Error sending request' });
    }
};

exports.manageConnectionRequest = async (req, res) => {
    const connectionId = req.params.id;
    const { status } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID format' });
    }
    if (!status || !['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided. Must be "accepted" or "declined".' });
    }

    try {
        const connection = await Connection.findById(connectionId);

        if (!connection) {
            return res.status(404).json({ message: 'Connection request not found' });
        }

        if (connection.recipient.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to manage this request' });
        }

        if (connection.status !== 'pending') {
            return res.status(400).json({ message: `Request already ${connection.status}` });
        }

        connection.status = status;
        await connection.save();

        res.json({ message: `Request ${status} successfully`, connection });
    } catch (error) {
        console.error('Manage Connection Request Error:', error);
        res.status(500).json({ message: 'Server Error managing request' });
    }
};

exports.getConnections = async (req, res) => {
    const userId = req.user.id;
    const { type } = req.query;

    let query = {};

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
        default:
            query = { $or: [{ requester: userId }, { recipient: userId }], status: 'accepted' };
    }

    try {
        const connections = await Connection.find(query)
            .populate('requester', 'name email role skills interests bio') // Populate with user details
            .populate('recipient', 'name email role skills interests bio')
            .sort({ createdAt: -1 });

        res.json(connections);
    } catch (error) {
        console.error('Get Connections Error:', error);
        res.status(500).json({ message: 'Server Error fetching connections' });
    }
};

exports.deleteConnection = async (req, res) => {
    const connectionId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
        return res.status(400).json({ message: 'Invalid connection ID format' });
    }

    try {
        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).json({ message: 'Connection not found' });
        }

        if (connection.requester.toString() !== userId && connection.recipient.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to modify this connection' });
        }

        await Connection.findByIdAndDelete(connectionId);
        res.json({ message: 'Connection removed successfully' });
    } catch (error) {
        console.error('Delete Connection Error:', error);
        res.status(500).json({ message: 'Server Error removing connection' });
    }
};