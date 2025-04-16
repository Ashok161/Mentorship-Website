const API_BASE_URL = 'https://mentorship-backend-g3mo.onrender.com/api'; // Ensure this is just the plain string

async function request(endpoint, method = 'GET', data = null, requireAuth = true) {
    // Ensure you are using backticks (`) for the template literal, not single quotes (')
    // And make sure there are no extra characters or HTML tags around the variables.
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('mentorship_token');

    if (requireAuth) {
        if (!token) {
            console.error('No token found for authenticated request');
            window.location.href = '/index.html'; // Force login
            return Promise.reject({ message: 'Authentication required' });
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);

        // Try to parse JSON, but handle non-JSON responses gracefully in case of errors
        const contentType = response.headers.get("content-type");
        let responseData;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            responseData = await response.json();
        } else {
            // If not JSON, maybe read as text to see the HTML/error
            responseData = await response.text();
             // If we still got HTML here on a non-ok response, throw an error based on status
             if (!response.ok) {
                 console.error(`API Error (${response.status}): Received non-JSON response:`, responseData);
                 throw new Error(`HTTP error! status: ${response.status}, Response: ${responseData.substring(0, 100)}...`); // Show beginning of HTML
             }
             // If it was OK but not JSON (unlikely for this API), return the text
             return responseData;
        }


        if (!response.ok) {
            console.error(`API Error (${response.status}):`, responseData.message || response.statusText);
            const error = new Error(responseData.message || `HTTP error! status: ${response.status}`);
            error.data = responseData;
            error.status = response.status;
            throw error;
        }
        return responseData;
    } catch (error) {
        // Catch both fetch network errors and errors thrown from non-ok responses
        console.error(`Network or Fetch Error for ${method} ${endpoint}:`, error);
        // If it's the SyntaxError from trying to parse HTML as JSON
        if (error instanceof SyntaxError && error.message.includes("Unexpected token '<'")) {
             throw new Error("Failed to process server response. Expected JSON but received HTML. Check if the API endpoint exists and is correct.");
        }
        // Re-throw the original or new error
        throw error;
    }
}

// Auth API calls
const loginUser = (email, password) => request('/auth/login', 'POST', { email, password }, false);
const registerUser = (name, email, password, role) => request('/auth/register', 'POST', { name, email, password, role }, false);

// User API calls
const getUserProfile = () => request('/users/me', 'GET');
const updateUserProfile = (profileData) => request('/users/me', 'PUT', profileData);
const deleteUserProfile = () => request('/users/me', 'DELETE');
const discoverUsers = (filters = {}) => {
     const queryString = new URLSearchParams(filters).toString();
     // Ensure endpoint starts with a slash
     return request(`/users?${queryString}`, 'GET');
 };

// Connection API calls
const sendConnectionRequest = (recipientId) => request('/connections', 'POST', { recipientId });
const getConnections = (type) => request(`/connections?type=${type}`, 'GET'); // Ensure endpoint starts with a slash
const acceptConnectionRequest = (connectionId) => request(`/connections/${connectionId}`, 'PUT', { status: 'accepted' }); // Ensure endpoint starts with a slash
const declineConnectionRequest = (connectionId) => request(`/connections/${connectionId}`, 'PUT', { status: 'declined' }); // Ensure endpoint starts with a slash
const deleteConnection = (connectionId) => request(`/connections/${connectionId}`, 'DELETE'); // Ensure endpoint starts with a slash