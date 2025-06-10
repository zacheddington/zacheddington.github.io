// Authentication Middleware
// JWT token validation and user authentication

const jwt = require('jsonwebtoken');
const config = require('../config/environment');

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, config.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.error('Token validation failed:', err.message);
        res.status(403).json({ error: 'Invalid token.' });
    }
};

// Middleware to check if user has admin privileges
const requireAdmin = (req, res, next) => {
    // First ensure user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    // Check if user has admin role - flexible detection
    const isAdmin = req.user.roleKeys?.includes(1) || 
                   req.user.roleKeys?.includes('1') ||
                   req.user.roles?.some(role => {
                       const roleLower = role.toLowerCase();
                       return roleLower.includes('admin') || 
                              roleLower.includes('administrator') ||
                              roleLower === 'admin';
                   });

    if (!isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    next();
};

// Middleware to prevent self-modification (users can't modify their own admin status)
const preventSelfModification = (req, res, next) => {
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
        return res.status(400).json({ error: 'Cannot modify your own account through this endpoint.' });
    }

    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    preventSelfModification
};
