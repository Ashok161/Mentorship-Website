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
            // Disable form while submitting
            const submitButton = registerForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;

            let registrationSuccessful = false; // Flag to track registration success

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password, role })
                });

                const data = await response.json();

                // If we get a 201 status, registration was successful
                if (response.status === 201) {
                    registrationSuccessful = true;
                    showMessage('success', 'Registration successful! Redirecting to login page...', 'error-message-register');
                    registerForm.reset();
                } else if (response.status === 409) {
                    // User already exists
                    showMessage('error', 'User already exists with this email address', 'error-message-register');
                } else if (!registrationSuccessful) {
                    // Only show error if registration wasn't successful
                    showMessage('error', data.message || 'Registration failed. Please try again.', 'error-message-register');
                }
            } catch (error) {
                // Only show error if registration wasn't successful
                if (!registrationSuccessful) {
                    console.error('Registration error:', error);
                    showMessage('error', 'An unexpected error occurred. Please try again.', 'error-message-register');
                }
            }
        } finally {
            // Re-enable form
            const submitButton = registerForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = false;
        }
    });
}

function showMessage(type, message, elementId) {
    console.log('Showing message:', { type, message, elementId });
    const messageElement = document.getElementById(elementId);
    if (!messageElement) {
        console.error('Message element not found:', elementId);
        return;
    }

    // Clear any existing timeouts
    if (window.messageTimeout) {
        clearTimeout(window.messageTimeout);
    }

    // Update message
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