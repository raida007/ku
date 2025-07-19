const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission'); // Fixed path
const mongoose = require('mongoose');

// Helper function to generate application ID
function generateApplicationId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `KU${year}${random}`;
}

// POST /api/admissions - Create new admission
router.post('/', async (req, res) => {
    try {
        console.log('Received admission data:', req.body);
        
        const {
            fullName, email, phone, gender, nationality, religion, bloodGroup, address,
            desiredProgram, admissionSession, sscBoard, sscYear, sscGPA, hscBoard, hscYear, hscGPA,
            fatherName, fatherOccupation, motherName, motherOccupation, guardianPhone, monthlyIncome,
            extracurricular, whyChooseKU, declaration
        } = req.body;

        // Validation
        if (!fullName || !email || !phone || !gender || !nationality || !address ||
            !desiredProgram || !admissionSession || !sscBoard || !sscYear || !sscGPA ||
            !hscBoard || !hscYear || !hscGPA || !fatherName || !motherName || !guardianPhone ||
            !declaration) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Check for duplicate applications
        const existingApplication = await Admission.findOne({
            $or: [
                { email: email.toLowerCase() },
                { phone: phone }
            ]
        });

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: 'An application with this email or phone number already exists'
            });
        }

        // Generate unique application ID
        let applicationId;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            applicationId = generateApplicationId();
            const existing = await Admission.findOne({ applicationId });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate unique application ID'
            });
        }

        // Create new admission application
        const newApplication = new Admission({
            applicationId,
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            gender: gender.toLowerCase(),
            nationality: nationality.trim(),
            religion,
            bloodGroup,
            address: address.trim(),
            desiredProgram: desiredProgram.toLowerCase(),
            admissionSession,
            sscBoard,
            sscYear: parseInt(sscYear),
            sscGPA: parseFloat(sscGPA),
            hscBoard,
            hscYear: parseInt(hscYear),
            hscGPA: parseFloat(hscGPA),
            fatherName: fatherName.trim(),
            fatherOccupation: fatherOccupation?.trim(),
            motherName: motherName.trim(),
            motherOccupation: motherOccupation?.trim(),
            guardianPhone: guardianPhone.trim(),
            monthlyIncome: monthlyIncome ? parseInt(monthlyIncome) : undefined,
            extracurricular: extracurricular?.trim(),
            whyChooseKU: whyChooseKU?.trim(),
            declaration: Boolean(declaration)
        });

        await newApplication.save();

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: {
                applicationId: newApplication.applicationId,
                submittedAt: newApplication.submittedAt
            }
        });

    } catch (error) {
        console.error('Admission submission error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Application ID already exists. Please try again.'
            });
        }

        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorMessages
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to submit application. Please try again.',
            error: error.message
        });
    }
});

// GET /api/admissions/:applicationId - Get admission by application ID
router.get('/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const application = await Admission.findOne({ applicationId })
            .populate('reviewedBy', 'name email');
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        res.json({
            success: true,
            data: application
        });

    } catch (error) {
        console.error('Get admission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve application'
        });
    }
});

// GET /api/admissions - Get all admissions with pagination and filters
router.get('/', async (req, res) => {
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch applications' 
        });
    }
});

// GET /api/admissions/application/:applicationId - Get admission by application ID (alternative route)
router.get('/application/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const application = await Admission.findOne({ applicationId })
            .populate('reviewedBy', 'name email');
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        res.json({
            success: true,
            data: application
        });

    } catch (error) {
        console.error('Get admission by application ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve application'
        });
    }
});

// PUT /api/admissions/:id - Update admission (admin only)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove system fields that shouldn't be updated directly
        const { applicationId, submittedAt, reviewedAt, reviewedBy, ...allowedUpdates } = updateData;
        
        const admission = await Admission.findByIdAndUpdate(
            id,
            allowedUpdates,
            { new: true, runValidators: true }
        );

        if (!admission) {
            return res.status(404).json({
                success: false,
                message: 'Admission not found'
            });
        }

        res.json({
            success: true,
            data: admission,
            message: 'Admission updated successfully'
        });

    } catch (error) {
        console.error('Update admission error:', error);
        
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorMessages
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid admission ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update admission'
        });
    }
});

// PATCH /api/admissions/:id/status - Update admission status (admin only)
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const reviewedBy = req.user?.id || req.body.reviewedBy;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const validStatuses = ['pending', 'under_review', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const admission = await Admission.findByIdAndUpdate(
            id,
            {
                status,
                reviewedBy,
                reviewedAt: new Date(),
                comments: remarks
            },
            { new: true, runValidators: true }
        ).populate('reviewedBy', 'name email');

        if (!admission) {
            return res.status(404).json({
                success: false,
                message: 'Admission not found'
            });
        }

        res.json({
            success: true,
            data: admission,
            message: 'Admission status updated successfully'
        });

    } catch (error) {
        console.error('Update admission status error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid admission ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update admission status'
        });
    }
});

// DELETE /api/admissions/:id - Delete admission (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const admission = await Admission.findByIdAndDelete(id);
        
        if (!admission) {
            return res.status(404).json({
                success: false,
                message: 'Admission not found'
            });
        }

        res.json({
            success: true,
            message: 'Admission deleted successfully'
        });

    } catch (error) {
        console.error('Delete admission error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid admission ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete admission'
        });
    }
});

// GET /api/admissions/stats - Get admission statistics
router.get('/stats', async (req, res) => {
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
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch admission statistics' 
        });
    }
});

module.exports = router;