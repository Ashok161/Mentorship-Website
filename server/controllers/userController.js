// server/controllers/userController.js
const User = require('../models/User');
const Connection = require('../models/Connection');
const validator = require('validator');
const mongoose = require('mongoose');

// --- Helper function to escape regex special characters ---
function escapeRegex(text) {
  if (typeof text !== 'string') return ''; // Handle non-string input gracefully
  // Escape characters with special meaning in regex.
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
// ---------------------------------------------------------


// Get current user's profile
exports.getUserProfile = async (req, res) => {
    // Assumes 'protect' middleware ran successfully and attached req.user
    try {
        const user = await User.findById(req.user.id).select('-password'); // Exclude password
        if (!user) {
            // Should not happen if token is valid, but defensively check
            return res.status(404).json({ message: 'User not found for this token' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get User Profile Error:', error);
        res.status(500).json({ message: 'Server Error fetching profile' });
    }
};

// Update current user's profile
exports.updateUserProfile = async (req, res) => {
    // --- Input Validation & Sanitization ---
    const { name, role, skills, interests, bio } = req.body;
    const userId = req.user.id; // From 'protect' middleware

    const updateData = {};

    // Validate and sanitize name
    if (name !== undefined) {
        const trimmedName = String(name).trim();
        if (!trimmedName) return res.status(400).json({ message: 'Name cannot be empty' });
        updateData.name = validator.escape(trimmedName); // Escape for potential HTML context
    }

    // Validate role
    if (role !== undefined) {
        if (!['mentor', 'mentee'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified' });
        }
        updateData.role = role;
    }

    // Validate and sanitize bio
    if (bio !== undefined) {
        updateData.bio = validator.escape(String(bio).substring(0, 500)); // Escape & limit length
    }

    // Validate and sanitize skills array
    if (skills !== undefined) {
        if (!Array.isArray(skills)) {
            return res.status(400).json({ message: 'Skills must be provided as an array' });
        }
        // Sanitize each skill: convert to string, trim, filter empty
        updateData.skills = skills
            .map(skill => String(skill || '').trim())
            .filter(Boolean);
    }

     // Validate and sanitize interests array
     if (interests !== undefined) {
        if (!Array.isArray(interests)) {
            return res.status(400).json({ message: 'Interests must be provided as an array' });
        }
        updateData.interests = interests
            .map(interest => String(interest || '').trim())
            .filter(Boolean);
    }
    // --- End Input Validation & Sanitization ---

    // Prevent updating email or password via this route
    delete updateData.email;
    delete updateData.password;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No update data provided' });
    }

    try {
        // Find user and apply updates
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        ).select('-password'); // Exclude password from result

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found during update' });
        }

        res.json(updatedUser);

    } catch (error) {
        console.error('Update User Profile Error:', error);
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ message: messages.join('. ') });
        }
        res.status(500).json({ message: 'Server Error updating profile' });
    }
};

// Delete current user's profile
exports.deleteUserProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Clean up connections associated with the user
        await Connection.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] });

        // Delete the user document itself
        await User.findByIdAndDelete(userId);

        res.json({ message: 'User profile and associated connections deleted successfully' });

    } catch (error) {
        console.error('Delete User Profile Error:', error);
        res.status(500).json({ message: 'Server Error deleting profile' });
    }
};


