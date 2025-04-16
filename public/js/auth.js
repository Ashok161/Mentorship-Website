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
    console.log('Found register form:', registerForm);
    console.log('Found error message div:', errorMessageDiv);

    if (registerForm) {
        console.log('Adding submit event listener');
        registerForm.addEventListener('submit', async (e) => {
            console.log('Form submit event triggered');
            e.preventDefault();
            console.log('Default prevented');
            
            clearMessage('error-message-register');
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = document.getElementById('role').value;
            
            console.log('Form data collected:', { name, email, role });

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
                console.log('Attempting to register user...');
                const data = await registerUser(name, email, password, role);
                console.log('Registration API call successful');
                showMessage('success', 'Registration successful! Redirecting to login...', 'error-message-register');
                registerForm.reset();
            } catch (error) {
                console.error('Registration failed:', error);
                const message = error.data?.message || error.message || 'Registration failed. Please try again.';
                showMessage('error', message, 'error-message-register');
            }
        });
    } else {
        console.error('Register form not found in the DOM');
    }
}

function showMessage(type, message, elementId) {
    console.log('Showing message:', type, message);
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        messageElement.className = `message ${type}-message`;
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageElement.style.display = 'none';
                if (message.includes('Registration successful')) {
                    window.location.href = '/index.html';
                }
            }, 3000);
        }
    } else {
        console.error('Message element not found:', elementId);
    }
}

function clearMessage(elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.style.display = 'none';
        messageElement.textContent = '';
    }
}