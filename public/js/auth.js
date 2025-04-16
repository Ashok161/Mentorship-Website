function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message-login');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage('error-message-login'); // Clear previous errors
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Basic client-side validation
            if (!email || !password) {
                showMessage('error', 'Please enter both email and password.', 'error-message-login');
                return;
            }

            try {
                const data = await loginUser(email, password);
                localStorage.setItem('mentorship_token', data.token);
                // Store basic user info for greeting/role checks if needed
                localStorage.setItem('mentorship_user', JSON.stringify({ _id: data._id, name: data.name, email: data.email, role: data.role }));
                window.location.href = '/dashboard.html';
            } catch (error) {
                const message = error.data?.message || error.message || 'Login failed. Please try again.';
                showMessage('error', message, 'error-message-login');
            }
        });
    }
}

function setupRegisterForm() {
    console.log('Setting up register form function called');
    const registerForm = document.getElementById('register-form');
    const messageDiv = document.getElementById('error-message-register');

    if (!registerForm || !messageDiv) {
        console.error('Required elements not found');
        return;
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessage('error-message-register');

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const role = document.getElementById('role').value;

        // Validation
        if (!name || !email || !password || !role) {
            showMessage('error', 'Please fill in all required fields.', 'error-message-register');
            return;
        }
        if (password !== confirmPassword) {
            showMessage('error', 'Passwords do not match.', 'error-message-register');
            return;
        }

        try {
            const submitButton = registerForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;

            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password, role })
            });

            // Check if we got any response
            if (response) {
                try {
                    const data = await response.json();
                    
                    // If we get here and have user data, consider it a success
                    if (data && (data.user || data._id || response.status === 201)) {
                        showMessage('success', 'Registration successful! Redirecting to login page...', 'error-message-register');
                        registerForm.reset();
                        setTimeout(() => {
                            window.location.href = '/index.html';
                        }, 5000);
                        return; // Exit here to prevent showing error message
                    }
                } catch (jsonError) {
                    // Ignore JSON parsing errors if we've determined it's a success
                }
            }

            // Only show error message if we haven't shown success message
            if (!document.querySelector('.success-message')) {
                showMessage('error', 'Please try logging in with your credentials.', 'error-message-register');
            }

        } catch (error) {
            // Only show error if we haven't already shown success
            if (!document.querySelector('.success-message')) {
                console.error('Registration error:', error);
                showMessage('error', 'Please try logging in with your credentials.', 'error-message-register');
            }
        } finally {
            const submitButton = registerForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = false;
        }
    });
}

function showMessage(type, message, elementId) {
    const messageElement = document.getElementById(elementId);
    if (!messageElement) return;

    // Clear any existing timeouts
    if (window.messageTimeout) {
        clearTimeout(window.messageTimeout);
    }

    // Don't show error message if success message is already showing
    if (type === 'error' && messageElement.classList.contains('success-message')) {
        return;
    }

    messageElement.textContent = message;
    messageElement.className = `message ${type}-message`;
    messageElement.style.display = 'block';

    // Set timeout to hide message after 5 seconds
    window.messageTimeout = setTimeout(() => {
        messageElement.style.display = 'none';
        // Only redirect if it was a success message
        if (type === 'success') {
            window.location.href = '/index.html';
        }
    }, 5000);
}

function clearMessage(elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.style.display = 'none';
        messageElement.textContent = '';
    }
}