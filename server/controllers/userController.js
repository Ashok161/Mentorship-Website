const User = require('../models/User');
const Connection = require('../models/Connection');
const validator = require('validator'); // Keep for general sanitization if needed elsewhere, but not primary for regex escape
const mongoose = require('mongoose');

// --- Helper function to escape regex special characters ---
function escapeRegex(text) {
  // Escape characters with special meaning in regex.
  // Added '\' to the list as it needs escaping too.
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
// ---------------------------------------------------------


// Get current user's profile
exports.getUserProfile = async (req, res) => {
    try {
        // req.user is attached by the 'protect' middleware
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get User Profile Error:', error);
        res.status(500).json({ message: 'Server Error fetching profile' });
    }
};

// Update current user's profile
exports.updateUserProfile = async (req, res) => {
    const { name, role, skills, interests, bio } = req.body;
    const userId = req.user.id;

    const updateData = {};
    // Sanitize and prepare update data
    if (name) updateData.name = validator.escape(name.trim()); // Use validator.escape for HTML context fields
    if (role && ['mentor', 'mentee'].includes(role)) updateData.role = role;
    if (bio !== undefined) updateData.bio = validator.escape(bio.substring(0, 500)); // Use validator.escape for HTML context fields

    // Handle skills array - ensure it's an array of sanitized strings
    if (skills && Array.isArray(skills)) {
        // Escape for storage/display if needed, but primary issue is regex search later
        updateData.skills = skills.map(skill => String(skill).trim()).filter(Boolean);
    } else if (skills === null || (Array.isArray(skills) && skills.length === 0) || skills === '') {
         updateData.skills = [];
    }

    // Handle interests array - ensure it's an array of sanitized strings
    if (interests && Array.isArray(interests)) {
        updateData.interests = interests.map(interest => String(interest).trim()).filter(Boolean);
    } else if (interests === null || (Array.isArray(interests) && interests.length === 0) || interests === '') {
         updateData.interests = [];
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Apply updates
        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true }).select('-password');
        res.json(updatedUser);

    } catch (error) {
        console.error('Update User Profile Error:', error);
        if (error.name === 'ValidationError') {
                return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        res.status(500).json({ message: 'Server Error updating profile' });
    }
};

// Delete current user's profile
exports.deleteUserProfile = async (req, res) => {
    // ... (implementation remains the same as before) ...
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await Connection.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] });
        await User.findByIdAndDelete(userId);
        res.json({ message: 'User profile deleted successfully' });
    } catch (error) {
        console.error('Delete User Profile Error:', error);
        res.status(500).json({ message: 'Server Error deleting profile' });
    }
};


// Discover users with filtering
exports.discoverUsers = async (req, res) => {
    const { role, skill, interest, search } = req.query;
    const query = {};
    if (!req.user || !req.user.id) {
         return res.status(401).json({ message: 'Authentication required.' });
    }
    const currentUserId = req.user.id;

    // --- Basic Filters (Applied with AND) ---
    if (role && ['mentor', 'mentee'].includes(role)) {
        query.role = role;
    }

    // Skill Filter: Match if the 'skills' array contains an element matching the regex (case-insensitive)
    if (skill) {
        // *** FIX: Escape skill input for regex ***
        const escapedSkill = escapeRegex(skill.trim());
        const skillRegex = new RegExp(escapedSkill, 'i');
        query.skills = { $regex: skillRegex };
    }

    // Interest Filter: Match if the 'interests' array contains an element matching the regex (case-insensitive)
    if (interest) {
         // *** FIX: Escape interest input for regex ***
        const escapedInterest = escapeRegex(interest.trim());
        const interestRegex = new RegExp(escapedInterest, 'i');
        query.interests = { $regex: interestRegex };
    }

    // --- General Search Filter (Applied with AND to other filters, but OR internally) ---
    if (search) {
         // *** FIX: Escape search input for regex ***
        const escapedSearch = escapeRegex(search.trim());
        const searchRegex = new RegExp(escapedSearch, 'i');
        query.$or = [
            { name: searchRegex },
            { bio: searchRegex },
            { skills: searchRegex }, // Checks if any skill in the array matches the regex
            { interests: searchRegex } // Checks if any interest in the array matches the regex
        ];
    }

    try {
        // Find IDs of users the current user has already connected with or sent requests to
        const existingConnections = await Connection.find({
             $or: [
                 { requester: currentUserId },
                 { recipient: currentUserId }
             ]
        }).select('requester recipient status -_id');

        const excludedUserIds = new Set([currentUserId]); // Start by excluding self
        existingConnections.forEach(conn => {
            const requesterId = conn.requester.toString();
            const recipientId = conn.recipient.toString();
            if (requesterId === currentUserId) {
                 excludedUserIds.add(recipientId);
            } else {
                 excludedUserIds.add(requesterId);
            }
        });

        // Apply exclusion list using $nin (not in)
        query._id = { $nin: Array.from(excludedUserIds).map(id => {
                try {
                    return new mongoose.Types.ObjectId(id);
                } catch(e) {
                    console.warn(`Invalid ID format found during exclusion: ${id}`);
                    return null;
                }
            }).filter(id => id !== null)
        };

        // --- Debugging: Log the FINAL query object with exclusions ---
        console.log("Discover Users - Final MongoDB Query with Exclusions:", JSON.stringify(query));

        const users = await User.find(query).select('-password').limit(50);
        res.json(users);
    } catch (error) {
        // Check if the error is specifically an invalid regex error
        if (error instanceof SyntaxError && error.message.includes('Invalid regular expression')) {
             console.error('Invalid Regular Expression Error during user discovery:', error);
             // Send a more specific error message to the client
             return res.status(400).json({ message: `Invalid character used in filter/search term: ${error.message}` });
        }
        console.error('Discover Users Error:', error);
        if (error.name === 'CastError') {
             return res.status(400).json({ message: 'Invalid data format used for filtering.' });
        }
        res.status(500).json({ message: 'Server Error discovering users' });
    }
};

// Get a specific user's profile by ID
exports.getUserById = async (req, res) => {
    // ... (implementation remains the same as before) ...
    const userIdToView = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userIdToView)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
    }
    if (req.user && req.user.id === userIdToView) {
         return exports.getUserProfile(req, res);
    }
    try {
        const user = await User.findById(userIdToView).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get User By ID Error:', error);
        res.status(500).json({ message: 'Server Error fetching user profile' });
    }
};