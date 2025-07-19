// Authentication JavaScript for KU University Website

// API Base URL
const API_BASE_URL = '/api/auth';

// Utility Functions
const showMessage = (elementId, message, type = 'error') => {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        element.className = type === 'error' ? 'error-message' : 'success-message';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
};

const hideMessage = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
};

const showLoading = (buttonElement, isLoading = true) => {
    const btnText = buttonElement.querySelector('.btn-text');
    const btnLoader = buttonElement.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        buttonElement.disabled = true;
    } else {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
        buttonElement.disabled = false;
    }
};

// Token Management
const getToken = () => {
    return localStorage.getItem('ku_token');
};

const setToken = (token) => {
    localStorage.setItem('ku_token', token);
};

const removeToken = () => {
    localStorage.removeItem('ku_token');
    localStorage.removeItem('ku_user');
};

const getUser = () => {
    const userStr = localStorage.getItem('ku_user');
    return userStr ? JSON.parse(userStr) : null;
};

const setUser = (user) => {
    localStorage.setItem('ku_user', JSON.stringify(user));
};

// API Helper Function
const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};

// Form Validation
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    return password.length >= 6;
};

// Handle Login
const handleLogin = async (event) => {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = 'errorMessage';
    const successDiv = 'successMessage';
    
    // Hide previous messages
    hideMessage(errorDiv);
    hideMessage(successDiv);
    
    // Get form data
    const formData = new FormData(form);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    // Validate inputs
    if (!loginData.email || !loginData.password) {
        showMessage(errorDiv, 'Please fill in all fields');
        return;
    }
    
    if (!validateEmail(loginData.email)) {
        showMessage(errorDiv, 'Please enter a valid email address');
        return;
    }
    
    try {
        // Show loading state
        showLoading(submitButton, true);
        
        // Make API request
        const response = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });
        
        if (response.success) {
            // Store token and user data
            setToken(response.token);
            setUser(response.user);
            
            // Show success message
            showMessage(successDiv, 'Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after 1 second
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        }
        
    } catch (error) {
        showMessage(errorDiv, error.message || 'Login failed. Please try again.');
    } finally {
        showLoading(submitButton, false);
    }
};

// Handle Signup
const handleSignup = async (event) => {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = 'errorMessage';
    const successDiv = 'successMessage';
    
    // Hide previous messages
    hideMessage(errorDiv);
    hideMessage(successDiv);
    
    // Get form data
    const formData = new FormData(form);
    const signupData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        studentId: formData.get('studentId'),
        department: formData.get('department'),
        role: formData.get('role')
    };
    
    const confirmPassword = formData.get('confirmPassword');
    
    // Validate inputs
    if (!signupData.name || !signupData.email || !signupData.password || !signupData.department || !signupData.role) {
        showMessage(errorDiv, 'Please fill in all required fields');
        return;
    }
    
    if (!validateEmail(signupData.email)) {
        showMessage(errorDiv, 'Please enter a valid email address');
        return;
    }
    
    if (!validatePassword(signupData.password)) {
        showMessage(errorDiv, 'Password must be at least 6 characters long');
        return;
    }
    
    if (signupData.password !== confirmPassword) {
        showMessage(errorDiv, 'Passwords do not match');
        return;
    }
    
    // Check terms agreement
    const agreeTerms = form.querySelector('#agreeTerms');
    if (!agreeTerms.checked) {
        showMessage(errorDiv, 'Please agree to the Terms of Service and Privacy Policy');
        return;
    }
    
    try {
        // Show loading state
        showLoading(submitButton, true);
        
        // Make API request
        const response = await apiRequest('/signup', {
            method: 'POST',
            body: JSON.stringify(signupData)
        });
        
        if (response.success) {
            // Store token and user data
            setToken(response.token);
            setUser(response.user);
            
            // Show success message
            showMessage(successDiv, 'Account created successfully! Redirecting...', 'success');
            
            // Redirect to dashboard after 1.5 seconds
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        }
        
    } catch (error) {
        showMessage(errorDiv, error.message || 'Registration failed. Please try again.');
    } finally {
        showLoading(submitButton, false);
    }
};

// Handle Logout
const handleLogout = () => {
    removeToken();
    window.location.href = '/';
};

// Get Current User
const getCurrentUser = async () => {
    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token found');
        }
        
        const response = await apiRequest('/me');
        if (response.success) {
            setUser(response.user);
            return response.user;
        }
    } catch (error) {
        console.error('Failed to get current user:', error);
        removeToken();
        return null;
    }
};

// Check Authentication Status
const checkAuthStatus = () => {
    const token = getToken();
    const user = getUser();
    return token && user;
};

// Redirect if not authenticated (for protected pages)
const requireAuth = () => {
    if (!checkAuthStatus()) {
        window.location.href = '/login';
        return false;
    }
    return true;
};

// Redirect if already authenticated (for login/signup pages)
const redirectIfAuthenticated = () => {
    if (checkAuthStatus()) {
        window.location.href = '/dashboard.html';
        return true;
    }
    return false;
};

// Initialize page based on authentication status
const initializePage = () => {
    const currentPath = window.location.pathname;
    
    // For login and signup pages
    if (currentPath.includes('/login') || currentPath.includes('/signup')) {
        redirectIfAuthenticated();
    }
    
    // For dashboard and other protected pages
    if (currentPath.includes('/dashboard')) {
        if (!requireAuth()) {
            return;
        }
        // Load user data for dashboard
        loadUserData();
    }
};

// Load user data for dashboard
const loadUserData = async () => {
    const user = getUser();
    if (user) {
        updateUserInterface(user);
    } else {
        // Try to fetch user data if not in localStorage
        const currentUser = await getCurrentUser();
        if (currentUser) {
            updateUserInterface(currentUser);
        }
    }
};

// Update user interface with user data
const updateUserInterface = (user) => {
    // Update user name displays
    const userNameElements = document.querySelectorAll('#userName, #welcomeName');
    userNameElements.forEach(element => {
        if (element) {
            element.textContent = user.name;
        }
    });
    
    // Update profile image (use initials if no image)
    const profileImage = document.getElementById('profileImage');
    if (profileImage && user.name) {
        const initials = user.name.split(' ').map(name => name[0]).join('').toUpperCase();
        profileImage.src = `https://via.placeholder.com/40x40/4f46e5/ffffff?text=${initials}`;
        profileImage.alt = user.name;
    }
    
    // Update other user-specific elements
    const studentIdElement = document.getElementById('studentId');
    if (studentIdElement && user.studentId) {
        studentIdElement.textContent = user.studentId;
    }
    
    const departmentElement = document.getElementById('department');
    if (departmentElement && user.department) {
        departmentElement.textContent = user.department;
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize page
    initializePage();
    
    // Profile dropdown toggle
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('active');
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                handleLogout();
            }
        });
    }
    
    // Mobile sidebar toggle
    const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
});

// Export functions for use in other scripts
window.KUAuth = {
    handleLogin,
    handleSignup,
    handleLogout,
    getCurrentUser,
    checkAuthStatus,
    requireAuth,
    getUser,
    setUser,
    getToken,
    setToken,
    removeToken
};