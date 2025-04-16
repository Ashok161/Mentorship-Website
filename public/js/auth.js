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
    const errorMessageDiv = document.getElementById('error-message-register');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage('error-message-register');
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = document.getElementById('role').value;
            
            // Client-side validation
            if (!name || !email || !password || !role) {
                showMessage('error', 'Please fill in all required fields.', 'error-message-register');
                return;
            }
            if (password !== confirmPassword) {
                showMessage('error', 'Passwords do not match.', 'error-message-register');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password, role })
                });

                const data = await response.json();

                if (response.ok) {
                    // Registration successful
                    showMessage('success', 'Registration successful! Redirecting to login...', 'error-message-register');
                    registerForm.reset();
                    setTimeout(() => {
                        window.location.href = '/index.html';
                    }, 2000);
                } else {
                    // Registration failed with a known error
                    showMessage('error', data.message || 'Registration failed. Please try again.', 'error-message-register');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showMessage('error', 'An unexpected error occurred. Please try again.', 'error-message-register');
            }
        });
    }
}

function showMessage(type, message, elementId) {
    console.log('Showing message:', type, message);
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}-message`;
        messageElement.style.display = 'block';
        
        // For success messages, auto-hide after delay
        if (type === 'success') {
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 2000);
        }
    }
}

function clearMessage(elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.style.display = 'none';
        messageElement.textContent = '';
    }
}