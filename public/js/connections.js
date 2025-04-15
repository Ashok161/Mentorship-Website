
let currentConnectionDetails = null;

async function loadAllConnections() {
    await loadConnectionsByType('pending_received', 'pending-received-list');
    await loadConnectionsByType('accepted', 'accepted-list');
    await loadConnectionsByType('pending_sent', 'pending-sent-list');
}

async function loadConnectionsByType(type, listId) {
    const listElement = document.getElementById(listId);
    if (!listElement) return;

    listElement.innerHTML = '<li>Loading...</li>';

    try {
        const connections = await getConnections(type);
        renderConnectionList(connections, listId, type);
    } catch (error) {
        console.error(`Error loading ${type} connections:`, error);
        listElement.innerHTML = `<li class="error-message">Could not load ${type.replace('_', ' ')}.</li>`;
    }
}

function renderConnectionList(connections, listId, type) {
    const listElement = document.getElementById(listId);
    if (!listElement) return;
    listElement.innerHTML = '';

    if (connections.length === 0) {
        listElement.innerHTML = `<li>No ${type.replace('_', ' ')} connections found.</li>`;
        return;
    }

    const itemTemplate = document.getElementById('connection-item-template');
    const currentUser = JSON.parse(localStorage.getItem('mentorship_user') || '{}');

    connections.forEach(conn => {
        const itemClone = itemTemplate.content.cloneNode(true);
        const listItem = itemClone.querySelector('.connection-item');
        const userInfo = listItem.querySelector('.user-info');
        const actionsContainer = listItem.querySelector('.actions');

        listItem.dataset.connectionid = conn._id;

        // Determine the 'other' user in the connection
        const otherUser = conn.requester._id === currentUser._id ? conn.recipient : conn.requester;

        userInfo.querySelector('.user-name').textContent = otherUser.name;
        userInfo.querySelector('.user-role').textContent = otherUser.role;
        userInfo.querySelector('.status').textContent = `(${conn.status})`;

        // Add action buttons based on type
        actionsContainer.innerHTML = '';
        if (type === 'pending_received') {
            const acceptBtn = createButton('Accept', 'btn-success', () => handleAcceptRequest(conn._id, listItem));
            const declineBtn = createButton('Decline', 'btn-danger', () => handleDeclineRequest(conn._id, listItem));
            actionsContainer.appendChild(acceptBtn);
            actionsContainer.appendChild(declineBtn);

            // Display user details
            displayConnectionDetails(listItem, otherUser);
        } else if (type === 'pending_sent') {
            const cancelBtn = createButton('Cancel Request', 'btn-secondary', () => handleCancelRequest(conn._id, listItem));
            actionsContainer.appendChild(cancelBtn);

            // Display user details
            displayConnectionDetails(listItem, otherUser);
        } else if (type === 'accepted') {
            const removeBtn = createButton('Remove Connection', 'btn-danger', () => handleRemoveConnection(conn._id, listItem));
            actionsContainer.appendChild(removeBtn);

            // Display user details
            displayConnectionDetails(listItem, otherUser);
        }

        listElement.appendChild(listItem);
    });
}

function createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `btn ${className} btn-sm`;
    button.onclick = onClick;
    return button;
}

async function handleAcceptRequest(connectionId, listItemElement) {
    try {
        await acceptConnectionRequest(connectionId);
        showMessage('success', 'Request accepted!');
        listItemElement.remove();
        loadConnectionsByType('accepted', 'accepted-list');
    } catch (error) {
        showMessage('error', `Failed to accept request: ${error.data?.message || error.message}`);
    }
}

async function handleDeclineRequest(connectionId, listItemElement) {
    try {
        await declineConnectionRequest(connectionId);
        showMessage('success', 'Request declined.');
        listItemElement.remove();
    } catch (error) {
        showMessage('error', `Failed to decline request: ${error.data?.message || error.message}`);
    }
}

async function handleCancelRequest(connectionId, listItemElement) {
    if (confirm('Are you sure you want to cancel this mentorship request?')) {
        try {
            await deleteConnection(connectionId);
            showMessage('success', 'Request cancelled.');
            listItemElement.remove();
        } catch (error) {
            showMessage('error', `Failed to cancel request: ${error.data?.message || error.message}`);
        }
    }
}

async function handleRemoveConnection(connectionId, listItemElement) {
    if (confirm('Are you sure you want to remove this connection?')) {
        try {
            await deleteConnection(connectionId);
            showMessage('success', 'Connection removed.');
            listItemElement.remove();
        } catch (error) {
            showMessage('error', `Failed to remove connection: ${error.data?.message || error.message}`);
        }
    }
}

function displayConnectionDetails(listItem, user) {
    // Create a container for user details
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'connection-details';
    detailsContainer.innerHTML = `
        <div class="user-bio">${user.bio || 'No bio provided.'}</div>
        <div class="tags">
            <strong>Skills:</strong>
            ${user.skills && user.skills.length > 0 ? user.skills.map(skill => `<span class="tag">${skill}</span>`).join(' ') : 'None specified'}
        </div>
        <div class="tags">
            <strong>Interests:</strong>
            ${user.interests && user.interests.length > 0 ? user.interests.map(interest => `<span class="tag">${interest}</span>`).join(' ') : 'None specified'}
        </div>
    `;

    // Insert details container after the actions container
    const actionsContainer = listItem.querySelector('.actions');
    listItem.insertBefore(detailsContainer, actionsContainer.nextSibling);
}

function setupUserProfileDetails() {
    // This function is no longer needed with the updated display approach
    return;
}