// Discover users with filtering (UPDATED EXCLUSION LOGIC)
exports.discoverUsers = async (req, res) => {
    const { role, skill, interest, search } = req.query;
    const query = {};
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const currentUserId = req.user.id;

    // --- Validate Filters ---
    if (role && !['mentor', 'mentee'].includes(role)) return res.status(400).json({ message: 'Invalid role filter specified' });
    if (role) query.role = role;

    // --- Apply Filters (with Regex Escape) ---
    if (skill) {
        const escapedSkill = escapeRegex(String(skill).trim());
        if (escapedSkill) query.skills = { $regex: new RegExp(escapedSkill, 'i') };
    }
    if (interest) {
        const escapedInterest = escapeRegex(String(interest).trim());
        if (escapedInterest) query.interests = { $regex: new RegExp(escapedInterest, 'i') };
    }
    if (search) {
        const escapedSearch = escapeRegex(String(search).trim());
        if (escapedSearch) {
            const searchRegex = new RegExp(escapedSearch, 'i');
            // Combine search terms with $and if other specific filters exist, or use $or directly
            const searchCondition = {
                $or: [
                    { name: searchRegex },
                    { bio: searchRegex },
                    { skills: searchRegex },
                    { interests: searchRegex }
                ]
            };
            // If other filters exist, combine with $and
            if (query.role || query.skills || query.interests) {
                 // Ensure $and is an array
                 if (!query.$and) query.$and = [];
                 query.$and.push(searchCondition);
            } else {
                 // If no other filters, $or can be at the top level
                 Object.assign(query, searchCondition);
            }
        }
    }

    try {
        // --- Exclusion Logic Updated ---
        // Find only PENDING or ACCEPTED connections involving the current user
        const connectionsToExclude = await Connection.find({
            $or: [ { requester: currentUserId }, { recipient: currentUserId } ],
            status: { $in: ['pending', 'accepted'] } // <<< Only exclude based on these statuses
        }).select('requester recipient -_id'); // Select only needed fields

        // Create set of IDs to exclude (self + users in pending/accepted connections)
        const excludedUserIds = new Set([currentUserId]);
        connectionsToExclude.forEach(conn => {
            const requesterId = conn.requester.toString();
            const recipientId = conn.recipient.toString();
            excludedUserIds.add(requesterId === currentUserId ? recipientId : requesterId);
        });
        // --- End Exclusion Logic Update ---

        // Add exclusion list using $nin to the main query conditions
        // Combine with existing _id conditions if any (though unlikely here)
        if (!query._id) query._id = {};
        query._id.$nin = Array.from(excludedUserIds).map(id => {
                try { return new mongoose.Types.ObjectId(id); } // Validate/Convert IDs
                catch(e) { console.warn(`Invalid ID format in exclusion list: ${id}`); return null; }
            }).filter(id => id !== null); // Filter out invalid ones


        console.log("Discover Users - Final MongoDB Query:", JSON.stringify(query)); // Log final query

        const users = await User.find(query)
                                .select('-password') // Ensure password excluded
                                .limit(50) // Performance limit
                                .sort({ createdAt: -1 }); // Optional: Sort by newest first

        res.json(users);

    } catch (error) {
        if (error instanceof SyntaxError && error.message.includes('Invalid regular expression')) {
             console.error('Invalid Regular Expression Error during user discovery:', error);
             return res.status(400).json({ message: `Invalid character used in filter/search term: ${error.message}` });
        }
        console.error('Discover Users Error:', error);
        if (error.name === 'CastError') {
             return res.status(400).json({ message: 'Invalid data format used for filtering (e.g., ID).' });
        }
        res.status(500).json({ message: 'Server Error discovering users' });
    }
};

// Get a specific user's profile by ID
exports.getUserById = async (req, res) => {
    // --- Input Validation (Param) ---
    const userIdToView = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userIdToView)) {
        return res.status(400).json({ message: 'Invalid user ID format provided' });
    }
    // --- End Input Validation ---

    // Avoid user viewing themselves via this route if already handled by /me
    if (req.user && req.user.id === userIdToView) {
         return exports.getUserProfile(req, res); // Reuse own profile fetch logic
    }

    try {
        // Fetch user, explicitly excluding password
        const user = await User.findById(userIdToView).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Add authorization checks here if needed in future (e.g., privacy settings)
        res.json(user);
    } catch (error) {
        console.error('Get User By ID Error:', error);
        res.status(500).json({ message: 'Server Error fetching user profile' });
    }
};