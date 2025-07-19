const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://raidachakma7:Dyf51CUhOcKdImyu@cluster0.jcmt6kg.mongodb.net/khulna_university?retryWrites=true&w=majority&appName=Cluster0')
.then(() => {
    console.log('✅ Successfully connected to MongoDB');
    console.log('Database Name:', mongoose.connection.name);
})
.catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('🔧 Please check your MongoDB Atlas IP whitelist settings');
});

// Monitor connection status
mongoose.connection.on('connected', () => {
    console.log('🔗 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 MongoDB disconnected');
});

// Import and use routes AFTER middleware setup
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Import admission routes
const admissionRoutes = require('./routes/admissionrouter');
app.use('/api/admissions', admissionRoutes);

// Enhanced Admin middleware with proper JWT verification
const adminMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Get user from database
        const User = require('./models/User');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(403).json({ success: false, message: 'Invalid token or access denied' });
    }
};

// Import Admission model for admin routes
const Admission = require('./models/Admission');

// Admin routes for managing admissions
app.get('/api/admin/admissions', adminMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || '';
        const program = req.query.program || '';
        const search = req.query.search || '';

        // Build query
        let query = {};
        if (status) query.status = status;
        if (program) query.desiredProgram = program;
        if (search) {
            query.$or = [
                { applicationId: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const applications = await Admission.find(query)
            .sort({ submittedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('reviewedBy', 'name email');

        const total = await Admission.countDocuments(query);

        res.json({
            success: true,
            data: applications,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });

    } catch (error) {
        console.error('Get admissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch applications' });
    }
});

// Update admission application status
app.put('/api/admin/admissions/:applicationId', adminMiddleware, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status, comments } = req.body;

        if (!['pending', 'approved', 'rejected', 'under_review'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const application = await Admission.findOneAndUpdate(
            { applicationId },
            {
                status,
                comments,
                reviewedAt: new Date(),
                reviewedBy: req.user._id
            },
            { new: true }
        );

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        res.json({
            success: true,
            message: 'Application status updated successfully',
            data: application
        });

    } catch (error) {
        console.error('Update admission error:', error);
        res.status(500).json({ success: false, message: 'Failed to update application' });
    }
});

// Get admission statistics
app.get('/api/admin/admission-stats', adminMiddleware, async (req, res) => {
    try {
        const totalApplications = await Admission.countDocuments();
        const pendingApplications = await Admission.countDocuments({ status: 'pending' });
        const approvedApplications = await Admission.countDocuments({ status: 'approved' });
        const rejectedApplications = await Admission.countDocuments({ status: 'rejected' });
        const underReviewApplications = await Admission.countDocuments({ status: 'under_review' });

        // Program-wise statistics
        const programStats = await Admission.aggregate([
            { $group: { _id: '$desiredProgram', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Monthly statistics
        const monthlyStats = await Admission.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$submittedAt' },
                        month: { $month: '$submittedAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.json({
            success: true,
            stats: {
                totalApplications,
                pendingApplications,
                approvedApplications,
                rejectedApplications,
                underReviewApplications,
                programStats,
                monthlyStats
            }
        });

    } catch (error) {
        console.error('Get admission stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
});

// Admin API Routes for Users (existing code)
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
        const User = require('./models/User');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const role = req.query.role || '';

        // Build search query
        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }

        const users = await User.find(query, '-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({ 
            success: true, 
            users,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    try {
        const User = require('./models/User');
        
        const totalUsers = await User.countDocuments();
        const studentCount = await User.countDocuments({ role: 'student' });
        const facultyCount = await User.countDocuments({ role: 'faculty' });
        const adminCount = await User.countDocuments({ role: 'admin' });
        const staffCount = await User.countDocuments({ role: 'staff' });
        
        // Get users registered in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsersThisMonth = await User.countDocuments({ 
            createdAt: { $gte: thirtyDaysAgo } 
        });

        // Get users registered today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newUsersToday = await User.countDocuments({ 
            createdAt: { $gte: today } 
        });

        const recentUsers = await User.find({}, 'name email role createdAt')
            .sort({ createdAt: -1 })
            .limit(10);

        // Department statistics
        const departmentStats = await User.aggregate([
            { $match: { department: { $exists: true, $ne: '' } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            stats: {
                totalUsers,
                studentCount,
                facultyCount,
                adminCount,
                staffCount,
                newUsersThisMonth,
                newUsersToday,
                recentUsers,
                departmentStats
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

app.delete('/api/admin/users/:userId', adminMiddleware, async (req, res) => {
    try {
        const User = require('./models/User');
        const { userId } = req.params;
        
        // Prevent admin from deleting themselves
        if (userId === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        }

        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

app.put('/api/admin/users/:userId', adminMiddleware, async (req, res) => {
    try {
        const User = require('./models/User');
        const { userId } = req.params;
        const { name, email, role, department, semester, studentId } = req.body;
        
        // Validation
        if (!name || !email || !role) {
            return res.status(400).json({ success: false, message: 'Name, email, and role are required' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, email, role, department, semester, studentId },
            { new: true, select: '-password' }
        );
        
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

// Create new user (admin only)
app.post('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');
        const { name, email, password, role, department, semester, studentId } = req.body;
        
        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
            department,
            semester,
            studentId
        });

        await newUser.save();

        // Return user without password
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({ success: true, user: userResponse });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
});

// Bulk operations
app.post('/api/admin/users/bulk-delete', adminMiddleware, async (req, res) => {
    try {
        const User = require('./models/User');
        const { userIds } = req.body;
        
        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ success: false, message: 'Invalid user IDs' });
        }

        // Prevent admin from deleting themselves
        if (userIds.includes(req.user._id.toString())) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        }

        const result = await User.deleteMany({ _id: { $in: userIds } });
        
        res.json({ success: true, message: `${result.deletedCount} users deleted successfully` });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete users' });
    }
});

// Debug endpoint to check server status
app.get('/api/status', (req, res) => {
    res.json({
        status: 'Server is running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint to test without auth
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working',
        server: 'OK',
        time: new Date().toISOString()
    });
});

// Serve your homepage and other static pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'FP_longin.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'FP_signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Admin portal route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admission form route
app.get('/admission', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admissionfrm.html'));
});

// Handle 404 for other routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Khulna University Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
    console.log(`Admin Portal: http://localhost:${PORT}/admin`);
    console.log(`Admission Form: http://localhost:${PORT}/admission`);
});