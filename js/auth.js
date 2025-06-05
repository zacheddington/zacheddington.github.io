// Only the login page is public
const publicPaths = ['/index.html', '/', ''];

// Check if current page is public
const isPublicPage = () => {
    const fullPath = window.location.pathname;
    // Normalize path by removing trailing slash
    const normalizedPath = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath;
    return publicPaths.includes(normalizedPath) || normalizedPath === '';
};

// Check authentication
const checkAuth = () => {
    if (!isPublicPage() && !localStorage.getItem('token')) {
        window.location.href = '/';
    }
};

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', checkAuth);