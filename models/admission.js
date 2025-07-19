const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
    applicationId: {
        type: String,
        unique: true,
        required: true
    },
    // Personal Information
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female', 'other']
    },
    nationality: {
        type: String,
        required: true,
        trim: true
    },
    religion: {
        type: String,
        enum: ['islam', 'hinduism', 'christianity', 'buddhism', 'other']
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    
    // Academic Information
    desiredProgram: {
        type: String,
        required: true,
        enum: ['cse', 'eee', 'ce', 'me', 'bba', 'economics', 'english', 'mathematics', 'physics', 'chemistry', 'biology', 'law']
    },
    admissionSession: {
        type: String,
        required: true
    },
    sscBoard: {
        type: String,
        required: true
    },
    sscYear: {
        type: Number,
        required: true,
        min: 2015,
        max: 2025
    },
    sscGPA: {
        type: Number,
        required: true,
        min: 1.0,
        max: 5.0
    },
    hscBoard: {
        type: String,
        required: true
    },
    hscYear: {
        type: Number,
        required: true,
        min: 2017,
        max: 2025
    },
    hscGPA: {
        type: Number,
        required: true,
        min: 1.0,
        max: 5.0
    },
    
    // Guardian Information
    fatherName: {
        type: String,
        required: true,
        trim: true
    },
    fatherOccupation: {
        type: String,
        trim: true
    },
    motherName: {
        type: String,
        required: true,
        trim: true
    },
    motherOccupation: {
        type: String,
        trim: true
    },
    guardianPhone: {
        type: String,
        required: true,
        trim: true
    },
    monthlyIncome: {
        type: Number,
        min: 0
    },
    
    // Additional Information
    extracurricular: {
        type: String,
        trim: true
    },
    whyChooseKU: {
        type: String,
        trim: true
    },
    declaration: {
        type: Boolean,
        required: true
    },
    
    // Status and Timestamps
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'under_review'],
        default: 'pending'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    comments: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Admission', admissionSchema);