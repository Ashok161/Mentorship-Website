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
                const data = await registerUser(name, email, password, role);
                showMessage('success', 'Registration successful! Please login.', 'error-message-register');
                // Clear the form
                registerForm.reset();
                // Don't store token or redirect, just show success message
                setTimeout(() => {
                    window.location.href = '/index.html'; // Redirect to login after 2 seconds
                }, 2000);
            } catch (error) {
                const message = error.data?.message || error.message || 'Registration failed. Please try again.';
                showMessage('error', message, 'error-message-register');
            }
        });
    }
}