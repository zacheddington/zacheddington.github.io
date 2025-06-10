// API Client Utility
// Handles API communications and connectivity checks

// Utility function to get the correct API URL
function getAPIUrl() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:3000' : 'https://integrisneuro-eec31e4aaab1.herokuapp.com';
}

// Network connectivity and database health check
async function checkConnectivity() {
    try {
        const API_URL = getAPIUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_URL}/api/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            return {
                connected: true,
                status: data.status || 'healthy',
                database: data.database || 'connected'
            };
        } else {
            return {
                connected: false,
                error: `Server returned ${response.status}: ${response.statusText}`,
                status: 'unhealthy'
            };
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return {
                connected: false,
                error: 'Connection timeout - server may be unavailable',
                status: 'timeout'
            };
        }
        return {
            connected: false,
            error: error.message || 'Network connection failed',
            status: 'error'
        };
    }
}

// Enhanced error categorization
function categorizeError(error, response = null) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
            type: 'network',
            message: 'Network connection failed. Please check your internet connection and try again.',
            modal: true
        };
    }
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
            type: 'timeout',
            message: 'Request timed out. The server may be experiencing high load. Please try again.',
            modal: true
        };
    }
    
    if (response && response.status >= 500) {
        return {
            type: 'server',
            message: 'Server error occurred. Please try again in a few moments.',
            modal: true
        };
    }
    
    if (error.message.includes('Database connection')) {
        return {
            type: 'database',
            message: 'Database connection error. Please try again or contact support if the problem persists.',
            modal: true
        };
    }
    
    if (error.message.includes('Email address is already in use')) {
        return {
            type: 'validation',
            message: error.message,
            modal: false
        };
    }
    
    if (error.message.includes('Current password is incorrect')) {
        return {
            type: 'validation',
            message: error.message,
            modal: false
        };
    }
    
    return {
        type: 'general',
        message: error.message || 'An unexpected error occurred. Please try again.',
        modal: false
    };
}

// Make functions available globally
window.getAPIUrl = getAPIUrl;
window.checkConnectivity = checkConnectivity;
window.categorizeError = categorizeError;
