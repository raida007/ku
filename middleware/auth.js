const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'khulna_university_secret_key_2025';

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }

        // Extract token
        const token = authHeader.substring(7); // Remove "Bearer " prefix

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.user.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found, authorization denied'
            });
        }

        // Add user to request object
        req.user = decoded.user;
        req.userDoc = user;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

// Middleware to check user roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

module.exports = { auth, authorize };