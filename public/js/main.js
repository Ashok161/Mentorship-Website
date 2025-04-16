document.addEventListener('DOMContentLoaded', () => {
    console.log('main.js loaded');
    const currentPage = window.location.pathname.split('/').pop();
    console.log('Current page:', currentPage);

    // Only redirect from dashboard if not logged in
    const token = localStorage.getItem('mentorship_token');
    if (!token && currentPage === 'dashboard.html') {
        window.location.href = '/index.html';
    }

    // Setup auth forms if on login/register pages
    if (currentPage === 'index.html' || currentPage === '') {
        setupLoginForm();
    }
    if (currentPage === 'register.html') {
        console.log('Setting up register form');
        setupRegisterForm();
    }

    // Setup dashboard if on dashboard page
    if (currentPage === 'dashboard.html' && token) {
        setupDashboardNavigation();
        loadUserProfile();
        displaySection('profile-section');
    }
});

function setupDashboardNavigation() {
    const logoutButton = document.getElementById('logout-button');
    const navProfile = document.getElementById('nav-profile');
    const navDiscovery = document.getElementById('nav-discovery');
    const navConnections = document.getElementById('nav-connections');
    const mainNavLinks = document.querySelectorAll('#main-nav a:not(#logout-button)');

    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('mentorship_token');
            localStorage.removeItem('mentorship_user'); // Clear stored user info too
            window.location.href = '/index.html';
        });
    }

     const setActiveNav = (activeId) => {
        mainNavLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.getElementById(activeId);
        if(activeLink) activeLink.classList.add('active');
     };

    if (navProfile) {
        navProfile.addEventListener('click', (e) => {
             e.preventDefault();
             setActiveNav('nav-profile');
             displaySection('profile-section');
             loadUserProfile(); // Reload profile data when navigated to
        });
    }
    if (navDiscovery) {
         navDiscovery.addEventListener('click', (e) => {
             e.preventDefault();
              setActiveNav('nav-discovery');
             displaySection('discovery-section');
             loadDiscoveryUsers(); // Load discovery users
         });
    }
    if (navConnections) {
        navConnections.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-connections');
            displaySection('connections-section');
            loadAllConnections(); // Load all connection types
        });
    }

     // Set initial active state (assuming profile is default)
     setActiveNav('nav-profile');
}

function displaySection(sectionId) {
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
        section.style.display = (section.id === sectionId) ? 'block' : 'none';
    });
}

function showMessage(type, message, areaId = 'message-area') {
    const messageArea = document.getElementById(areaId);
     if (!messageArea) return;
    messageArea.textContent = message;
    messageArea.className = `${type}-message`; // 'success-message' or 'error-message'
    messageArea.style.display = 'block';
     // Optional: auto-hide after a few seconds
     setTimeout(() => { messageArea.style.display = 'none'; }, 5000);
}

function clearMessage(areaId = 'message-area') {
     const messageArea = document.getElementById(areaId);
     if (messageArea) messageArea.style.display = 'none';
}

function displayUserGreeting() {
    const greetingElement = document.getElementById('user-greeting');
    const storedUser = localStorage.getItem('mentorship_user');
    if (greetingElement && storedUser) {
         try {
            const user = JSON.parse(storedUser);
            greetingElement.textContent = `Welcome, ${user.name}!`;
         } catch(e) {
            console.error("Failed to parse stored user data");
            greetingElement.textContent = 'Welcome!';
         }

    } else if (greetingElement) {
         greetingElement.textContent = 'Welcome!';
    }
}

// Call on dashboard load
if (window.location.pathname.includes('dashboard.html')) {
    displayUserGreeting();
}